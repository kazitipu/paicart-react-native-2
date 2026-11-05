import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Linking, Image, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useScrollToTop } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import Clipboard from '@react-native-clipboard/clipboard';
import Animated, {
  FadeIn,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
  useReducedMotion,
  useAnimatedScrollHandler,
  interpolate,
} from 'react-native-reanimated';
import { markScrolling } from '@/lib/scrollActivity';
import Svg, { Defs, LinearGradient, Stop, Rect, Circle, Path } from 'react-native-svg';
import {
  Ship, Package, MapPin, ListOrdered, Calculator, Bell, Info, Phone,
  HelpCircle, Shield, RotateCcw, FileText, Percent, ChevronRight,
  LogIn, Mail, Heart, Award, Wallet, User, ShoppingBag, ShoppingCart,
  LogOut, Copy, Sparkles, KeyRound, Truck,
} from 'lucide-react-native';
import { CONTACT, whatsappUrl } from '@/data/contact';
import Avatar from '@/components/Avatar';
import { Press, ScalePress } from '@/components/product/ui';
import { signOutEverywhere } from '@/lib/firebase';
import { computeBuyerLvl, getLevelMeta, getLevelProgress } from '@/lib/buyerLevel';
import { toast } from '@/lib/toast';
import { TABS } from '@/navigation/routes';
import pkg from '../../../package.json';
import { decorRing } from '@/lib/decorClock';

const LOGO = require('@/assets/paicart_transparent.png');
const ORANGE = '#FF6A00';
const PAGE_BG = '#f5f5f7';

/* The web keeps all of this in its Footer. A phone has no footer, so the
   fifth tab carries it: account, services, policy pages and contact. */

const SERVICES = [
  { label: 'Ship For Me', sub: 'You buy, we ship', screen: 'ShipForMeForm', Icon: Ship, color: '#FF6A00' },
  { label: 'Request Product', sub: 'We source it for you', screen: 'BuyForMe', Icon: Package, color: '#00B42A' },
  { label: 'Track Order', sub: 'Live parcel status', screen: 'TrackOrder', Icon: MapPin, color: '#1677FF' },
  { label: 'How To Order', sub: '4 simple steps', screen: 'HowToOrder', Icon: ListOrdered, color: '#00B8A9' },
  { label: 'Cost Calculator', sub: 'Estimate shipping', screen: 'CostCalculator', Icon: Calculator, color: '#7C3AED' },
  { label: 'Notices', sub: 'Updates & news', screen: 'Notices', Icon: Bell, color: '#E11D48' },
];

const ACCOUNT = [
  { label: 'My Orders', tab: TABS.ORDERS, screen: 'BuyShipMyOrders', Icon: ShoppingBag, color: '#FF6A00' },
  { label: 'My Shipments', tab: TABS.ORDERS, screen: 'ShipMyRequests', Icon: Truck, color: '#1677FF' },
  { label: 'Points & Level', tab: TABS.ORDERS, screen: 'Points', Icon: Award, color: '#F59E0B' },
  { label: 'Refunds', tab: TABS.ORDERS, screen: 'Refunds', Icon: Wallet, color: '#00B42A' },
  { label: 'Profile & Addresses', tab: TABS.ORDERS, screen: 'UserInformation', Icon: User, color: '#7C3AED' },
  { label: 'Password & Security', tab: TABS.ORDERS, screen: 'UserSecurity', Icon: KeyRound, color: '#475569' },
];

const INFORMATION = [
  { label: 'About Us', screen: 'AboutUs', Icon: Info },
  { label: 'Contact Us', screen: 'Contact', Icon: Phone },
  { label: 'FAQ', screen: 'Faq', Icon: HelpCircle },
  { label: 'Tax & Shipping', screen: 'TaxAndShipping', Icon: Percent },
  { label: 'Privacy Policy', screen: 'PrivacyPolicy', Icon: Shield },
  { label: 'Refund Policy', screen: 'RefundPolicy', Icon: RotateCcw },
  { label: 'Terms & Conditions', screen: 'Terms', Icon: FileText },
];

const CARD = {
  backgroundColor: '#ffffff',
  borderRadius: 20,
  borderWidth: 1,
  borderColor: '#eef0f3',
  boxShadow: '0 6px 20px -12px rgba(15,23,42,0.18)',
};

