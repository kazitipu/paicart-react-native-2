import React, { useRef, useState } from 'react';
import { View, Text, TextInput, Keyboard } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Mail, ArrowLeft } from 'lucide-react-native';
import { AuthChrome, useShake, useAuthKeyboard } from '@/components/auth/AuthBits';
import { C, SHADOW, Press, Spinner } from '@/components/product/ui';
import { TS, RED, BODY } from '@/components/cart/CartBits';
import { PLACEHOLDER } from '@/components/profile/ProfileBits';
import { auth, sendPasswordResetEmail } from '@/lib/firebase';
import { toast } from '@/lib/toast';

/* ═══════════════════════════════════════════════════════════════════════
   Port of web src/app/pages/forget-password/page.jsx (< 640px).

   Global Header, then `min-h-screen bg-[#f8fafc] flex items-center
   justify-center p-4` holding one `bg-white rounded-2xl shadow-xl max-w-md`
   card: a #1C1C1C header (Mail 40, "Forgot Password", blue-100 subline)
   over either the email form or the "Email Sent!" state.

   Backend: sendPasswordResetEmail(auth, email) — the web's call.
   ⚠️ RN: the web's react-spinners CircleLoader is drawn as the app's
   Loader2 spinner (same 20px, white).
   ═══════════════════════════════════════════════════════════════════════ */

const PAGE_BG = '#f8fafc';
const DARK = '#1C1C1C';
/* focus:ring-2 focus:ring-[#e62222] (the border stays gray-300) */
const FOCUS_RING = `0 0 0 2px ${RED}`;

const REQUIRED_MSG = 'Please fill out this field.';
const emailMessage = (v) => {
  if (!v.includes('@')) return `Please include an '@' in the email address. '${v}' is missing an '@'.`;
  const at = v.indexOf('@');
  if (at === 0) return `Please enter a part followed by '@'. '${v}' is incomplete.`;
  if (at === v.length - 1) return `Please enter a part following '@'. '${v}' is incomplete.`;
  return null;
};

/* `w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm
   focus:outline-none focus:ring-2 focus:ring-[#e62222]` — uncontrolled. */
function EmailInput({ inputRef, onChangeText, onSubmit, defaultValue }) {
  const kb = useAuthKeyboard();
  const [focused, setFocused] = useState(false);
  return (
    <View
      style={[
        { height: 42, borderWidth: 1, borderColor: C.gray300, borderRadius: 8, justifyContent: 'center', backgroundColor: '#ffffff' },
        focused && { boxShadow: FOCUS_RING },
      ]}
    >
      <TextInput
        ref={inputRef}
        defaultValue={defaultValue}
        onChangeText={onChangeText}
        placeholder="you@example.com"
        placeholderTextColor={PLACEHOLDER}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="emailAddress"
        returnKeyType="send"
        onSubmitEditing={onSubmit}
        onFocus={() => {
          setFocused(true);
          kb?.focus(inputRef);
        }}
        onBlur={() => {
          setFocused(false);
          kb?.blur(inputRef);
        }}
        style={{ height: 40, paddingVertical: 0, paddingHorizontal: 16, fontSize: 14, color: BODY, includeFontPadding: false }}
      />
    </View>
  );
}

