import React, { useState } from 'react';
import { View, Text } from 'react-native';
import { Lock, ShieldCheck } from 'lucide-react-native';
import DashboardLayout from '@/components/DashboardLayout';
import Field from '@/components/ui/Field';
import Button from '@/components/ui/Button';
import { auth, EmailAuthProvider, reauthenticateWithCredential, updatePassword } from '@/lib/firebase';
import { toast } from '@/lib/toast';
import colors from '@/theme/colors';

export default function UserSecurity() {
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [saving, setSaving] = useState(false);

  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.currentPassword) {
      toast.error('Enter your current password.');
      return;
    }
    if (form.newPassword.length < 6) {
      toast.error('New password must be at least 6 characters.');
      return;
    }
    if (form.newPassword !== form.confirmPassword) {
      toast.error("Passwords don't match.");
      return;
    }

    const user = auth.currentUser;
    if (!user?.email) {
      /* Phone-OTP sessions are anonymous and carry no email, so there is no
         credential to re-authenticate with. */
      toast.error('Password change is only available for email accounts.');
      return;
    }

    setSaving(true);
    try {
      const credential = EmailAuthProvider.credential(user.email, form.currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, form.newPassword);
      toast.success('Password updated.');
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      const code = err?.code || '';
      toast.error(
        code.includes('wrong-password') || code.includes('invalid-credential')
          ? 'Your current password is incorrect.'
          : err.message || 'Could not update the password.',
      );
    }
    setSaving(false);
  };

  return (
    <DashboardLayout title="Security" contentClassName="px-4 pt-4">
      <View className="flex-row items-start gap-2 rounded-xl bg-primary-tint px-3 py-2.5 mb-5">
        <ShieldCheck size={16} color={colors.primary} />
        <Text className="flex-1 text-3xs text-foreground/70">
          You'll be asked for your current password to confirm it's you.
        </Text>
      </View>

      <View className="gap-4">
        <Field
          icon={Lock}
          label="Current Password"
          secure
          value={form.currentPassword}
          onChangeText={set('currentPassword')}
          placeholder="••••••••"
        />
        <Field
          icon={Lock}
          label="New Password"
          secure
          value={form.newPassword}
          onChangeText={set('newPassword')}
          placeholder="At least 6 characters"
        />
        <Field
          icon={Lock}
          label="Confirm New Password"
          secure
          value={form.confirmPassword}
          onChangeText={set('confirmPassword')}
          placeholder="••••••••"
        />
        <Button title="Update Password" loading={saving} onPress={submit} className="mt-2" />
      </View>
    </DashboardLayout>
  );
}
