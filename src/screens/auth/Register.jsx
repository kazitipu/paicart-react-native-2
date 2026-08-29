import React, { useEffect } from 'react';
import { View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';

/* /pages/register was a redirect stub on the web (router.replace to the login
   page). Kept as a route so old links resolve, but it opens the combined auth
   screen on its Register tab rather than dropping people on Sign In. */
export default function Register() {
  const navigation = useNavigation();
  const route = useRoute();

  useEffect(() => {
    navigation.replace('Login', { ...route.params, tab: 'register' });
  }, [navigation, route.params]);

  return <View className="flex-1 bg-white" />;
}
