import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, Image, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  interpolate,
  interpolateColor,
  Easing,
  useReducedMotion,
} from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Stop, Circle } from 'react-native-svg';
import colors from '@/theme/colors';
import { CommonActions } from '@react-navigation/native';
import { decorRing } from '@/lib/decorClock';

const HOME_ICON = require('@/assets/paicart_icon.png');

const ACTIVE = colors.primary; // #FF6A00
const INACTIVE = '#9ca3af';
const BAR_H = 60;
const PILL_W = 46;
const PILL_H = 30;
const HOME_SIZE = 58;
const SPRING = { damping: 16, stiffness: 190, mass: 0.8 };

/* Count badge that pops whenever the number goes up. */
function Badge({ count }) {
  const scale = useSharedValue(count ? 1 : 0);
  const prev = useRef(count);
  useEffect(() => {
    if (!count) {
      scale.value = withTiming(0, { duration: 150 });
    } else if (count > (prev.current || 0)) {
      scale.value = withSequence(
        withTiming(1.45, { duration: 140, easing: Easing.out(Easing.ease) }),
        withSpring(1, { damping: 7, stiffness: 260 }),
      );
    } else {
      scale.value = withSpring(1);
    }
    prev.current = count;
  }, [count, scale]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }], opacity: scale.value > 0.05 ? 1 : 0 }));
  if (!count && prev.current === 0) return null;
  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.badge, style]}
    >
      <Text style={styles.badgeText}>{count > 99 ? '99+' : count}</Text>
    </Animated.View>
  );
}

/* A regular tab: icon springs up and tints when focused, label firms up. */
function TabItem({ focused, label, Icon, badge, onPress, onLongPress, accessibilityLabel }) {
  const p = useSharedValue(focused ? 1 : 0);
  const press = useSharedValue(1);
  useEffect(() => {
    p.value = withSpring(focused ? 1 : 0, SPRING);
  }, [focused, p]);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(p.value, [0, 1], [0, -2]) }, { scale: interpolate(p.value, [0, 1], [1, 1.1]) * press.value }],
  }));
  const labelStyle = useAnimatedStyle(() => ({
    color: interpolateColor(p.value, [0, 1], [INACTIVE, ACTIVE]),
  }));

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={focused ? { selected: true } : {}}
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={() => {
        press.value = withTiming(0.86, { duration: 90 });
      }}
      onPressOut={() => {
        press.value = withSpring(1, { damping: 9, stiffness: 280 });
      }}
      style={styles.tab}
    >
      <Animated.View style={[styles.iconWrap, iconStyle]}>
        <Icon color={focused ? ACTIVE : INACTIVE} size={22} strokeWidth={focused ? 2.3 : 1.9} />
        <Badge count={badge} />
      </Animated.View>
      <Animated.Text numberOfLines={1} style={[styles.label, focused && styles.labelActive, labelStyle]}>
        {label}
      </Animated.Text>
    </Pressable>
  );
}

/* The centre Home tab: a raised circle carrying the Paicart mark, with a
   gradient ring and glow that light up when Home is focused and a slow
   breathing halo while it is. */
function HomeTab({ focused, onPress, onLongPress }) {
  const reduceMotion = useReducedMotion();
  const p = useSharedValue(focused ? 1 : 0);
  const press = useSharedValue(1);

  useEffect(() => {
    p.value = withSpring(focused ? 1 : 0, SPRING);
  }, [focused, p]);

  const btnStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(p.value, [0, 1], [-26, -29]) }, { scale: press.value }],
  }));
  const ringStyle = useAnimatedStyle(() => ({ opacity: p.value }));
  /* Rides the shared decor clock (lib/decorClock): one ripple per play. */
  const haloOn = focused && !reduceMotion;
  const haloStyle = useAnimatedStyle(
    () => (haloOn ? decorRing(0.35, 0.45) : { opacity: 0, transform: [{ scale: 1 }] }),
    [haloOn],
  );
  const labelStyle = useAnimatedStyle(() => ({
    color: interpolateColor(p.value, [0, 1], [INACTIVE, ACTIVE]),
  }));

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={focused ? { selected: true } : {}}
      accessibilityLabel="Home"
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={() => {
        press.value = withTiming(0.9, { duration: 90 });
      }}
      onPressOut={() => {
        press.value = withSpring(1, { damping: 9, stiffness: 260 });
      }}
      style={styles.tab}
    >
      <Animated.View style={[styles.homeBtnWrap, btnStyle]}>
        <Animated.View pointerEvents="none" style={[styles.homeHalo, haloStyle]} />
        <View style={[styles.homeBtn, focused && styles.homeBtnActive]}>
          {/* gradient ring, visible when focused */}
          <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, ringStyle]}>
            <Svg width={HOME_SIZE} height={HOME_SIZE}>
              <Defs>
                <LinearGradient id="homeRing" x1="0" y1="0" x2="1" y2="1">
                  <Stop offset="0" stopColor="#FFB067" />
                  <Stop offset="1" stopColor={ACTIVE} />
                </LinearGradient>
              </Defs>
              <Circle cx={HOME_SIZE / 2} cy={HOME_SIZE / 2} r={HOME_SIZE / 2 - 1.5} stroke="url(#homeRing)" strokeWidth={3} fill="none" />
            </Svg>
          </Animated.View>
          <Image source={HOME_ICON} style={styles.homeIcon} resizeMode="contain" />
        </View>
      </Animated.View>
      <Animated.Text numberOfLines={1} style={[styles.label, styles.homeLabel, focused && styles.labelActive, labelStyle]}>
        Home
      </Animated.Text>
    </Pressable>
  );
}

