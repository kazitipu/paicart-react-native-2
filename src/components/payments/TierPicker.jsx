import React from 'react';
import { View, Text } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Sparkles } from 'lucide-react-native';
import { C, Press } from '@/components/product/ui';
import { TS, tpx } from '@/components/cart/CartBits';
import { AMBER_BOX, BIG_AMOUNT, CARD_LABEL, PAY } from './PaymentSheet';

function Row({ label, value, valueStyle }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <Text style={[TS.xs, { color: C.gray500 }]}>{label}</Text>
      <Text style={[TS.xs, valueStyle]}>{value}</Text>
    </View>
  );
}

/* The "Pay More, Get More" step body, shared by PrePaymentModal (label
   "Total Payable Now") and OrderPaymentModal (label "Total Due"):

     amber card    — label + ৳{Math.round(base).toLocaleString()}
     dashed box    — Sparkles + যত বেশী পেমেন্ট, তত বেশী অফার, the Bangla
                     hint, a 3-column grid of Pay 60/80/100% tiles, and (once
                     a tier is picked) the Discounted Total / Pay Now / cap /
                     Due Later breakdown.

   `base` is the amount the tiers were computed from (totalPayable or
   totalDue) — the cap note compares base × offer% with the cap, as the web
   does. */
export default function TierPicker({
  label,
  base,
  tiers,
  selectedTier,
  onSelect,
  discountedTotal,
  payNow,
  dueLater,
  maximumDiscountAmount = 0,
}) {
  const selectedTierObj = tiers.find((tr) => tr.pct === selectedTier) || null;
  return (
    <>
      <View style={[{ borderRadius: 16, padding: 16 }, AMBER_BOX]}>
        <Text style={CARD_LABEL}>{label}</Text>
        <Text style={BIG_AMOUNT}>৳{Math.round(base).toLocaleString()}</Text>
      </View>

      <View
        style={{
          borderRadius: 16,
          borderWidth: 2,
          borderStyle: 'dashed',
          borderColor: 'rgba(255,102,0,0.3)',
          backgroundColor: 'rgba(255,247,237,0.5)',
          padding: 16,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <Sparkles size={16} color={PAY.OFFER} />
          <Text style={[TS.sm, { fontWeight: '800', color: C.gray900, flexShrink: 1 }]}>যত বেশী পেমেন্ট, তত বেশী অফার</Text>
        </View>
        <Text style={[TS.xs, { color: C.gray500, marginBottom: 12 }]}>এখনই পেমেন্ট করে বাড়তি ছাড় নিন — অপশনটি বেছে নিন</Text>

        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
          {tiers.map((tr) => {
            const on = selectedTier === tr.pct;
            return (
              <View key={tr.pct} style={{ flex: 1 }}>
                <Press
                  onPress={() => onSelect(tr.pct)}
                  style={({ pressed }) => ({
                    borderRadius: 12,
                    paddingVertical: 10,
                    paddingHorizontal: 6,
                    alignItems: 'center',
                    borderWidth: 2,
                    borderColor: on ? PAY.OFFER : pressed ? 'rgba(255,102,0,0.4)' : C.gray200,
                    backgroundColor: on ? PAY.OFFER : '#ffffff',
                  })}
                >
                  <Text style={[TS.xs, { fontWeight: '800', color: on ? '#ffffff' : C.gray700 }]}>Pay {tr.pct}%</Text>
                  <Text style={[tpx(10), { fontWeight: '700', marginTop: 2, color: on ? 'rgba(255,255,255,0.9)' : C.emerald600 }]}>
                    {tr.discountAmount > 0 ? `৳${tr.discountAmount.toLocaleString()} OFF` : 'No discount'}
                  </Text>
                </Press>
              </View>
            );
          })}
        </View>

        {selectedTierObj && (
          <Animated.View
            entering={FadeIn.duration(180)}
            style={{
              borderRadius: 12,
              backgroundColor: '#ffffff',
              borderWidth: 1,
              borderColor: C.orange100,
              paddingHorizontal: 12,
              paddingVertical: 10,
              gap: 4,
            }}
          >
            <Row label="Discounted Total" value={`৳${discountedTotal.toLocaleString()}`} valueStyle={{ fontWeight: '700', color: C.gray800 }} />
            <Row
              label={`Pay Now (${selectedTierObj.pct}%)`}
              value={`৳${payNow.toLocaleString()}`}
              valueStyle={{ fontWeight: '800', color: PAY.OFFER }}
            />
            {maximumDiscountAmount > 0 && base * (selectedTierObj.offer / 100) > maximumDiscountAmount && (
              <Text style={[tpx(10), { color: C.amber600 }]}>Discount capped at ৳{maximumDiscountAmount.toLocaleString()}</Text>
            )}
            {dueLater > 0 && (
              <Row label="Due Later" value={`৳${dueLater.toLocaleString()}`} valueStyle={{ fontWeight: '600', color: C.gray600 }} />
            )}
          </Animated.View>
        )}
      </View>
    </>
  );
}
