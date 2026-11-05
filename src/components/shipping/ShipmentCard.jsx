import React, { memo, useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import {
  Package, Plane, Ship, MapPin, Calendar, Pencil, Check, X, Truck, Navigation2, CreditCard, Clock, CalendarClock,
  Calculator, LifeBuoy, FileText, ChevronRight, ChevronDown, ChevronUp,
} from 'lucide-react-native';
import CopyIdButton from '@/components/CopyIdButton';
import ProductImage from '@/components/ui/ProductImage';
import { C, ORANGE, Press, ScalePress, Spinner } from '@/components/product/ui';
import { canPayShipment } from '@/lib/shipForMe';
import { refundDeadline, refundedAmount } from '@/lib/refund';
import {
  sf, SC, CONTAINS_STYLE, SoftPill, StatusBadge, PaymentBadge, Collapsible, ShipmentProgressVertical,
  toIsoDate, estimateDeliveryDate, shipMethodOf, statusLabelOf, num,
} from '@/components/shipping/ShipBits';
import useNow from '@/lib/useNow';

/* ═══════════════════════════════════════════════════════════════════════
   RequestCard of web ship-for-me/my-request/page.jsx, < 640px, with the
   `.sfm-list-root` type shrink (see ShipBits `sf`).
   ═══════════════════════════════════════════════════════════════════════ */

const CARD_SHADOW = '0 4px 16px -4px rgba(28,28,28,0.08), 0 2px 6px -2px rgba(28,28,28,0.04)';

/* Shipping Bill Calculation — open by default only while the bill can be paid. */
function ShippingBillSection({ req, onPayNow, onInvoice, canPayNow }) {
  const [open, setOpen] = useState(canPayNow);
  const shippingCharge = req.receivedWeight && req.customerRate ? Math.round(req.receivedWeight * req.customerRate) : null;
  const otherCost = parseFloat(req.otherCost) || 0;
  const discount = parseFloat(req.discount) || 0;
  const refund = parseFloat(req.refund) || 0;

  const row = (label, value, { labelColor = C.gray500, valueColor = C.gray800, extra } = {}) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
      <Text style={[sf('xs'), { color: labelColor, flexShrink: 1 }]}>
        {label}
        {extra}
      </Text>
      <Text style={[sf('xs'), { fontWeight: '700', color: valueColor, flexShrink: 0 }]}>{value}</Text>
    </View>
  );

  const btn = { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8, borderRadius: 12 };

  return (
    <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderStyle: 'dashed', borderColor: C.gray200 }}>
      <Press
        onPress={() => setOpen((v) => !v)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}
      >
        {({ pressed }) => (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 }}>
              <View style={{ width: 24, height: 24, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: ORANGE }}>
                <Calculator size={12} color="#ffffff" />
              </View>
              <Text style={[sf(11), { fontWeight: '800', color: C.gray900, flexShrink: 1 }]} numberOfLines={1}>
                Shipping Bill Calculation
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 0, opacity: pressed ? 0.6 : 1 }}>
              <Text style={[sf(10), { fontWeight: '600', color: C.gray400 }]}>{open ? 'Hide Breakdown' : 'Show Breakdown'}</Text>
              {open ? <ChevronUp size={13} color={C.gray400} /> : <ChevronDown size={13} color={C.gray400} />}
            </View>
          </>
        )}
      </Press>

      {open && (
        <Animated.View entering={FadeIn.duration(180)} style={{ marginTop: 12, gap: 8 }}>
          {shippingCharge !== null &&
            row('Shipping Charge ', `${shippingCharge.toLocaleString()} BDT`, {
              extra: (
                <Text style={[sf(10), { color: C.gray300, fontFamily: 'monospace' }]}>
                  ({req.receivedWeight} Kg × {req.customerRate})
                </Text>
              ),
            })}
          {otherCost > 0 && row('Repacking Charge', `+ ${otherCost.toLocaleString()} BDT`)}
          {refund > 0 && row('Refund', `− ${refund.toLocaleString()} BDT`, { valueColor: SC.emerald600 })}
          {discount > 0 && row('Discount', `− ${discount.toLocaleString()} BDT`, { labelColor: SC.emerald600, valueColor: SC.emerald600 })}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8,
              paddingTop: 8,
              borderTopWidth: 1,
              borderTopColor: C.gray100,
            }}
          >
            <Text style={[sf('xs'), { fontWeight: '800', color: C.gray900 }]}>Total Due Bill:</Text>
            <Text style={[sf('base'), { fontWeight: '800', color: ORANGE, flexShrink: 0 }]}>{num(req.shippingChargeCustomer)} BDT</Text>
          </View>
        </Animated.View>
      )}

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 }}>
        <Press onPress={() => onInvoice(req)} style={{ flex: 1 }}>
          {({ pressed }) => (
            <View style={[btn, { backgroundColor: pressed ? C.gray200 : C.gray100 }]}>
              <FileText size={13} color={C.gray600} />
              <Text style={[sf('xs'), { fontWeight: '700', color: C.gray600 }]}>Invoice</Text>
            </View>
          )}
        </Press>
        {req.paymentStatus === 'Paid' ? (
          <View style={[btn, { flex: 1.4, backgroundColor: SC.emerald50 }]}>
            <Check size={13} color={SC.emerald700} />
            <Text style={[sf('xs'), { fontWeight: '800', color: SC.emerald700 }]}>Paid</Text>
          </View>
        ) : req.paymentRequested ? (
          <View style={[btn, { flex: 1.4, backgroundColor: SC.amber50 }]}>
            <Spinner size={13} color={SC.amber700} />
            <Text style={[sf('xs'), { fontWeight: '800', color: SC.amber700 }]}>Payment Pending</Text>
          </View>
        ) : canPayNow ? (
          <ScalePress
            onPress={() => onPayNow(req)}
            containerStyle={{ flex: 1.4 }}
            style={[btn, { backgroundColor: ORANGE, boxShadow: '0 4px 14px rgba(255,106,0,0.267)' }]}
          >
            <CreditCard size={13} color="#ffffff" />
            <Text style={[sf('xs'), { fontWeight: '800', color: '#ffffff' }]}>Pay Bill Now</Text>
          </ScalePress>
        ) : null}
      </View>
    </View>
  );
}

