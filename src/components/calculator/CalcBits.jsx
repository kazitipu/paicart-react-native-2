import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { View, Text, TextInput } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { ChevronDown } from 'lucide-react-native';
import { C, ORANGE, Press, Radio } from '@/components/product/ui';
import { TS, tpx, BODY } from '@/components/cart/CartBits';

/* ═══════════════════════════════════════════════════════════════════════
   Pieces of the Cost Calculator port (web src/app/pages/cost-calculator/
   page.jsx, < 640px). No scoped mobile font shrink on this route, so these
   are plain Tailwind v4 sizes.
   ═══════════════════════════════════════════════════════════════════════ */

export const PAGE_BG = '#f7f8fa';
export const GREEN200 = '#bbf7d0';
export const BLUE700 = '#1d4ed8';
const PLACEHOLDER = C.gray300; // placeholder:text-gray-300
/* focus:border-[#FF6A00] focus:ring-1 focus:ring-[#FF6A00]/20 */
const FOCUS_RING = '0 0 0 1px rgba(255,106,0,0.2)';

export const ORIGIN_LABELS = {
  china: '🇨🇳 China',
  uk: '🇬🇧 UK',
  usa: '🇺🇸 USA',
  hongkong: '🇭🇰 Hong Kong',
  thailand: '🇹🇭 Thailand',
  india: '🇮🇳 India',
};

/* The <select>'s options; India is offered for air only. */
export const originOptions = (method) =>
  ['china', 'uk', 'usa', 'hongkong', 'thailand', ...(method === 'air' ? ['india'] : [])].map((v) => ({
    value: v,
    label: ORIGIN_LABELS[v],
  }));

/* Mirrors the web page's calcRate (itself the legacy door-to-door maths)
   line for line. Kept here rather than importing lib/shipForMe so the
   calculator cannot drift if that shared file changes. */
export function calcRate(weightNum, productType, rates, method) {
  const rate = (rates || []).find((r) => r.id === productType);
  if (!rate) return null;

  if (method === 'sea') {
    if (weightNum <= 100) {
      return { result: Math.round(weightNum * rate['100kg']), perKg: rate['100kg'] };
    }
    if (weightNum <= 1000) {
      return { result: Math.round(weightNum * rate.below_1000kg), perKg: rate.below_1000kg };
    }
    return { result: Math.round(weightNum * rate.above_1000kg), perKg: rate.above_1000kg };
  }

  if (weightNum <= 0.3) {
    return { result: rate.parcel, perKg: Math.round(rate.parcel * 3.333333) };
  }
  if (weightNum <= 10) {
    return { result: Math.round(weightNum * rate.ten), perKg: rate.ten };
  }
  return { result: Math.round(weightNum * rate.eleven), perKg: rate.eleven };
}

/* What Chrome's constraint validation does to <input type="number" min="0"
   step="0.1"> before the form's onSubmit runs: an invalid value blocks the
   submit and shows a bubble. Returns that bubble's text, or null. */
export function nativeNumberError(raw) {
  const s = String(raw ?? '').trim().replace(',', '.');
  if (!s) return null;
  if (!/^-?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i.test(s)) return 'Please enter a number.';
  const n = Number(s);
  if (!Number.isFinite(n)) return 'Please enter a number.';
  if (n < 0) return 'Value must be greater than or equal to 0.';
  const tenths = n * 10;
  if (Math.abs(tenths - Math.round(tenths)) > 1e-7) {
    const lo = Number((Math.floor(tenths) / 10).toFixed(1));
    const hi = Number((Math.ceil(tenths) / 10).toFixed(1));
    return `Please enter a valid value. The two nearest valid values are ${lo} and ${hi}.`;
  }
  return null;
}

/* <label class="block text-xs font-bold text-gray-700 mb-1.5"> + red * */
export function Label({ children, required }) {
  return (
    <Text style={[TS.xs, { fontWeight: '700', color: C.gray700, marginBottom: 6 }]}>
      {children} {required && <Text style={{ color: C.red500 }}>*</Text>}
    </Text>
  );
}

/* text-[11px] text-red-500 mt-1 (line-height from body: 1.5) */
export function FieldError({ children }) {
  return <Text style={[tpx(11), { color: C.red500, marginTop: 4 }]}>{children}</Text>;
}

/* px-5 py-4 border-b border-gray-50 + numbered orange badge */
export function SectionHeader({ n, title }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: C.gray50,
      }}
    >
      <View
        style={{
          width: 24,
          height: 24,
          borderRadius: 12,
          backgroundColor: C.orange50,
          borderWidth: 1,
          borderColor: C.orange200,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={[TS.xs, { color: ORANGE, fontWeight: '800' }]}>{n}</Text>
      </View>
      <Text style={[TS.sm, { fontWeight: '800', color: C.gray900 }]}>{title}</Text>
    </View>
  );
}

/* INPUT_CLS box: border border-gray-200 rounded-xl py-2.5 text-sm bg-gray-50 */
const BOX = {
  height: 42,
  borderWidth: 1,
  borderRadius: 12,
  justifyContent: 'center',
  backgroundColor: C.gray50,
};