/* ─── small pieces ─── */

/* lucide dropped brand marks, so the Instagram glyph is drawn here. */
function Instagram({ size = 18, color = '#000' }) {
  return (
    <Svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <Path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <Path d="M17.5 6.5h.01" />
    </Svg>
  );
}

function WaGlyph({ size = 22, color = '#fff' }) {
  return (
    <Svg viewBox="0 0 24 24" width={size} height={size}>
      <Path
        fill={color}
        d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"
      />
    </Svg>
  );
}

function SectionTitle({ children, right }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4, marginBottom: 10 }}>
      <Text style={{ fontSize: 11, fontWeight: '800', letterSpacing: 1.2, color: '#9ca3af', textTransform: 'uppercase' }}>{children}</Text>
      {right}
    </View>
  );
}

function IconChip({ Icon, color, size = 36, iconSize = 17 }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.33, backgroundColor: `${color}17`, alignItems: 'center', justifyContent: 'center' }}>
      <Icon size={iconSize} color={color} strokeWidth={2.1} />
    </View>
  );
}

function Row({ Icon, label, color = '#64748b', onPress, last, value, chip = true }) {
  return (
    <Press
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 14,
        paddingVertical: 12,
        backgroundColor: pressed ? '#f8fafc' : 'transparent',
        borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth,
        borderBottomColor: '#e5e7eb',
      })}
    >
      {chip ? <IconChip Icon={Icon} color={color} size={34} iconSize={16} /> : <Icon size={18} color={color} />}
      <Text style={{ flex: 1, fontSize: 14, fontWeight: '600', color: '#1f2937' }} numberOfLines={1}>{label}</Text>
      {value != null && <Text style={{ fontSize: 12, color: '#9ca3af', marginRight: 2 }}>{value}</Text>}
      <ChevronRight size={16} color="#cbd5e1" />
    </Press>
  );
}

/* Count bubble on the quick-action tiles. */
function Count({ n }) {
  if (!n) return null;
  return (
    <View style={{ position: 'absolute', top: -4, right: -6, minWidth: 18, height: 18, paddingHorizontal: 4, borderRadius: 9, backgroundColor: ORANGE, borderWidth: 2, borderColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: '#fff', fontSize: 9, fontWeight: '800' }}>{n > 99 ? '99+' : n}</Text>
    </View>
  );
}

/* Soft breathing ring behind the WhatsApp icon. */
function PulseRing() {
  const reduce = useReducedMotion();
  /* One ripple per play of the shared decor clock (lib/decorClock). */
  const style = useAnimatedStyle(
    () => (reduce ? { opacity: 0, transform: [{ scale: 1 }] } : decorRing(0.5, 0.6)),
    [reduce],
  );
  return <Animated.View pointerEvents="none" style={[{ position: 'absolute', width: 44, height: 44, borderRadius: 22, backgroundColor: '#ffffff' }, style]} />;
}

/* Hero background: ink → deep orange with two soft glow discs. */
function HeroBg() {
  return (
    <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        <LinearGradient id="moreHero" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#1C1C1C" />
          <Stop offset="0.65" stopColor="#3a1d0b" />
          <Stop offset="1" stopColor="#FF6A00" />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill="url(#moreHero)" />
      <Circle cx="92%" cy="8%" r="90" fill="#FF6A00" opacity="0.22" />
      <Circle cx="4%" cy="100%" r="70" fill="#ffffff" opacity="0.05" />
    </Svg>
  );
}

