import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import colors from '@/theme/colors';

/* /dashboard/pages/orders/:orderId was a thinner duplicate of the order
   detail screen. Forwarded so old links resolve without a second copy. */
export default function LegacyOrderDetail() {
  const navigation = useNavigation();
  const route = useRoute();
  useEffect(() => {
    navigation.replace('OrderSuccessDetail', { id: route.params?.orderId });
  }, [navigation, route.params]);
  return (
    <View className="flex-1 items-center justify-center bg-background">
      <ActivityIndicator color={colors.primary} />
    </View>
  );
}
