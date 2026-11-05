import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, Image, BackHandler, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { WebView } from 'react-native-webview';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, FadeIn } from 'react-native-reanimated';
import { X, Lock, WifiOff, RotateCw, AlertTriangle } from 'lucide-react-native';
import { C, Press, Overlay, SHADOW, ORANGE } from '@/components/product/ui';
import { isBkashReturnUrl, classifyBkashReturn, finishBkashCheckout } from '@/lib/payments';

/* ─── bKash checkout inside the app ───
 * Opened only by lib/payments.openBkashGateway (no deep link reaches it).
 * Shows bKash's hosted checkout in a WebView and, the moment the gateway's
 * callback redirects back to paicart.com with ?paymentStatus=, stops that
 * load, closes and hands the result back — the web site never renders. */

const BKASH_PINK = '#E2136E';

export default function BkashCheckout() {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const url = route.params?.url;

  const webRef = useRef(null);
  const doneRef = useRef(false);
  const canGoBackRef = useRef(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const progress = useSharedValue(0);
  const barStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
    opacity: progress.value >= 1 ? withTiming(0, { duration: 250 }) : 1,
  }));

  /* Resolve exactly once, after this screen is gone, so the payment sheet
     underneath reacts on a visible screen. */
  const finish = useCallback(
    (result) => {
      if (doneRef.current) return;
      doneRef.current = true;
      if (navigation.canGoBack()) navigation.goBack();
      setTimeout(() => finishBkashCheckout(result), 60);
    },
    [navigation],
  );

  /* Leaving any other way (e.g. a navigation reset) counts as closed. */
  useEffect(() => () => {
    if (!doneRef.current) {
      doneRef.current = true;
      finishBkashCheckout({ status: 'closed' });
    }
  }, []);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (confirmOpen) setConfirmOpen(false);
      else if (canGoBackRef.current && !loadError) webRef.current?.goBack();
      else setConfirmOpen(true);
      return true;
    });
    return () => sub.remove();
  }, [confirmOpen, loadError]);

  const interceptReturn = (next) => {
    if (!isBkashReturnUrl(next)) return false;
    finish(classifyBkashReturn(next));
    return true;
  };

  const onShouldStartLoadWithRequest = (req) => {
    const next = req.url || '';
    if (interceptReturn(next)) return false;
    if (/^https?:/i.test(next) || next.startsWith('about:') || next.startsWith('data:')) return true;
    /* bkash://, intent://, tel: … — hand to the OS (e.g. the bKash app). */
    Linking.openURL(next).catch(() => {});
    return false;
  };

  useEffect(() => {
    if (!url) finish({ status: 'error', message: 'Could not open bKash. Please try again.' });
  }, [url, finish]);
  if (!url) return null;

  return (
    <View style={{ flex: 1, backgroundColor: '#ffffff' }}>
      {/* ── header ── */}
      <View style={{ paddingTop: insets.top, backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: C.gray100 }}>
        <View style={{ height: 56, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, gap: 10 }}>
          <Press
            onPress={() => setConfirmOpen(true)}
            accessibilityLabel="Close payment"
            hitSlop={8}
            style={({ pressed }) => ({
              width: 36,
              height: 36,
              borderRadius: 18,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: pressed ? C.gray200 : C.gray100,
            })}
          >
            <X size={18} color={C.gray700} />
          </Press>
          <Image source={require('@/assets/bkash.png')} style={{ width: 30, height: 30, borderRadius: 8 }} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ fontSize: 15, lineHeight: 20, fontWeight: '800', color: C.gray900 }}>bKash Payment</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Lock size={10} color="#059669" />
              <Text style={{ fontSize: 11, lineHeight: 15, color: '#059669', fontWeight: '600' }}>Secure checkout</Text>
            </View>
          </View>
        </View>
        <Animated.View style={[{ height: 2.5, backgroundColor: BKASH_PINK }, barStyle]} />
      </View>

      {/* ── checkout ── */}
      {loadError ? (
        <Animated.View entering={FadeIn.duration(200)} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: '#FFF4EC', alignItems: 'center', justifyContent: 'center' }}>
            <WifiOff size={28} color={ORANGE} />
          </View>
          <Text style={{ fontSize: 17, lineHeight: 22, fontWeight: '800', color: C.gray900, marginTop: 16 }}>Couldn’t load bKash</Text>
          <Text style={{ fontSize: 13, lineHeight: 19, color: C.gray500, marginTop: 6, textAlign: 'center' }}>
            Check your internet connection and try again. You have not been charged.
          </Text>
          <Press
            onPress={() => {
              setLoadError(false);
              setReloadKey((k) => k + 1);
            }}
            style={({ pressed }) => ({
              marginTop: 20,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              paddingHorizontal: 22,
              paddingVertical: 12,
              borderRadius: 14,
              backgroundColor: pressed ? '#c10f5d' : BKASH_PINK,
            })}
          >
            <RotateCw size={15} color="#ffffff" />
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#ffffff' }}>Try again</Text>
          </Press>
        </Animated.View>
      ) : (
        <WebView
          key={reloadKey}
          ref={webRef}
          source={{ uri: url }}
          originWhitelist={['*']}
          onShouldStartLoadWithRequest={onShouldStartLoadWithRequest}
          onNavigationStateChange={(nav) => {
            canGoBackRef.current = nav.canGoBack;
            /* Belt and braces: some redirects skip onShouldStartLoad. */
            if (nav.url && interceptReturn(nav.url)) webRef.current?.stopLoading();
          }}
          onLoadProgress={({ nativeEvent }) => {
            progress.value = withTiming(nativeEvent.progress, { duration: 150 });
          }}
          onError={() => setLoadError(true)}
          onHttpError={({ nativeEvent }) => {
            if (nativeEvent.statusCode >= 500 && !isBkashReturnUrl(nativeEvent.url)) setLoadError(true);
          }}
          setSupportMultipleWindows={false}
          javaScriptEnabled
          domStorageEnabled
          startInLoadingState={false}
          style={{ flex: 1, backgroundColor: '#ffffff' }}
        />
      )}

      {/* ── cancel confirmation ── */}
      <Overlay visible={confirmOpen} onClose={() => setConfirmOpen(false)} zIndex={50}>
        <View
          style={{
            backgroundColor: '#ffffff',
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            paddingHorizontal: 20,
            paddingTop: 10,
            paddingBottom: 16 + insets.bottom,
            boxShadow: SHADOW['2xl'],
          }}
        >
          <View style={{ alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: C.gray200, marginBottom: 18 }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: '#FFF4EC', alignItems: 'center', justifyContent: 'center' }}>
              <AlertTriangle size={20} color={ORANGE} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 17, lineHeight: 22, fontWeight: '800', color: C.gray900 }}>Cancel this payment?</Text>
              <Text style={{ fontSize: 13, lineHeight: 18, color: C.gray500, marginTop: 2 }}>
                You won’t be charged. Your order is saved and you can pay later.
              </Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 20 }}>
            <Press
              onPress={() => {
                setConfirmOpen(false);
                finish({ status: 'closed' });
              }}
              style={({ pressed }) => ({
                flex: 1,
                paddingVertical: 14,
                borderRadius: 16,
                alignItems: 'center',
                backgroundColor: pressed ? C.gray200 : C.gray100,
              })}
            >
              <Text style={{ fontSize: 15, fontWeight: '700', color: C.gray700 }}>Cancel payment</Text>
            </Press>
            <Press
              onPress={() => setConfirmOpen(false)}
              style={({ pressed }) => ({
                flex: 1,
                paddingVertical: 14,
                borderRadius: 16,
                alignItems: 'center',
                backgroundColor: pressed ? '#c10f5d' : BKASH_PINK,
              })}
            >
              <Text style={{ fontSize: 15, fontWeight: '800', color: '#ffffff' }}>Keep paying</Text>
            </Press>
          </View>
        </View>
      </Overlay>
    </View>
  );
}