/* Buyer-level progress bar that fills on mount. */
function LevelBar({ fraction }) {
  const w = useSharedValue(0);
  useEffect(() => {
    w.value = withDelay(250, withTiming(fraction, { duration: 900, easing: Easing.out(Easing.cubic) }));
  }, [fraction, w]);
  const style = useAnimatedStyle(() => ({ width: `${Math.max(4, w.value * 100)}%` }));
  return (
    <View style={{ height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.15)', overflow: 'hidden' }}>
      <Animated.View style={[{ height: 6, borderRadius: 3, backgroundColor: '#FFB067' }, style]} />
    </View>
  );
}

/* ═══════════════════════════════════════ */
export default function More() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const scrollRef = React.useRef(null);
  useScrollToTop(scrollRef);
  /* Light strip behind the status bar, fading in once the dark hero has
     scrolled away so the clock never sits on top of list text. */
  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => {
    markScrolling();
    scrollY.value = e.contentOffset.y;
  });
  const barStyle = useAnimatedStyle(() => ({ opacity: interpolate(scrollY.value, [120, 220], [0, 1], 'clamp') }));

  const currentUser = useSelector((s) => s.user?.currentUser);
  const cart = useSelector((s) => s.cartList?.cart || []);
  const wishlistCount = useSelector((s) => (s.wishlist?.wishlist || []).length);
  const isLoggedIn = !!currentUser?.id;
  const [signingOut, setSigningOut] = useState(false);

  const cartCount = useMemo(
    () =>
      cart.reduce((acc, shop) => {
        shop.items?.forEach((it) => it.skus?.forEach((sku) => { acc += parseInt(sku.totalQuantity || 0, 10) || 0; }));
        return acc;
      }, 0),
    [cart],
  );

  const points = parseInt(currentUser?.totalPoints, 10) || 0;
  const lvl = computeBuyerLvl(points);
  const level = getLevelMeta(lvl);
  const { fraction, pointsToNext, next } = getLevelProgress(points);

  const go = (screen) => navigation.navigate(screen);
  const goTab = (tab, screen) => navigation.navigate(tab, { screen });
  const needLogin = (fn) => () => (isLoggedIn ? fn() : navigation.navigate('Login'));

  const openWhatsApp = () => Linking.openURL(whatsappUrl()).catch(() => {});
  const copy = (text, what) => {
    Clipboard.setString(text);
    toast.success(`${what} copied`);
  };

  const signOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await signOutEverywhere(); // Providers clears user, cart and wishlist
      toast.success('You have been signed out');
    } catch {
      toast.error('Could not sign out. Please try again.');
    }
    setSigningOut(false);
  };

  const QUICK = [
    { label: 'Orders', Icon: ShoppingBag, color: '#FF6A00', onPress: needLogin(() => goTab(TABS.ORDERS, 'BuyShipMyOrders')) },
    { label: 'Cart', Icon: ShoppingCart, color: '#1677FF', count: cartCount, onPress: () => goTab(TABS.CART, 'Cart') },
    { label: 'Wishlist', Icon: Heart, color: '#E11D48', count: wishlistCount, onPress: () => goTab(TABS.HOME, 'Wishlist') },
    { label: 'Track', Icon: MapPin, color: '#00B42A', onPress: () => go('TrackOrder') },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: PAGE_BG }}>
      <Animated.ScrollView ref={scrollRef} onScroll={onScroll} scrollEventThrottle={16} contentContainerStyle={{ paddingBottom: 28 }} showsVerticalScrollIndicator={false}>
        {/* ── Hero ── */}
        <View style={{ paddingTop: insets.top + 14, paddingHorizontal: 16, paddingBottom: 64, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, overflow: 'hidden' }}>
          <HeroBg />
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
            <Image source={LOGO} style={{ width: 96, height: 28, tintColor: '#ffffff' }} resizeMode="contain" />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 }}>
              <Sparkles size={11} color="#FFB067" />
              <Text style={{ color: '#ffffffcc', fontSize: 10, fontWeight: '700' }}>China → Bangladesh</Text>
            </View>
          </View>

          <ScalePress
            onPress={() => (isLoggedIn ? goTab(TABS.ORDERS, 'UserInformation') : navigation.navigate('Login'))}
            scaleTo={0.98}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}
          >
            {isLoggedIn ? (
              <Avatar user={currentUser} sizeClass="w-16 h-16" roundedClass="rounded-2xl" bgClass="bg-white/15" ringClass="border-2 border-white/25" />
            ) : (
              <View style={{ width: 64, height: 64, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' }}>
                <LogIn size={24} color="#ffffff" />
              </View>
            )}
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ color: '#fff', fontSize: 19, fontWeight: '800' }} numberOfLines={1}>
                {isLoggedIn ? currentUser.displayName || 'My Account' : 'Welcome to Paicart'}
              </Text>
              <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12, marginTop: 2 }} numberOfLines={1}>
                {isLoggedIn ? currentUser.email || currentUser.mobileNo : 'Sign in to track orders & shipments'}
              </Text>
              {!isLoggedIn && (
                <View style={{ alignSelf: 'flex-start', marginTop: 8, backgroundColor: ORANGE, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 6 }}>
                  <Text style={{ color: '#fff', fontSize: 12, fontWeight: '800' }}>Sign in / Register</Text>
                </View>
              )}
            </View>
            <ChevronRight size={18} color="rgba(255,255,255,0.5)" />
          </ScalePress>

          {isLoggedIn && (
            <Press onPress={() => goTab(TABS.ORDERS, 'Points')} style={{ marginTop: 16, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 16, padding: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Award size={14} color="#FFB067" />
                  <Text style={{ color: '#fff', fontSize: 12, fontWeight: '800' }}>{level.label}</Text>
                </View>
                <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11, fontWeight: '700' }}>{points.toLocaleString()} pts</Text>
              </View>
              <LevelBar fraction={fraction} />
              <Text style={{ color: 'rgba(255,255,255,0.55)', fontSize: 10, marginTop: 6 }}>
                {next ? `${pointsToNext.toLocaleString()} points to ${next.label}` : 'Top level reached — thank you!'}
              </Text>
            </Press>
          )}
        </View>

        {/* ── Quick actions (overlapping the hero) ── */}
        <Animated.View entering={FadeIn.duration(300)} style={[CARD, { marginHorizontal: 16, marginTop: -44, flexDirection: 'row', paddingVertical: 14 }]}>
          {QUICK.map((q) => (
            <ScalePress key={q.label} onPress={q.onPress} scaleTo={0.9} containerStyle={{ flex: 1 }} style={{ alignItems: 'center', gap: 6 }}>
              <View>
                <IconChip Icon={q.Icon} color={q.color} size={44} iconSize={20} />
                <Count n={q.count} />
              </View>
              <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#374151' }}>{q.label}</Text>
            </ScalePress>
          ))}
        </Animated.View>

        <View style={{ paddingHorizontal: 16, gap: 22, marginTop: 18 }}>
          {/* ── WhatsApp ── */}
          <Animated.View entering={FadeIn.duration(300).delay(60)}>
            <ScalePress onPress={openWhatsApp} scaleTo={0.98} style={{ borderRadius: 20, overflow: 'hidden', boxShadow: '0 10px 24px -12px rgba(37,211,102,0.7)' }}>
              <Svg style={StyleSheet.absoluteFill}>
                <Defs>
                  <LinearGradient id="wa" x1="0" y1="0" x2="1" y2="1">
                    <Stop offset="0" stopColor="#25D366" />
                    <Stop offset="1" stopColor="#128C7E" />
                  </LinearGradient>
                </Defs>
                <Rect x="0" y="0" width="100%" height="100%" fill="url(#wa)" />
              </Svg>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 }}>
                <View style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
                  <PulseRing />
                  <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}>
                    <WaGlyph />
                  </View>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>Chat on WhatsApp</Text>
                  <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 11, marginTop: 1 }}>{CONTACT.hours}</Text>
                </View>
                <View style={{ backgroundColor: '#fff', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 }}>
                  <Text style={{ color: '#128C7E', fontSize: 12, fontWeight: '800' }}>Chat</Text>
                </View>
              </View>
            </ScalePress>
          </Animated.View>

          {/* ── Services grid ── */}
          <Animated.View entering={FadeIn.duration(300).delay(120)}>
            <SectionTitle>Our Services</SectionTitle>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {SERVICES.map((s) => (
                <ScalePress
                  key={s.screen}
                  onPress={() => go(s.screen)}
                  scaleTo={0.95}
                  containerStyle={{ width: '31.5%', flexGrow: 1 }}
                  style={[CARD, { flexGrow: 1, padding: 12, borderRadius: 18, gap: 8 }]}
                >
                  <IconChip Icon={s.Icon} color={s.color} size={38} iconSize={18} />
                  <View>
                    <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#111827' }} numberOfLines={1}>{s.label}</Text>
                    <Text style={{ fontSize: 10, color: '#9ca3af', marginTop: 1 }} numberOfLines={1}>{s.sub}</Text>
                  </View>
                </ScalePress>
              ))}
            </View>
          </Animated.View>

          {/* ── Account ── */}
          <Animated.View entering={FadeIn.duration(300).delay(180)}>
            <SectionTitle>My Account</SectionTitle>
            <View style={[CARD, { overflow: 'hidden' }]}>
              {ACCOUNT.map((a, i) => (
                <Row
                  key={a.screen}
                  Icon={a.Icon}
                  color={a.color}
                  label={a.label}
                  onPress={needLogin(() => goTab(a.tab, a.screen))}
                  last={i === ACCOUNT.length - 1}
                />
              ))}
            </View>
          </Animated.View>

          {/* ── Information ── */}
          <Animated.View entering={FadeIn.duration(300).delay(240)}>
            <SectionTitle>Information</SectionTitle>
            <View style={[CARD, { overflow: 'hidden' }]}>
              {INFORMATION.map((a, i) => (
                <Row key={a.screen} Icon={a.Icon} color="#64748b" label={a.label} onPress={() => go(a.screen)} last={i === INFORMATION.length - 1} />
              ))}
            </View>
          </Animated.View>

          {/* ── Contact ── */}
          <Animated.View entering={FadeIn.duration(300).delay(300)}>
            <SectionTitle>Get in touch</SectionTitle>
            <View style={[CARD, { padding: 14, gap: 12 }]}>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                {[
                  { label: 'Call', Icon: Phone, color: '#1677FF', onPress: () => Linking.openURL(`tel:${CONTACT.phone}`) },
                  { label: 'Email', Icon: Mail, color: '#FF6A00', onPress: () => Linking.openURL(`mailto:${CONTACT.email}`) },
                  { label: 'Instagram', Icon: Instagram, color: '#E11D48', onPress: () => Linking.openURL(CONTACT.instagram) },
                ].map((c) => (
                  <ScalePress
                    key={c.label}
                    onPress={c.onPress}
                    scaleTo={0.94}
                    containerStyle={{ flex: 1 }}
                    style={{ alignItems: 'center', gap: 6, paddingVertical: 12, borderRadius: 14, backgroundColor: `${c.color}0f` }}
                  >
                    <c.Icon size={18} color={c.color} />
                    <Text style={{ fontSize: 11.5, fontWeight: '700', color: c.color }}>{c.label}</Text>
                  </ScalePress>
                ))}
              </View>

              {[
                { Icon: Phone, text: CONTACT.phone, what: 'Phone number' },
                { Icon: Mail, text: CONTACT.email, what: 'Email' },
                { Icon: MapPin, text: CONTACT.address, what: 'Address' },
              ].map((c) => (
                <Press
                  key={c.what}
                  onPress={() => copy(c.text, c.what)}
                  style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 10, opacity: pressed ? 0.6 : 1 })}
                >
                  <c.Icon size={15} color="#94a3b8" />
                  <Text style={{ flex: 1, fontSize: 12.5, color: '#475569' }}>{c.text}</Text>
                  <Copy size={14} color="#cbd5e1" />
                </Press>
              ))}
            </View>
          </Animated.View>

          {/* ── Sign out ── */}
          {isLoggedIn && (
            <Animated.View entering={FadeIn.duration(300).delay(340)}>
              <ScalePress
                onPress={signOut}
                disabled={signingOut}
                scaleTo={0.97}
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 16, backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fee2e2', opacity: signingOut ? 0.6 : 1 }}
              >
                <LogOut size={16} color="#dc2626" />
                <Text style={{ color: '#dc2626', fontSize: 14, fontWeight: '800' }}>{signingOut ? 'Signing out…' : 'Sign Out'}</Text>
              </ScalePress>
            </Animated.View>
          )}

          {/* ── Footer ── */}
          <View style={{ alignItems: 'center', paddingTop: 4 }}>
            <Image source={LOGO} style={{ width: 92, height: 28, opacity: 0.85 }} resizeMode="contain" />
            <Text style={{ fontSize: 10.5, color: '#9ca3af', marginTop: 6 }}>Version {pkg.version} · © 2025–2027 Paicart.com</Text>
            <Text style={{ fontSize: 10, color: '#cbd5e1', marginTop: 2 }}>Made for shoppers in Bangladesh 🇧🇩</Text>
          </View>
        </View>
      </Animated.ScrollView>
      <Animated.View
        pointerEvents="none"
        style={[{ position: 'absolute', top: 0, left: 0, right: 0, height: insets.top, backgroundColor: PAGE_BG, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#e5e7eb' }, barStyle]}
      />
    </View>
  );
}
