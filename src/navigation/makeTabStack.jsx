import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { screensForTab } from './routes';
import { SCREENS } from './screenRegistry';

/* Builds one native stack per tab from the route registry, so adding a screen
   is a one-line change in routes.js + screenRegistry.js rather than edits
   scattered across five navigator files.

   Lives in its own module (not RootNavigator) so TabNavigator can import it
   without a RootNavigator ⇄ TabNavigator require cycle. */
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
