import React, { useState } from 'react';
import { View, Text, TextInput, Pressable } from 'react-native';
import { AlertCircle } from 'lucide-react-native';
import Sheet from '@/components/ui/Sheet';
import Button from '@/components/ui/Button';
import { submitComplaint } from '@/lib/firebaseUtils';
import { toast } from '@/lib/toast';
import colors from '@/theme/colors';

const SUBJECTS = [
  'Order Issue',
  'Payment Issue',
  'Shipping Delay',
  'Damaged / Wrong Product',
  'Refund Issue',
  'Customer Service',
  'Other',
];

export default function ComplaintModal({ visible, currentUser, onClose }) {
  const [subject, setSubject] = useState(SUBJECTS[0]);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!message.trim()) {
      toast.error('Please describe the issue.');
      return;
    }
    setSubmitting(true);
    try {
      await submitComplaint({
        subject,
        message: message.trim(),
        userId: currentUser?.id,
        displayName: currentUser?.displayName || '',
        email: currentUser?.email || '',
        phone: currentUser?.mobileNo || '',
      });
      toast.success('Complaint submitted. We will get back to you.');
      setMessage('');
      onClose?.();
    } catch {
      toast.error('Could not submit. Please try again.');
    }
    setSubmitting(false);
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Report an Issue"
      subtitle="We usually reply within a few hours"
      headerColor={colors.brand}
      footer={
        <Button title="Submit Complaint" variant="brand" loading={submitting} onPress={submit} />
      }
    >
      <View className="flex-row items-start gap-2 rounded-xl bg-amber-soft px-3 py-2.5 mb-4">
        <AlertCircle size={15} color="#8a5a06" />
        <Text className="flex-1 text-3xs text-amber-900">
          Include your order or booking ID so we can find it quickly.
        </Text>
      </View>

      <Text className="text-3xs font-extrabold text-gray-500 uppercase tracking-widest mb-2">
        Subject
      </Text>
      {/* A native <select> on the web. A chip row reads better on a phone than
          a picker wheel for seven short options. */}
      <View className="flex-row flex-wrap gap-2 mb-4">
        {SUBJECTS.map((s) => {
          const active = s === subject;
          return (
            <Pressable
              key={s}
              onPress={() => setSubject(s)}
              className={`rounded-full px-3 py-1.5 border ${active ? 'bg-brand border-brand' : 'bg-white border-gray-200'}`}
            >
              <Text className={`text-3xs font-semibold ${active ? 'text-white' : 'text-gray-600'}`}>
                {s}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text className="text-3xs font-extrabold text-gray-500 uppercase tracking-widest mb-2">
        Message
      </Text>
      <TextInput
        value={message}
        onChangeText={setMessage}
        multiline
        numberOfLines={5}
        textAlignVertical="top"
        placeholder="Tell us what went wrong…"
        placeholderTextColor="#9ca3af"
        className="border border-gray-300 rounded-xl px-3 py-2.5 text-smd text-foreground min-h-[110px]"
      />
    </Sheet>
  );
}
