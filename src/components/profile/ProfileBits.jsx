import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { View, Text, TextInput, FlatList, Keyboard, Platform, Dimensions } from 'react-native';
import { ChevronDown, X, Search, Check } from 'lucide-react-native';
import { C, SHADOW, ORANGE, Press, Spinner, Overlay } from '@/components/product/ui';
import { TS, RED, BODY } from '@/components/cart/CartBits';
import { useDashboardKeyboard } from '@/components/DashboardLayout';

/* ═══════════════════════════════════════════════════════════════════════
   Form pieces shared by the profile screens (web pages/dashboard/user/
   information + security, < 640px). Plain Tailwind v4 sizes — these pages
   have no scoped mobile font shrink.
   ═══════════════════════════════════════════════════════════════════════ */

export const GRAY50 = '#f9fafb';
export const PAGE_GAP = 16; // space-y-4
/* v4 preflight: inputs inherit the body colour; placeholders are that colour at 50%. */
export const PLACEHOLDER = 'rgba(30,41,59,0.5)';
/* focus:ring-2 focus:ring-[#e62222]/30 focus:border-[#e62222] */
const FOCUS_RING = '0 0 0 2px rgba(230,34,34,0.3)';
/* shadow-md shadow-orange-200 (v4 colours both layers at full orange-200). */
export const ORANGE_SHADOW = '0 4px 6px -1px #fed7aa, 0 2px 4px -2px #fed7aa';

export const CARD = {
  backgroundColor: '#ffffff',
  borderRadius: 16,
  borderWidth: 1,
  borderColor: C.gray100,
  boxShadow: SHADOW.base,
};

/* <label class="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5"> */
export function Field({ label, children }) {
  return (
    <View>
      <Text
        style={[
          TS.xs,
          { fontWeight: '700', color: C.gray500, textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 6 },
        ]}
      >
        {label}
      </Text>
      {children}
    </View>
  );
}

const BOX = {
  height: 42, // py-2.5 + text-sm line + 1px borders
  borderWidth: 1,
  borderRadius: 12,
  justifyContent: 'center',
};

/* <Input>: `w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm`.
   Uncontrolled (defaultValue) — the parent may re-render on every keystroke
   without the field dropping characters. `value` is only for read-only
   fields. `icon` sits at left-3.5 and pads the text to pl-9; `right` is an
   absolutely positioned trailing slot (e.g. the password eye). */
export const Input = forwardRef(function Input(
  { icon: Icon, iconColor = C.gray400, right, padRight = 16, editable = true, onFocus, onBlur, style, ...rest },
  ref,
) {
  const inner = useRef(null);
  const kb = useDashboardKeyboard();
  const [focused, setFocused] = useState(false);
  useImperativeHandle(ref, () => inner.current);
  return (
    <View
      style={[
        BOX,
        {
          borderColor: focused ? RED : C.gray200,
          backgroundColor: editable ? '#ffffff' : GRAY50,
        },
        focused && { boxShadow: FOCUS_RING },
        style,
      ]}
    >
      {Icon && (
        <View pointerEvents="none" style={{ position: 'absolute', left: 14 }}>
          <Icon size={14} color={iconColor} />
        </View>
      )}
      <TextInput
        ref={inner}
        editable={editable}
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
          height: 40,
          paddingVertical: 0,
          paddingLeft: Icon ? 36 : 16,
          paddingRight: padRight,
          fontSize: 14,
          color: editable ? BODY : C.gray400,
          includeFontPadding: false,
        }}
        {...rest}
      />
      {right}
    </View>
  );
});

/* <SelectField> + its ChevronDown: a native <select> opens the OS picker on a
   phone; here it opens a PickerSheet. A disabled select is drawn at Chrome's
   UA opacity (0.7). The focus ring shows while its sheet is open. */
export function SelectBox({ label, onPress, disabled, open, loading, chevron = 14, chevronRight = 14 }) {
  return (
    <Press
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        BOX,
        {
          borderColor: open ? RED : C.gray200,
          backgroundColor: pressed ? GRAY50 : '#ffffff',
          paddingLeft: 16,
          paddingRight: 36,
          opacity: disabled ? 0.7 : 1,
        },
        open && { boxShadow: FOCUS_RING },
      ]}
    >
      <Text style={[TS.sm, { color: BODY }]} numberOfLines={1}>
        {label}
      </Text>
      <View pointerEvents="none" style={{ position: 'absolute', right: chevronRight }}>
        {loading ? <Spinner size={chevron} color={C.gray400} /> : <ChevronDown size={chevron} color={C.gray400} />}
      </View>
    </Press>
  );
}

/* Orange submit: `flex items-center gap-2 bg-[#FF6A00] hover:bg-[#E05900]
   text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-md
   shadow-orange-200 disabled:opacity-60`. */
