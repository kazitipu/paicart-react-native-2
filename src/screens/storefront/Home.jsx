import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { View, Text, Pressable, ScrollView, Image, RefreshControl, Dimensions, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useScrollToTop, useIsFocused } from '@react-navigation/native';
import useNow from '@/lib/useNow';
import { markScrolling } from '@/lib/scrollActivity';
import { useSelector, useDispatch } from 'react-redux';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedScrollHandler,
  useAnimatedRef,
  withTiming,
  withRepeat,
  withSequence,
  withSpring,
  Easing,
  FadeIn,
  FadeInDown,
  LinearTransition,
  runOnJS,
} from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import {
  ChevronRight, ChevronDown, ArrowRight, Ship, Package, BookOpen, MapPin, HelpCircle,
} from 'lucide-react-native';
import {
  getAllBannersRedux, getAllCampaignsRedux, getCurrencyRedux, getSiteDiscountRedux,
} from '@/store/actions';
import { searchProducts } from '@/lib/api';
import { imageSource } from '@/lib/cdn';
import { QUICK_CATEGORIES, CATEGORY_SECTIONS, HOME_FAQS, HOME_FAQ_PROHIBITED } from '@/data/homeContent';
import Header from '@/components/Header';
import HomeProductCard, { HomeProductCardSkeleton } from '@/components/home/HomeProductCard';
import ProductImage from '@/components/ui/ProductImage';
import Sweep from '@/components/ui/Sweep';
import SupportFab from '@/components/SupportFab';
import { TABS } from '@/navigation/routes';
import { decorWave, decorRing } from '@/lib/decorClock';
import { FlashList } from '@shopify/flash-list';

/* ═══════════════════════════════════════════════════════════════════════
   HOME — a port of paicart-nextjs15 src/app/page.jsx at its mobile
   breakpoint (< 640px). Section order, copy, colours and spacing follow the
   web exactly:
     banner → campaigns → services → categories → products → trust → FAQ
   Native-only additions are motion and touch affordances: swipeable banner,
   press feedback, staggered card entrances, animated FAQ accordion, pull to
   refresh, hide-on-scroll header and tap-tab-to-scroll-top.
   ═══════════════════════════════════════════════════════════════════════ */

const { width: SCREEN_W } = Dimensions.get('window');
/* Reanimated's scroll handler drives the hide-on-scroll header. */
const AnimatedFlashList = Animated.createAnimatedComponent(FlashList);

const PAGE_PX = 8; // px-2
const CONTENT_W = SCREEN_W - PAGE_PX * 2;
const GRID_GAP = 12; // gap-3
const RED = '#e62222';
const ORANGE = '#FF6A00';

const SHADOW_SM = '0 1px 2px 0 rgba(0,0,0,0.05)';
const SHADOW_MD = '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1)';

const chunk = (arr, n) => {
  const out = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
};