export default function ForgotPassword() {
  const navigation = useNavigation();
  const emailRef = useRef('');
  const inputRef = useRef(null);
  const [sentTo, setSentTo] = useState('');
  const [sent, setSent] = useState(false);
  const [loader, setLoader] = useState(false);
  const [shakeStyle, shake] = useShake();

  /* <Link href="/pages/login">: back to the Login screen if that is what
     opened this one, else open it in place of this screen. */
  const toLogin = () => {
    Keyboard.dismiss();
    const st = navigation.getState();
    const prev = st?.routes?.[st.index - 1];
    if (prev?.name === 'Login') navigation.goBack();
    else navigation.replace('Login');
  };

  const handleSubmit = async () => {
    const email = emailRef.current.trim();
    const msg = !email ? REQUIRED_MSG : emailMessage(email);
    if (msg) {
      toast.error(msg);
      shake();
      inputRef.current?.focus();
      return;
    }
    if (loader) return;
    try {
      setLoader(true);
      await sendPasswordResetEmail(auth, email);
      setSentTo(email);
      setSent(true);
      Keyboard.dismiss();
      toast.success('Password reset email sent!');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoader(false);
    }
  };

  return (
    <AuthChrome bg={PAGE_BG}>
      <View style={{ padding: 16, alignItems: 'center' }}>
        <View
          style={{
            width: '100%',
            maxWidth: 448,
            backgroundColor: '#ffffff',
            borderRadius: 16,
            boxShadow: SHADOW.xl,
            overflow: 'hidden',
          }}
        >
          <View style={{ backgroundColor: DARK, padding: 24, alignItems: 'center' }}>
            <View style={{ marginBottom: 12 }}>
              <Mail size={40} color="#ffffff" />
            </View>
            <Text style={{ fontSize: 24, lineHeight: 32, fontWeight: '700', color: '#ffffff', textAlign: 'center' }}>
              Forgot Password
            </Text>
            <Text style={[TS.sm, { color: C.blue100, marginTop: 4, textAlign: 'center' }]}>
              Enter your email to receive a reset link
            </Text>
          </View>

          <View style={{ padding: 24 }}>
            {sent ? (
              <Animated.View entering={FadeIn.duration(220)} style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: 48, lineHeight: 48, marginBottom: 16 }}>✅</Text>
                <Text style={{ fontSize: 18, lineHeight: 28, fontWeight: '600', color: C.gray800, marginBottom: 8 }}>
                  Email Sent!
                </Text>
                <Text style={[TS.sm, { color: C.gray500, marginBottom: 24, textAlign: 'center' }]}>
                  We've sent a password reset link to <Text style={{ fontWeight: '700' }}>{sentTo}</Text>. Check your inbox.
                </Text>
                <Press onPress={toLogin} hitSlop={8}>
                  {({ pressed }) => (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <ArrowLeft size={16} color={RED} />
                      <Text style={[TS.base, { color: RED, textDecorationLine: pressed ? 'underline' : 'none' }]}>
                        Back to Login
                      </Text>
                    </View>
                  )}
                </Press>
              </Animated.View>
            ) : (
              <View style={{ gap: 16 }}>
                <Animated.View style={shakeStyle}>
                  <Text style={[TS.sm, { fontWeight: '500', color: C.gray700, marginBottom: 4 }]}>Email Address</Text>
                  <EmailInput
                    inputRef={inputRef}
                    defaultValue={emailRef.current}
                    onChangeText={(v) => {
                      emailRef.current = v;
                    }}
                    onSubmit={handleSubmit}
                  />
                </Animated.View>

                {/* `w-full bg-[#e62222] hover:bg-[#cc1a1a] text-white py-3
                    rounded-lg font-medium` */}
                <Press
                  onPress={handleSubmit}
                  disabled={loader}
                  accessibilityRole="button"
                  style={({ pressed }) => ({
                    height: 48,
                    borderRadius: 8,
                    backgroundColor: pressed ? '#cc1a1a' : RED,
                    alignItems: 'center',
                    justifyContent: 'center',
                    transform: [{ scale: pressed ? 0.985 : 1 }],
                  })}
                >
                  {loader ? (
                    <Spinner size={20} color="#ffffff" />
                  ) : (
                    <Text style={[TS.base, { fontWeight: '500', color: '#ffffff' }]}>Send Reset Link</Text>
                  )}
                </Press>

                <Press onPress={toLogin} hitSlop={6} style={{ alignSelf: 'center' }}>
                  {({ pressed }) => (
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                      <ArrowLeft size={14} color={RED} />
                      <Text style={[TS.sm, { color: RED, textDecorationLine: pressed ? 'underline' : 'none' }]}>
                        Back to Login
                      </Text>
                    </View>
                  )}
                </Press>
              </View>
            )}
          </View>
        </View>
      </View>
    </AuthChrome>
  );
}
