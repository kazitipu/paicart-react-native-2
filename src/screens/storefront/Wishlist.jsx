import React, { useCallback, useRef } from 'react';
import { View, Text, Pressable, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useSelector, useDispatch } from 'react-redux';
import Animated, {
  FadeIn,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { Heart, Trash2, ShoppingCart, Star, ArrowRight, PackageOpen, LogIn } from 'lucide-react-native';
import Header from '@/components/Header';
import ProductImage from '@/components/ui/ProductImage';
import { C, SHADOW, Press, Price } from '@/components/product/ui';
import { RED, TS, tpx } from '@/components/cart/CartBits';
import { removeFromWishlist } from '@/store/actions';
import { getActiveDiscountPercent, applyDiscount } from '@/lib/discount';
import { toast } from '@/lib/toast';
import useHideOnScroll from '@/lib/useHideOnScroll';
import { goHome as goHomeNav } from '@/navigation/goHome';

/* ═══════════════════════════════════════════════════════════════════════
   WISHLIST — port of paicart-nextjs15 src/app/wishlist/page.jsx at its
   mobile breakpoint (< 640px: px-2 gutter, 2-column grid, gap-3). No scoped
   mobile font shrink on this page, so plain Tailwind v4 sizes apply.

   Data: redux s.wishlist.wishlist (live from Firestore via Providers).
   Remove is the same redux-only REMOVE_FROM_WISHLIST the web dispatches.

   Native additions: press feedback, the web's hover-only remove button is
   shown permanently (touch has no hover), and a removed card fades/shrinks
   out before the grid re-flows (re-flowed cards fade back in).
   ═══════════════════════════════════════════════════════════════════════ */

const PAGE_PX = 8; // px-2
const GAP = 12; // gap-3
const RED_HOVER = '#cc1a1a';

/* `min-h-[70vh] bg-[#f5f5f5] flex items-center justify-center px-4` around a
   `bg-white rounded-3xl shadow-sm border border-gray-100 p-10 max-w-sm` card. */
function StateCard({ minHeight, iconBg, Icon, iconColor, title, sub, cta, CtaIcon, ctaIconSize, ctaIconAfter, onPress, children }) {
  return (
    <View style={{ minHeight, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 }}>
      <Animated.View
        entering={FadeIn.duration(250)}
        style={{
          backgroundColor: '#ffffff',
          borderRadius: 24,
          borderWidth: 1,
          borderColor: C.gray100,
          boxShadow: SHADOW.base, // Tailwind v4 shadow-sm
          padding: 40,
          maxWidth: 384,
          width: '100%',
          alignItems: 'center',
        }}
      >
        <View
          style={{
            width: 64,
            height: 64,
            borderRadius: 16,
            backgroundColor: iconBg,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 20,
          }}
        >
          <Icon size={32} color={iconColor} />
        </View>
        <Text style={{ fontSize: 20, lineHeight: 28, fontWeight: '800', color: C.gray900, marginBottom: 8, textAlign: 'center' }}>
          {title}
        </Text>
        <Text style={{ fontSize: 14, lineHeight: 22.75, color: C.gray500, marginBottom: 28, textAlign: 'center' }}>{sub}</Text>
        <Press
          onPress={onPress}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            backgroundColor: pressed ? RED_HOVER : RED,
            paddingHorizontal: 28,
            paddingVertical: 12,
            borderRadius: 12,
          })}
        >
          {!ctaIconAfter && <CtaIcon size={ctaIconSize} color="#ffffff" />}
          <Text style={[TS.base, { color: '#ffffff', fontWeight: '700' }]}>{cta}</Text>
          {ctaIconAfter && <CtaIcon size={ctaIconSize} color="#ffffff" />}
        </Press>
        {children}
      </Animated.View>
    </View>
  );
}

/* One wishlist tile (WishlistCard on the web). Image, title and the button
   open the product; price / rating are not links, as on the web. */
