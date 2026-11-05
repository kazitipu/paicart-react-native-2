import React, { memo, useState } from 'react';
import { View, Text } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import {
  Package, Navigation2, Scale, Receipt, Plane, Ship, Check, CreditCard, FileText, RotateCcw,
} from 'lucide-react-native';
import CopyIdButton from '@/components/CopyIdButton';
import { C, ORANGE, Press, ScalePress } from '@/components/product/ui';
import { fs, Row, DashedDivider, ItemThumb, ShipmentProgressVertical, money } from '@/components/orders/OrderBits';
import { ShippingNote } from '@/components/orders/MyOrderCard';
import {
  SoftPill, RequestStatusBadge, RequestPaymentBadge, PanelToggle,
} from '@/components/requests/RequestBits';
import { getSingleShopTotal, getTotalPaid, getTotalDue, canPayBooking } from '@/lib/requestMath';
import { refundMode, showRefundBlock, bookAgainId } from '@/lib/refund';
import { isRefundGiven } from '@/lib/buckets';

/* ═══════════════════════════════════════════════════════════════════════
   RequestCard of web buy-and-ship-for-me/my-request/page.jsx at < 640px.
   The page has no scoped font shrink — plain Tailwind v4 sizes.
   ═══════════════════════════════════════════════════════════════════════ */

const SKY600 = '#0284c7';

/* `bg-gray-50 rounded-xl px-3 py-2.5`: label 10px semibold gray-400, value
   text-sm extrabold gray-800, optional 9px note. */
function Tile({ label, children, note }) {
  return (
    <View style={{ flex: 1, backgroundColor: C.gray50, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 }}>
      <Text style={[fs(10), { fontWeight: '600', color: C.gray400 }]}>{label}</Text>
      <View style={{ marginTop: 2 }}>{children}</View>
      {!!note && <Text style={{ fontSize: 9, lineHeight: 13.5, color: C.gray400, marginTop: 2 }}>{note}</Text>}
    </View>
  );
}

const TileValue = ({ children }) => (
  <Text style={[fs('sm'), { fontWeight: '800', color: C.gray800 }]}>{children}</Text>
);

/* `flex-none px-4 py-2.5 rounded-xl text-white text-xs font-bold gap-1.5
   bg-[#FF6A00] active:scale-95` */
function OrangeAction({ Icon, label, onPress }) {
  return (
    <ScalePress
      onPress={onPress}
      containerStyle={{ flexShrink: 0 }}
      style={{
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
        backgroundColor: ORANGE,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
      }}
    >
      <Icon size={13} color="#ffffff" />
      <Text style={[fs('xs'), { fontWeight: '700', color: '#ffffff' }]}>{label}</Text>
    </ScalePress>
  );
}

