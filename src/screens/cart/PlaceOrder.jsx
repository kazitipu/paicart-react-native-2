import React, { useState, useEffect, useMemo, useRef, useCallback, memo } from 'react';
import { View, Text, TextInput, Dimensions, Keyboard, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { navigationRef } from '@/navigation/navigationRef';
import { useSelector, useDispatch } from 'react-redux';
import Animated, { FadeIn, FadeInDown, ZoomIn, useAnimatedRef } from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';
import {
  MapPin, Phone, User, Mail, ChevronRight, ChevronDown, ChevronUp, Store, Package, Truck,
  ShieldCheck, Tag, X, AlertTriangle, ShoppingBag, MessageSquare,
} from 'lucide-react-native';
import Header from '@/components/Header';
import ProductImage from '@/components/ui/ProductImage';
import PrePaymentModal from '@/components/PrePaymentModal';
import { C, ORANGE2, Press, ScalePress, Price, Spinner } from '@/components/product/ui';
import { TS, tpx, SHADOW_SM, CC, sized } from '@/components/cart/CartBits';
import { addToOrdersApiRedux, addToPendingOrdersRedux, removeItemFromCartRedux } from '@/store/actions';
import { getSingleCoupon, updateUser, getAllPartials } from '@/lib/firebaseUtils';
import { Timestamp } from '@/lib/firebase';
import { getRedxCharge } from '@/lib/api';
import { pickDefaultAddress, addrPhone, addrLine, addrAreaId } from '@/lib/address';
import {
  summarise, orderBlockReason, validateCoupon, buildOrderDocs, getItemDiscountPct,
} from '@/lib/checkout';
import { getActiveDiscountPercent, applyDiscount } from '@/lib/discount';
import { toast } from '@/lib/toast';
import useHideOnScroll from '@/lib/useHideOnScroll';
import { TABS } from '@/navigation/routes';
import { goHome } from '@/navigation/goHome';

/* ═══════════════════════════════════════════════════════════════════════
   PLACE ORDER — port of paicart-nextjs15
   src/app/dashboard/pages/place-order/page.jsx at its mobile breakpoint
   (< 640px: px-2 gutter, stacked SKU rows with the inline price/qty line,
   pinned bottom bar). The route renders under the global Header and has no
   BottomNav, so the bar sits on the screen's bottom edge (+ safe area).
   No scoped mobile font shrink on this page → plain Tailwind v4 sizes.

   Data: redux s.cartList.pendingOrders as Cart's proceedToCheckout hands it
   over (shop → items → skus, localShipping as a string). All maths and the
   order documents come from lib/checkout (identical to the web).

   Kept RN-side decisions:
   - No RedX bearer token in the APK: the BD delivery charge goes through
     lib/api getRedxCharge (proxy, currently null) and falls back to the web's
     own default of 100 — the order is never blocked on it.
   - Addresses: the web's shape is { defaultShipping, mobileNo, thana,
     division, areaObj } (lib/address). Entries written by older builds of
     this app ({ isDefault, phone, area }) are still read as a fallback.
   - Inputs (coupon, seller notes) keep their own text state so a parent
     re-render never drops characters; notes are read from a ref on submit.

   Native additions: press feedback, card entrance fades, animated shipping
   info expansion, keyboard-aware scroll for the seller notes.
   ═══════════════════════════════════════════════════════════════════════ */

const PAGE_PX = 8; // px-2
const PAGE_BG = '#f5f5f5';
const toLS = (n) => Math.round(Number(n) || 0).toLocaleString();
const CARD = {
  backgroundColor: '#ffffff',
  borderRadius: 16,
  borderWidth: 1,
  borderColor: C.gray100,
  boxShadow: SHADOW_SM,
};
const CARD_INNER = { borderRadius: 15, overflow: 'hidden' };
const PLACEHOLDER = 'rgba(55,65,81,0.5)'; // v4 preflight: currentColor (gray-700) at 50%

const PURPLE50 = '#faf5ff';
const PURPLE600 = '#9333ea';
const EMERALD200 = CC.emerald200;
const YELLOW300 = '#fde047';


/* `border-b-2 border-dashed` — RN can't dash one side, so a dashed box is
   clipped to its bottom edge. */
function DashedUnderline({ color }) {
  return (
    <View style={{ height: 2, overflow: 'hidden' }}>
      <View style={{ height: 6, marginTop: -4, borderWidth: 2, borderStyle: 'dashed', borderColor: color }} />
    </View>
  );
}

function CardHeader({ children, right }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: C.gray100,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 }}>{children}</View>
      {right}
    </View>
  );
}