/* Uncontrolled text input in the web's INPUT_CLS. `icon` sits at left-3.5
   and pads to pl-9. The parent reads the value through onChangeText into a
   ref; `clear()` on the forwarded ref empties it. */
export const CalcInput = forwardRef(function CalcInput({ icon: Icon, onFocus, onBlur, ...rest }, ref) {
  const inner = useRef(null);
  const [focused, setFocused] = useState(false);
  useImperativeHandle(ref, () => inner.current);
  return (
    <View
      collapsable={false}
      style={[BOX, { borderColor: focused ? ORANGE : C.gray200 }, focused && { boxShadow: FOCUS_RING }]}
    >
      {Icon && (
        <View pointerEvents="none" style={{ position: 'absolute', left: 14 }}>
          <Icon size={14} color={C.gray400} />
        </View>
      )}
      <TextInput
        ref={inner}
        placeholderTextColor={PLACEHOLDER}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        style={{
          height: 40,
          paddingVertical: 0,
          paddingLeft: Icon ? 36 : 14,
          paddingRight: 14,
          fontSize: 14,
          color: BODY,
          includeFontPadding: false,
        }}
        {...rest}
      />
    </View>
  );
});

/* readOnly INPUT_CLS + bg-gray-100 text-gray-500 */
export function ReadOnlyBox({ value }) {
  return (
    <View style={[BOX, { borderColor: C.gray200, backgroundColor: C.gray100, paddingHorizontal: 14 }]}>
      <Text style={[TS.sm, { color: C.gray500 }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

/* A <select> in INPUT_CLS. A native select opens the OS picker on a phone;
   here it opens a bottom sheet. `chevron` draws Chrome's native dropdown
   arrow (the origin select keeps native appearance; Product Type is
   `appearance-none`, so it has none). Focus styling shows while open. */
export function SelectField({ label, onPress, open, icon: Icon, chevron = false, muted = false, accessibilityLabel }) {
  return (
    <Press
      onPress={onPress}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      style={({ pressed }) => [
        BOX,
        {
          borderColor: open ? ORANGE : C.gray200,
          backgroundColor: pressed ? C.gray100 : C.gray50,
          paddingLeft: Icon ? 36 : 14,
          paddingRight: chevron ? 32 : 14,
        },
        open && { boxShadow: FOCUS_RING },
      ]}
    >
      {Icon && (
        <View pointerEvents="none" style={{ position: 'absolute', left: 14 }}>
          <Icon size={14} color={C.gray400} />
        </View>
      )}
      <Text style={[TS.sm, { color: muted ? C.gray500 : BODY }]} numberOfLines={1}>
        {label}
      </Text>
      {chevron && (
        <View pointerEvents="none" style={{ position: 'absolute', right: 12 }}>
          <ChevronDown size={14} color={C.gray500} />
        </View>
      )}
    </Press>
  );
}

/* One of the two radio cards: py-3 rounded-xl border-2, w-3.5 ring with a
   w-1.5 dot, 14px icon, text-sm font-semibold. */
export function MethodOption({ active, Icon, label, onPress }) {
  return (
    <Press
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: active }}
      style={({ pressed }) => ({
        flexGrow: 1,
        flexBasis: 0,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: active ? ORANGE : pressed ? C.gray300 : C.gray200,
        backgroundColor: active ? C.orange50 : '#ffffff',
      })}
    >
      <Radio selected={active} size={14} dot={6} />
      <Icon size={14} color={active ? ORANGE : C.gray400} />
      <Text style={[TS.sm, { fontWeight: '600', color: active ? C.gray800 : C.gray600 }]}>{label}</Text>
    </Press>
  );
}

/* Result cell: bg-gray-50 rounded-xl px-3.5 py-2.5. The label's text-[10px]
   inherits the grid's text-sm line-height ratio (1.25/0.875). */
export function InfoCell({ label, children }) {
  return (
    <View style={{ flexGrow: 1, flexBasis: 0, backgroundColor: C.gray50, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 }}>
      <Text
        style={{
          fontSize: 10,
          lineHeight: 10 * (1.25 / 0.875),
          fontWeight: '700',
          color: C.gray400,
          textTransform: 'uppercase',
          letterSpacing: 0.25,
        }}
      >
        {label}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>{children}</View>
    </View>
  );
}

/* The total, counting up to its value. Ends on exactly the web's
   `result.toLocaleString()`; non-numeric values are shown as-is. */
export function CountUp({ value, style }) {
  const reduceMotion = useReducedMotion();
  const isNum = typeof value === 'number' && Number.isFinite(value);
  const [shown, setShown] = useState(isNum && !reduceMotion ? 0 : value);
  useEffect(() => {
    if (!isNum || reduceMotion) {
      setShown(value);
      return undefined;
    }
    let raf;
    const start = Date.now();
    const DURATION = 650;
    const tick = () => {
      const p = Math.min(1, (Date.now() - start) / DURATION);
      const eased = 1 - Math.pow(1 - p, 3);
      setShown(p >= 1 ? value : Math.round(value * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, isNum, reduceMotion]);
  const text = shown == null ? String(shown) : shown.toLocaleString();
  return <Text style={style}>৳{text}</Text>;
}
