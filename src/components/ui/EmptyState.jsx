import React from 'react';
import { View, Text, Pressable } from 'react-native';

export default function EmptyState({ icon = null, title, subtitle, actionLabel, onAction }) {
  return (
    <View className="flex-1 items-center justify-center px-8 py-16">
      {icon}
      <Text className="text-md font-bold text-foreground mt-4 text-center">{title}</Text>
      {!!subtitle && (
        <Text className="text-smd text-gray-500 mt-1.5 text-center">{subtitle}</Text>
      )}
      {!!actionLabel && (
        <Pressable
          onPress={onAction}
          className="mt-5 bg-primary rounded-lg px-6 py-3 active:opacity-80"
        >
          <Text className="text-white font-bold text-smd">{actionLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}