/* ─── Section heading ─── */
function SectionHeading({ title, subtitle, onViewAll }) {
  return (
    <View className="flex-row items-end justify-between mb-5">
      <View className="flex-shrink">
        <View className="flex-row items-center mb-0.5" style={{ gap: 10 }}>
          <View className="w-1 h-5 rounded-full" style={{ backgroundColor: RED }} />
          <Text className="font-extrabold text-gray-900" style={{ fontSize: 17, letterSpacing: -0.425 }}>
            {title}
          </Text>
        </View>
        {subtitle ? (
          <Text className="text-xs text-gray-400" style={{ paddingLeft: 14 }}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {onViewAll && (
        <Pressable onPress={onViewAll} hitSlop={8} className="flex-row items-center active:opacity-60" style={{ gap: 4 }}>
          <Text className="text-xs font-semibold" style={{ color: RED }}>View All</Text>
          <ChevronRight size={13} color={RED} />
        </Pressable>
      )}
    </View>
  );
}

/* ─── Banner carousel ─── */
function Spinner() {
  const r = useSharedValue(0);
  useEffect(() => {
    r.value = withRepeat(withTiming(1, { duration: 900, easing: Easing.linear }), -1);
  }, [r]);
  const style = useAnimatedStyle(() => ({ transform: [{ rotate: `${360 * r.value}deg` }] }));
  return (
    <Animated.View
      className="w-10 h-10 rounded-full border-4 border-gray-300"
      style={[{ borderTopColor: '#6b7280' }, style]}
    />
  );
}

function BannerSkeleton() {
  return (
    <View
      className="overflow-hidden rounded-2xl bg-gray-200 items-center justify-center"
      style={{ width: CONTENT_W, aspectRatio: 5 / 2, boxShadow: SHADOW_MD }}
    >
      <Sweep duration={1600} opacity={0.45} bandRatio={1} />
      <Spinner />
    </View>
  );
}

function Dot({ active, onPress }) {
  const style = useAnimatedStyle(() => ({
    width: withTiming(active ? 24 : 8, { duration: 300 }),
    opacity: withTiming(active ? 1 : 0.5, { duration: 300 }),
  }));
  return (
    <Pressable onPress={onPress} hitSlop={6}>
      <Animated.View className="h-2 rounded-full bg-white" style={style} />
    </Pressable>
  );
}

function BannerSlider({ banners }) {
  const scrollRef = useRef(null);
  const [current, setCurrent] = useState(0);
  /* The container takes the first banner's own aspect ratio so the whole
     artwork is visible, as on the web; 5:2 until it is known. */
  const [ratio, setRatio] = useState(5 / 2);
  const [dragging, setDragging] = useState(false);
  const firstUri = banners[0] && (banners[0].imageUrl || banners[0].banner || banners[0].image);

  useEffect(() => {
    const src = imageSource(firstUri);
    if (!src?.uri) return;
    Image.getSizeWithHeaders?.(src.uri, src.headers || {}, (w, h) => {
      if (w && h) setRatio(w / h);
    }, () => {});
  }, [firstUri]);

  const goTo = useCallback((i) => {
    scrollRef.current?.scrollTo({ x: i * CONTENT_W, animated: true });
    setCurrent(i);
  }, []);

  /* Auto-advance every 4s; a swipe restarts the clock. Paused while Home is
     covered by another screen in its stack — it stays mounted there. */
  const isFocused = useIsFocused();
  useEffect(() => {
    if (banners.length < 2 || dragging || !isFocused) return undefined;
    const t = setInterval(() => {
      setCurrent((p) => {
        const next = (p + 1) % banners.length;
        scrollRef.current?.scrollTo({ x: next * CONTENT_W, animated: true });
        return next;
      });
    }, 4000);
    return () => clearInterval(t);
  }, [banners.length, dragging, isFocused]);

  if (!banners.length) return <BannerSkeleton />;

  const height = CONTENT_W / ratio;
  return (
    <Animated.View
      entering={FadeIn.duration(350)}
      className="overflow-hidden rounded-2xl bg-gray-100"
      style={{ width: CONTENT_W, height, boxShadow: SHADOW_MD }}
    >
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScrollBeginDrag={() => setDragging(true)}
        onMomentumScrollEnd={(e) => {
          setDragging(false);
          setCurrent(Math.round(e.nativeEvent.contentOffset.x / CONTENT_W));
        }}
      >
        {banners.map((b, i) => (
          <ProductImage
            key={b.id ?? i}
            uri={b.imageUrl || b.banner || b.image}
            style={{ width: CONTENT_W, height }}
            resizeMode="contain"
          />
        ))}
      </ScrollView>

      {banners.length > 1 && (
        <View className="absolute bottom-3 left-0 right-0 flex-row justify-center" style={{ gap: 6 }} pointerEvents="box-none">
          {banners.map((_, i) => (
            <Dot key={i} active={i === current} onPress={() => goTo(i)} />
          ))}
        </View>
      )}
    </Animated.View>
  );
}

/* ─── Campaign card ─── */
const BN_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
const toBn = (n) => String(n).split('').map((ch) => BN_DIGITS[ch] ?? ch).join('');

function LiveDot() {
  /* Pulses once per play of the shared decor clock (lib/decorClock). */
  const style = useAnimatedStyle(() => {
    const t = decorWave();
    return { opacity: 1 - 0.6 * t, transform: [{ scale: 1 - 0.2 * t }] };
  });
  return <Animated.View className="w-1.5 h-1.5 rounded-full" style={[{ backgroundColor: ORANGE }, style]} />;
}

function TickSeconds({ seconds }) {
  const s = useSharedValue(1);
  useEffect(() => {
    s.value = withSequence(
      withTiming(1.3, { duration: 165, easing: Easing.bezier(0.25, 0.46, 0.45, 0.94) }),
      withTiming(1, { duration: 385, easing: Easing.bezier(0.25, 0.46, 0.45, 0.94) }),
    );
  }, [seconds, s]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return (
    <Animated.View className="rounded-md px-1 py-0.5" style={[{ backgroundColor: 'rgba(255,255,255,0.15)' }, style]}>
      <Text className="text-white font-extrabold" style={{ fontSize: 9, lineHeight: 12, fontVariant: ['tabular-nums'] }}>
        {toBn(seconds)}
      </Text>
    </Animated.View>
  );
}

function BottomFade() {
  /* bg-gradient-to-t from-black/80 via-black/10 to-transparent */
  return (
    <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        <LinearGradient id="campaignFade" x1="0" y1="1" x2="0" y2="0">
          <Stop offset="0" stopColor="#000" stopOpacity="0.8" />
          <Stop offset="0.5" stopColor="#000" stopOpacity="0.1" />
          <Stop offset="1" stopColor="#000" stopOpacity="0" />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill="url(#campaignFade)" />
    </Svg>
  );
}

function CampaignCard({ c, index }) {
  const navigation = useNavigation();
  const target = c.expiryDate ? new Date(c.expiryDate).getTime() : null;
  const now = useNow(1000, !!target);

  const remaining = target ? target - now : null;

  let primaryLabel = null;
  let seconds = 0;
  if (remaining != null && remaining > 0) {
    const days = Math.floor(remaining / 86400000);
    const hours = Math.floor((remaining % 86400000) / 3600000);
    const minutes = Math.floor((remaining % 3600000) / 60000);
    seconds = Math.floor((remaining % 60000) / 1000);
    primaryLabel =
      days > 0
        ? `${toBn(days)} দিন ${toBn(hours)} ঘণ্টা`
        : hours > 0
          ? `${toBn(hours)} ঘণ্টা ${toBn(minutes)} মিনিট`
          : `${toBn(minutes)} মিনিট`;
  }

  const campaignImg = c.banner || c.imageUrl || c.image;
  const open = () =>
    navigation.navigate('Collection', {
      id: c.categoryId || 'all',
      ...(c.name ? { campaignName: c.name } : {}),
      ...(campaignImg ? { campaignImage: campaignImg } : {}),
    });

  const press = useSharedValue(1);
  const pressStyle = useAnimatedStyle(() => ({ transform: [{ scale: press.value }] }));

  return (
    <Animated.View entering={FadeInDown.delay(index * 60).duration(350)} style={{ flex: 1 }}>
    <Animated.View style={[{ flex: 1 }, pressStyle]}>
      <Pressable
        onPress={open}
        onPressIn={() => { press.value = withTiming(0.97, { duration: 100 }); }}
        onPressOut={() => { press.value = withTiming(1, { duration: 160 }); }}
        className="overflow-hidden rounded-2xl"
        style={{ boxShadow: `${SHADOW_MD}, 0 0 0 1px rgba(0,0,0,0.05)` }}
      >
        <ProductImage uri={campaignImg} className="w-full" style={{ height: 112 }} resizeMode="cover" />
        <BottomFade />

        {primaryLabel && (
          <View
            className="absolute top-2 right-2 flex-row items-center rounded-full border"
            style={{
              gap: 4,
              paddingLeft: 6,
              paddingRight: 8,
              paddingVertical: 4,
              backgroundColor: 'rgba(0,0,0,0.7)',
              borderColor: 'rgba(255,255,255,0.15)',
              boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)',
            }}
          >
            <LiveDot />
            <Text className="text-white font-bold" style={{ fontSize: 9, lineHeight: 12, letterSpacing: 0.225 }} numberOfLines={1}>
              {primaryLabel}
            </Text>
            <TickSeconds seconds={seconds} />
          </View>
        )}

        <View className="absolute bottom-0 left-0 right-0 flex-row items-end justify-between" style={{ gap: 8, paddingHorizontal: 10, paddingVertical: 8 }}>
          <Text
            className="flex-1 text-white font-bold text-xs"
            style={{ lineHeight: 16.5, textShadowColor: 'rgba(0,0,0,0.25)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 }}
            numberOfLines={2}
          >
            {c.name}
          </Text>
          <View className="w-6 h-6 rounded-full items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}>
            <ArrowRight size={12} color="#ffffff" />
          </View>
        </View>
      </Pressable>
    </Animated.View>
    </Animated.View>
  );
}

/* ─── Services ─── */
const SERVICES = [
  {
    Icon: Ship, title: 'Ship For Me',
    desc: 'Already bought from China? Send the parcel to our warehouse and we handle the rest.',
    cta: 'Start Shipping', screen: 'ShipForMeForm', color: '#FF6A00', light: '#FFA24D', tag: 'Fast & Reliable',
  },
  {
    Icon: Package, title: 'Request Product',
    desc: "Can't find what you need? Describe the product and our team will source it directly from China.",
    /* /pages/request-for-product redirects to /pages/buy-for-me (routes.js REDIRECTS) */
    cta: 'Request Now', screen: 'BuyForMe', color: '#00B42A', light: '#4CD964', tag: 'Custom Sourcing',
  },
  {
    Icon: BookOpen, title: 'How to Order',
    desc: 'New to Paicart? Follow our simple 4-step guide to place your first order from China.',
    cta: 'View Guide', screen: 'HowToOrder', color: '#00B8A9', light: '#3FDCCB', tag: 'Quick Guide',
  },
  {
    Icon: MapPin, title: 'Track Order',
    desc: 'Follow your shipment in real time — from China warehouse all the way to your address.',
    cta: 'Track Now', screen: 'TrackOrder', color: '#1677FF', light: '#5BA3FF', tag: 'Live Updates',
  },
];

/* Services card — a richer native take on the web tile: a soft colour wash,
   a gradient icon tile with a matching glow that gently floats, a faded
   watermark of the icon, a pulsing tag dot, an oversized index number and a
   full-width pill CTA whose arrow slides on press. Cards stagger in. */
function PulseDot({ color }) {
  /* One ripple per play of the shared decor clock (lib/decorClock). */
  const ring = useAnimatedStyle(() => decorRing(0.6, 1.6));
  return (
    <View className="w-1.5 h-1.5 items-center justify-center">
      <Animated.View className="absolute w-1.5 h-1.5 rounded-full" style={[{ backgroundColor: color }, ring]} />
      <View className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
    </View>
  );
}

function ServiceCard({ s, i }) {
  const navigation = useNavigation();
  const press = useSharedValue(1);
  const nudge = useSharedValue(0);
  const cardStyle = useAnimatedStyle(() => ({ transform: [{ scale: press.value }] }));
  /* Floats once per play of the shared decor clock, in step with every other
     decoration, so Home is completely still between plays. */
  const iconStyle = useAnimatedStyle(() => ({ transform: [{ translateY: -3 * decorWave() }] }));
  const arrowStyle = useAnimatedStyle(() => ({ transform: [{ translateX: nudge.value }] }));

  const bgId = `svcBg${i}`;
  const iconId = `svcIcon${i}`;

  return (
    <Animated.View entering={FadeInDown.delay(i * 90).duration(420).springify().damping(16)} style={{ flex: 1 }}>
    <Animated.View style={[{ flex: 1 }, cardStyle]}>
      <Pressable
        onPress={() => navigation.navigate(TABS.MORE, { screen: s.screen })}
        onPressIn={() => {
          press.value = withTiming(0.96, { duration: 110 });
          nudge.value = withTiming(4, { duration: 160 });
        }}
        onPressOut={() => {
          press.value = withSpring(1, { damping: 11, stiffness: 260 });
          nudge.value = withSpring(0, { damping: 10, stiffness: 220 });
        }}
        className="flex-grow rounded-3xl overflow-hidden bg-white"
        style={{
          borderWidth: 1,
          borderColor: `${s.color}1f`,
          boxShadow: `0 10px 24px -12px ${s.color}59, 0 2px 8px -2px rgba(28,28,28,0.06)`,
        }}
      >
        {/* Colour wash, strongest in the top-right corner */}
        <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
          <Defs>
            <LinearGradient id={bgId} x1="1" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={s.color} stopOpacity="0.13" />
              <Stop offset="0.55" stopColor={s.color} stopOpacity="0.03" />
              <Stop offset="1" stopColor="#ffffff" stopOpacity="0" />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${bgId})`} />
        </Svg>

        {/* Faded watermark of the icon */}
        <View pointerEvents="none" className="absolute" style={{ right: -18, bottom: 34, opacity: 0.07, transform: [{ rotate: '-14deg' }] }}>
          <s.Icon size={92} color={s.color} strokeWidth={1.6} />
        </View>

        {/* Oversized index */}
        <Text
          className="absolute font-black"
          style={{ top: 10, right: 14, fontSize: 26, lineHeight: 28, letterSpacing: -1, color: `${s.color}2e` }}
        >
          {String(i + 1).padStart(2, '0')}
        </Text>

        <View className="flex-grow" style={{ padding: 14 }}>
          {/* Gradient icon tile with glow */}
          <Animated.View
            className="w-11 h-11 rounded-2xl overflow-hidden items-center justify-center"
            style={[{ boxShadow: `0 8px 16px -6px ${s.color}b3` }, iconStyle]}
          >
            <Svg style={StyleSheet.absoluteFill}>
              <Defs>
                <LinearGradient id={iconId} x1="0" y1="0" x2="1" y2="1">
                  <Stop offset="0" stopColor={s.light} />
                  <Stop offset="1" stopColor={s.color} />
                </LinearGradient>
              </Defs>
              <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${iconId})`} />
            </Svg>
            <s.Icon size={20} color="#ffffff" strokeWidth={2.2} />
          </Animated.View>

          {/* Tag */}
          <View className="flex-row items-center mt-3" style={{ gap: 5 }}>
            <PulseDot color={s.color} />
            <Text className="font-bold uppercase" style={{ fontSize: 9, lineHeight: 12, letterSpacing: 0.6, color: s.color }} numberOfLines={1}>
              {s.tag}
            </Text>
          </View>

          <Text className="text-gray-900 font-extrabold mt-1" style={{ fontSize: 15, lineHeight: 19, letterSpacing: -0.2 }} numberOfLines={1}>
            {s.title}
          </Text>

          <Text className="text-gray-500 flex-grow mt-1.5" style={{ fontSize: 11, lineHeight: 15.5 }} numberOfLines={4}>
            {s.desc}
          </Text>

          {/* Pill CTA */}
          <View
            className="flex-row items-center justify-between rounded-full mt-3"
            style={{ backgroundColor: `${s.color}14`, paddingLeft: 12, paddingRight: 4, paddingVertical: 4 }}
          >
            <Text className="font-bold" style={{ fontSize: 11.5, color: s.color }} numberOfLines={1}>
              {s.cta}
            </Text>
            <Animated.View
              className="w-6 h-6 rounded-full items-center justify-center"
              style={[{ backgroundColor: s.color }, arrowStyle]}
            >
              <ArrowRight size={13} color="#ffffff" strokeWidth={2.6} />
            </Animated.View>
          </View>
        </View>
      </Pressable>
    </Animated.View>
    </Animated.View>
  );
}

/* ─── Browse by category ─── */
function CategoryTile({ c }) {
  const navigation = useNavigation();
  const press = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: press.value }] }));
  const [pressed, setPressed] = useState(false);
  return (
    <Pressable
      className="flex-1"
      onPress={() => navigation.navigate('Collection', { id: c.href.split('/').pop() })}
      onPressIn={() => { setPressed(true); press.value = withTiming(1.1, { duration: 150 }); }}
      onPressOut={() => { setPressed(false); press.value = withTiming(1, { duration: 150 }); }}
    >
      <View
        className="bg-white rounded-xl py-3 px-2 items-center border-2"
        style={{ gap: 6, borderColor: pressed ? RED : 'transparent' }}
      >
        <Animated.View
          className="w-10 h-10 rounded-xl items-center justify-center"
          style={[{ backgroundColor: `${c.color}14` }, style]}
        >
          <c.Icon size={19} strokeWidth={2} color={c.color} />
        </Animated.View>
        <Text
          className="font-semibold text-center"
          style={{ fontSize: 10.5, lineHeight: 13.1, color: pressed ? RED : '#4b5563' }}
          numberOfLines={1}
        >
          {c.name}
        </Text>
      </View>
    </Pressable>
  );
}

