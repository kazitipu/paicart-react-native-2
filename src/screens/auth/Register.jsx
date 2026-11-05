import React, { useEffect } from 'react';
import { View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';

/* /pages/register was a redirect stub on the web (router.replace to the login
   page). Kept as a route so old links resolve, but it opens the combined auth
   screen on its Register tab rather than dropping people on Sign In. When a
   Login screen is already right underneath (e.g. the Header's "Register" menu
   item tapped on the login screen) it switches that one's tab instead of
   stacking a second Login. */
export default function Register() {
  const navigation = useNavigation();
  const route = useRoute();

  useEffect(() => {
    const st = navigation.getState();
    const prev = st?.routes?.[st.index - 1];
    if (prev?.name === 'Login') navigation.popTo('Login', { ...prev.params, tab: 'register' });
    else navigation.replace('Login', { ...route.params, tab: 'register' });
  }, [navigation, route.params]);

  return <View style={{ flex: 1, backgroundColor: '#f9fafb' }} />;
}
