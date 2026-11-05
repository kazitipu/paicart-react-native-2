import React, { useRef, useState } from 'react';
import { View, Text } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Shield, Eye, EyeOff, Lock, CheckCircle, KeyRound } from 'lucide-react-native';
import DashboardLayout from '@/components/DashboardLayout';
import { C, SHADOW, ORANGE, Press, Spinner } from '@/components/product/ui';
import { TS, tpx } from '@/components/cart/CartBits';
import { CARD, Field, Input, PAGE_GAP } from '@/components/profile/ProfileBits';
import { auth, EmailAuthProvider, reauthenticateWithCredential, updatePassword } from '@/lib/firebase';
import { toast } from '@/lib/toast';

/* ═══════════════════════════════════════════════════════════════════════
   Port of web src/app/pages/dashboard/user/security/page.jsx (< 640px):
   the ink "Account Security" hero, then the Change Password card with the
   live strength bar, rule checklist and match hint. Same flow: rules →
   match → re-authenticate with the current password → updatePassword.
   ═══════════════════════════════════════════════════════════════════════ */

const RULES = [
  { label: 'At least 6 characters', test: (v) => v.length >= 6 },
  { label: 'Contains a number', test: (v) => /\d/.test(v) },
  { label: 'Contains a letter', test: (v) => /[a-zA-Z]/.test(v) },
];

const INK = '#1C1C1C';
const BLUE200 = '#bfdbfe';
const AMBER300 = '#fcd34d';
const GREEN500 = '#22c55e';
const GREEN600 = '#16a34a';
const RED400 = '#f87171';
const RED500 = '#ef4444';
const AMBER400 = '#fbbf24';
const AMBER500 = '#f59e0b';

function PasswordInput({ inputRef, onChangeText, placeholder }) {
  const [show, setShow] = useState(false);
  return (
    <Input
      ref={inputRef}
      icon={Lock}
      padRight={40}
      secureTextEntry={!show}
      autoCapitalize="none"
      autoCorrect={false}
      onChangeText={onChangeText}
      placeholder={placeholder}
      right={
        <Press
          onPress={() => setShow((s) => !s)}
          hitSlop={10}
          accessibilityLabel={show ? 'Hide password' : 'Show password'}
          style={({ pressed }) => ({ position: 'absolute', right: 12, opacity: pressed ? 0.6 : 1 })}
        >
          {show ? <EyeOff size={15} color={C.gray400} /> : <Eye size={15} color={C.gray400} />}
        </Press>
      }
    />
  );
}