const WishlistCard = React.memo(function WishlistCard({ product, taka, discountPct, onOpen, onRemove }) {
  const removing = useRef(false);
  const press = useSharedValue(1);
  const out = useSharedValue(1);
  const cardStyle = useAnimatedStyle(() => ({
    opacity: out.value,
    transform: [{ scale: press.value * (0.9 + 0.1 * out.value) }],
  }));

  const firstPic = product.pictures?.[0];
  const imageUrl = firstPic || product.pic_url || product.image || null;

  const price = taka && product.salePrice ? Math.round(parseFloat(product.salePrice) * parseFloat(taka)) : null;
  const discountedPrice = price !== null ? Math.round(applyDiscount(price, discountPct)) : null;

  const rating = parseFloat(product.rating) || 0;
  const sold = parseInt(product.totalSold, 10) || 0;
  const soldStr = sold >= 1000 ? `${(sold / 1000).toFixed(1)}k` : sold > 0 ? String(sold) : null;

  const open = () => onOpen(product);
  const pressIn = () => {
    press.value = withTiming(0.97, { duration: 100 });
  };
  const pressOut = () => {
    press.value = withSpring(1, { damping: 12, stiffness: 260 });
  };

  const remove = () => {
    if (removing.current) return;
    removing.current = true;
    out.value = withTiming(0, { duration: 200 }, (finished) => {
      if (finished) runOnJS(onRemove)(product);
    });
  };

  const tiny = tpx(9); // text-[9px]

  return (
    <Animated.View
      style={[
        {
          flexGrow: 1,
          backgroundColor: '#ffffff',
          borderRadius: 16,
          borderWidth: 1,
          borderColor: C.gray100,
          overflow: 'hidden',
        },
        cardStyle,
      ]}
    >
      {/* Image */}
      <View style={{ width: '100%', aspectRatio: 1, backgroundColor: C.gray50, overflow: 'hidden' }}>
        <Pressable
          onPress={open}
          onPressIn={pressIn}
          onPressOut={pressOut}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        >
          {imageUrl ? (
            <ProductImage
              uri={imageUrl}
              thumb={!!firstPic}
              style={{ width: '100%', height: '100%' }}
              fallbackIconSize={28}
            />
          ) : (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 48, lineHeight: 48, color: C.gray200 }}>📦</Text>
            </View>
          )}
        </Pressable>

        {/* Remove — `top-2.5 right-2.5 w-8 h-8 bg-white/90 shadow-md`, its
            hover state (red-500 / white) as the pressed state. */}
        <Press
          onPress={remove}
          hitSlop={6}
          accessibilityLabel="Remove from wishlist"
          style={({ pressed }) => ({
            position: 'absolute',
            top: 10,
            right: 10,
            zIndex: 10,
            width: 32,
            height: 32,
            borderRadius: 16,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: pressed ? C.red500 : 'rgba(255,255,255,0.9)',
            boxShadow: SHADOW.md,
          })}
        >
          {({ pressed }) => <Trash2 size={13} color={pressed ? '#ffffff' : C.gray500} />}
        </Press>
      </View>

      {/* Body */}
      <View style={{ padding: 12, gap: 6, flexGrow: 1 }}>
        <Pressable onPress={open} onPressIn={pressIn} onPressOut={pressOut}>
          <Text
            numberOfLines={2}
            style={{ fontSize: 11.5, lineHeight: 11.5 * 1.45, minHeight: 32, color: C.gray800, fontWeight: '500' }}
          >
            {product.name || product.title}
          </Text>
        </Pressable>

        {price !== null ? (
          <Price
            amount={discountedPrice}
            original={price}
            style={{ fontSize: 15, lineHeight: 22.5, fontWeight: '800', color: RED, letterSpacing: -0.375 }}
            origStyle={{ lineHeight: 22.5 }}
          />
        ) : (
          <Text style={[TS.xs, { color: C.gray300 }]}>—</Text>
        )}

        {(rating > 0 || !!soldStr) && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {rating > 0 && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                <Star size={9} color={C.amber400} fill={C.amber400} />
                <Text style={[tiny, { color: C.gray500, fontWeight: '600' }]}>{rating.toFixed(1)}</Text>
              </View>
            )}
            {!!soldStr && (
              <Text style={[tiny, { color: C.gray400 }]} numberOfLines={1}>
                {soldStr} sold
              </Text>
            )}
          </View>
        )}

        <View style={{ flexGrow: 1 }} />

        <Press
          onPress={open}
          style={({ pressed }) => ({
            marginTop: 4,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            backgroundColor: pressed ? RED_HOVER : RED,
            paddingVertical: 8,
            borderRadius: 12,
          })}
        >
          <ShoppingCart size={12} color="#ffffff" />
          <Text style={[tpx(11), { color: '#ffffff', fontWeight: '700' }]}>View Product</Text>
        </Press>
      </View>
    </Animated.View>
  );
});

