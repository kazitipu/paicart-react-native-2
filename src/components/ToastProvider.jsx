import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, Pressable, Keyboard } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { subscribe } from '@/lib/toast';
import colors from '@/theme/colors';

const DURATION = 3500;

const ACCENT = {
  success: colors.success,
  error: colors.brand,
  info: colors.secondary,
  warning: colors.warning,
};

export default function ToastProvider() {
  const [items, setItems] = useState([]);
  const insets = useSafeAreaInsets();
  /* Toasts sit near the bottom edge, which the keyboard covers — a coupon
     or form error raised while typing was shown but invisible. Lift them
     above the keyboard while it is open. */
  const [kb, setKb] = useState(0);
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', (e) => setKb(e.endCoordinates?.height || 0));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKb(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const dismiss = useCallback((id) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => subscribe((toast) => {
    setItems((prev) => [...prev, toast]);
    setTimeout(() => dismiss(toast.id), DURATION);
  }), [dismiss]);

  if (!items.length) return null;

  return (
    <View
      pointerEvents="box-none"
      className="absolute left-0 right-0 items-center px-4"
      /* Above every sheet: Overlay panels use elevation up to 80, and on
         Android elevation beats sibling order, so a toast fired from inside a
         sheet ("Image saved to gallery!") was drawn underneath it. */
      style={{ bottom: kb > 0 ? kb + 16 : insets.bottom + 78, zIndex: 1000, elevation: 1000 }}
    >
      {items.map((t) => (
        <Pressable
          key={t.id}
          onPress={() => dismiss(t.id)}
          className="w-full max-w-[400px] bg-ink rounded-xl px-4 py-3 mb-2 flex-row items-center"
        >
          <View
            className="w-2 h-2 rounded-full mr-3"
            style={{ backgroundColor: ACCENT[t.type] || colors.secondary }}
          />
          <Text className="text-white text-smd flex-1" numberOfLines={3}>
            {t.message}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
