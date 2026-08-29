import React from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft } from 'lucide-react-native';
import Button from '@/components/ui/Button';
import { HOW_TO_ORDER_STEPS } from '@/data/staticContent';
import colors from '@/theme/colors';

export default function HowToOrder() {
  const navigation = useNavigation();

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <View className="flex-row items-center gap-2 px-3 py-2.5 bg-white border-b border-gray-100">
        {navigation.canGoBack() && (
          <Pressable onPress={() => navigation.goBack()} hitSlop={8} className="p-1">
            <ArrowLeft size={22} color={colors.foreground} />
          </Pressable>
        )}
        <Text className="flex-1 text-md font-bold text-foreground">কীভাবে অর্ডার করবেন</Text>
      </View>

      <ScrollView contentContainerClassName="p-3 pb-10">
        {HOW_TO_ORDER_STEPS.map((s, i) => {
          const Icon = s.Icon || s.icon;
          const isLast = i === HOW_TO_ORDER_STEPS.length - 1;
          return (
            <View key={i} className="flex-row">
              <View className="items-center mr-3">
                <View className="w-9 h-9 rounded-full bg-primary items-center justify-center">
                  {Icon ? (
                    <Icon size={16} color="#ffffff" />
                  ) : (
                    <Text className="text-white font-extrabold text-smd">{i + 1}</Text>
                  )}
                </View>
                {!isLast && <View className="w-0.5 flex-1 bg-gray-200 my-1" />}
              </View>
              <View className={`flex-1 ${isLast ? '' : 'pb-5'}`}>
                <Text className="text-smd font-bold text-foreground">{s.title}</Text>
                {!!s.en && <Text className="text-2xs text-gray-400 mt-0.5">{s.en}</Text>}
                {!!s.desc && (
                  <Text className="text-smd text-gray-600 leading-relaxed mt-1.5">{s.desc}</Text>
                )}
              </View>
            </View>
          );
        })}

        <Button
          title="Start shopping"
          className="mt-6"
          onPress={() => navigation.navigate('HomeTab', { screen: 'Home' })}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