/* Refund claim window — 72h after delivery (lib/refund.js). Once claimed it
   reports where the claim stands instead, regardless of the window. */
function RefundClaimSection({ req, onClaim }) {
  const claimed = !!(req.refundStatus || req.refundClaimRequested);
  const now = useNow(1000, !claimed);

  if (claimed) {
    const status = req.refundStatus || 'requested';
    const amount = refundedAmount(req);
    const tone =
      status === 'given'
        ? { border: SC.emerald100, bg: SC.emerald50, fg: SC.emerald700 }
        : status === 'rejected'
          ? { border: SC.red100, bg: SC.red50, fg: SC.red700 }
          : { border: SC.amber200, bg: SC.amber50, fg: SC.amber800 };
    const Icon = status === 'rejected' ? X : status === 'given' ? Check : Clock;
    return (
      <View
        style={{
          marginTop: 12,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: tone.border,
          backgroundColor: tone.bg,
          paddingHorizontal: 10,
          paddingVertical: 8,
          flexDirection: 'row',
          alignItems: 'flex-start',
          gap: 8,
        }}
      >
        <View style={{ marginTop: 2 }}>
          <Icon size={12} color={tone.fg} />
        </View>
        <View style={{ flexShrink: 1 }}>
          <Text style={[sf(10), { fontWeight: '600', color: tone.fg }]}>
            {status === 'given' ? (
              <>
                Refund given
                {amount > 0 && (
                  <>
                    {' — Refunded: '}
                    <Text style={{ fontWeight: '700' }}>৳{amount.toLocaleString()}</Text>
                  </>
                )}
              </>
            ) : status === 'rejected' ? (
              'Refund claim rejected'
            ) : (
              'Refund claim submitted — our team will review it shortly.'
            )}
          </Text>
          {status !== 'requested' && !!req.refundNote && (
            <Text style={[sf(10), { color: tone.fg, opacity: 0.8, marginTop: 2 }]}>{req.refundNote}</Text>
          )}
        </View>
      </View>
    );
  }

  const deadline = refundDeadline(req);
  if (deadline === null) return null;
  const remaining = deadline - now;
  if (remaining <= 0) return null;

  const hrs = String(Math.floor(remaining / 3600000)).padStart(2, '0');
  const mins = String(Math.floor((remaining % 3600000) / 60000)).padStart(2, '0');
  const secs = String(Math.floor((remaining % 60000) / 1000)).padStart(2, '0');

  return (
    <View style={{ marginTop: 12, borderRadius: 12, borderWidth: 1, borderColor: SC.amber200, backgroundColor: SC.amber50, padding: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 1 }}>
          <Clock size={12} color={SC.amber800} />
          <Text style={[sf(10), { fontWeight: '700', color: SC.amber800 }]}>রিফান্ড ক্লেইম উইন্ডো:</Text>
        </View>
        <View style={{ backgroundColor: '#ffffff', borderWidth: 1, borderColor: SC.amber200, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 }}>
          <Text style={[sf(10), { fontWeight: '800', color: SC.amber700, fontVariant: ['tabular-nums'] }]}>
            {hrs}:{mins}:{secs}
          </Text>
        </View>
      </View>
      <Text style={[sf(10, 'relaxed'), { color: SC.amber700, marginBottom: 10 }]}>
        <Text style={{ fontWeight: '700' }}>বিশেষ সতর্কীকরণ নোট:</Text> পণ্য ডেলিভারি নেওয়ার পর সর্বোচ্চ ৭২ ঘণ্টার মধ্যে যেকোনো
        ক্রুটি বা ক্ষতির জন্য রিফান্ড ক্লেইম করার সুযোগ পাবেন। ৭২ ঘণ্টা পার হয়ে গেলে সিস্টেমে স্বয়ংক্রিয়ভাবে রিফান্ড বাটনটি লক হয়ে যাবে।
      </Text>
      <ScalePress onPress={() => onClaim(req)} containerStyle={{ alignSelf: 'stretch' }}>
        <SoftPill color="orange" Icon={LifeBuoy} iconSize={13} size="xs" px={12} py={8} center>
          Open Refund Claim Ticket
        </SoftPill>
      </ScalePress>
    </View>
  );
}