/* ─── Product sections, flattened into list rows ───
   Home owns the fetch (state per category) so nothing refetches as rows
   recycle. Each section used to be ONE list item holding its whole 12-card
   grid, so a section scrolling into view built six rows of cards in a single
   frame — the remaining Home stutter on a budget phone. Now a section is a
   heading row plus one row per pair of cards, virtualized and recycled by
   FlashList one row at a time. Rows carry the section's white band, so the
   page looks the same. */
const SECTION_IDLE = { loading: true, failed: false, products: [] };
const SKELETON_ROWS = 2;

const SectionHeadRow = React.memo(function SectionHeadRow({ title, categoryId, first }) {
  const navigation = useNavigation();
  return (
    <View
      style={[
        { paddingHorizontal: PAGE_PX, paddingTop: 28, backgroundColor: '#ffffff' },
        !first && { borderTopWidth: 1, borderTopColor: '#f3f4f6' },
      ]}
    >
      <SectionHeading title={title} onViewAll={() => navigation.navigate('Collection', { id: categoryId })} />
    </View>
  );
});

const SectionFailedRow = React.memo(function SectionFailedRow({ categoryId, onRetry }) {
  return (
    <View style={{ paddingHorizontal: PAGE_PX, paddingBottom: 28, backgroundColor: '#ffffff' }}>
      <View className="items-center py-8" style={{ gap: 12 }}>
        <Text style={{ fontSize: 30 }}>📦</Text>
        <Text className="text-sm text-gray-400">Couldn't load products</Text>
        <Pressable
          onPress={() => onRetry(categoryId)}
          className="rounded-full px-4 py-1.5 border active:bg-red-50"
          style={{ borderColor: RED }}
        >
          <Text className="text-xs font-semibold" style={{ color: RED }}>Try again</Text>
        </Pressable>
      </View>
    </View>
  );
});

