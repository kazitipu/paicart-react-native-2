import React, { useEffect, useRef, useState } from 'react';
import { View, Text } from 'react-native';
import { useDispatch } from 'react-redux';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Check, ArrowRight } from 'lucide-react-native';
import { C, Spinner } from '@/components/product/ui';
import { TS, tpx } from '@/components/cart/CartBits';
import { buildTiers } from '@/lib/partialOffers';
import { openBkashGateway, reportBkashResult } from '@/lib/payments';
import { uploadOrderPaymentRequestRedux } from '@/store/actions';
import { toast } from '@/lib/toast';
import {
  PaymentSheet, SheetBody, SheetFooter, GhostButton, SolidButton, MethodTabs, TabPane,
  DepositBanner, BanknoteTile, AMBER_BOX, BIG_AMOUNT, CARD_LABEL,
} from '@/components/payments/PaymentSheet';
import TierPicker from '@/components/payments/TierPicker';
import BankPicker from '@/components/payments/BankPicker';
import ManualBkashTotal from '@/components/payments/ManualBkashTotal';
import BkashPanel from '@/components/payments/BkashPanel';
import ScreenshotUpload, { useScreenshotUpload } from '@/components/payments/ScreenshotUpload';

/* ═══════════════════════════════════════════════════════════════════════
   Port of paicart-nextjs15 src/components/PrePaymentModal.jsx at its mobile
   breakpoint (< 640px: bottom sheet, rounded-t-3xl, max-h 92vh, orange
   handle strip).

   Opens right after Place Order wrote the order documents (paymentStatus
   "purchaseLater"). Two steps when an admin "Pay More, Get More" offer is
   active and the bill reaches its minimum (tier picker → payment method);
   otherwise straight to the payment step.

   onClose   — backed out without paying (X, scrim, Cancel, Android back).
               The order still exists; the caller sends them to My Orders.
   onSuccess — a direct-deposit payment request was submitted, or a bKash
               checkout (in-app, see BkashCheckout) went through. The caller
               shows the order-success screen. (The previous RN version
               called onClose right after onSuccess, which navigated away
               from the success screen immediately — the web never did.)

   Native differences: in-screen overlay instead of RN <Modal>; the bank
   account number keeps BankPicker's copy button (mistyping an account
   number on a phone loses a payment); the bKash gateway opens in an in-app
   browser via lib/payments (no window.location on mobile).
   ═══════════════════════════════════════════════════════════════════════ */

/* Built from the shared pieces in components/payments/ (PaymentSheet,
   TierPicker, BankPicker, ManualBkashTotal, BkashPanel, ScreenshotUpload) —
   the same blocks the order / booking / shipment sheets use. */
