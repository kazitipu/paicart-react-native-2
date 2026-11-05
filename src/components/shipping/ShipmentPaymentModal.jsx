import React, { useEffect, useRef, useState } from 'react';
import { View, Text } from 'react-native';
import { useDispatch } from 'react-redux';
import { Check } from 'lucide-react-native';
import { C, Spinner } from '@/components/product/ui';
import { TS } from '@/components/cart/CartBits';
import { openBkashGateway, reportBkashResult } from '@/lib/payments';
import { uploadShipmentPaymentRequestRedux } from '@/store/actions';
import { toast } from '@/lib/toast';
import {
  PaymentSheet, SheetBody, SheetFooter, GhostButton, SolidButton, MethodTabs, TabPane,
  DepositBanner, BanknoteTile, AMBER_BOX, CARD_LABEL, PAY, TAB_SHADOW_SHIP,
} from '@/components/payments/PaymentSheet';
import BankPicker from '@/components/payments/BankPicker';
import ManualBkashTotal from '@/components/payments/ManualBkashTotal';
import BkashPanel from '@/components/payments/BkashPanel';
import ScreenshotUpload, { useScreenshotUpload } from '@/components/payments/ScreenshotUpload';

/* ═══════════════════════════════════════════════════════════════════════
   Port of the web's PaymentModal (app/pages/dashboard/ship-for-me/
   my-request/_shared.jsx) at its mobile breakpoint. Settles the freight
   invoice on one Ship For Me booking or several at once (combined).

     header   Make Payment · "Booking: id" / "Combined Payment · N bookings"
     card     "Total Payable" — the sum of shippingChargeCustomer (30px),
              "{receivedWeight} kg × ৳{customerRate}/kg" for a single
              booking, the 56px yellow Banknote tile. Fixed amount — there is
              no amount input and no partial payment here.
     tabs     #00857A (darker than the other sheets' #00B8A9)
              Mobile Banking (bKash gateway, 1.5%, first row "Total") /
              Direct Deposit (bank list + manual bKash 2% total,
              screenshot, Cancel / Submit)

   Native differences, deliberate: a ref guard against a double submit; bKash
   runs in the in-app BkashCheckout screen (lib/payments).
   ═══════════════════════════════════════════════════════════════════════ */

export default function ShipmentPaymentModal({ visible, bookings = [], currentUser, onClose, onSuccess }) {
  const dispatch = useDispatch();
  const [tab, setTab] = useState('bkash');
  const [method, setMethod] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const shot = useScreenshotUpload();
  const { imageUrl, imgLoading } = shot;
  const resetShot = useRef(shot.reset);
  resetShot.current = shot.reset;
  const busyRef = useRef(false);

  const isCombined = bookings.length > 1;
  const total = bookings.reduce((a, b) => a + (parseInt(b.shippingChargeCustomer) || 0), 0);
  const single = bookings[0];

  /* Fresh state each time it opens — the web mounted a new instance. */
  useEffect(() => {
    if (!visible) return;
    setTab('bkash');
    setMethod('');
    setSubmitting(false);
    busyRef.current = false;
    resetShot.current();
  }, [visible]);

  const buildPaymentObj = (overrides = {}) => {
    const date = new Date();
    return {
      status: 'pending',
      paymentId: Math.floor(Math.random() * Date.now()),
      date: date.toLocaleDateString('en-GB'),
      amount: total,
      imageUrl: imageUrl || '',
      method,
      productRequestArray: bookings,
      userId: currentUser?.id,
      displayName: currentUser?.displayName,
      time: date.getTime(),
      ...overrides,
    };
  };

  const handleDirectSubmit = async () => {
    if (busyRef.current) return;
    if (imgLoading) {
      toast.error('Please wait for the image to finish uploading.');
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
      await dispatch(uploadShipmentPaymentRequestRedux(buildPaymentObj()));
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
    busyRef.current = true;
    setSubmitting(true);
    try {
      /* The web sent payableTotal: total and
         payableTotalWithGatewayCharge: parseInt(parseInt(total × 1.5%) +
         parseInt(total)) — lib/payments computes the same figure from
         `amount` (total is already an integer) and adds the in-app
         return url. */
      const result = await openBkashGateway({
        ...buildPaymentObj({ method: 'Bkash' }),
        payableTotal: total,
        payerPhone: currentUser?.mobileNo || '',
        shipForMe: true,
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
      subtitle={isCombined ? `Combined Payment · ${bookings.length} bookings` : `Booking: ${single?.bookingId ?? ''}`}
    >
      {/* Amount card */}
      <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 }}>
        <View
          style={[{ borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, AMBER_BOX]}
        >
          <View style={{ flexShrink: 1 }}>
            <Text style={CARD_LABEL}>Total Payable</Text>
            {/* text-3xl font-extrabold leading-tight; "Tk" text-base ml-1 */}
            <Text style={{ fontSize: 30, lineHeight: 37.5, fontWeight: '800', color: C.gray800 }}>
              {total}
              <Text style={{ fontSize: 16, fontWeight: '700', color: C.gray500 }}> Tk</Text>
            </Text>
            {!isCombined && single?.receivedWeight && single?.customerRate ? (
              <Text style={[TS.xs, { color: C.gray400, marginTop: 2 }]}>
                {single.receivedWeight} kg × ৳{single.customerRate}/kg
              </Text>
            ) : null}
          </View>
          <BanknoteTile size={56} icon={26} shadow="0 4px 14px rgba(245,158,11,0.333)" />
        </View>
      </View>

      <MethodTabs tab={tab} onChange={setTab} color={PAY.TEAL_SHIP} shadow={TAB_SHADOW_SHIP} />

      <SheetBody>
        {tab === 'direct' ? (
          <TabPane id="direct">
            <DepositBanner color={PAY.TEAL_SHIP} />
            <BankPicker method={method} onSelect={setMethod}>
              <ManualBkashTotal method={method} amount={total} style={{ marginTop: 0 }} />
            </BankPicker>
            <ScreenshotUpload imageUrl={imageUrl} loading={imgLoading} onPick={shot.pick} />
          </TabPane>
        ) : (
          <TabPane id="bkash">
            <BkashPanel
              method={method}
              onSelect={setMethod}
              payable={total}
              amountLabel="Total"
              onPay={handleBkashPayment}
              submitting={submitting}
            />
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
