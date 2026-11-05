import React from 'react';
import { View, Text } from 'react-native';
import { applyDiscount } from '@/lib/discount';
import { Price, t, C, ORANGE, ORANGE2 } from './ui';

/* ─── Wholesale price tiers ───
   One column per price break with the quantity band under it, the tier the
   current total actually falls into highlighted. `bare` is the drawer header
   form: just the price columns, no cards. */
const tierInfo = (priceRange, i, taka) => {
  const tier = priceRange[i];
  const minQty = i === 0 ? 1 : parseInt(tier[0] ?? tier.beginAmount ?? 0, 10);
  const tierPrice = parseFloat(tier[1] ?? tier.price ?? 0);
  const next = priceRange[i + 1];
  const nextMin = next ? parseInt(next[0] ?? next.beginAmount ?? 0, 10) : null;
  const band = i === 0 ? `1–${nextMin ? nextMin - 1 : '∞'}` : `${minQty}+`;
  return { tierBdt: Math.round(tierPrice * taka), band };
};

export default function PriceTierRow({ priceRange, taka, discountPct, activePriceTier, bare = false }) {
  if (!priceRange?.length) return null;

  if (bare) {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 12 }}>
        {priceRange.map((_, i) => {
          const { tierBdt, band } = tierInfo(priceRange, i, taka);
          const isActive = i === activePriceTier;
          return (
            <View key={i}>
              <Text
                style={[
                  t(isActive ? 'lg' : 'sm', 'none'),
                  { fontWeight: '800', color: isActive ? ORANGE : C.gray500 },
                ]}
                numberOfLines={1}
              >
                ৳{Math.round(applyDiscount(tierBdt, discountPct)).toLocaleString()}
              </Text>
              <Text
                style={[
                  t('9'),
                  { marginTop: 4, color: isActive ? 'rgba(255,106,0,0.7)' : C.gray400, fontWeight: isActive ? '600' : '400' },
                ]}
                numberOfLines={1}
              >
                {band} pcs
              </Text>
            </View>
          );
        })}
      </View>
    );
  }

  return (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      {priceRange.map((_, i) => {
        const { tierBdt, band } = tierInfo(priceRange, i, taka);
        const isActive = i === activePriceTier;
        return (
          <View
            key={i}
            style={{
              flex: 1,
              minWidth: 0,
              alignItems: 'center',
              borderRadius: 12,
              borderWidth: 2,
              paddingVertical: 12,
              paddingHorizontal: 8,
              borderColor: isActive ? ORANGE2 : C.gray200,
              backgroundColor: isActive ? C.orange50 : C.gray50,
            }}
          >
            <Price
              amount={Math.round(applyDiscount(tierBdt, discountPct))}
              original={tierBdt}
              containerStyle={{ justifyContent: 'center' }}
              style={[t(isActive ? 'xl' : 'lg', 'tight'), { fontWeight: '800', color: isActive ? ORANGE2 : C.gray700 }]}
            />
            <Text
              style={[t('11'), { marginTop: 2, fontWeight: '500', color: isActive ? 'rgba(255,102,0,0.8)' : C.gray400 }]}
              numberOfLines={1}
            >
              {band} pcs
            </Text>
          </View>
        );
      })}
    </View>
  );
}