function RequestCard({ booking, selected, onToggleSelect, onPayNow, onApplyRefund, onOpen, onInvoice, onProduct, onBookAgain }) {
  const [weightExpanded, setWeightExpanded] = useState(false);
  const [trackExpanded, setTrackExpanded] = useState(false);
  const [billExpanded, setBillExpanded] = useState(false);

  const isRejected = (booking.orderStatus || booking.status || '') === 'Reject';
  const base = booking.actualTotal ? parseInt(booking.actualTotal, 10) : getSingleShopTotal(booking);
  const totalPaid = getTotalPaid(booking);
  const totalDue = getTotalDue(booking);
  const totalBill = totalDue + totalPaid;
  const hasShipping = parseInt(booking.shippingChargeCustomer, 10) > 0;
  const payable = canPayBooking(booking);

  const qty = parseInt(booking.productQuantity, 10) || 0;
  const unitPrice = parseFloat(booking.unitPrice) || 0;

  /* ReorderLink kind 'request': only once a refund has been given */
  const rebookId = isRefundGiven(booking) ? bookAgainId(booking) : null;
  const offerAmt =
    parseInt(booking.offer, 10) > 0 && parseInt(booking.actualTotalAfterCoupon, 10) > 0
      ? Math.round(parseInt(booking.actualTotalAfterCoupon, 10) * (parseInt(booking.offer, 10) / 100))
      : 0;
  const sea = (booking.shipmentMethod || 'Air') === 'Sea';
  const store = [booking.store, booking.country].filter(Boolean).join(' · ') || '__';
  const hasLink = !!booking.productUrl;

  const idLabel = [fs(10), { fontWeight: '700', color: C.gray400, textTransform: 'uppercase', letterSpacing: 0.5 }];

  return (
    <View style={{ backgroundColor: '#ffffff', borderRadius: 16, overflow: 'hidden', borderWidth: 1.5, borderColor: '#FFD6B0' }}>
      {/* ── Header ── */}
      <View style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8, flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
        <Press
          onPress={() => onToggleSelect(booking.bookingId)}
          hitSlop={8}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: !!selected }}
          style={{
            width: 20,
            height: 20,
            marginTop: 2,
            borderRadius: 6,
            borderWidth: 2,
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            backgroundColor: selected ? ORANGE : '#ffffff',
            borderColor: selected ? ORANGE : C.gray300,
          }}
        >
          {selected && <Check size={12} color="#ffffff" strokeWidth={3} />}
        </Press>

        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 }}>
              <Package size={13} color={ORANGE} />
              <Text style={[fs('sm'), { fontWeight: '700', color: C.gray800, flexShrink: 1 }]}>
                {booking.productType || 'Product Request'}
              </Text>
            </View>
            <RequestStatusBadge status={booking.orderStatus || booking.status} req={booking} />
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 10, rowGap: 4, marginTop: 4 }}>
            <Text style={[fs(11), { color: C.gray400 }]}>{booking.date || '__'}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Navigation2 size={10} color={C.gray400} />
              <Text style={[fs(11), { color: C.gray400 }]}>{booking.trackingNo || '__'}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* ── Booking Id / Store ── */}
      <View
        style={{
          marginHorizontal: 16,
          marginBottom: 8,
          borderRadius: 12,
          backgroundColor: C.gray50,
          borderWidth: 1,
          borderColor: C.gray100,
          flexDirection: 'row',
          alignItems: 'stretch',
        }}
      >
        <View style={{ flex: 1, paddingHorizontal: 12, paddingVertical: 10 }}>
          <Text style={idLabel}>Booking Id</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
            <Text style={[fs(13), { fontWeight: '700', color: C.gray800, flexShrink: 1 }]}>{booking.bookingId}</Text>
            <CopyIdButton value={booking.bookingId} />
          </View>
        </View>
        <View style={{ width: 1, backgroundColor: C.gray200 }} />
        <View style={{ flex: 1, paddingHorizontal: 12, paddingVertical: 10 }}>
          <Text style={idLabel}>Store</Text>
          <Text numberOfLines={1} style={[fs(13), { fontWeight: '700', color: ORANGE, marginTop: 2, textTransform: 'capitalize' }]}>
            {store}
          </Text>
        </View>
      </View>

      {/* ── Product row ── */}
      <View style={{ paddingHorizontal: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 12 }}>
          <ItemThumb uri={booking.imageUrl} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Press onPress={hasLink ? () => onProduct(booking.productUrl) : undefined} disabled={!hasLink}>
              {({ pressed }) => (
                <Text numberOfLines={2} style={[fs('sm', false, 'snug'), { fontWeight: '700', color: pressed ? ORANGE : C.gray800 }]}>
                  {booking.productType || 'Product'}
                </Text>
              )}
            </Press>
            {!!booking.productVariant && (
              <Text numberOfLines={2} style={[fs(11), { color: C.gray400, marginTop: 2 }]}>
                {booking.productVariant}
              </Text>
            )}
            <Text style={[fs(11), { color: C.gray400, marginTop: 4 }]}>
              Qty: <Text style={{ fontWeight: '600', color: C.gray600 }}>x{qty || '__'}</Text>
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end', flexShrink: 0 }}>
            <Text style={[fs('sm'), { fontWeight: '800', color: C.gray800, textAlign: 'right' }]}>
              {unitPrice > 0 ? `৳${money(Math.round(unitPrice * (qty || 1)))}` : '__'}
            </Text>
          </View>
        </View>
      </View>

      {/* ── Collapsible: Weight & Shipping Rate ── */}
      <View style={{ paddingHorizontal: 16, paddingBottom: 8, paddingTop: 4 }}>
        <PanelToggle
          Icon={Scale}
          label="Weight & Shipping Rate"
          open={weightExpanded}
          openLabel="Hide"
          closedLabel="View Info"
          onPress={() => setWeightExpanded((v) => !v)}
        />
        {weightExpanded && (
          <Animated.View entering={FadeIn.duration(180)} style={{ marginTop: 6, gap: 8 }}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {/* "Est." until the parcel is on the scale — then it is the weight being billed */}
              <Tile
                label={booking.receivedWeight ? 'Act. Weight' : 'Est. Weight'}
                note={!booking.receivedWeight ? 'confirmed after weighing' : null}
              >
                <TileValue>{booking.receivedWeight ? `${booking.receivedWeight} Kg` : '__'}</TileValue>
              </Tile>
              <Tile
                label="Shipping Rate"
                note={!booking.customerRate && booking.shippingRate ? 'as requested · confirmed by our team' : null}
              >
                <TileValue>
                  {booking.customerRate
                    ? `৳${booking.customerRate} / Kg`
                    : booking.shippingRate
                      ? `৳${booking.shippingRate} / Kg`
                      : '__'}
                </TileValue>
              </Tile>
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Tile label="Shipment Method">
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  {sea ? <Ship size={13} color={SKY600} /> : <Plane size={13} color={SKY600} />}
                  <TileValue>{sea ? 'By Sea' : 'By Air'}</TileValue>
                </View>
              </Tile>
              <View style={{ flex: 1 }} />
            </View>
          </Animated.View>
        )}
      </View>

      {/* ── Collapsible: Shipment Progress ── */}
      {!isRejected && (
        <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
          <PanelToggle
            Icon={Navigation2}
            label="Shipment Progress"
            open={trackExpanded}
            openLabel="Hide"
            closedLabel="View Info"
            onPress={() => setTrackExpanded((v) => !v)}
          />
          {trackExpanded && (
            <Animated.View
              entering={FadeIn.duration(180)}
              style={{ backgroundColor: C.gray50, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 12, marginTop: 6 }}
            >
              <ShipmentProgressVertical score={parseInt(booking.shipmentStatusScore, 10) || 1} req={booking} />
            </Animated.View>
          )}
        </View>
      )}

      {/* ── Collapsible: Bill Details & Breakdown ── */}
      {!isRejected && (
        <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
          <PanelToggle
            Icon={Receipt}
            label="Bill Details & Breakdown"
            open={billExpanded}
            openLabel="Collapse"
            closedLabel="Expand"
            onPress={() => setBillExpanded((v) => !v)}
          />

          {billExpanded && (
            <Animated.View entering={FadeIn.duration(200)} style={{ paddingHorizontal: 4, paddingTop: 12, paddingBottom: 4, gap: 10 }}>
              <Row label="Product Price:" value={base > 0 ? `৳${money(base)}` : '__'} />
              <Row
                label="🇨🇳 China Local Delivery Charge:"
                value={parseInt(booking.localShipping, 10) > 0 ? `৳${money(parseInt(booking.localShipping, 10))}` : '__'}
              />

              <DashedDivider />

              {hasShipping ? (
                <Row bold label="Shipping Charge (CN to BD):" value={`৳${money(parseInt(booking.shippingChargeCustomer, 10))}`} />
              ) : (
                <>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <Text style={[fs(13), { fontWeight: '700', color: C.gray800 }]}>Shipping Charge:</Text>
                    <SoftPill color="orange">৳****</SoftPill>
                  </View>
                  <ShippingNote shrink={false} />
                </>
              )}

              {parseInt(booking.otherCost, 10) > 0 && (
                <Row label="Packaging & Other cost:" value={`+৳${money(parseInt(booking.otherCost, 10))}`} />
              )}
              {parseInt(booking.couponAmount, 10) > 0 && (
                <Row label="Coupon:" value={`-৳${money(parseInt(booking.couponAmount, 10))}`} tone="green" />
              )}
              {offerAmt > 0 && <Row label="Discount (on pay now%):" value={`-৳${money(offerAmt)}`} tone="green" />}
              {parseInt(booking.discount, 10) > 0 && (
                <Row label="Discount (on shipping):" value={`-৳${money(Math.round(parseInt(booking.discount, 10)))}`} tone="green" />
              )}

              <DashedDivider />

              <Row bold label="Total Current Bill:" value={`৳${money(totalBill)}`} />
              {totalPaid > 0 && <Row label="Advance Paid:" value={`-৳${money(totalPaid)}`} tone="green" />}

              <View style={{ borderTopWidth: 1, borderTopColor: C.gray200, paddingTop: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={[fs('sm'), { fontWeight: '800', color: C.gray800 }]}>Remaining Balance Due:</Text>
                  <Text style={[fs('lg'), { fontWeight: '800', color: ORANGE }]}>৳{money(totalDue)}</Text>
                </View>
              </View>

              {booking.payments?.length > 0 && (
                <View style={{ paddingTop: 4 }}>
                  <Text style={[fs(10), { fontWeight: '700', color: C.gray400, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }]}>
                    Payment History
                  </Text>
                  <View style={{ gap: 4 }}>
                    {booking.payments.map((p, i) => (
                      <Row
                        key={i}
                        small
                        label={`${p.method || 'Payment'} — ${p.date || '__'}`}
                        value={`+৳${money(parseInt(p.amount || 0, 10))}`}
                        tone="green"
                      />
                    ))}
                  </View>
                </View>
              )}

              {showRefundBlock(booking) && (
                <View style={{ paddingTop: 4, flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  {booking.refundStatus ? (
                    <SoftPill color={booking.refundStatus === 'rejected' ? 'red' : 'emerald'}>Refund {booking.refundStatus}</SoftPill>
                  ) : (
                    <Press
                      onPress={() => onApplyRefund(booking)}
                      style={({ pressed }) => ({
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 4,
                        paddingHorizontal: 12,
                        paddingVertical: 4,
                        borderRadius: 999,
                        backgroundColor: pressed ? C.gray300 : C.gray200,
                      })}
                    >
                      <RotateCcw size={10} color={C.gray700} />
                      <Text style={[fs(10), { fontWeight: '700', color: C.gray700 }]}>
                        {refundMode(booking) === 'quick' ? 'Quick Refund' : 'After Sale Refund'}
                      </Text>
                    </Press>
                  )}
                  {parseInt(booking.refund, 10) > 0 && (
                    <Text style={[fs(10), { color: C.gray500 }]}>
                      Refunded: <Text style={{ fontWeight: '700' }}>৳{money(parseInt(booking.refund, 10))}</Text>
                    </Text>
                  )}
                </View>
              )}

              {!!booking.note && (
                <View
                  style={{
                    backgroundColor: C.amber50,
                    borderWidth: 1,
                    borderColor: C.amber100,
                    borderRadius: 8,
                    paddingHorizontal: 10,
                    paddingVertical: 8,
                  }}
                >
                  <Text style={[fs(11), { color: C.gray500 }]}>
                    <Text style={{ fontWeight: '700', color: C.amber700 }}>Note: </Text>
                    {booking.note}
                  </Text>
                </View>
              )}
            </Animated.View>
          )}
        </View>
      )}

      {/* ── Remaining balance + actions ── */}
      {!isRejected && (
        <View style={{ borderTopWidth: 1, borderTopColor: C.gray100, paddingHorizontal: 16, paddingVertical: 12, gap: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={[fs('xs'), { fontWeight: '700', color: C.gray600 }]}>
              {totalDue > 0 ? 'Remaining Balance Due:' : 'Total Paid:'}
            </Text>
            <Text style={[fs('lg'), { fontWeight: '800', color: totalDue > 0 ? ORANGE : C.green600 }]}>
              ৳{money(totalDue > 0 ? totalDue : totalPaid)}
            </Text>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Press
              onPress={() => onOpen(booking)}
              style={({ pressed }) => ({
                flex: 1,
                alignItems: 'center',
                paddingVertical: 10,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: C.gray200,
                backgroundColor: pressed ? C.gray50 : 'transparent',
              })}
            >
              <Text style={[fs('xs'), { fontWeight: '700', color: C.gray600 }]}>View Details</Text>
            </Press>
            {hasShipping && (
              <Press
                onPress={() => onInvoice(booking)}
                accessibilityLabel="Invoice"
                style={({ pressed }) => ({
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingVertical: 10,
                  paddingHorizontal: 12,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: C.gray200,
                  backgroundColor: pressed ? C.gray50 : 'transparent',
                  alignSelf: 'stretch',
                })}
              >
                <FileText size={13} color={C.gray600} />
              </Press>
            )}
            {payable ? (
              <OrangeAction Icon={CreditCard} label="Pay Now" onPress={() => onPayNow(booking)} />
            ) : rebookId ? (
              <OrangeAction Icon={RotateCcw} label=" Book Again" onPress={() => onBookAgain(rebookId)} />
            ) : (
              <View style={{ paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center' }}>
                <RequestPaymentBadge status={booking.paymentStatus} />
              </View>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

export default memo(RequestCard);
