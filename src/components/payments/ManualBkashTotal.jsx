import React from 'react';
import { View, Text } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { C } from '@/components/product/ui';
import { TS, tpx } from '@/components/cart/CartBits';
import { MANUAL_BKASH_FEE_PCT, manualBkashFee } from '@/lib/payments';
import { PAY } from './PaymentSheet';

/* Port of the web's ManualBkashTotal (ship-for-me/my-request/_shared.jsx).
 *
 * bKash charges the sender a cash-out fee on a personal-account transfer, so
 * the amount the customer actually has to send is higher than the amount
 * credited to the order. Shown wherever a manual bKash transfer is selected —
 * the gateway flow carries its own (different, 1.5%) fee.
 *
 * mt-2 rounded-xl border px-3 py-2 space-y-1, #fdf2f8 / #fbcfe8. The web's
 * mt-2 collapses into the surrounding space-y-2 inside the bank list, so the
 * list passes `style={{ marginTop: 0 }}` and its gap does the spacing. */
export default function ManualBkashTotal({ method, amount, label = 'Send to bKash', style }) {
  const payable = parseFloat(amount) || 0;
  if (method !== 'Bkash' || payable <= 0) return null;
  const fee = manualBkashFee(payable);
  return (
    <Animated.View
      entering={FadeIn.duration(180)}
      style={[
        {
          marginTop: 8,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: PAY.PINK200,
          backgroundColor: PAY.PINK50,
          paddingHorizontal: 12,
          paddingVertical: 8,
          gap: 4,
        },
        style,
      ]}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={[tpx(11), { color: C.gray600 }]}>Order amount</Text>
        <Text style={[tpx(11), { color: C.gray600, fontWeight: '600' }]}>{payable.toLocaleString()} Tk</Text>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={[tpx(11), { color: C.gray600 }]}>bKash charge ({MANUAL_BKASH_FEE_PCT}%)</Text>
        <Text style={[tpx(11), { color: C.gray600, fontWeight: '600' }]}>+{fee.toLocaleString()} Tk</Text>
      </View>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          paddingTop: 4,
          borderTopWidth: 1,
          borderTopColor: PAY.PINK200,
        }}
      >
        <Text style={[TS.xs, { fontWeight: '800', color: PAY.BKASH_TEXT }]}>{label}</Text>
        <Text style={[TS.xs, { fontWeight: '800', color: PAY.BKASH_TEXT }]}>{(payable + fee).toLocaleString()} Tk</Text>
      </View>
    </Animated.View>
  );
}
