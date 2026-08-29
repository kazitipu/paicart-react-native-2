import React from 'react';
import { View, Text, TextInput } from 'react-native';

/* +88 🇧🇩 prefix chip glued to a numeric field. */
export default function PhoneInput({
  className = '',
  inputClassName = '',
  value,
  onChangeText,
  ...props
}) {
  return (
    <View className={`flex-row items-stretch ${className}`}>
      <View className="flex-row items-center gap-1.5 px-3 bg-gray-50 border border-r-0 border-gray-300 rounded-l-lg">
        <Text className="text-smd">🇧🇩</Text>
        <Text className="text-smd text-gray-600 font-semibold">+88</Text>
      </View>
      <TextInput
        keyboardType="phone-pad"
        autoComplete="tel"
        textContentType="telephoneNumber"
        value={value}
        onChangeText={onChangeText}
        className={`flex-1 border border-gray-300 rounded-r-lg px-3 py-2.5 text-smd text-foreground ${inputClassName}`}
        placeholderTextColor="#9ca3af"
        {...props}
      />
    </View>
  );
}
