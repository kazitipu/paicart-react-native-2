import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, ScrollView, Dimensions } from 'react-native';
import Animated, {
  FadeIn,
  ZoomIn,
  useAnimatedStyle,
} from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { Check, ShoppingBag, AlertCircle, Trash2 } from 'lucide-react-native';
import ProductImage from '@/components/ui/ProductImage';
import { C, SHADOW, ORANGE, Press, ScalePress, Spinner, Overlay } from '@/components/product/ui';
import { decorPhase } from '@/lib/decorClock';

/* ═══════════════════════════════════════════════════════════════════════
   Pieces of the cart page port (web src/app/cart/page.jsx, < 640px).
   The cart page has no scoped mobile font shrink (unlike the product page),
   so these are plain Tailwind v4 sizes: a named size carries its own
   line-height ratio, an arbitrary text-[Npx] inherits the body's 1.5.
   ═══════════════════════════════════════════════════════════════════════ */

export const RED = '#e62222';
export const BODY = '#1e293b'; // body `color: var(--foreground)` — what currentColor icons inherit

export const TS = {
  xs: { fontSize: 12, lineHeight: 16 },
  sm: { fontSize: 14, lineHeight: 20 },
  base: { fontSize: 16, lineHeight: 24 },
  lg: { fontSize: 18, lineHeight: 28 },
};
/* text-[Npx] — font-size only, line-height inherited (1.5 from body). */
export const tpx = (n) => ({ fontSize: n, lineHeight: n * 1.5 });

/* Tailwind v4 shadow-sm (= v3's `shadow`). */
export const SHADOW_SM = SHADOW.base;

/* Extra palette values the cart uses beyond ui.jsx's C. */
export const CC = {
  orange500: '#f97316',
  violet50: '#f5f3ff',
  violet200: '#ddd6fe',
  violet600: '#7c3aed',
  emerald200: '#a7f3d0',
  sky50: '#f0f9ff',
  sky100: '#e0f2fe',
  sky600: '#0284c7',
  sky700: '#0369a1',
};

/* Native <input type="checkbox" class="accent-[#e62222]"> as Chrome on a
   phone draws it: 1px #767676 frame on white, accent fill + white tick. */
export function Checkbox({ checked, onPress, size = 15, style, accessibilityLabel }) {
  return (
    <Press
      onPress={onPress}
      hitSlop={10}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: !!checked }}
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [
        {
          width: size,
          height: size,
          borderRadius: 3,
          borderWidth: 1,
          borderColor: checked ? RED : '#767676',
          backgroundColor: checked ? RED : '#ffffff',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: pressed ? 0.75 : 1,
        },
        style,
      ]}
    >
      {checked && (
        <Animated.View entering={ZoomIn.duration(140)}>
          <Check size={size - 3} color="#ffffff" strokeWidth={3.5} />
        </Animated.View>
      )}
    </Press>
  );
}

/* `border-t border-dashed border-gray-300` — RN cannot dash a single side,
   so a dashed box is clipped to its top edge. */
export function DashedRule({ style }) {
  return (
    <View style={[{ height: 1, overflow: 'hidden' }, style]}>
      <View style={{ height: 3, borderWidth: 1, borderColor: C.gray300, borderStyle: 'dashed' }} />
    </View>
  );
}

/* Quantity box. Keeps its own text while focused (a controlled input that
   re-renders on every keystroke drops characters) and hands the value to the
   cart's quantity rules when editing ends. */
export function CartQtyInput({ value, onCommit, editable = true, style }) {
  const [text, setText] = useState(String(value));
  const focused = useRef(false);
  useEffect(() => {
    if (!focused.current) setText(String(value));
  }, [value]);
  const commit = () => {
    focused.current = false;
    if (text !== String(value)) onCommit(text);
    else setText(String(value));
  };
  return (
    <TextInput
      value={text}
      editable={editable}
      onChangeText={(v) => setText(v.replace(/[^0-9]/g, ''))}
      onFocus={() => {
        focused.current = true;
      }}
      onEndEditing={commit}
      onSubmitEditing={commit}
      keyboardType="number-pad"
      returnKeyType="done"
      selectTextOnFocus
      style={[{ textAlign: 'center', padding: 0, includeFontPadding: false }, style]}
    />
  );
}

