import './global.css';
import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { StatusBar } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import BootSplash from 'react-native-bootsplash';
import { useReducedMotion } from 'react-native-reanimated';
import { startDecorClock, stopDecorClock } from '@/lib/decorClock';
import Providers from '@/components/Providers';
import { configureGoogleSignin } from '@/lib/firebase';
import RootNavigator from '@/navigation/RootNavigator';
import { navigationRef } from '@/navigation/navigationRef';
import linking from '@/navigation/linking';
import ToastProvider from '@/components/ToastProvider';
import PhotoSourceSheet from '@/components/ui/PhotoSourceSheet';
import FloatingWhatsApp from '@/components/FloatingWhatsApp';
import FlyToIconAnimation from '@/components/FlyToIconAnimation';
import colors from '@/theme/colors';

/* Must run before any sign-in attempt. Module scope rather than an effect so
   it cannot race a user tapping "Continue with Google" on first paint. */
configureGoogleSignin();

export default function App() {
  /* One shared clock drives every decorative animation (lib/decorClock);
     with the OS reduce-motion setting on, it never runs. */
  const reduceMotion = useReducedMotion();
  useEffect(() => {
    if (reduceMotion) stopDecorClock();
    else startDecorClock();
  }, [reduceMotion]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <Providers>
          <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
          <NavigationContainer
            ref={navigationRef}
            linking={linking}
            /* onReady fires once the container has mounted and `linking` has
               resolved any launch URL, so the splash covers the deep-link
               hand-off too rather than flashing the wrong screen first. */
            onReady={() => BootSplash.hide({ fade: true })}
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
          {/* Camera-or-gallery chooser behind every pickImage() call. */}
          <PhotoSourceSheet />
          <ToastProvider />
        </Providers>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
