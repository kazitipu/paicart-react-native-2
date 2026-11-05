import React, { useState, useEffect, useCallback } from 'react';
import { View, Text } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ArrowLeft, Navigation2, FileText, RotateCcw } from 'lucide-react-native';
import DashboardLayout from '@/components/DashboardLayout';
import CopyIdButton from '@/components/CopyIdButton';
import RefundApplyModal from '@/components/RefundApplyModal';
import { ShipmentProgressVertical, usDate } from '@/components/orders/OrderBits';
import { openProductLink, openBookAgain } from '@/components/requests/RequestBits';
import { C, SHADOW, Press, Spinner } from '@/components/product/ui';
import { getSingleProductRequest } from '@/lib/firebaseUtils';
import { refundMode, showRefundBlock, bookAgainId } from '@/lib/refund';
import { isRefundGiven } from '@/lib/buckets';
import { statusDisplay } from '@/lib/shipment';

/* ═══════════════════════════════════════════════════════════════════════
   Web pages/dashboard/buy-and-ship-for-me/my-request/[orderId]/page.jsx at
   < 640px, inside DashboardLayout `webChrome` (title "Request Detail", no
   top-bar back arrow — the page has its own "Back to Requests"). Reads the
   request straight from Firestore (bookingRequest/{id}), not Redux.
   ═══════════════════════════════════════════════════════════════════════ */

const RED = '#e62222';
const TXT = {
  xs: { fontSize: 12, lineHeight: 16 },
  sm: { fontSize: 14, lineHeight: 20 },
  base: { fontSize: 16, lineHeight: 24 },
  p10: { fontSize: 10, lineHeight: 15 },
};

/* `bg-white rounded-2xl border border-gray-100 shadow-sm` */
const CARD = {
  backgroundColor: '#ffffff',
  borderRadius: 16,
  borderWidth: 1,
  borderColor: C.gray100,
  boxShadow: SHADOW.base,
};

/* `text-[10px] text-gray-400 uppercase tracking-wide` */
const LABEL = [TXT.p10, { color: C.gray400, textTransform: 'uppercase', letterSpacing: 0.25 }];

function Card({ children, style }) {
  return <View style={[CARD, { paddingHorizontal: 16, paddingVertical: 12 }, style]}>{children}</View>;
}

/* `text-xs font-bold px-4 py-1.5 rounded-full gap-1.5` */
function PillButton({ Icon, iconSize, label, bg, pressedBg, fg, onPress, px = 16 }) {
  return (
    <Press
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: px,
        paddingVertical: 6,
        borderRadius: 999,
        alignSelf: 'flex-start',
        backgroundColor: pressed ? pressedBg : bg,
      })}
    >
      <Icon size={iconSize} color={fg} />
      <Text style={[TXT.xs, { fontWeight: '700', color: fg }]}>{label}</Text>
    </Press>
  );
}

