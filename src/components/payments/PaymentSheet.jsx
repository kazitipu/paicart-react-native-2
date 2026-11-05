import React, { useEffect, useRef, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Keyboard, Platform, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';
import { CreditCard, X, ArrowLeft, Banknote, Smartphone } from 'lucide-react-native';
import { C, Press, ScalePress, Overlay } from '@/components/product/ui';
import { TS } from '@/components/cart/CartBits';

/* ═══════════════════════════════════════════════════════════════════════
   Building blocks shared by the four payment sheets — PrePaymentModal
   (checkout), OrderPaymentModal (orders), BookingPaymentModal (Buy For Me
   requests) and ShipmentPaymentModal (Ship For Me). On the web each of those
   repeats the same markup at its mobile breakpoint (< 640px):

     fixed inset-0 … items-end      → bottom sheet, bg rgba(0,0,0,0.55)
     rounded-t-3xl max-h-[92vh] shadow-2xl
     orange handle strip (pt-3 pb-1, w-10 h-1 bg-white/40)
     orange header (px-5 py-4, CreditCard tile, title / subtitle, X button)
     amount card (#fef6e0 / #fde68a)
     tabs Mobile Banking / Direct Deposit
     scroll body (px-5 py-4 space-y-4)
     footer (border-t px-5 py-4 gap-3) — Direct Deposit only

   Every value below is the web's exact pixel value. Tailwind v4 sizes:
   text-xs 12/16, text-sm 14/20.
   ═══════════════════════════════════════════════════════════════════════ */

export const PAY = {
  HEAD: '#FF6A00',
  OFFER: '#FF6600',
  TEAL: '#00B8A9',
  /* Ship For Me's tabs and deposit banner use a darker teal */
  TEAL_SHIP: '#00857A',
  TEAL_DEEP: '#0d9488',
  TEAL500: '#14b8a6',
  BKASH_BTN: '#d62267',
  BKASH_TEXT: '#e2136e',
  PINK50: '#fdf2f8',
  PINK200: '#fbcfe8',
  SLATE100: '#f1f5f9',
  SLATE200: '#e2e8f0',
  SLATE500: '#64748b',
  YELLOW: '#FABC16',
};

/* 0 2px 8px #00B8A944 / #1e3a5f44 — 0x44 ≈ 0.267 alpha */
export const TAB_SHADOW = '0 2px 8px rgba(0,184,169,0.267)';
export const TAB_SHADOW_SHIP = '0 2px 8px rgba(30,58,95,0.267)';

export const AMBER_BOX = { backgroundColor: '#fef6e0', borderWidth: 1, borderColor: '#fde68a' };
export const BTN_SHADOW = '0 4px 14px rgba(255,106,0,0.267)';

/* text-xs font-semibold uppercase tracking-wide gray-500 (the card labels) */
export const CARD_LABEL = [TS.xs, { color: C.gray500, fontWeight: '600', letterSpacing: 0.3, textTransform: 'uppercase' }];
/* text-2xl font-extrabold leading-tight gray-800 */
export const BIG_AMOUNT = { fontSize: 24, lineHeight: 30, fontWeight: '800', color: C.gray800 };

/* w-8 h-8 bg-white/10 rounded-xl header button (hover:bg-white/25). */
export function HeadButton({ onPress, children, label }) {
  return (
    <Press
      onPress={onPress}
      hitSlop={6}
      accessibilityLabel={label}
      style={({ pressed }) => ({
        width: 32,
        height: 32,
        borderRadius: 12,
        backgroundColor: pressed ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      })}
    >
      {children}
    </Press>
  );
}

/* flex-1 py-2.5 rounded-2xl border border-gray-200 (Skip Offer / Cancel). */
export function GhostButton({ title, onPress }) {
  return (
    <View style={{ flex: 1 }}>
      <ScalePress
        onPress={onPress}
        style={{ paddingVertical: 10, borderRadius: 16, borderWidth: 1, borderColor: C.gray200, alignItems: 'center' }}
      >
        <Text style={[TS.sm, { fontWeight: '600', color: C.gray600 }]}>{title}</Text>
      </ScalePress>
    </View>
  );
}

/* flex-1 py-2.5 rounded-2xl orange (Continue / Submit Payment). */
export function SolidButton({ onPress, disabled, children }) {
  return (
    <View style={{ flex: 1 }}>
      <ScalePress
        onPress={onPress}
        disabled={disabled}
        style={{
          paddingVertical: 10,
          borderRadius: 16,
          backgroundColor: PAY.HEAD,
          boxShadow: BTN_SHADOW,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          opacity: disabled ? 0.5 : 1,
        }}
      >
        {children}
      </ScalePress>
    </View>
  );
}

/* border-t border-gray-100 px-5 py-4 flex gap-3 (bg-white/80). */
export function SheetFooter({ children, bottomInset = 0 }) {
  return (
    <View
      style={{
        borderTopWidth: 1,
        borderTopColor: C.gray100,
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 16 + bottomInset,
        flexDirection: 'row',
        gap: 12,
        backgroundColor: 'rgba(255,255,255,0.8)',
      }}
    >
      {children}
    </View>
  );
}

/* w-12 h-12 rounded-2xl #FABC16 tile with a white Banknote (Ship For Me's is
   w-14 h-14 with a 26px icon and an amber-500 glow). */
export function BanknoteTile({ size = 48, icon = 22, shadow = '0 4px 14px rgba(250,188,22,0.333)' }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: 16,
        backgroundColor: PAY.YELLOW,
        boxShadow: shadow,
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <Banknote size={icon} color="#ffffff" />
    </View>
  );
}

