import React, { useState, useEffect } from 'react';
import { View, Text } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSelector, useDispatch } from 'react-redux';
import {
  ArrowLeft, Truck, MapPin, CreditCard, RefreshCw, FileText, Image as ImageIcon, Scale, Receipt, ChevronDown,
  ChevronUp, ShoppingBag, RotateCcw,
} from 'lucide-react-native';
import DashboardLayout from '@/components/DashboardLayout';
import OrderPaymentModal from '@/components/OrderPaymentModal';
import RefundApplyModal from '@/components/RefundApplyModal';
import CopyIdButton from '@/components/CopyIdButton';
import ProductImage from '@/components/ui/ProductImage';
import { ShippingNote } from '@/components/orders/MyOrderCard';
import {
  OC, Row, DashedDivider, PriceTag, ItemThumb, IdMethodStrip, ShipmentProgressVertical, orderDate, money,
  Pill,
} from '@/components/orders/OrderBits';
import { C, SHADOW, ORANGE, Press, Spinner } from '@/components/product/ui';
import { getAllOrdersApiRedux } from '@/store/actions';
import { getAllPartials } from '@/lib/firebaseUtils';
import { activePartialFrom } from '@/lib/partialOffers';
import { getSingleShopTotal, getTotalPaid, getTotalDue, canPayOrder } from '@/lib/orderMath';
import { applyDiscount } from '@/lib/discount';
import { refundMode, showRefundBlock, buyAgainProductId } from '@/lib/refund';
import { isRefundGiven } from '@/lib/buckets';
import { statusDisplay } from '@/lib/shipment';
import { cdn } from '@/lib/cdn';
import { TABS } from '@/navigation/routes';

/* ═══════════════════════════════════════════════════════════════════════
   Web pages/dashboard/buy-and-ship-for-me/my-orders/[orderId]/page.jsx at
   < 640px, inside DashboardLayout `webChrome` (title "Order Detail", no
   top-bar back arrow — the page has its own "Back to Orders"). This page
   has no scoped font shrink: plain Tailwind v4 sizes.
   ═══════════════════════════════════════════════════════════════════════ */

const TXT = {
  xs: { fontSize: 12, lineHeight: 16 },
  sm: { fontSize: 14, lineHeight: 20 },
  base: { fontSize: 16, lineHeight: 24 },
  lg: { fontSize: 18, lineHeight: 28 },
  p10: { fontSize: 10, lineHeight: 15 },
};

const CARD = {
  backgroundColor: '#ffffff',
  borderRadius: 16,
  borderWidth: 1,
  borderColor: C.gray100,
  boxShadow: SHADOW.base,
  overflow: 'hidden',
};

const payStatusConfig = (s) => {
  if (!s || s === 'purchaseLater') return { label: 'Not Paid', bg: C.gray100, fg: C.gray600 };
  if (s === 'Paid') return { label: 'Paid', bg: OC.green100, fg: C.green700 };
  if (s === 'Partially Paid') return { label: 'Partially Paid', bg: OC.orange100, fg: OC.orange700 };
  if (s === 'pending') return { label: 'Pending', bg: OC.purple100, fg: OC.purple700 };
  return { label: s, bg: C.gray100, fg: C.gray600 };
};

const orderStatusConfig = (s) => {
  if (!s || s === 'pending') return { label: 'Pending', bg: C.amber100, fg: C.amber700 };
  if (s === 'Purchased') return { label: 'Purchased', bg: C.blue100, fg: OC.blue700 };
  if (s === 'Reject') return { label: 'Rejected', bg: C.red100, fg: C.red700 };
  return { label: statusDisplay(s), bg: C.gray100, fg: C.gray600 };
};

/* `text-[10px] font-bold px-2.5 py-1 rounded-full ${color}` */
function StatusChip({ cfg }) {
  return (
    <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: cfg.bg }}>
      <Text style={[TXT.p10, { fontWeight: '700', color: cfg.fg }]}>{cfg.label}</Text>
    </View>
  );
}

/* `text-xs font-bold px-4 py-1.5 rounded-full text-white gap-1.5` */
function PillButton({ Icon, label, bg, pressedBg, onPress, fg = '#ffffff', iconSize = 12 }) {
  return (
    <Press
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 999,
        backgroundColor: pressed ? pressedBg : bg,
      })}
    >
      <Icon size={iconSize} color={fg} />
      <Text style={[TXT.xs, { fontWeight: '700', color: fg }]}>{label}</Text>
    </Press>
  );
}

