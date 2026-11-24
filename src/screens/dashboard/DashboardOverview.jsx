import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { View, Text, Linking, AppState } from 'react-native';
import { useNavigation, useFocusEffect, useRoute } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import Clipboard from '@react-native-clipboard/clipboard';
import DashboardLayout from '@/components/DashboardLayout';
import ComplaintModal from '@/components/ComplaintModal';
import { Press } from '@/components/product/ui';
import { toast } from '@/lib/toast';
import { signOutEverywhere } from '@/lib/firebase';
import { getPaymentRequestsOfUser } from '@/lib/firebaseUtils';
import { getShippingMark } from '@/lib/shippingMark';
import { getLevelMeta, computeBuyerLvl } from '@/lib/buyerLevel';
import { getTotalDue as getOrderDue } from '@/lib/orderMath';
import { derivePaymentState } from '@/lib/paymentState';
import {
  computeOutstanding, orderCounts, shipmentCounts, buildTransactions, buildHomeDeliveries,
  recentActiveOrder, recentActiveShipment, firstOrderItem, shipmentDue,
} from '@/lib/dashboardData';
import {
  getAllOrdersApiRedux, getAllBookingsOfSingleUserRedux, getAllShipForMeOfSingleUserRedux, getCurrencyRedux,
} from '@/store/actions';
import { CONTACT, whatsappUrl } from '@/data/contact';
import { goHome } from '@/navigation/goHome';
import ProfileCard from '@/components/dashboard/ProfileCard';
import HomeDeliveryModal from '@/components/dashboard/HomeDeliveryModal';
import RecommendedProducts from '@/components/dashboard/RecommendedProducts';
import {
  StatusPanel, RequestAction, QuickList, ServiceCard, TwoCol, ContactPanel, RecentCard, EmptyPanel,
} from '@/components/dashboard/Sections';
import Icon from '@/components/dashboard/icons';
import { SectionHeading, PANEL, D, enIN, openRecord, openList, toMore, toHomeTab, toOrdersTab } from '@/components/dashboard/ui';
import NotificationBar from '@/components/dashboard/NotificationBar';
import { BulkDeliveryButton } from '@/components/orders/BulkDeliveryRequest';

/* ═══════════════════════════════════════════════════════════════════════
   Customer dashboard overview — port of the web's redesigned
   pages/dashboard/page.jsx ("paicart_dashboard_cash_received_history_updated"
   design), wired to the customer's real orders, requests, shipments and
   payment slips. All figures come from lib/dashboardData.js (shared with the
   web verbatim); its web hrefs are mapped to screens in components/dashboard/ui.

   Sections: profile + outstanding due (with transaction history), the two
   status panels, My Request (+ Pathao home-delivery modal), My Account,
   My Services, Information, Get in Touch, Recent Activity, Recommended.

   Data: the three full lists through the same Redux thunks the web uses,
   plus the user's payment slips. A stack keeps this screen mounted, so it
   refetches when it regains focus (at most every 30 s) and on pull-to-refresh.
   ═══════════════════════════════════════════════════════════════════════ */

const EMPTY = [];
const RECOMMEND_FALLBACK = 'Ladies Bags';
const REFOCUS_MS = 30000;
/* back from the background: refresh sooner — the data may have moved on */
const APP_RETURN_MS = 5000;

const SOCIAL = [
  { name: 'phone', label: 'Call', url: `tel:${CONTACT.phone}` },
  { name: 'mail', label: 'Email', url: `mailto:${CONTACT.email}` },
  { name: 'facebook', label: 'Facebook', url: 'https://www.facebook.com/paicart' },
  { name: 'instagram', label: 'Instagram', url: 'https://www.instagram.com/paicart.com.bd' },
  { name: 'youtube', label: 'YouTube', url: 'https://www.youtube.com/@paicart' },
  { name: 'x', label: 'Twitter (X)', url: 'https://x.com/PaicartBD' },
];
const openUrl = (url) => Linking.openURL(url).catch(() => toast.error('Could not open the link.'));

function Section({ children }) {
  return <View>{children}</View>;
}

