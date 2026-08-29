import React from 'react';
import { View, Text, Pressable, ScrollView, TextInput } from 'react-native';
import { Minus, Plus } from 'lucide-react-native';
import ProductImage from '@/components/ui/ProductImage';
import colors from '@/theme/colors';

/* Colour row + per-size quantity rows for the selected colour.
 *
 * A variant's `properties` string joins its dimension segments (e.g. "0:0;1:2")
 * in whatever order the source SKU's attribute list happened to be in — it is
 * NOT always colour-first. Every lookup therefore goes through
 * findVariantByProperties, which compares the sorted segment set. */
export default function VariantSelector({
  colorsArray,
  sizesArray,
  selectedColor,
  onSelectColor,
  skuQtys,
  onQtyChange,
  unitPriceFor,
  stockFor,
}) {
  const sizes = sizesArray.length > 0 ? sizesArray : [{ properties: '', name: 'Default' }];

  return (
    <View>
      {colorsArray.length > 0 && (
        <View className="mb-4">
          <Text className="text-3xs font-extrabold text-gray-500 uppercase tracking-widest mb-2">
            Colour · {colorsArray.length}
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {colorsArray.map((c) => {
              const active = c.properties === selectedColor;
              return (
                <Pressable
                  key={c.properties}
                  onPress={() => onSelectColor(c.properties)}
                  className={`rounded-xl overflow-hidden border-2 ${active ? 'border-primary' : 'border-gray-200'}`}
                  style={{ width: 64 }}
                >
                  {c.url ? (
                    <ProductImage uri={c.url} thumb className="w-full h-16" fallbackIconSize={14} />
                  ) : (
                    <View className="w-full h-16 bg-gray-100" />
                  )}
                  <Text
                    className={`text-xxs text-center py-1 ${active ? 'text-primary font-bold' : 'text-gray-500'}`}
                    numberOfLines={1}
                  >
                    {c.name}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}

      <Text className="text-3xs font-extrabold text-gray-500 uppercase tracking-widest mb-2">
        {sizesArray.length > 0 ? `Size · ${sizesArray.length}` : 'Quantity'}
      </Text>

      {sizes.map((s) => {
        const key = [selectedColor, s.properties].filter(Boolean).sort().join(';');
        const qty = skuQtys[key] || 0;
        const price = unitPriceFor(key);
        const stock = stockFor ? stockFor(key) : null;
        const out = stock != null && stock <= 0;

        return (
          <View
            key={s.properties || 'default'}
            className="flex-row items-center justify-between py-2 border-b border-gray-100"
          >
            <View className="flex-1 pr-3">
              <Text className={`text-smd ${out ? 'text-gray-300' : 'text-foreground'}`} numberOfLines={1}>
                {s.name}
              </Text>
              <View className="flex-row items-center gap-2">
                {price > 0 && (
                  <Text className="text-2xs text-brand font-bold">৳{price.toLocaleString()}</Text>
                )}
                {stock != null && (
                  <Text className="text-2xs text-gray-400">
                    {out ? 'Out of stock' : `${stock} available`}
                  </Text>
                )}
              </View>
            </View>

            <View className="flex-row items-center gap-2">
              <Pressable
                onPress={() => onQtyChange(key, Math.max(0, qty - 1))}
                disabled={out || qty === 0}
                hitSlop={6}
                className={`w-7 h-7 rounded-full border items-center justify-center ${qty === 0 ? 'border-gray-200' : 'border-gray-300'}`}
              >
                <Minus size={12} color={qty === 0 ? '#d1d5db' : colors.muted} />
              </Pressable>
              <TextInput
                value={String(qty)}
                onChangeText={(t) => onQtyChange(key, Math.max(0, parseInt(t.replace(/\D/g, ''), 10) || 0))}
                keyboardType="number-pad"
                editable={!out}
                className="w-12 h-8 text-center text-smd font-bold text-foreground border border-gray-200 rounded-lg"
              />
              <Pressable
                onPress={() => onQtyChange(key, qty + 1)}
                disabled={out}
                hitSlop={6}
                className="w-7 h-7 rounded-full border border-gray-300 items-center justify-center"
              >
                <Plus size={12} color={out ? '#d1d5db' : colors.muted} />
              </Pressable>
            </View>
          </View>
        );
      })}
    </View>
  );
}
