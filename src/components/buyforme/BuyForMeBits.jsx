import React, { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { View, Text, TextInput } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { C, ORANGE, Press, ScalePress, Spinner } from '@/components/product/ui';
import { TS, RED, BODY } from '@/components/cart/CartBits';
import { PLACEHOLDER } from '@/components/profile/ProfileBits';

/* ═══════════════════════════════════════════════════════════════════════
   Form pieces of the Product Request page (web src/app/pages/buy-for-me/
   page.jsx, < 640px). The page has no scoped mobile font shrink, so these are
   plain Tailwind v4 sizes.

   INPUT_CLS on the web: `w-full border border-gray-200 rounded-xl px-3.5
   py-2.5 text-sm bg-gray-50 focus:border-[#e62222] focus:ring-1
   focus:ring-[#e62222]/20`, every field with a leading 14px icon at left-3.5
   (so pl-9). Different enough from the profile forms (white, px-4, ring-2/30)
   that ProfileBits' Input/SelectBox are not reused here.
   ═══════════════════════════════════════════════════════════════════════ */

export const GRAY50 = '#f9fafb';
export const PAGE_BG = '#f7f8fa';
export const ORANGE800 = '#9a3412';
const FOCUS_RING = '0 0 0 1px rgba(230,34,34,0.2)';
/* shadow-md shadow-red-200 (v4 colours both layers at full red-200). */
export const RED_SHADOW = '0 4px 6px -1px #fecaca, 0 2px 4px -2px #fecaca';

const BOX_H = 42; // py-2.5 + text-sm line (20) + 1px borders
const AREA_H = 82; // rows={3}: 3 × 20 + py-2.5 + 1px borders

/* Chrome's constraint-validation messages for `required` controls. */
export const MSG_SELECT = 'Please select an item in the list.';
export const MSG_FILL = 'Please fill out this field.';

/* Chrome's validation bubble: the first invalid `required` control gets
   focus and a small popup under it. Drawn as an absolutely positioned
   callout so it never moves the form. */
function ValidityBubble({ message }) {
  return (
    <Animated.View
      entering={FadeIn.duration(150)}
      exiting={FadeOut.duration(150)}
      pointerEvents="none"
      style={{ position: 'absolute', top: '100%', left: 8, marginTop: 6, zIndex: 20, elevation: 20 }}
    >
      <View
        style={{
          position: 'absolute',
          top: -5,
          left: 14,
          width: 10,
          height: 10,
          backgroundColor: '#ffffff',
          borderLeftWidth: 1,
          borderTopWidth: 1,
          borderColor: C.gray300,
          transform: [{ rotate: '45deg' }],
        }}
      />
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          backgroundColor: '#ffffff',
          borderWidth: 1,
          borderColor: C.gray300,
          borderRadius: 6,
          paddingHorizontal: 10,
          paddingVertical: 7,
          boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
        }}
      >
        <View
          style={{
            width: 18,
            height: 18,
            borderRadius: 3,
            backgroundColor: '#f59e0b',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ color: '#ffffff', fontSize: 13, lineHeight: 16, fontWeight: '800' }}>!</Text>
        </View>
        <Text style={[TS.sm, { color: C.gray800 }]}>{message}</Text>
      </View>
    </Animated.View>
  );
}

/* <Field>: `<label class="block text-xs font-bold text-gray-600 mb-1.5
   uppercase tracking-wide">` over its control. `viewRef` lets the screen
   measure the block to scroll it into view (validation). */
export function Field({ label, children, error, viewRef }) {
  return (
    <View ref={viewRef} collapsable={false} style={{ zIndex: error ? 10 : 0 }}>
      <Text
        style={[
          TS.xs,
          { fontWeight: '700', color: C.gray600, textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 6 },
        ]}
      >
        {label}
      </Text>
      <View>
        {children}
        {!!error && <ValidityBubble message={error} />}
      </View>
    </View>
  );
}

const iconSlot = (Icon, multiline) => (
  <View
    pointerEvents="none"
    style={multiline ? { position: 'absolute', left: 13, top: 11 } : { position: 'absolute', left: 13 }}
  >
    <Icon size={14} color={C.gray400} />
  </View>
);

/* Text input / textarea. Uncontrolled (defaultValue) — the screen keeps the
   text in a ref so typing never re-renders the form. `kb` is the screen's
   keyboard handler (keeps the focused field above the keyboard). `right`
   is an absolutely positioned trailing slot (the Paste pill). */
