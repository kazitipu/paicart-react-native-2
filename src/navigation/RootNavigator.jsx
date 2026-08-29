import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ROUTES, ROOT_SCREENS, screensForTab, TABS } from './routes';
import { SCREENS } from './screenRegistry';
import TabNavigator from './TabNavigator';

const RootStack = createNativeStackNavigator();

/* Builds one native stack per tab from the route registry, so adding a screen
   is a one-line change in routes.js + screenRegistry.js rather than edits
   scattered across five navigator files. */
export function makeTabStack(tab, initialRouteName) {
  const Stack = createNativeStackNavigator();
  const names = screensForTab(tab);
  return function TabStack() {
    return (
      <Stack.Navigator
        initialRouteName={initialRouteName}
        screenOptions={{ headerShown: false }}
      >
        {names.map((name) => (
          <Stack.Screen key={name} name={name} component={SCREENS[name]} />
        ))}
      </Stack.Navigator>
    );
  };
}

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
    </RootStack.Navigator>
  );
}