/* ── Coupon input (input state) ── */
const CouponInput = memo(function CouponInput({ loading, onApply }) {
  const [code, setCode] = useState('');
  const [focused, setFocused] = useState(false);
  const apply = async () => {
    const ok = await onApply(code);
    if (ok) setCode('');
  };
  const empty = code.length === 0;
  return (
    <View style={{ backgroundColor: '#ffffff', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 }}>
        <Tag size={11} color={ORANGE2} />
        <Text style={[TS.xs, { color: C.gray400, flexShrink: 1 }]}>
          Have a discount coupon? Enter it below to save on your order!
        </Text>
      </View>

      {/* Ticket-style wrapper (mx-3) with circle cut-outs */}
      <View style={{ marginHorizontal: 12 }}>
        {['left', 'right'].map((side) => (
          <View
            key={side}
            pointerEvents="none"
            style={{
              position: 'absolute',
              [side]: -24,
              top: '50%',
              marginTop: -10,
              width: 20,
              height: 20,
              borderRadius: 10,
              backgroundColor: PAGE_BG,
              borderWidth: 2,
              borderStyle: 'dashed',
              borderColor: C.gray200,
              zIndex: 10,
            }}
          />
        ))}
        <View
          style={{
            borderWidth: 2,
            borderStyle: 'dashed',
            borderColor: C.gray200,
            borderRadius: 12,
            paddingHorizontal: 12,
            paddingVertical: 12,
            overflow: 'hidden',
          }}
        >
          {/* Scissors on the top dashed line (-top-3, clipped by overflow-hidden as on the web) */}
          <View
            pointerEvents="none"
            style={{ position: 'absolute', top: -12, left: 0, right: 0, alignItems: 'center', zIndex: 10 }}
          >
            <View style={{ backgroundColor: '#ffffff', paddingHorizontal: 4 }}>
              <Text style={{ fontSize: 14, lineHeight: 14 }}>✂️</Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
            <View style={{ flex: 1 }}>
              <TextInput
                value={code}
                onChangeText={(v) => setCode(v.toUpperCase())}
                onSubmitEditing={apply}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                placeholder="ENTER CODE"
                placeholderTextColor={C.gray300}
                autoCapitalize="characters"
                autoCorrect={false}
                returnKeyType="done"
                style={[
                  TS.sm,
                  {
                    padding: 0,
                    paddingBottom: 4,
                    includeFontPadding: false,
                    color: C.gray700,
                    fontWeight: empty ? '400' : '700',
                    letterSpacing: empty ? 0 : 2.8,
                  },
                ]}
              />
              <DashedUnderline color={focused ? ORANGE2 : C.gray200} />
            </View>
            <ScalePress
              onPress={apply}
              disabled={loading}
              accessibilityLabel="Apply coupon"
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 12,
                backgroundColor: ORANGE2,
                opacity: loading ? 0.6 : 1,
              }}
            >
              {loading ? <Spinner size={14} /> : <Tag size={13} color="#ffffff" />}
              <Text style={[TS.sm, { fontWeight: '700', color: '#ffffff' }]}>Apply</Text>
            </ScalePress>
          </View>
        </View>
      </View>
    </View>
  );
});

/* ── Per-seller note (textarea rows=2) ── */
const NoteInput = memo(function NoteInput({ shopId, onChange, onFocusInput }) {
  const [text, setText] = useState('');
  const [focused, setFocused] = useState(false);
  const ref = useRef(null);
  return (
    <TextInput
      ref={ref}
      value={text}
      onChangeText={(v) => {
        setText(v);
        onChange(shopId, v);
      }}
      onFocus={() => {
        setFocused(true);
        onFocusInput(ref);
      }}
      onBlur={() => setFocused(false)}
      multiline
      textAlignVertical="top"
      placeholder="Any special instructions for this seller…"
      placeholderTextColor={PLACEHOLDER}
      style={[
        TS.xs,
        {
          width: '100%',
          height: 54, // 2 rows × 16 + py-2.5 + border
          borderWidth: 1,
          borderColor: focused ? ORANGE2 : C.gray200,
          borderRadius: 12,
          paddingHorizontal: 12,
          paddingVertical: 10,
          color: C.gray700,
          includeFontPadding: false,
        },
      ]}
    />
  );
});

function InfoRow({ Icon, iconColor, label, value, last }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: C.gray50,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Icon size={12} color={iconColor} />
        <Text style={[TS.xs, { color: C.gray500 }]}>{label}</Text>
      </View>
      <Text style={[TS.xs, { fontWeight: '600', color: C.gray700 }]}>{value}</Text>
    </View>
  );
}

function Chip({ label, bg, fg }) {
  return (
    <View style={{ backgroundColor: bg, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 }}>
      <Text style={[tpx(10), { color: fg }]}>{label}</Text>
    </View>
  );
}

