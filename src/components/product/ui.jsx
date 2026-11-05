import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, BackHandler, StyleSheet } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withRepeat,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';
import { Star, Loader2 } from 'lucide-react-native';

/* ═══════════════════════════════════════════════════════════════════════
   Shared primitives for the product page port (web product/[id]/page.jsx).

   The web page shrinks its type 1–2px below 1024px with a scoped <style>
   block (.product-detail-root .text-xs { font-size: 11px } …). Every size
   here is the value a phone actually renders. Named sizes keep Tailwind v4's
   line-height ratio; arbitrary text-[Npx] sizes inherit the 1.5 body
   line-height.
   ═══════════════════════════════════════════════════════════════════════ */

/* Tailwind v4 (which the web uses) stores each text size's line-height as a
   RATIO of its font-size, so the 1–2px mobile shrink shrinks the line box
   too: text-xs 11px → 14.67px (measured in the browser), text-base 14px → 21px. */
const lh = (px, ratio) => Math.round(px * ratio * 100) / 100;
const SIZES = {
  xs: [11, lh(11, 1 / 0.75)],
  sm: [13, lh(13, 1.25 / 0.875)],
  base: [14, lh(14, 1.5)],
  lg: [16, lh(16, 1.75 / 1.125)],
  xl: [18, lh(18, 1.75 / 1.25)],
  '2xl': [22, lh(22, 2 / 1.5)],
  '3xl': [28, lh(28, 2.25 / 1.875)],
  15: [13, 19.5],
  13: [11, 16.5],
  12: [10, 15],
  11: [10, 15],
  10: [9, 13.5],
  9: [8, 12],
  8: [8, 12],
};
const LEADING = { none: 1, tight: 1.25, snug: 1.375, relaxed: 1.625 };

/* t('xs') → { fontSize: 11, lineHeight: 16 }; t('xs', 'none') → leading-none. */
export const t = (size, leading) => {
  const [fontSize, lh] = SIZES[size] || SIZES.xs;
  return { fontSize, lineHeight: leading ? Math.round(fontSize * LEADING[leading] * 10) / 10 : lh };
};

export const ORANGE = '#FF6A00';
export const ORANGE2 = '#FF6600';
export const PAGE_BG = '#f2f3f7';

/* Tailwind v3 palette values used across the page. */
export const C = {
  gray50: '#f9fafb',
  gray100: '#f3f4f6',
  gray200: '#e5e7eb',
  gray300: '#d1d5db',
  gray400: '#9ca3af',
  gray500: '#6b7280',
  gray600: '#4b5563',
  gray700: '#374151',
  gray800: '#1f2937',
  gray900: '#111827',
  orange50: '#fff7ed',
  orange100: '#ffedd5',
  orange200: '#fed7aa',
  amber50: '#fffbeb',
  amber100: '#fef3c7',
  amber200: '#fde68a',
  amber400: '#fbbf24',
  amber500: '#f59e0b',
  amber600: '#d97706',
  amber700: '#b45309',
  amber800: '#92400e',
  emerald50: '#ecfdf5',
  emerald100: '#d1fae5',
  emerald600: '#059669',
  emerald700: '#047857',
  green50: '#f0fdf4',
  green200: '#bbf7d0',
  green600: '#16a34a',
  green700: '#15803d',
  red50: '#fef2f2',
  red100: '#fee2e2',
  red200: '#fecaca',
  red500: '#ef4444',
  red600: '#dc2626',
  red700: '#b91c1c',
  red800: '#991b1b',
  blue50: '#eff6ff',
  blue100: '#dbeafe',
  blue500: '#3b82f6',
  blue600: '#2563eb',
};

/* Tailwind shadows, verbatim. */
export const SHADOW = {
  sm: '0 1px 2px 0 rgba(0,0,0,0.05)',
  base: '0 1px 3px 0 rgba(0,0,0,0.1), 0 1px 2px -1px rgba(0,0,0,0.1)',
  md: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1)',
  lg: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)',
  xl: '0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
  '2xl': '0 25px 50px -12px rgba(0,0,0,0.25)',
  inner: 'inset 0 2px 4px 0 rgba(0,0,0,0.05)',
  cta: '0 4px 20px rgba(255,102,0,0.35)',
};