export default function PrePaymentModal({
  visible,
  orders = [],
  totalPayable = 0,
  activePartial,
  currentUser,
  onClose,
  onSuccess,
}) {
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();

  const minimumOrderAmount = parseFloat(activePartial?.minimumOrderAmount) || 0;
  const maximumDiscountAmount = parseFloat(activePartial?.maximumDiscountAmount) || 0;
  const offerTiers = buildTiers(activePartial, totalPayable);
  const offerEligible = !!activePartial && totalPayable >= minimumOrderAmount;

  const [step, setStep] = useState(offerEligible ? 'tier' : 'payment');
  const [selectedTier, setSelectedTier] = useState(null);
  const [tab, setTab] = useState('bkash');
  const [method, setMethod] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const shot = useScreenshotUpload();
  const { imageUrl, imgLoading } = shot;
  const resetShot = useRef(shot.reset);
  resetShot.current = shot.reset;

  /* Fresh state each time it opens — the web mounted a new instance. */
  useEffect(() => {
    if (!visible) return;
    setStep(offerEligible ? 'tier' : 'payment');
    setSelectedTier(null);
    setTab('bkash');
    setMethod('');
    resetShot.current();
    setSubmitting(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const selectedTierObj = offerTiers.find((tr) => tr.pct === selectedTier) || null;
  const discountedTotal = selectedTierObj
    ? Math.round(totalPayable - selectedTierObj.discountAmount)
    : Math.round(totalPayable);
  const payable = selectedTierObj ? Math.round(discountedTotal * (selectedTierObj.pct / 100)) : discountedTotal;
  const dueLaterAmount = discountedTotal - payable;

  const buildPaymentObj = (overrides = {}) => ({
    status: 'pending',
    paymentId: Math.floor(Math.random() * Date.now()),
    date: new Date().toLocaleDateString('en-GB'),
    amount: payable,
    payableTotal: payable,
    /* The tier taken, as plain numbers (20, not "20%"); zeros when none —
       exactly what the web writes. */
    offer: selectedTierObj ? selectedTierObj.offer : 0,
    offerPayNowPercent: selectedTierObj ? selectedTierObj.pct : 0,
    offerDiscountAmount: selectedTierObj ? selectedTierObj.discountAmount : 0,
    imageUrl: imageUrl || '',
    method,
    pendingOrders: orders,
    userId: currentUser?.id,
    displayName: currentUser?.displayName,
    time: Date.now(),
    ...overrides,
  });

  const handleDirectSubmit = async () => {
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
    setSubmitting(true);
    try {
      await dispatch(uploadOrderPaymentRequestRedux(buildPaymentObj()));
      toast.success('Payment request submitted! Our team will confirm it soon.');
      setSubmitting(false);
      onSuccess?.();
      return;
    } catch {
      toast.error('Submission failed. Please try again.');
    }
    setSubmitting(false);
  };

  const handleBkashPayment = async () => {
    setSubmitting(true);
    try {
      /* lib/payments adds payableTotalWithGatewayCharge (the web's
         truncating parseInt formula) and the in-app return URL. */
      const result = await openBkashGateway({
        ...buildPaymentObj({ method: 'Bkash' }),
        payerPhone: currentUser?.mobileNo || '',
        orderRequest: true,
      });

      /* Checkout ran inside the app (BkashCheckout). Paid → the web's
         "Order Placed!" screen; otherwise say why and keep this sheet open
         so they can retry or pick another method. The order exists either way. */
      const paid = reportBkashResult(result, { quietSuccess: true });
      setSubmitting(false);
      if (paid) onSuccess?.();
      return;
    } catch {
      toast.error('An error occurred! Please try again later.');
    }
    setSubmitting(false);
  };

  const isTier = step === 'tier';

  return (
    <PaymentSheet
      visible={visible}
      onClose={onClose}
      title={isTier ? 'Choose Payment Offer' : 'Make Payment'}
      subtitle={isTier ? 'Pay more now, save more' : 'Total Payable Now'}
      onBack={!isTier && offerEligible ? () => setStep('tier') : undefined}
      backLabel="Back to offers"
    >
      {isTier ? (
        /* ── Step 1: tier picker ── */
        <>
          <SheetBody>
            <TierPicker
              label="Total Payable Now"
              base={totalPayable}
              tiers={offerTiers}
              selectedTier={selectedTier}
              onSelect={setSelectedTier}
              discountedTotal={discountedTotal}
              payNow={payable}
              dueLater={dueLaterAmount}
              maximumDiscountAmount={maximumDiscountAmount}
            />
          </SheetBody>

          <SheetFooter bottomInset={insets.bottom}>
            <GhostButton
              title="Skip Offer"
              onPress={() => {
                setSelectedTier(null);
                setStep('payment');
              }}
            />
            <SolidButton onPress={() => setStep('payment')} disabled={!selectedTierObj}>
              <Text style={[TS.sm, { fontWeight: '700', color: '#ffffff' }]}>Continue</Text>
              <ArrowRight size={14} color="#ffffff" />
            </SolidButton>
          </SheetFooter>
        </>
      ) : (
        /* ── Step 2: payment method ── */
        <>
          <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 }}>
            <View
              style={[
                { borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
                AMBER_BOX,
              ]}
            >
              <View style={{ flexShrink: 1 }}>
                <Text style={CARD_LABEL}>{selectedTierObj ? `Pay Now (${selectedTierObj.pct}%)` : 'Total Payable Now'}</Text>
                <Text style={BIG_AMOUNT}>৳{payable.toLocaleString()}</Text>
                {dueLaterAmount > 0 && (
                  <Text style={[tpx(11), { color: C.gray500, fontWeight: '600', marginTop: 2 }]}>
                    Due later: ৳{dueLaterAmount.toLocaleString()}
                  </Text>
                )}
              </View>
              <BanknoteTile />
            </View>
          </View>

          <MethodTabs tab={tab} onChange={setTab} />

          <SheetBody bottomPad={tab === 'bkash' ? insets.bottom : 0}>
            {tab === 'direct' ? (
              <TabPane id="direct">
                <DepositBanner />
                <BankPicker method={method} onSelect={setMethod}>
                  <ManualBkashTotal method={method} amount={payable} style={{ marginTop: 0 }} />
                </BankPicker>
                <ScreenshotUpload imageUrl={imageUrl} loading={imgLoading} onPick={shot.pick} />
              </TabPane>
            ) : (
              <TabPane id="bkash">
                <BkashPanel
                  method={method}
                  onSelect={setMethod}
                  payable={payable}
                  onPay={handleBkashPayment}
                  submitting={submitting}
                  busyLabel="Processing…"
                />
              </TabPane>
            )}
          </SheetBody>

          {tab === 'direct' && (
            <SheetFooter bottomInset={insets.bottom}>
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