/* Login / empty cart card (EmptyScreen on the web). */
export function EmptyScreen({ Icon, title, sub, cta, onPress, minHeight }) {
  return (
    <View style={{ minHeight, alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <Animated.View
        entering={FadeIn.duration(250)}
        style={{
          backgroundColor: '#ffffff',
          borderRadius: 16,
          padding: 40,
          alignItems: 'center',
          boxShadow: SHADOW_SM,
          borderWidth: 1,
          borderColor: C.gray100,
          maxWidth: 320,
          width: '100%',
        }}
      >
        <Icon size={48} color={C.gray200} style={{ marginBottom: 16 }} />
        <Text style={[TS.base, { fontWeight: '700', color: C.gray700, marginBottom: 4, textAlign: 'center' }]}>
          {title}
        </Text>
        {!!sub && <Text style={[TS.sm, { color: C.gray400, marginBottom: 20, textAlign: 'center' }]}>{sub}</Text>}
        <Press
          onPress={onPress}
          style={({ pressed }) => ({
            backgroundColor: pressed ? '#cc1a1a' : RED,
            paddingHorizontal: 32,
            paddingVertical: 10,
            borderRadius: 12,
          })}
        >
          <Text style={[TS.sm, { color: '#ffffff', fontWeight: '600' }]}>{cta}</Text>
        </Press>
      </Animated.View>
    </View>
  );
}

/* The skewed white sweep across the Place Order button
   (@keyframes cartBtnShimmer: left -60% → 130%, 2.4s linear infinite).
   Purely decorative and non-interactive, so a transform is fine here. */
function Shimmer({ width, running }) {
  /* Rides the shared decor clock (lib/decorClock); p = 1 parks it past the edge. */
  const style = useAnimatedStyle(() => {
    const p = running ? decorPhase() : 1;
    return { transform: [{ translateX: -0.6 * width + p * 1.9 * width }, { skewX: '-18deg' }] };
  }, [running, width]);
  if (!width) return null;
  const w = width / 2;
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', top: 0, bottom: 0, left: 0, width: w }, style]}>
      <Svg width={w} height="100%">
        <Defs>
          <LinearGradient id="cartShimmer" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#ffffff" stopOpacity="0" />
            <Stop offset="0.5" stopColor="#ffffff" stopOpacity="0.22" />
            <Stop offset="1" stopColor="#ffffff" stopOpacity="0" />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width={w} height="100%" fill="url(#cartShimmer)" />
      </Svg>
    </Animated.View>
  );
}

export function PlaceOrderButton({ active, disabled, totalQty, onPress, animate }) {
  const [w, setW] = useState(0);
  return (
    <ScalePress
      onPress={onPress}
      disabled={disabled}
      accessibilityLabel="Place Order"
      style={[
        {
          flexShrink: 0,
          overflow: 'hidden',
          borderRadius: 16,
          paddingHorizontal: 20,
          paddingVertical: 10,
          opacity: disabled ? 0.5 : 1,
        },
        active
          ? { backgroundColor: ORANGE, boxShadow: '0 4px 20px rgba(255,106,0,0.35)' }
          : { backgroundColor: C.gray200 },
      ]}
    >
      <View onLayout={(e) => setW(e.nativeEvent.layout.width + 40)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <ShoppingBag size={15} color={active ? '#ffffff' : C.gray400} />
        <Text style={[TS.sm, { fontWeight: '700', color: active ? '#ffffff' : C.gray400 }]}>
          Place Order{totalQty > 0 ? ` (${totalQty})` : ''}
        </Text>
      </View>
      {active && (
        <View pointerEvents="none" style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 }}>
          <Shimmer width={w} running={animate} />
        </View>
      )}
    </ScalePress>
  );
}

