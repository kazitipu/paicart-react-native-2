import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, Image, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import Axios from 'axios';
import { Mail, Lock, User, Phone, ArrowLeft } from 'lucide-react-native';
import Field from '@/components/ui/Field';
import Button from '@/components/ui/Button';
import PhoneInput from '@/components/PhoneInput';
import OtpBoxes from '@/components/ui/OtpBoxes';
import { toast } from '@/lib/toast';
import {
  auth, signInWithGoogle, signInWithEmailAndPassword,
  createUserWithEmailAndPassword, sendPasswordResetEmail,
} from '@/lib/firebase';
import { createUserProfileDocument, sendOtp } from '@/lib/firebaseUtils';
import { sendOtpRedux, verifyOtpRedux } from '@/store/actions';
import colors from '@/theme/colors';

const LOGO = require('@/assets/paicart_transparent.png');

const OTP_SMS_URL = 'https://paicart.com/api/v1/otp-sms-send';

const TABS = [
  { key: 'login', label: 'Sign In' },
  { key: 'register', label: 'Register' },
  { key: 'otp', label: 'Phone' },
];

export default function Login() {
  const navigation = useNavigation();
  const route = useRoute();
  const dispatch = useDispatch();

  /* `returnTo` was a ?returnTo= search param on the web. As a navigation param
     it carries a screen name rather than a URL. */
  const returnTo = route.params?.returnTo;
  const [tab, setTab] = useState(route.params?.tab || 'login');
  const [loader, setLoader] = useState(false);

  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [registerData, setRegisterData] = useState({
    displayName: '', email: '', mobileNo: '', password: '', confirmPassword: '',
  });
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');

  const done = (message) => {
    toast.success(message);
    if (returnTo) navigation.replace(returnTo);
    else if (navigation.canGoBack()) navigation.goBack();
    else navigation.replace('Tabs');
  };

  const handleLogin = async () => {
    if (loader) return;
    setLoader(true);
    try {
      await signInWithEmailAndPassword(auth, loginData.email.trim(), loginData.password);
      done('Logged in successfully!');
    } catch (err) {
      toast.error(err.message);
    }
    setLoader(false);
  };

  const handleRegister = async () => {
    if (registerData.password !== registerData.confirmPassword) {
      toast.error("Passwords don't match");
      return;
    }
    if (loader) return;
    setLoader(true);
    try {
      const { user } = await createUserWithEmailAndPassword(
        auth,
        registerData.email.trim(),
        registerData.password,
      );
      await createUserProfileDocument(user, {
        displayName: registerData.displayName,
        mobileNo: registerData.mobileNo,
      });
      done('Account created!');
    } catch (err) {
      toast.error(err.message);
    }
    setLoader(false);
  };

  const handleGoogle = async () => {
    if (loader) return;
    setLoader(true);
    try {
      const result = await signInWithGoogle();
      /* null means the user dismissed the Google sheet — not an error, and it
         must not toast or navigate. */
      if (result) done('Signed in with Google!');
    } catch (err) {
      toast.error(err.message || 'Google sign-in failed.');
    }
    setLoader(false);
  };

  const handleSendOtp = async () => {
    if (!phoneNumber.trim() || loader) return;
    setLoader(true);
    try {
      const res = await Axios.get(`${OTP_SMS_URL}/${phoneNumber}`);
      if (res.data?.otp) {
        await sendOtp(phoneNumber, res.data.otp);
        dispatch(sendOtpRedux(phoneNumber));
        setOtpSent(true);
        toast.success('OTP sent!');
      } else {
        toast.error('Failed to send OTP.');
      }
    } catch {
      toast.error('Failed to send OTP.');
    }
    setLoader(false);
  };

  const handleVerifyOtp = async () => {
    if (!otpCode.trim() || loader) return;
    setLoader(true);
    try {
      /* ⚠️ The web dispatched this WITHOUT awaiting, then toasted "OTP
         verified!" and navigated regardless — so a wrong code still let people
         through. verifyOtpRedux now resolves false on a bad or expired code. */
      const ok = await dispatch(verifyOtpRedux(phoneNumber, otpCode));
      if (ok) done('OTP verified!');
      /* verifyOtp has already toasted the specific reason. */
    } catch {
      toast.error('Invalid OTP.');
    }
    setLoader(false);
  };

  const forgot = async () => {
    const email = loginData.email.trim();
    if (!email) {
      toast.error('Enter your email first, then tap Forgot password.');
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      toast.success('Reset link sent!');
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-white">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView contentContainerClassName="px-5 pb-10" keyboardShouldPersistTaps="handled">
          <View className="flex-row items-center py-2">
            {navigation.canGoBack() && (
              <Pressable onPress={() => navigation.goBack()} hitSlop={8} className="p-1">
                <ArrowLeft size={22} color={colors.foreground} />
              </Pressable>
            )}
          </View>

          <View className="items-center py-4">
            <Image source={LOGO} className="w-36 h-12" resizeMode="contain" />
            <Text className="text-smd text-gray-500 mt-2">Buy & Ship from China</Text>
          </View>

          {/* Tabs */}
          <View className="flex-row bg-gray-100 rounded-xl p-1 mb-6">
            {TABS.map((t) => {
              const active = tab === t.key;
              return (
                <Pressable
                  key={t.key}
                  onPress={() => setTab(t.key)}
                  className={`flex-1 rounded-lg py-2.5 items-center ${active ? 'bg-white' : ''}`}
                >
                  <Text className={`text-smd font-bold ${active ? 'text-brand' : 'text-gray-500'}`}>
                    {t.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {tab === 'login' && (
            <View className="gap-4">
              <Field
                icon={Mail}
                label="Email"
                value={loginData.email}
                onChangeText={(email) => setLoginData((d) => ({ ...d, email }))}
                placeholder="you@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />
              <Field
                icon={Lock}
                label="Password"
                secure
                value={loginData.password}
                onChangeText={(password) => setLoginData((d) => ({ ...d, password }))}
                placeholder="••••••••"
                autoComplete="password"
              />
              <Pressable onPress={forgot} className="self-end">
                <Text className="text-tiny text-brand font-semibold">Forgot password?</Text>
              </Pressable>
              <Button title="Sign In" variant="brand" loading={loader} onPress={handleLogin} />
            </View>
          )}

          {tab === 'register' && (
            <View className="gap-4">
              <Field
                icon={User}
                label="Full Name"
                value={registerData.displayName}
                onChangeText={(displayName) => setRegisterData((d) => ({ ...d, displayName }))}
                placeholder="Your name"
              />
              <Field
                icon={Mail}
                label="Email"
                value={registerData.email}
                onChangeText={(email) => setRegisterData((d) => ({ ...d, email }))}
                placeholder="you@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <View>
                <Text className="text-2xs font-semibold text-gray-500 uppercase tracking-widest mb-1.5">
                  Mobile Number
                </Text>
                <PhoneInput
                  value={registerData.mobileNo}
                  onChangeText={(mobileNo) => setRegisterData((d) => ({ ...d, mobileNo }))}
                  placeholder="1XXXXXXXXX"
                />
              </View>
              <Field
                icon={Lock}
                label="Password"
                secure
                value={registerData.password}
                onChangeText={(password) => setRegisterData((d) => ({ ...d, password }))}
                placeholder="••••••••"
              />
              <Field
                icon={Lock}
                label="Confirm Password"
                secure
                value={registerData.confirmPassword}
                onChangeText={(confirmPassword) =>
                  setRegisterData((d) => ({ ...d, confirmPassword }))
                }
                placeholder="••••••••"
              />
              <Button title="Create Account" variant="brand" loading={loader} onPress={handleRegister} />
            </View>
          )}

          {tab === 'otp' && (
            <View className="gap-4">
              {!otpSent ? (
                <>
                  <View>
                    <Text className="text-2xs font-semibold text-gray-500 uppercase tracking-widest mb-1.5">
                      Mobile Number
                    </Text>
                    <PhoneInput
                      value={phoneNumber}
                      onChangeText={setPhoneNumber}
                      placeholder="1XXXXXXXXX"
                    />
                  </View>
                  <Button title="Send OTP" variant="brand" loading={loader} onPress={handleSendOtp} />
                </>
              ) : (
                <>
                  <Text className="text-smd text-gray-600 text-center">
                    Enter the 6-digit code sent to{'\n'}
                    <Text className="font-bold text-foreground">+88{phoneNumber}</Text>
                  </Text>
                  <OtpBoxes value={otpCode} onChange={setOtpCode} />
                  <Button title="Verify & Continue" variant="brand" loading={loader} onPress={handleVerifyOtp} />
                  <Pressable
                    onPress={() => {
                      setOtpSent(false);
                      setOtpCode('');
                    }}
                    className="items-center py-2"
                  >
                    <Text className="text-tiny text-gray-500 font-semibold">Change number</Text>
                  </Pressable>
                </>
              )}
            </View>
          )}

          {tab !== 'otp' && (
            <>
              <View className="flex-row items-center my-6">
                <View className="flex-1 h-px bg-gray-200" />
                <Text className="text-2xs text-gray-400 px-3 uppercase tracking-widest">or</Text>
                <View className="flex-1 h-px bg-gray-200" />
              </View>
              <Button
                title="Continue with Google"
                variant="outline"
                loading={loader}
                onPress={handleGoogle}
              />
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
