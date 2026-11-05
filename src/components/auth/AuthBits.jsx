import React, { createContext, forwardRef, useCallback, useContext, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { View, Text, TextInput, Keyboard, Platform, Dimensions, useWindowDimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedProps,
  useAnimatedRef,
  withSequence,
  withRepeat,
  withTiming,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Circle } from 'react-native-svg';
import { Eye, EyeOff, RotateCw } from 'lucide-react-native';
import Header from '@/components/Header';
import useHideOnScroll from '@/lib/useHideOnScroll';
import { C, SHADOW, ORANGE, Press, Spinner } from '@/components/product/ui';
import { TS, tpx, RED, BODY } from '@/components/cart/CartBits';
import { PLACEHOLDER } from '@/components/profile/ProfileBits';

/* ═══════════════════════════════════════════════════════════════════════
   Pieces of the auth screens (web pages/login + pages/forget-password,
   < 640px). Plain Tailwind v4 sizes — no scoped mobile font shrink on these
   pages. text-[Npx] inherits the body's 1.5 line-height (tpx).
   ═══════════════════════════════════════════════════════════════════════ */

export const GRAY50 = '#f9fafb';
export const GRAY900 = '#111827';
export const PAGE_BG = GRAY50; // min-h-screen bg-gray-50
export const ORANGE_HOVER = '#E05900';
/* tracking-widest = 0.1em */
export const widest = (px) => px * 0.1;

/* shadow-xl shadow-gray-200/80 — v4 colours both layers with the shadow colour. */
export const CARD_SHADOW = '0 20px 25px -5px rgba(229,231,235,0.8), 0 8px 10px -6px rgba(229,231,235,0.8)';

/* ── Keyboard: Android edge-to-edge ignores adjustResize, so the screen
   pads its scroll content by the keyboard height and scrolls the focused
   field clear of it (measureInWindow vs keyboardDidShow screenY) — the same
   approach as DashboardLayout / PlaceOrder. ── */
const KbCtx = createContext(null);
export const useAuthKeyboard = () => useContext(KbCtx);

/* Web chrome for an auth page: the global Header (sticky, hide-on-scroll —
   AppShell renders it on every route, BottomNav only on / and /collection/),
   then a `min-h-screen` page whose content is vertically centred. No Footer
   (the RN ports render none). No tab bar: these screens are in the root
   stack, over the tabs. */
export function AuthChrome({ bg = PAGE_BG, children, overlays }) {
  const insets = useSafeAreaInsets();
  const { height: winH } = useWindowDimensions();
  const { onScroll, scrollY, isHidden, headerH, setHeaderH, headerStyle } = useHideOnScroll();
  const scrollRef = useAnimatedRef();

  const focusedRef = useRef(null);
  const kbTopRef = useRef(0);
  const [kbPad, setKbPad] = useState(0);

  const ensureVisible = useCallback(() => {
    const input = focusedRef.current?.current;
    if (!input || !kbTopRef.current || !input.measureInWindow) return;
    input.measureInWindow((_x, y, _w, h) => {
      const overlap = y + h + 16 - kbTopRef.current;
      if (overlap > 0) scrollRef.current?.scrollTo({ y: scrollY.value + overlap, animated: true });
    });
  }, [scrollRef, scrollY]);

  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvt, (e) => {
      const kbH = e.endCoordinates?.height || 0;
      kbTopRef.current = e.endCoordinates?.screenY || Dimensions.get('window').height - kbH;
      setKbPad(kbH);
      setTimeout(ensureVisible, 80);
    });
    const hide = Keyboard.addListener(hideEvt, () => {
      kbTopRef.current = 0;
      setKbPad(0);
    });
    return () => {
      show.remove();
      hide.remove();
    };
  }, [ensureVisible]);

  const kb = useMemo(
    () => ({
      focus: (ref) => {
        focusedRef.current = ref;
        if (kbTopRef.current) setTimeout(ensureVisible, 60);
      },
      blur: (ref) => {
        if (focusedRef.current === ref) focusedRef.current = null;
      },
    }),
    [ensureVisible],
  );

  /* 100vh as the phone browser sees it: the window minus the system bars. */
  const screenH = winH - insets.top - insets.bottom;

  return (
    <KbCtx.Provider value={kb}>
      <View style={{ flex: 1, backgroundColor: bg }}>
        <Animated.ScrollView
          ref={scrollRef}
          onScroll={onScroll}
          scrollEventThrottle={16}
          style={{ flex: 1, marginTop: insets.top }}
          contentContainerStyle={{ flexGrow: 1, paddingBottom: kbPad + insets.bottom }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="none"
        >
          <View style={{ height: headerH }} />
          <View style={{ minHeight: screenH, justifyContent: 'center' }}>{children}</View>
        </Animated.ScrollView>

        <Animated.View
          pointerEvents={isHidden ? 'none' : 'box-none'}
          style={[{ position: 'absolute', top: insets.top, left: 0, right: 0, zIndex: 10 }, headerStyle]}
        >
          <Header hidden={isHidden} onLayout={(e) => setHeaderH(e.nativeEvent.layout.height)} />
        </Animated.View>
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: insets.top, backgroundColor: '#ffffff', zIndex: 11 }} />
        {overlays}
      </View>
    </KbCtx.Provider>
  );
}