/* Modern bottom tab bar: a white sheet with rounded top corners and a soft
 * upward shadow; a tinted pill glides behind whichever regular tab is
 * focused; Home is a raised centre button. Behaviour is React Navigation's
 * standard contract — tabPress is emitted first so a screen can prevent it,
 * and re-pressing the focused tab lets it scroll to top. */
/* Screens that bring their own pinned bottom bar. The web shows its
   BottomNav only on home and collection pages; on product pages the
   Add-to-cart / Buy-now bar takes that spot instead. */
/* Also the service pages: the web has no bottom bar on any of them. */
const HIDE_ON = new Set([
  'Product', 'PlaceOrder', 'Wishlist',
  'ShipForMeForm', 'BuyForMe', 'TrackOrder', 'CostCalculator',
  'AboutUs', 'Contact', 'Faq', 'HowToOrder', 'PrivacyPolicy', 'RefundPolicy', 'TaxAndShipping', 'Terms',
]);

function focusedLeafName(state) {
  const tab = state.routes[state.index];
  const nested = tab?.state;
  if (!nested) return tab?.params?.screen ?? null;
  return nested.routes[nested.index ?? 0]?.name ?? null;
}

export default function TabBar(props) {
  if (HIDE_ON.has(focusedLeafName(props.state))) return null;
  return <TabBarInner {...props} />;
}

function TabBarInner({ state, descriptors, navigation, badges = {}, icons = {}, initialScreens = {} }) {
  const insets = useSafeAreaInsets();
  const [width, setWidth] = useState(0);
  const count = state.routes.length;
  const tabW = width / count;
  const pillX = useSharedValue(-100);
  const pillOpacity = useSharedValue(0);
  const homeIndex = state.routes.findIndex((r) => r.name === 'HomeTab');
  const placed = useRef(false);

  useEffect(() => {
    if (!tabW) return;
    const x = tabW * state.index + (tabW - PILL_W) / 2;
    const onHome = state.index === homeIndex;
    if (!placed.current) {
      pillX.value = x;
      placed.current = true;
    } else {
      pillX.value = withSpring(x, SPRING);
    }
    pillOpacity.value = withTiming(onHome ? 0 : 1, { duration: 180 });
  }, [state.index, tabW, homeIndex, pillX, pillOpacity]);

  const pillStyle = useAnimatedStyle(() => ({
    opacity: pillOpacity.value,
    transform: [{ translateX: pillX.value }],
  }));

  return (
    <View
      style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 6) }]}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
    >
      {width > 0 && <Animated.View pointerEvents="none" style={[styles.pill, pillStyle]} />}

      <View style={styles.row}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const label = options.title ?? route.name;
          const focused = state.index === index;

          /* A tab press always lands on the tab's first screen, fresh — not on
             whatever was last open in it (a product, a list, Place Order).
             It also drops route.params: a cross-tab jump such as
             navigate(Orders, { screen: 'BuyShipMyOrders' }) leaves that nested
             screen in the tab's params, and re-sending them re-opened it. */
          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (event.defaultPrevented) return;
            const first = initialScreens[route.name];
            const nested = state.routes[index]?.state;
            const atFirst =
              !nested || (nested.routes?.length === 1 && nested.routes[0]?.name === first);
            if (first && nested?.key && !atFirst) {
              navigation.dispatch({
                ...CommonActions.reset({ index: 0, routes: [{ name: first }] }),
                target: nested.key,
              });
            }
            if (!focused) navigation.navigate(route.name);
          };
          const onLongPress = () => navigation.emit({ type: 'tabLongPress', target: route.key });

          if (index === homeIndex) {
            return <HomeTab key={route.key} focused={focused} onPress={onPress} onLongPress={onLongPress} />;
          }
          return (
            <TabItem
              key={route.key}
              focused={focused}
              label={label}
              Icon={icons[route.name]}
              badge={badges[route.name]}
              onPress={onPress}
              onLongPress={onLongPress}
              accessibilityLabel={options.tabBarAccessibilityLabel ?? label}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingTop: 6,
    boxShadow: '0 -6px 24px -10px rgba(15,23,42,0.18), 0 -1px 0 0 rgba(15,23,42,0.04)',
  },
  row: { flexDirection: 'row', height: BAR_H - 6 },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'flex-start', paddingTop: 2 },
  pill: {
    position: 'absolute',
    top: 6,
    left: 0,
    width: PILL_W,
    height: PILL_H,
    borderRadius: PILL_H / 2,
    backgroundColor: colors.primaryTint,
  },
  iconWrap: { height: PILL_H, justifyContent: 'center', alignItems: 'center' },
  label: { fontSize: 10, fontWeight: '600', marginTop: 3, color: INACTIVE },
  labelActive: { fontWeight: '800' },
  badge: {
    position: 'absolute',
    top: 0,
    right: -10,
    minWidth: 17,
    height: 17,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: ACTIVE,
    borderWidth: 1.5,
    borderColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: '#ffffff', fontSize: 9, fontWeight: '800', lineHeight: 11 },
  homeBtnWrap: { width: HOME_SIZE, height: HOME_SIZE, alignItems: 'center', justifyContent: 'center', marginBottom: HOME_SIZE * -1 + PILL_H },
  homeHalo: {
    position: 'absolute',
    width: HOME_SIZE,
    height: HOME_SIZE,
    borderRadius: HOME_SIZE / 2,
    backgroundColor: ACTIVE,
  },
  homeBtn: {
    width: HOME_SIZE,
    height: HOME_SIZE,
    borderRadius: HOME_SIZE / 2,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    boxShadow: '0 6px 16px -6px rgba(15,23,42,0.25)',
  },
  homeBtnActive: {
    borderColor: 'transparent',
    boxShadow: `0 8px 20px -6px ${ACTIVE}99`,
  },
  homeIcon: { width: 30, height: 30 },
  homeLabel: { marginTop: 3 },
});