export function OrangeButton({ Icon, label, loading, loadingLabel = 'Saving…', onPress, px = 24, iconSize = 15, self = 'flex-start' }) {
  return (
    <Press
      onPress={onPress}
      disabled={loading}
      style={({ pressed }) => ({
        alignSelf: self,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: pressed ? '#E05900' : ORANGE,
        paddingHorizontal: px,
        paddingVertical: 10,
        borderRadius: 12,
        boxShadow: ORANGE_SHADOW,
        opacity: loading ? 0.6 : 1,
        transform: [{ scale: pressed ? 0.98 : 1 }],
      })}
    >
      {loading ? <Spinner size={iconSize} color="#ffffff" /> : <Icon size={iconSize} color="#ffffff" />}
      <Text style={[TS.sm, { fontWeight: '700', color: '#ffffff' }]}>{loading ? loadingLabel : label}</Text>
    </Press>
  );
}

/* How far the keyboard reaches up into a bottom-anchored view. With Android
   edge-to-edge the window does not shrink, so the sheet has to lift itself. */
function useKeyboardOverlap(viewRef) {
  const [pad, setPad] = useState(0);
  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvt, (e) => {
      const kbTop = e.endCoordinates?.screenY || Dimensions.get('window').height - (e.endCoordinates?.height || 0);
      viewRef.current?.measureInWindow?.((_x, y, _w, h) => setPad(Math.max(0, y + h - kbTop)));
    });
    const hide = Keyboard.addListener(hideEvt, () => setPad(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, [viewRef]);
  return pad;
}

/* The option list a <select> shows, as an in-screen bottom sheet. Options are
   { value, label }; `searchable` adds a filter box for the long lists
   (districts, RedX areas). */
export function PickerSheet({ visible, title, options, value, onSelect, onClose, searchable = false }) {
  return (
    <Overlay visible={visible} onClose={onClose} zIndex={60}>
      <PickerPanel title={title} options={options} value={value} onSelect={onSelect} onClose={onClose} searchable={searchable} />
    </Overlay>
  );
}

function PickerPanel({ title, options, value, onSelect, onClose, searchable }) {
  const rootRef = useRef(null);
  const kbPad = useKeyboardOverlap(rootRef);
  const [q, setQ] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const list = useMemo(() => {
    const n = q.trim().toLowerCase();
    return n ? options.filter((o) => o.label.toLowerCase().includes(n)) : options;
  }, [options, q]);
  const maxH = Dimensions.get('window').height * 0.7;

  return (
    <View
      ref={rootRef}
      collapsable={false}
      style={{
        backgroundColor: '#ffffff',
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        maxHeight: maxH,
        paddingBottom: kbPad,
        boxShadow: SHADOW['2xl'],
      }}
    >
      <View style={{ alignItems: 'center', paddingTop: 8 }}>
        <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: C.gray200 }} />
      </View>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 16,
          paddingTop: 8,
          paddingBottom: 12,
          borderBottomWidth: 1,
          borderBottomColor: C.gray100,
        }}
      >
        <Text style={[TS.sm, { fontWeight: '700', color: C.gray800 }]}>{title}</Text>
        <Press
          onPress={onClose}
          hitSlop={10}
          accessibilityLabel="Close"
          style={({ pressed }) => ({ padding: 4, borderRadius: 8, backgroundColor: pressed ? C.gray100 : 'transparent' })}
        >
          <X size={16} color={C.gray500} />
        </Press>
      </View>

      {searchable && (
        <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 }}>
          <View
            style={[
              BOX,
              { borderColor: searchFocused ? RED : C.gray200, backgroundColor: '#ffffff' },
              searchFocused && { boxShadow: FOCUS_RING },
            ]}
          >
            <View pointerEvents="none" style={{ position: 'absolute', left: 14 }}>
              <Search size={14} color={C.gray400} />
            </View>
            <TextInput
              onChangeText={setQ}
              placeholder="Search"
              placeholderTextColor={PLACEHOLDER}
              autoCorrect={false}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              style={{ height: 40, paddingVertical: 0, paddingLeft: 36, paddingRight: 16, fontSize: 14, color: BODY, includeFontPadding: false }}
            />
          </View>
        </View>
      )}

      <FlatList
        data={list}
        keyExtractor={(o, i) => `${o.value}-${i}`}
        keyboardShouldPersistTaps="handled"
        style={{ flexGrow: 0 }}
        contentContainerStyle={{ paddingVertical: 6 }}
        initialNumToRender={20}
        ListEmptyComponent={
          <Text style={[TS.sm, { color: C.gray400, textAlign: 'center', paddingVertical: 24 }]}>No matches</Text>
        }
        renderItem={({ item }) => {
          const selected = item.value === value;
          return (
            <Press
              onPress={() => onSelect(item.value)}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                paddingHorizontal: 16,
                paddingVertical: 12,
                backgroundColor: pressed ? GRAY50 : selected ? '#fff7ed' : '#ffffff',
              })}
            >
              <Text
                style={[TS.sm, { flexShrink: 1, color: selected ? ORANGE : item.value === '' ? C.gray400 : C.gray700, fontWeight: selected ? '700' : '400' }]}
              >
                {item.label}
              </Text>
              {selected && <Check size={15} color={ORANGE} strokeWidth={2.5} />}
            </Press>
          );
        }}
      />
    </View>
  );
}
