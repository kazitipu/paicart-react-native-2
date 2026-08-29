import React, { useEffect } from 'react';
import { useNavigation, useRoute } from '@react-navigation/native';
import { View, ActivityIndicator } from 'react-native';
import colors from '@/theme/colors';

/* The web kept a second, older 1688 detail page at /1688/[id] alongside
 * /product/[id]. They render the same upstream product from the same
 * endpoints; the older one simply has fewer features (no shipping-rate
 * calculator, no media downloads, no size/weight table).
 *
 * Maintaining two divergent copies of the most complex screen in the app is
 * how they drifted apart in the first place. The route is kept so existing
 * /1688/... links resolve, and it forwards to the full screen. */
export default function Product1688() {
  const navigation = useNavigation();
  const route = useRoute();

  useEffect(() => {
    navigation.replace('Product', route.params);
  }, [navigation, route.params]);

  return (
    <View className="flex-1 items-center justify-center bg-background">
      <ActivityIndicator color={colors.primary} />
    </View>
  );
}
