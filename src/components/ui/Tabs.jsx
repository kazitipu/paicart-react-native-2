import React from 'react';
import { ScrollView, Pressable, Text, View } from 'react-native';

/* Horizontal status tabs with live counts — the shape used by My Orders,
   My Product Requests and My Shipments. `items` is
   [{ key, label, count }]. */
export default function Tabs({ items, value, onChange, className = '' }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      className={`border-b border-gray-100 ${className}`}
      contentContainerClassName="px-3"
    >
      {items.map((item) => {
        const active = item.key === value;
        return (
          <Pressable
            key={item.key}
            onPress={() => onChange(item.key)}
            className="px-3 py-3"
          >
            <View className="flex-row items-center gap-1.5">
              <Text
                className={`text-smd ${active ? 'text-primary font-bold' : 'text-gray-500 font-semibold'}`}
              >
                {item.label}
              </Text>
              {item.count > 0 && (
                <View
                  className={`rounded-full px-1.5 py-0.5 ${active ? 'bg-primary-tint' : 'bg-gray-100'}`}
                >
                  <Text
                    className={`text-2xs font-bold ${active ? 'text-primary' : 'text-gray-500'}`}
                  >
                    {item.count}
                  </Text>
                </View>
              )}
            </View>
            {active && <View className="h-0.5 bg-primary rounded-full mt-2" />}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