export default function Wishlist() {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();
  const { width: winW, height: winH } = useWindowDimensions();

  const wishlistItems = useSelector((s) => s.wishlist?.wishlist || []);
  const currentUser = useSelector((s) => s.user?.currentUser);
  const taka = useSelector((s) => s.user?.currency?.taka);
  const discountPct = getActiveDiscountPercent(useSelector((s) => s.orders?.siteDiscount));

  /* By id, like the rest of the app — phone-OTP users have no email. */
  const isLoggedIn = !!currentUser?.id;

  const cardW = (winW - PAGE_PX * 2 - GAP) / 2;

  const handleRemove = useCallback(
    (product) => {
      dispatch(removeFromWishlist(product.id));
      toast.success('Removed from wishlist');
    },
    [dispatch],
  );
  const openProduct = useCallback((product) => navigation.navigate('Product', { id: product.id }), [navigation]);
  const goHome = () => goHomeNav();

  /* ── chrome (global Header, hide-on-scroll) ── */
  const { onScroll, isHidden, headerH, setHeaderH, headerStyle } = useHideOnScroll();
  const topPad = insets.top + headerH;

  const chrome = (
    <>
      <Animated.View
        pointerEvents={isHidden ? 'none' : 'box-none'}
        style={[{ position: 'absolute', top: insets.top, left: 0, right: 0, zIndex: 10 }, headerStyle]}
      >
        <Header hidden={isHidden} onLayout={(e) => setHeaderH(e.nativeEvent.layout.height)} />
      </Animated.View>
      <View
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: insets.top, backgroundColor: '#ffffff', zIndex: 11 }}
      />
    </>
  );

  const renderItem = useCallback(
    ({ item }) => (
      <Animated.View entering={FadeIn.duration(220)} style={{ width: cardW }}>
        <WishlistCard product={item} taka={taka} discountPct={discountPct} onOpen={openProduct} onRemove={handleRemove} />
      </Animated.View>
    ),
    [cardW, taka, discountPct, openProduct, handleRemove],
  );

  /* ── Not logged in ── */
  if (!isLoggedIn) {
    return (
      <View style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
        <View style={{ paddingTop: topPad }}>
          <StateCard
            minHeight={winH * 0.7}
            iconBg={C.red50}
            Icon={Heart}
            iconColor={RED}
            title="Sign in to see your wishlist"
            sub="Save your favourite products and access them anytime from any device."
            cta="Sign In"
            CtaIcon={LogIn}
            ctaIconSize={16}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={[TS.xs, { marginTop: 16, color: C.gray400, textAlign: 'center' }]}>
              No account?{' '}
              <Text onPress={() => navigation.navigate('Login')} style={{ color: RED, fontWeight: '600' }}>
                Register free
              </Text>
            </Text>
          </StateCard>
        </View>
        {chrome}
      </View>
    );
  }

  /* ── Empty ── */
  if (wishlistItems.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
        <View style={{ paddingTop: topPad }}>
          <StateCard
            minHeight={winH * 0.7}
            iconBg={C.gray50}
            Icon={PackageOpen}
            iconColor={C.gray300}
            title="Your wishlist is empty"
            sub="Browse products and tap the heart icon to save items you love."
            cta="Start Shopping"
            CtaIcon={ArrowRight}
            ctaIconSize={15}
            ctaIconAfter
            onPress={goHome}
          />
        </View>
        {chrome}
      </View>
    );
  }

  /* ── Wishlist grid ── */
  const count = wishlistItems.length;
  const listHeader = (
    <View style={{ paddingBottom: 20 }}>
      {/* Header band */}
      <View style={{ backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: C.gray100 }}>
        <View
          style={{
            paddingHorizontal: PAGE_PX,
            paddingVertical: 16,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flexShrink: 1 }}>
            <View
              style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: C.red50, alignItems: 'center', justifyContent: 'center' }}
            >
              <Heart size={18} color={RED} fill={RED} />
            </View>
            <View style={{ flexShrink: 1 }}>
              <Text style={{ fontSize: 17, lineHeight: 17 * 1.25, fontWeight: '800', color: C.gray900 }}>My Wishlist</Text>
              <Text style={[TS.xs, { color: C.gray400 }]}>
                {count} saved item{count !== 1 ? 's' : ''}
              </Text>
            </View>
          </View>
          <Pressable onPress={goHome} hitSlop={8} className="flex-row items-center active:opacity-60" style={{ gap: 4 }}>
            <Text style={[TS.xs, { color: RED, fontWeight: '600' }]}>Continue shopping</Text>
            <ArrowRight size={12} color={RED} />
          </Pressable>
        </View>
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
      <Animated.FlatList
        data={wishlistItems}
        keyExtractor={(p, i) => (p.id != null ? String(p.id) : `w-${i}`)}
        numColumns={2}
        renderItem={renderItem}
        columnWrapperStyle={{ gap: GAP, paddingHorizontal: PAGE_PX }}
        ItemSeparatorComponent={RowGap}
        contentContainerStyle={{ paddingTop: topPad, paddingBottom: 20 }}
        ListHeaderComponent={listHeader}
        onScroll={onScroll}
        scrollEventThrottle={16}
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={9}
      />
      {chrome}
    </View>
  );
}

function RowGap() {
  return <View style={{ height: GAP }} />;
}
