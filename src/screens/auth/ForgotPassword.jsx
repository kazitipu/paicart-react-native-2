import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Mail, ArrowLeft, CheckCircle2 } from 'lucide-react-native';
import Field from '@/components/ui/Field';
import Button from '@/components/ui/Button';
import { auth, sendPasswordResetEmail } from '@/lib/firebase';
import { toast } from '@/lib/toast';
import colors from '@/theme/colors';

export default function ForgotPassword() {
  const navigation = useNavigation();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!email.trim()) {
      toast.error('Please enter your email.');
      return;
    }
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setSent(true);
    } catch (err) {
      toast.error(err.message);
    }
    setLoading(false);
  };

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-white">
      <ScrollView contentContainerClassName="px-5 pb-10" keyboardShouldPersistTaps="handled">
        <View className="flex-row items-center py-2">
          {navigation.canGoBack() && (
            <Pressable onPress={() => navigation.goBack()} hitSlop={8} className="p-1">
              <ArrowLeft size={22} color={colors.foreground} />
            </Pressable>
          )}
        </View>

        {sent ? (
          <View className="items-center pt-16">
            <CheckCircle2 size={48} color={colors.success} />
            <Text className="text-lg font-bold text-foreground mt-4">Check your email</Text>
            <Text className="text-smd text-gray-500 text-center mt-2">
              We sent a password reset link to{'\n'}
              <Text className="font-semibold text-foreground">{email}</Text>
            </Text>
            <Button
              title="Back to Sign In"
              variant="brand"
              className="mt-6 self-stretch"
              onPress={() => navigation.replace('Login')}
            />
          </View>
        ) : (
          <View className="pt-8 gap-4">
            <Text className="text-lg font-bold text-foreground">Reset your password</Text>
            <Text className="text-smd text-gray-500">
              Enter the email on your account and we'll send you a reset link.
            </Text>
            <Field
              icon={Mail}
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <Button title="Send Reset Link" variant="brand" loading={loading} onPress={submit} />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
