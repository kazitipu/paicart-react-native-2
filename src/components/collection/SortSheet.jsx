import React, { useEffect } from 'react';
import { View, Text, Pressable, BackHandler, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { Check, X } from 'lucide-react-native';

const RED = '#e62222';

/* The collection's sort picker as an in-tree bottom sheet.
 *
 * It deliberately avoids RN's <Modal>: on Android (new architecture) the
 * dialog window could leave a stale frame of the sheet on screen after it
 * had already closed, so the next tap fell through to whatever was beneath
 * it. Rendering inside the screen keeps one window and one source of truth.
 *
 * Springs up from the bottom over a fading scrim; closes on scrim tap, the
 * close button, a selection, or the Android back button. */
export default function SortSheet({ visible, options, value, onSelect, onClose }) {
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!visible) return undefined;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => sub.remove();
  }, [visible, onClose]);

  if (!visible) return null;

  /* Entering/exiting layout animations, not a transform driven by a shared
     value: on Android's new architecture a Reanimated transform moves the
     pixels but not the hit-test area, so a sheet slid in that way could be
     seen but not tapped. Layout animations end at the real layout. */
  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 50 }]}>
      <Animated.View
        entering={FadeIn.duration(200)}
        exiting={FadeOut.duration(180)}
        style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.55)' }]}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close sort options" />
      </Animated.View>

      <Animated.View
        entering={SlideInDown.springify().damping(20).stiffness(220)}
        exiting={SlideOutDown.duration(180)}
        className="absolute left-0 right-0 bottom-0 bg-white rounded-t-3xl"
        style={{ paddingBottom: Math.max(insets.bottom, 12), boxShadow: '0 -10px 30px -10px rgba(0,0,0,0.25)' }}
      >
        <View className="items-center pt-2.5">
          <View className="w-10 h-1 rounded-full bg-gray-300" />
        </View>
        <View className="flex-row items-center justify-between px-5 pt-3 pb-2">
          <Text className="text-base font-extrabold text-gray-900">Sort by</Text>
          <Pressable onPress={onClose} hitSlop={10} className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center active:opacity-70">
            <X size={16} color="#6b7280" />
          </Pressable>
        </View>

        <View className="px-3 pb-1">
          {options.map((o) => {
            const active = o.value === value;
            return (
              <Pressable
                key={o.value}
                onPress={() => onSelect(o.value)}
                className="flex-row items-center justify-between rounded-xl px-3 py-3.5 my-0.5 active:bg-gray-50"
                style={active ? { backgroundColor: '#fef2f2' } : undefined}
              >
                <Text className={`text-sm ${active ? 'font-bold' : 'text-gray-700'}`} style={active ? { color: RED } : undefined}>
                  {o.label}
                </Text>
                {active && (
                  <Animated.View entering={FadeIn.duration(180)}>
                    <Check size={16} color={RED} strokeWidth={2.6} />
                  </Animated.View>
                )}
              </Pressable>
            );
          })}
        </View>
      </Animated.View>
    </View>
  );
}