/* Horizontal shake for a field / the OTP row on a validation error. Ends at
   translateX 0, so the (tappable) input's hit area is back where it is drawn. */
export function useShake() {
  const x = useSharedValue(0);
  const style = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  const shake = useCallback(() => {
    const s = (v) => withTiming(v, { duration: 50, easing: Easing.linear });
    x.value = withSequence(s(-6), s(6), s(-5), s(5), s(-2), s(0));
  }, [x]);
  return [style, shake];
}

/* <label class="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1.5"> */
export function Label({ children, mb = 6 }) {
  return (
    <Text
      style={[
        TS.xs,
        { fontWeight: '600', color: C.gray500, textTransform: 'uppercase', letterSpacing: widest(12), marginBottom: mb },
      ]}
    >
      {children}
    </Text>
  );
}

/* A web text input: uncontrolled (`defaultValue` + onChangeText into a ref
   held by the screen), so re-renders never reset or drop typed characters.
   `h-12 bg-gray-50 border-2 border-gray-200 focus:border-[#e62222]
   focus:bg-white rounded-xl text-sm`. */
const WebInput = forwardRef(function WebInput(
  { padLeft = 16, padRight = 16, radius, onFocus, onBlur, style, boxStyle, left, right, ...rest },
  ref,
) {
  const inner = useRef(null);
  const kb = useAuthKeyboard();
  const [focused, setFocused] = useState(false);
  useImperativeHandle(ref, () => inner.current);
  return (
    <View
      style={[
        {
          height: 48,
          borderWidth: 2,
          borderColor: focused ? RED : C.gray200,
          backgroundColor: focused ? '#ffffff' : GRAY50,
          borderRadius: 12,
          justifyContent: 'center',
        },
        radius,
        boxStyle,
      ]}
    >
      {left}
      <TextInput
        ref={inner}
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
        style={[
          {
            height: 44,
            paddingVertical: 0,
            paddingLeft: padLeft,
            paddingRight: padRight,
            fontSize: 14,
            color: BODY,
            includeFontPadding: false,
          },
          style,
        ]}
        {...rest}
      />
      {right}
    </View>
  );
});

/* The web <Field>: label, an icon at left-3.5 (pl-10), and for passwords the
   Eye / EyeOff toggle at right-3.5. `children` render under the input
   (e.g. "Forgot password?"). Shakes when `shakeRef.current()` is called. */
export const Field = forwardRef(function Field(
  { icon: Icon, iconSize = 15, iconLeft = 14, padLeft, padRight = 16, label, password = false, children, shakeStyle, ...inputProps },
  ref,
) {
  const [showPw, setShowPw] = useState(false);
  return (
    <Animated.View style={shakeStyle}>
      {label ? <Label>{label}</Label> : null}
      <WebInput
        ref={ref}
        padLeft={padLeft ?? (Icon ? 40 : 16)}
        padRight={padRight}
        secureTextEntry={password && !showPw}
        left={
          Icon ? (
            <View pointerEvents="none" style={{ position: 'absolute', left: iconLeft - 2, zIndex: 1 }}>
              <Icon size={iconSize} color={C.gray400} />
            </View>
          ) : null
        }
        right={
          password ? (
            <Press
              onPress={() => setShowPw((v) => !v)}
              hitSlop={10}
              accessibilityLabel={showPw ? 'Hide password' : 'Show password'}
              style={({ pressed }) => ({ position: 'absolute', right: 12, opacity: pressed ? 0.6 : 1 })}
            >
              {({ pressed }) =>
                showPw ? (
                  <EyeOff size={15} color={pressed ? C.gray600 : C.gray400} />
                ) : (
                  <Eye size={15} color={pressed ? C.gray600 : C.gray400} />
                )
              }
            </Press>
          ) : null
        }
        {...inputProps}
      />
      {children}
    </Animated.View>
  );
});

