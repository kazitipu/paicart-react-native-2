import React, { useMemo } from 'react';
import { View, Text, Image, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSelector } from 'react-redux';
import { LayoutGrid, ShoppingCart, ShoppingBag, Menu } from 'lucide-react-native';
import { TABS } from './routes';
import { makeTabStack } from './RootNavigator';
import colors from '@/theme/colors';

const Tab = createBottomTabNavigator();

const HOME_ICON = require('@/assets/paicart_icon.png');

/* The web app's BottomNav summed quantities across the shop → items → skus
   tree on every render. Memoised here because the tab bar is mounted for the
   whole session and the cart updates from a Firestore listener. */
function useCartCount() {
  const cart = useSelector((s) => s.cartList?.cart || []);
  return useMemo(
    () =>
      cart.reduce((acc, shop) => {
        shop.items?.forEach((item) =>
          item.skus?.forEach((sku) => {
            acc += parseInt(sku.totalQuantity || 0, 10) || 0;
          }),
        );
        return acc;
      }, 0),
    [cart],
  );
}

function Badge({ count }) {
  if (!count) return null;
  return (
    <View
      className="absolute -top-1.5 -right-2.5 bg-primary rounded-full min-w-4 h-4 px-1 items-center justify-center"
      pointerEvents="none"
    >
      <Text className="text-white text-2xs font-bold leading-none">
        {count > 99 ? '99+' : count}
      </Text>
    </View>
  );
}

const withBadge = (Icon, count) =>
  function TabIcon({ color, size }) {
    return (
      <View>
        <Icon color={color} size={size} />
        <Badge count={count} />
      </View>
    );
  };

/* Stacks are created once at module scope — building them inside render would
   remount every screen in the tab on each tab-bar re-render (i.e. every cart
   change), losing scroll position and in-progress forms. */
const CategoryStack = makeTabStack(TABS.CATEGORY, 'Categories');
const CartStack = makeTabStack(TABS.CART, 'Cart');
const HomeStack = makeTabStack(TABS.HOME, 'Home');
const OrdersStack = makeTabStack(TABS.ORDERS, 'DashboardOverview');
const MoreStack = makeTabStack(TABS.MORE, 'More');

export default function TabNavigator() {
  const cartCount = useCartCount();

  return (
    <Tab.Navigator
      /* Home is the middle tab, matching the web BottomNav's
         Category · Cart · Home · My Orders · WhatsApp order. */
      initialRouteName={TABS.HOME}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: '#9ca3af',
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopColor: '#f3f4f6',
          height: Platform.OS === 'ios' ? 84 : 62,
          paddingTop: 6,
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600', marginTop: 2 },
      }}
    >
      <Tab.Screen
        name={TABS.CATEGORY}
        component={CategoryStack}
        options={{
          title: 'Category',
          tabBarIcon: ({ color, size }) => <LayoutGrid color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name={TABS.CART}
        component={CartStack}
        options={{ title: 'Cart', tabBarIcon: withBadge(ShoppingCart, cartCount) }}
      />
      <Tab.Screen
        name={TABS.HOME}
        component={HomeStack}
        options={{
          title: 'Home',
          tabBarIcon: ({ size }) => (
            <Image
              source={HOME_ICON}
              style={{ width: size, height: size }}
              resizeMode="contain"
            />
          ),
        }}
      />
      <Tab.Screen
        name={TABS.ORDERS}
        component={OrdersStack}
        options={{
          title: 'My Orders',
          tabBarIcon: ({ color, size }) => <ShoppingBag color={color} size={size} />,
        }}
      />
      {/* The web's fifth tab opened a WhatsApp sheet. A phone has no footer, so
          this tab also has to house everything the web Footer linked to — the
          services, the policy pages and the profile. WhatsApp sits at the top
          of it and on the floating button, so it is no harder to reach. */}
      <Tab.Screen
        name={TABS.MORE}
        component={MoreStack}
        options={{
          title: 'More',
          tabBarIcon: ({ color, size }) => <Menu color={color} size={size} />,
        }}
      />
    </Tab.Navigator>
  );
}
