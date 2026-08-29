import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { tierBreakdown } from '@/lib/partialOffers';
import colors from '@/theme/colors';

/* The "Pay More, Get More" step. Bengali copy is kept verbatim from the web —
   it is what customers recognise. */
export default function TierPicker({ tiers, totalDue, onPick, onSkip }) {
  return (
    <View>
      <Text className="text-md font-extrabold text-foreground text-center">
        যত বেশী পেমেন্ট, তত বেশী অফার
      </Text>
      <Text className="text-3xs text-gray-500 text-center mt-1 mb-4">
        এখনই পেমেন্ট করে বাড়তি ছাড় নিন — অপশনটি বেছে নিন
      </Text>

      {tiers
        .filter((t) => t.offer > 0)
        .map((tier) => {
          const { payNow, dueLater } = tierBreakdown(tier, totalDue);
          return (
            <Pressable
              key={tier.pct}
              onPress={() => onPick(tier)}
              className="border-2 rounded-2xl px-4 py-3 mb-2.5 active:opacity-80"
              style={{ borderColor: colors.offer, backgroundColor: '#fff8f2' }}
            >
              <View className="flex-row items-center justify-between">
                <Text className="text-md font-extrabold" style={{ color: colors.offer }}>
                  Pay {tier.pct}% now
                </Text>
                <View className="rounded-full px-2.5 py-1" style={{ backgroundColor: colors.offer }}>
                  <Text className="text-white text-2xs font-extrabold">
                    Save ৳{tier.discountAmount.toLocaleString()}
                  </Text>
                </View>
              </View>
              <View className="flex-row items-center justify-between mt-2">
                <Text className="text-3xs text-gray-600">Pay now</Text>
                <Text className="text-3xs font-bold text-gray-800">
                  ৳{payNow.toLocaleString()}
                </Text>
              </View>
              {dueLater > 0 && (
                <View className="flex-row items-center justify-between mt-0.5">
                  <Text className="text-3xs text-gray-600">Due later</Text>
                  <Text className="text-3xs font-bold text-gray-800">
                    ৳{dueLater.toLocaleString()}
                  </Text>
                </View>
              )}
            </Pressable>
          );
        })}

      <Pressable onPress={onSkip} className="py-3 items-center">
        <Text className="text-smd text-gray-500 font-semibold">
          No thanks, pay a custom amount
        </Text>
      </Pressable>
    </View>
  );
}
