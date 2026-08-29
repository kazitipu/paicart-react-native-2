import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { CheckCircle2 } from 'lucide-react-native';
import Button from '@/components/ui/Button';
import CopyIdButton from '@/components/CopyIdButton';
import colors from '@/theme/colors';

export default function PlaceOrderSuccess() {
  const navigation = useNavigation();
  const orderId = useSelector((s) => s.orders?.ordersApi?.[0]?.orderId);

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background items-center justify-center px-8">
      <CheckCircle2 size={56} color={colors.success} />
      <Text className="text-lg font-extrabold text-foreground mt-4">Order placed</Text>
      {!!orderId && (
        <View className="flex-row items-center gap-1.5 mt-2">
          <Text className="text-smd text-gray-500">Order #{orderId}</Text>
          <CopyIdButton value={orderId} size={13} />
        </View>
      )}
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
