import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { View, Text, Image, Pressable, Modal, StyleSheet } from 'react-native';
import { useNavigation, useFocusEffect, useRoute } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import {
  ShoppingCart, Heart, User, ChevronDown, LogOut,
  ShoppingBag, Ship, LayoutDashboard, Package,
} from 'lucide-react-native';
import { SearchPill } from '@/components/SearchBar';
import { on, EVENTS } from '@/lib/events';
import { setFlyTarget } from '@/lib/flyToIcon';
import { signOutEverywhere } from '@/lib/firebase';
import { toast } from '@/lib/toast';
import { TABS } from '@/navigation/routes';
import { goHome } from '@/navigation/goHome';

const LOGO = require('@/assets/paicart_transparent.png');
const LOGO_SRC = Image.resolveAssetSource(LOGO);
const LOGO_H = 40; // h-10
const LOGO_W = LOGO_SRC?.width ? (LOGO_SRC.width / LOGO_SRC.height) * LOGO_H : 120;

const ICON_COLOR = '#4b5563'; // text-gray-600

/* hdrIconBounce: 1 → 1.35 → .88 → 1.15 → 1 over .55s. */
function useBounce() {
  const s = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  const bounce = useCallback(() => {
    const t = (v) => withTiming(v, { duration: 137, easing: Easing.inOut(Easing.ease) });
    s.value = withSequence(t(1.35), t(0.88), t(1.15), t(1));
  }, [s]);
  return [style, bounce];
}

function CountBadge({ count }) {
  if (!count) return null;
  return (
    <View
      pointerEvents="none"
      className="absolute w-4 h-4 rounded-full items-center justify-center"
      style={{ top: -2, right: -2, backgroundColor: '#f97316' }}
    >
      <Text className="text-white font-bold" style={{ fontSize: 10, lineHeight: 12 }}>
        {count}
      </Text>
    </View>
  );
}

function MenuItem({ Icon, label, onPress, danger, padY = 8 }) {
  return (
    <Pressable
      onPress={onPress}
      className={`flex-row items-center gap-3 px-4 ${danger ? 'active:bg-red-50' : 'active:bg-gray-50'}`}
      style={{ paddingVertical: padY }}
    >
      {Icon && <Icon size={15} color={danger ? '#dc2626' : '#374151'} />}
      <Text className={`text-sm ${danger ? 'text-red-600' : 'text-gray-700'}`}>{label}</Text>
    </Pressable>
  );
}

/* The account dropdown: w-56, rounded-xl, shadow-xl, anchored under the user
   button, opening with the web's opacity + scale(.95→1) + translateY(-4→0)
   over 200ms ease-out from the top-right corner. */
function UserMenu({ open, anchor, onClose, currentUser, isLoggedIn, go }) {
  const p = useSharedValue(0);
  const [visible, setVisible] = useState(open);

  useEffect(() => {
    if (open) {
      setVisible(true);
      p.value = withTiming(1, { duration: 200, easing: Easing.out(Easing.ease) });
    } else {
      p.value = withTiming(0, { duration: 150, easing: Easing.out(Easing.ease) });
      const t = setTimeout(() => setVisible(false), 150);
      return () => clearTimeout(t);
    }
  }, [open, p]);

  const style = useAnimatedStyle(() => ({
    opacity: p.value,
    transform: [{ translateY: -4 * (1 - p.value) }, { scale: 0.95 + 0.05 * p.value }],
  }));

  if (!visible || !anchor) return null;

  const item = (screen, tab) => () => {
    onClose();
    go(screen, tab);
  };

  return (
    <Modal transparent visible animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      <Animated.View
        className="absolute w-56 bg-white rounded-xl border border-gray-100 py-2"
        style={[
          {
            top: anchor.y + anchor.height + 8,
            right: anchor.right,
            transformOrigin: 'top right',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
          },
          style,
        ]}
      >
        {isLoggedIn ? (
          <>
            <View className="px-4 border-b border-gray-100" style={{ paddingVertical: 10 }}>
              <Text className="text-sm font-semibold text-gray-800" numberOfLines={1}>
                {currentUser.displayName}
              </Text>
              <Text className="text-xs text-gray-500" numberOfLines={1}>
                {currentUser.email}
              </Text>
            </View>
            <MenuItem Icon={LayoutDashboard} label="Overview" onPress={item('DashboardOverview', TABS.ORDERS)} />
            <MenuItem Icon={Package} label="My Product Requests" onPress={item('BuyShipMyRequests', TABS.ORDERS)} />
            <MenuItem Icon={ShoppingBag} label="My Orders" onPress={item('BuyShipMyOrders', TABS.ORDERS)} />
            <MenuItem Icon={Ship} label="My Shipments" onPress={item('ShipMyRequests', TABS.ORDERS)} />
            <MenuItem Icon={User} label="Profile" onPress={item('UserInformation', TABS.ORDERS)} />
            <View className="border-t border-gray-100 my-1" />
            <MenuItem
              Icon={LogOut}
              label="Sign Out"
              danger
              onPress={async () => {
                onClose();
                try {
                  /* Providers' auth listener clears user, cart and wishlist. */
                  await signOutEverywhere();
                  /* The web signed out silently; on a phone nothing else on
                     screen changes, so say so. */
                  toast.success('You have been signed out');
                } catch {
                  toast.error('Could not sign out. Please try again.');
                }
              }}
            />
          </>
        ) : (
          <>
            <MenuItem label="Sign In" padY={10} onPress={item('Login')} />
            <MenuItem label="Register" padY={10} onPress={item('Register')} />
          </>
        )}
      </Animated.View>
    </Modal>
  );
}