export const Input = forwardRef(function Input(
  { icon: Icon, multiline = false, kb, right, padRight = 14, onFocus, onBlur, ...rest },
  ref,
) {
  const inner = useRef(null);
  const [focused, setFocused] = useState(false);
  useImperativeHandle(ref, () => inner.current);
  const h = multiline ? AREA_H : BOX_H;
  return (
    <View
      style={[
        {
          height: h,
          borderWidth: 1,
          borderRadius: 12,
          borderColor: focused ? RED : C.gray200,
          backgroundColor: GRAY50,
          justifyContent: multiline ? 'flex-start' : 'center',
        },
        focused && { boxShadow: FOCUS_RING },
      ]}
    >
      {Icon && iconSlot(Icon, multiline)}
      <TextInput
        ref={inner}
        multiline={multiline}
        placeholderTextColor={PLACEHOLDER}
        onFocus={(e) => {
          setFocused(true);
          kb?.focus(inner);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          kb?.blur(inner);
          onBlur?.(e);
        }}
        style={{
          height: h - 2,
          paddingLeft: Icon ? 36 : 14,
          paddingRight: padRight,
          fontSize: 14,
          color: BODY,
          includeFontPadding: false,
          ...(multiline
            ? { paddingTop: 10, paddingBottom: 10, lineHeight: 20, textAlignVertical: 'top' }
            : { paddingVertical: 0 }),
        }}
        {...rest}
      />
      {right}
    </View>
  );
});

/* A `required` <select class="{INPUT_CLS} pl-9 appearance-none"> with its
   leading icon. appearance-none: no chevron. On a phone the native select
   opens the OS list; here it opens a PickerSheet. The focus ring shows while
   that sheet is open. `loading` adds a small spinner while the rate table is
   being fetched (RN-only hint; the web list just fills in). */
export function SelectBox({ icon: Icon, label, onPress, open, loading }) {
  return (
    <Press
      onPress={onPress}
      style={({ pressed }) => [
        {
          height: BOX_H,
          borderWidth: 1,
          borderRadius: 12,
          justifyContent: 'center',
          borderColor: open ? RED : C.gray200,
          backgroundColor: pressed ? C.gray100 : GRAY50,
          paddingLeft: 36,
          paddingRight: 14,
        },
        open && { boxShadow: FOCUS_RING },
      ]}
    >
      {Icon && iconSlot(Icon, false)}
      <Text style={[TS.sm, { color: BODY }]} numberOfLines={1}>
        {label}
      </Text>
      {loading && (
        <View pointerEvents="none" style={{ position: 'absolute', right: 13 }}>
          <Spinner size={14} color={C.gray400} />
        </View>
      )}
    </Press>
  );
}

/* One half of the Air / Sea toggle: `flex items-center justify-center gap-2
   py-2.5 rounded-xl border-2 text-xs font-bold`, active
   `border-[#FF6A00] bg-orange-50 text-[#FF6A00]`, idle
   `border-gray-200 bg-white text-gray-500`. */
export function MethodButton({ Icon, label, active, onPress }) {
  const fg = active ? ORANGE : C.gray500;
  return (
    <ScalePress
      onPress={onPress}
      scaleTo={0.97}
      containerStyle={{ flex: 1 }}
      accessibilityLabel={label}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 10,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: active ? ORANGE : C.gray200,
        backgroundColor: active ? C.orange50 : '#ffffff',
      }}
    >
      <Icon size={14} color={fg} />
      <Text style={[TS.xs, { fontWeight: '700', color: fg }]}>{label}</Text>
    </ScalePress>
  );
}

/* Small trailing "Paste" pill for the product-link field (RN-only touch
   affordance; shown only while the field is empty). */
export function PastePill({ Icon, onPress }) {
  return (
    <View style={{ position: 'absolute', right: 6 }}>
      <Press
        onPress={onPress}
        hitSlop={6}
        accessibilityLabel="Paste link"
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          gap: 4,
          paddingHorizontal: 8,
          paddingVertical: 5,
          borderRadius: 8,
          backgroundColor: pressed ? C.orange100 : C.orange50,
        })}
      >
        <Icon size={12} color={ORANGE} />
        <Text style={[TS.xs, { fontWeight: '700', color: ORANGE }]}>Paste</Text>
      </Press>
    </View>
  );
}
