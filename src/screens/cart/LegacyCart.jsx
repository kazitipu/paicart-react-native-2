import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import colors from '@/theme/colors';

/* /dashboard/pages/cart was a 78-line simplified duplicate of the main cart.
   Forwarded rather than ported as a second list that can drift. */
export default function LegacyCart() {
  const navigation = useNavigation();
  useEffect(() => {
    navigation.replace('Cart');
  }, [navigation]);
  return (
    <View className="flex-1 items-center justify-center bg-background">
      <ActivityIndicator color={colors.primary} />
    </View>
  );
}