/* Peach-bordered collapsible (Weight / Bill): `bg-white rounded-2xl
   overflow-hidden`, 1.5px #FFD6B0, full-width gray-50 toggle px-4 py-3. */
function Collapsible({ Icon, title, open, openLabel, closedLabel, onToggle, children }) {
  return (
    <View style={{ backgroundColor: '#ffffff', borderRadius: 16, overflow: 'hidden', borderWidth: 1.5, borderColor: OC.PEACH }}>
      <Press
        onPress={onToggle}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          backgroundColor: pressed ? 'rgba(243,244,246,0.8)' : C.gray50,
          paddingHorizontal: 16,
          paddingVertical: 12,
        })}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Icon size={14} color={C.gray400} />
          <Text style={[TXT.xs, { fontWeight: '700', color: C.gray700 }]}>{title}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Text style={{ fontSize: 11, lineHeight: 16.5, fontWeight: '700', color: ORANGE }}>{open ? openLabel : closedLabel}</Text>
          {open ? <ChevronUp size={13} color={ORANGE} /> : <ChevronDown size={13} color={ORANGE} />}
        </View>
      </Press>
      {open && <Animated.View entering={FadeIn.duration(200)}>{children}</Animated.View>}
    </View>
  );
}

function WeightTile({ label, value }) {
  return (
    <View style={{ flex: 1, backgroundColor: C.gray50, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 }}>
      <Text style={[TXT.p10, { fontWeight: '600', color: C.gray400 }]}>{label}</Text>
      <Text style={[TXT.sm, { fontWeight: '800', color: C.gray800, marginTop: 2 }]}>{value}</Text>
    </View>
  );
}

