import React, { useState } from 'react';
import { View, Text, Pressable, Modal, ScrollView } from 'react-native';
import { ChevronDown, Check } from 'lucide-react-native';
import colors from '@/theme/colors';

/* A native <select> on the web. React Native has no equivalent element, and a
   picker wheel handles long option lists badly on Android, so this is a sheet
   of rows. `options` is [{ value, label }] or plain strings. */
export default function Select({ label, value, options = [], onChange, placeholder = 'Select…' }) {
  const [open, setOpen] = useState(false);
  const norm = options.map((o) => (typeof o === 'string' ? { value: o, label: o } : o));
  const current = norm.find((o) => o.value === value);

  return (
    <View>
      {!!label && (
        <Text className="text-2xs font-semibold text-gray-500 uppercase tracking-widest mb-1.5">
          {label}
        </Text>
      )}
      <Pressable
        onPress={() => setOpen(true)}
        className="flex-row items-center h-12 bg-gray-50 border-2 border-gray-200 rounded-xl px-4"
      >
        <Text className={`flex-1 text-smd ${current ? 'text-foreground' : 'text-gray-400'}`}>
          {current?.label || placeholder}
        </Text>
        <ChevronDown size={15} color={colors.muted} />
      </Pressable>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable className="flex-1 bg-black/50" onPress={() => setOpen(false)} />
        <View className="bg-white rounded-t-2xl max-h-[70%] pb-6">
          <View className="items-center pt-2 pb-1">
            <View className="w-10 h-1 rounded-full bg-gray-300" />
          </View>
          {!!label && (
            <Text className="text-md font-bold text-foreground px-4 py-2">{label}</Text>
          )}
          <ScrollView>
            {norm.map((o) => (
              <Pressable
                key={String(o.value)}
                onPress={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
                className="flex-row items-center px-4 py-3.5 border-t border-gray-50"
              >
                <Text
                  className={`flex-1 text-smd ${o.value === value ? 'text-primary font-bold' : 'text-foreground'}`}
                >
                  {o.label}
                </Text>
                {o.value === value && <Check size={16} color={colors.primary} />}
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}