/* The web Header at its mobile breakpoint:
 *   row 1 — logo (left) · wishlist, cart, account (right)
 *   row 2 — full-width search
 * White, with the web's two-layer drop shadow. Hide-on-scroll is driven by the
 * screen that owns the scroll view (it animates this component's wrapper);
 * `hidden` only pauses the decorative loops while it is parked off-screen. */
export default function Header({ hidden = false, onLayout }) {
  const navigation = useNavigation();
  const isHome = useRoute().name === 'Home';
  const currentUser = useSelector((s) => s.user?.currentUser);
  const cartItems = useSelector((s) => s.cartList?.cart || []);
  const wishlistItems = useSelector((s) => s.wishlist?.wishlist || []);
  const isLoggedIn = !!currentUser?.id;

  const cartCount = useMemo(
    () =>
      cartItems.reduce((acc, shop) => {
        shop.items?.forEach((it) =>
          it.skus?.forEach((sku) => {
            acc += parseInt(sku.totalQuantity || 0, 10) || 0;
          }),
        );
        return acc;
      }, 0),
    [cartItems],
  );

  const [menuOpen, setMenuOpen] = useState(false);
  const [anchor, setAnchor] = useState(null);
  const userBtnRef = useRef(null);
  const wishRef = useRef(null);
  const cartRef = useRef(null);
  const [wishStyle, bounceWish] = useBounce();
  const [cartStyle, bounceCart] = useBounce();

  /* Bounce the icon as the flying thumbnail lands (750ms flight). */
  useEffect(
    () =>
      on(EVENTS.FLY_TO_ICON, ({ target }) => {
        setTimeout(target === 'wishlist' ? bounceWish : bounceCart, 700);
      }),
    [bounceWish, bounceCart],
  );

  /* Publish the icons' screen positions so add-to-cart / wishlist flights land
     on them, as the web's did on #header-cart-btn. Withdrawn on blur. */
  const publishTargets = useCallback(() => {
    const pub = (ref, target) =>
      ref.current?.measureInWindow((x, y, w, h) => {
        if (w) setFlyTarget(target, { x: x + w / 2, y: y + h / 2 });
      });
    pub(wishRef, 'wishlist');
    pub(cartRef, 'cart');
  }, []);

  useFocusEffect(
    useCallback(() => {
      const t = setTimeout(publishTargets, 300);
      return () => {
        clearTimeout(t);
        setFlyTarget('wishlist', null);
        setFlyTarget('cart', null);
      };
    }, [publishTargets]),
  );

  /* On a root-stack screen (the auth screens sit above the tabs) a navigate
     to a tab name is not handled — actions only bubble UP the tree. There the
     Header pops back to the tab navigator instead, as leaving the login page
     via the web Header would. */
  const inRoot = !!navigation.getState?.()?.routeNames?.includes('Tabs');
  const go = (screen, tab) => {
    if (tab && inRoot) navigation.popTo('Tabs', { screen: tab, params: { screen } });
    else if (tab) navigation.navigate(tab, { screen });
    else navigation.navigate(screen);
  };

  const openMenu = () => {
    userBtnRef.current?.measureInWindow((x, y, w, h) => {
      setAnchor({ y, height: h, right: 16 });
      setMenuOpen(true);
    });
  };

  return (
    <View
      onLayout={(e) => {
        onLayout?.(e);
        publishTargets();
      }}
      className="bg-white px-4 py-3"
      style={{ boxShadow: '0 4px 16px -2px rgba(0,0,0,0.12), 0 2px 6px -1px rgba(0,0,0,0.07)', rowGap: 8 }}
    >
      <View className="flex-row items-center">
        {/* On Home the logo is inert (web: a <span>); elsewhere it links home. */}
        <Pressable
          disabled={isHome}
          onPress={goHome}
          className="active:opacity-70"
        >
          <Image source={LOGO} style={{ height: LOGO_H, width: LOGO_W }} resizeMode="contain" />
        </Pressable>

        <View className="flex-row items-center ml-auto" style={{ gap: 2 }}>
          <Pressable
            ref={wishRef}
            onPress={() => go('Wishlist', TABS.HOME)}
            className="p-2 active:opacity-60"
            hitSlop={4}
          >
            <Animated.View style={wishStyle}>
              <Heart size={22} color={ICON_COLOR} />
            </Animated.View>
            <CountBadge count={wishlistItems.length} />
          </Pressable>

          <Pressable
            ref={cartRef}
            onPress={() => go('Cart', TABS.CART)}
            className="p-2 active:opacity-60"
            hitSlop={4}
          >
            <Animated.View style={cartStyle}>
              <ShoppingCart size={22} color={ICON_COLOR} />
            </Animated.View>
            <CountBadge count={cartCount} />
          </Pressable>

          <Pressable
            ref={userBtnRef}
            onPress={openMenu}
            className="flex-row items-center gap-1 p-2 active:opacity-60"
            hitSlop={4}
          >
            <User size={22} color={ICON_COLOR} />
            <View style={{ transform: [{ rotate: menuOpen ? '180deg' : '0deg' }] }}>
              <ChevronDown size={13} color="#9ca3af" />
            </View>
          </Pressable>
        </View>
      </View>

      <SearchPill paused={hidden} />

      <UserMenu
        open={menuOpen}
        anchor={anchor}
        onClose={() => setMenuOpen(false)}
        currentUser={currentUser}
        isLoggedIn={isLoggedIn}
        go={go}
      />
    </View>
  );
}