export default function BuyShipOrderDetail() {
  const navigation = useNavigation();
  const route = useRoute();
  const dispatch = useDispatch();
  const { orderId } = route.params || {};
  const currentUser = useSelector((s) => s.user?.currentUser);
  const orders = useSelector((s) => s.orders?.ordersApi || []);

  /* Web: fetch only when the store is empty (arriving by deep link). */
  const [loading, setLoading] = useState(orders.length === 0);
  useEffect(() => {
    if (currentUser?.id && orders.length === 0) {
      setLoading(true);
      Promise.resolve(dispatch(getAllOrdersApiRedux(currentUser.id))).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id]);

  /* Pay Now — the same OrderPaymentModal as the list, with the "pay more,
     get more" config so the tier step is offered here too. */
  const [payTarget, setPayTarget] = useState(null);
  const [refundOpen, setRefundOpen] = useState(false);
  const [partials, setPartials] = useState([]);
  useEffect(() => {
    getAllPartials()
      .then((list) => setPartials(list || []))
      .catch(() => {});
  }, []);
  const activePartial = activePartialFrom(partials);

  const handlePaySuccess = () => {
    setPayTarget(null);
    if (currentUser?.id) dispatch(getAllOrdersApiRedux(currentUser.id));
  };

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = () => {
    if (!currentUser?.id) return;
    setRefreshing(true);
    Promise.resolve(dispatch(getAllOrdersApiRedux(currentUser.id))).finally(() => setRefreshing(false));
  };

  const order = orders.find((o) => String(o.orderId) === String(orderId));

  const [weightExpanded, setWeightExpanded] = useState(true);
  const [billExpanded, setBillExpanded] = useState(true);

  const goBack = () => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('BuyShipMyOrders'));

  if (!order) {
    return (
      <DashboardLayout webChrome title="Order Detail">
        <View style={[CARD, { padding: 48, alignItems: 'center' }]}>
          {loading ? (
            <Spinner size={28} color={ORANGE} />
          ) : (
            <>
              <View style={{ marginBottom: 12 }}>
                <ShoppingBag size={40} color={C.gray200} />
              </View>
              <Text style={[TXT.base, { fontWeight: '700', color: C.gray700 }]}>Order not found</Text>
              <Press onPress={() => navigation.navigate('BuyShipMyOrders')} style={{ marginTop: 12 }}>
                {({ pressed }) => (
                  <Text style={[TXT.xs, { color: OC.RED, textDecorationLine: pressed ? 'underline' : 'none' }]}>
                    ← Back to My Orders
                  </Text>
                )}
              </Press>
            </>
          )}
        </View>
      </DashboardLayout>
    );
  }

  const score = parseInt(order.shipmentStatusScore || 1, 10);
  const payCfg = payStatusConfig(order.paymentStatus);
  const orderCfg = orderStatusConfig(order.orderStatus);
  const isRejected = (order.orderStatus || '').toLowerCase() === 'reject';
  const goodsTotal = order.actualTotal ? parseInt(order.actualTotal, 10) : getSingleShopTotal(order);
  const totalPaid = getTotalPaid(order);
  const totalDue = getTotalDue(order);
  const totalBill = totalDue + totalPaid;
  const hasShipping = parseInt(order.shippingChargeCustomer, 10) > 0;
  const totalQty =
    order.items?.reduce(
      (a, item) => a + (item.skus?.reduce((b, sku) => b + parseInt(sku.totalQuantity || 0, 10), 0) || 0),
      0,
    ) || 0;
  const reorderId = isRefundGiven(order) ? buyAgainProductId(order) : null;
  /* The web's `order.shippingChargeCustomer && order.shippingChargeCustomer !== 0` */
  const showInvoice = !!order.shippingChargeCustomer && order.shippingChargeCustomer !== 0;
  const addr = order.deliveryAddress;

  return (
    <View style={{ flex: 1 }}>
      <DashboardLayout
        webChrome
        title="Order Detail"
        onRefresh={onRefresh}
        refreshing={refreshing}
        overlays={
          <RefundApplyModal
            inline
            visible={refundOpen}
            target={order}
            kind="order"
            mode={refundMode(order)}
            onClose={() => setRefundOpen(false)}
          />
        }
      >
        <View style={{ gap: 16 }}>
          {/* Back */}
          <Press onPress={goBack} style={{ alignSelf: 'flex-start' }}>
            {({ pressed }) => (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <ArrowLeft size={14} color={pressed ? OC.RED : C.gray500} />
                <Text style={[TXT.xs, { fontWeight: '500', color: pressed ? OC.RED : C.gray500 }]}>Back to Orders</Text>
              </View>
            )}
          </Press>

          {/* Header card */}
          <View style={CARD}>
            <View style={{ paddingHorizontal: 16, paddingVertical: 12, backgroundColor: OC.DARK }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                <View>
                  <Text style={[TXT.p10, { fontWeight: '500', color: OC.red100 }]}>Order ID</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={[TXT.base, { fontWeight: '800', color: '#ffffff' }]}>#{order.orderId}</Text>
                    <CopyIdButton value={order.orderId} variant="dark" size={13} />
                  </View>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[TXT.p10, { color: OC.red100 }]}>
                    {orderDate(order)} {order.orderedTime || ''}
                  </Text>
                  <Text style={[TXT.xs, { fontWeight: '600', color: '#ffffff', marginTop: 2, maxWidth: 180 }]} numberOfLines={1}>
                    {order.shopName}
                  </Text>
                </View>
              </View>
            </View>
            <View
              style={{
                paddingHorizontal: 16,
                paddingVertical: 12,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 8,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <StatusChip cfg={orderCfg} />
                <StatusChip cfg={payCfg} />
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Truck size={12} color={C.gray400} />
                <Text style={[TXT.xs, { fontWeight: '600', color: C.gray700 }]}>{order.trackingNo || 'Tracking TBD'}</Text>
              </View>
            </View>
            {/* Actions */}
            <View style={{ paddingHorizontal: 16, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              {canPayOrder(order) && (
                <PillButton
                  Icon={CreditCard}
                  label={`Pay Now — ৳${totalDue.toLocaleString()}`}
                  bg={OC.orange500}
                  pressedBg="#ea580c"
                  onPress={() => setPayTarget([order])}
                />
              )}
              {!!reorderId && (
                <PillButton
                  Icon={RotateCcw}
                  label=" Buy Again"
                  bg={OC.orange500}
                  pressedBg="#ea580c"
                  onPress={() => navigation.navigate(TABS.HOME, { screen: 'Product', params: { id: reorderId } })}
                />
              )}
              {showInvoice && (
                <PillButton
                  Icon={FileText}
                  label="View Invoice"
                  bg="#a3422b"
                  pressedBg="#8b3622"
                  onPress={() => navigation.navigate('OrderInvoice', { bookingId: order.orderId, kind: 'order' })}
                />
              )}
            </View>
          </View>

          {/* Order Id / Shipment Method */}
          <IdMethodStrip order={order} />

          {/* Items */}
          <View style={CARD}>
            <View style={{ paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.gray50 }}>
              <Text style={[TXT.xs, { fontWeight: '700', color: C.gray700 }]}>Ordered Items</Text>
            </View>
            <View>
              {(order.items || []).flatMap((item, iIdx) =>
                (item.skus || []).map((sku, sIdx) => {
                  const img = cdn(sku.image || item.imgUrl || item.picture || item.pictures?.[0] || '');
                  const unitPrice = parseInt(parseFloat(sku.price || 0), 10);
                  const qty = parseInt(sku.totalQuantity || 0, 10);
                  const itemDiscountPct =
                    parseFloat(item.campaignDiscountPercent) > 0
                      ? parseFloat(item.campaignDiscountPercent)
                      : order.siteDiscountPercent || 0;
                  const discountedUnitPrice = Math.round(applyDiscount(unitPrice, itemDiscountPct));
                  const first = iIdx === 0 && sIdx === 0;
                  return (
                    <View
                      key={`${iIdx}-${sIdx}`}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'flex-start',
                        gap: 12,
                        paddingHorizontal: 16,
                        paddingVertical: 12,
                        borderTopWidth: first ? 0 : 1,
                        borderTopColor: C.gray50,
                      }}
                    >
                      <ItemThumb uri={img} />
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text numberOfLines={2} style={{ fontSize: 12, lineHeight: 16.5, fontWeight: '600', color: C.gray800 }}>
                          {item.name}
                        </Text>
                        {!!item.productType && (
                          <Text style={[TXT.p10, { color: C.gray400, marginTop: 2 }]}>Type: {item.productType}</Text>
                        )}
                        {item.propertyNames?.length > 0 && (
                          <Text style={[TXT.p10, { color: C.gray500, marginTop: 2 }]}>
                            {!!sku.color && (
                              <>
                                {item.propertyNames[0]}: <Text style={{ fontWeight: '700' }}>{sku.color}</Text>
                              </>
                            )}
                            {!!sku.size && (
                              <>
                                {' · '}
                                {item.propertyNames[1]}: <Text style={{ fontWeight: '700' }}>{sku.size}</Text>
                              </>
                            )}
                          </Text>
                        )}
                        <Text style={[TXT.p10, { color: C.gray400, marginTop: 2 }]}>
                          Shipping rate:{' '}
                          {order.customerRate
                            ? `${order.customerRate}tk/kg`
                            : item.shippingRate
                              ? `${item.shippingRate}tk/kg`
                              : 'TBD'}
                        </Text>
                      </View>
                      <View style={{ alignItems: 'flex-end', flexShrink: 0 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                          <PriceTag amount={discountedUnitPrice} original={unitPrice} style={{ ...TXT.xs, color: C.gray500 }} />
                          <Text style={[TXT.xs, { color: C.gray500 }]}>/pc</Text>
                        </View>
                        <Text style={[TXT.p10, { color: C.gray400 }]}>× {qty}</Text>
                        <PriceTag
                          amount={discountedUnitPrice * qty}
                          original={unitPrice * qty}
                          style={{ ...TXT.sm, fontWeight: '800', color: OC.RED }}
                        />
                      </View>
                    </View>
                  );
                }),
              )}
            </View>
          </View>

          {/* Shipment progress */}
          {!isRejected && (
            <View style={[CARD, { paddingHorizontal: 16, paddingVertical: 16, overflow: 'visible' }]}>
              <ShipmentProgressVertical score={score} req={order} />
            </View>
          )}

          {/* Warehouse image */}
          {!!order.imageUrl && (
            <View style={[CARD, { paddingHorizontal: 16, paddingVertical: 16 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <ImageIcon size={12} color={OC.RED} />
                <Text style={[TXT.xs, { fontWeight: '700', color: C.gray700 }]}>Abroad Warehouse Received</Text>
              </View>
              <View style={{ width: 96, height: 96, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: C.gray100 }}>
                <ProductImage uri={order.imageUrl} style={{ width: '100%', height: '100%' }} />
              </View>
            </View>
          )}

          {/* Weight & Shipping Rate */}
          <Collapsible
            Icon={Scale}
            title="Weight & Shipping Rate"
            open={weightExpanded}
            openLabel="Hide"
            closedLabel="View Info"
            onToggle={() => setWeightExpanded((v) => !v)}
          >
            <View style={{ flexDirection: 'row', gap: 8, padding: 16 }}>
              <WeightTile label="Est. Weight" value={order.receivedWeight ? `${order.receivedWeight} Kg` : '__'} />
              <WeightTile label="Shipping Rate" value={order.customerRate ? `৳${order.customerRate} / Kg` : '__'} />
            </View>
          </Collapsible>

          {/* Bill Details & Breakdown */}
          <Collapsible
            Icon={Receipt}
            title="Bill Details & Breakdown"
            open={billExpanded}
            openLabel="Collapse"
            closedLabel="Expand"
            onToggle={() => setBillExpanded((v) => !v)}
          >
            <View style={{ padding: 16, gap: 10 }}>
              <Row label={`Product Subtotal (${totalQty} pcs):`} value={`৳${money(goodsTotal)}`} />
              <Row
                label="🇨🇳 China Local Delivery Charge:"
                value={parseInt(order.localShipping, 10) > 0 ? `৳${money(parseInt(order.localShipping, 10))}` : '__'}
              />

              <DashedDivider />

              {hasShipping ? (
                <Row bold label="Shipping Charge (CN to BD):" value={`৳${money(parseInt(order.shippingChargeCustomer, 10))}`} />
              ) : (
                <>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <Text style={{ fontSize: 13, lineHeight: 19.5, fontWeight: '700', color: C.gray800 }}>Shipping Charge:</Text>
                    <Pill color="orange">৳****</Pill>
                  </View>
                  <ShippingNote shrink={false} />
                </>
              )}

              {parseInt(order.otherCost, 10) > 0 && (
                <Row label="Packaging & Other cost:" value={`+৳${money(parseInt(order.otherCost, 10))}`} />
              )}
              {parseInt(order.siteDiscountAmount, 10) > 0 && (
                <Row
                  label={`Site Discount (${order.siteDiscountPercent}%):`}
                  value={`-৳${money(Math.round(order.siteDiscountAmount))}`}
                  tone="green"
                />
              )}
              {parseInt(order.couponAmount, 10) > 0 && (
                <Row label="Coupon:" value={`-৳${money(parseInt(order.couponAmount, 10))}`} tone="green" />
              )}
              {parseInt(order.offer, 10) > 0 && (
                <Row
                  label="Discount (on pay now%):"
                  value={`-৳${money(
                    Math.round(parseInt(order.actualTotalAfterCoupon || goodsTotal, 10) * (parseFloat(order.offer) / 100)),
                  )}`}
                  tone="green"
                />
              )}
              {parseInt(order.discount, 10) > 0 && (
                <Row label="Discount (on shipping):" value={`-৳${money(Math.round(parseInt(order.discount, 10)))}`} tone="green" />
              )}

              <DashedDivider />

              <Row bold label="Total Current Bill:" value={`৳${money(totalBill)}`} />
              {totalPaid > 0 && <Row label="Advance Paid:" value={`-৳${money(totalPaid)}`} tone="green" />}

              <View style={{ borderTopWidth: 1, borderTopColor: C.gray200, paddingTop: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={[TXT.sm, { fontWeight: '800', color: C.gray800 }]}>Remaining Balance Due:</Text>
                  <Text style={[TXT.lg, { fontWeight: '800', color: ORANGE }]}>৳{money(totalDue)}</Text>
                </View>
              </View>
            </View>
          </Collapsible>

          {/* Payment history */}
          {order.payments?.length > 0 && (
            <View style={CARD}>
              <View style={{ paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.gray50 }}>
                <Text style={[TXT.xs, { fontWeight: '700', color: C.gray700 }]}>Payment History</Text>
              </View>
              {order.payments.map((p, i) => (
                <View
                  key={i}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    borderTopWidth: i === 0 ? 0 : 1,
                    borderTopColor: C.gray50,
                  }}
                >
                  <View>
                    <Text style={[TXT.xs, { fontWeight: '600', color: C.gray700 }]}>{p.method || 'Payment'}</Text>
                    <Text style={[TXT.p10, { color: C.gray400 }]}>{p.date || p.time || ''}</Text>
                  </View>
                  <Text style={[TXT.sm, { fontWeight: '800', color: C.green600 }]}>৳{money(parseInt(p.amount, 10))}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Delivery address */}
          {!!addr && (
            <View style={{ borderRadius: 16, overflow: 'hidden', boxShadow: SHADOW.base }}>
              <View style={{ backgroundColor: OC.DARK, paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 12,
                    backgroundColor: 'rgba(255,255,255,0.15)',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <MapPin size={15} color="#ffffff" />
                </View>
                <View>
                  <Text style={{ fontSize: 14, lineHeight: 17.5, fontWeight: '700', color: '#ffffff' }}>{addr.name}</Text>
                  <Text style={[TXT.p10, { color: OC.blue200 }]}>Delivery Address</Text>
                </View>
              </View>
              <View
                style={{
                  backgroundColor: '#ffffff',
                  borderWidth: 1,
                  borderTopWidth: 0,
                  borderColor: C.gray100,
                  borderBottomLeftRadius: 16,
                  borderBottomRightRadius: 16,
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  gap: 8,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                  <View style={{ marginTop: 2 }}>
                    <MapPin size={13} color={OC.RED} />
                  </View>
                  <Text style={{ flex: 1, fontSize: 12, lineHeight: 19.5, color: C.gray700 }}>
                    {addr.address}
                    {addr.thana ? `, ${addr.thana}` : ''}
                    {addr.district ? `, ${addr.district}` : ''}
                    {addr.division ? `, ${addr.division}` : ''}
                  </Text>
                </View>
                {!!addr.mobileNo && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View
                      style={{ width: 20, height: 20, borderRadius: 8, backgroundColor: C.green50, alignItems: 'center', justifyContent: 'center' }}
                    >
                      <Text style={{ fontSize: 9, lineHeight: 13.5, fontWeight: '900', color: C.green600 }}>📞</Text>
                    </View>
                    <Text style={[TXT.xs, { fontWeight: '600', color: C.gray700 }]}>{addr.mobileNo}</Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Refund */}
          {showRefundBlock(order) && (
            <View style={[CARD, { paddingHorizontal: 16, paddingVertical: 16 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                <RefreshCw size={13} color={OC.RED} />
                <Text style={[TXT.xs, { fontWeight: '700', color: C.gray700 }]}>Refund</Text>
              </View>
              {order.refundStatus ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 999,
                      backgroundColor: order.refundStatus === 'rejected' ? C.red100 : OC.green100,
                    }}
                  >
                    <Text style={[TXT.xs, { fontWeight: '700', color: order.refundStatus === 'rejected' ? C.red700 : C.green700 }]}>
                      Refund {order.refundStatus}
                    </Text>
                  </View>
                  {!!order.refund && order.refund !== 0 && (
                    <Text style={[TXT.xs, { color: C.gray500 }]}>
                      Refunded: <Text style={{ fontWeight: '700' }}>৳{money(parseInt(order.refund, 10))}</Text>
                    </Text>
                  )}
                </View>
              ) : (
                <View>
                  <Text style={[TXT.xs, { color: C.gray500, marginBottom: 8 }]}>
                    {refundMode(order) === 'quick'
                      ? 'This order has not shipped yet — you can request a refund of what you have paid.'
                      : 'Delivered items can be claimed within 72 hours. Pick the pieces that arrived damaged, wrong or missing.'}
                  </Text>
                  <View style={{ alignSelf: 'flex-start' }}>
                    <PillButton
                      Icon={RefreshCw}
                      iconSize={11}
                      label={refundMode(order) === 'quick' ? 'Quick Refund' : 'After Sale Refund'}
                      bg={C.gray200}
                      pressedBg={C.gray300}
                      fg={C.gray700}
                      onPress={() => setRefundOpen(true)}
                    />
                  </View>
                </View>
              )}
            </View>
          )}

          {/* Notes */}
          {!!order.additionalNotes && (
            <View
              style={{
                backgroundColor: C.amber50,
                borderWidth: 1,
                borderColor: C.amber100,
                borderRadius: 16,
                paddingHorizontal: 16,
                paddingVertical: 12,
              }}
            >
              <Text style={[TXT.xs, { fontWeight: '700', color: C.amber700, marginBottom: 4 }]}>Order Note</Text>
              <Text style={[TXT.xs, { color: C.amber800 }]}>{order.additionalNotes}</Text>
            </View>
          )}
        </View>
      </DashboardLayout>

      <OrderPaymentModal
        visible={!!payTarget && !!currentUser}
        orders={payTarget || []}
        currentUser={currentUser}
        activePartial={activePartial}
        onClose={() => setPayTarget(null)}
        onSuccess={handlePaySuccess}
      />
    </View>
  );
}
