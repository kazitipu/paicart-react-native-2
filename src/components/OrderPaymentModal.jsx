import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput } from 'react-native';
import { useDispatch } from 'react-redux';
import { Check } from 'lucide-react-native';
import { C, Spinner } from '@/components/product/ui';
import { TS, tpx } from '@/components/cart/CartBits';
import { getTotalPaid, getTotalDue } from '@/lib/orderMath';
import { buildTiers, isOfferEligible, offerFieldsFor } from '@/lib/partialOffers';
import { openBkashGateway, reportBkashResult } from '@/lib/payments';
import { uploadOrderPaymentRequestRedux } from '@/store/actions';
import { toast } from '@/lib/toast';
import {
  PaymentSheet, SheetBody, SheetFooter, GhostButton, SolidButton, MethodTabs, TabPane,
  DepositBanner, BanknoteTile, AMBER_BOX, BIG_AMOUNT, CARD_LABEL, PAY,
} from '@/components/payments/PaymentSheet';
import TierPicker from '@/components/payments/TierPicker';
import BankPicker from '@/components/payments/BankPicker';
import ManualBkashTotal from '@/components/payments/ManualBkashTotal';
import BkashPanel from '@/components/payments/BkashPanel';
import ScreenshotUpload, { useScreenshotUpload } from '@/components/payments/ScreenshotUpload';

/* ═══════════════════════════════════════════════════════════════════════
   Port of paicart-nextjs15 src/components/OrderPaymentModal.jsx at its
   mobile breakpoint (< 640px bottom sheet). Pays one placed order (Pay Now)
   or several at once (Pay Combined) after checkout.

     header   Make Payment · "Order: #id" / "Combined Payment · N orders"
     step 1   (only when the "Pay More, Get More" offer applies: first
              payment, no offer already on the orders, due ≥ the offer's
              minimum, some tier > 0) — Total Due card + tier picker,
              Skip Offer / Continue
     step 2   Total Due card (already paid, offer applied) with the
              "Amount to Pay (Tk)" input (seeded at 60% of due on a first
              payment, else the full due) and its 60% minimum hint;
              Mobile Banking (bKash gateway, 1.5%) / Direct Deposit (bank
              list, manual bKash 2% total, screenshot, Cancel / Submit)

   Native differences, deliberate:
   - taking a tier LOCKS the amount input (lib/partialOffers rule 2): the
     discount is earned by paying exactly that share — the web's own comment
     says so but its input stayed editable;
   - a ref guard stops a second tap submitting twice before `submitting`
     re-renders the button disabled;
   - the amount input is uncontrolled (controlled inputs drop characters
     here); a tier re-seeds it by remounting it;
   - bKash checkout runs in the in-app BkashCheckout screen (lib/payments).
   ═══════════════════════════════════════════════════════════════════════ */