/* px-5 pb-1 flex gap-2 — the two method tabs. */
export function MethodTabs({ tab, onChange, color = PAY.TEAL, shadow = TAB_SHADOW }) {
  return (
    <View style={{ paddingHorizontal: 20, paddingBottom: 4, flexDirection: 'row', gap: 8 }}>
      {[
        { id: 'bkash', label: 'Mobile Banking', Icon: Smartphone },
        { id: 'direct', label: 'Direct Deposit', Icon: Banknote },
      ].map(({ id, label, Icon }) => {
        const on = tab === id;
        return (
          <View key={id} style={{ flex: 1 }}>
            <Press
              onPress={() => onChange(id)}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                paddingVertical: 10,
                borderRadius: 12,
                backgroundColor: on ? color : pressed ? PAY.SLATE200 : PAY.SLATE100,
                boxShadow: on ? shadow : undefined,
              })}
            >
              <Icon size={12} color={on ? '#ffffff' : PAY.SLATE500} />
              <Text style={[TS.xs, { fontWeight: '700', color: on ? '#ffffff' : PAY.SLATE500 }]}>{label}</Text>
            </Press>
          </View>
        );
      })}
    </View>
  );
}

/* overflow-y-auto flex-1 px-5 py-4 space-y-4 — the scrolling middle. With no
   footer under it (Mobile Banking tab) it also clears the bottom inset. */
export function SheetBody({ children, bottomPad = 0 }) {
  return (
    <ScrollView
      style={{ flexShrink: 1 }}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16 + bottomPad, gap: 16 }}
    >
      {children}
    </ScrollView>
  );
}

/* A tab's content — fades in when the tab changes (opacity only). */
export function TabPane({ id, children }) {
  return (
    <Animated.View key={id} entering={FadeIn.duration(180)} style={{ gap: 16 }}>
      {children}
    </Animated.View>
  );
}

/* rounded-xl px-4 py-2.5 text-center text-xs font-bold text-white banner. */
export function DepositBanner({ color = PAY.TEAL }) {
  return (
    <View style={{ borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: color }}>
      <Text style={[TS.xs, { fontWeight: '700', color: '#ffffff', textAlign: 'center' }]}>
        নিম্নোক্ত একাউন্টে জমা / ট্রান্সফার করুন
      </Text>
    </View>
  );
}

