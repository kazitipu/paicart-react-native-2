import React from 'react';
import { View, Text, Pressable, ScrollView, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft } from 'lucide-react-native';
import { ABOUT_STATS, PROHIBITED } from '@/data/staticContent';
import colors from '@/theme/colors';

const LOGO = require('@/assets/paicart_transparent.png');

export default function AboutUs() {
  const navigation = useNavigation();
  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <View className="flex-row items-center gap-2 px-3 py-2.5 bg-white border-b border-gray-100">
        {navigation.canGoBack() && (
          <Pressable onPress={() => navigation.goBack()} hitSlop={8} className="p-1">
            <ArrowLeft size={22} color={colors.foreground} />
          </Pressable>
        )}
        <Text className="flex-1 text-md font-bold text-foreground">About Us</Text>
      </View>

      <ScrollView contentContainerClassName="p-3 pb-10">
        <View className="bg-white rounded-2xl border border-gray-100 p-5 items-center">
          <Image source={LOGO} className="w-36 h-12" resizeMode="contain" />
          <Text className="text-smd text-gray-600 leading-relaxed text-center mt-3">
            Paicart is a cross-border marketplace bringing products from Taobao, 1688 and other
            Chinese suppliers to Bangladesh — with our own China warehouse, air and sea freight,
            and door-to-door delivery.
          </Text>
        </View>

        <View className="flex-row flex-wrap mt-3">
          {ABOUT_STATS.map((s, i) => (
            <View key={i} className="w-1/2 p-1.5">
              <View className="bg-white rounded-xl border border-gray-100 p-3 items-center">
                <Text className="text-lg font-extrabold text-primary">{s.value || s.number}</Text>
                <Text className="text-2xs text-gray-500 text-center mt-1">
                  {s.label || s.title}
                </Text>
              </View>
            </View>
          ))}
        </View>

        <View className="bg-white rounded-2xl border border-gray-100 p-4 mt-3">
          <Text className="text-smd font-bold text-foreground mb-2">
            আমদানি নিষিদ্ধ পণ্য
          </Text>
          <Text className="text-2xs text-gray-500 mb-3">
            বাংলাদেশ কাস্টমসের নিয়ম অনুযায়ী নিচের পণ্যগুলো অর্ডার করা যাবে না।
          </Text>
          <View className="flex-row flex-wrap gap-1.5">
            {PROHIBITED.map((p) => (
              <View key={p} className="bg-red-50 border border-red-100 rounded-full px-2.5 py-1">
                <Text className="text-2xs text-brand">{p}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