export default function DashboardOverview() {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const currentUser = useSelector((s) => s.user?.currentUser);
  const taka = useSelector((s) => s.user?.currency?.taka);
  const ordersRaw = useSelector((s) => s.orders?.ordersApi || EMPTY);
  const requestsRaw = useSelector((s) => s.bookingRequests?.bookingsArrayOfSingleUser || EMPTY);
  const shipmentsRaw = useSelector((s) => s.bookingRequests?.shipForMeOfSingleUser || EMPTY);
  const uid = currentUser?.id;

  /* Signed out, the store may still hold the last user's lists. */
  const orders = uid ? ordersRaw : EMPTY;
  const requests = uid ? requestsRaw : EMPTY;
  const shipments = uid ? shipmentsRaw : EMPTY;

  const [loadedFor, setLoadedFor] = useState(null);
  const [paymentRequests, setPaymentRequests] = useState(EMPTY);
  const [refreshing, setRefreshing] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);
  const [deliveryOpen, setDeliveryOpen] = useState(false);
  /* "View my home deliveries" (components/DeliveryMovedSheet) lands here with
     openHomeDelivery: true — open the list, then drop the param so a later
     visit doesn't reopen it. */
  const route = useRoute();
  const openHomeDelivery = !!route.params?.openHomeDelivery;
  useFocusEffect(
    useCallback(() => {
      if (!openHomeDelivery) return;
      setDeliveryOpen(true);
      navigation.setParams({ openHomeDelivery: undefined });
    }, [openHomeDelivery, navigation]),
  );
  const [complaintOpen, setComplaintOpen] = useState(false);
  const loaded = !uid || loadedFor === uid;

  const gen = useRef(0);
  const lastLoad = useRef(0);

  useEffect(() => {
    setPaymentRequests(EMPTY);
    lastLoad.current = 0;
  }, [uid]);

  const load = useCallback(() => {
    if (!uid) return Promise.resolve();
    const g = ++gen.current;
    lastLoad.current = Date.now();
    return Promise.allSettled([
      dispatch(getAllOrdersApiRedux(uid)),
      dispatch(getAllBookingsOfSingleUserRedux(uid)),
      dispatch(getAllShipForMeOfSingleUserRedux(uid)),
      getPaymentRequestsOfUser(uid).then((list) => {
        if (g === gen.current) setPaymentRequests(list || EMPTY);
      }),
    ]).then((results) => {
      results.forEach((r) => r.status === 'rejected' && console.error('dashboard load', r.reason));
      if (g === gen.current) setLoadedFor(uid);
    });
  }, [uid, dispatch]);

  useFocusEffect(
    useCallback(() => {
      if (Date.now() - lastLoad.current > REFOCUS_MS) load();
      /* Coming back to the app (from WhatsApp, the browser, a payment app …)
         is not a navigation focus, so without this the counts stayed as they
         were when the screen was first opened — e.g. Ship For Me To Receive
         stuck at 0 after the admin moved parcels to the Paicart warehouse. */
      const sub = AppState.addEventListener('change', (next) => {
        if (next === 'active' && Date.now() - lastLoad.current > APP_RETURN_MS) load();
      });
      return () => sub.remove();
    }, [load]),
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load().finally(() => setRefreshing(false));
  }, [load]);

  useEffect(() => {
    if (!taka) dispatch(getCurrencyRedux()).catch(() => {});
  }, [taka, dispatch]);

  /* ── Figures ── */
  const outstanding = useMemo(() => computeOutstanding(orders, requests, shipments), [orders, requests, shipments]);
  const oCounts = useMemo(() => orderCounts(orders), [orders]);
  const sCounts = useMemo(() => shipmentCounts(shipments), [shipments]);
  const transactions = useMemo(
    () => buildTransactions({ paymentRequests, orders, requests, shipments }),
    [paymentRequests, orders, requests, shipments],
  );
  const deliveries = useMemo(() => buildHomeDeliveries(orders, requests, shipments), [orders, requests, shipments]);
  const recentOrder = useMemo(() => recentActiveOrder(orders), [orders]);
  const recentShip = useMemo(() => recentActiveShipment(shipments), [shipments]);
  const recentOrderInfo = recentOrder ? firstOrderItem(recentOrder) : null;

  /* Recommended: products like the customer's latest order, else a popular category */
  const recommendKeyword = useMemo(() => {
    const item = recentOrder?.items?.[0];
    return (item?.productType || '').trim() || RECOMMEND_FALLBACK;
  }, [recentOrder]);

  /* ── Actions ── */
  const displayId = currentUser?.userId ? String(currentUser.userId) : uid || '';
  const shippingMark = getShippingMark(currentUser);
  const copyText = useCallback((text, label) => {
    if (!text) {
      toast.error(`${label} is not available.`);
      return;
    }
    try {
      Clipboard.setString(String(text));
      toast.success(`${label} copied`);
    } catch {
      toast.error('Could not copy automatically.');
    }
  }, []);

  const requireLogin = (fn) => () => {
    if (!uid) {
      toast.error('Please login first');
      navigation.navigate('Login', { returnTo: 'DashboardOverview' });
      return;
    }
    fn();
  };

  const [signingOut, setSigningOut] = useState(false);
  const handleLogout = async () => {
    if (!uid) {
      navigation.navigate('Login', { returnTo: 'DashboardOverview' });
      return;
    }
    if (signingOut) return;
    setSigningOut(true);
    try {
      await signOutEverywhere(); // Providers clears user, cart and wishlist
      toast.success('You have been signed out');
      goHome();
    } catch {
      toast.error('Could not sign out. Please try again.');
    }
    setSigningOut(false);
  };

  const toOrders = (tab) => openList(navigation, 'order', tab);
  const toShips = (tab) => openList(navigation, 'ship', tab);
  const closeDelivery = useCallback(() => setDeliveryOpen(false), []);
  const openDeliveryRecord = useCallback(
    (row) => {
      setDeliveryOpen(false);
      openRecord(navigation, row.kind, row.id);
    },
    [navigation],
  );

  const points = parseInt(currentUser?.totalPoints, 10) || 0;
  const level = getLevelMeta(currentUser?.buyerLvl || computeBuyerLvl(points));

  return (
    <DashboardLayout
      webChrome
      title="Dashboard"
      onRefresh={uid ? onRefresh : null}
      refreshing={refreshing}
      overlays={
        <>
          <ComplaintModal visible={complaintOpen} currentUser={currentUser} onClose={() => setComplaintOpen(false)} />
          <HomeDeliveryModal visible={deliveryOpen} rows={deliveries} onClose={closeDelivery} onOpenRecord={openDeliveryRecord} />
        </>
      }
    >
      <View style={{ gap: 18, paddingBottom: 8 }}>
        {/* ── In-app notifications (hidden while signed out) ── */}
        <NotificationBar onPress={() => navigation.navigate('Notifications')} />

        {/* ── Profile + outstanding due ── */}
        <ProfileCard
          user={currentUser}
          displayId={displayId}
          shippingMark={shippingMark}
          onCopy={copyText}
          onEdit={requireLogin(() => toOrdersTab(navigation, 'UserInformation'))}
          outstanding={outstanding}
          loaded={loaded}
          transactions={transactions}
          onBill={(bill) => openRecord(navigation, bill.kind, bill.id)}
        />

        {/* ── Website orders ── */}
        <StatusPanel
          title="Buy & Ship for me"
          subtitle="(Website Order)"
          actionLabel="All Orders"
          onAction={() => toOrders()}
          cards={[
            { icon: 'card', label: 'To Pay', count: oCounts['To Pay'] || 0, onPress: () => toOrders('To Pay') },
            { tone: 'amber', icon: 'package', label: 'To Ship', count: oCounts['To Ship'] || 0, onPress: () => toOrders('To Ship') },
            { tone: 'blue', icon: 'send', label: 'In Shipment', count: oCounts['In Shipment'] || 0, onPress: () => toOrders('In Shipment') },
            { tone: 'indigo', icon: 'warehouse', label: 'To Receive', count: oCounts['To Receive'] || 0, onPress: () => toOrders('To Receive') },
            { tone: 'green', icon: 'checkCircle', label: 'Delivered', count: oCounts.Delivered || 0, onPress: () => toOrders('Delivered') },
          ]}
        />

        {/* ── Ship for me ── */}
        <StatusPanel
          title="Ship for me"
          subtitle="(Only Shipment)"
          actionLabel="All Shipments"
          onAction={() => toShips()}
          cards={[
            { tone: 'amber', icon: 'clock', label: 'Pending', count: sCounts.Pending || 0, onPress: () => toShips('Pending') },
            { tone: 'purple', icon: 'warehouse', label: 'Approved', count: sCounts.Approved || 0, onPress: () => toShips('Approved') },
            { tone: 'blue', icon: 'truck', label: 'In Shipment', count: sCounts['In Shipment'] || 0, onPress: () => toShips('In Shipment') },
            { tone: 'indigo', icon: 'warehouse', label: 'To Receive', count: sCounts['To Receive'] || 0, onPress: () => toShips('To Receive') },
            { tone: 'green', icon: 'checkCircle', label: 'Delivered', count: sCounts.Delivered || 0, onPress: () => toShips('Delivered') },
          ]}
        />

        {/* ── My Request ── */}
        <Section>
          <SectionHeading title="My Request" subtitle="Track the requests you made" />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <RequestAction
              icon="bag"
              title="My Requested Product"
              sub={requests.length ? `${requests.length} product request${requests.length === 1 ? '' : 's'}` : 'View products you asked us to source'}
              onPress={() => openList(navigation, 'request')}
            />
            <RequestAction
              blue
              icon="home"
              title="My Home Delivery Request"
              sub={deliveries.length ? `${deliveries.length} home deliver${deliveries.length === 1 ? 'y' : 'ies'} with Pathao` : 'Check your home delivery requests'}
              onPress={() => setDeliveryOpen(true)}
            />
          </View>
          {/* Bulk Request Delivery — only while something in To Receive can still be requested */}
          <BulkDeliveryButton hideWhenEmpty style={{ marginTop: 10 }} />
        </Section>

        {/* ── My Account ── */}
        <Section>
          <SectionHeading title="My Account" />
          <QuickList
            rows={[
              { icon: 'user', tone: 'blue', title: 'Profile & Address', sub: 'Manage your details and delivery address', onPress: requireLogin(() => toOrdersTab(navigation, 'UserInformation')) },
              { icon: 'lock', tone: 'violet', title: 'Password & Security', sub: 'Protect your account and sign-in', onPress: requireLogin(() => toOrdersTab(navigation, 'UserSecurity')) },
              { icon: 'refund', tone: 'green', title: 'My Refund', sub: 'Check your refund requests and status', onPress: () => toOrdersTab(navigation, 'Refunds') },
              { icon: 'star', tone: 'orange', title: 'Points & Level', sub: `${enIN(points)} points · ${level.label}`, onPress: () => toOrdersTab(navigation, 'Points') },
              {
                icon: 'logout',
                logout: true,
                title: uid ? (signingOut ? 'Signing out…' : 'Log out') : 'Log in',
                sub: uid ? 'Sign out from your Paicart account' : 'Sign in to your Paicart account',
                onPress: handleLogout,
              },
            ]}
          />
        </Section>

        {/* ── My Services ── */}
        <Section>
          <SectionHeading title="My Services" subtitle="Your sourcing shortcuts" />
          <View style={{ ...PANEL, padding: 11 }}>
            <TwoCol>
              <ServiceCard primary icon="sourcing" title="Request for product" sub="We source, purchase and deliver" onPress={() => toMore(navigation, 'BuyForMe')} />
              <ServiceCard primary tone="blue" icon="shipBox" title="Book for Shipment" sub="Ship your China purchases" onPress={() => toMore(navigation, 'ShipForMeForm')} />
            </TwoCol>
            <Press
              onPress={() => setServicesOpen((v) => !v)}
              accessibilityState={{ expanded: servicesOpen }}
              style={({ pressed }) => ({
                flexDirection: 'row', alignItems: 'center', gap: 11, marginTop: 11, paddingHorizontal: 12, paddingVertical: 11,
                borderRadius: 15, borderWidth: 1, borderColor: pressed ? '#d8e2ee' : '#e9edf2', backgroundColor: pressed ? '#f4f7fb' : '#f9fafd',
              })}
            >
              <View style={{ width: 34, height: 34, borderRadius: 11, backgroundColor: '#ffe9d8', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="grid" size={17} color="#d96313" />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ fontSize: 12.5, fontWeight: '800', color: D.ink }}>Explore More Services</Text>
                <Text style={{ fontSize: 10.5, color: '#87919e', marginTop: 2 }}>Notices, tracking, guides, cost tools and support</Text>
              </View>
              <View style={{ width: 25, height: 25, borderRadius: 9, backgroundColor: '#ffffff', alignItems: 'center', justifyContent: 'center', transform: [{ rotate: servicesOpen ? '90deg' : '0deg' }] }}>
                <Icon name="chevronRight" size={13} color={servicesOpen ? D.brandDark : '#8d98a6'} strokeWidth={2} />
              </View>
            </Press>
            {servicesOpen ? (
              <View style={{ marginTop: 10 }}>
                <TwoCol gap={9}>
                  <ServiceCard small icon="megaphone" title="Notice" sub="Stay updated with the latest announcements" onPress={() => toMore(navigation, 'Notices')} />
                  <ServiceCard small tone="blue" icon="pin" title="Track Order" sub="Follow your shipment" onPress={() => toMore(navigation, 'TrackOrder')} />
                  <ServiceCard small tone="violet" icon="book" title="How to Order" sub="Step-by-step guide" onPress={() => toMore(navigation, 'HowToOrder')} />
                  <ServiceCard small tone="blue" icon="calc" title="Cost Calculator" sub="Estimate shipping cost" onPress={() => toMore(navigation, 'CostCalculator')} />
                  <ServiceCard small icon="headset" title="Support" sub="Get help from our team" onPress={() => toMore(navigation, 'Contact')} />
                  <ServiceCard small tone="violet" icon="doc" title="Complain" sub="Submit an issue" onPress={requireLogin(() => setComplaintOpen(true))} />
                </TwoCol>
              </View>
            ) : null}
          </View>
        </Section>

        {/* ── Information ── */}
        <Section>
          <SectionHeading title="Information" />
          <QuickList
            rows={[
              { icon: 'info', tone: 'orange', title: 'About Us', sub: 'Learn more about Paicart', onPress: () => toMore(navigation, 'AboutUs') },
              { icon: 'chat', tone: 'blue', title: 'Contact Us', sub: 'Reach our customer support team', onPress: () => toMore(navigation, 'Contact') },
              { icon: 'question', tone: 'violet', title: 'FAQ', sub: 'Find answers to common questions', onPress: () => toMore(navigation, 'Faq') },
              { icon: 'shield', tone: 'green', title: 'Privacy Policy', sub: 'How we handle your information', onPress: () => toMore(navigation, 'PrivacyPolicy') },
              { icon: 'refund', tone: 'orange', title: 'Refund Policy', sub: 'Understand returns and refund terms', onPress: () => toMore(navigation, 'RefundPolicy') },
              { icon: 'terms', tone: 'slate', title: 'Terms & Conditions', sub: 'Review service terms and conditions', onPress: () => toMore(navigation, 'Terms') },
            ]}
          />
        </Section>

        {/* ── Get in Touch ── */}
        <Section>
          <SectionHeading title="Get in Touch" subtitle="We are here to help" />
          <ContactPanel
            onWhatsApp={() => openUrl(whatsappUrl('Hello Paicart, I need assistance.'))}
            items={SOCIAL.map((s) => ({ ...s, onPress: () => openUrl(s.url) }))}
            note={`Hotline ${CONTACT.phone.replace('+880', '0')} · ${CONTACT.email}`}
          />
        </Section>

        {/* ── Recent Activity ── */}
        <Section>
          <SectionHeading title="Recent Activity" subtitle="Latest order & shipment" />
          {!loaded && !recentOrder && !recentShip ? (
            <EmptyPanel>Loading your latest activity…</EmptyPanel>
          ) : (
            <View style={{ gap: 13 }}>
              {recentOrder ? (
                <RecentCard
                  kind="order"
                  title="Recent Active Order"
                  refLabel="Order ID"
                  reference={recentOrder.orderId}
                  status={derivePaymentState(recentOrder, getOrderDue(recentOrder))}
                  image={recentOrderInfo.image}
                  name={recentOrderInfo.title}
                  time={recentOrder.time}
                  due={getOrderDue(recentOrder)}
                  onDetails={() => openRecord(navigation, 'order', recentOrder.orderId)}
                />
              ) : (
                <EmptyPanel>
                  No orders yet.{' '}
                  <Text onPress={goHome} style={{ color: D.brand, fontWeight: '700' }}>Start shopping →</Text>
                </EmptyPanel>
              )}
              {recentShip ? (
                <RecentCard
                  kind="ship"
                  title="Recent Active Shipment"
                  refLabel="Booking ID"
                  reference={recentShip.bookingId}
                  status={derivePaymentState(recentShip, shipmentDue(recentShip))}
                  image={recentShip.imageUrl}
                  name={recentShip.othersProductName || 'Shipment'}
                  time={recentShip.time}
                  due={shipmentDue(recentShip)}
                  onDetails={() => openRecord(navigation, 'ship', recentShip.bookingId)}
                />
              ) : (
                <EmptyPanel>
                  No shipments yet.{' '}
                  <Text onPress={() => toMore(navigation, 'ShipForMeForm')} style={{ color: D.brand, fontWeight: '700' }}>Book a shipment →</Text>
                </EmptyPanel>
              )}
            </View>
          )}
        </Section>

        {/* ── Recommended Products ── */}
        <RecommendedProducts
          keyword={recommendKeyword}
          taka={taka}
          onOpenProduct={(p) => toHomeTab(navigation, 'Product', { id: String(p.id) })}
          onViewAll={() => toHomeTab(navigation, 'Collection', { id: recommendKeyword })}
          onBrowse={goHome}
        />

        <Text style={{ paddingTop: 12, textAlign: 'center', color: '#a0a7b1', fontSize: 10.5, lineHeight: 17 }}>
          © {new Date().getFullYear()} Paicart{'\n'}Smart Sourcing, Secure Shipping
        </Text>
      </View>
    </DashboardLayout>
  );
}