export default function UserSecurity() {
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const refs = { currentPassword: useRef(null), newPassword: useRef(null), confirmPassword: useRef(null) };

  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  const rulesPassed = RULES.map((r) => r.test(form.newPassword));
  const allRulesPassed = rulesPassed.every(Boolean);
  const passwordsMatch = !!form.newPassword && form.newPassword === form.confirmPassword;
  const strength = rulesPassed.filter(Boolean).length;
  const strengthLabel = ['Weak', 'Fair', 'Strong'][strength - 1] || '';
  const strengthColor = [RED400, AMBER400, GREEN500][strength - 1] || C.gray200;

  const handleSubmit = async () => {
    /* The web inputs are `required` — the browser stops the submit at the
       first empty one before any of the checks below run. */
    const empty = ['currentPassword', 'newPassword', 'confirmPassword'].find((k) => !form[k]);
    if (empty) {
      toast.error('Please fill out this field.');
      refs[empty].current?.focus();
      return;
    }
    if (!allRulesPassed) {
      toast.error('Password does not meet requirements');
      return;
    }
    if (!passwordsMatch) {
      toast.error("New passwords don't match");
      return;
    }
    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user?.email) {
        toast.error('Not authenticated');
        return;
      }
      const credential = EmailAuthProvider.credential(user.email, form.currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, form.newPassword);
      toast.success('Password updated successfully!');
      Object.values(refs).forEach((r) => r.current?.clear());
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      /* Current Firebase SDKs report a wrong password as invalid-credential. */
      const code = err?.code || '';
      const msg =
        code === 'auth/wrong-password' || code === 'auth/invalid-credential'
          ? 'Current password is incorrect'
          : err?.message;
      toast.error(msg || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout webChrome title="Security">
      <View style={{ gap: PAGE_GAP }}>
        {/* Hero */}
        <Animated.View
          entering={FadeIn.duration(250)}
          style={{ backgroundColor: INK, borderRadius: 16, padding: 24, boxShadow: SHADOW.base }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: 16,
                backgroundColor: 'rgba(255,255,255,0.1)',
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.2)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Shield size={26} color="#ffffff" />
            </View>
            <View style={{ flexShrink: 1 }}>
              <Text style={{ fontSize: 18, lineHeight: 22.5, fontWeight: '800', color: '#ffffff' }}>Account Security</Text>
              <Text style={[TS.xs, { color: BLUE200, marginTop: 2 }]}>Keep your account protected with a strong password</Text>
            </View>
          </View>
          <View style={{ marginTop: 16, flexDirection: 'row', gap: 12 }}>
            {[
              { k: 'Auth Method', v: 'Email / Password', c: '#ffffff' },
              { k: '2FA Status', v: 'Not Enabled', c: AMBER300 },
            ].map(({ k, v, c }) => (
              <View
                key={k}
                style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 }}
              >
                <Text style={[tpx(10), { color: BLUE200, fontWeight: '500' }]}>{k}</Text>
                <Text style={[TS.sm, { color: c, fontWeight: '700', marginTop: 2 }]}>{v}</Text>
              </View>
            ))}
          </View>
        </Animated.View>

        {/* Change password form */}
        <Animated.View entering={FadeIn.duration(250).delay(60)} style={CARD}>
          <View style={{ borderRadius: 15, overflow: 'hidden' }}>
            <View
              style={{
                paddingHorizontal: 20,
                paddingVertical: 16,
                borderBottomWidth: 1,
                borderBottomColor: C.gray100,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <View style={{ width: 32, height: 32, backgroundColor: ORANGE, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}>
                <KeyRound size={14} color="#ffffff" />
              </View>
              <View>
                <Text style={[TS.sm, { fontWeight: '700', color: C.gray800 }]}>Change Password</Text>
                <Text style={[tpx(11), { color: C.gray400 }]}>Use a unique, strong password</Text>
              </View>
            </View>

            <View style={{ padding: 20, gap: 16 }}>
              <Field label="Current Password">
                <PasswordInput
                  inputRef={refs.currentPassword}
                  onChangeText={set('currentPassword')}
                  placeholder="Enter current password"
                />
              </Field>

              <Field label="New Password">
                <PasswordInput inputRef={refs.newPassword} onChangeText={set('newPassword')} placeholder="Enter new password" />

                {/* Strength bar */}
                {!!form.newPassword && (
                  <Animated.View entering={FadeIn.duration(180)} style={{ marginTop: 8 }}>
                    <View style={{ flexDirection: 'row', gap: 4, marginBottom: 4 }}>
                      {[0, 1, 2].map((i) => (
                        <View
                          key={i}
                          style={{ height: 4, flex: 1, borderRadius: 999, backgroundColor: i < strength ? strengthColor : C.gray200 }}
                        />
                      ))}
                    </View>
                    {!!strengthLabel && (
                      <Text
                        style={[
                          tpx(10),
                          { fontWeight: '700', color: strength === 3 ? GREEN500 : strength === 2 ? AMBER500 : RED500 },
                        ]}
                      >
                        {strengthLabel}
                      </Text>
                    )}
                  </Animated.View>
                )}

                {/* Rules */}
                {!!form.newPassword && (
                  <Animated.View entering={FadeIn.duration(180)} style={{ marginTop: 8, gap: 4 }}>
                    {RULES.map((rule, i) => (
                      <View key={rule.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <CheckCircle size={11} color={rulesPassed[i] ? GREEN500 : C.gray300} />
                        <Text style={[tpx(11), { fontWeight: '500', color: rulesPassed[i] ? GREEN600 : C.gray400 }]}>
                          {rule.label}
                        </Text>
                      </View>
                    ))}
                  </Animated.View>
                )}
              </Field>

              <Field label="Confirm New Password">
                <PasswordInput
                  inputRef={refs.confirmPassword}
                  onChangeText={set('confirmPassword')}
                  placeholder="Repeat new password"
                />
                {!!form.confirmPassword && (
                  <View style={{ marginTop: 6, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <CheckCircle size={11} color={passwordsMatch ? GREEN600 : RED500} />
                    <Text style={[tpx(11), { fontWeight: '500', color: passwordsMatch ? GREEN600 : RED500 }]}>
                      {passwordsMatch ? 'Passwords match' : 'Passwords do not match'}
                    </Text>
                  </View>
                )}
              </Field>

              <Press
                onPress={handleSubmit}
                disabled={loading}
                style={({ pressed }) => ({
                  backgroundColor: pressed ? '#2a2a2a' : INK,
                  paddingVertical: 12,
                  borderRadius: 12,
                  boxShadow: SHADOW.md,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  opacity: loading ? 0.6 : 1,
                  transform: [{ scale: pressed ? 0.985 : 1 }],
                })}
              >
                {loading ? <Spinner size={15} color="#ffffff" /> : <Shield size={15} color="#ffffff" />}
                <Text style={[TS.sm, { fontWeight: '700', color: '#ffffff' }]}>{loading ? 'Updating…' : 'Update Password'}</Text>
              </Press>
            </View>
          </View>
        </Animated.View>
      </View>
    </DashboardLayout>
  );
}
