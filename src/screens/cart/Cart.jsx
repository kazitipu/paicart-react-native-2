import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { View, Text, RefreshControl, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { useSelector, useDispatch } from 'react-redux';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';
import {
  Trash2, ShoppingBag, ShoppingCart, Store, ChevronRight,
  Minus, Plus, Info, AlertCircle, Plane, Ship,
} from 'lucide-react-native';
import Header from '@/components/Header';
import ProductImage from '@/components/ui/ProductImage';
import { C, ORANGE2, Press, Price, Spinner } from '@/components/product/ui';
import {
  RED, BODY, TS, tpx, CC, SHADOW_SM,
  Checkbox, DashedRule, CartQtyInput, EmptyScreen, PlaceOrderButton, StockIssuesSheet, sized,
} from '@/components/cart/CartBits';
import { removeItemFromCartRedux, addToPendingOrdersRedux } from '@/store/actions';
import { getProductById, getShippingQuote } from '@/lib/api';
import { getActiveTierPrice, resolveQty, availableFor } from '@/lib/cart';
import { getActiveDiscountPercent, applyDiscount } from '@/lib/discount';
import { getItemDiscountPct as itemPctFor } from '@/lib/checkout';
import { AIR_PARCEL_MAX_KG } from '@/lib/freight';
import { toast } from '@/lib/toast';
import useHideOnScroll from '@/lib/useHideOnScroll';
import { TABS } from '@/navigation/routes';
import { goHome } from '@/navigation/goHome';

/* ═══════════════════════════════════════════════════════════════════════
   CART — port of paicart-nextjs15 src/app/cart/page.jsx at its mobile
   breakpoint (< 640px: px-2 page gutter, card SKU rows, compact pinned bar).

   Data: redux s.cartList.cart (shops → items → skus, oldest first). A flat
   `skus` array mirrors it with the user's edited quantity and live price;
   selection is keyed shopId | itemId | `${itemId}-${skuId}`, as on the web.
   Selecting an item re-reads the live product (price, stock, MOQ, pack) and
   changing quantity re-quotes the China local courier.

   Native additions: press feedback, row exit/layout animations on removal,
   pull to refresh (re-reads live product facts for the selection).
   ═══════════════════════════════════════════════════════════════════════ */

const skuKey = (itemId, skuId) => `${itemId}-${skuId}`;
const PAGE_PX = 8; // px-2
const toLS = (n) => Math.round(Number(n) || 0).toLocaleString();

export default function Cart() {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();

  const cartItems = useSelector((s) => s.cartList?.cart || []);
  /* Firestore appends new entries, so the cart arrives oldest-first. Render it
     newest-on-top (items inside a shop too). Display only — selection and
     totals are keyed by id, never by position. */
  const orderedCart = useMemo(
    () =>
      [...cartItems].reverse().map((shop) => ({
        ...shop,
        items: [...(shop.items || [])].reverse(),
      })),
    [cartItems],
  );
  const currentUser = useSelector((s) => s.user?.currentUser);
  const taka = parseFloat(useSelector((s) => s.user?.currency?.taka)) || 18;
  const discountPct = getActiveDiscountPercent(useSelector((s) => s.orders?.siteDiscount));

  /* A campaign % baked into the entry at add-to-cart beats the site-wide one. */
  const getItemDiscountPct = (item) => itemPctFor(item, discountPct);

  const [skus, setSkus] = useState([]);
  const [sel, setSel] = useState({});
  const [selectAll, setSelectAll] = useState(false);
  const [stockChecking, setStockChecking] = useState(false);
  const [stockRemoving, setStockRemoving] = useState(false);
  const [stockIssues, setStockIssues] = useState([]);
  const [removingKey, setRemovingKey] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  /* Rebuild the flat list whenever the cart changes. New entries start
     unselected; existing ones keep their selection. */
  useEffect(() => {
    const flat = [];
    const initSel = {};
    cartItems.forEach((shop) => {
      initSel[shop.shopId] = sel[shop.shopId] ?? false;
      shop.items?.forEach((item) => {
        initSel[item.id] = sel[item.id] ?? false;
        item.skus?.forEach((sku) => {
          const flatId = skuKey(item.id, sku.sku_id);
          flat.push({ ...sku, sku_id: flatId, shopId: shop.shopId, itemId: item.id });
          initSel[flatId] = sel[flatId] ?? false;
        });
      });
    });
    setSkus(flat);
    setSel(initSel);
    setSelectAll(cartItems.length > 0 && cartItems.every((shop) => initSel[shop.shopId]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartItems]);

  /* ── live product facts for whatever is selected ── */
  const [itemMeta, setItemMeta] = useState({});
  const [metaLoading, setMetaLoading] = useState({});
  const metaFetchedRef = useRef(new Set());

  const selectedItemIds = useMemo(() => {
    const ids = [];
    cartItems.forEach((shop) =>
      shop.items?.forEach((item) => {
        if (item.skus?.some((sk) => sel[skuKey(item.id, sk.sku_id)])) ids.push(String(item.id));
      }),
    );
    return ids;
  }, [cartItems, sel]);

  const fetchMeta = useCallback((itemId) => {
    metaFetchedRef.current.add(itemId);
    setMetaLoading((prev) => ({ ...prev, [itemId]: true }));
    return getProductById(itemId)
      .then((res) => {
        const d = res.data || {};
        const variants = {};
        (Array.isArray(d.variants) ? d.variants : []).forEach((v) => {
          variants[String(v.sku_id)] = {
            price: parseFloat(v.price) || 0,
            quantity: parseInt(v.quantity, 10) || 0,
            properties: v.properties || '',
          };
        });
        setItemMeta((prev) => ({
          ...prev,
          [itemId]: {
            moq: parseInt(d.moq, 10) || 1,
            batch: parseInt(d.batch, 10) || 1,
            priceRange: d.price_range || null,
            basePrice: parseFloat(d.salePrice || d.price || 0),
            totalAvailable: parseInt(d.totalAvailableQuantity, 10),
            itemWeight: parseFloat(d.item_weight) || 0,
            variants,
            ok: true,
          },
        }));
      })
      .catch(() => {
        /* keep the cart's own snapshot rather than blocking on an API blip */
        setItemMeta((prev) => ({ ...prev, [itemId]: prev[itemId]?.ok ? prev[itemId] : { ok: false } }));
      })
      .finally(() => setMetaLoading((prev) => ({ ...prev, [itemId]: false })));
  }, []);

  useEffect(() => {
    selectedItemIds.forEach((itemId) => {
      if (!metaFetchedRef.current.has(itemId)) fetchMeta(itemId);
    });
  }, [selectedItemIds, fetchMeta]);

  const effBatch = useCallback(
    (item) => parseInt(itemMeta[String(item.id)]?.batch, 10) || parseInt(item.batch, 10) || 1,
    [itemMeta],
  );
  const effMoq = useCallback(
    (item) => parseInt(itemMeta[String(item.id)]?.moq, 10) || parseInt(item.moq, 10) || 1,
    [itemMeta],
  );
  const effStock = useCallback(
    (item, sku) => {
      const meta = itemMeta[String(item.id)];
      const v = meta?.variants?.[String(sku.sku_id)];
      if (v) return v.quantity;
      if (meta && Object.keys(meta.variants || {}).length === 0 && Number.isFinite(meta.totalAvailable)) {
        return meta.totalAvailable;
      }
      return parseInt(sku.quantity, 10) || 0;
    },
    [itemMeta],
  );
  const itemUnitWeight = useCallback(
    (item) => parseFloat(itemMeta[String(item.id)]?.itemWeight) || parseFloat(item.unitWeight) || 0,
    [itemMeta],
  );

  /* ── qty / price ── */
  const flatOf = (item, sk) => skus.find((x) => x.sku_id === skuKey(item.id, sk.sku_id));
  const qtyOfSku = (item, sk) => parseInt(flatOf(item, sk)?.totalQuantity ?? sk.totalQuantity, 10) || 0;

  const getTotalQtyForItem = (item, changedFlatId, newQty) => {
    let total = 0;
    item.skus?.forEach((sku) => {
      const fid = skuKey(item.id, sku.sku_id);
      if (fid === changedFlatId) total += parseInt(newQty, 10) || 0;
      else total += qtyOfSku(item, sku);
    });
    return total;
  };

  const updateSkuQty = (item, sku, rawQty) => {
    const flatId = skuKey(item.id, sku.sku_id);
    const { qty: n, reason } = resolveQty({
      requested: rawQty,
      batch: effBatch(item),
      moq: effMoq(item),
      othersQty: getTotalQtyForItem(item, flatId, 0),
      stock: effStock(item, sku),
    });
    if (reason) toast.error(reason);

    const itemQty = getTotalQtyForItem(item, flatId, n);
    const liveRange = itemMeta[String(item.id)]?.priceRange;
    const range = liveRange ?? item.price_range;
    const tierPrice = getActiveTierPrice(range, itemQty, taka);
    setSkus((prev) =>
      prev.map((s) => {
        if (s.sku_id === flatId) return { ...s, totalQuantity: n, price: tierPrice ?? s.price };
        if (range && s.itemId === item.id) return { ...s, price: tierPrice ?? s.price };
        return s;
      }),
    );
  };

  /* Re-price against today's supplier figures; writes only when a price moved. */
  useEffect(() => {
    if (!skus.length) return;
    let changed = false;
    const next = skus.map((s) => s);
    cartItems.forEach((shop) =>
      shop.items?.forEach((item) => {
        const meta = itemMeta[String(item.id)];
        if (!meta?.ok) return;
        const itemQty = (item.skus || []).reduce((a, sk) => {
          const f = skus.find((x) => x.sku_id === skuKey(item.id, sk.sku_id));
          return a + (parseInt(f?.totalQuantity ?? sk.totalQuantity, 10) || 0);
        }, 0);
        const tier = getActiveTierPrice(meta.priceRange, itemQty, taka);
        (item.skus || []).forEach((sk) => {
          const idx = next.findIndex((x) => x.sku_id === skuKey(item.id, sk.sku_id));
          if (idx < 0) return;
          const variantPrice = meta.variants?.[String(sk.sku_id)]?.price;
          const fresh =
            tier ??
            (variantPrice > 0
              ? Math.round(variantPrice * taka)
              : meta.basePrice > 0
                ? Math.round(meta.basePrice * taka)
                : null);
          if (fresh && Math.round(parseFloat(next[idx].price) || 0) !== fresh) {
            next[idx] = { ...next[idx], price: fresh };
            changed = true;
          }
        });
      }),
    );
    if (changed) setSkus(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemMeta, cartItems, taka]);

  /* ── China local courier, re-quoted live (debounced 800ms) ── */
  const [itemShip, setItemShip] = useState({}); // item.id → number | 'free' | 'later'
  const [shipLoading, setShipLoading] = useState({});
  const shipTimerRef = useRef(null);

  const shipSignatures = useMemo(() => {
    const sig = {};
    cartItems.forEach((shop) =>
      shop.items?.forEach((item) => {
        const parts = (item.skus || []).map((sk) => {
          const f = skus.find((x) => x.sku_id === skuKey(item.id, sk.sku_id));
          return `${sk.sku_id}:${parseInt(f?.totalQuantity ?? sk.totalQuantity, 10) || 0}`;
        });
        sig[item.id] = parts.sort().join('|');
      }),
    );
    return sig;
  }, [cartItems, skus]);

  const [quotedSigs, setQuotedSigs] = useState(null);

  useEffect(() => {
    if (!skus.length) return undefined;
    /* First pass records the quantities the cart loaded with — the stored
       charge was quoted for exactly those. */
    if (quotedSigs === null) {
      setQuotedSigs({ ...shipSignatures });
      return undefined;
    }
    const staleIds = Object.keys(shipSignatures).filter(
      (id) => shipSignatures[id] && shipSignatures[id] !== quotedSigs[id],
    );
    if (!staleIds.length) return undefined;

    const byId = new Map();
    cartItems.forEach((shop) => shop.items?.forEach((item) => byId.set(String(item.id), item)));

    clearTimeout(shipTimerRef.current);
    shipTimerRef.current = setTimeout(() => {
      setQuotedSigs((prev) => {
        const next = { ...prev };
        staleIds.forEach((id) => {
          next[id] = shipSignatures[id];
        });
        return next;
      });
      staleIds.forEach((id) => {
        const item = byId.get(String(id));
        if (!item) return;
        const skuList = (item.skus || [])
          .map((sk) => {
            const f = skus.find((x) => x.sku_id === skuKey(item.id, sk.sku_id));
            return { ...sk, totalQuantity: parseInt(f?.totalQuantity ?? sk.totalQuantity, 10) || 0 };
          })
          .filter((sk) => sk.totalQuantity > 0);
        const qty = skuList.reduce((a, sk) => a + sk.totalQuantity, 0);
        if (qty <= 0) return;

        setShipLoading((prev) => ({ ...prev, [item.id]: true }));
        getShippingQuote({ productId: item.id, totalQuantity: qty, skus: JSON.stringify(skuList) })
          .then((res) => {
            const sc = res.data?.shippingCost;
            const value = sc?.freePostage
              ? 'free'
              : sc?.freight
                ? Math.round(parseFloat(sc.freight) * taka)
                : 'later';
            setItemShip((prev) => ({ ...prev, [item.id]: value }));
          })
          .catch(() => setItemShip((prev) => ({ ...prev, [item.id]: 'later' })))
          .finally(() => setShipLoading((prev) => ({ ...prev, [item.id]: false })));
      });
    }, 800);
    return () => clearTimeout(shipTimerRef.current);
  }, [shipSignatures, quotedSigs, cartItems, skus, taka]);

  const itemLocalShipping = (shop, item) => {
    const live = itemShip[item.id];
    if (live === 'free') return 0;
    if (typeof live === 'number') return live;
    if (live === 'later') return 0;
    const itemCount = shop.items?.length || 1;
    return itemCount === 1 ? Math.round(parseFloat(shop.localShipping) || 0) : 0;
  };

  /* ── selection ── */
  const syncParents = (next, shop, item) => {
    next[item.id] = item.skus?.every((sk) => next[skuKey(item.id, sk.sku_id)]) ?? false;
    next[shop.shopId] = shop.items?.every((it) => next[it.id]) ?? false;
    return next;
  };

  const toggleSelectAll = (checked) => {
    setSelectAll(checked);
    const next = {};
    cartItems.forEach((shop) => {
      next[shop.shopId] = checked;
      shop.items?.forEach((item) => {
        next[item.id] = checked;
        item.skus?.forEach((sk) => {
          next[skuKey(item.id, sk.sku_id)] = checked;
        });
      });
    });
    setSel(next);
  };

  const toggleShop = (shop, checked) => {
    const next = { ...sel, [shop.shopId]: checked };
    shop.items?.forEach((item) => {
      next[item.id] = checked;
      item.skus?.forEach((sk) => {
        next[skuKey(item.id, sk.sku_id)] = checked;
      });
    });
    setSelectAll(cartItems.every((s) => next[s.shopId]));
    setSel(next);
  };

  const toggleItem = (shop, item, checked) => {
    const next = { ...sel, [item.id]: checked };
    item.skus?.forEach((sk) => {
      next[skuKey(item.id, sk.sku_id)] = checked;
    });
    syncParents(next, shop, item);
    setSelectAll(cartItems.every((s) => next[s.shopId]));
    setSel(next);
  };

  const toggleSku = (shop, item, sku, checked) => {
    const next = { ...sel, [skuKey(item.id, sku.sku_id)]: checked };
    syncParents(next, shop, item);
    setSelectAll(cartItems.every((s) => next[s.shopId]));
    setSel(next);
  };

  /* ── remove (no confirmation, as on the web) ── */
  const loggedInForWrite = () => {
    if (!currentUser?.id && !currentUser?.email) {
      toast.error('Login required');
      return false;
    }
    return true;
  };

  const handleRemove = async (shop, item) => {
    if (!loggedInForWrite()) return;
    setRemovingKey(String(item.id));
    try {
      await dispatch(removeItemFromCartRedux(currentUser, { id: item.id, skus: item.skus }));
      toast.success('Item removed from cart');
    } catch {
      toast.error('Could not remove that item.');
    } finally {
      setRemovingKey(null);
    }
  };

  /* Removing the last variant removes the item. */
  const handleRemoveSku = async (shop, item, sku) => {
    if (!loggedInForWrite()) return;
    if ((item.skus?.length || 0) <= 1) {
      handleRemove(shop, item);
      return;
    }
    setRemovingKey(skuKey(item.id, sku.sku_id));
    try {
      await dispatch(removeItemFromCartRedux(currentUser, { id: item.id, skus: [sku] }));
      toast.success('Variant removed from cart');
    } catch {
      toast.error('Could not remove that variant.');
    } finally {
      setRemovingKey(null);
    }
  };

  /* ── per-item / per-shop display totals ── */
  const itemSelQty = (item) =>
    item.skus?.reduce((a, sk) => (sel[skuKey(item.id, sk.sku_id)] ? a + qtyOfSku(item, sk) : a), 0) || 0;

  const itemSelTotal = (item) =>
    item.skus?.reduce((a, sk) => {
      if (!sel[skuKey(item.id, sk.sku_id)]) return a;
      const f = flatOf(item, sk);
      return a + (parseFloat(f?.price ?? sk.price) || 0) * qtyOfSku(item, sk);
    }, 0) || 0;

  const itemSelTotalDiscounted = (item) => Math.round(applyDiscount(itemSelTotal(item), getItemDiscountPct(item)));

  const itemTotalWeight = (item) =>
    itemUnitWeight(item) * (item.skus?.reduce((a, sk) => a + qtyOfSku(item, sk), 0) || 0);

  const itemRateUnit = (item) => {
    if ((item.shipmentMethod || 'Air') === 'Sea') return 'kg';
    const w = itemTotalWeight(item);
    if (w > 0) return w <= AIR_PARCEL_MAX_KG ? 'parcel' : 'kg';
    return item.shippingRateUnit || 'kg';
  };

  const shopSelQty = (shop) => shop.items?.reduce((a, item) => a + itemSelQty(item), 0) || 0;
  const shopSelTotalDiscounted = (shop) =>
    shop.items?.reduce((a, item) => a + itemSelTotalDiscounted(item), 0) || 0;
  const shopLocalShipping = (shop) =>
    shop.items?.reduce((a, item) => a + (itemSelQty(item) > 0 ? itemLocalShipping(shop, item) : 0), 0) || 0;

  /* ── totals ── */
  const selectedSkus = skus.filter((s) => sel[s.sku_id]);
  const totalQty = selectedSkus.reduce((a, s) => a + (parseInt(s.totalQuantity, 10) || 0), 0);
  const totalAmount = selectedSkus.reduce(
    (a, s) => a + (parseFloat(s.price) || 0) * (parseInt(s.totalQuantity, 10) || 0),
    0,
  );
  const allCartQty = skus.reduce((a, s) => a + (parseInt(s.totalQuantity, 10) || 0), 0);

  const itemDiscountPctById = {};
  cartItems.forEach((shop) =>
    shop.items?.forEach((item) => {
      itemDiscountPctById[item.id] = getItemDiscountPct(item);
    }),
  );
  /* Summed the same way as each shop card's "Total Payable Amount" (discount
     applied to an item's line total, then rounded) so the pinned bar, the
     shop totals and checkout always show one figure. The web discounted and
     rounded each piece instead, which drifted by ৳1 (৳1,553 × 2 = ৳3,106 vs
     ৳3,450 − 10% = ৳3,105). */
  const discountedTotalAmount = cartItems.reduce((a, shop) => a + shopSelTotalDiscounted(shop), 0);
  const totalLocalShipping = cartItems.reduce((a, shop) => a + shopLocalShipping(shop), 0);

  /* Everything wrong with the selection, against the fresh product facts. */
  const cartIssues = [];
  cartItems.forEach((shop) =>
    shop.items?.forEach((item) => {
      const qty = itemSelQty(item);
      if (qty <= 0) return;
      const label = item.name?.slice(0, 28) || 'This item';
      const moq = effMoq(item);
      const batch = effBatch(item);
      if (qty < moq) {
        cartIssues.push({ itemId: item.id, text: `${label}… — minimum order is ${moq} pcs, add ${moq - qty} more.` });
      }
      item.skus?.forEach((sk) => {
        if (!sel[skuKey(item.id, sk.sku_id)]) return;
        const q = qtyOfSku(item, sk);
        const stock = effStock(item, sk);
        if (stock > 0 && q > stock) {
          cartIssues.push({
            itemId: item.id,
            text: `${label}… — only ${stock} pcs left of ${[sk.color, sk.size].filter(Boolean).join(' · ') || 'this variant'}.`,
          });
        } else if (stock === 0 && itemMeta[String(item.id)]?.ok) {
          cartIssues.push({ itemId: item.id, text: `${label}… — sold out, please remove it.` });
        }
        if (batch > 1 && q % batch !== 0) {
          cartIssues.push({ itemId: item.id, text: `${label}… — must be ordered in packs of ${batch}.` });
        }
      });
    }),
  );

  const courierStale =
    quotedSigs !== null &&
    selectedItemIds.some((id) => shipSignatures[id] && shipSignatures[id] !== quotedSigs[id]);
  const courierPending = courierStale || selectedItemIds.some((id) => shipLoading[id]);
  const metaPending = selectedItemIds.some((id) => metaLoading[id]);
  const checkoutBlocked =
    totalAmount === 0 || metaPending || courierPending || stockChecking || cartIssues.length > 0;
  const checkoutBlockReason = metaPending
    ? 'Checking price & stock…'
    : courierPending
      ? 'Updating courier charge…'
      : stockChecking
        ? 'Verifying stock…'
        : cartIssues[0]?.text || '';
  const payableAmount = discountedTotalAmount + totalLocalShipping;

  /* ── place order ── */
  const buildPendingOrders = (exclude = new Set()) => {
    const pendingOrders = [];
    cartItems.forEach((shop) => {
      let shopOrder = null;
      shop.items?.forEach((item) => {
        item.skus?.forEach((sku) => {
          const k = skuKey(item.id, sku.sku_id);
          if (!sel[k] || exclude.has(k)) return;
          const flatSku = skus.find((s) => s.sku_id === k);
          if (!flatSku) return;
          if (!shopOrder) {
            shopOrder = {
              shopId: shop.shopId,
              shopName: shop.shopName,
              localShipping: String(shopLocalShipping(shop)),
              items: [{ ...item, skus: [flatSku] }],
            };
          } else {
            const existing = shopOrder.items.find((i) => i.id === item.id);
            if (existing) existing.skus.push(flatSku);
            else shopOrder.items.push({ ...item, skus: [flatSku] });
          }
        });
      });
      if (shopOrder) pendingOrders.push(shopOrder);
    });
    /* Weight and the freight unit were fixed at add-to-cart; quantity may have
       moved since (and can flip the air 0–0.3kg parcel band). */
    pendingOrders.forEach((shop) => {
      shop.items.forEach((item) => {
        const qty = item.skus.reduce((a, sk) => a + (parseInt(sk.totalQuantity, 10) || 0), 0);
        const per = itemUnitWeight(item);
        if (per > 0) item.weight = (per * qty).toFixed(2);
        const w = parseFloat(item.weight) || 0;
        item.shippingRateUnit =
          (item.shipmentMethod || 'Air') === 'Sea'
            ? 'kg'
            : w > 0
              ? w <= AIR_PARCEL_MAX_KG
                ? 'parcel'
                : 'kg'
              : item.shippingRateUnit || 'kg';
      });
    });
    return pendingOrders;
  };

  const proceedToCheckout = (orders) => {
    dispatch(addToPendingOrdersRedux(orders));
    navigation.navigate('PlaceOrder');
  };

  const verifySelectedStock = async () => {
    const byItem = new Map();
    cartItems.forEach((shop) =>
      shop.items?.forEach((item) => {
        item.skus?.forEach((sku) => {
          if (!sel[skuKey(item.id, sku.sku_id)]) return;
          const qty = qtyOfSku(item, sku);
          if (qty <= 0) return;
          if (!byItem.has(item.id)) byItem.set(item.id, { shop, item, lines: [] });
          byItem.get(item.id).lines.push({ sku, qty });
        });
      }),
    );
    const issues = [];
    await Promise.all(
      [...byItem.values()].map(async ({ shop, item, lines }) => {
        try {
          const res = await getProductById(item.id);
          const live = res.data || {};
          lines.forEach(({ sku, qty }) => {
            const avail = availableFor(live, sku);
            if (avail !== null && avail < qty) issues.push({ shop, item, sku, qty, avail });
          });
        } catch {
          /* a network hiccup must not block a legitimate order */
        }
      }),
    );
    return issues;
  };

  const handleSettle = async () => {
    const pendingOrders = buildPendingOrders();
    if (!pendingOrders.length) {
      toast.error('Please select items first');
      return;
    }
    if (cartIssues[0]) {
      toast.error(cartIssues[0].text);
      return;
    }
    setStockChecking(true);
    const issues = await verifySelectedStock();
    setStockChecking(false);
    if (issues.length) {
      setStockIssues(issues);
      return;
    }
    proceedToCheckout(pendingOrders);
  };

  const handleDropOutOfStock = async () => {
    if (!loggedInForWrite()) return;
    const exclude = new Set(stockIssues.map((i) => skuKey(i.item.id, i.sku.sku_id)));
    const remaining = buildPendingOrders(exclude);
    const grouped = new Map();
    stockIssues.forEach((i) => {
      if (!grouped.has(i.item.id)) grouped.set(i.item.id, []);
      grouped.get(i.item.id).push(i.sku);
    });
    setStockRemoving(true);
    try {
      for (const [itemId, skusToDrop] of grouped) {
        await dispatch(removeItemFromCartRedux(currentUser, { id: itemId, skus: skusToDrop }));
      }
    } catch {
      toast.error('Could not remove those items.');
      setStockRemoving(false);
      return;
    }
    setStockRemoving(false);
    setStockIssues([]);
    if (!remaining.length) {
      toast.success('Unavailable items removed. Select what you want to order.');
      return;
    }
    proceedToCheckout(remaining);
  };

  /* Pull to refresh: re-read live price / stock / MOQ for the selection (the
     cart itself is already live from its Firestore listener). */
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all(selectedItemIds.map((id) => fetchMeta(id)));
    } finally {
      setRefreshing(false);
    }
  };

  /* ── navigation ── */
  const openProduct = (item) => navigation.navigate(TABS.HOME, { screen: 'Product', params: { id: item.id } });
  const openStore = (shop) =>
    navigation.navigate(TABS.HOME, {
      screen: 'Collection',
      params: { id: shop.shopId, shopName: shop.shopName || '' },
    });

  /* ── chrome ── */
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
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: insets.top, backgroundColor: '#ffffff', zIndex: 11 }} />
    </>
  );

  /* ── guards ── */
  const winH = Dimensions.get('window').height;
  if (!currentUser?.email && !currentUser?.displayName && !currentUser?.id) {
    return (
      <View style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
        <View style={{ paddingTop: topPad }}>
          <EmptyScreen
            Icon={ShoppingCart}
            title="Please login to view your cart"
            cta="Login"
            onPress={() => navigation.navigate('Login')}
            minHeight={winH * 0.6}
          />
        </View>
        {chrome}
      </View>
    );
  }

  if (cartItems.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
        <View style={{ paddingTop: topPad }}>
          <EmptyScreen
            Icon={ShoppingBag}
            title="Your cart is empty"
            sub="Add products and they will appear here"
            cta="Start Shopping"
            onPress={goHome}
            minHeight={winH * 0.6}
          />
        </View>
        {chrome}
      </View>
    );
  }

  /* ─── RENDER PIECES ─── */

  const listHeader = (
    <View>
      {/* Page header */}
      <View style={{ backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: C.gray100 }}>
        <View style={{ paddingHorizontal: PAGE_PX, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <ShoppingCart size={20} color={RED} />
          <Text style={[TS.lg, { fontWeight: '700', color: C.gray800 }]}>Shopping Cart</Text>
          <Text style={[TS.sm, { color: C.gray400 }]}>({allCartQty} items)</Text>
        </View>
      </View>

      {/* Info banner */}
      <View style={{ paddingHorizontal: PAGE_PX, paddingTop: 16 }}>
        <View
          style={{
            backgroundColor: C.amber50,
            borderWidth: 1,
            borderColor: C.amber200,
            borderRadius: 12,
            paddingHorizontal: 16,
            paddingVertical: 10,
            flexDirection: 'row',
            alignItems: 'flex-start',
            gap: 8,
          }}
        >
          <Info size={13} color={C.amber500} style={{ marginTop: 2 }} />
          <Text style={{ flex: 1, fontSize: 12, lineHeight: 19.5, color: C.amber700 }}>
            Payable amount below includes the <Text style={{ fontWeight: '700' }}>China local courier charge</Text>{' '}
            (supplier → our China warehouse). It does <Text style={{ fontWeight: '700' }}>not include</Text> 🇨🇳
            China→🇧🇩 Bangladesh international shipping — that's calculated separately at checkout after weight is
            confirmed.
          </Text>
        </View>
      </View>
      <View style={{ height: 12 }} />
    </View>
  );

  const renderSku = (shop, item, sku) => {
    const k = skuKey(item.id, sku.sku_id);
    const flatSku = skus.find((s) => s.sku_id === k);
    const qty = parseInt(flatSku?.totalQuantity ?? sku.totalQuantity, 10) || 1;
    const price = parseFloat(flatSku?.price ?? sku.price) || 0;
    const batch = effBatch(item);
    const skuImg = sku.image || item.picture || '';
    const pct = getItemDiscountPct(item);
    const unit = Math.round(applyDiscount(price, pct));
    const on = !!sel[k];
    return (
      <Animated.View
        key={String(sku.sku_id)}
        entering={FadeIn.duration(200)}
        exiting={FadeOut.duration(180)}
        layout={LinearTransition.duration(220)}
        style={{
          borderRadius: 12,
          borderWidth: 1,
          padding: 12,
          borderColor: on ? 'rgba(230,34,34,0.3)' : C.gray100,
          backgroundColor: on ? 'rgba(254,242,242,0.4)' : C.gray50,
          opacity: removingKey === k ? 0.5 : 1,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
          <Checkbox
            checked={on}
            size={14}
            style={{ marginTop: 4 }}
            onPress={() => toggleSku(shop, item, sku, !on)}
            accessibilityLabel="Select variant"
          />
          {!!skuImg && (
            <ProductImage
              uri={sized(skuImg, 60)}
              style={{ width: 48, height: 48, borderRadius: 8, borderWidth: 1, borderColor: C.gray200 }}
              fallbackIconSize={16}
            />
          )}
          <View style={{ flex: 1, minWidth: 0 }}>
            <View style={{ paddingRight: 28, gap: 2 }}>
              {!!sku.color && (
                <Text style={[tpx(11), { color: C.gray500 }]}>
                  <Text style={{ fontWeight: '600', color: C.gray700 }}>{item.propertyNames?.[0] || 'Color'}:</Text>{' '}
                  {sku.color}
                </Text>
              )}
              {!!sku.size && (
                <Text style={[tpx(11), { color: C.gray500 }]}>
                  <Text style={{ fontWeight: '600', color: C.gray700 }}>{item.propertyNames?.[1] || 'Size'}:</Text>{' '}
                  {sku.size}
                </Text>
              )}
              {!sku.color && !sku.size && (
                <Text style={[tpx(11), { color: C.gray400, fontStyle: 'italic' }]}>Standard</Text>
              )}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Press
                  onPress={() => updateSkuQty(item, sku, qty - batch)}
                  hitSlop={4}
                  accessibilityLabel="Decrease quantity"
                  style={({ pressed }) => ({
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    backgroundColor: pressed ? C.gray300 : C.gray200,
                    alignItems: 'center',
                    justifyContent: 'center',
                  })}
                >
                  <Minus size={11} color={BODY} />
                </Press>
                <CartQtyInput
                  value={qty}
                  editable={batch <= 1}
                  onCommit={(v) => updateSkuQty(item, sku, v)}
                  style={[
                    TS.xs,
                    {
                      width: 48,
                      height: 26,
                      fontWeight: '700',
                      color: BODY,
                      borderWidth: 1,
                      borderColor: C.gray200,
                      borderRadius: 8,
                      backgroundColor: batch > 1 ? C.gray50 : '#ffffff',
                    },
                  ]}
                />
                <Press
                  onPress={() => updateSkuQty(item, sku, qty + batch)}
                  hitSlop={4}
                  accessibilityLabel="Increase quantity"
                  style={({ pressed }) => ({
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    backgroundColor: pressed ? '#cc1a1a' : RED,
                    alignItems: 'center',
                    justifyContent: 'center',
                  })}
                >
                  <Plus size={11} color="#ffffff" />
                </Press>
              </View>
              <View style={{ alignItems: 'flex-end', flexShrink: 1 }}>
                <Price
                  amount={unit * qty}
                  original={Math.round(price * qty)}
                  style={[TS.xs, { fontWeight: '700', color: RED }]}
                  containerStyle={{ justifyContent: 'flex-end' }}
                />
                <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                  <Price
                    amount={unit}
                    original={Math.round(price)}
                    style={[tpx(10), { color: C.gray400 }]}
                    containerStyle={{ justifyContent: 'flex-end', flexWrap: 'nowrap' }}
                  />
                  <Text style={[tpx(10), { color: C.gray400 }]}>/pc</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* trash — absolute top-2 right-2 */}
        <Press
          onPress={() => handleRemoveSku(shop, item, sku)}
          hitSlop={6}
          disabled={!!removingKey}
          accessibilityLabel="Remove variant"
          style={({ pressed }) => ({
            position: 'absolute',
            top: 8,
            right: 8,
            width: 24,
            height: 24,
            borderRadius: 8,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: pressed ? C.red50 : 'transparent',
          })}
        >
          {({ pressed }) => <Trash2 size={13} color={pressed ? C.red500 : C.gray300} />}
        </Press>
      </Animated.View>
    );
  };

  const renderItem = (shop, item, itemIdx) => {
    const itemPic = item.picture || item.pictures?.[0] || '';
    const batch = effBatch(item);
    const moq = effMoq(item);
    const issues = cartIssues.filter((iss) => iss.itemId === item.id);
    const selQty = itemSelQty(item);
    const last = itemIdx === shop.items.length - 1;
    return (
      <Animated.View
        key={String(item.id)}
        exiting={FadeOut.duration(200)}
        layout={LinearTransition.duration(220)}
        style={{
          borderBottomWidth: last ? 0 : 1,
          borderBottomColor: C.gray50,
          backgroundColor: itemIdx % 2 === 1 ? 'rgba(249,250,251,0.3)' : 'transparent',
          opacity: removingKey === String(item.id) ? 0.5 : 1,
        }}
      >
        {/* Item info row */}
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, flexShrink: 0 }}>
            <Checkbox
              checked={!!sel[item.id]}
              style={{ marginTop: 4 }}
              onPress={() => toggleItem(shop, item, !sel[item.id])}
              accessibilityLabel="Select item"
            />
            <Press onPress={() => openProduct(item)} accessibilityLabel={item.name}>
              {({ pressed }) => (
                <ProductImage
                  uri={sized(itemPic, 100)}
                  style={{ width: 68, height: 68, borderRadius: 12, borderWidth: 1, borderColor: C.gray200, opacity: pressed ? 0.85 : 1 }}
                />
              )}
            </Press>
          </View>

          <View style={{ flex: 1, minWidth: 0, paddingTop: 2 }}>
            <Press onPress={() => openProduct(item)}>
              {({ pressed }) => (
                <Text numberOfLines={2} style={{ fontSize: 14, lineHeight: 19.25, fontWeight: '600', color: pressed ? RED : C.gray800 }}>
                  {item.name}
                </Text>
              )}
            </Press>
            <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
              {!!item.productType && (
                <View style={{ backgroundColor: C.gray100, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 }}>
                  <Text style={[tpx(10), { color: C.gray500 }]}>{item.productType}</Text>
                </View>
              )}
              {batch > 1 && (
                <View style={{ backgroundColor: CC.violet50, borderWidth: 1, borderColor: CC.violet200, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 }}>
                  <Text style={[tpx(10), { color: CC.violet600, fontWeight: '500' }]}>Pack: {batch} pcs</Text>
                </View>
              )}
              {moq > 1 && (
                <View style={{ backgroundColor: C.emerald50, borderWidth: 1, borderColor: CC.emerald200, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 }}>
                  <Text style={[tpx(10), { color: C.emerald700, fontWeight: '500' }]}>MOQ: {moq} pcs</Text>
                </View>
              )}
              {!!metaLoading[String(item.id)] && (
                <Animated.View entering={FadeIn.duration(150)} exiting={FadeOut.duration(150)} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Spinner size={10} color={C.gray400} />
                  <Text style={[tpx(10), { color: C.gray400 }]}>Checking price &amp; stock…</Text>
                </Animated.View>
              )}
              {item.shippingRate > 0 && (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4,
                    backgroundColor: CC.sky50,
                    borderWidth: 1,
                    borderColor: CC.sky100,
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                    borderRadius: 999,
                  }}
                >
                  {item.shipmentMethod === 'Sea' ? <Ship size={10} color={CC.sky600} /> : <Plane size={10} color={CC.sky600} />}
                  <Text style={[tpx(10), { color: CC.sky700, fontWeight: '600' }]}>{item.shippingRate}</Text>
                  <Text style={[tpx(10), { color: C.gray500 }]}>Tk/{itemRateUnit(item)}</Text>
                </View>
              )}
            </View>
          </View>

          <Press
            onPress={() => handleRemove(shop, item)}
            disabled={!!removingKey}
            accessibilityLabel="Remove item"
            style={({ pressed }) => ({
              flexShrink: 0,
              width: 32,
              height: 32,
              borderRadius: 12,
              alignItems: 'center',
              justifyContent: 'center',
              marginTop: 2,
              backgroundColor: pressed ? C.red50 : 'transparent',
            })}
          >
            {({ pressed }) => <Trash2 size={15} color={pressed ? C.red500 : C.gray300} />}
          </Press>
        </View>

        {/* SKU rows */}
        <View style={{ paddingHorizontal: 16, paddingBottom: 12, gap: 8 }}>
          {item.skus?.map((sku) => renderSku(shop, item, sku))}
        </View>

        {/* What has to be fixed before this item can be ordered */}
        {issues.length > 0 && (
          <Animated.View entering={FadeIn.duration(180)} style={{ paddingHorizontal: 16, paddingBottom: 12, gap: 4 }}>
            {issues.map((iss, i) => (
              <View
                key={i}
                style={{
                  flexDirection: 'row',
                  alignItems: 'flex-start',
                  gap: 6,
                  backgroundColor: C.amber50,
                  borderWidth: 1,
                  borderColor: C.amber200,
                  borderRadius: 12,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                }}
              >
                <AlertCircle size={12} color={C.amber700} style={{ marginTop: 1 }} />
                <Text style={[tpx(11), { flex: 1, fontWeight: '600', color: C.amber700 }]}>{iss.text}</Text>
              </View>
            ))}
          </Animated.View>
        )}

        {/* Item footer: selected sub-total */}
        {selQty > 0 && (
          <Animated.View
            entering={FadeIn.duration(180)}
            style={{
              flexDirection: 'row',
              alignItems: 'baseline',
              justifyContent: 'flex-end',
              flexWrap: 'wrap',
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderTopWidth: 1,
              borderTopColor: C.gray50,
              backgroundColor: 'rgba(249,250,251,0.4)',
            }}
          >
            <Text style={[TS.xs, { color: C.gray500 }]}>{selQty} pcs selected</Text>
            <Text style={[TS.xs, { color: C.gray300, marginHorizontal: 8 }]}>|</Text>
            <Text style={[TS.xs, { color: C.gray500 }]}>Subtotal: </Text>
            <Price
              amount={itemSelTotalDiscounted(item)}
              original={Math.round(itemSelTotal(item))}
              style={[TS.xs, { fontWeight: '700', color: RED }]}
            />
          </Animated.View>
        )}
      </Animated.View>
    );
  };

  const renderShop = ({ item: shop }) => {
    const selQty = shopSelQty(shop);
    const goods = shopSelTotalDiscounted(shop);
    const courier = shopLocalShipping(shop);
    return (
      <View style={{ paddingHorizontal: PAGE_PX }}>
        <View
          style={{
            backgroundColor: '#ffffff',
            borderRadius: 16,
            borderWidth: 1,
            borderColor: C.gray100,
            boxShadow: SHADOW_SM,
          }}
        >
          <View style={{ borderRadius: 15, overflow: 'hidden' }}>
            {/* Shop header */}
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
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 1 }}>
                <Checkbox
                  checked={!!sel[shop.shopId]}
                  onPress={() => toggleShop(shop, !sel[shop.shopId])}
                  accessibilityLabel="Select shop"
                />
                <Store size={14} color={CC.orange500} />
                <Text numberOfLines={1} style={[TS.sm, { fontWeight: '700', color: C.gray700, maxWidth: 220, flexShrink: 1 }]}>
                  {shop.shopName || shop.shopId || 'Supplier'}
                </Text>
              </View>
              <Press onPress={() => openStore(shop)} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                {({ pressed }) => (
                  <>
                    <Text style={[TS.xs, { color: pressed ? RED : C.gray400 }]}>View Store</Text>
                    <ChevronRight size={11} color={pressed ? RED : C.gray400} />
                  </>
                )}
              </Press>
            </View>

            {shop.items?.map((item, itemIdx) => renderItem(shop, item, itemIdx))}

            {/* Shop-level payable breakdown */}
            {selQty > 0 && (
              <Animated.View
                entering={FadeIn.duration(200)}
                style={{
                  borderTopWidth: 1,
                  borderTopColor: C.gray100,
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  backgroundColor: 'rgba(249,250,251,0.4)',
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 }}>
                  <Text style={[TS.sm, { color: C.gray500 }]}>Product Price ({selQty} pcs)</Text>
                  <Text style={[TS.sm, { fontWeight: '700', color: C.gray900 }]}>৳{toLS(goods)}</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 }}>
                  <Text style={[TS.sm, { color: C.gray500 }]}>China Local Courier</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    {shop.items?.some((it) => shipLoading[it.id]) && <Spinner size={12} color={C.gray400} />}
                    {courier > 0 ? (
                      <Text style={[TS.sm, { fontWeight: '700', color: C.gray900 }]}>৳{toLS(courier)}</Text>
                    ) : (
                      <Text style={[TS.sm, { fontWeight: '700', color: C.emerald600 }]}>Free</Text>
                    )}
                  </View>
                </View>
                <DashedRule style={{ marginVertical: 8 }} />
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={[TS.base, { fontWeight: '800', color: C.gray900 }]}>Total Payable Amount</Text>
                  <Text style={[TS.lg, { fontWeight: '800', color: ORANGE2 }]}>৳{toLS(goods + courier)}</Text>
                </View>
              </Animated.View>
            )}
          </View>
        </View>
      </View>
    );
  };

  /* ─── RENDER ─── */
  return (
    <View style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
      <Animated.FlatList
        data={orderedCart}
        keyExtractor={(shop, i) => `${shop.shopId}-${(shop.items || []).map((it) => it.id).join('_') || i}`}
        renderItem={renderShop}
        extraData={[sel, skus, itemMeta, metaLoading, itemShip, shipLoading, removingKey, discountPct, taka]}
        ListHeaderComponent={listHeader}
        ItemSeparatorComponent={ShopGap}
        itemLayoutAnimation={LinearTransition.duration(220)}
        contentContainerStyle={{ paddingTop: topPad, paddingBottom: 96 }}
        onScroll={onScroll}
        scrollEventThrottle={16}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        initialNumToRender={4}
        maxToRenderPerBatch={4}
        windowSize={7}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[RED]}
            tintColor={RED}
            progressViewOffset={topPad}
          />
        }
      />

      {/* Pinned settlement bar (mobile) — sits on the screen's own bottom edge,
          i.e. directly above the tab bar. */}
      <View
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
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: PAGE_PX, paddingVertical: 12, gap: 12 }}>
          <Press
            onPress={() => toggleSelectAll(!selectAll)}
            hitSlop={8}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 0 }}
          >
            <Checkbox checked={selectAll} onPress={() => toggleSelectAll(!selectAll)} accessibilityLabel="Select all" />
            <Text style={[TS.sm, { fontWeight: '500', color: C.gray600 }]}>All</Text>
          </Press>
          <View style={{ flex: 1, minWidth: 0 }}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', columnGap: 6 }}>
              <Text style={[TS.base, { fontWeight: '800', color: RED }]}>৳{toLS(payableAmount)}</Text>
              {totalQty > 0 && <Text style={[TS.xs, { color: C.gray400 }]}>{totalQty} pcs</Text>}
            </View>
            {!!checkoutBlockReason && (
              <Animated.View
                entering={FadeIn.duration(150)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}
              >
                {(courierPending || stockChecking) && <Spinner size={10} color={C.amber600} />}
                <Text style={[tpx(10), { flexShrink: 1, fontWeight: '600', color: C.amber600 }]}>{checkoutBlockReason}</Text>
              </Animated.View>
            )}
          </View>
          <PlaceOrderButton
            active={totalAmount > 0}
            disabled={checkoutBlocked}
            totalQty={totalQty}
            onPress={handleSettle}
            animate={isFocused && stockIssues.length === 0}
          />
        </View>
      </View>

      {chrome}

      <StockIssuesSheet
        issues={stockIssues}
        removing={stockRemoving}
        onClose={() => setStockIssues([])}
        onRemove={handleDropOutOfStock}
      />
    </View>
  );
}

function ShopGap() {
  return <View style={{ height: 16 }} />;
}