/* Tone of each goods-type chip (DG_TYPES className on the web). */
export const DG_TONES = {
  regular: { fg: '#047857', bg: '#ecfdf5', border: '#a7f3d0' },
  battery: { fg: '#b45309', bg: '#fffbeb', border: '#fde68a' },
  liquid: { fg: '#0369a1', bg: '#f0f9ff', border: '#bae6fd' },
  chemical: { fg: '#6d28d9', bg: '#f5f3ff', border: '#ddd6fe' },
  magnet: { fg: '#be123c', bg: '#fff1f2', border: '#fecdd3' },
  replica: { fg: '#c2410c', bg: '#fff7ed', border: '#fed7aa' },
};

export const fmt = (n) => Math.round(Number(n) || 0).toLocaleString();

/* PriceTag: `amount` with `original` struck through beside it (gap-1.5) at
   0.85em of the surrounding size whenever a real discount applies. */
export function Price({ amount, original, currency = '৳', style, origStyle, containerStyle }) {
  const showOriginal = original != null && Number(original) > Number(amount);
  const base = StyleSheet.flatten(style) || {};
  const size = base.fontSize || 11;
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', columnGap: 6 }, containerStyle]}>
      <Text style={style}>
        {currency}
        {fmt(amount)}
      </Text>
      {showOriginal && (
        <Text
          style={[
            { fontSize: size * 0.85, lineHeight: base.lineHeight, color: C.gray400, fontWeight: '400', textDecorationLine: 'line-through' },
            origStyle,
          ]}
        >
          {currency}
          {fmt(original)}
        </Text>
      )}
    </View>
  );
}

/* Five stars, filled up to Math.round(rating) — amber-400 / gray-200. */
export function Stars({ rating, size = 12 }) {
  const r = Math.round(parseFloat(rating) || 0);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Star key={s} size={size} color={s <= r ? C.amber400 : C.gray200} fill={s <= r ? C.amber400 : C.gray200} />
      ))}
    </View>
  );
}

/* lucide Loader2 with `animate-spin`. */
export function Spinner({ size = 14, color = '#ffffff' }) {
  const rot = useSharedValue(0);
  useEffect(() => {
    rot.value = withRepeat(withTiming(360, { duration: 1000, easing: Easing.linear }), -1, false);
    return () => cancelAnimation(rot);
  }, [rot]);
  const style = useAnimatedStyle(() => ({ transform: [{ rotate: `${rot.value}deg` }] }));
  return (
    <Animated.View style={style}>
      <Loader2 size={size} color={color} />
    </Animated.View>
  );
}

/* A 12px ring spinner (border border-gray-400 border-t-transparent). */
export function RingSpinner({ size = 12, color = C.gray400 }) {
  const rot = useSharedValue(0);
  useEffect(() => {
    rot.value = withRepeat(withTiming(360, { duration: 1000, easing: Easing.linear }), -1, false);
    return () => cancelAnimation(rot);
  }, [rot]);
  const style = useAnimatedStyle(() => ({ transform: [{ rotate: `${rot.value}deg` }] }));
  return (
    <Animated.View
      style={[
        { width: size, height: size, borderRadius: size / 2, borderWidth: 1, borderColor: color, borderTopColor: 'transparent' },
        style,
      ]}
    />
  );
}

/* Press feedback for the web's `active:scale-95` buttons. The scale is purely
   visual — the hit area is the unscaled Pressable underneath. */
