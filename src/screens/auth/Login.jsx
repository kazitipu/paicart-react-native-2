import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, Image, Keyboard } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import Animated, { FadeIn, useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';
import { Mail, Lock, User, Phone, ArrowRight, Shield, BadgeCheck, Star } from 'lucide-react-native';
import {
  AuthChrome, Field, TelField, Label, PrimaryBtn, Divider, GoogleBtn, OtpCountdown, useShake, useAuthKeyboard,
  CARD_SHADOW, GRAY900, GRAY50, widest,
} from '@/components/auth/AuthBits';
import OtpBoxes from '@/components/ui/OtpBoxes';
import { C, ORANGE, Press } from '@/components/product/ui';
import { TS, tpx, RED } from '@/components/cart/CartBits';
import { toast } from '@/lib/toast';
import {
  auth, signInWithGoogle, signInWithEmailAndPassword,
  createUserWithEmailAndPassword, sendPasswordResetEmail,
} from '@/lib/firebase';
import { createUserProfileDocument } from '@/lib/firebaseUtils';
import { sendOtpSms } from '@/lib/api';
import { sendOtpRedux, verifyOtpRedux } from '@/store/actions';
import { ROUTES, TABS as NAV_TABS } from '@/navigation/routes';
import { goHome } from '@/navigation/goHome';

/* ═══════════════════════════════════════════════════════════════════════
   Port of web src/app/pages/login/page.jsx at its mobile breakpoint
   (< 640px; the dark left panel is lg-only and not shown on a phone).

   Global Header, then a vertically-centred column (p-4 py-10, max-w-420):
   mobile brand (logo + tagline) · the white card with its three tabs
   (Sign In / Register / Phone OTP) and the active form · the trust row ·
   the Terms & Privacy line.

   Backend, call for call with the web:
   - Sign In   → signInWithEmailAndPassword(auth, email, password)
   - Register  → createUserWithEmailAndPassword, then
                 createUserProfileDocument(user, { displayName, mobileNo })
   - Google    → native GoogleSignin → GoogleAuthProvider.credential →
                 signInWithCredential (the web's signInWithPopup); the
                 profile doc is created by Providers' auth listener, as on
                 the web.
   - Forgot    → sendPasswordResetEmail(auth, email)
   - Phone OTP → GET {paicart}/api/v1/otp-sms-send/{number} (server texts &
                 stores the code, returns the normalised number + expiresIn),
                 then verifyOtpRedux → verifyOtp: checks otpSms/{number},
                 deletes it, creates users/{number}, remembers the number
                 (phone-login key) and signs in anonymously.

   Inputs are uncontrolled (values live in a ref, `defaultValue` restores
   them when a tab remounts) so re-renders never drop typed characters.
   HTML `required` / type="email" validation is reproduced in JS: the first
   invalid field (in DOM order) toasts the browser's message, shakes and
   takes focus.
   ═══════════════════════════════════════════════════════════════════════ */

const LOGO = require('@/assets/paicart_transparent.png');
const LOGO_SRC = Image.resolveAssetSource(LOGO);
const LOGO_H = 40; // h-10
const LOGO_W = LOGO_SRC?.width ? (LOGO_SRC.width / LOGO_SRC.height) * LOGO_H : 120;

const TABS = [
  { key: 'login', label: 'Sign In', icon: Mail },
  { key: 'register', label: 'Register', icon: User },
  { key: 'otp', label: 'Phone OTP', icon: Phone },
];

/* Chrome's constraint-validation messages for required / type="email". */
const REQUIRED_MSG = 'Please fill out this field.';
const emailMessage = (v) => {
  if (!v.includes('@')) return `Please include an '@' in the email address. '${v}' is missing an '@'.`;
  const at = v.indexOf('@');
  if (at === 0) return `Please enter a part followed by '@'. '${v}' is incomplete.`;
  if (at === v.length - 1) return `Please enter a part following '@'. '${v}' is incomplete.`;
  return null;
};

/* A field's focus target + shake. */
function useCtl() {
  const ref = useRef(null);
  const [shakeStyle, shake] = useShake();
  return { ref, shakeStyle, shake };
}

/* web returnTo was a URL (/pages/ship-for-me); in-app it is a screen name.
   Accept either. */
const resolveReturnTo = (r) => {
  if (!r) return null;
  if (ROUTES[r]) return r;
  const path = String(r).replace(/^\/+/, '').split('?')[0];
  return Object.keys(ROUTES).find((name) => ROUTES[name].path === path) || null;
};

/* The OTP boxes report focus to the screen's keyboard handler. */
function OtpField(props) {
  const kb = useAuthKeyboard();
  const ref = useRef(null);
  return <OtpBoxes ref={ref} onFocus={() => kb?.focus(ref)} onBlur={() => kb?.blur(ref)} {...props} />;
}

function Heading({ title, children }) {
  return (
    <View>
      <Text style={{ fontSize: 20, lineHeight: 28, fontWeight: '800', color: GRAY900 }}>{title}</Text>
      <Text style={[TS.xs, { color: C.gray400, marginTop: 2 }]}>{children}</Text>
    </View>
  );
}

/* Tab bar: `flex border-b border-gray-100`, each tab `flex-1 flex-col
   items-center gap-1 py-4 text-[11px] font-bold uppercase tracking-widest`,
   the active one red with a 2.5px #FF6A00 underline. The underline slides
   between tabs (it is not tappable, so an animated translate is safe). */
function TabBar({ tab, onChange }) {
  const [w, setW] = useState(0);
  const idx = Math.max(0, TABS.findIndex((t) => t.key === tab));
  const x = useSharedValue(0);
  const placed = useRef(false);
  useEffect(() => {
    if (!w) return;
    const to = (idx * w) / TABS.length;
    if (!placed.current) {
      x.value = to;
      placed.current = true;
    } else {
      x.value = withTiming(to, { duration: 240, easing: Easing.bezier(0.32, 0.72, 0, 1) });
    }
  }, [idx, w, x]);
  const indStyle = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));

  return (
    <View
      onLayout={(e) => setW(e.nativeEvent.layout.width)}
      style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: C.gray100 }}
    >
      {TABS.map((t) => {
        const Icon = t.icon;
        const active = tab === t.key;
        return (
          <Press
            key={t.key}
            onPress={() => onChange(t.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            style={{ flex: 1, alignItems: 'center', gap: 4, paddingVertical: 16 }}
          >
            {({ pressed }) => {
              const color = active ? RED : pressed ? C.gray600 : C.gray400;
              return (
                <>
                  <Icon size={17} strokeWidth={active ? 2.5 : 2} color={color} />
                  <Text
                    style={[
                      tpx(11),
                      { fontWeight: '700', textTransform: 'uppercase', letterSpacing: widest(11), color },
                    ]}
                  >
                    {t.label}
                  </Text>
                </>
              );
            }}
          </Press>
        );
      })}
      {w > 0 && (
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: 'absolute',
              left: 0,
              bottom: 0,
              width: w / TABS.length,
              height: 2.5,
              backgroundColor: ORANGE,
              borderTopLeftRadius: 999,
              borderTopRightRadius: 999,
            },
            indStyle,
          ]}
        />
      )}
    </View>
  );
}

