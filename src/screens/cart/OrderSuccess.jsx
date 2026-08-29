import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { CheckCircle2 } from 'lucide-react-native';
import Button from '@/components/ui/Button';
import colors from '@/theme/colors';

export default function OrderSuccess() {
  const navigation = useNavigation();
  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background items-center justify-center px-8">
      <CheckCircle2 size={56} color={colors.success} />
      <Text className="text-lg font-extrabold text-foreground mt-4">Order placed</Text>
      <Text className="text-smd text-gray-500 text-center mt-2">
        Thank you — we'll confirm your order shortly.
      </Text>
      <Button
        title="View my orders"
        className="mt-6 self-stretch"
        onPress={() => navigation.navigate('OrdersTab', { screen: 'BuyShipMyOrders' })}
      />
      <Pressable onPress={() => navigation.navigate('HomeTab', { screen: 'Home' })} className="py-3">
        <Text className="text-smd text-gray-500 font-semibold">Continue shopping</Text>
      </Pressable>
    </SafeAreaView>
  );
}
