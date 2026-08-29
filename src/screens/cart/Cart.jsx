import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useSelector, useDispatch } from 'react-redux';
import {
  ShoppingCart, Trash2, Minus, Plus, Check, AlertTriangle,
} from 'lucide-react-native';
import ProductImage from '@/components/ui/ProductImage';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import Sheet from '@/components/ui/Sheet';
import { removeItemFromCartRedux, addToPendingOrdersRedux } from '@/store/actions';
import { getProductById } from '@/lib/api';
import { getActiveTierPrice, resolveQty, availableFor } from '@/lib/cart';
import { getActiveDiscountPercent, applyDiscount } from '@/lib/discount';
import { toast } from '@/lib/toast';
import colors from '@/theme/colors';

const skuKey = (itemId, skuId) => `${itemId}-${skuId}`;

function Checkbox({ checked, onPress, size = 20 }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      className="items-center justify-center rounded border-2"
      style={{
        width: size,
        height: size,
        borderColor: checked ? colors.primary : '#d1d5db',
        backgroundColor: checked ? colors.primary : 'transparent',
      }}
    >
      {checked && <Check size={size * 0.65} color="#ffffff" strokeWidth={3} />}
    </Pressable>
  );
}

export default function Cart() {
  const navigation = useNavigation();
  const dispatch = useDispatch();

  const cartItems = useSelector((s) => s.cartList?.cart || []);
  const currentUser = useSelector((s) => s.user?.currentUser);
  const taka = parseFloat(useSelector((s) => s.user?.currency?.taka)) || 18;
  const siteDiscount = useSelector((s) => s.orders?.siteDiscount);
  const discountPct = getActiveDiscountPercent(siteDiscount);

  /* Local quantity overrides, keyed `${itemId}-${skuId}`. The Firestore cart
     is the source of truth; edits are applied optimistically here and sent on
     checkout, matching the web. */
  const [qtyOverrides, setQtyOverrides] = useState({});
  const [sel, setSel] = useState({});
  const [removing, setRemoving] = useState(false);
  const [stockChecking, setStockChecking] = useState(false);
  const [stockIssues, setStockIssues] = useState([]);
  const [stockRemoving, setStockRemoving] = useState(false);

  const isLoggedIn =
    currentUser && (currentUser.email || currentUser.displayName) && currentUser.email !== '';

  const qtyOf = useCallback(
    (item, sku) => {
      const k = skuKey(item.id, sku.sku_id);
      return qtyOverrides[k] ?? parseInt(sku.totalQuantity, 10) ?? 0;
    },
    [qtyOverrides],
  );

  /* MOQ is a per-product minimum across every variant, so a single line's
     floor depends on what its siblings hold. */
  const itemQty = useCallback(
    (item, exceptSkuId = null, replacement = 0) => {
      let total = 0;
      (item.skus || []).forEach((sku) => {
        if (sku.sku_id === exceptSkuId) total += replacement;
        else total += qtyOf(item, sku);
      });
      return total;
    },
    [qtyOf],
  );

  const unitPrice = useCallback(
    (item, sku) => {
      const tier = getActiveTierPrice(item.price_range, itemQty(item), taka);
      return tier ?? parseInt(sku.price, 10) ?? 0;
    },
    [itemQty, taka],
  );

  const setQty = useCallback(
    (item, sku, requested) => {
      const others = itemQty(item, sku.sku_id, 0);
      const { qty, reason } = resolveQty({
        requested,
        batch: item.batch,
        moq: item.moq,
        othersQty: others,
        stock: sku.stock ?? sku.quantity ?? 0,
      });
      if (reason) toast.error(reason);
      setQtyOverrides((prev) => ({ ...prev, [skuKey(item.id, sku.sku_id)]: qty }));
    },
    [itemQty],
  );

  /* ── Selection ── */
  const allKeys = useMemo(() => {
    const keys = [];
    cartItems.forEach((shop) =>
      shop.items?.forEach((item) =>
        item.skus?.forEach((sku) => keys.push(skuKey(item.id, sku.sku_id))),
      ),
    );
    return keys;
  }, [cartItems]);

  const allSelected = allKeys.length > 0 && allKeys.every((k) => sel[k]);

  const toggleAll = () => {
    if (allSelected) setSel({});
    else setSel(Object.fromEntries(allKeys.map((k) => [k, true])));
  };

  const toggleShop = (shop) => {
    const keys = [];
    shop.items?.forEach((item) =>
      item.skus?.forEach((sku) => keys.push(skuKey(item.id, sku.sku_id))),
    );
    const on = keys.every((k) => sel[k]);
    setSel((prev) => {
      const next = { ...prev };
      keys.forEach((k) => {
        if (on) delete next[k];
        else next[k] = true;
      });
      return next;
    });
  };

  const toggleItem = (item) => {
    const keys = (item.skus || []).map((sku) => skuKey(item.id, sku.sku_id));
    const on = keys.every((k) => sel[k]);
    setSel((prev) => {
      const next = { ...prev };
      keys.forEach((k) => {
        if (on) delete next[k];
        else next[k] = true;
      });
      return next;
    });
  };

  const toggleSku = (item, sku) => {
    const k = skuKey(item.id, sku.sku_id);
    setSel((prev) => {
      const next = { ...prev };
      if (next[k]) delete next[k];
      else next[k] = true;
      return next;
    });
  };

  /* ── Totals ── */
  const { selectedCount, goodsTotal } = useMemo(() => {
    let count = 0;
    let total = 0;
    cartItems.forEach((shop) =>
      shop.items?.forEach((item) =>
        item.skus?.forEach((sku) => {
          if (!sel[skuKey(item.id, sku.sku_id)]) return;
          const q = qtyOf(item, sku);
          if (q <= 0) return;
          count += q;
          total += unitPrice(item, sku) * q;
        }),
      ),
    );
    return { selectedCount: count, goodsTotal: total };
  }, [cartItems, sel, qtyOf, unitPrice]);

  const discountedTotal = Math.round(applyDiscount(goodsTotal, discountPct));

  /* ── Build the checkout payload ── */
  const buildPendingOrders = (exclude = new Set()) =>
    cartItems
      .map((shop) => {
        const items = (shop.items || [])
          .map((item) => {
            const skus = (item.skus || [])
              .filter((sku) => {
                const k = skuKey(item.id, sku.sku_id);
                return sel[k] && !exclude.has(k) && qtyOf(item, sku) > 0;
              })
              .map((sku) => ({
                ...sku,
                totalQuantity: qtyOf(item, sku),
                price: unitPrice(item, sku),
              }));
            return skus.length ? { ...item, skus } : null;
          })
          .filter(Boolean);
        return items.length ? { ...shop, items } : null;
      })
      .filter(Boolean);

  /* Stock travelling with a cart entry is whatever was true when it was added,
     which can be weeks old. Re-read the live product before placing an order
     rather than sending the supplier a line they cannot fill. */
  const verifySelectedStock = async () => {
    const orders = buildPendingOrders();
    const issues = [];
    await Promise.all(
      orders.flatMap((shop) =>
        shop.items.map(async (item) => {
          try {
            const res = await getProductById(item.id);
            const live = res.data || {};
            item.skus.forEach((sku) => {
              const avail = availableFor(live, sku);
              if (avail !== null && avail < sku.totalQuantity) {
                issues.push({ shop, item, sku, qty: sku.totalQuantity, avail });
              }
            });
          } catch {
            /* A network hiccup must not block a legitimate order. */
          }
        }),
      ),
    );
    return issues;
  };

  const handleCheckout = async () => {
    const orders = buildPendingOrders();
    if (!orders.length) {
      toast.error('Please select items first');
      return;
    }
    setStockChecking(true);
    const issues = await verifySelectedStock();
    setStockChecking(false);
    if (issues.length) {
      setStockIssues(issues);
      return;
    }
    dispatch(addToPendingOrdersRedux(orders));
    navigation.navigate('PlaceOrder');
  };

  /* Drop only the unavailable variants and carry on with the rest. */
  const handleDropOutOfStock = async () => {
    const exclude = new Set(stockIssues.map((i) => skuKey(i.item.id, i.sku.sku_id)));
    const remaining = buildPendingOrders(exclude);

    const grouped = new Map();
    stockIssues.forEach((i) => {
      if (!grouped.has(i.item.id)) grouped.set(i.item.id, []);
      grouped.get(i.item.id).push(i.sku);
    });

    setStockRemoving(true);
    try {
      for (const [itemId, skus] of grouped) {
        await dispatch(removeItemFromCartRedux(currentUser, { id: itemId, skus }));
      }
    } finally {
      setStockRemoving(false);
    }
    setStockIssues([]);

    if (!remaining.length) {
      toast.success('Unavailable items removed. Select what you want to order.');
      return;
    }
    dispatch(addToPendingOrdersRedux(remaining));
    navigation.navigate('PlaceOrder');
  };

  const removeItem = async (item) => {
    setRemoving(true);
    try {
      await dispatch(removeItemFromCartRedux(currentUser, item));
      toast.success('Removed from cart');
    } catch {
      toast.error('Could not remove that item.');
    }
    setRemoving(false);
  };

  const removeSku = async (item, sku) => {
    setRemoving(true);
    try {
      await dispatch(removeItemFromCartRedux(currentUser, { id: item.id, skus: [sku] }));
    } catch {
      toast.error('Could not remove that variant.');
    }
    setRemoving(false);
  };

  if (!isLoggedIn) {
    return (
      <SafeAreaView edges={['top']} className="flex-1 bg-background">
        <EmptyState
          icon={<ShoppingCart size={40} color={colors.muted} />}
          title="Sign in to see your cart"
          subtitle="Your cart syncs across every device."
          actionLabel="Sign In"
          onAction={() => navigation.navigate('Login')}
        />
      </SafeAreaView>
    );
  }

  if (cartItems.length === 0) {
    return (
      <SafeAreaView edges={['top']} className="flex-1 bg-background">
        <EmptyState
          icon={<ShoppingCart size={40} color={colors.muted} />}
          title="Your cart is empty"
          subtitle="Products you add will appear here."
          actionLabel="Start browsing"
          onAction={() => navigation.navigate('HomeTab', { screen: 'Home' })}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <View className="flex-row items-center justify-between px-3 py-2.5 bg-white border-b border-gray-100">
        <Text className="text-md font-bold text-foreground">My Cart</Text>
        <Pressable onPress={toggleAll} className="flex-row items-center gap-2">
          <Checkbox checked={allSelected} onPress={toggleAll} size={18} />
          <Text className="text-tiny text-gray-600">Select all</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerClassName="pb-40">
        {cartItems.map((shop, si) => {
          const shopKeys = [];
          shop.items?.forEach((item) =>
            item.skus?.forEach((sku) => shopKeys.push(skuKey(item.id, sku.sku_id))),
          );
          const shopSelected = shopKeys.length > 0 && shopKeys.every((k) => sel[k]);

          return (
            <View key={`${shop.shopId}-${si}`} className="bg-white mt-2">
              <View className="flex-row items-center gap-2.5 px-3 py-2.5 border-b border-gray-100">
                <Checkbox checked={shopSelected} onPress={() => toggleShop(shop)} size={18} />
                <Text className="flex-1 text-smd font-bold text-foreground" numberOfLines={1}>
                  {shop.shopName || 'Shop'}
                </Text>
                {parseInt(shop.localShipping, 10) > 0 && (
                  <Text className="text-2xs text-gray-400">
                    CN courier ৳{parseInt(shop.localShipping, 10).toLocaleString()}
                  </Text>
                )}
              </View>

              {shop.items?.map((item) => {
                const itemKeys = (item.skus || []).map((s) => skuKey(item.id, s.sku_id));
                const itemSelected = itemKeys.length > 0 && itemKeys.every((k) => sel[k]);
                const batch = Math.max(1, parseInt(item.batch, 10) || 1);
                const iq = itemQty(item);
                const moq = Math.max(1, parseInt(item.moq, 10) || 1);

                return (
                  <View key={item.id} className="px-3 py-3 border-b border-gray-50">
                    <View className="flex-row gap-2.5">
                      <Checkbox checked={itemSelected} onPress={() => toggleItem(item)} size={18} />
                      <ProductImage uri={item.picture} thumb className="w-16 h-16 rounded-lg" />
                      <View className="flex-1">
                        <Text className="text-tiny text-foreground" numberOfLines={2}>
                          {item.name}
                        </Text>
                        <View className="flex-row items-center gap-2 mt-1">
                          {moq > 1 && (
                            <Text className={`text-xxs ${iq < moq ? 'text-brand' : 'text-gray-400'}`}>
                              MOQ {moq}
                            </Text>
                          )}
                          {batch > 1 && (
                            <Text className="text-xxs text-gray-400">Packs of {batch}</Text>
                          )}
                        </View>
                      </View>
                      <Pressable onPress={() => removeItem(item)} hitSlop={8} className="p-1">
                        <Trash2 size={15} color={colors.muted} />
                      </Pressable>
                    </View>

                    {item.skus?.map((sku) => {
                      const k = skuKey(item.id, sku.sku_id);
                      const q = qtyOf(item, sku);
                      const label = [sku.color, sku.size].filter(Boolean).join(' / ');
                      return (
                        <View key={sku.sku_id} className="flex-row items-center gap-2.5 mt-2.5 pl-1">
                          <Checkbox checked={!!sel[k]} onPress={() => toggleSku(item, sku)} size={16} />
                          {sku.image ? (
                            <ProductImage uri={sku.image} thumb className="w-9 h-9 rounded" />
                          ) : null}
                          <View className="flex-1">
                            <Text className="text-2xs text-gray-500" numberOfLines={1}>
                              {label || 'Default'}
                            </Text>
                            <Text className="text-tiny font-bold text-brand">
                              ৳{unitPrice(item, sku).toLocaleString()}
                            </Text>
                          </View>
                          <View className="flex-row items-center gap-1.5">
                            <Pressable
                              onPress={() => setQty(item, sku, q - batch)}
                              hitSlop={6}
                              className="w-6 h-6 rounded-full border border-gray-300 items-center justify-center"
                            >
                              <Minus size={11} color={colors.muted} />
                            </Pressable>
                            <Text className="text-tiny font-bold text-foreground w-8 text-center">
                              {q}
                            </Text>
                            <Pressable
                              onPress={() => setQty(item, sku, q + batch)}
                              hitSlop={6}
                              className="w-6 h-6 rounded-full border border-gray-300 items-center justify-center"
                            >
                              <Plus size={11} color={colors.muted} />
                            </Pressable>
                            <Pressable onPress={() => removeSku(item, sku)} hitSlop={6} className="pl-1">
                              <Trash2 size={12} color="#d1d5db" />
                            </Pressable>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                );
              })}
            </View>
          );
        })}
      </ScrollView>

      {/* Checkout bar */}
      <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-3 pt-2.5 pb-6">
        <View className="flex-row items-center justify-between mb-2">
          <Text className="text-2xs text-gray-500">{selectedCount} pcs selected</Text>
          <View className="items-end">
            {discountPct > 0 && goodsTotal > 0 && (
              <Text className="text-2xs text-gray-400 line-through">
                ৳{goodsTotal.toLocaleString()}
              </Text>
            )}
            <Text className="text-md font-extrabold text-brand">
              ৳{discountedTotal.toLocaleString()}
            </Text>
          </View>
        </View>
        <Text className="text-xxs text-gray-400 mb-2">
          Freight and local delivery are added at checkout.
        </Text>
        <Button
          title={stockChecking ? 'Checking stock…' : 'Proceed to Checkout'}
          loading={stockChecking || removing}
          disabled={selectedCount === 0}
          onPress={handleCheckout}
        />
      </View>

      {/* Out-of-stock sheet */}
      <Sheet
        visible={stockIssues.length > 0}
        onClose={() => setStockIssues([])}
        title="Some items are unavailable"
        headerColor={colors.brand}
        footer={
          <View className="gap-2">
            <Button
              title="Remove them and continue"
              variant="brand"
              loading={stockRemoving}
              onPress={handleDropOutOfStock}
            />
            <Pressable onPress={() => setStockIssues([])} className="py-2.5 items-center">
              <Text className="text-smd text-gray-500 font-semibold">Back to cart</Text>
            </Pressable>
          </View>
        }
      >
        <View className="flex-row items-start gap-2 rounded-xl bg-amber-soft px-3 py-2.5 mb-3">
          <AlertTriangle size={15} color="#8a5a06" />
          <Text className="flex-1 text-3xs text-amber-900">
            The supplier's stock changed since you added these.
          </Text>
        </View>
        {stockIssues.map((i, n) => (
          <View key={n} className="flex-row items-center gap-2.5 py-2 border-b border-gray-100">
            <ProductImage uri={i.sku.image || i.item.picture} thumb className="w-10 h-10 rounded" />
            <View className="flex-1">
              <Text className="text-3xs text-foreground" numberOfLines={1}>
                {i.item.name}
              </Text>
              <Text className="text-xxs text-gray-400">
                {[i.sku.color, i.sku.size].filter(Boolean).join(' / ') || 'Default'}
              </Text>
            </View>
            <Text className="text-2xs text-brand font-bold">
              {i.avail} left · you want {i.qty}
            </Text>
          </View>
        ))}
      </Sheet>
    </SafeAreaView>
  );
}
