import React from 'react';
import { Pressable, Text, ActivityIndicator, View } from 'react-native';

const VARIANTS = {
  primary: { box: 'bg-primary', label: 'text-white' },
  brand: { box: 'bg-brand', label: 'text-white' },
  outline: { box: 'bg-white border border-gray-300', label: 'text-foreground' },
  ghost: { box: 'bg-transparent', label: 'text-primary' },
  dark: { box: 'bg-ink', label: 'text-white' },
};

export default function Button({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  icon = null,
  className = '',
  textClassName = '',
}) {
  const v = VARIANTS[variant] || VARIANTS.primary;
  const off = disabled || loading;

  return (
    <Pressable
      onPress={off ? undefined : onPress}
      disabled={off}
      className={`flex-row items-center justify-center rounded-lg px-5 py-3 ${v.box} ${off ? 'opacity-50' : 'active:opacity-80'} ${className}`}
    >
      {loading ? (
        <ActivityIndicator size="small" color={variant === 'outline' ? '#1e293b' : '#ffffff'} />
      ) : (
        <>
          {icon ? <View className="mr-2">{icon}</View> : null}
          <Text className={`font-bold text-smd ${v.label} ${textClassName}`}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}
