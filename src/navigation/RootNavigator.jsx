import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ROUTES, ROOT_SCREENS } from './routes';
import { SCREENS } from './screenRegistry';
import TabNavigator from './TabNavigator';
import BkashCheckout from '@/screens/services/BkashCheckout';

const RootStack = createNativeStackNavigator();

export default function RootNavigator() {
  return (
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
      <RootStack.Screen name="Tabs" component={TabNavigator} />
      {/* Auth and the payment return live above the tabs so they can cover the
          tab bar entirely. */}
      {ROOT_SCREENS.map((name) => (
        <RootStack.Screen
          key={name}
          name={name}
          component={SCREENS[name]}
          options={{
            presentation: ROUTES[name].path === 'payment-return' ? 'transparentModal' : 'card',
          }}
        />
      ))}
      {/* In-app bKash checkout. Deliberately not in ROUTES: no deep link may
          open a payment page — only lib/payments.openBkashGateway does. */}
      <RootStack.Screen
        name="BkashCheckout"
        component={BkashCheckout}
        options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom', gestureEnabled: false }}
      />
    </RootStack.Navigator>
  );
}
