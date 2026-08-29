import React, { useState, useEffect, useMemo, useRef } from 'react';
import { View, Text, Pressable, ScrollView, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useSelector, useDispatch } from 'react-redux';
import {
  ArrowLeft, MapPin, Tag, CheckCircle2, AlertTriangle, X,
} from 'lucide-react-native';
import ProductImage from '@/components/ui/ProductImage';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import PrePaymentModal from '@/components/PrePaymentModal';
import { addToOrdersApiRedux, removeItemFromCartRedux } from '@/store/actions';
import { getSingleCoupon, updateUser, getAllPartials } from '@/lib/firebaseUtils';
import { Timestamp } from '@/lib/firebase';
import { getRedxCharge } from '@/lib/api';
import {
  summarise, orderBlockReason, validateCoupon, buildOrderDocs,
  getShopTotal, getShopQty,
} from '@/lib/checkout';
import { getActiveDiscountPercent } from '@/lib/discount';
import { toast } from '@/lib/toast';
import colors from '@/theme/colors';

export default function PlaceOrder() {
  const navigation = useNavigation();
  const dispatch = useDispatch();

  const currentUser = useSelector((s) => s.user?.currentUser);
  const pendingOrders = useSelector((s) => s.cartList?.pendingOrders || []);
  const taka = parseFloat(useSelector((s) => s.user?.currency?.taka)) || 18;
  const siteDiscount = useSelector((s) => s.orders?.siteDiscount);
  const discountPct = getActiveDiscountPercent(siteDiscount);

  const [couponCode, setCouponCode] = useState('');
  const [coupon, setCoupon] = useState(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [shopNotes, setShopNotes] = useState({});
  const [deliveryCharges, setDeliveryCharges] = useState({});
  const [partials, setPartials] = useState([]);
  const [loading, setLoading] = useState(false);
  const [placedOrders, setPlacedOrders] = useState([]);
  const [showPrePayment, setShowPrePayment] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);

  /* Guards against a double tap writing two orders. Every shop builds its own
     orderId off Math.random(), so a second run creates a whole extra order
     rather than colliding harmlessly. */
  const submittingRef = useRef(false);

  const defaultShipping = useMemo(() => {
    const book = currentUser?.addressBook || [];
    return book.find((a) => a.isDefault) || book[0] || null;
  }, [currentUser]);

  useEffect(() => {
    getAllPartials()
      .then((p) => setPartials(p || []))
      .catch(() => {});
  }, []);

  /* RedX delivery charge per shop. Returns null while no server-side proxy
     exists (see lib/api.js), in which case the default 100 stands rather than
     the order being blocked. */
  useEffect(() => {
    const areaId = defaultShipping?.area?.id;
    if (!areaId || pendingOrders.length === 0) return;
    let alive = true;
    Promise.all(
      pendingOrders.map(async (shop) => {
        const weightG = Math.max(
          500,
          Math.round(
            (shop.items || []).reduce((a, i) => a + (parseFloat(i.weight) || 0), 0) * 1000,
          ),
        );
        const data = await getRedxCharge({
          delivery_area_id: areaId,
          pickup_area_id: 288,
          cash_collection_amount: 1000,
          weight: weightG,
        }).catch(() => null);
        return [shop.shopId, data?.charge ?? null];
      }),
    ).then((pairs) => {
      if (!alive) return;
      const next = {};
      pairs.forEach(([id, charge]) => {
        if (charge != null) next[id] = charge;
      });
      setDeliveryCharges(next);
    });
    return () => {
      alive = false;
    };
  }, [defaultShipping, pendingOrders]);

  const summary = useMemo(
    () => summarise(pendingOrders, { siteDiscountPct: discountPct, coupon }),
    [pendingOrders, discountPct, coupon],
  );

  const blockReason = orderBlockReason(pendingOrders);
  const blocked =
    loading || placedOrders.length > 0 || !defaultShipping || pendingOrders.length === 0 || !!blockReason;

  const handleAddCoupon = async () => {
    if (!couponCode.trim()) {
      toast.error('Please enter a coupon code');
      return;
    }
    setCouponLoading(true);
    try {
      const found = await getSingleCoupon(couponCode.trim());
      const error = validateCoupon(found, {
        totalAmount: summary.totalAmount,
        usedCoupons: currentUser?.usedCoupons || [],
      });
      if (error) {
        toast.error(error);
      } else {
        setCoupon(found);
        setCouponCode('');
        toast.success('Coupon applied!');
      }
    } catch {
      toast.error('Failed to verify coupon');
    }
    setCouponLoading(false);
  };

  const handlePlaceOrder = async () => {
    if (submittingRef.current) return;
    if (!defaultShipping) {
      toast.error('Please add a shipping address first.');
      navigation.navigate('OrdersTab', {
        screen: 'UserInformation',
        params: { from: 'place-order' },
      });
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
        couponAmount: summary.couponAmount,
        taka,
        defaultShipping,
        deliveryCharges,
        shopNotes,
        timestamp: Timestamp.now(),
      });

      await dispatch(addToOrdersApiRedux(currentUser, orders));

      if (coupon && currentUser) {
        const usedCoupons = currentUser.usedCoupons || [];
        const existing = usedCoupons.find((c) => c.id === coupon.id);
        const updated = existing
          ? usedCoupons.map((c) =>
              c.id === coupon.id ? { ...c, used: parseInt(c.used, 10) + 1 } : c,
            )
          : [...usedCoupons, { ...coupon, used: 1 }];
        await updateUser({ ...currentUser, usedCoupons: updated });
      }

      /* Remove only what was ordered — the cart may hold unselected lines. */
      for (const shop of orders) {
        for (const item of shop.items) {
          await dispatch(removeItemFromCartRedux(currentUser, { ...item, shopId: shop.shopId }));
        }
      }

      setPlacedOrders(orders);
      setShowPrePayment(true);
    } catch {
      toast.error('Failed to place order. Please try again.');
      /* Only a failed attempt is retryable. On success the flag stays set —
         the order exists, and nothing here should write a second one. */
      submittingRef.current = false;
    }
    setLoading(false);
  };

  if (orderPlaced) {
    return (
      <SafeAreaView edges={['top']} className="flex-1 bg-background">
        <View className="flex-1 items-center justify-center px-8">
          <CheckCircle2 size={56} color={colors.success} />
          <Text className="text-lg font-extrabold text-foreground mt-4">Order placed</Text>
          <Text className="text-smd text-gray-500 text-center mt-2">
            We've received your payment details and will confirm shortly.
          </Text>
          <Button
            title="View my orders"
            className="mt-6 self-stretch"
            onPress={() =>
              navigation.navigate('OrdersTab', { screen: 'BuyShipMyOrders' })
            }
          />
          <Pressable
            onPress={() => navigation.navigate('HomeTab', { screen: 'Home' })}
            className="py-3"
          >
            <Text className="text-smd text-gray-500 font-semibold">Continue shopping</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (pendingOrders.length === 0) {
    return (
      <SafeAreaView edges={['top']} className="flex-1 bg-background">
        <EmptyState
          title="Nothing to check out"
          subtitle="Select items in your cart first."
          actionLabel="Back to cart"
          onAction={() => navigation.navigate('Cart')}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <View className="flex-row items-center gap-2 px-3 py-2.5 bg-white border-b border-gray-100">
        <Pressable onPress={() => navigation.goBack()} hitSlop={8} className="p-1">
          <ArrowLeft size={22} color={colors.foreground} />
        </Pressable>
        <Text className="flex-1 text-md font-bold text-foreground">Checkout</Text>
      </View>

      <ScrollView contentContainerClassName="pb-44" keyboardShouldPersistTaps="handled">
        {/* Address */}
        <Pressable
          onPress={() =>
            navigation.navigate('OrdersTab', {
              screen: 'UserInformation',
              params: { from: 'place-order' },
            })
          }
          className="bg-white px-3 py-3 mt-2 flex-row items-start gap-2.5"
        >
          <MapPin size={17} color={colors.primary} />
          <View className="flex-1">
            {defaultShipping ? (
              <>
                <Text className="text-smd font-bold text-foreground">
                  {defaultShipping.name} · {defaultShipping.phone}
                </Text>
                <Text className="text-2xs text-gray-500 mt-0.5">
                  {[defaultShipping.address, defaultShipping.area?.name, defaultShipping.district]
                    .filter(Boolean)
                    .join(', ')}
                </Text>
              </>
            ) : (
              <>
                <Text className="text-smd font-bold text-brand">Add a shipping address</Text>
                <Text className="text-2xs text-gray-500 mt-0.5">Required before ordering</Text>
              </>
            )}
          </View>
        </Pressable>

        {/* Shops */}
        {pendingOrders.map((shop, i) => (
          <View key={`${shop.shopId}-${i}`} className="bg-white mt-2">
            <View className="px-3 py-2.5 border-b border-gray-100 flex-row items-center justify-between">
              <Text className="text-smd font-bold text-foreground flex-1" numberOfLines={1}>
                {shop.shopName || 'Shop'}
              </Text>
              <Text className="text-2xs text-gray-400">{getShopQty(shop)} pcs</Text>
            </View>

            {shop.items?.map((item) => (
              <View key={item.id} className="px-3 py-2.5 border-b border-gray-50">
                <View className="flex-row gap-2.5">
                  <ProductImage uri={item.picture} thumb className="w-12 h-12 rounded-lg" />
                  <View className="flex-1">
                    <Text className="text-2xs text-foreground" numberOfLines={2}>
                      {item.name}
                    </Text>
                    {item.skus?.map((sku, n) => (
                      <Text key={n} className="text-xxs text-gray-400 mt-0.5">
                        {[sku.color, sku.size].filter(Boolean).join(' / ') || 'Default'} ×{' '}
                        {sku.totalQuantity} · ৳
                        {(parseInt(sku.price, 10) * parseInt(sku.totalQuantity, 10)).toLocaleString()}
                      </Text>
                    ))}
                  </View>
                </View>
              </View>
            ))}

            <View className="px-3 py-2.5">
              <Text className="text-xxs text-gray-400 mb-1.5">Note for this seller</Text>
              <TextInput
                value={shopNotes[shop.shopId] || ''}
                onChangeText={(t) => setShopNotes((p) => ({ ...p, [shop.shopId]: t }))}
                placeholder="Optional"
                placeholderTextColor="#9ca3af"
                className="border border-gray-200 rounded-lg px-2.5 py-2 text-2xs text-foreground"
              />
              <View className="flex-row justify-between mt-2">
                <Text className="text-2xs text-gray-500">Goods</Text>
                <Text className="text-2xs font-semibold text-foreground">
                  ৳{getShopTotal(shop).toLocaleString()}
                </Text>
              </View>
              {parseInt(shop.localShipping, 10) > 0 && (
                <View className="flex-row justify-between mt-0.5">
                  <Text className="text-2xs text-gray-500">China local courier</Text>
                  <Text className="text-2xs font-semibold text-foreground">
                    ৳{parseInt(shop.localShipping, 10).toLocaleString()}
                  </Text>
                </View>
              )}
              <View className="flex-row justify-between mt-0.5">
                <Text className="text-2xs text-gray-500">BD delivery (est.)</Text>
                <Text className="text-2xs font-semibold text-foreground">
                  ৳{(deliveryCharges[shop.shopId] ?? 100).toLocaleString()}
                </Text>
              </View>
            </View>
          </View>
        ))}

        {/* Coupon */}
        <View className="bg-white mt-2 px-3 py-3">
          <View className="flex-row items-center gap-2 mb-2">
            <Tag size={15} color={colors.primary} />
            <Text className="text-smd font-bold text-foreground">Coupon</Text>
          </View>
          {coupon ? (
            <View className="flex-row items-center justify-between rounded-lg bg-primary-tint px-3 py-2.5">
              <View>
                <Text className="text-smd font-bold text-primary">{coupon.name}</Text>
                <Text className="text-2xs text-gray-500">
                  −৳{Math.round(summary.couponAmount).toLocaleString()}
                </Text>
              </View>
              <Pressable onPress={() => setCoupon(null)} hitSlop={8}>
                <X size={16} color={colors.muted} />
              </Pressable>
            </View>
          ) : (
            <View className="flex-row gap-2">
              <TextInput
                value={couponCode}
                onChangeText={setCouponCode}
                autoCapitalize="characters"
                placeholder="Enter code"
                placeholderTextColor="#9ca3af"
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2.5 text-smd text-foreground"
              />
              <Button
                title="Apply"
                variant="outline"
                loading={couponLoading}
                onPress={handleAddCoupon}
              />
            </View>
          )}
        </View>

        {/* Summary */}
        <View className="bg-white mt-2 px-3 py-3">
          {[
            { label: `Goods (${summary.totalQty} pcs)`, value: summary.totalAmount },
            ...(summary.siteDiscountAmount > 0
              ? [{ label: 'Discount', value: -summary.siteDiscountAmount, tone: 'green' }]
              : []),
            ...(summary.couponAmount > 0
              ? [{ label: 'Coupon', value: -summary.couponAmount, tone: 'green' }]
              : []),
            ...(summary.totalLocalShipping > 0
              ? [{ label: 'China local courier', value: summary.totalLocalShipping }]
              : []),
          ].map((r) => (
            <View key={r.label} className="flex-row justify-between py-1">
              <Text className="text-smd text-gray-600">{r.label}</Text>
              <Text
                className={`text-smd font-semibold ${r.tone === 'green' ? 'text-invoice-ok' : 'text-foreground'}`}
              >
                {r.value < 0 ? '−' : ''}৳{Math.abs(Math.round(r.value)).toLocaleString()}
              </Text>
            </View>
          ))}
          <View className="h-px bg-gray-100 my-2" />
          <View className="flex-row justify-between">
            <Text className="text-md font-bold text-foreground">Payable now</Text>
            <Text className="text-md font-extrabold text-brand">
              ৳{Math.round(summary.totalPayable).toLocaleString()}
            </Text>
          </View>
          <Text className="text-xxs text-gray-400 mt-2">
            International freight is billed after weighing at our China warehouse.
          </Text>
        </View>
      </ScrollView>

      <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-3 pt-2.5 pb-6">
        {!!blockReason && (
          <View className="flex-row items-center gap-1.5 mb-2">
            <AlertTriangle size={13} color={colors.brand} />
            <Text className="text-2xs text-brand flex-1">{blockReason}</Text>
          </View>
        )}
        <Button
          title={`Place Order · ৳${Math.round(summary.totalPayable).toLocaleString()}`}
          loading={loading}
          disabled={blocked}
          onPress={handlePlaceOrder}
        />
      </View>

      <PrePaymentModal
        visible={showPrePayment}
        orders={placedOrders}
        totalPayable={Math.round(summary.totalPayable)}
        activePartial={partials[0] || null}
        currentUser={currentUser}
        onSuccess={() => {
          setShowPrePayment(false);
          setOrderPlaced(true);
        }}
        /* Closed without paying — the order already exists, so send them to
           My Orders where they can settle it later. */
        onClose={() => {
          setShowPrePayment(false);
          navigation.navigate('OrdersTab', { screen: 'BuyShipMyOrders' });
        }}
      />
    </SafeAreaView>
  );
}
