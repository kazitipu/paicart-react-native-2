import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, ChevronDown } from 'lucide-react-native';
import { FAQS, PROHIBITED } from '@/data/staticContent';
import colors from '@/theme/colors';

export default function Faq() {
  const navigation = useNavigation();
  const [open, setOpen] = useState(null);

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <View className="flex-row items-center gap-2 px-3 py-2.5 bg-white border-b border-gray-100">
        {navigation.canGoBack() && (
          <Pressable onPress={() => navigation.goBack()} hitSlop={8} className="p-1">
            <ArrowLeft size={22} color={colors.foreground} />
          </Pressable>
        )}
        <Text className="flex-1 text-md font-bold text-foreground">সাধারণ জিজ্ঞাসা</Text>
      </View>

      <ScrollView contentContainerClassName="p-3 pb-10">
        <View className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          {FAQS.map((f, i) => (
            <View key={i} className="border-b border-gray-50">
              <Pressable
                onPress={() => setOpen(open === i ? null : i)}
                className="flex-row items-start gap-2 px-4 py-3.5"
              >
                <Text className="flex-1 text-smd font-semibold text-foreground">{f.q}</Text>
                <View
                  style={{ transform: [{ rotate: open === i ? '180deg' : '0deg' }], marginTop: 2 }}
                >
                  <ChevronDown size={15} color={colors.muted} />
                </View>
              </Pressable>
              {open === i && (
                <View className="px-4 pb-4">
                  <Text className="text-smd text-gray-600 leading-relaxed">{f.a}</Text>
                  {f.prohibited && (
                    <View className="flex-row flex-wrap gap-1.5 mt-3">
                      {PROHIBITED.map((p) => (
                        <View
                          key={p}
                          className="bg-red-50 border border-red-100 rounded-full px-2.5 py-1"
                        >
                          <Text className="text-2xs text-brand">{p}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              )}
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