function TrustItem({ Icon, text }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <Icon size={12} color={C.gray400} />
      <Text style={[tpx(11), { color: C.gray400 }]}>{text}</Text>
    </View>
  );
}

export default function Login() {
  const navigation = useNavigation();
  const route = useRoute();
  const dispatch = useDispatch();
  const returnTo = route.params?.returnTo;

  const [tab, setTab] = useState(route.params?.tab === 'register' || route.params?.tab === 'otp' ? route.params.tab : 'login');
  const [showForgot, setShowForgot] = useState(false);
  const [loader, setLoader] = useState(false);

  /* /pages/register (Register screen) re-targets an already-open Login. */
  useEffect(() => {
    const t = route.params?.tab;
    if (t === 'login' || t === 'register' || t === 'otp') {
      setTab(t);
      setShowForgot(false);
    }
  }, [route.params?.tab]);

  /* Form values (uncontrolled inputs write here). */
  const data = useRef({
    login: { email: '', password: '' },
    register: { displayName: '', email: '', password: '', confirmPassword: '', mobileNo: '' },
    forgotEmail: '',
    phone: '',
  });
  const set = (path, key) => (v) => {
    if (key) data.current[path][key] = v;
    else data.current[path] = v;
  };

  /* Phone OTP state (the web's). */
  const [phoneNumber, setPhoneNumber] = useState(''); // normalised number the server returned
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpDeadline, setOtpDeadline] = useState(0);
  const [otpTtl, setOtpTtl] = useState(60);
  const [resending, setResending] = useState(false);
  const [otpExpired, setOtpExpired] = useState(false);
  const [otpKey, setOtpKey] = useState(0); // remounts the boxes = clears them

  const lEmail = useCtl();
  const lPass = useCtl();
  const fEmail = useCtl();
  const rName = useCtl();
  const rMobile = useCtl();
  const rEmail = useCtl();
  const rPass = useCtl();
  const rConfirm = useCtl();
  const phone = useCtl();
  const [otpShakeStyle, shakeOtp] = useShake();

  /* First invalid field, in DOM order, wins — as the browser reports it. */
  const invalid = (fields) => {
    for (const [ctl, value, type] of fields) {
      const v = type === 'email' ? String(value).trim() : String(value);
      const msg = !v.length ? REQUIRED_MSG : type === 'email' ? emailMessage(v) : null;
      if (msg) {
        toast.error(msg);
        ctl.shake();
        ctl.ref.current?.focus();
        return true;
      }
    }
    return false;
  };

  /* router.push(returnTo || '/'). The auth screens are pushed over whatever
     sent the user here (Product, Cart, Place Order…), so going back IS the
     return. Opened cold (deep link), it lands on `returnTo` or Home. */
  const leave = () => {
    Keyboard.dismiss();
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    const target = resolveReturnTo(returnTo);
    const tabName = target && ROUTES[target].tab;
    navigation.reset({
      index: 0,
      routes: [{ name: 'Tabs', params: tabName ? { screen: tabName, params: { screen: target } } : { screen: NAV_TABS.HOME } }],
    });
  };

  const handleLogin = async () => {
    if (loader) return;
    const d = data.current.login;
    if (invalid([[lEmail, d.email, 'email'], [lPass, d.password]])) return;
    try {
      setLoader(true);
      /* type="email" inputs strip surrounding whitespace on the web. */
      await signInWithEmailAndPassword(auth, d.email.trim(), d.password);
      toast.success('Logged in successfully!');
      leave();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoader(false);
    }
  };

  const handleRegister = async () => {
    const d = data.current.register;
    if (
      invalid([
        [rName, d.displayName],
        [rMobile, d.mobileNo],
        [rEmail, d.email, 'email'],
        [rPass, d.password],
        [rConfirm, d.confirmPassword],
      ])
    ) {
      return;
    }
    if (d.password !== d.confirmPassword) {
      toast.error("Passwords don't match");
      rConfirm.shake();
      return;
    }
    if (loader) return;
    try {
      setLoader(true);
      const { user } = await createUserWithEmailAndPassword(auth, d.email.trim(), d.password);
      await createUserProfileDocument(user, { displayName: d.displayName, mobileNo: d.mobileNo });
      toast.success('Account created!');
      leave();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoader(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (loader) return;
    try {
      setLoader(true);
      const result = await signInWithGoogle();
      /* ⚠️ RN: null = the user dismissed the Google sheet. The web toasted
         the popup-closed error; here a cancel is silent and stays put. */
      if (result) {
        toast.success('Signed in with Google!');
        leave();
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoader(false);
    }
  };

  /* Texts a code to `number` and starts the countdown. Shared by the first
     send and "Resend code". Returns true on success. */
  const requestOtp = async (number) => {
    try {
      const res = await sendOtpSms(encodeURIComponent(number.trim()));
      const ttl = res.data.expiresIn || 60;
      setPhoneNumber(res.data.number);
      data.current.phone = res.data.number;
      dispatch(sendOtpRedux(res.data.number));
      setOtpTtl(ttl);
      setOtpDeadline(Date.now() + ttl * 1000);
      setOtpExpired(false);
      setOtpCode('');
      setOtpKey((k) => k + 1);
      setOtpSent(true);
      return true;
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to send OTP.');
      return false;
    }
  };

  const handleSendOtp = async () => {
    const number = data.current.phone;
    if (invalid([[phone, number]])) return;
    if (!number.trim() || loader) return;
    setLoader(true);
    if (await requestOtp(number)) toast.success('OTP sent!');
    setLoader(false);
  };

  const handleResendOtp = async () => {
    setResending(true);
    if (await requestOtp(phoneNumber)) toast.success('A new code is on its way.');
    setResending(false);
  };

  /* Flip to expired at the deadline so the boxes and Verify button lock. */
  useEffect(() => {
    if (!otpSent || !otpDeadline) return undefined;
    const id = setTimeout(() => setOtpExpired(true), Math.max(0, otpDeadline - Date.now()));
    return () => clearTimeout(id);
  }, [otpSent, otpDeadline]);

  const handleVerifyOtp = async () => {
    if (!otpCode.trim() || loader) return;
    if (otpExpired || Date.now() >= otpDeadline) {
      toast.error('Your OTP has expired. Please request a new one.');
      return;
    }
    try {
      setLoader(true);
      await dispatch(verifyOtpRedux(phoneNumber, otpCode.trim()));
      toast.success('OTP verified!');
      leave();
    } catch (err) {
      toast.error(err.message || 'Invalid OTP.');
      shakeOtp();
    } finally {
      setLoader(false);
    }
  };

  const handleForgotPassword = async () => {
    if (invalid([[fEmail, data.current.forgotEmail, 'email']])) return;
    try {
      setLoader(true);
      await sendPasswordResetEmail(auth, data.current.forgotEmail.trim());
      toast.success('Reset link sent!');
      setShowForgot(false);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoader(false);
    }
  };

  const switchTab = useCallback((k) => {
    setTab(k);
    setShowForgot(false);
  }, []);

  /* The web's Terms / Privacy are <Link>s, so back returns to the login
     page. Those screens live inside the tabs, which sit UNDER this root
     screen — a second tab navigator is pushed on top so back still lands
     here. */
  const openStatic = (screen) => navigation.push('Tabs', { screen: NAV_TABS.MORE, params: { screen } });

  const view = tab === 'login' ? (showForgot ? 'forgot' : 'login') : tab === 'otp' ? (otpSent ? 'verify' : 'send') : 'register';
  const linkStyle = { color: RED, fontWeight: '700' };

  return (
    <AuthChrome>
      <View style={{ paddingHorizontal: 16, paddingVertical: 40, alignItems: 'center' }}>
        <View style={{ width: '100%', maxWidth: 420 }}>
          {/* Mobile brand */}
          <View style={{ alignItems: 'center', marginBottom: 28 }}>
            <Press
              onPress={goHome}
              accessibilityLabel="Paicart home"
              style={({ pressed }) => ({ marginBottom: 8, opacity: pressed ? 0.7 : 1 })}
            >
              <Image source={LOGO} style={{ height: LOGO_H, width: LOGO_W }} resizeMode="contain" />
            </Press>
            <Text style={[TS.sm, { color: C.gray400, textAlign: 'center' }]}>
              🇧🇩 Bangladesh's #1 🇨🇳 China Sourcing Platform
            </Text>
          </View>

          {/* Card */}
          <View
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 16,
              borderWidth: 1,
              borderColor: C.gray100,
              boxShadow: CARD_SHADOW,
              overflow: 'hidden',
            }}
          >
            <TabBar tab={tab} onChange={switchTab} />

            <Animated.View key={view} entering={FadeIn.duration(200)} style={{ padding: 24 }}>
              {/* ─── Sign In ─── */}
              {view === 'login' && (
                <View style={{ gap: 16 }}>
                  <Heading title="Welcome back">Sign in to your Paicart account</Heading>

                  <Field
                    ref={lEmail.ref}
                    shakeStyle={lEmail.shakeStyle}
                    icon={Mail}
                    label="Email address"
                    defaultValue={data.current.login.email}
                    onChangeText={set('login', 'email')}
                    placeholder="you@example.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="email"
                    textContentType="emailAddress"
                    returnKeyType="next"
                    submitBehavior="submit"
                    onSubmitEditing={() => lPass.ref.current?.focus()}
                  />

                  <Field
                    ref={lPass.ref}
                    shakeStyle={lPass.shakeStyle}
                    icon={Lock}
                    label="Password"
                    password
                    defaultValue={data.current.login.password}
                    onChangeText={set('login', 'password')}
                    placeholder="Your password"
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="current-password"
                    textContentType="password"
                    returnKeyType="go"
                    onSubmitEditing={handleLogin}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 6 }}>
                      <Press onPress={() => setShowForgot(true)} hitSlop={8}>
                        {({ pressed }) => (
                          <Text
                            style={[
                              tpx(11),
                              { color: pressed ? '#ea580c' : RED, fontWeight: '600', letterSpacing: 11 * 0.025 },
                            ]}
                          >
                            Forgot password?
                          </Text>
                        )}
                      </Press>
                    </View>
                  </Field>

                  <PrimaryBtn label="Sign In" Icon={ArrowRight} loading={loader} onPress={handleLogin} />

                  <Divider text="or continue with" />

                  <GoogleBtn label="Sign in with Google" onPress={handleGoogleSignIn} disabled={loader} />

                  <Text style={[TS.xs, { textAlign: 'center', color: C.gray400, paddingTop: 4 }]}>
                    New to Paicart?{' '}
                    <Text onPress={() => setTab('register')} suppressHighlighting style={linkStyle}>
                      Create free account
                    </Text>
                  </Text>
                </View>
              )}

              {/* ─── Forgot Password ─── */}
              {view === 'forgot' && (
                <View style={{ gap: 16 }}>
                  <Heading title="Reset Password">We'll email you a reset link</Heading>
                  <Field
                    ref={fEmail.ref}
                    shakeStyle={fEmail.shakeStyle}
                    icon={Mail}
                    label="Your email address"
                    defaultValue={data.current.forgotEmail}
                    onChangeText={set('forgotEmail')}
                    placeholder="you@example.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="email"
                    textContentType="emailAddress"
                    returnKeyType="send"
                    onSubmitEditing={handleForgotPassword}
                  />
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <Press
                      onPress={() => setShowForgot(false)}
                      style={({ pressed }) => ({
                        flex: 1,
                        height: 48,
                        borderWidth: 2,
                        borderColor: C.gray200,
                        borderRadius: 12,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: pressed ? GRAY50 : '#ffffff',
                      })}
                    >
                      <Text style={[TS.sm, { fontWeight: '600', color: C.gray600 }]}>← Back</Text>
                    </Press>
                    <View style={{ flex: 1 }}>
                      <PrimaryBtn label="Send Link" loading={loader} onPress={handleForgotPassword} />
                    </View>
                  </View>
                </View>
              )}

              {/* ─── Register ─── */}
              {view === 'register' && (
                <View style={{ gap: 16 }}>
                  <Heading title="Create Account">Join 50,000+ 🇧🇩 Bangladeshi shoppers</Heading>

                  {/* Name + Phone side by side (grid-cols-2 gap-3) */}
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Field
                        ref={rName.ref}
                        shakeStyle={rName.shakeStyle}
                        icon={User}
                        iconSize={14}
                        iconLeft={12}
                        padLeft={36}
                        padRight={12}
                        label="Full Name"
                        defaultValue={data.current.register.displayName}
                        onChangeText={set('register', 'displayName')}
                        placeholder="John Doe"
                        autoCapitalize="words"
                        autoComplete="name"
                        textContentType="name"
                        returnKeyType="next"
                        submitBehavior="submit"
                        onSubmitEditing={() => rMobile.ref.current?.focus()}
                      />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <TelField
                        ref={rMobile.ref}
                        shakeStyle={rMobile.shakeStyle}
                        compact
                        label="Mobile"
                        defaultValue={data.current.register.mobileNo}
                        onChangeText={set('register', 'mobileNo')}
                        placeholder="01XXXXXXX"
                        returnKeyType="next"
                        submitBehavior="submit"
                        onSubmitEditing={() => rEmail.ref.current?.focus()}
                      />
                    </View>
                  </View>

                  <Field
                    ref={rEmail.ref}
                    shakeStyle={rEmail.shakeStyle}
                    icon={Mail}
                    label="Email address"
                    defaultValue={data.current.register.email}
                    onChangeText={set('register', 'email')}
                    placeholder="you@example.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="email"
                    textContentType="emailAddress"
                    returnKeyType="next"
                    submitBehavior="submit"
                    onSubmitEditing={() => rPass.ref.current?.focus()}
                  />

                  {/* Password + Confirm side by side */}
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Field
                        ref={rPass.ref}
                        shakeStyle={rPass.shakeStyle}
                        icon={Lock}
                        label="Password"
                        password
                        defaultValue={data.current.register.password}
                        onChangeText={set('register', 'password')}
                        placeholder="Min 6 chars"
                        autoCapitalize="none"
                        autoCorrect={false}
                        autoComplete="new-password"
                        textContentType="newPassword"
                        returnKeyType="next"
                        submitBehavior="submit"
                        onSubmitEditing={() => rConfirm.ref.current?.focus()}
                      />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Field
                        ref={rConfirm.ref}
                        shakeStyle={rConfirm.shakeStyle}
                        icon={Lock}
                        label="Confirm"
                        password
                        defaultValue={data.current.register.confirmPassword}
                        onChangeText={set('register', 'confirmPassword')}
                        placeholder="Repeat"
                        autoCapitalize="none"
                        autoCorrect={false}
                        autoComplete="new-password"
                        textContentType="newPassword"
                        returnKeyType="go"
                        onSubmitEditing={handleRegister}
                      />
                    </View>
                  </View>

                  <PrimaryBtn label="Create Account" Icon={ArrowRight} loading={loader} onPress={handleRegister} />

                  <Divider text="or sign up with" />

                  <GoogleBtn label="Continue with Google" onPress={handleGoogleSignIn} disabled={loader} />

                  <Text style={[TS.xs, { textAlign: 'center', color: C.gray400, paddingTop: 4 }]}>
                    Already have an account?{' '}
                    <Text onPress={() => setTab('login')} suppressHighlighting style={linkStyle}>
                      Sign in
                    </Text>
                  </Text>
                </View>
              )}

              {/* ─── Phone OTP: send ─── */}
              {view === 'send' && (
                <View style={{ gap: 20 }}>
                  <Heading title="Phone Login">Get a one-time code via SMS</Heading>

                  <View
                    style={{
                      backgroundColor: C.blue50,
                      borderWidth: 1,
                      borderColor: C.blue100,
                      borderRadius: 12,
                      paddingHorizontal: 16,
                      paddingVertical: 12,
                      flexDirection: 'row',
                      alignItems: 'flex-start',
                      gap: 12,
                    }}
                  >
                    <View style={{ marginTop: 2 }}>
                      <Phone size={15} color="#60a5fa" />
                    </View>
                    <Text style={{ flex: 1, fontSize: 12, lineHeight: 19.5, color: C.blue600 }}>
                      Enter your registered Bangladeshi mobile number. We'll send a 6-digit OTP via SMS.
                    </Text>
                  </View>

                  <TelField
                    ref={phone.ref}
                    shakeStyle={phone.shakeStyle}
                    label="Mobile Number"
                    defaultValue={data.current.phone}
                    onChangeText={set('phone')}
                    placeholder="01XXXXXXXXX"
                    returnKeyType="send"
                    onSubmitEditing={handleSendOtp}
                  />

                  <PrimaryBtn label="Send OTP" Icon={ArrowRight} loading={loader} onPress={handleSendOtp} />
                </View>
              )}

              {/* ─── Phone OTP: verify ─── */}
              {view === 'verify' && (
                <View style={{ gap: 20 }}>
                  <View>
                    <Text style={{ fontSize: 20, lineHeight: 28, fontWeight: '800', color: GRAY900 }}>Enter OTP</Text>
                    <Text style={[TS.xs, { color: C.gray400, marginTop: 2 }]}>
                      6-digit code sent to <Text style={{ fontWeight: '700', color: C.gray700 }}>+88 {phoneNumber}</Text>
                    </Text>
                  </View>

                  <Animated.View style={otpShakeStyle}>
                    <Label mb={12}>Verification Code</Label>
                    <OtpField key={otpKey} onChange={setOtpCode} disabled={otpExpired} autoFocus />
                  </Animated.View>

                  <OtpCountdown deadline={otpDeadline} total={otpTtl} onResend={handleResendOtp} resending={resending} />

                  <PrimaryBtn
                    label="Verify & Sign In"
                    Icon={ArrowRight}
                    loading={loader}
                    disabled={otpExpired || otpCode.length < 6}
                    onPress={handleVerifyOtp}
                  />

                  <Press
                    onPress={() => {
                      setOtpSent(false);
                      setOtpCode('');
                      setOtpDeadline(0);
                    }}
                    style={{ paddingVertical: 4, alignItems: 'center' }}
                  >
                    {({ pressed }) => (
                      <Text style={[TS.xs, { fontWeight: '500', color: pressed ? RED : C.gray400 }]}>← Change number</Text>
                    )}
                  </Press>
                </View>
              )}
            </Animated.View>
          </View>

          {/* Bottom trust row */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20, marginTop: 20 }}>
            <TrustItem Icon={Shield} text="SSL Secured" />
            <View style={{ width: 1, height: 12, backgroundColor: C.gray200 }} />
            <TrustItem Icon={BadgeCheck} text="Verified Platform" />
            <View style={{ width: 1, height: 12, backgroundColor: C.gray200 }} />
            <TrustItem Icon={Star} text="4.9 / 5.0 Rating" />
          </View>

          <Text style={[tpx(11), { textAlign: 'center', color: C.gray400, marginTop: 12 }]}>
            By continuing you agree to our{' '}
            <Text onPress={() => openStatic('Terms')} suppressHighlighting style={{ color: RED }}>
              Terms
            </Text>
            {' & '}
            <Text onPress={() => openStatic('PrivacyPolicy')} suppressHighlighting style={{ color: RED }}>
              Privacy Policy
            </Text>
          </Text>
        </View>
      </View>
    </AuthChrome>
  );
}