export default function OrderPaymentModal({
  visible,
  orders = [],
  currentUser,
  onClose,
  onSuccess,
  initialAmount,
  activePartial,
}) {
  const dispatch = useDispatch();

  const isCombined = orders.length > 1;
  const totalPaid = orders.reduce((a, o) => a + getTotalPaid(o), 0);
  const totalDue = orders.reduce((a, o) => a + Math.max(0, getTotalDue(o)), 0);

  const maximumDiscountAmount = parseFloat(activePartial?.maximumDiscountAmount) || 0;
  const offerTiers = buildTiers(activePartial, totalDue);
  const alreadyDiscounted = orders.some((o) => parseFloat(o.offer) > 0);
  const offerEligible = isOfferEligible({ activePartial, totalPaid, alreadyDiscounted, totalDue, tiers: offerTiers });

  const [tab, setTab] = useState('bkash');
  const [method, setMethod] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [amount, setAmount] = useState('');
  const [inputKey, setInputKey] = useState(0);
  const [focused, setFocused] = useState(false);
  const [step, setStep] = useState('payment');
  const [selectedTier, setSelectedTier] = useState(null);
  const shot = useScreenshotUpload();
  const { imageUrl, imgLoading } = shot;
  const resetShot = useRef(shot.reset);
  resetShot.current = shot.reset;
  const busyRef = useRef(false);

  /* Fresh state each time it opens — the web mounted a new instance.
     Default to 60% of due (the minimum allowed first payment) rather than
     the full due — unless the caller passed a specific intended amount. */
  useEffect(() => {
    if (!visible) return;
    setTab('bkash');
    setMethod('');
    setSubmitting(false);
    busyRef.current = false;
    setSelectedTier(null);
    setStep(offerEligible ? 'tier' : 'payment');
    resetShot.current();
    const seed =
      initialAmount != null ? initialAmount : totalPaid === 0 && totalDue > 0 ? Math.round((totalDue * 60) / 100) : totalDue;
    setAmount(String(seed > 0 ? seed : ''));
    setInputKey((k) => k + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  /* Offer step first when one applies (the web re-checks once the offer
     config arrives). */
  useEffect(() => {
    if (visible && offerEligible) setStep('tier');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offerEligible]);

  const selectedTierObj = offerTiers.find((tr) => tr.pct === selectedTier) || null;
  const discountedDue = selectedTierObj ? Math.round(totalDue - selectedTierObj.discountAmount) : Math.round(totalDue);
  const tierPayable = selectedTierObj ? Math.round(discountedDue * (selectedTierObj.pct / 100)) : discountedDue;
  const dueLaterAmount = discountedDue - tierPayable;
  const minFirst = Math.round((totalDue * 60) / 100);

  /* Taking a tier fixes the amount — the discount is calculated from paying
     exactly that share, so an edited amount would not earn it. */
  const applyTier = (tier) => {
    setSelectedTier(tier ? tier.pct : null);
    if (tier) {
      const discounted = Math.round(totalDue - tier.discountAmount);
      setAmount(String(Math.round(discounted * (tier.pct / 100))));
      setInputKey((k) => k + 1);
    }
    setStep('payment');
  };

  const payable = parseInt(amount, 10) || 0;

  const validate = () => {
    if (payable <= 0) {
      toast.error("Amount can't be 0.");
      return false;
    }
    if (payable > (selectedTierObj ? discountedDue : totalDue)) {
      toast.error("Amount can't be more than due amount.");
      return false;
    }
    /* A tier already fixes the amount at its own share of the discounted
       bill, which can legitimately be below 60% of the pre-discount due. */
    if (!selectedTierObj && totalPaid === 0 && payable < minFirst) {
      toast.error(`First payment must be at least 60% of due (${minFirst} Tk).`);
      return false;
    }
    return true;
  };

  const buildPaymentObj = (overrides = {}) => ({
    status: 'pending',
    paymentId: Math.floor(Math.random() * Date.now()),
    date: new Date().toLocaleDateString('en-GB'),
    amount: payable,
    payableTotal: payable,
    imageUrl: imageUrl || '',
    method,
    pendingOrders: orders,
    userId: currentUser?.id,
    displayName: currentUser?.displayName,
    time: Date.now(),
    ...offerFieldsFor(selectedTierObj),
    ...overrides,
  });

  const handleDirectSubmit = async () => {
    if (busyRef.current) return;
    if (!validate()) return;
    if (imgLoading) {
      toast.error('Please wait for image upload.');
      return;
    }
    if (!imageUrl) {
      toast.error('Please upload your transaction screenshot.');
      return;
    }
    if (!method) {
      toast.error('Please choose a payment method.');
      return;
    }
    busyRef.current = true;
    setSubmitting(true);
    try {
      await dispatch(uploadOrderPaymentRequestRedux(buildPaymentObj()));
      onSuccess?.();
      toast.success('Payment request submitted! Our team will confirm it soon.');
      setSubmitting(false);
      busyRef.current = false;
      onClose?.();
      return;
    } catch {
      toast.error('Submission failed. Please try again.');
    }
    busyRef.current = false;
    setSubmitting(false);
  };

  const handleBkashPayment = async () => {
    if (busyRef.current) return;
    if (!validate()) return;
    busyRef.current = true;
    setSubmitting(true);
    try {
      /* lib/payments adds payableTotalWithGatewayCharge
         (parseInt(payable × 1.5%) + payable) and the in-app return URL. */
      const result = await openBkashGateway({
        ...buildPaymentObj({ method: 'Bkash' }),
        payerPhone: currentUser?.mobileNo || '',
        orderRequest: true,
      });

      /* Checkout ran inside the app (BkashCheckout). Paid → refresh and close,
         like a submitted manual payment; otherwise say why and keep this sheet
         open so they can retry or pick another method. */
      const paid = reportBkashResult(result);
      setSubmitting(false);
      busyRef.current = false;
      if (paid) {
        onSuccess?.();
        onClose?.();
      }
      return;
    } catch {
      toast.error('An error occurred! Please try again later.');
    }
    busyRef.current = false;
    setSubmitting(false);
  };

  const isTier = step === 'tier';

  return (
    <PaymentSheet
      visible={visible}
      onClose={onClose}
      zIndex={50}
      title="Make Payment"
      subtitle={isCombined ? `Combined Payment · ${orders.length} orders` : `Order: #${orders[0]?.orderId ?? ''}`}
    >
      {isTier ? (
        /* ── Offer step ── */
        <>
          <SheetBody>
            <TierPicker
              label="Total Due"
              base={totalDue}
              tiers={offerTiers}
              selectedTier={selectedTier}
              onSelect={setSelectedTier}
              discountedTotal={discountedDue}
              payNow={tierPayable}
              dueLater={dueLaterAmount}
              maximumDiscountAmount={maximumDiscountAmount}
            />
          </SheetBody>
          <SheetFooter>
            <GhostButton title="Skip Offer" onPress={() => applyTier(null)} />
            <SolidButton onPress={() => applyTier(selectedTierObj)} disabled={!selectedTierObj}>
              <Text style={[TS.sm, { fontWeight: '700', color: '#ffffff' }]}>Continue</Text>
            </SolidButton>
          </SheetFooter>
        </>
      ) : (
        <>
          {/* Amount card */}
          <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 }}>
            <View style={[{ borderRadius: 16, padding: 16 }, AMBER_BOX]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <View style={{ flexShrink: 1 }}>
                  <Text style={CARD_LABEL}>Total Due</Text>
                  <Text style={BIG_AMOUNT}>
                    {totalDue}
                    {/* ml-1 → a space at 14px (≈4px) */}
                    <Text style={{ fontSize: 14, fontWeight: '700', color: C.gray500 }}> Tk</Text>
                  </Text>
                  {totalPaid > 0 && (
                    <Text style={[tpx(11), { color: C.green600, fontWeight: '600', marginTop: 2 }]}>Already paid: {totalPaid} Tk</Text>
                  )}
                  {selectedTierObj && (
                    <Text style={[tpx(11), { color: PAY.OFFER, fontWeight: '600', marginTop: 2 }]}>
                      Offer applied: ৳{selectedTierObj.discountAmount.toLocaleString()} off · new total ৳{discountedDue.toLocaleString()}
                    </Text>
                  )}
                </View>
                <BanknoteTile />
              </View>
              <View>
                <Text
                  style={[
                    tpx(11),
                    { fontWeight: '700', color: C.gray500, textTransform: 'uppercase', letterSpacing: 0.275, marginBottom: 6 },
                  ]}
                >
                  Amount to Pay (Tk)
                </Text>
                <TextInput
                  key={inputKey}
                  defaultValue={amount}
                  onChangeText={setAmount}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  editable={!selectedTierObj}
                  keyboardType="number-pad"
                  placeholder="Enter amount"
                  placeholderTextColor="rgba(31,41,55,0.5)"
                  style={[
                    TS.sm,
                    {
                      width: '100%',
                      height: 38,
                      borderWidth: 1,
                      borderColor: focused ? C.amber400 : C.amber200,
                      boxShadow: focused ? '0 0 0 1px #fcd34d' : undefined,
                      borderRadius: 12,
                      paddingHorizontal: 12,
                      paddingVertical: 0,
                      fontWeight: '700',
                      color: C.gray800,
                      backgroundColor: '#ffffff',
                      includeFontPadding: false,
                    },
                  ]}
                />
                {totalPaid === 0 && totalDue > 0 && (
                  <Text style={[tpx(10), { color: C.amber600, marginTop: 4 }]}>Minimum first payment: {minFirst} Tk (60% of due)</Text>
                )}
                {tab === 'direct' && <ManualBkashTotal method={method} amount={payable} />}
              </View>
            </View>
          </View>

          <MethodTabs tab={tab} onChange={setTab} />

          <SheetBody>
            {tab === 'direct' ? (
              <TabPane id="direct">
                <DepositBanner />
                <BankPicker method={method} onSelect={setMethod} />
                <ScreenshotUpload imageUrl={imageUrl} loading={imgLoading} onPick={shot.pick} />
              </TabPane>
            ) : (
              <TabPane id="bkash">
                <BkashPanel method={method} onSelect={setMethod} payable={payable} onPay={handleBkashPayment} submitting={submitting} />
              </TabPane>
            )}
          </SheetBody>

          {tab === 'direct' && (
            <SheetFooter>
              <GhostButton title="Cancel" onPress={onClose} />
              <SolidButton onPress={handleDirectSubmit} disabled={submitting || imgLoading}>
                {submitting ? <Spinner size={14} /> : <Check size={14} color="#ffffff" />}
                <Text style={[TS.sm, { fontWeight: '700', color: '#ffffff' }]}>{submitting ? 'Submitting…' : 'Submit Payment'}</Text>
              </SolidButton>
            </SheetFooter>
          )}
        </>
      )}
    </PaymentSheet>
  );
}
