import React, { useState } from 'react';
import { View, Text, TextInput, Pressable } from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';
import colors from '@/theme/colors';

/* Labelled input with an optional leading icon and a show/hide toggle for
   passwords — the shape used across the auth and profile forms. */
export default function Field({
  icon: Icon,
  label,
  secure = false,
  value,
  onChangeText,
  placeholder,
  error,
  className = '',
  ...props
}) {
  const [show, setShow] = useState(false);

  return (
    <View className={className}>
      {!!label && (
        <Text className="text-2xs font-semibold text-gray-500 uppercase tracking-widest mb-1.5">
          {label}
        </Text>
      )}
      <View className="relative justify-center">
        {Icon && (
          <View className="absolute left-3.5 z-10" pointerEvents="none">
            <Icon size={15} color={colors.muted} />
          </View>
        )}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#9ca3af"
          secureTextEntry={secure && !show}
          className={`h-12 bg-gray-50 border-2 rounded-xl text-smd text-foreground ${Icon ? 'pl-10' : 'pl-4'} ${secure ? 'pr-11' : 'pr-4'} ${error ? 'border-brand' : 'border-gray-200'}`}
          {...props}
        />
        {secure && (
          <Pressable
            onPress={() => setShow((v) => !v)}
            hitSlop={8}
            className="absolute right-3.5"
          >
            {show ? <EyeOff size={15} color={colors.muted} /> : <Eye size={15} color={colors.muted} />}
          </Pressable>
        )}
      </View>
      {!!error && <Text className="text-2xs text-brand mt-1">{error}</Text>}
    </View>
  );
}