/* type="tel": the `🇧🇩 +88` chip (bg-gray-50 border-2 border-r-0
   rounded-l-xl text-sm text-gray-600 font-semibold) glued to the input
   (rounded-r-xl). Only the input takes the focus colour, as on the web.
   `compact` is the register form's narrower variant (px-2.5, text-xs, one
   "🇧🇩 +88" text, input px-2.5). */
export const TelField = forwardRef(function TelField({ label, compact = false, shakeStyle, ...inputProps }, ref) {
  const chipText = compact ? TS.xs : TS.sm;
  return (
    <Animated.View style={shakeStyle}>
      {label ? <Label>{label}</Label> : null}
      <View style={{ flexDirection: 'row', alignItems: 'stretch', height: 48 }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: compact ? 4 : 6,
            paddingHorizontal: compact ? 10 : 14,
            backgroundColor: GRAY50,
            borderWidth: 2,
            borderRightWidth: 0,
            borderColor: C.gray200,
            borderTopLeftRadius: 12,
            borderBottomLeftRadius: 12,
          }}
        >
          {compact ? (
            <Text style={[chipText, { color: C.gray600, fontWeight: '600' }]}>🇧🇩 +88</Text>
          ) : (
            <>
              <Text style={[chipText, { color: C.gray600, fontWeight: '600' }]}>🇧🇩</Text>
              <Text style={[chipText, { color: C.gray600, fontWeight: '600' }]}>+88</Text>
            </>
          )}
        </View>
        <WebInput
          ref={ref}
          padLeft={compact ? 10 : 16}
          padRight={compact ? 10 : 16}
          radius={{ borderRadius: 0, borderTopRightRadius: 12, borderBottomRightRadius: 12 }}
          boxStyle={{ flex: 1, minWidth: 0 }}
          keyboardType="phone-pad"
          autoComplete="tel"
          textContentType="telephoneNumber"
          {...inputProps}
        />
      </View>
    </Animated.View>
  );
});

/* <PrimaryBtn>: `w-full h-12 rounded-xl font-bold text-sm gap-2
   bg-[#FF6A00] hover:bg-[#E05900] text-white shadow-md disabled:opacity-60`,
   Loader2 17 while loading. */
export function PrimaryBtn({ label, Icon, loading, disabled, onPress, height = 48 }) {
  const off = loading || disabled;
  return (
    <Press
      onPress={onPress}
      disabled={off}
      accessibilityRole="button"
      accessibilityState={{ disabled: off, busy: !!loading }}
      style={({ pressed }) => ({
        height,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: pressed ? ORANGE_HOVER : ORANGE,
        boxShadow: pressed ? SHADOW.lg : SHADOW.md,
        opacity: off ? 0.6 : 1,
        transform: [{ scale: pressed ? 0.985 : 1 }],
      })}
    >
      {loading ? (
        <Spinner size={17} color="#ffffff" />
      ) : (
        <>
          <Text style={[TS.sm, { fontWeight: '700', color: '#ffffff' }]}>{label}</Text>
          {Icon && <Icon size={15} color="#ffffff" />}
        </>
      )}
    </Press>
  );
}

/* <Divider>: a border-gray-100 rule behind `bg-white px-3 text-[11px]
   text-gray-400 font-medium uppercase tracking-widest`. Its my-4 collapses
   with the form's space-y-4, so it sits 16px from each neighbour. */
export function Divider({ text }) {
  return (
    <View style={{ justifyContent: 'center', alignItems: 'center' }}>
      <View style={{ position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: C.gray100 }} />
      <Text
        style={[
          tpx(11),
          {
            backgroundColor: '#ffffff',
            paddingHorizontal: 12,
            color: C.gray400,
            fontWeight: '500',
            textTransform: 'uppercase',
            letterSpacing: widest(11),
          },
        ]}
      >
        {text}
      </Text>
    </View>
  );
}

export function GoogleIcon({ size = 17 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <Path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <Path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <Path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </Svg>
  );
}

/* `w-full h-11 border-2 border-gray-200 hover:border-gray-300
   hover:bg-gray-50 text-gray-700 rounded-xl font-semibold text-sm gap-2.5
   disabled:opacity-60` */
export function GoogleBtn({ label, onPress, disabled }) {
  return (
    <Press
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={({ pressed }) => ({
        height: 44,
        borderWidth: 2,
        borderColor: pressed ? C.gray300 : C.gray200,
        backgroundColor: pressed ? GRAY50 : '#ffffff',
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        opacity: disabled ? 0.6 : 1,
      })}
    >
      <GoogleIcon />
      <Text style={[TS.sm, { fontWeight: '600', color: C.gray700 }]}>{label}</Text>
    </Press>
  );
}