function B({ children }) {
  return <Text style={{ fontWeight: '700' }}>{children}</Text>;
}

function EstDateBlock({ req, estDate }) {
  const isSea = shipMethodOf(req) === 'sea';
  return (
    <View style={{ marginTop: 12, borderRadius: 12, borderWidth: 1, borderColor: SC.amber200, backgroundColor: SC.amber50, padding: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 1 }}>
          <CalendarClock size={12} color={SC.amber800} />
          <Text style={[sf(10), { fontWeight: '700', color: SC.amber800, flexShrink: 1 }]}>সম্ভাব্য ডেলিভারি তারিখ (Est. Date):</Text>
        </View>
        <View style={{ backgroundColor: '#ffffff', borderWidth: 1, borderColor: SC.amber200, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 }}>
          <Text style={[sf(10), { fontWeight: '800', color: SC.amber700 }]}>{estDate}</Text>
        </View>
      </View>
      <Text style={[sf(11, 'relaxed'), { color: SC.amber700, marginTop: 8 }]}>
        <B>গুরুত্বপূর্ণ নোট:</B> আপনার শিপমেন্টটি <B>{isSea ? 'By Sea' : 'By Air'}</B> পাঠানো হবে। আমাদের চায়না ওয়্যারহাউজে পণ্য রিসিভ হওয়ার পর
        থেকে <B>{isSea ? 'সি শিপমেন্টের' : 'এয়ার শিপমেন্টের'}</B> জন্য সাধারণত <B>{isSea ? '৩৫-৪০ দিন' : '১২-১৪ দিন'}</B> সময় লাগে। তবে
        কাস্টমস কোনো প্রকার আইনি জটিলতা বা যুক্ত চেকিং এর ইস্যু হলে এই সম্ভাব্য তারিখ পরিবর্তন বা বৃদ্ধি হতে পারে।
      </Text>
    </View>
  );
}