export default function BuyShipRequestDetail() {
  const navigation = useNavigation();
  const route = useRoute();
  const { orderId } = route.params || {};

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refundOpen, setRefundOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  /* This page reads the request straight from Firestore rather than Redux, so
     a refund written by the modal has to be pulled back in explicitly. */
  const reload = useCallback(
    () =>
      getSingleProductRequest(String(orderId))
        .then((d) => setOrder(d || null))
        .catch(() => {}),
    [orderId],
  );

  useEffect(() => {
    if (!orderId) return;
    setLoading(true);
    reload().finally(() => setLoading(false));
  }, [orderId, reload]);

  const onRefresh = () => {
    setRefreshing(true);
    reload().finally(() => setRefreshing(false));
  };

  const goBack = () => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('BuyShipMyRequests'));

  if (loading) {
    return (
      <DashboardLayout webChrome title="Request Detail">
        <View style={{ alignItems: 'center', paddingVertical: 48 }}>
          <Spinner size={32} color={RED} />
        </View>
      </DashboardLayout>
    );
  }

  if (!order) {
    return (
      <DashboardLayout webChrome title="Request Detail" onRefresh={onRefresh} refreshing={refreshing}>
        <View style={[CARD, { padding: 48, alignItems: 'center' }]}>
          <Text style={[TXT.base, { color: C.gray400, textAlign: 'center' }]}>Request not found</Text>
        </View>
      </DashboardLayout>
    );
  }

  const isRejected = (order.orderStatus || order.status || '') === 'Reject';
  const score = parseInt(order.shipmentStatusScore || 1, 10);
  const productLink = order.productUrl || order.productLink;
  const rebookId = isRefundGiven(order) ? bookAgainId(order) : null;
  const trackingNos = order.trackingNo
    ? String(order.trackingNo)
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)
    : [];

  const facts = [
    ['Product Type', order.productType || order.productName || '—'],
    ['Store', order.store || '—'],
    ['Country', order.country || '—'],
    ['Shipment', (order.shipmentMethod || 'Air') === 'Sea' ? 'By Sea' : 'By Air'],
    ['Quantity', order.productQuantity || '—'],
    ['Status', statusDisplay(order.orderStatus || order.status) || 'Pending'],
    ['Date', order.date || (order.time ? usDate(order.time) : '—')],
  ];

  return (
    <DashboardLayout
      webChrome
      title="Request Detail"
      onRefresh={onRefresh}
      refreshing={refreshing}
      overlays={
        <RefundApplyModal
          inline
          visible={refundOpen}
          target={order}
          kind="productRequest"
          mode={refundMode(order)}
          onSuccess={reload}
          onClose={() => setRefundOpen(false)}
        />
      }
    >
      <Animated.View entering={FadeIn.duration(220)} style={{ gap: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <Press onPress={goBack} style={{ alignSelf: 'flex-start' }}>
            {({ pressed }) => (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <ArrowLeft size={14} color={RED} />
                <Text style={[TXT.sm, { color: RED, textDecorationLine: pressed ? 'underline' : 'none' }]}>Back to Requests</Text>
              </View>
            )}
          </Press>
          {parseInt(order.shippingChargeCustomer, 10) > 0 && (
            <PillButton
              Icon={FileText}
              iconSize={12}
              label="Invoice"
              px={12}
              bg="#a3422b"
              pressedBg="#8b3622"
              fg="#ffffff"
              onPress={() => navigation.navigate('OrderInvoice', { bookingId: order.bookingId, kind: 'productRequest' })}
            />
          )}
        </View>

        {/* Header */}
        <View style={[CARD, { overflow: 'hidden' }]}>
          <View style={{ paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#1C1C1C' }}>
            <Text style={[TXT.p10, { fontWeight: '500', color: '#fee2e2' }]}>Booking ID</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={[TXT.base, { fontWeight: '800', color: '#ffffff' }]}>#{order.bookingId}</Text>
              <CopyIdButton value={order.bookingId} variant="dark" size={13} />
            </View>
          </View>
          <View style={{ paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', flexWrap: 'wrap', rowGap: 12 }}>
            {facts.map(([k, v], i) => (
              <View key={k} style={{ width: '50%', paddingRight: i % 2 === 0 ? 6 : 0, paddingLeft: i % 2 === 1 ? 6 : 0 }}>
                <Text style={LABEL}>{k}</Text>
                <Text style={[TXT.sm, { fontWeight: '600', color: C.gray800 }]}>{String(v)}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Tracking */}
        {!!order.trackingNo && (
          <Card>
            <Text style={[LABEL, { marginBottom: 4 }]}>Tracking No</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {trackingNos.map((t, i) => (
                <View
                  key={i}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4,
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                    borderRadius: 8,
                    backgroundColor: '#00B8A9',
                  }}
                >
                  <Navigation2 size={9} color="#ffffff" />
                  <Text style={[TXT.xs, { fontWeight: '700', color: '#ffffff' }]}>{t}</Text>
                </View>
              ))}
            </View>
          </Card>
        )}

        {/* Shipment progress — the sm:hidden vertical variant */}
        {!isRejected && (
          <Card style={{ paddingVertical: 16 }}>
            <ShipmentProgressVertical score={score} req={order} />
          </Card>
        )}

        {/* Product link */}
        {!!productLink && (
          <Card>
            <Text style={[LABEL, { marginBottom: 4 }]}>Product Link</Text>
            <Press onPress={() => openProductLink(navigation, productLink)}>
              {({ pressed }) => (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <FileText size={12} color={RED} />
                  <Text style={[TXT.sm, { color: RED, flexShrink: 1, textDecorationLine: pressed ? 'underline' : 'none' }]}>
                    {productLink}
                  </Text>
                </View>
              )}
            </Press>
          </Card>
        )}

        {/* Description */}
        {!!order.productVariant && (
          <Card>
            <Text style={[LABEL, { marginBottom: 4 }]}>Description</Text>
            <Text style={{ fontSize: 14, lineHeight: 22.75, color: C.gray700 }}>{order.productVariant}</Text>
          </Card>
        )}

        {/* Refund — same two-stage flow as a 1688 order: Quick Refund before
            the parcel ships, After Sale once it is delivered. */}
        {showRefundBlock(order) && (
          <Card style={{ paddingVertical: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 }}>
              <RotateCcw size={13} color={RED} />
              <Text style={[TXT.xs, { fontWeight: '700', color: C.gray700 }]}>Refund</Text>
            </View>
            {order.refundStatus ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <View
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 999,
                    backgroundColor: order.refundStatus === 'rejected' ? C.red100 : '#dcfce7',
                  }}
                >
                  <Text style={[TXT.xs, { fontWeight: '700', color: order.refundStatus === 'rejected' ? C.red700 : C.green700 }]}>
                    Refund {order.refundStatus}
                  </Text>
                </View>
                {parseInt(order.refund, 10) > 0 && (
                  <Text style={[TXT.xs, { color: C.gray500 }]}>
                    Refunded: <Text style={{ fontWeight: '700' }}>৳{parseInt(order.refund, 10).toLocaleString()}</Text>
                  </Text>
                )}
                {!!order.refundNote && <Text style={[TXT.xs, { color: C.gray500, width: '100%' }]}>{order.refundNote}</Text>}
                {!!rebookId && (
                  <PillButton
                    Icon={RotateCcw}
                    iconSize={12}
                    label=" Book Again"
                    bg="#f97316"
                    pressedBg="#ea580c"
                    fg="#ffffff"
                    onPress={() => openBookAgain(navigation, rebookId)}
                  />
                )}
              </View>
            ) : (
              <View>
                <Text style={[TXT.xs, { color: C.gray500, marginBottom: 8 }]}>
                  {refundMode(order) === 'quick'
                    ? 'This request has not shipped yet — you can ask for a refund of what you have paid.'
                    : 'Delivered requests can be claimed within 72 hours of delivery.'}
                </Text>
                <PillButton
                  Icon={RotateCcw}
                  iconSize={11}
                  label={refundMode(order) === 'quick' ? 'Quick Refund' : 'After Sale Refund'}
                  bg={C.gray200}
                  pressedBg={C.gray300}
                  fg={C.gray700}
                  onPress={() => setRefundOpen(true)}
                />
              </View>
            )}
          </Card>
        )}
      </Animated.View>
    </DashboardLayout>
  );
}