/* `containerStyle` sizes the touch target itself (flex / width in a row). */
export function ScalePress({ children, style, containerStyle, onPress, disabled, scaleTo = 0.95, hitSlop, accessibilityLabel, onLayoutRef }) {
  const s = useSharedValue(1);
  const aStyle = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return (
    <Pressable
      ref={onLayoutRef}
      style={containerStyle}
      onPress={onPress}
      disabled={disabled}
      hitSlop={hitSlop}
      accessibilityLabel={accessibilityLabel}
      onPressIn={() => {
        s.value = withTiming(scaleTo, { duration: 90 });
      }}
      onPressOut={() => {
        s.value = withSpring(1, { damping: 14, stiffness: 300 });
      }}
    >
      <Animated.View style={[style, aStyle]}>{children}</Animated.View>
    </Pressable>
  );
}

/* In-screen bottom sheet / overlay (no RN <Modal> — see SortSheet). Scrim
   fades, the panel slides up with entering/exiting layout animations that end
   at the real layout, so the panel is tappable on Android Fabric. The Android
   back button closes the top-most open overlay (listeners run newest first). */
export function Overlay({ visible, onClose, zIndex = 50, scrim = 'rgba(0,0,0,0.5)', children, full = false, panelStyle }) {
  useEffect(() => {
    if (!visible) return undefined;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => sub.remove();
  }, [visible, onClose]);

  if (!visible) return null;

  if (full) {
    return (
      <Animated.View
        entering={FadeIn.duration(200)}
        exiting={FadeOut.duration(180)}
        style={[StyleSheet.absoluteFill, { zIndex, elevation: zIndex }, panelStyle]}
      >
        {children}
      </Animated.View>
    );
  }

  return (
    <View style={[StyleSheet.absoluteFill, { zIndex, elevation: zIndex }]}>
      <Animated.View
        entering={FadeIn.duration(200)}
        exiting={FadeOut.duration(180)}
        style={[StyleSheet.absoluteFill, { backgroundColor: scrim }]}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
      </Animated.View>
      <Animated.View
        entering={SlideInDown.duration(280).easing(Easing.bezier(0.32, 0.72, 0, 1))}
        exiting={SlideOutDown.duration(220).easing(Easing.bezier(0.32, 0.72, 0, 1))}
        style={[{ position: 'absolute', left: 0, right: 0, bottom: 0 }, panelStyle]}
      >
        {children}
      </Animated.View>
    </View>
  );
}

/* Small rounded-full chip: icon + label, bordered (DG / seller badges). */
export function Chip({ Icon, label, tone, size = 9, iconSize = 9, gap = 2, py = 2, px = 6, weight = '600' }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap,
        paddingHorizontal: px,
        paddingVertical: py,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: tone.border,
        backgroundColor: tone.bg,
      }}
    >
      {Icon && <Icon size={iconSize} color={tone.fg} />}
      <Text style={[t(String(size)), { color: tone.fg, fontWeight: weight }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

/* Radio dot (w-4 h-4 / w-3.5 h-3.5 ring, inner dot when selected). */
export function Radio({ selected, size = 16, dot = 8, color = ORANGE }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: 1,
        borderColor: selected ? color : C.gray300,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {selected && <Animated.View entering={FadeIn.duration(150)} style={{ width: dot, height: dot, borderRadius: dot / 2, backgroundColor: color }} />}
    </View>
  );
}

/* Pressable that accepts the function forms of `style` and `children`.
   NativeWind's interop on react-native's Pressable drops a `style` given as a
   function ({ pressed }) => …, which left buttons with no size or background
   (the drawer's −/+ steppers rendered blank). This resolves the function
   itself from its own pressed state and hands Pressable a plain style. */
export function Press({ style, children, onPressIn, onPressOut, ...rest }) {
  const [pressed, setPressed] = useState(false);
  const resolvedStyle = typeof style === 'function' ? style({ pressed }) : style;
  const resolvedChildren = typeof children === 'function' ? children({ pressed }) : children;
  return (
    <Pressable
      {...rest}
      onPressIn={(e) => {
        setPressed(true);
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        setPressed(false);
        onPressOut?.(e);
      }}
      style={resolvedStyle}
    >
      {resolvedChildren}
    </Pressable>
  );
}