function ShipmentCard({ req, selected, onToggleSelect, onEdit, onStartShipping, onPayNow, onRefundClaim, onOpen, onInvoice }) {
  const method = (req.shipBy || req.method || '').toLowerCase();
  const canEdit = !req.status || req.status === 'Pending';
  const canStartShip = req.status === 'Rates Provided' && !req.shipping;
  const hasCharge = !!req.shippingChargeCustomer;
  const canPayNow = canPayShipment(req);
  const score = req.shipmentStatusScore || 1;
  const isDelivered = score >= 7 || req.status === 'Delivered';
  const statusLabel = statusLabelOf(req);

  const trackingList = req.trackingNumbers?.length
    ? req.trackingNumbers
    : String(req.trackingNo || '')
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
  const ctnList = Array.isArray(req.ctnNo) ? req.ctnNo : req.ctnNo ? [req.ctnNo] : [];
  const [showAllTracking, setShowAllTracking] = useState(false);
  const visibleTracking = showAllTracking ? trackingList : trackingList.slice(0, 2);

  /* Only while the parcel is actually in shipment (scores 3–5). */
  const estDate = !isDelivered ? estimateDeliveryDate(req) : null;
  const showEstDate = !!estDate && score >= 3 && score < 6;
  const contains = CONTAINS_STYLE[req.productContains] || CONTAINS_STYLE.none;

  const stats = [
    { label: 'Total Box', value: req.ctnQuantity || '—' },
    { label: 'Total CBM', value: req.totalCbm ? `${req.totalCbm} cbm` : '—' },
    {
      label: 'Actual WT',
      value: req.receivedWeight ? `${req.receivedWeight} Kg` : req.weight ? `${req.weight} Kg` : 'Pending',
      pending: !req.receivedWeight,
    },
  ];

  return (
    <View
      style={{
        backgroundColor: '#ffffff',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: C.gray100,
        overflow: 'hidden',
        boxShadow: CARD_SHADOW,
      }}
    >
      {/* Header — ID / method left, status stacked above payment on the right */}
      <View
        style={{
          paddingHorizontal: 12,
          paddingTop: 12,
          paddingBottom: 10,
          backgroundColor: C.gray50,
          borderBottomWidth: 1,
          borderBottomColor: C.gray100,
          flexDirection: 'row',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 8,
        }}
      >
        <View style={{ flexShrink: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            {canPayNow && (
              <Press
                onPress={() => onToggleSelect(req.bookingId)}
                hitSlop={10}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: !!selected }}
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: 6,
                  borderWidth: 2,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: selected ? ORANGE : '#ffffff',
                  borderColor: selected ? ORANGE : C.gray300,
                }}
              >
                {selected && <Check size={11} color="#ffffff" strokeWidth={3} />}
              </Press>
            )}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={[sf('xs'), { fontWeight: '800', color: C.gray900 }]}>#PC-{req.bookingId}</Text>
              <CopyIdButton value={`PC-${req.bookingId}`} size={11} />
            </View>
            {!!method && (
              <SoftPill color="blue" Icon={method === 'air' ? Plane : Ship} iconSize={9} size={9} px={6} py={2} uppercase>
                {method}
              </SoftPill>
            )}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
            <Calendar size={9} color={C.gray400} />
            <Text style={[sf(10), { color: C.gray400 }]}>Booked: {toIsoDate(req.date)}</Text>
            {!!req.shipFrom && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginLeft: 8 }}>
                <MapPin size={9} color={C.gray400} />
                <Text style={[sf(10), { color: C.gray400, textTransform: 'capitalize' }]}>{req.shipFrom}</Text>
              </View>
            )}
          </View>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
          <StatusBadge status={req.status} req={req} />
          <PaymentBadge status={req.paymentStatus} />
        </View>
      </View>

      <View style={{ padding: 12 }}>
        {/* Product row */}
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: C.gray100,
              backgroundColor: C.gray50,
              overflow: 'hidden',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {req.imageUrl ? (
              <ProductImage uri={req.imageUrl} style={{ width: '100%', height: '100%' }} />
            ) : (
              <Package size={18} color={C.gray200} />
            )}
          </View>

          <View style={{ flex: 1, minWidth: 0 }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
              <Text style={[sf('xs'), { fontWeight: '700', color: C.gray800, flexShrink: 1 }]} numberOfLines={1}>
                {req.othersProductName || '—'}
              </Text>
              {canEdit && (
                <Press onPress={() => onEdit(req)} hitSlop={6} style={({ pressed }) => ({ flexShrink: 0, opacity: pressed ? 0.8 : 1 })}>
                  <SoftPill color="blue" Icon={Pencil} iconSize={9} size={10} px={8} py={2}>
                    Edit
                  </SoftPill>
                </Press>
              )}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
              <View style={{ backgroundColor: C.gray50, borderWidth: 1, borderColor: C.gray200, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 }}>
                <Text style={[sf(10), { fontWeight: '500', color: C.gray400 }]}>
                  QTY: <Text style={{ fontWeight: '800', color: C.gray800 }}>{req.productQuantity || '—'} Pcs</Text>
                </Text>
              </View>
              <View
                style={{
                  backgroundColor: contains.bg,
                  borderWidth: 1,
                  borderColor: contains.border,
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                  borderRadius: 8,
                }}
              >
                <Text style={[sf(10), { fontWeight: '800', color: contains.fg, textTransform: 'capitalize' }]}>
                  {req.productContains && req.productContains !== 'none' ? req.productContains : 'None'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {!!(req.customerRate || req.result?.perKg) && (
          <Text style={[sf(10), { color: C.gray500, marginTop: 10 }]}>
            <Text style={{ fontWeight: '500', textTransform: 'capitalize' }}>{method || 'Air'}</Text> Shipment Rate:{' '}
            <Text style={{ fontWeight: '700', color: C.gray700 }}>{req.customerRate || req.result?.perKg} BDT / KG</Text>
          </Text>
        )}

        {/* Tracking & carton details */}
        {trackingList.length > 0 && (
          <Collapsible Icon={Navigation2} title="Tracking and Carton Details">
            <View style={{ gap: 8 }}>
              {visibleTracking.map((t, i) => (
                <View
                  key={i}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 8,
                    backgroundColor: C.gray50,
                    borderRadius: 8,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                  }}
                >
                  <View style={{ flexShrink: 1 }}>
                    <Text style={[sf(9), { color: C.gray400, textTransform: 'uppercase', letterSpacing: 0.2 }]}>Tracking Number</Text>
                    <Text style={[sf('xs'), { fontWeight: '700', color: C.gray800 }]}>{t}</Text>
                  </View>
                  {!!ctnList[i] && (
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={[sf(9), { color: C.gray400, textTransform: 'uppercase', letterSpacing: 0.2 }]}>Carton Number</Text>
                      <View
                        style={{
                          backgroundColor: SC.orange50,
                          borderWidth: 1,
                          borderColor: SC.orange200,
                          paddingHorizontal: 8,
                          paddingVertical: 2,
                          borderRadius: 6,
                        }}
                      >
                        <Text style={[sf(11), { fontWeight: '700', color: ORANGE }]}>{ctnList[i]}</Text>
                      </View>
                    </View>
                  )}
                </View>
              ))}
            </View>
            {trackingList.length > 2 && (
              <Press
                onPress={() => setShowAllTracking((v) => !v)}
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 8 }}
              >
                {({ pressed }) => (
                  <>
                    <Text style={[sf(11), { fontWeight: '700', color: pressed ? ORANGE : C.gray400 }]}>
                      {showAllTracking ? 'Show less' : 'Show more'}
                    </Text>
                    {showAllTracking ? (
                      <ChevronUp size={12} color={pressed ? ORANGE : C.gray400} />
                    ) : (
                      <ChevronDown size={12} color={pressed ? ORANGE : C.gray400} />
                    )}
                  </>
                )}
              </Press>
            )}
          </Collapsible>
        )}

        {/* 3-stat row */}
        <View
          style={{
            marginTop: 12,
            borderRadius: 16,
            backgroundColor: C.gray50,
            borderWidth: 1,
            borderColor: C.gray100,
            flexDirection: 'row',
            alignItems: 'stretch',
          }}
        >
          {stats.map(({ label, value, pending }, i) => (
            <View
              key={label}
              style={{
                flex: 1,
                paddingHorizontal: 6,
                paddingVertical: 6,
                alignItems: 'center',
                borderLeftWidth: i > 0 ? 1 : 0,
                borderLeftColor: C.gray200,
              }}
            >
              <Text style={[sf(8), { fontWeight: '700', color: C.gray400, textTransform: 'uppercase', letterSpacing: 0.4 }]} numberOfLines={1}>
                {label}
              </Text>
              <Text style={[sf(11), { fontWeight: '700', marginTop: 2, color: pending ? ORANGE : C.gray800 }]} numberOfLines={1}>
                {value}
              </Text>
            </View>
          ))}
        </View>

        {/* Timeline */}
        <Collapsible Icon={Truck} title={`Current Status: ${statusLabel}`}>
          <ShipmentProgressVertical score={score} req={req} />
        </Collapsible>

        {showEstDate && <EstDateBlock req={req} estDate={estDate} />}

        {isDelivered && <RefundClaimSection req={req} onClaim={onRefundClaim} />}

        {hasCharge && <ShippingBillSection req={req} onPayNow={onPayNow} onInvoice={onInvoice} canPayNow={canPayNow} />}

        {/* Actions row — View details last */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 }}>
          {canStartShip && (
            <Press onPress={() => onStartShipping(req)} style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}>
              <SoftPill color="teal" Icon={Truck} iconSize={10} size={10} px={10} py={4}>
                Start Shipping
              </SoftPill>
            </Press>
          )}
          <Press onPress={() => onOpen(req)} style={{ flex: 1 }}>
            {({ pressed }) => (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 4,
                  paddingVertical: 4,
                  borderRadius: 12,
                  backgroundColor: pressed ? C.gray50 : 'transparent',
                }}
              >
                <Text style={[sf(10), { color: pressed ? ORANGE : C.gray400 }]}>View details</Text>
                <ChevronRight size={11} color={pressed ? ORANGE : C.gray400} />
              </View>
            )}
          </Press>
        </View>
      </View>
    </View>
  );
}

export default memo(ShipmentCard);