/* Out-of-stock dialog — the web's mobile bottom sheet (items-end,
   rounded-t-3xl, max-h-[85vh]). */
export function StockIssuesSheet({ issues, removing, onClose, onRemove }) {
  const maxH = Dimensions.get('window').height * 0.85;
  const n = issues.length;
  return (
    <Overlay visible={n > 0} onClose={removing ? () => {} : onClose} zIndex={90}>
      <View
        style={{
          backgroundColor: '#ffffff',
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          boxShadow: SHADOW['2xl'],
          maxHeight: maxH,
        }}
      >
        <View style={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12, flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 16,
              backgroundColor: C.amber50,
              borderWidth: 1,
              borderColor: C.amber200,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <AlertCircle size={18} color={C.amber600} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[TS.base, { fontWeight: '800', color: C.gray900 }]}>
              {n} item{n > 1 ? 's are' : ' is'} out of stock
            </Text>
            <Text style={[TS.xs, { color: C.gray500, marginTop: 2 }]}>
              The supplier no longer has enough of these. Remove them and continue with the rest of your order.
            </Text>
          </View>
        </View>

        <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}>
          {issues.map(({ item, sku, qty, avail }, i) => {
            const img = sku.image || item.picture || '';
            return (
              <View
                key={i}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: C.gray100,
                  backgroundColor: C.gray50,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                }}
              >
                {!!img && (
                  <ProductImage
                    uri={sized(img, 60)}
                    style={{ width: 40, height: 40, borderRadius: 8, borderWidth: 1, borderColor: C.gray200 }}
                    fallbackIconSize={14}
                  />
                )}
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text numberOfLines={1} style={[TS.xs, { fontWeight: '600', color: C.gray800 }]}>
                    {item.name}
                  </Text>
                  <Text numberOfLines={1} style={[tpx(11), { color: C.gray500 }]}>
                    {[sku.color, sku.size].filter(Boolean).join(' · ') || 'Standard'}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end', flexShrink: 0 }}>
                  <Text style={[tpx(11), { fontWeight: '700', color: C.amber600 }]}>
                    {avail > 0 ? `only ${avail} left` : 'sold out'}
                  </Text>
                  <Text style={[tpx(10), { color: C.gray400 }]}>you asked {qty}</Text>
                </View>
              </View>
            );
          })}
        </ScrollView>

        <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 32, flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <ScalePress
              onPress={onClose}
              disabled={removing}
              style={{
                borderWidth: 2,
                borderColor: C.gray200,
                paddingVertical: 12,
                borderRadius: 16,
                alignItems: 'center',
                opacity: removing ? 0.6 : 1,
              }}
            >
              <Text style={[TS.sm, { fontWeight: '700', color: C.gray600 }]}>Let me adjust</Text>
            </ScalePress>
          </View>
          <View style={{ flex: 1 }}>
            <ScalePress
              onPress={onRemove}
              disabled={removing}
              style={{
                paddingVertical: 12,
                borderRadius: 16,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                backgroundColor: ORANGE,
                boxShadow: '0 4px 20px rgba(255,106,0,0.35)',
                opacity: removing ? 0.6 : 1,
                /* border-2 on its sibling makes that one 4px taller */
                minHeight: 48,
              }}
            >
              {removing ? <Spinner size={15} color="#ffffff" /> : <Trash2 size={15} color="#ffffff" />}
              <Text style={[TS.sm, { fontWeight: '800', color: '#ffffff' }]}>Remove &amp; continue</Text>
            </ScalePress>
          </View>
        </View>
      </View>
    </Overlay>
  );
}

/* `cdn(u) + '_NxN.webp'`, without double-suffixing an already-sized URL. */
export const sized = (u, n) => {
  if (!u) return '';
  const s = String(u);
  return /_\d+x\d+\.(webp|jpg|png)$/i.test(s) ? s : `${s}_${n}x${n}.webp`;
};
