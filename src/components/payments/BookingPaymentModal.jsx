import React, { useState, useMemo } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useDispatch } from 'react-redux';
import Sheet from '@/components/ui/Sheet';
import Button from '@/components/ui/Button';
import BankPicker from './BankPicker';
import ManualBkashTotal from './ManualBkashTotal';
import ScreenshotUpload from './ScreenshotUpload';
import { toast } from '@/lib/toast';
import { gatewayBkashFee, openBkashGateway, GATEWAY_BKASH_FEE_PCT } from '@/lib/payments';
import { uploadPaymentRequestRedux2 } from '@/store/actions';
import colors from '@/theme/colors';

/* Payment for "Buy For Me" product requests. The web declared this inline
   inside the my-request page rather than as a component, which is why it
   drifted from the order payment modal — it has no tier step, because the
   partial-payment offer applies to orders only. */
export default function BookingPaymentModal({
  visible, bookings = [], currentUser, onClose, onSuccess,
}) {
  const dispatch = useDispatch();
  const [tab, setTab] = useState('bkash');
  const [method, setMethod] = useState('City');
  const [imageUrl, setImageUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const totalDue = useMemo(
    () =>
      bookings.reduce((a, b) => {
        const total = parseInt(b.totalAmount ?? b.amount ?? 0, 10) || 0;
        const paid = (b.payments || []).reduce((x, p) => x + (parseInt(p.amount, 10) || 0), 0);
        return a + Math.max(0, total - paid);
      }, 0),
    [bookings],
  );

  const bkashFee = gatewayBkashFee(totalDue);
  const bkashTotal = parseFloat((totalDue + bkashFee).toFixed(2));

  const buildPaymentObj = (overrides = {}) => ({
    status: 'pending',
    paymentId: Math.floor(Math.random() * Date.now()),
    date: new Date().toLocaleDateString('en-GB'),
    amount: totalDue,
    payableTotal: totalDue,
    imageUrl: imageUrl || '',
    method,
    productRequestArray: bookings,
    userId: currentUser?.id,
    displayName: currentUser?.displayName,
    time: Date.now(),
    ...overrides,
  });

  const submitDirect = async () => {
    if (totalDue <= 0) {
      toast.error('Nothing due on this request.');
      return;
    }
    if (!imageUrl) {
      toast.error('Please upload your transaction screenshot.');
      return;
    }
    setSubmitting(true);
    try {
      await dispatch(uploadPaymentRequestRedux2(buildPaymentObj()));
      toast.success('Payment request submitted! Our team will confirm it soon.');
      onSuccess?.();
    } catch {
      toast.error('Submission failed. Please try again.');
    }
    setSubmitting(false);
  };

  const submitBkash = async () => {
    if (totalDue <= 0) return;
    setSubmitting(true);
    try {
      await openBkashGateway({ ...buildPaymentObj({ method: 'Bkash' }), payerPhone: currentUser?.mobileNo || '', productRequest: true });
      onClose?.();
    } catch {
      toast.error('An error occurred! Please try again later.');
    }
    setSubmitting(false);
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={bookings.length > 1 ? `Combined Payment · ${bookings.length}` : 'Pay for request'}
      headerColor={colors.primary}
      footer={
        <Button
          title={tab === 'direct' ? 'Submit Payment' : `Pay ৳${bkashTotal.toLocaleString()} with bKash`}
          loading={submitting}
          onPress={tab === 'direct' ? submitDirect : submitBkash}
          className={tab === 'bkash' ? 'bg-bkash' : ''}
        />
      }
    >
      <View
        className="rounded-2xl px-4 py-3 mb-4 border"
        style={{ backgroundColor: colors.amberSoft, borderColor: colors.amberLine }}
      >
        <View className="flex-row items-center justify-between">
          <Text className="text-3xs text-amber-900">Total Due</Text>
          <Text className="text-md font-extrabold text-amber-900">
            ৳{totalDue.toLocaleString()}
          </Text>
        </View>
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
          <ManualBkashTotal method={method} amount={totalDue} />
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
            { label: 'Amount', value: `${totalDue.toLocaleString()} Tk` },
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