const ProductRow = React.memo(function ProductRow({ items, loading, last, taka }) {
  return (
    <View style={{ paddingHorizontal: PAGE_PX, paddingBottom: last ? 28 : GRID_GAP, backgroundColor: '#ffffff' }}>
      <View className="flex-row" style={{ gap: GRID_GAP }}>
        {items.map((p, j) =>
          loading ? (
            <HomeProductCardSkeleton key={j} />
          ) : (
            <View key={p.id ?? j} style={{ flex: 1 }}>
              <HomeProductCard product={p} taka={taka} />
            </View>
          ),
        )}
        {items.length === 1 && <View style={{ flex: 1 }} />}
      </View>
    </View>
  );
});

/* ─── Trust bar ─── */
const TRUST = [
  { emoji: '🛒', title: 'Easy Ordering', desc: 'Share any product link or describe what you want — we handle the rest.' },
  { emoji: '📍', title: 'Realtime Tracking', desc: 'Follow your parcel live at every step — from China warehouse to your door.' },
  { emoji: '🚚', title: 'Reliable Delivery', desc: 'Safe, on-time import shipping from China to Bangladesh at competitive rates.' },
];

/* ─── FAQ ─── */
function FaqItem({ faq, i, open, onToggle }) {
  const rot = useAnimatedStyle(() => ({
    transform: [{ rotate: withTiming(open ? '180deg' : '0deg', { duration: 200 }) }],
  }));
  return (
    <Animated.View
      layout={LinearTransition.duration(220)}
      className="bg-white rounded-2xl border overflow-hidden"
      style={{ borderColor: open ? 'rgba(255,106,0,0.3)' : '#f3f4f6', boxShadow: SHADOW_SM }}
    >
      <Pressable onPress={onToggle} className="flex-row items-center px-5 py-4 active:bg-gray-50" style={{ gap: 12 }}>
        <View
          className="w-7 h-7 rounded-xl items-center justify-center"
          style={{ backgroundColor: open ? ORANGE : '#f3f4f6' }}
        >
          <Text className="text-xs font-extrabold" style={{ color: open ? '#ffffff' : '#6b7280' }}>{i + 1}</Text>
        </View>
        <Text className="text-sm font-semibold text-gray-800 flex-1 pr-2">{faq.q}</Text>
        <Animated.View style={rot}>
          <ChevronDown size={16} color={open ? ORANGE : '#9ca3af'} />
        </Animated.View>
      </Pressable>

      {open && (
        <Animated.View entering={FadeIn.duration(220)} className="px-5 pb-5 border-t border-gray-50">
          <View className="pt-3 pl-10">
            <Text className="text-sm text-gray-600" style={{ lineHeight: 22.75 }}>{faq.a}</Text>
            {faq.prohibited && (
              <View className="mt-4 bg-red-50 rounded-xl p-3 border border-red-100">
                <Text className="text-xs font-bold text-red-600 mb-2">আমদানি নিষিদ্ধ পণ্য:</Text>
                <View className="flex-row flex-wrap" style={{ gap: 6 }}>
                  {HOME_FAQ_PROHIBITED.map((item, k) => (
                    <View key={k} className="bg-white rounded-full border border-red-200 px-2 py-0.5">
                      <Text className="text-xs text-red-700">❌ {item}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>
        </Animated.View>
      )}
    </Animated.View>
  );
}

/* ═══════════════════════════════════════
   HOMEPAGE
═══════════════════════════════════════ */
export default function Home() {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();

  const banners = useSelector((s) => s.orders?.banners || []);
  const campaigns = useSelector((s) => s.orders?.campaigns || []);
  const taka = useSelector((s) => s.user?.currency?.taka);
  const [openFaq, setOpenFaq] = useState(-1);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(() => {
    dispatch(getAllBannersRedux());
    dispatch(getAllCampaignsRedux());
    dispatch(getCurrencyRedux());
    dispatch(getSiteDiscountRedux());
  }, [dispatch]);

  useEffect(() => {
    load();
  }, [load]);

  /* ── Product sections: all six fetch at once, as on the web ── */
  const [sections, setSections] = useState({});

  const fetchSection = useCallback((categoryId) => {
    setSections((m) => ({ ...m, [categoryId]: { ...(m[categoryId] || SECTION_IDLE), loading: true, failed: false } }));
    /* searchProducts retries twice, 1.5s apart — the web's tryFetch(2). */
    searchProducts(categoryId)
      .then((res) => {
        const list = res.data?.products || [];
        setSections((m) => ({ ...m, [categoryId]: { loading: false, failed: false, products: list.slice(0, 12) } }));
      })
      .catch(() => {
        setSections((m) => ({ ...m, [categoryId]: { ...(m[categoryId] || SECTION_IDLE), loading: false, failed: true } }));
      });
  }, []);

  const fetchAllSections = useCallback(() => {
    CATEGORY_SECTIONS.forEach((s) => fetchSection(s.categoryId));
  }, [fetchSection]);

  useEffect(() => {
    fetchAllSections();
  }, [fetchAllSections]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
    fetchAllSections();
    setTimeout(() => setRefreshing(false), 800);
  }, [load, fetchAllSections]);

  /* Sections → list rows. A section with no products is hidden (not a
     failure); the white band's top divider sits between visible sections. */
  const rows = useMemo(() => {
    const out = [];
    let first = true;
    CATEGORY_SECTIONS.forEach((sec) => {
      const st = sections[sec.categoryId] || SECTION_IDLE;
      if (!st.loading && !st.failed && st.products.length === 0) return;
      out.push({ type: 'head', key: `h-${sec.categoryId}`, title: sec.title, categoryId: sec.categoryId, first });
      first = false;
      if (st.failed) {
        out.push({ type: 'failed', key: `f-${sec.categoryId}`, categoryId: sec.categoryId });
        return;
      }
      const pairs = chunk(st.loading ? Array.from({ length: SKELETON_ROWS * 2 }) : st.products, 2);
      pairs.forEach((items, r) =>
        out.push({
          type: st.loading ? 'skeleton' : 'products',
          key: `${st.loading ? 's' : 'p'}-${sec.categoryId}-${r}`,
          items,
          loading: st.loading,
          last: r === pairs.length - 1,
        }),
      );
    });
    return out;
  }, [sections]);

  const renderRow = useCallback(
    ({ item }) => {
      if (item.type === 'head') return <SectionHeadRow title={item.title} categoryId={item.categoryId} first={item.first} />;
      if (item.type === 'failed') return <SectionFailedRow categoryId={item.categoryId} onRetry={fetchSection} />;
      return <ProductRow items={item.items} loading={item.loading} last={item.last} taka={taka} />;
    },
    [taka, fetchSection],
  );
  const getRowType = useCallback((item) => item.type, []);

  /* "active" = visible (already filtered server-side) AND not past expiry */
  const activeCampaigns = useMemo(
    () => campaigns.filter((c) => !c.expiryDate || new Date(c.expiryDate).getTime() > Date.now()),
    [campaigns],
  );

  /* "Ship for me" promotional banners live in the services section instead. */
  const filteredBanners = useMemo(
    () =>
      banners.filter((b) => {
    const text = [b.title, b.name, b.category, b.type, b.tag, b.description]
      .filter(Boolean).join(' ').toLowerCase();
    return !text.includes('ship for me') && !text.includes('ship-for-me');
  }),
    [banners],
  );

  /* Memoised: Home re-renders whenever the top bar hides or shows, and an
     inline header rebuilt the banner, categories, campaigns and services —
     the biggest subtree on the page — on every toggle mid-scroll. */
  const listHeader = useMemo(
    () => (
          <View style={{ paddingHorizontal: PAGE_PX, paddingTop: 16, paddingBottom: 24, gap: 24 }}>
            {/* ① Banner */}
            <BannerSlider banners={filteredBanners} />

        {/* ② Browse by Category — right after the banner, so shoppers can jump
            straight into a category before campaigns and services. */}
        <View>
          <SectionHeading title="Browse by Category" subtitle="Explore thousands of products" />
          <View style={{ gap: 8 }}>
            {chunk(QUICK_CATEGORIES, 4).map((row, r) => (
              <View key={r} className="flex-row" style={{ gap: 8 }}>
                {row.map((c) => (
                  <CategoryTile key={c.name} c={c} />
                ))}
              </View>
            ))}
          </View>
        </View>

            {/* ③ Campaigns — only when at least one is active */}
            {activeCampaigns.length > 0 && (
              <View>
                <SectionHeading title="ক্যাম্পেইন ও অফার" subtitle="সীমিত সময়ের জন্য বিশেষ অফার" />
                <View style={{ gap: GRID_GAP }}>
                  {chunk(activeCampaigns, 2).map((row, r) => (
                    <View key={r} className="flex-row" style={{ gap: GRID_GAP }}>
                      {row.map((c, j) => (
                        <CampaignCard key={c.id || `${r}-${j}`} c={c} index={r * 2 + j} />
                      ))}
                      {row.length === 1 && <View style={{ flex: 1 }} />}
                    </View>
                  ))}
                </View>
          </View>
        )}

        {/* ④ Services */}
        <View style={{ gap: GRID_GAP }}>
          {chunk(SERVICES, 2).map((row, r) => (
            <View key={r} className="flex-row" style={{ gap: GRID_GAP }}>
              {row.map((s, j) => (
                <ServiceCard key={s.title} s={s} i={r * 2 + j} />
              ))}
            </View>
          ))}
        </View>

          </View>
    ),
    [filteredBanners, activeCampaigns],
  );

  /* ── Hide-on-scroll header (web Header: show near the top, hide on a >5px
        downward move, show again on a >5px upward move; 300ms ease-out). ── */
  const scrollRef = useAnimatedRef();
  useScrollToTop(scrollRef);
  const [headerH, setHeaderH] = useState(118);
  const [headerHidden, setHeaderHidden] = useState(false);
  const hidden = useSharedValue(0);
  const lastY = useSharedValue(0);
  const headerHV = useSharedValue(118);

  const onScroll = useAnimatedScrollHandler({
    onScroll: (e) => {
      markScrolling();
      const y = e.contentOffset.y;
      const delta = y - lastY.value;
      let next = hidden.value;
      if (y < 80) next = 0;
      else if (delta > 5) next = 1;
      else if (delta < -5) next = 0;
      if (next !== hidden.value) {
        hidden.value = next;
        runOnJS(setHeaderHidden)(next === 1);
      }
      lastY.value = y;
    },
  });

  const headerStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: withTiming(hidden.value ? -headerHV.value : 0, {
          duration: 300,
          easing: Easing.out(Easing.ease),
        }),
      },
    ],
  }));

  return (
    <View className="flex-1" style={{ backgroundColor: '#f5f5f5' }}>
      <AnimatedFlashList
        ref={scrollRef}
        data={rows}
        keyExtractor={(r) => r.key}
        renderItem={renderRow}
        getItemType={getRowType}
        /* Detach off-screen views (the big header, rows above/below) on
           Android: measured on a Redmi 15, RenderThread spent half the app's
           CPU walking and drawing the whole attached tree every frame. */
        removeClippedSubviews
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingTop: insets.top + headerH, paddingBottom: 68 /* clears the WhatsApp button */ }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[ORANGE]}
            tintColor={ORANGE}
            progressViewOffset={insets.top + headerH}
          />
        }
        ListHeaderComponent={listHeader}
        ListFooterComponent={
          <View style={{ paddingHorizontal: PAGE_PX, paddingTop: 24, paddingBottom: 16, gap: 24 }}>
            {/* ⑥ Trust bar */}
            <View className="py-4" style={{ gap: 12 }}>
              {TRUST.map((f) => (
                <View
                  key={f.title}
                  className="bg-white rounded-2xl p-5 flex-row items-start border border-gray-100"
                  style={{ gap: 16, boxShadow: SHADOW_SM }}
                >
                  <View className="w-12 h-12 rounded-xl bg-red-50 items-center justify-center">
                    <Text style={{ fontSize: 24 }}>{f.emoji}</Text>
                  </View>
                  <View className="flex-1">
                    <Text className="font-bold text-gray-800 text-sm mb-1">{f.title}</Text>
                    <Text className="text-gray-500" style={{ fontSize: 11, lineHeight: 17.9 }}>{f.desc}</Text>
                  </View>
                </View>
              ))}
            </View>

            {/* ⑦ FAQ */}
            <View>
              <SectionHeading title="Frequently Asked Questions" subtitle="Quick answers before you order" />
              <View style={{ gap: 8 }}>
                {HOME_FAQS.map((faq, i) => (
                  <FaqItem
                    key={i}
                    faq={faq}
                    i={i}
                    open={openFaq === i}
                    onToggle={() => setOpenFaq(openFaq === i ? -1 : i)}
                  />
                ))}
          </View>
          <Pressable
            onPress={() => navigation.navigate(TABS.MORE, { screen: 'Faq' })}
            className="mt-3 flex-row items-center justify-center active:opacity-60"
            style={{ gap: 6 }}
          >
            <HelpCircle size={14} color={ORANGE} />
            <Text className="text-sm font-bold" style={{ color: ORANGE }}>View All FAQs</Text>
          </Pressable>
        </View>
          </View>
        }
      />

      {/* Header slides away beneath a fixed status-bar strip */}
      <Animated.View
        /* A Reanimated transform moves pixels, not the hit-test area, so the
           slid-away header must stop catching touches meant for the list. */
        pointerEvents={headerHidden ? 'none' : 'box-none'}
        style={[{ position: 'absolute', top: insets.top, left: 0, right: 0, zIndex: 10 }, headerStyle]}
      >
        <Header
          hidden={headerHidden}
          onLayout={(e) => {
            const h = e.nativeEvent.layout.height;
            setHeaderH(h);
            headerHV.value = h + 24; // clear the drop shadow too
          }}
        />
      </Animated.View>
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: insets.top, backgroundColor: '#ffffff', zIndex: 11 }} />

      {/* Floating WhatsApp — sits just above the tab bar */}
      <SupportFab />
    </View>
  );
}
