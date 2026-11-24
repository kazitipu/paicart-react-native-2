import React, { useMemo } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSelector } from 'react-redux';
import { LayoutGrid, ShoppingCart, ShoppingBag, Menu } from 'lucide-react-native';
import { TABS, screensForTab } from './routes';
import { makeTabStack } from './makeTabStack';
import TabBar from './TabBar';
import useNotifications from '@/lib/useNotifications';

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
/* My Orders opens the orders list; the fifth tab (still labelled "More")
   opens the dashboard Overview, which links everything the old More screen
   did. The More screen stays registered (deep link /more). */
const OrdersStack = makeTabStack(TABS.ORDERS, 'BuyShipMyOrders');
/* The More tab's Overview links to the order / request / shipment lists and
   details. They open INSIDE the More stack (same screens as My Orders), so
   Back returns to the Overview and the tab bar stays on More instead of
   jumping to My Orders with its 1688 list underneath. */
const MoreStack = makeTabStack(TABS.MORE, 'DashboardOverview', screensForTab(TABS.ORDERS));

/* First screen of each tab — a tab press always returns there (TabBar). */
const INITIAL_SCREENS = {
  [TABS.CATEGORY]: 'Categories',
  [TABS.CART]: 'Cart',
  [TABS.HOME]: 'Home',
  [TABS.ORDERS]: 'BuyShipMyOrders',
  [TABS.MORE]: 'DashboardOverview',
};

export default function TabNavigator() {
  const cartCount = useCartCount();
  const { unreadCount } = useNotifications();

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
          badges={{ [TABS.CART]: cartCount, [TABS.MORE]: unreadCount }}
          /* unread in-app notifications on More: "9+" above 9 */
          badgeMax={{ [TABS.MORE]: 9 }}
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
      {/* The fifth tab keeps the "More" label but opens the dashboard
          Overview, which carries the services, the policy pages, the profile
          and the contact/WhatsApp links. Its badge is the unread in-app
          notification count. */}
      <Tab.Screen
        name={TABS.MORE}
        component={MoreStack}
        options={{ title: 'More' }}
      />
    </Tab.Navigator>
  );
}
