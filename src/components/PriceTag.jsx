import React from 'react';
import { View, Text } from 'react-native';

/* Shared price display: the (possibly discounted) `amount` as the main price,
   with `original` struck through beside it whenever a real discount applies.
   Centralises formatting so every price call-site looks the same — the web app
   had this component but most screens bypassed it and hand-rolled `৳` + a
   toLocaleString, which is why the symbol drifted between `৳` and `Tk`. */
export default function PriceTag({
  amount,
  original,
  currency = '৳',
  className = '',
  originalClassName = '',
}) {
  const format = (n) => Math.round(Number(n) || 0).toLocaleString();
  const showOriginal = original != null && Number(original) > Number(amount);

  return (
    <View className="flex-row items-baseline flex-wrap">
      <Text className={className}>
        {currency}
        {format(amount)}
      </Text>
      {showOriginal && (
        <Text
          className={`text-gray-400 font-normal line-through ml-1.5 ${originalClassName}`}
        >
          {currency}
          {format(original)}
        </Text>
      )}
    </View>
  );
}
