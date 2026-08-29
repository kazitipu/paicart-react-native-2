import React, { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Plane, Ship, Check } from 'lucide-react-native';
import Sheet from '@/components/ui/Sheet';
import { buildRateTiers, chargeFor } from '@/lib/freight';
import colors from '@/theme/colors';

/* Air and Sea side by side, with the tier that applies to this parcel
   highlighted — the web modal did the same rather than showing only the
   active mode, so the customer can see what switching would cost. */
export default function ShippingRateModal({
  visible,
  onClose,
  categoryRate,
  weightKg,
  isDgGoods,
  shipMode,
  onSelectMode,
  goodsTypeOptions,
  goodsType,
  onSelectGoodsType,
}) {
  const [mode, setMode] = useState(shipMode || 'air');

  const tiers = buildRateTiers(categoryRate, mode, weightKg, isDgGoods);
  const charge = chargeFor(categoryRate, mode, weightKg, isDgGoods);

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Shipping rates"
      subtitle={weightKg > 0 ? `Approx. ${weightKg} kg` : 'Select a quantity to see a charge'}
      headerColor={colors.primary}
    >
      {/* Goods type — drives the Hong Kong `_hk` tier. */}
      {goodsTypeOptions?.length > 1 && (
        <View className="mb-4">
          <Text className="text-3xs font-extrabold text-gray-500 uppercase tracking-widest mb-2">
            Goods type
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {goodsTypeOptions.map((g) => {
              const active = g.id === goodsType;
              return (
                <Pressable
                  key={g.id}
                  onPress={() => onSelectGoodsType(g.id)}
                  className={`flex-row items-center gap-1.5 rounded-full px-3 py-1.5 border ${active ? 'border-primary bg-primary-tint' : 'border-gray-200 bg-white'}`}
                >
                  {g.Icon && <g.Icon size={12} color={active ? colors.primary : colors.muted} />}
                  <Text className={`text-3xs font-semibold ${active ? 'text-primary' : 'text-gray-600'}`}>
                    {g.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Text className="text-xxs text-gray-400 mt-2">
            Batteries, liquids, chemicals and magnets cannot be flown out of the mainland — they
            route through Hong Kong and are priced differently.
          </Text>
        </View>
      )}

      {/* Mode */}
      <View className="flex-row gap-2 mb-4">
        {[
          { key: 'air', label: 'By Air', Icon: Plane },
          { key: 'sea', label: 'By Sea', Icon: Ship },
        ].map((m) => {
          const active = mode === m.key;
          return (
            <Pressable
              key={m.key}
              onPress={() => setMode(m.key)}
              className={`flex-1 flex-row items-center justify-center gap-1.5 rounded-xl py-2.5 border-2 ${active ? 'border-primary bg-primary-tint' : 'border-gray-200'}`}
            >
              <m.Icon size={14} color={active ? colors.primary : colors.muted} />
              <Text className={`text-smd font-bold ${active ? 'text-primary' : 'text-gray-500'}`}>
                {m.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {tiers.map((t) => (
        <View
          key={t.sub}
          className={`flex-row items-center justify-between rounded-xl px-3 py-2.5 mb-2 border ${t.active ? 'border-primary bg-primary-tint' : 'border-gray-100 bg-gray-50'}`}
        >
          <View className="flex-1">
            <Text className={`text-smd font-semibold ${t.active ? 'text-primary' : 'text-foreground'}`}>
              {t.label}
            </Text>
            <Text className="text-xxs text-gray-400">{t.sub}</Text>
          </View>
          <Text className={`text-smd font-extrabold ${t.active ? 'text-primary' : 'text-gray-600'}`}>
            ৳{t.rate.toLocaleString()}
            <Text className="text-xxs font-normal">{t.unit}</Text>
          </Text>
        </View>
      ))}

      {weightKg > 0 && (
        <View className="rounded-xl bg-amber-soft border border-amber-line px-3 py-2.5 mt-2">
          <View className="flex-row items-center justify-between">
            <Text className="text-smd font-bold text-amber-900">
              Estimated {mode === 'air' ? 'air' : 'sea'} freight
            </Text>
            <Text className="text-md font-extrabold text-amber-900">
              ৳{charge.toLocaleString()}
            </Text>
          </View>
        </View>
      )}

      <Pressable
        onPress={() => {
          onSelectMode(mode);
          onClose();
        }}
        className="flex-row items-center justify-center gap-1.5 bg-primary rounded-xl py-3 mt-4"
      >
        <Check size={15} color="#ffffff" />
        <Text className="text-white font-bold text-smd">
          Ship by {mode === 'air' ? 'Air' : 'Sea'}
        </Text>
      </Pressable>
    </Sheet>
  );
}
