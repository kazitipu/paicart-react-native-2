import React from 'react';
import { View, Text } from 'react-native';
import { MANUAL_BKASH_FEE_PCT, manualBkashFee } from '@/lib/payments';

/* Shown only for the manual bKash route, where the customer sends the money
   themselves and therefore covers bKash's send-money charge on top. The hosted
   gateway uses a different rate — see lib/payments.js. */
export default function ManualBkashTotal({ method, amount, label = 'Send to bKash' }) {
  const payable = parseFloat(amount) || 0;
  if (method !== 'Bkash' || payable <= 0) return null;
  const fee = manualBkashFee(payable);

  return (
    <View
      className="mt-2 rounded-xl border px-3 py-2"
      style={{ backgroundColor: '#fdf2f8', borderColor: '#fbcfe8' }}
    >
      <View className="flex-row items-center justify-between py-0.5">
        <Text className="text-3xs text-gray-600">Order amount</Text>
        <Text className="text-3xs font-semibold text-gray-600">
          {payable.toLocaleString()} Tk
        </Text>
      </View>
      <View className="flex-row items-center justify-between py-0.5">
        <Text className="text-3xs text-gray-600">bKash charge ({MANUAL_BKASH_FEE_PCT}%)</Text>
        <Text className="text-3xs font-semibold text-gray-600">
          +{fee.toLocaleString()} Tk
        </Text>
      </View>
      <View
        className="flex-row items-center justify-between pt-1 mt-1 border-t"
        style={{ borderColor: '#fbcfe8' }}
      >
        <Text className="text-tiny font-extrabold" style={{ color: '#e2136e' }}>
          {label}
        </Text>
        <Text className="text-tiny font-extrabold" style={{ color: '#e2136e' }}>
          {(payable + fee).toLocaleString()} Tk
        </Text>
      </View>
    </View>
  );
}
