import React, { useEffect, useState } from 'react';
import { View, Text, Modal, ScrollView, Pressable, Dimensions, StyleSheet } from 'react-native';
import Animated, {
  FadeIn,
  ZoomIn,
  Easing,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  cancelAnimation,
} from 'react-native-reanimated';
import { PackageOpen, Truck, Check } from 'lucide-react-native';
import { C, ORANGE, Press, SHADOW } from '@/components/product/ui';
import { subscribeDeliveryMoved } from '@/lib/deliveryMoved';
import { navigationRef } from '@/navigation/navigationRef';
import { TABS } from '@/navigation/routes';

/* ═══════════════════════════════════════════════════════════════════════
   "Home delivery requested" — shown after a Pathao (Home Delivery) request,
   which moves the item(s) from To Receive to My Home Delivery Request on
   the Overview. Mounted once in App.jsx (the requesting card unmounts when
   its list reloads); opened through lib/deliveryMoved showDeliveryMoved().

   Illustration: To Receive icon → animated dashed line with a travelling
   dot → orange truck "Home Delivery". The card pops in.
   "View my home deliveries" opens the Overview with openHomeDelivery: true,
   which opens its HomeDeliveryModal.
   ═══════════════════════════════════════════════════════════════════════ */

const LINE_W = 86;
const DOT = 8;

function MoveLine() {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withDelay(250, withRepeat(withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.quad) }), -1, false));
    return () => cancelAnimation(t);
  }, [t]);
  const dotStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: t.value * (LINE_W - DOT) }],
    opacity: t.value < 0.08 ? t.value / 0.08 : t.value > 0.9 ? (1 - t.value) / 0.1 : 1,
  }));
  const fillStyle = useAnimatedStyle(() => ({ width: t.value * LINE_W }));
  return (
    <View style={{ width: LINE_W, height: DOT, justifyContent: 'center', marginBottom: 18 }}>
      <View style={{ position: 'absolute', left: 0, right: 0, height: 2, borderRadius: 1, backgroundColor: C.gray200 }} />
      <Animated.View style={[{ position: 'absolute', left: 0, height: 2, borderRadius: 1, backgroundColor: C.orange200 }, fillStyle]} />
      <Animated.View
        style={[{ position: 'absolute', left: 0, width: DOT, height: DOT, borderRadius: DOT / 2, backgroundColor: ORANGE }, dotStyle]}
      />
    </View>
  );
}

function Stop({ Icon, label, active, delay }) {
  return (
    <Animated.View entering={ZoomIn.duration(320).delay(delay)} style={{ alignItems: 'center', width: 78, gap: 6 }}>
      <View
        style={{
          width: 46,
          height: 46,
          borderRadius: 23,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: active ? ORANGE : C.gray100,
          borderWidth: active ? 0 : 1,
          borderColor: C.gray200,
        }}
      >
        <Icon size={20} color={active ? '#ffffff' : C.gray500} />
      </View>
      <Text style={{ fontSize: 10.5, fontWeight: '700', color: active ? ORANGE : C.gray500, textAlign: 'center' }} numberOfLines={1}>
        {label}
      </Text>
    </Animated.View>
  );
}

const openHomeDeliveries = () => {
  if (!navigationRef.isReady()) return;
  navigationRef.navigate('Tabs', {
    screen: TABS.MORE,
    params: { screen: 'DashboardOverview', params: { openHomeDelivery: true } },
  });
};

export default function DeliveryMovedSheet() {
  const [data, setData] = useState(null);
  /* A short delay lets a closing Modal (the bulk sheet) finish first — iOS
     won't present a Modal while another one is still dismissing. */
  useEffect(() => {
    let timer = null;
    const unsub = subscribeDeliveryMoved((payload) => {
      clearTimeout(timer);
      timer = setTimeout(() => setData(payload), 350);
    });
    return () => {
      clearTimeout(timer);
      unsub();
    };
  }, []);

  const close = () => setData(null);
  const visible = !!data;
  const items = data?.items || [];
  const n = items.length;
  const method = data?.methodLabel || 'Home Delivery (Pathao)';
  const width = Math.min(Dimensions.get('window').width - 32, 380);

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent onRequestClose={close}>
      {visible && (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 }}>
          <Animated.View entering={FadeIn.duration(180)} style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
            <Pressable style={StyleSheet.absoluteFill} onPress={close} accessibilityLabel="Close" />
          </Animated.View>

          <Animated.View
            entering={ZoomIn.springify().damping(16).stiffness(180)}
            accessibilityViewIsModal
            style={{
              width,
              maxHeight: Dimensions.get('window').height * 0.85,
              backgroundColor: '#ffffff',
              borderRadius: 20,
              paddingHorizontal: 20,
              paddingTop: 22,
              paddingBottom: 18,
              boxShadow: SHADOW.xl,
            }}
          >
            {/* To Receive → Home Delivery */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
              <Stop Icon={PackageOpen} label="To Receive" delay={80} />
              <MoveLine />
              <Stop Icon={Truck} label="Home Delivery" active delay={200} />
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 16 }}>
              <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: C.green600, alignItems: 'center', justifyContent: 'center' }}>
                <Check size={11} color="#ffffff" strokeWidth={3} />
              </View>
              <Text style={{ fontSize: 16, fontWeight: '800', color: C.gray900 }}>Home delivery requested</Text>
            </View>

            <Text style={{ fontSize: 12, lineHeight: 18, color: C.gray600, textAlign: 'center', marginTop: 8 }}>
              {n > 1 ? `These ${n} items have` : 'This item has'} moved from{' '}
              <Text style={{ fontWeight: '700', color: C.gray800 }}>To Receive</Text> to{' '}
              <Text style={{ fontWeight: '700', color: C.gray800 }}>My Home Delivery Request</Text> ({method}). Track the Pathao
              delivery there.
            </Text>

            {n > 0 && (
              <View
                style={{
                  marginTop: 14,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: C.gray100,
                  backgroundColor: C.gray50,
                  maxHeight: 156,
                }}
              >
                <ScrollView contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 8 }} showsVerticalScrollIndicator={n > 4}>
                  {items.map((it, i) => (
                    <View
                      key={it.id ?? i}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 8,
                        paddingVertical: 6,
                        borderTopWidth: i ? 1 : 0,
                        borderTopColor: C.gray100,
                      }}
                    >
                      <Truck size={12} color={ORANGE} />
                      <Text style={{ flex: 1, fontSize: 11.5, color: C.gray700 }} numberOfLines={1}>
                        {it.label}
                      </Text>
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}

            <Press
              onPress={() => {
                close();
                openHomeDeliveries();
              }}
              accessibilityRole="button"
              style={({ pressed }) => ({
                marginTop: 16,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                paddingVertical: 12,
                borderRadius: 12,
                backgroundColor: ORANGE,
                opacity: pressed ? 0.85 : 1,
              })}
            >
              <Truck size={15} color="#ffffff" />
              <Text style={{ fontSize: 13.5, fontWeight: '800', color: '#ffffff' }}>View my home deliveries</Text>
            </Press>
            <Press
              onPress={close}
              accessibilityRole="button"
              style={({ pressed }) => ({
                marginTop: 8,
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: 11,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: C.gray200,
                backgroundColor: pressed ? C.gray50 : '#ffffff',
              })}
            >
              <Text style={{ fontSize: 13, fontWeight: '700', color: C.gray600 }}>Stay here</Text>
            </Press>
          </Animated.View>
        </View>
      )}
    </Modal>
  );
}