/* ── <OtpCountdown>: a ring that drains as the code's lifetime runs out,
   driven by an absolute deadline (so a backgrounded app still shows the
   right time when it comes back). The ring animates natively from the
   current fraction to 0 over the remaining time; the numbers tick every
   250ms as on the web. ── */
/* `animate-spin` on an arbitrary icon (RotateCw while resending). */
function Spin({ spinning, children }) {
  const rot = useSharedValue(0);
  useEffect(() => {
    if (!spinning) {
      cancelAnimation(rot);
      rot.value = 0;
      return undefined;
    }
    rot.value = 0;
    rot.value = withRepeat(withTiming(360, { duration: 1000, easing: Easing.linear }), -1, false);
    return () => cancelAnimation(rot);
  }, [spinning, rot]);
  const style = useAnimatedStyle(() => ({ transform: [{ rotate: `${rot.value}deg` }] }));
  return <Animated.View style={style}>{children}</Animated.View>;
}

const RING_R = 15;
const RING_C = 2 * Math.PI * RING_R;
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export function OtpCountdown({ deadline, total, onResend, resending }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [deadline]);

  const left = Math.max(0, Math.ceil((deadline - now) / 1000));
  const expired = left === 0;
  const urgent = !expired && left <= 15;
  const color = expired ? RED : urgent ? C.amber500 : ORANGE;
  const mmss = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;

  const frac = useSharedValue(1);
  useEffect(() => {
    const remaining = Math.max(0, deadline - Date.now());
    frac.value = Math.max(0, Math.min(1, remaining / (total * 1000)));
    frac.value = withTiming(0, { duration: remaining, easing: Easing.linear });
    return () => cancelAnimation(frac);
  }, [deadline, total, frac]);
  const ringProps = useAnimatedProps(() => ({ strokeDashoffset: RING_C * (1 - frac.value) }));

  const tone = expired
    ? { borderColor: C.red100, backgroundColor: C.red50 }
    : urgent
      ? { borderColor: C.amber100, backgroundColor: C.amber50 }
      : { borderColor: C.orange100, backgroundColor: 'rgba(255,247,237,0.6)' };

  return (
    <View
      accessibilityRole="timer"
      accessibilityLiveRegion="polite"
      style={[
        { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10 },
        tone,
      ]}
    >
      <View style={{ width: 36, height: 36 }}>
        <Svg width={36} height={36} viewBox="0 0 36 36" style={{ transform: [{ rotate: '-90deg' }] }}>
          <Circle cx="18" cy="18" r={RING_R} fill="none" stroke="rgba(0,0,0,0.05)" strokeWidth="3" />
          <AnimatedCircle
            cx="18"
            cy="18"
            r={RING_R}
            fill="none"
            stroke={color}
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={RING_C}
            animatedProps={ringProps}
          />
        </Svg>
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={[tpx(10), { fontWeight: '800', color, fontVariant: ['tabular-nums'] }]}>{expired ? '!' : left}</Text>
        </View>
      </View>

      <View style={{ flex: 1, minWidth: 0 }}>
        {expired ? (
          <>
            <Text style={[TS.sm, { fontWeight: '700', color: RED }]}>Code expired</Text>
            <Text style={[tpx(11), { color: '#f87171' }]}>Request a new code to continue.</Text>
          </>
        ) : (
          <>
            <Text
              style={[
                tpx(11),
                { fontWeight: '600', textTransform: 'uppercase', letterSpacing: widest(11), color: C.gray400 },
              ]}
            >
              Code expires in
            </Text>
            <Text style={{ fontSize: 18, lineHeight: 22.5, fontWeight: '800', color, fontVariant: ['tabular-nums'] }}>{mmss}</Text>
          </>
        )}
      </View>

      {expired && (
        <Press
          onPress={onResend}
          disabled={resending}
          accessibilityRole="button"
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            borderRadius: 8,
            backgroundColor: pressed ? C.red50 : '#ffffff',
            borderWidth: 1,
            borderColor: C.red200,
            paddingHorizontal: 12,
            paddingVertical: 8,
            opacity: resending ? 0.6 : 1,
          })}
        >
          <Spin spinning={resending}>
            <RotateCw size={13} color={RED} />
          </Spin>
          <Text style={[TS.xs, { fontWeight: '700', color: RED }]}>Resend code</Text>
        </Press>
      )}
    </View>
  );
}
