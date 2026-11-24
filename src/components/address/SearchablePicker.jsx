import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, FlatList, Modal, Keyboard, Platform, Pressable, Dimensions, StyleSheet } from 'react-native';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import { ChevronDown, X, Search, Check } from 'lucide-react-native';
import { C, SHADOW, ORANGE, Press, Spinner } from '@/components/product/ui';
import { TS, BODY } from '@/components/cart/CartBits';

/* ═══════════════════════════════════════════════════════════════════════
   Type-to-search select, used for every Pathao City / Zone / Area field
   (profile address book and the booking forms' delivery address).

   The field looks like the form's other selects (`fieldStyle`,
   `pressedBg`, `openStyle`, chevron size / offset come from the caller).
   Tapping it opens a bottom sheet in a Modal (so it can live anywhere in a
   scroll view) with a search box (autofocused) over a FlatList:
   - case-insensitive; names STARTING with the text first, then names
     CONTAINING it, each group in the list's own order,
   - the current value is ticked,
   - "No match" when nothing fits, a spinner while `loading`,
   - `disabled` (e.g. until the parent level is chosen) never opens.

   options: [{ value, label }] — values compared as strings.
   onSelect(value) receives the option's value.
   ═══════════════════════════════════════════════════════════════════════ */

const PLACEHOLDER = C.gray300;

export const rankOptions = (options, query) => {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return options;
  const starts = [];
  const contains = [];
  options.forEach((o) => {
    const l = String(o.label || '').toLowerCase();
    if (l.startsWith(q)) starts.push(o);
    else if (l.includes(q)) contains.push(o);
  });
  return [...starts, ...contains];
};

/* Keyboard height while it is open (the Modal's window is full-screen, so
   the sheet lifts itself by that much). */
function useKeyboardHeight(active) {
  const [h, setH] = useState(0);
  useEffect(() => {
    if (!active) return undefined;
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvt, (e) => setH(e.endCoordinates?.height || 0));
    const hide = Keyboard.addListener(hideEvt, () => setH(0));
    return () => {
      show.remove();
      hide.remove();
      setH(0);
    };
  }, [active]);
  return h;
}

function PickerSheetModal({ visible, title, options, value, loading, onSelect, onClose, accent, searchPlaceholder }) {
  const [q, setQ] = useState('');
  const [focused, setFocused] = useState(false);
  const kbH = useKeyboardHeight(visible);
  useEffect(() => {
    if (visible) setQ('');
  }, [visible]);

  const list = useMemo(() => rankOptions(options || [], q), [options, q]);
  const winH = Dimensions.get('window').height;
  const maxH = Math.max(240, (winH - kbH) * 0.8);
  const cur = value == null ? '' : String(value);

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <View style={StyleSheet.absoluteFill}>
        <Animated.View entering={FadeIn.duration(180)} style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
        </Animated.View>
        <Animated.View
          entering={SlideInDown.duration(260)}
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: kbH,
            maxHeight: maxH,
            backgroundColor: '#ffffff',
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            boxShadow: SHADOW['2xl'],
            paddingBottom: kbH ? 0 : 16,
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

          <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 6 }}>
            <View
              style={{
                height: 42,
                borderWidth: 1,
                borderRadius: 12,
                justifyContent: 'center',
                borderColor: focused ? accent : C.gray200,
                backgroundColor: C.gray50,
              }}
            >
              <View pointerEvents="none" style={{ position: 'absolute', left: 14 }}>
                <Search size={14} color={C.gray400} />
              </View>
              <TextInput
                autoFocus
                value={q}
                onChangeText={setQ}
                placeholder={searchPlaceholder || `Search ${String(title || '').toLowerCase()}`}
                placeholderTextColor={PLACEHOLDER}
                autoCorrect={false}
                autoCapitalize="none"
                returnKeyType="search"
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                style={{
                  height: 40,
                  paddingVertical: 0,
                  paddingLeft: 36,
                  paddingRight: q ? 36 : 14,
                  fontSize: 14,
                  color: BODY,
                  includeFontPadding: false,
                }}
              />
              {!!q && (
                <Press
                  onPress={() => setQ('')}
                  hitSlop={8}
                  accessibilityLabel="Clear search"
                  style={{ position: 'absolute', right: 12 }}
                >
                  <X size={14} color={C.gray400} />
                </Press>
              )}
            </View>
          </View>

          {loading ? (
            <View style={{ alignItems: 'center', paddingVertical: 28, gap: 8 }}>
              <Spinner size={18} color={accent} />
              <Text style={[TS.xs, { color: C.gray400 }]}>Loading…</Text>
            </View>
          ) : (
            <FlatList
              data={list}
              keyExtractor={(o, i) => `${o.value}-${i}`}
              keyboardShouldPersistTaps="handled"
              style={{ flexGrow: 0 }}
              contentContainerStyle={{ paddingVertical: 4 }}
              initialNumToRender={20}
              ListEmptyComponent={
                <Text style={[TS.sm, { color: C.gray400, textAlign: 'center', paddingVertical: 24 }]}>No match</Text>
              }
              renderItem={({ item }) => {
                const selected = String(item.value) === cur;
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
                      backgroundColor: pressed ? C.gray50 : selected ? C.orange50 : '#ffffff',
                    })}
                  >
                    <Text
                      style={[TS.sm, { flexShrink: 1, color: selected ? accent : C.gray700, fontWeight: selected ? '700' : '400' }]}
                    >
                      {item.label}
                    </Text>
                    {selected && <Check size={15} color={accent} strokeWidth={2.5} />}
                  </Press>
                );
              }}
            />
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

export default function SearchablePicker({
  label,
  title,
  options,
  value,
  onSelect,
  loading = false,
  disabled = false,
  accent = ORANGE,
  fieldStyle,
  pressedBg = C.gray100,
  openStyle,
  chevronSize = 14,
  chevronRight = 12,
  chevronColor = C.gray400,
  searchPlaceholder,
  accessibilityLabel,
}) {
  const [open, setOpen] = useState(false);
  const close = () => {
    Keyboard.dismiss();
    setOpen(false);
  };
  const bg = (fieldStyle && fieldStyle.backgroundColor) || C.gray50;

  return (
    <>
      <Press
        onPress={() => setOpen(true)}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel || title}
        accessibilityState={{ disabled: !!disabled, expanded: open }}
        style={({ pressed }) => [
          {
            height: 42,
            borderWidth: 1,
            borderRadius: 12,
            justifyContent: 'center',
            borderColor: C.gray200,
            paddingLeft: 14,
            paddingRight: 32,
          },
          fieldStyle,
          { backgroundColor: pressed ? pressedBg : bg, opacity: disabled ? 0.7 : 1 },
          open && [{ borderColor: accent }, openStyle],
        ]}
      >
        <Text style={[TS.sm, { color: BODY }]} numberOfLines={1}>
          {label}
        </Text>
        <View pointerEvents="none" style={{ position: 'absolute', right: chevronRight }}>
          {loading ? <Spinner size={chevronSize} color={C.gray400} /> : <ChevronDown size={chevronSize} color={chevronColor} />}
        </View>
      </Press>
      <PickerSheetModal
        visible={open}
        title={title}
        options={options}
        value={value}
        loading={loading}
        accent={accent}
        searchPlaceholder={searchPlaceholder}
        onClose={close}
        onSelect={(v) => {
          close();
          onSelect?.(v);
        }}
      />
    </>
  );
}