/* ── One shop's order card ── */
function ShopCard({ shop, shopIdx, discountPct, open, onToggle, onOpenStore, onNoteChange, onNoteFocus }) {
  const firstItem = shop.items?.[0];
  const weight = parseFloat(firstItem?.weight || 0);
  const shippingRate = parseInt(firstItem?.shippingRate || 750, 10);
  /* Air's 0–0.3kg band is a flat parcel charge, not a per-kg rate. */
  const isParcelRate =
    (firstItem?.shipmentMethod || 'Air') !== 'Sea' &&
    (weight > 0 ? weight <= 0.3 : firstItem?.shippingRateUnit === 'parcel');
  const rateUnit = isParcelRate ? 'parcel' : 'kg';
  const cnToBdCharge = isParcelRate ? shippingRate : Math.round(weight * shippingRate);

  return (
    <Animated.View entering={FadeIn.duration(260).delay(60 * Math.min(shopIdx, 4))} style={CARD}>
      <View style={CARD_INNER}>
        <CardHeader
          right={
            <Press onPress={onOpenStore} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 0 }}>
              {({ pressed }) => (
                <>
                  <Text style={[TS.xs, { color: pressed ? ORANGE2 : C.gray400 }]}>View Store</Text>
                  <ChevronRight size={11} color={pressed ? ORANGE2 : C.gray400} />
                </>
              )}
            </Press>
          }
        >
          <Store size={14} color={CC.orange500} />
          <Text numberOfLines={1} style={[TS.sm, { fontWeight: '700', color: C.gray700, maxWidth: 220, flexShrink: 1 }]}>
            Order {shopIdx + 1}: {shop.shopName || shop.shopId}
          </Text>
        </CardHeader>

        {/* Items → one row per SKU */}
        {(shop.items || []).map((item, itemIdx) => (
          <View key={`${item.id}-${itemIdx}`}>
            {(item.skus || []).map((sku, skuIdx) => {
              const skuPic = sku.image || item.picture || '';
              const unitPrice = Math.round(parseFloat(sku.price) || 0);
              const qty = parseInt(sku.totalQuantity, 10) || 0;
              const rowTotal = unitPrice * qty;
              const discountedUnitPrice = Math.round(applyDiscount(unitPrice, getItemDiscountPct(item, discountPct)));
              const discountedRowTotal = discountedUnitPrice * qty;
              return (
                <View
                  key={`${sku.sku_id ?? skuIdx}`}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'flex-start',
                    gap: 12,
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    borderBottomWidth: 1,
                    borderBottomColor: C.gray50,
                    backgroundColor: skuIdx % 2 === 1 ? 'rgba(249,250,251,0.3)' : 'transparent',
                  }}
                >
                  <ProductImage
                    uri={sized(skuPic, 80)}
                    style={{ width: 56, height: 56, borderRadius: 12, borderWidth: 1, borderColor: C.gray200 }}
                    fallbackIconSize={18}
                  />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text numberOfLines={2} style={{ fontSize: 14, lineHeight: 19.25, fontWeight: '500', color: C.gray800 }}>
                      {item.name}
                    </Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                      {!!item.productType && <Chip label={item.productType} bg={C.gray100} fg={C.gray500} />}
                      {!!sku.color && (
                        <Chip label={`${item.propertyNames?.[0] || 'Color'}: ${sku.color}`} bg={C.blue50} fg={C.blue600} />
                      )}
                      {!!sku.size && (
                        <Chip label={`${item.propertyNames?.[1] || 'Size'}: ${sku.size}`} bg={PURPLE50} fg={PURPLE600} />
                      )}
                    </View>
                    {/* Mobile price / qty line */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                        <Price
                          amount={discountedUnitPrice}
                          original={unitPrice}
                          style={[TS.xs, { color: C.gray500 }]}
                          containerStyle={{ flexWrap: 'nowrap' }}
                        />
                        <Text style={[TS.xs, { color: C.gray500 }]}>/pc</Text>
                      </View>
                      <Text style={[TS.xs, { color: C.gray400 }]}>×{sku.totalQuantity}</Text>
                      <View style={{ marginLeft: 'auto', flexShrink: 1 }}>
                        <Price
                          amount={discountedRowTotal}
                          original={rowTotal}
                          style={[TS.xs, { fontWeight: '700', color: ORANGE2 }]}
                          containerStyle={{ justifyContent: 'flex-end' }}
                        />
                      </View>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        ))}

        {/* Shipping & Weight Info — approximate, paid in BD; toggleable */}
        <View style={{ borderTopWidth: 1, borderTopColor: C.gray100 }}>
          <Press
            onPress={onToggle}
            accessibilityRole="button"
            accessibilityState={{ expanded: !!open }}
            style={({ pressed }) => ({
              width: '100%',
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              paddingHorizontal: 16,
              paddingVertical: 10,
              backgroundColor: pressed ? C.orange100 : C.orange50,
            })}
          >
            <Package size={14} color={ORANGE2} />
            <Text style={[TS.sm, { fontWeight: '700', color: ORANGE2 }]}>Shipping &amp; Weight Info</Text>
            <Text style={[TS.xs, { color: C.gray500 }]}>(Pay in BD)</Text>
            <View style={{ marginLeft: 'auto' }}>
              {open ? <ChevronUp size={16} color={ORANGE2} /> : <ChevronDown size={16} color={ORANGE2} />}
            </View>
          </Press>

          {open && (
            <Animated.View entering={FadeIn.duration(200)}>
              <InfoRow Icon={Package} iconColor="#60a5fa" label="Total Weight (Approx)" value={`${weight.toFixed(2)} kg`} />
              <InfoRow
                Icon={Truck}
                iconColor="#fb923c"
                label="Shipping Rate"
                value={`৳${shippingRate.toLocaleString()} / ${rateUnit}`}
              />
              <InfoRow
                Icon={ShieldCheck}
                iconColor="#818cf8"
                label="Approx. Shipping Bill"
                value={`৳${cnToBdCharge.toLocaleString()}`}
              />
              <View
                style={{
                  marginHorizontal: 16,
                  marginVertical: 12,
                  backgroundColor: C.amber50,
                  borderWidth: 1,
                  borderColor: C.amber200,
                  borderRadius: 12,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  flexDirection: 'row',
                  gap: 8,
                }}
              >
                <AlertTriangle size={13} color={C.amber500} style={{ marginTop: 2 }} />
                <Text style={{ flex: 1, fontSize: 11, lineHeight: 17.875, color: C.amber800 }}>
                  উপরের ওজনটি সম্ভাব্য হিসাব, প্যাকেজিং সহ বাংলাদেশে পার্সেল আসার পর প্রকৃত ওজন সঠিকভাবে মেপে আসল শিপিং বিল
                  নির্ধারণ করা হবে। শিপিং এর এই বিলটি এখন দেওয়া লাগবে না, বাংলাদেশে পার্সেল আসার পর দিতে হবে।
                </Text>
              </View>
            </Animated.View>
          )}
        </View>

        {/* Per-seller note */}
        <View style={{ paddingHorizontal: 16, paddingBottom: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: C.gray100 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <MessageSquare size={13} color={ORANGE2} />
            <Text style={[TS.xs, { fontWeight: '600', color: C.gray600 }]}>Message to this seller (optional)</Text>
          </View>
          <NoteInput shopId={shop.shopId} onChange={onNoteChange} onFocusInput={onNoteFocus} />
        </View>
      </View>
    </Animated.View>
  );
}

function SummaryRow({ label, value, green }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <Text style={[TS.xs, { color: green ? C.emerald600 : C.gray500, flexShrink: 1 }]}>{label}</Text>
      <Text style={[TS.xs, { fontWeight: '600', color: green ? C.emerald600 : C.gray800 }]}>{value}</Text>
    </View>
  );
}

export default function PlaceOrder() {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();

  const currentUser = useSelector((s) => s.user?.currentUser);
  const taka = parseFloat(useSelector((s) => s.user?.currency?.taka)) || 18;
  const pendingOrders = useSelector((s) => s.cartList?.pendingOrders || []);
  const discountPct = getActiveDiscountPercent(useSelector((s) => s.orders?.siteDiscount));

  const [coupon, setCoupon] = useState(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [shippingInfoOpen, setShippingInfoOpen] = useState({});
  const [deliveryCharges, setDeliveryCharges] = useState({});
  const [loading, setLoading] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [partials, setPartials] = useState([]);
  const [placedOrders, setPlacedOrders] = useState([]);
  const [showPrePaymentModal, setShowPrePaymentModal] = useState(false);

  /* Per-seller notes live in a ref: the inputs own their text, and nothing on
     screen depends on the notes until submit. */
  const shopNotesRef = useRef({});

  /* Re-entrancy guard for Place Order — a ref flips synchronously, so a
     second tap in the same frame bails before a second order is written. */
  const submittingRef = useRef(false);
  const placedRef = useRef(false);

  useEffect(() => {
    getAllPartials()
      .then((list) => {
        const active = (list || []).filter(
          (p) => !p.expirationDate || new Date(p.expirationDate).getTime() > Date.now(),
        );
        setPartials(active);
      })
      .catch(() => {});
  }, []);

  /* Nothing to check out → back to the cart (web: router.replace('/cart')). */
  useEffect(() => {
    if (pendingOrders.length === 0 && !orderPlaced) navigation.popTo('Cart');
  }, [pendingOrders.length, orderPlaced, navigation]);

  /* Once an order exists, leaving this screen resets the Cart stack, so the
     Cart tab never comes back to a locked checkout. (On the web the page
     simply unmounted on navigation.)
     - From the cart, checkout sits on top of Cart: pop back to it.
     - Buy-now opens checkout as the only Cart-stack screen. It used to be
       left in place, so the next Buy-now reused it with the earlier order
       still marked placed and the button locked — replace it with Cart.
     - The in-app bKash checkout is a modal over this screen, which also
       blurs it; that is not leaving, and resetting here would unmount the
       payment sheet before it can show "Order Placed!". */
  useEffect(
    () =>
      navigation.addListener('blur', () => {
        if (!placedRef.current) return;
        if (navigationRef.getCurrentRoute()?.name === 'BkashCheckout') return;
        if (navigation.canGoBack()) navigation.popToTop();
        else navigation.replace('Cart');
      }),
    [navigation],
  );

  const defaultShipping = useMemo(() => pickDefaultAddress(currentUser?.addressBook || []), [currentUser?.addressBook]);
  const areaId = addrAreaId(defaultShipping);

  /* BD delivery charge per shop (web: RedX, weight of items[0], delivery +
     COD charge, 100 on failure). */
  useEffect(() => {
    if (!defaultShipping || pendingOrders.length === 0 || !areaId) return;
    let alive = true;
    (async () => {
      const map = {};
      for (const order of pendingOrders) {
        try {
          const weightG = parseInt(parseFloat(order.items?.[0]?.weight || 0) * 1000, 10);
          const data = await getRedxCharge({
            delivery_area_id: areaId,
            pickup_area_id: 288,
            cash_collection_amount: 1000,
            weight: weightG,
          });
          /* null = no proxy configured; leave the shop unset so the order
             falls back to 100, as the web does on a failed call. */
          if (data) map[order.shopId] = (parseInt(data.deliveryCharge, 10) || 0) + (parseInt(data.codCharge, 10) || 0);
        } catch {
          map[order.shopId] = 100;
        }
      }
      if (alive) setDeliveryCharges(map);
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [areaId, pendingOrders.length]);

  /* ── totals ── */
  const summary = useMemo(
    () => summarise(pendingOrders, { siteDiscountPct: discountPct, coupon }),
    [pendingOrders, discountPct, coupon],
  );
  const { totalAmount, totalQty, goodsCategory, siteDiscountAmount, couponAmount, totalLocalShipping, totalPayable } = summary;
  const hasCampaignItem = pendingOrders.some((shop) => (shop.items || []).some((item) => item.campaignId));

  const blockReason = orderBlockReason(pendingOrders);
  const orderBlocked =
    loading || placedOrders.length > 0 || !defaultShipping || pendingOrders.length === 0 || !!blockReason;
  /* Greyed out while not ready, but only truly disabled while an order is
     being / has been placed. Disabling it for a missing address or a block
     reason left a dead button — handlePlaceOrder's explanation (and the jump
     to the address form) could never run, and the address section is far up
     the page. Now a tap says what is missing. */
  const pressLocked = loading || placedOrders.length > 0 || pendingOrders.length === 0;

  /* ── coupon ── */
  const handleAddCoupon = useCallback(
    async (raw) => {
      const code = (raw || '').trim();
      if (!code) {
        toast.error('Please enter a coupon code');
        return false;
      }
      setCouponLoading(true);
      try {
        const found = await getSingleCoupon(code);
        const error = validateCoupon(found, { totalAmount, usedCoupons: currentUser?.usedCoupons || [] });
        if (error) {
          toast.error(error);
          return false;
        }
        setCoupon(found);
        toast.success('Coupon applied!');
        return true;
      } catch {
        toast.error('Failed to verify coupon');
        return false;
      } finally {
        setCouponLoading(false);
      }
    },
    [totalAmount, currentUser?.usedCoupons],
  );

  const goAddress = () =>
    navigation.navigate(TABS.ORDERS, { screen: 'UserInformation', params: { from: 'place-order' } });

  /* ── submit: creates the orders (paymentStatus "purchaseLater"), then opens
     the payment sheet. The orders exist whether or not they pay there. ── */
  const handlePlaceOrder = async () => {
    if (submittingRef.current) return;
    if (placedOrders.length > 0) return;
    if (!currentUser?.id) {
      toast.error('Please login first');
      navigation.navigate('Login');
      return;
    }
    if (!defaultShipping) {
      toast.error('Please add a delivery address first');
      goAddress();
      return;
    }
    if (pendingOrders.length === 0) {
      toast.error('No items to order');
      return;
    }
    if (blockReason) {
      toast.error(blockReason);
      return;
    }

    submittingRef.current = true;
    setLoading(true);
    try {
      const orders = buildOrderDocs(pendingOrders, {
        siteDiscountPct: discountPct,
        coupon,
        couponAmount,
        taka,
        defaultShipping,
        deliveryCharges,
        shopNotes: shopNotesRef.current,
        timestamp: Timestamp.now(),
      });

      /* The ids are kept with the checkout before anything is written, so a
         retry or coming back to this screen repeats these same orders instead
         of creating new ones. */
      await dispatch(
        addToPendingOrdersRedux(
          pendingOrders.map((shop, i) => ({ ...shop, orderId: orders[i].orderId })),
        ),
      );
      const created = await dispatch(addToOrdersApiRedux(currentUser, orders));

      /* Already saved by an earlier attempt: it can be paid from My Orders,
         and this screen's totals may no longer match what was saved. */
      if (created.length === 0) {
        toast.info('This order was already placed.');
        submittingRef.current = false;
        navigation.navigate(TABS.ORDERS, { screen: 'BuyShipMyOrders' });
        return;
      }

      /* The orders now exist. Nothing below may report the placement as
         failed, or the customer retries and writes a duplicate order. */
      try {
        if (coupon && currentUser) {
          const usedCoupons = currentUser.usedCoupons || [];
          const existing = usedCoupons.find((c) => c.id === coupon.id);
          const updated = existing
            ? usedCoupons.map((c) => (c.id === coupon.id ? { ...c, used: parseInt(c.used, 10) + 1 } : c))
            : [...usedCoupons, { ...coupon, used: 1 }];
          await updateUser({ ...currentUser, usedCoupons: updated });
        }

        /* Remove only what was ordered — the cart may hold unselected lines. */
        for (const shop of orders) {
          for (const item of shop.items) {
            await dispatch(removeItemFromCartRedux(currentUser, { ...item, shopId: shop.shopId }));
          }
        }
      } catch (cleanupErr) {
        console.error(cleanupErr);
      }
      placedRef.current = true;
      setPlacedOrders(orders);
      setShowPrePaymentModal(true);
    } catch {
      toast.error('Failed to place order. Please try again.');
      /* Only a failed attempt is retryable. */
      submittingRef.current = false;
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = () => {
    setShowPrePaymentModal(false);
    setOrderPlaced(true);
  };

  /* Closed without paying — the order exists, so send them to My Orders. */
  const handleSkipPayment = () => {
    setShowPrePaymentModal(false);
    navigation.navigate(TABS.ORDERS, { screen: 'BuyShipMyOrders' });
  };

  const activePartial = partials[0] || null;

  /* ── keyboard: keep a focused seller note above the pinned bar ── */
  const scrollRef = useAnimatedRef();
  const contentRef = useRef(null);
  const focusedNoteRef = useRef(null);
  const viewportH = useRef(0);
  const [barH, setBarH] = useState(84);
  const barHRef = useRef(84);
  barHRef.current = barH;

  const { onScroll, scrollY, isHidden, headerH, setHeaderH, headerStyle } = useHideOnScroll();
  const topPad = insets.top + headerH;

  /* Measured against the keyboard's real top edge in window coordinates.
     With Android edge-to-edge the window no longer shrinks for the keyboard
     (adjustResize is ignored), so the scroll view's own height says nothing
     about what the keyboard covers — that is why the note used to end up
     under it. */
  const kbTopRef = useRef(0);
  const [kbPad, setKbPad] = useState(0);

  const ensureNoteVisible = useCallback(() => {
    const input = focusedNoteRef.current?.current;
    if (!input || !kbTopRef.current) return;
    input.measureInWindow((_x, y, _w, h) => {
      const overlap = y + h + 16 - kbTopRef.current;
      if (overlap > 0) {
        scrollRef.current?.scrollTo({ y: scrollY.value + overlap, animated: true });
      }
    });
  }, [scrollRef, scrollY]);

  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvt, (e) => {
      const kbH = e.endCoordinates?.height || 0;
      kbTopRef.current = e.endCoordinates?.screenY || Dimensions.get('window').height - kbH;
      setKbPad(kbH);
      /* wait one frame for the extra bottom space to lay out */
      setTimeout(ensureNoteVisible, 80);
    });
    const hide = Keyboard.addListener(hideEvt, () => {
      kbTopRef.current = 0;
      setKbPad(0);
    });
    return () => {
      show.remove();
      hide.remove();
    };
  }, [ensureNoteVisible]);

  const onNoteFocus = useCallback(
    (ref) => {
      focusedNoteRef.current = ref;
      if (Keyboard.isVisible()) setTimeout(ensureNoteVisible, 80);
    },
    [ensureNoteVisible],
  );
  const onNoteChange = useCallback((shopId, v) => {
    shopNotesRef.current[shopId] = v;
  }, []);

  const chrome = (
    <>
      <Animated.View
        pointerEvents={isHidden ? 'none' : 'box-none'}
        style={[{ position: 'absolute', top: insets.top, left: 0, right: 0, zIndex: 10 }, headerStyle]}
      >
        <Header hidden={isHidden} onLayout={(e) => setHeaderH(e.nativeEvent.layout.height)} />
      </Animated.View>
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: insets.top, backgroundColor: '#ffffff', zIndex: 11 }} />
    </>
  );

  /* ── order success screen ── */
  if (orderPlaced) {
    const winH = Dimensions.get('window').height;
    const leave = (fn) => {
      if (navigation.canGoBack()) navigation.popToTop();
      fn();
    };
    return (
      <View style={{ flex: 1, backgroundColor: PAGE_BG }}>
        <Animated.ScrollView onScroll={onScroll} scrollEventThrottle={16} contentContainerStyle={{ paddingTop: topPad }}>
          <View style={{ minHeight: winH, alignItems: 'center', justifyContent: 'center', padding: 16 }}>
            <Animated.View
              entering={FadeInDown.duration(320)}
              style={{
                backgroundColor: '#ffffff',
                borderRadius: 24,
                paddingHorizontal: 32,
                paddingVertical: 40,
                alignItems: 'center',
                borderWidth: 1,
                borderColor: C.gray100,
                boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)',
                maxWidth: 384,
                width: '100%',
              }}
            >
              <Animated.View entering={ZoomIn.duration(360).delay(120)} style={{ width: 112, height: 112, marginBottom: 24 }}>
                <Svg viewBox="0 0 52 52" width="100%" height="100%">
                  <Circle cx="26" cy="26" r="24" fill="none" stroke="#d1fae5" strokeWidth="3" />
                  <Circle cx="26" cy="26" r="24" fill="none" stroke="#10b981" strokeWidth="3" />
                  <Path
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="4.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13 27 L22 36 L39 17"
                  />
                </Svg>
              </Animated.View>

              <Text style={{ fontSize: 24, lineHeight: 32, fontWeight: '800', color: C.gray900, marginBottom: 4 }}>
                Order Placed!
              </Text>
              <Text style={[TS.sm, { color: C.gray500, marginBottom: 20, textAlign: 'center' }]}>
                Your order has been confirmed.{'\n'}We'll keep you updated every step of the way.
              </Text>

              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 24,
                  marginBottom: 24,
                  paddingVertical: 12,
                  backgroundColor: C.gray50,
                  borderRadius: 16,
                  alignSelf: 'stretch',
                }}
              >
                {[
                  { label: 'Items', value: String(totalQty), color: C.gray800 },
                  { label: 'Total Amount', value: `৳${toLS(totalPayable)}`, color: ORANGE2 },
                  { label: 'Shops', value: String(pendingOrders.length), color: C.gray800 },
                ].map((s, i) => (
                  <React.Fragment key={s.label}>
                    {i > 0 && <View style={{ width: 1, height: 32, backgroundColor: C.gray200 }} />}
                    <View style={{ alignItems: 'center' }}>
                      <Text style={[tpx(10), { color: C.gray400, textTransform: 'uppercase', letterSpacing: 0.5 }]}>{s.label}</Text>
                      <Text style={[TS.lg, { fontWeight: '800', color: s.color }]}>{s.value}</Text>
                    </View>
                  </React.Fragment>
                ))}
              </View>

              <View style={{ alignSelf: 'stretch', gap: 10 }}>
                <Press
                  onPress={() => leave(() => navigation.navigate(TABS.ORDERS, { screen: 'BuyShipMyOrders' }))}
                  style={({ pressed }) => ({
                    backgroundColor: pressed ? '#E05500' : ORANGE2,
                    paddingHorizontal: 24,
                    paddingVertical: 14,
                    borderRadius: 16,
                    alignItems: 'center',
                  })}
                >
                  <Text style={[TS.sm, { fontWeight: '700', color: '#ffffff' }]}>📦 Track My Orders</Text>
                </Press>
                <Press
                  onPress={() => leave(goHome)}
                  style={{ paddingVertical: 4, alignItems: 'center' }}
                >
                  {({ pressed }) => (
                    <Text style={[TS.sm, { color: pressed ? ORANGE2 : C.gray400 }]}>Continue Shopping →</Text>
                  )}
                </Press>
              </View>
            </Animated.View>
          </View>
        </Animated.ScrollView>
        {chrome}
      </View>
    );
  }

  const savedTotal = siteDiscountAmount + couponAmount;

  return (
    <View style={{ flex: 1, backgroundColor: PAGE_BG }}>
      <Animated.ScrollView
        ref={scrollRef}
        onScroll={onScroll}
        scrollEventThrottle={16}
        keyboardShouldPersistTaps="handled"
        onLayout={(e) => {
          viewportH.current = e.nativeEvent.layout.height;
        }}
        contentContainerStyle={{ paddingTop: topPad, paddingBottom: 96 + insets.bottom + kbPad }}
      >
        <View ref={contentRef} collapsable={false}>
          {/* Page header */}
          <View style={{ backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: C.gray100 }}>
            <View style={{ paddingHorizontal: PAGE_PX, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <ShoppingBag size={20} color={ORANGE2} />
              <Text style={[TS.lg, { fontWeight: '700', color: C.gray800 }]}>Place Order</Text>
              <Text style={[TS.sm, { color: C.gray400 }]}>({totalQty} items)</Text>
            </View>
          </View>

          <View style={{ paddingHorizontal: PAGE_PX, paddingTop: 16, gap: 16 }}>
            {/* ════════ Delivery address ════════ */}
            <Animated.View entering={FadeIn.duration(260)} style={CARD}>
              <View style={CARD_INNER}>
                <CardHeader
                  right={
                    <Press onPress={goAddress} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      {({ pressed }) => (
                        <>
                          <Text style={[TS.xs, { color: ORANGE2, textDecorationLine: pressed ? 'underline' : 'none' }]}>
                            {defaultShipping ? 'Change' : '+ Add Address'}{' '}
                          </Text>
                          <ChevronRight size={12} color={ORANGE2} />
                        </>
                      )}
                    </Press>
                  }
                >
                  <MapPin size={15} color={ORANGE2} />
                  <Text style={[TS.sm, { fontWeight: '700', color: C.gray700 }]}>Delivery Address</Text>
                </CardHeader>

                {defaultShipping ? (
                  <View style={{ paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                    <View
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 12,
                        backgroundColor: C.red50,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <User size={16} color={ORANGE2} />
                    </View>
                    <View style={{ flex: 1, gap: 4 }}>
                      <Text style={[TS.sm, { fontWeight: '700', color: C.gray800 }]}>{defaultShipping.name}</Text>
                      {[
                        { Icon: MapPin, text: addrLine(defaultShipping) },
                        { Icon: Phone, text: addrPhone(defaultShipping) },
                        ...(currentUser?.email ? [{ Icon: Mail, text: currentUser.email }] : []),
                      ].map(({ Icon, text }, i) => (
                        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Icon size={11} color={C.gray400} />
                          <Text style={[TS.xs, { color: C.gray500, flex: 1 }]}>{text}</Text>
                        </View>
                      ))}
                    </View>
                    <View
                      style={{
                        backgroundColor: C.emerald50,
                        borderWidth: 1,
                        borderColor: EMERALD200,
                        paddingHorizontal: 8,
                        paddingVertical: 2,
                        borderRadius: 999,
                      }}
                    >
                      <Text style={[tpx(10), { color: C.emerald600, fontWeight: '500' }]}>Default</Text>
                    </View>
                  </View>
                ) : (
                  <View style={{ paddingHorizontal: 16, paddingVertical: 24, alignItems: 'center' }}>
                    <MapPin size={32} color={C.gray200} style={{ marginBottom: 8 }} />
                    <Text style={[TS.sm, { color: C.gray400, marginBottom: 12 }]}>No delivery address saved</Text>
                    <Press
                      onPress={goAddress}
                      style={({ pressed }) => ({
                        backgroundColor: pressed ? '#E05500' : ORANGE2,
                        paddingHorizontal: 20,
                        paddingVertical: 8,
                        borderRadius: 12,
                      })}
                    >
                      <Text style={[TS.xs, { fontWeight: '600', color: '#ffffff' }]}>+ Add Address</Text>
                    </Press>
                  </View>
                )}
              </View>
            </Animated.View>

            {/* ════════ Coupon ════════ */}
            <Animated.View entering={FadeIn.duration(260).delay(40)} style={CARD}>
              <View style={CARD_INNER}>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    borderBottomWidth: 1,
                    borderBottomColor: C.gray100,
                  }}
                >
                  <Text style={TS.base}>🎟️</Text>
                  <Text style={[TS.sm, { fontWeight: '800', color: C.gray800, letterSpacing: 1.4, textTransform: 'uppercase' }]}>
                    Coupon / Discount
                  </Text>
                  <Text style={[TS.sm, { marginLeft: 'auto' }]}>✨</Text>
                </View>

                {coupon ? (
                  <Animated.View
                    entering={FadeIn.duration(220)}
                    style={{ paddingHorizontal: 20, paddingVertical: 20, backgroundColor: C.emerald600 }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        <Animated.View
                          entering={ZoomIn.duration(260)}
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: 20,
                            backgroundColor: 'rgba(52,211,153,0.25)',
                            borderWidth: 1,
                            borderColor: 'rgba(52,211,153,0.4)',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Text style={TS.lg}>✅</Text>
                        </Animated.View>
                        <View>
                          <Text style={[TS.sm, { color: '#ffffff', fontWeight: '800' }]}>Coupon Applied!</Text>
                          <Text style={[TS.xs, { color: C.emerald100, marginTop: 2, fontWeight: '500' }]}>{coupon.name}</Text>
                        </View>
                      </View>
                      <View style={{ flex: 1, alignItems: 'center' }}>
                        <Text
                          style={[tpx(10), { color: C.emerald100, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 }]}
                        >
                          You Save
                        </Text>
                        <Text style={{ fontSize: 30, lineHeight: 30, fontWeight: '800', color: YELLOW300 }}>৳{toLS(couponAmount)}</Text>
                      </View>
                      <Press
                        onPress={() => setCoupon(null)}
                        hitSlop={6}
                        accessibilityLabel="Remove coupon"
                        style={({ pressed }) => ({
                          width: 32,
                          height: 32,
                          borderRadius: 16,
                          backgroundColor: pressed ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.1)',
                          alignItems: 'center',
                          justifyContent: 'center',
                        })}
                      >
                        {({ pressed }) => <X size={15} color={pressed ? '#ffffff' : 'rgba(255,255,255,0.6)'} />}
                      </Press>
                    </View>
                  </Animated.View>
                ) : (
                  <CouponInput loading={couponLoading} onApply={handleAddCoupon} />
                )}
              </View>
            </Animated.View>

            {/* ════════ Shop orders ════════ */}
            {pendingOrders.map((shop, shopIdx) => (
              <ShopCard
                key={`${shop.shopId}-${shopIdx}`}
                shop={shop}
                shopIdx={shopIdx}
                discountPct={discountPct}
                open={!!shippingInfoOpen[shop.shopId]}
                onToggle={() => setShippingInfoOpen((prev) => ({ ...prev, [shop.shopId]: !prev[shop.shopId] }))}
                onOpenStore={() =>
                  navigation.navigate(TABS.HOME, {
                    screen: 'Collection',
                    params: { id: shop.shopId, shopName: shop.shopName || '' },
                  })
                }
                onNoteChange={onNoteChange}
                onNoteFocus={onNoteFocus}
              />
            ))}

            {/* ════════ Order summary ════════ */}
            <View style={CARD}>
              <View style={CARD_INNER}>
                <CardHeader>
                  <ShoppingBag size={15} color={ORANGE2} />
                  <Text style={[TS.sm, { fontWeight: '700', color: C.gray700 }]}>Order Summary</Text>
                </CardHeader>
                <View style={{ paddingHorizontal: 16, paddingVertical: 12, gap: 10 }}>
                  <SummaryRow label={`Goods (${goodsCategory} kinds, ${totalQty} pcs)`} value={`৳${totalAmount.toLocaleString()}`} />
                  <SummaryRow
                    label="China Local Courier"
                    value={totalLocalShipping > 0 ? `৳${totalLocalShipping.toLocaleString()}` : 'Free'}
                  />
                  {siteDiscountAmount > 0 && (
                    <SummaryRow
                      green
                      label={hasCampaignItem ? 'Discount' : `Site Discount (${discountPct}%)`}
                      value={`− ৳${toLS(siteDiscountAmount)}`}
                    />
                  )}
                  {!!coupon && <SummaryRow green label={`Coupon (${coupon.name})`} value={`− ৳${toLS(couponAmount)}`} />}
                  <View style={{ borderTopWidth: 1, borderTopColor: C.gray100, paddingTop: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Text style={[TS.base, { fontWeight: '800', color: C.gray900 }]}>Total Payable Now:</Text>
                      <Text style={{ fontSize: 20, lineHeight: 28, fontWeight: '800', color: ORANGE2 }}>৳{toLS(totalPayable)}</Text>
                    </View>
                    <Text style={[tpx(11), { color: C.gray500, textAlign: 'right', marginTop: 8 }]}>
                      * চায়না টু বাংলাদেশ শিপিং চার্জ এখানে যুক্ত করা হয়নি।
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        </View>
      </Animated.ScrollView>

      {/* ── Pinned bottom bar (fixed bottom-0; no tab bar on this route) ── */}
      <View
        onLayout={(e) => setBarH(e.nativeEvent.layout.height)}
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 50,
          backgroundColor: 'rgba(255,255,255,0.95)',
          borderTopWidth: 1,
          borderTopColor: C.gray200,
          boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
          paddingBottom: insets.bottom,
        }}
      >
        <View
          style={{
            paddingHorizontal: 16,
            paddingVertical: 14,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
          }}
        >
          <View style={{ minWidth: 0, flexShrink: 1 }}>
            <Text style={[TS.sm, { color: C.gray500 }]}>Total Payable Now</Text>
            <Text style={{ fontSize: 24, lineHeight: 30, fontWeight: '800', color: ORANGE2 }}>৳{toLS(totalPayable)}</Text>
            {(siteDiscountAmount > 0 || !!coupon) && (
              <Animated.Text entering={FadeIn.duration(180)} style={[tpx(10), { color: C.emerald600 }]}>
                Saved ৳{toLS(savedTotal)}
              </Animated.Text>
            )}
            {!defaultShipping && !loading && placedOrders.length === 0 ? (
              <Text numberOfLines={1} style={[tpx(10), { color: C.amber600, fontWeight: '600' }]}>
                Add a delivery address to continue
              </Text>
            ) : (
              !!blockReason && (
                <Text numberOfLines={1} style={[tpx(10), { color: C.amber600, fontWeight: '600' }]}>
                  {blockReason}
                </Text>
              )
            )}
          </View>

          <ScalePress
            onPress={handlePlaceOrder}
            disabled={pressLocked}
            accessibilityLabel="Place Order"
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              paddingHorizontal: 28,
              paddingVertical: 14,
              borderRadius: 999,
              backgroundColor: orderBlocked ? C.gray200 : ORANGE2,
              opacity: orderBlocked ? 0.5 : 1,
            }}
          >
            {loading ? (
              <>
                <Spinner size={16} color={orderBlocked ? C.gray400 : '#ffffff'} />
                <Text style={[TS.sm, { fontWeight: '700', color: orderBlocked ? C.gray400 : '#ffffff' }]}>Placing…</Text>
              </>
            ) : (
              <>
                <ShoppingBag size={16} color={orderBlocked ? C.gray400 : '#ffffff'} />
                <Text style={[TS.sm, { fontWeight: '700', color: orderBlocked ? C.gray400 : '#ffffff' }]}>Place Order</Text>
              </>
            )}
          </ScalePress>
        </View>
      </View>

      {chrome}

      <PrePaymentModal
        visible={showPrePaymentModal}
        orders={placedOrders}
        totalPayable={totalPayable}
        activePartial={activePartial}
        currentUser={currentUser}
        onClose={handleSkipPayment}
        onSuccess={handlePaymentSuccess}
      />
    </View>
  );
}
