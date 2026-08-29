import './global.css';
import 'react-native-gesture-handler';
import React from 'react';
import { StatusBar } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import Providers from '@/components/Providers';
import { configureGoogleSignin } from '@/lib/firebase';
import RootNavigator from '@/navigation/RootNavigator';
import linking from '@/navigation/linking';
import ToastProvider from '@/components/ToastProvider';
import FloatingWhatsApp from '@/components/FloatingWhatsApp';
import FlyToIconAnimation from '@/components/FlyToIconAnimation';
import colors from '@/theme/colors';

/* Must run before any sign-in attempt. Module scope rather than an effect so
   it cannot race a user tapping "Continue with Google" on first paint. */
configureGoogleSignin();

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <Providers>
          <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
          <NavigationContainer
            linking={linking}
            theme={{
              dark: false,
              colors: {
                primary: colors.primary,
                background: colors.background,
                card: '#ffffff',
                text: colors.foreground,
                border: colors.border,
                notification: colors.brand,
              },
              fonts: {
                regular: { fontFamily: 'System', fontWeight: '400' },
                medium: { fontFamily: 'System', fontWeight: '500' },
                bold: { fontFamily: 'System', fontWeight: '700' },
                heavy: { fontFamily: 'System', fontWeight: '900' },
              },
            }}
          >
            <RootNavigator />
          </NavigationContainer>
          {/* Mounted above the navigator so they overlay every screen — the
              web mounted the same three in its root layout. */}
          <FlyToIconAnimation />
          <FloatingWhatsApp />
          <ToastProvider />
        </Providers>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
