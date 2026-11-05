import React, { useMemo } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSelector } from 'react-redux';
import { LayoutGrid, ShoppingCart, ShoppingBag, Menu } from 'lucide-react-native';
import { TABS } from './routes';
import { makeTabStack } from './makeTabStack';
import TabBar from './TabBar';

const Tab = createBottomTabNavigator();

const TAB_ICONS = {
  [TABS.CATEGORY]: LayoutGrid,
  [TABS.CART]: ShoppingCart,
  [TABS.ORDERS]: ShoppingBag,
  [TABS.MORE]: Menu,
};

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

/* Stacks are created once at module scope — building them inside render would
   remount every screen in the tab on each tab-bar re-render (i.e. every cart
   change), losing scroll position and in-progress forms. */
const CategoryStack = makeTabStack(TABS.CATEGORY, 'Categories');
const CartStack = makeTabStack(TABS.CART, 'Cart');
const HomeStack = makeTabStack(TABS.HOME, 'Home');
const OrdersStack = makeTabStack(TABS.ORDERS, 'DashboardOverview');
const MoreStack = makeTabStack(TABS.MORE, 'More');

/* First screen of each tab — a tab press always returns there (TabBar). */
const INITIAL_SCREENS = {
  [TABS.CATEGORY]: 'Categories',
  [TABS.CART]: 'Cart',
  [TABS.HOME]: 'Home',
  [TABS.ORDERS]: 'DashboardOverview',
  [TABS.MORE]: 'More',
};

export default function TabNavigator() {
  const cartCount = useCartCount();

  return (
    <Tab.Navigator
      /* Home is the middle tab, matching the web BottomNav's
         Category · Cart · Home · My Orders · WhatsApp order. */
      initialRouteName={TABS.HOME}
      /* Android back from another tab returns to Home; from Home it leaves
         the app. (The default went to the FIRST tab — Category.) */
      backBehavior="initialRoute"
      screenOptions={{ headerShown: false }}
      tabBar={(props) => (
        <TabBar
          {...props}
          icons={TAB_ICONS}
          initialScreens={INITIAL_SCREENS}
          badges={{ [TABS.CART]: cartCount }}
        />
      )}
    >
      <Tab.Screen
        name={TABS.CATEGORY}
        component={CategoryStack}
        options={{ title: 'Category' }}
      />
      <Tab.Screen
        name={TABS.CART}
        component={CartStack}
        options={{ title: 'Cart' }}
      />
      <Tab.Screen
        name={TABS.HOME}
        component={HomeStack}
        options={{ title: 'Home' }}
      />
      <Tab.Screen
        name={TABS.ORDERS}
        component={OrdersStack}
        options={{ title: 'My Orders' }}
      />
      {/* The web's fifth tab opened a WhatsApp sheet. A phone has no footer, so
          this tab also has to house everything the web Footer linked to — the
          services, the policy pages and the profile. WhatsApp sits at the top
          of it and on the floating button, so it is no harder to reach. */}
      <Tab.Screen
        name={TABS.MORE}
        component={MoreStack}
        options={{ title: 'More' }}
      />
    </Tab.Navigator>
  );
}
