import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput } from 'react-native';
import { useDispatch } from 'react-redux';
import { Check } from 'lucide-react-native';
import { C, Spinner } from '@/components/product/ui';
import { TS, tpx } from '@/components/cart/CartBits';
import { getTotalPaid, getTotalDue } from '@/lib/requestMath';
import { openBkashGateway, reportBkashResult } from '@/lib/payments';
import { uploadPaymentRequestRedux2 } from '@/store/actions';
import { toast } from '@/lib/toast';
import {
  PaymentSheet, SheetBody, SheetFooter, GhostButton, SolidButton, MethodTabs, TabPane,
  DepositBanner, BanknoteTile, AMBER_BOX, CARD_LABEL,
} from './PaymentSheet';
import BankPicker from './BankPicker';
import ManualBkashTotal from './ManualBkashTotal';
import BkashPanel from './BkashPanel';
import ScreenshotUpload, { useScreenshotUpload } from './ScreenshotUpload';

/* ═══════════════════════════════════════════════════════════════════════
   Port of the web's BookingPaymentModal (declared inline in
   app/pages/dashboard/buy-and-ship-for-me/my-request/page.jsx) at its
   mobile breakpoint. Pays one "Buy For Me" product request, or several at
   once (combined), with the product-request maths of lib/requestMath.

     header   Make Payment · "Booking: id" / "Combined Payment · N requests"
     card     "Amount to Pay" — an underlined 24px input seeded with the full
              due, "Tk"; Total due · Paid · Min 60% (first payment) chips;
              the yellow Banknote tile
     tabs     Mobile Banking (bKash gateway, 1.5%) / Direct Deposit (bank
              list + manual bKash 2% total, screenshot, Cancel / Submit)

   No "Pay More, Get More" step — the web offers it on orders only.

   Native differences, deliberate: a ref guard against a double submit; the
   amount input is uncontrolled; bKash opens in an in-app browser via
   lib/payments (in-app BkashCheckout).
   ═══════════════════════════════════════════════════════════════════════ */

export default function BookingPaymentModal({ visible, bookings = [], currentUser, onClose, onSuccess }) {
  const dispatch = useDispatch();
  const [tab, setTab] = useState('bkash');
  const [method, setMethod] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [amount, setAmount] = useState('');
  const [inputKey, setInputKey] = useState(0);
  const [focused, setFocused] = useState(false);
  const shot = useScreenshotUpload();
  const { imageUrl, imgLoading } = shot;
  const resetShot = useRef(shot.reset);
  resetShot.current = shot.reset;
  const busyRef = useRef(false);

  const isCombined = bookings.length > 1;
  const totalPaid = bookings.reduce((a, b) => a + getTotalPaid(b), 0);
  const totalDue = bookings.reduce((a, b) => a + Math.max(0, getTotalDue(b)), 0);
  const minFirst = Math.round((totalDue * 60) / 100);

  /* Fresh state each time it opens; the amount starts at the full due. */
  useEffect(() => {
    if (!visible) return;
    setTab('bkash');
    setMethod('');
    setSubmitting(false);
    busyRef.current = false;
    resetShot.current();
    setAmount(String(totalDue > 0 ? totalDue : ''));
    setInputKey((k) => k + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const payable = parseInt(amount, 10) || 0;

  const validate = () => {
    if (payable <= 0) {
      toast.error("Amount can't be 0.");
      return false;
    }
    if (payable > totalDue) {
      toast.error("Amount can't be more than due amount.");
      return false;
    }
    if (totalPaid === 0 && payable < minFirst) {
      toast.error(`First payment must be at least 60% of due (${minFirst} Tk).`);
      return false;
    }
    return true;
  };

  const buildPaymentObj = (extra = {}) => ({
    status: 'pending',
    paymentId: Math.floor(Math.random() * Date.now()),
    date: new Date().toLocaleDateString('en-GB'),
    amount: payable,
    payableTotal: payable,
    imageUrl: imageUrl || '',
    method,
    productRequestArray: bookings,
    userId: currentUser?.id,
    displayName: currentUser?.displayName,
    time: Date.now(),
    ...extra,
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
      await dispatch(uploadPaymentRequestRedux2(buildPaymentObj()));
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
        productRequest: true,
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

  return (
    <PaymentSheet
      visible={visible}
      onClose={onClose}
      zIndex={50}
      title="Make Payment"
      subtitle={isCombined ? `Combined Payment · ${bookings.length} requests` : `Booking: ${bookings[0]?.bookingId ?? ''}`}
    >
      {/* Amount card */}
      <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 }}>
        <View style={[{ borderRadius: 16, padding: 16 }, AMBER_BOX]}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={[CARD_LABEL, { marginBottom: 6 }]}>Amount to Pay</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <TextInput
                  key={inputKey}
                  defaultValue={amount}
                  onChangeText={setAmount}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  keyboardType="number-pad"
                  placeholder="0"
                  placeholderTextColor="rgba(31,41,55,0.5)"
                  style={{
                    width: 144,
                    height: 34,
                    fontSize: 24,
                    fontWeight: '800',
                    color: C.gray800,
                    backgroundColor: 'transparent',
                    borderBottomWidth: 2,
                    borderBottomColor: focused ? C.amber600 : C.amber400,
                    paddingHorizontal: 0,
                    paddingTop: 0,
                    paddingBottom: 2,
                    includeFontPadding: false,
                  }}
                />
                <Text style={[TS.base, { fontWeight: '700', color: C.gray500 }]}>Tk</Text>
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 8 }}>
                <Text style={[tpx(11), { color: C.gray400 }]}>
                  Total due: <Text style={{ fontWeight: '700', color: C.gray700 }}>{totalDue} Tk</Text>
                </Text>
                {totalPaid > 0 && (
                  <Text style={[tpx(11), { color: C.gray400 }]}>
                    Paid: <Text style={{ fontWeight: '700', color: C.green600 }}>{totalPaid} Tk</Text>
                  </Text>
                )}
                {totalPaid === 0 && totalDue > 0 && (
                  <Text style={[tpx(11), { color: C.amber600, fontWeight: '600' }]}>Min: {minFirst} Tk (60%)</Text>
                )}
              </View>
            </View>
            <BanknoteTile />
          </View>
        </View>
      </View>

      <MethodTabs tab={tab} onChange={setTab} />

      <SheetBody>
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
    </PaymentSheet>
  );
}