/* Keyboard: Android edge-to-edge ignores adjustResize, so an open keyboard
   simply covers the bottom of the screen. While it is up the sheet is lifted
   to sit on the keyboard's real top edge (endCoordinates.screenY, compared
   with the sheet area's bottom in window coordinates) and its max height
   shrinks to match — the amount input lives in the sheet's fixed top part,
   so it stays in view while the body scrolls. */
function useKeyboardLift(areaRef, active) {
  const [lift, setLift] = useState(0);
  useEffect(() => {
    if (!active) {
      setLift(0);
      return undefined;
    }
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvt, (e) => {
      const kbTop = e.endCoordinates?.screenY;
      const area = areaRef.current;
      if (!kbTop || !area) return;
      area.measureInWindow((_x, y, _w, h) => setLift(Math.max(0, Math.round(y + h - kbTop))));
    });
    const hide = Keyboard.addListener(hideEvt, () => setLift(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, [active, areaRef]);
  return lift;
}

/**
 * The sheet itself: in-screen Overlay (Android back closes it), scrim
 * rgba(0,0,0,0.55), panel rounded-t-3xl shadow-2xl, max-h 92vh, orange
 * handle strip + header.
 *
 * The panel container is stretched over the whole sheet area with
 * pointer-events box-none (taps above the sheet still reach the scrim) so the
 * area's height can be measured: inside a tab screen the area ends at the tab
 * bar, and 92% of the window would push the sheet's top under the status bar.
 */
export function PaymentSheet({
  visible,
  onClose,
  title,
  subtitle,
  onBack,
  backLabel = 'Back',
  zIndex = 60,
  children,
}) {
  const insets = useSafeAreaInsets();
  const { height: winH } = useWindowDimensions();
  const areaRef = useRef(null);
  const [areaH, setAreaH] = useState(0);
  const lift = useKeyboardLift(areaRef, visible);

  const room = (areaH || winH) - insets.top - lift;
  const maxHeight = Math.max(0, Math.min(winH * 0.92, room));

  return (
    <Overlay
      visible={visible}
      onClose={onClose}
      scrim="rgba(0,0,0,0.55)"
      zIndex={zIndex}
      panelStyle={{ top: 0, justifyContent: 'flex-end', pointerEvents: 'box-none' }}
    >
      <View
        ref={areaRef}
        collapsable={false}
        style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}
        onLayout={(e) => setAreaH(e.nativeEvent.layout.height)}
      />
      <View
        style={{
          backgroundColor: '#ffffff',
          maxHeight,
          marginBottom: lift,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          overflow: 'hidden',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
        }}
      >
        {/* Handle strip — carries the header colour */}
        <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 4, backgroundColor: PAY.HEAD }}>
          <View style={{ width: 40, height: 4, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.4)' }} />
        </View>

        {/* Header */}
        <View
          style={{
            paddingHorizontal: 20,
            paddingVertical: 16,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: PAY.HEAD,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flexShrink: 1 }}>
            {onBack && (
              <Animated.View entering={ZoomIn.duration(160)}>
                <HeadButton onPress={onBack} label={backLabel}>
                  <ArrowLeft size={15} color="#ffffff" />
                </HeadButton>
              </Animated.View>
            )}
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 12,
                backgroundColor: 'rgba(255,255,255,0.15)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <CreditCard size={16} color="#ffffff" />
            </View>
            <View style={{ flexShrink: 1 }}>
              <Text style={[TS.sm, { fontWeight: '700', color: '#ffffff' }]}>{title}</Text>
              <Text style={[TS.xs, { color: 'rgba(255,255,255,0.7)' }]}>{subtitle}</Text>
            </View>
          </View>
          <HeadButton onPress={onClose} label="Close">
            <X size={15} color="#ffffff" />
          </HeadButton>
        </View>

        {children}
      </View>
    </Overlay>
  );
}
