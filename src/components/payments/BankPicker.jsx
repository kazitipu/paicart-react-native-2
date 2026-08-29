import React from 'react';
import { View, Text, Image, Pressable } from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { Check, Copy } from 'lucide-react-native';
import { BANK_ACCOUNTS } from '@/lib/payments';
import { toast } from '@/lib/toast';
import colors from '@/theme/colors';

/* Bank / bKash destination picker for manual deposits. The account number gets
   its own copy button — on the web people selected the text; on a phone that
   is fiddly and mistyping an account number loses a payment. */
export default function BankPicker({ value, onChange }) {
  return (
    <View>
      {BANK_ACCOUNTS.map((b) => {
        const selected = value === b.key;
        return (
          <Pressable
            key={b.key}
            onPress={() => onChange(b.key)}
            className="flex-row items-center gap-3 p-3 rounded-2xl border-2 mb-2"
            style={
              selected
                ? { borderColor: colors.tealDeep, backgroundColor: '#f0fdfa' }
                : { borderColor: '#e2e8f0', backgroundColor: '#f8fafc' }
            }
          >
            <View className="w-12 h-12 rounded-xl overflow-hidden bg-white border border-gray-100 items-center justify-center p-1">
              <Image source={b.logo} className="w-full h-full" resizeMode="contain" />
            </View>
            <View className="flex-1">
              <Text className="text-tiny font-extrabold text-gray-800">{b.name}</Text>
              <Text className="text-xxs text-gray-500">{b.acName}</Text>
              <View className="flex-row items-center gap-1.5">
                <Text className="text-3xs font-bold text-gray-700">{b.acNo}</Text>
                <Pressable
                  hitSlop={8}
                  onPress={() => {
                    Clipboard.setString(b.acNo);
                    toast.success('Account number copied');
                  }}
                >
                  <Copy size={11} color={colors.muted} />
                </Pressable>
              </View>
              <Text className="text-xxs text-gray-400">
                {b.routing}
                {b.branch ? ` · ${b.branch}` : ''}
              </Text>
            </View>
            <View
              className="w-5 h-5 rounded-full border-2 items-center justify-center"
              style={
                selected
                  ? { borderColor: colors.teal, backgroundColor: colors.teal }
                  : { borderColor: '#d1d5db' }
              }
            >
              {selected && <Check size={10} color="#ffffff" strokeWidth={3} />}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}
