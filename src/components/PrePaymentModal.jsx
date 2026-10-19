import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useDispatch } from 'react-redux';
import Sheet from '@/components/ui/Sheet';
import Button from '@/components/ui/Button';
import BankPicker from '@/components/payments/BankPicker';
import ManualBkashTotal from '@/components/payments/ManualBkashTotal';
import ScreenshotUpload from '@/components/payments/ScreenshotUpload';
import TierPicker from '@/components/payments/TierPicker';
import { toast } from '@/lib/toast';
import { buildTiers, tierBreakdown, offerFieldsFor } from '@/lib/partialOffers';
import { gatewayBkashFee, openBkashGateway, GATEWAY_BKASH_FEE_PCT } from '@/lib/payments';
import { uploadOrderPaymentRequestRedux } from '@/store/actions';
import colors from '@/theme/colors';

/* Opens immediately after Place Order writes the order documents, while they
 * are still `paymentStatus: 'purchaseLater'`.
 *
 * The difference from OrderPaymentModal: there is nothing paid yet and no
 * per-order due to reconcile, so the tier is offered against the whole
 * `totalPayable` and the amount is always the tier's share (or the full bill).
 */
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

  const minimumOrderAmount = parseFloat(activePartial?.minimumOrderAmount) || 0;
  const tiers = useMemo(
    () => buildTiers(activePartial, totalPayable),
    [activePartial, totalPayable],
  );
  const tierEligible =
    !!activePartial && totalPayable >= minimumOrderAmount && tiers.some((t) => t.offer > 0);

  const [step, setStep] = useState('payment');
  const [selectedTier, setSelectedTier] = useState(null);
  const [method, setMethod] = useState('City');
  const [tab, setTab] = useState('bkash');
  const [imageUrl, setImageUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setStep(tierEligible ? 'tier' : 'payment');
    setSelectedTier(null);
    setImageUrl('');
  }, [visible, tierEligible]);

  const selectedTierObj = tiers.find((t) => t.pct === selectedTier) || null;
  const { payNow, dueLater } = tierBreakdown(selectedTierObj, totalPayable);
  const payable = Math.round(payNow);
  const bkashFee = gatewayBkashFee(payable);
  const bkashTotal = parseFloat((payable + bkashFee).toFixed(2));

  const applyTier = (tier) => {
    setSelectedTier(tier ? tier.pct : null);
    setStep('payment');
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
    if (payable <= 0) {
      toast.error("Amount can't be 0.");
      return;
    }
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
    if (payable <= 0) {
      toast.error("Amount can't be 0.");
      return;
    }
    setSubmitting(true);
    try {
      await openBkashGateway({ ...buildPaymentObj({ method: 'Bkash' }), payerPhone: currentUser?.mobileNo || '', orderRequest: true });
      onClose?.();
    } catch {
      toast.error('An error occurred! Please try again later.');
    }
    setSubmitting(false);
  };

  if (step === 'tier') {
    return (
      <Sheet visible={visible} onClose={onClose} title="Pay More, Get More" headerColor={colors.offer}>
        <TierPicker
          tiers={tiers}
          totalDue={totalPayable}
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
      title="Complete your payment"
      subtitle={`${orders.length} order${orders.length === 1 ? '' : 's'} placed`}
      headerColor={colors.primary}
      footer={
        <View>
          <Button
            title={tab === 'direct' ? 'Submit Payment' : `Pay ৳${bkashTotal.toLocaleString()} with bKash`}
            loading={submitting}
            onPress={tab === 'direct' ? handleDirectSubmit : handleBkashSubmit}
            className={tab === 'bkash' ? 'bg-bkash' : ''}
          />
          <Pressable onPress={onClose} className="py-3 items-center">
            <Text className="text-smd text-gray-500 font-semibold">I'll pay later</Text>
          </Pressable>
        </View>
      }
    >
      <View
        className="rounded-2xl px-4 py-3 mb-4 border"
        style={{ backgroundColor: colors.amberSoft, borderColor: colors.amberLine }}
      >
        <View className="flex-row items-center justify-between">
          <Text className="text-3xs text-amber-900">Pay now</Text>
          <Text className="text-md font-extrabold text-amber-900">
            ৳{payable.toLocaleString()}
          </Text>
        </View>
        {selectedTierObj && (
          <>
            <View className="flex-row items-center justify-between mt-1">
              <Text className="text-3xs text-amber-900/70">
                Discount ({selectedTierObj.pct}% offer)
              </Text>
              <Text className="text-3xs font-semibold text-amber-900/70">
                −৳{selectedTierObj.discountAmount.toLocaleString()}
              </Text>
            </View>
            {dueLater > 0 && (
              <View className="flex-row items-center justify-between mt-0.5">
                <Text className="text-3xs text-amber-900/70">Due later</Text>
                <Text className="text-3xs font-semibold text-amber-900/70">
                  ৳{dueLater.toLocaleString()}
                </Text>
              </View>
            )}
          </>
        )}
      </View>

      <View className="flex-row gap-2 mb-4">
        {[
          { key: 'bkash', label: 'Mobile Banking' },
          { key: 'direct', label: 'Direct Deposit' },
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
