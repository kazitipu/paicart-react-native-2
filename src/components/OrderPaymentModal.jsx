import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, TextInput, Pressable } from 'react-native';
import { useDispatch } from 'react-redux';
import Sheet from '@/components/ui/Sheet';
import Button from '@/components/ui/Button';
import BankPicker from '@/components/payments/BankPicker';
import ManualBkashTotal from '@/components/payments/ManualBkashTotal';
import ScreenshotUpload from '@/components/payments/ScreenshotUpload';
import TierPicker from '@/components/payments/TierPicker';
import { toast } from '@/lib/toast';
import { getTotalPaid, getTotalDue } from '@/lib/orderMath';
import {
  buildTiers, isOfferEligible, tierBreakdown, minFirstPayment, offerFieldsFor,
  MIN_FIRST_PAYMENT_PCT,
} from '@/lib/partialOffers';
import { gatewayBkashFee, openBkashGateway, GATEWAY_BKASH_FEE_PCT } from '@/lib/payments';
import { uploadOrderPaymentRequestRedux } from '@/store/actions';
import colors from '@/theme/colors';

/* Paying an existing order (or several at once) later. The pre-payment modal
   handles the moment right after checkout; this one handles everything after
   that, and is also the combined-payment path from the orders list. */
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

  const totalPaid = useMemo(() => orders.reduce((a, o) => a + getTotalPaid(o), 0), [orders]);
  const totalDue = useMemo(
    () => orders.reduce((a, o) => a + Math.max(0, getTotalDue(o)), 0),
    [orders],
  );

  const tiers = useMemo(() => buildTiers(activePartial, totalDue), [activePartial, totalDue]);
  const alreadyDiscounted = useMemo(
    () => orders.some((o) => parseFloat(o.offer) > 0),
    [orders],
  );
  const offerEligible = useMemo(
    () => isOfferEligible({ activePartial, totalPaid, alreadyDiscounted, totalDue, tiers }),
    [activePartial, totalPaid, alreadyDiscounted, totalDue, tiers],
  );

  const [step, setStep] = useState('payment');
  const [selectedTier, setSelectedTier] = useState(null);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('City');
  const [tab, setTab] = useState('direct');
  const [imageUrl, setImageUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setStep(offerEligible ? 'tier' : 'payment');
    setSelectedTier(null);
    setImageUrl('');
    /* Default to 60% of due — the minimum allowed first payment — rather than
       the full amount, unless the caller passed a specific intended figure
       (e.g. a tier already chosen on the orders list). */
    const seed =
      initialAmount != null
        ? initialAmount
        : totalPaid === 0 && totalDue > 0
          ? minFirstPayment(totalDue)
          : totalDue;
    setAmount(String(seed > 0 ? Math.round(seed) : ''));
  }, [visible, offerEligible, initialAmount, totalPaid, totalDue]);

  const selectedTierObj = tiers.find((t) => t.pct === selectedTier) || null;
  const { discountedDue } = tierBreakdown(selectedTierObj, totalDue);

  /* Taking a tier fixes the amount — the discount is earned by paying exactly
     that share, so an edited amount would not qualify. */
  const applyTier = (tier) => {
    setSelectedTier(tier ? tier.pct : null);
    if (tier) {
      const { payNow } = tierBreakdown(tier, totalDue);
      setAmount(String(payNow));
    }
    setStep('payment');
  };

  const payable = parseInt(amount, 10) || 0;
  const bkashFee = gatewayBkashFee(payable);
  const bkashTotal = parseFloat((payable + bkashFee).toFixed(2));

  const validate = () => {
    if (payable <= 0) {
      toast.error("Amount can't be 0.");
      return false;
    }
    if (payable > (selectedTierObj ? discountedDue : Math.round(totalDue))) {
      toast.error("Amount can't be more than due amount.");
      return false;
    }
    /* A tier already fixes the amount at its share of the DISCOUNTED bill,
       which can legitimately fall below 60% of the pre-discount due. */
    if (!selectedTierObj && totalPaid === 0 && payable < minFirstPayment(totalDue)) {
      toast.error(
        `First payment must be at least ${MIN_FIRST_PAYMENT_PCT}% of due (${minFirstPayment(totalDue)} Tk).`,
      );
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
    if (!validate()) return;
    if (!imageUrl) {
      toast.error('Please upload your transaction screenshot.');
      return;
    }
    setSubmitting(true);
    try {
      await dispatch(uploadOrderPaymentRequestRedux(buildPaymentObj()));
      onSuccess?.();
      toast.success('Payment request submitted! Our team will confirm it soon.');
      onClose?.();
    } catch {
      toast.error('Submission failed. Please try again.');
    }
    setSubmitting(false);
  };

  const handleBkashSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      await openBkashGateway({ ...buildPaymentObj({ method: 'Bkash' }), orderRequest: true });
      /* The gateway confirms server-side and the app is returned to via the
         paicart:// deep link, so nothing is written here. */
      onClose?.();
    } catch {
      toast.error('An error occurred! Please try again later.');
    }
    setSubmitting(false);
  };

  if (step === 'tier') {
    return (
      <Sheet
        visible={visible}
        onClose={onClose}
        title="Pay More, Get More"
        headerColor={colors.offer}
      >
        <TierPicker
          tiers={tiers}
          totalDue={totalDue}
          onPick={applyTier}
          onSkip={() => applyTier(null)}
        />
      </Sheet>
    );
  }

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={isCombined ? `Combined Payment · ${orders.length} orders` : `Order: #${orders[0]?.orderId ?? ''}`}
      headerColor={colors.primary}
      footer={
        <Button
          title={tab === 'direct' ? 'Submit Payment' : `Pay ৳${bkashTotal.toLocaleString()} with bKash`}
          loading={submitting}
          onPress={tab === 'direct' ? handleDirectSubmit : handleBkashSubmit}
          className={tab === 'bkash' ? 'bg-bkash' : ''}
        />
      }
    >
      {/* Total due */}
      <View
        className="rounded-2xl px-4 py-3 mb-4 border"
        style={{ backgroundColor: colors.amberSoft, borderColor: colors.amberLine }}
      >
        <View className="flex-row items-center justify-between">
          <Text className="text-3xs text-amber-900">Total Due</Text>
          <Text className="text-md font-extrabold text-amber-900">
            ৳{Math.round(selectedTierObj ? discountedDue : totalDue).toLocaleString()}
          </Text>
        </View>
        {totalPaid > 0 && (
          <View className="flex-row items-center justify-between mt-1">
            <Text className="text-3xs text-amber-900/70">Already paid</Text>
            <Text className="text-3xs font-semibold text-amber-900/70">
              ৳{Math.round(totalPaid).toLocaleString()}
            </Text>
          </View>
        )}
      </View>

      <Text className="text-3xs font-extrabold text-gray-500 uppercase tracking-widest mb-2">
        Amount to pay
      </Text>
      <TextInput
        value={amount}
        onChangeText={setAmount}
        keyboardType="number-pad"
        editable={!selectedTierObj}
        className={`border rounded-xl px-3 py-3 text-md font-bold text-foreground mb-1 ${selectedTierObj ? 'bg-gray-100 border-gray-200' : 'border-gray-300'}`}
      />
      {selectedTierObj && (
        <Text className="text-2xs text-gray-400 mb-3">
          Fixed by the {selectedTierObj.pct}% offer you selected.
        </Text>
      )}

      {/* Method tabs */}
      <View className="flex-row gap-2 mt-3 mb-4">
        {[
          { key: 'direct', label: 'Direct Deposit' },
          { key: 'bkash', label: 'Mobile Banking' },
        ].map((t) => {
          const active = tab === t.key;
          return (
            <Pressable
              key={t.key}
              onPress={() => setTab(t.key)}
              className="flex-1 rounded-xl py-2.5 items-center"
              style={
                active
                  ? { backgroundColor: t.key === 'bkash' ? colors.bkash : colors.teal }
                  : { backgroundColor: '#f1f5f9' }
              }
            >
              <Text className={`text-tiny font-bold ${active ? 'text-white' : 'text-gray-500'}`}>
                {t.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {tab === 'direct' ? (
        <>
          <BankPicker value={method} onChange={setMethod} />
          <ManualBkashTotal method={method} amount={payable} />
          <View className="mt-4">
            <ScreenshotUpload value={imageUrl} onChange={setImageUrl} />
          </View>
        </>
      ) : (
        <View
          className="rounded-2xl border px-4 py-3"
          style={{ backgroundColor: '#fdf2f8', borderColor: '#fbcfe8' }}
        >
          {[
            { label: 'Amount', value: `${payable.toLocaleString()} Tk` },
            { label: `Fee (${GATEWAY_BKASH_FEE_PCT}%)`, value: `${bkashFee} Tk`, muted: true },
            { label: 'Total', value: `${bkashTotal.toLocaleString()} Tk`, bold: true },
          ].map((r) => (
            <View key={r.label} className="flex-row items-center justify-between py-0.5">
              <Text className={`text-3xs ${r.muted ? 'text-gray-500' : 'text-gray-700'}`}>
                {r.label}
              </Text>
              <Text
                className={`text-3xs ${r.bold ? 'font-extrabold' : 'font-semibold'}`}
                style={r.bold ? { color: colors.bkash } : undefined}
              >
                {r.value}
              </Text>
            </View>
          ))}
        </View>
      )}
    </Sheet>
  );
}
