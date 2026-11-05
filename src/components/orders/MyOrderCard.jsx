import React, { memo, useState } from 'react';
import { View, Text } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import {
  Package, ChevronDown, ChevronUp, Truck, Scale, Receipt, Info, CreditCard, RefreshCw, FileText,
  Image as ImageIcon, Check, XCircle, RotateCcw,
} from 'lucide-react-native';
import ProductImage from '@/components/ui/ProductImage';
import { C, ORANGE, Press, ScalePress } from '@/components/product/ui';
import { cdn } from '@/lib/cdn';
import { applyDiscount } from '@/lib/discount';
import { getOfferDiscount, getTotalPaid, getTotalDue, getGoodsTotal, canPayOrder } from '@/lib/orderMath';
import { refundMode, showRefundBlock, refundedAmount, buyAgainProductId } from '@/lib/refund';
import { isRefundGiven } from '@/lib/buckets';
import { isFullyUnpaid, isCancelled, isAutoCancelled } from '@/lib/orderTabs';
import {
  fs, OC, Pill, PayBadge, OrderStatusPill, Row, DashedDivider, PriceTag, ItemThumb, IdMethodStrip,
  UnpaidCountdownBanner, orderDate, usDate, money,
} from '@/components/orders/OrderBits';

/* ═══════════════════════════════════════════════════════════════════════
   OrderCard of web my-orders/page.jsx, < 640px — every size is the
   `.myorders-root` mobile shrink (S = true). See OrderBits.
   ═══════════════════════════════════════════════════════════════════════ */

const S = true;

const isOrderDelivered = (order) =>
  parseInt(order.shipmentStatusScore || 1, 10) >= 7 || (order.orderStatus || '').toLowerCase() === 'delivered';

/* Collapsible header button: `w-full flex justify-between gap-2 bg-gray-50
   hover:bg-gray-100/80 rounded-xl px-3 py-2.5`. */
function PanelToggle({ Icon, label, open, openLabel, closedLabel, onPress }) {
  return (
    <Press
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
        backgroundColor: pressed ? 'rgba(243,244,246,0.8)' : C.gray50,
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
      })}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 }}>
        <Icon size={14} color={C.gray400} />
        <Text style={[fs('xs', S), { fontWeight: '700', color: C.gray700 }]}>{label}</Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <Text style={[fs(11, S), { fontWeight: '700', color: ORANGE }]}>{open ? openLabel : closedLabel}</Text>
        {open ? <ChevronUp size={13} color={ORANGE} /> : <ChevronDown size={13} color={ORANGE} />}
      </View>
    </Press>
  );
}

function WeightTile({ label, value, note }) {
  return (
    <View style={{ flex: 1, backgroundColor: C.gray50, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 }}>
      <Text style={[fs(10, S), { fontWeight: '600', color: C.gray400 }]}>{label}</Text>
      <Text style={[fs('sm', S), { fontWeight: '800', color: C.gray800, marginTop: 2 }]}>{value}</Text>
      {!!note && <Text style={{ fontSize: 9, lineHeight: 13.5, color: C.gray400, marginTop: 2 }}>{note}</Text>}
    </View>
  );
}

function MyOrderCard({ order, selected, onToggleSelect, onPayNow, onBuyAgain, onApplyRefund, onOpen, onInvoice, onProduct, onReorder }) {
  const [itemsExpanded, setItemsExpanded] = useState(false);
  const [weightExpanded, setWeightExpanded] = useState(false);
  const [billExpanded, setBillExpanded] = useState(false);

  const goodsTotal = getGoodsTotal(order);
  const totalPaid = getTotalPaid(order);
  const totalDue = getTotalDue(order);
  const totalBill = totalDue + totalPaid;
  const hasShipping = parseInt(order.shippingChargeCustomer, 10) > 0;
  const payable = canPayOrder(order);
  const delivered = isOrderDelivered(order);
  const cancelled = isCancelled(order);
  const autoCancelled = isAutoCancelled(order);
  const offerDiscount = getOfferDiscount(order);

  /* Weight and rate stay blank until the team weighs the parcel; meanwhile
     the figures quoted at checkout are shown, labelled as estimates. */
  const placedWeight = (order.items || []).reduce((a, it) => a + (parseFloat(it.weight) || 0), 0);
  const placedRate = parseInt(order.items?.[0]?.shippingRate, 10) || 0;
  const placedRateUnit =
    (order.shippingRateUnit || order.items?.[0]?.shippingRateUnit) === 'parcel' ? 'Parcel' : 'Kg';
  const weightConfirmed = !!order.receivedWeight;
  const rateConfirmed = !!order.customerRate;

  const totalSkus = order.items?.reduce((a, item) => a + (item.skus?.length || 0), 0) || 0;
  const totalQty =
    order.items?.reduce(
      (a, item) => a + (item.skus?.reduce((b, sku) => b + parseInt(sku.totalQuantity || 0, 10), 0) || 0),
      0,
    ) || 0;

  /* ReorderLink: only once a refund has been given — the product page. */
  const reorderId = isRefundGiven(order) ? buyAgainProductId(order) : null;

  /* product rows (first only until expanded); divide-y divide-gray-50 */
  const rows = [];
  (order.items || []).forEach((item, iIdx) =>
    (item.skus || []).forEach((sku, sIdx) => {
      const isFirst = iIdx === 0 && sIdx === 0;
      if (!isFirst && !itemsExpanded) return;
      rows.push({ item, sku, key: `${iIdx}-${sIdx}` });
    }),
  );

  return (
    <View style={{ backgroundColor: '#ffffff', borderRadius: 16, overflow: 'hidden', borderWidth: 1.5, borderColor: OC.PEACH }}>
      {/* ── Header ── */}
      <View style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8, flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
        {payable && (
          <Press
            onPress={() => onToggleSelect(order.orderId)}
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
        )}

        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 }}>
              <Package size={13} color={ORANGE} />
              <Text style={[fs('sm', S), { fontWeight: '700', color: C.gray800, flexShrink: 1 }]}>
                {order.shopName || 'Shop'}
              </Text>
            </View>
            <OrderStatusPill order={order} shrink={S} />
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 10, rowGap: 4, marginTop: 4 }}>
            <Text style={[fs(11, S), { color: C.gray400 }]}>
              {orderDate(order)} {order.orderedTime || ''}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Truck size={10} color={C.gray400} />
              <Text style={[fs(11, S), { color: C.gray400 }]}>{order.trackingNo || '__'}</Text>
            </View>
          </View>
        </View>
      </View>

      {isFullyUnpaid(order) && (
        <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
          <UnpaidCountdownBanner order={order} shrink={S} />
        </View>
      )}

      {/* ── Order Id / Shipment Method ── */}
      <IdMethodStrip order={order} shrink={S} style={{ marginHorizontal: 16, marginBottom: 8 }} />

      {/* ── Product row(s) ── */}
      <View style={{ paddingHorizontal: 16 }}>
        {rows.map(({ item, sku, key }, idx) => {
          const img = cdn(sku.image || item.imgUrl || item.picture || item.pictures?.[0] || '');
          const unitPrice = parseInt(parseFloat(sku.price || 0), 10);
          const qty = parseInt(sku.totalQuantity || 0, 10);
          const itemDiscountPct =
            parseFloat(item.campaignDiscountPercent) > 0
              ? parseFloat(item.campaignDiscountPercent)
              : order.siteDiscountPercent || 0;
          const discountedUnitPrice = Math.round(applyDiscount(unitPrice, itemDiscountPct));
          const variant =
            sku.color || sku.size || item.productType
              ? `${item.productType ? `${item.productType}` : ''}${sku.color ? `${item.productType ? ' / ' : ''}${sku.color}` : ''}${sku.size ? ` / ${sku.size}` : ''}`
              : null;
          const open = item.id ? () => onProduct(item.id) : undefined;
          return (
            <Animated.View
              key={key}
              entering={idx > 0 ? FadeIn.duration(180) : undefined}
              style={{
                flexDirection: 'row',
                alignItems: 'flex-start',
                gap: 12,
                paddingVertical: 12,
                borderTopWidth: idx > 0 ? 1 : 0,
                borderTopColor: C.gray50,
              }}
            >
              <Press onPress={open} disabled={!open} style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}>
                <ItemThumb uri={img} />
              </Press>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Press onPress={open} disabled={!open}>
                  {({ pressed }) => (
                    <Text
                      numberOfLines={2}
                      style={[fs('sm', S, 'snug'), { fontWeight: '700', color: pressed ? ORANGE : C.gray800 }]}
                    >
                      {item.name}
                    </Text>
                  )}
                </Press>
                {variant !== null && (
                  <Text style={[fs(11, S), { color: C.gray400, marginTop: 2 }]}>{variant}</Text>
                )}
                <Text style={[fs(11, S), { color: C.gray400, marginTop: 4 }]}>
                  Qty: <Text style={{ fontWeight: '600', color: C.gray600 }}>x{qty}</Text>
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end', flexShrink: 0 }}>
                <PriceTag
                  amount={discountedUnitPrice * qty}
                  original={unitPrice * qty}
                  style={{ ...fs('sm', S), fontWeight: '800', color: C.gray800 }}
                />
              </View>
            </Animated.View>
          );
        })}

        {!itemsExpanded && totalSkus > 1 && (
          <Press
            onPress={() => setItemsExpanded(true)}
            style={({ pressed }) => ({
              marginTop: -1,
              borderTopWidth: 1,
              borderTopColor: C.gray50,
              paddingVertical: 6,
              alignItems: 'center',
              backgroundColor: pressed ? 'rgba(255,247,237,0.4)' : 'transparent',
            })}
          >
            <Text style={[fs(11, S), { fontWeight: '600', color: ORANGE }]}>
              +{totalSkus - 1} more item{totalSkus - 1 > 1 ? 's' : ''} — tap to expand
            </Text>
          </Press>
        )}
        {itemsExpanded && totalSkus > 1 && (
          <Press
            onPress={() => setItemsExpanded(false)}
            style={({ pressed }) => ({
              borderTopWidth: 1,
              borderTopColor: C.gray50,
              paddingVertical: 6,
              alignItems: 'center',
              backgroundColor: pressed ? C.gray50 : 'transparent',
            })}
          >
            <Text style={[fs(11, S), { fontWeight: '600', color: C.gray400 }]}>Show less</Text>
          </Press>
        )}
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
          <Animated.View entering={FadeIn.duration(180)} style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
            <WeightTile
              label={weightConfirmed ? 'Act. Weight' : 'Est. Weight'}
              value={
                weightConfirmed
                  ? `${order.receivedWeight} Kg`
                  : placedWeight > 0
                    ? `${placedWeight.toFixed(2)} Kg`
                    : '__'
              }
              note={!weightConfirmed && placedWeight > 0 ? 'as placed · confirmed after weighing' : null}
            />
            <WeightTile
              label="Shipping Rate"
              value={
                rateConfirmed
                  ? `৳${order.customerRate} / Kg`
                  : placedRate > 0
                    ? `৳${placedRate} / ${placedRateUnit}`
                    : '__'
              }
              note={!rateConfirmed && placedRate > 0 ? 'as placed · confirmed by our team' : null}
            />
          </Animated.View>
        )}
      </View>

      {/* ── Collapsible: Bill Details & Breakdown ── */}
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
            <Row shrink={S} label={`Product Subtotal (${totalQty} pcs):`} value={`৳${money(goodsTotal)}`} />
            <Row
              shrink={S}
              label="🇨🇳 China Local Delivery Charge:"
              value={parseInt(order.localShipping, 10) > 0 ? `৳${money(parseInt(order.localShipping, 10))}` : '__'}
            />

            <DashedDivider />

            {hasShipping ? (
              <Row shrink={S} bold label="Shipping Charge (CN to BD):" value={`৳${money(parseInt(order.shippingChargeCustomer, 10))}`} />
            ) : (
              <>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <Text style={[fs(13, S), { fontWeight: '700', color: C.gray800 }]}>Shipping Charge:</Text>
                  <Pill shrink={S} color="orange">৳****</Pill>
                </View>
                <ShippingNote />
              </>
            )}

            {parseInt(order.otherCost, 10) > 0 && (
              <Row shrink={S} label="Packaging & Other cost:" value={`+৳${money(parseInt(order.otherCost, 10))}`} />
            )}
            {parseInt(order.siteDiscountAmount, 10) > 0 && (
              <Row
                shrink={S}
                label={`Site Discount (${order.siteDiscountPercent}%):`}
                value={`-৳${money(Math.round(order.siteDiscountAmount))}`}
                tone="green"
              />
            )}
            {parseInt(order.couponAmount, 10) > 0 && (
              <Row shrink={S} label="Coupon:" value={`-৳${money(parseInt(order.couponAmount, 10))}`} tone="green" />
            )}
            {/* gated on the amount, not parseInt(offer) — a fractional offer like 0.75% floors to 0 */}
            {offerDiscount > 0 && (
              <Row
                shrink={S}
                label={
                  parseFloat(order.offerPayNowPercent) > 0
                    ? `Discount (pay now ${parseFloat(order.offerPayNowPercent)}%):`
                    : 'Discount (on pay now%):'
                }
                value={`-৳${money(offerDiscount)}`}
                tone="green"
              />
            )}
            {parseInt(order.discount, 10) > 0 && (
              <Row shrink={S} label="Discount (on shipping):" value={`-৳${money(Math.round(parseInt(order.discount, 10)))}`} tone="green" />
            )}

            <DashedDivider />

            <Row shrink={S} bold label="Total Current Bill:" value={`৳${money(totalBill)}`} />
            {totalPaid > 0 && <Row shrink={S} label="Advance Paid:" value={`-৳${money(totalPaid)}`} tone="green" />}

            <View style={{ borderTopWidth: 1, borderTopColor: C.gray200, paddingTop: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={[fs('sm', S), { fontWeight: '800', color: C.gray800 }]}>Remaining Balance Due:</Text>
                <Text style={[fs('lg', S), { fontWeight: '800', color: ORANGE }]}>৳{money(totalDue)}</Text>
              </View>
            </View>

            {!!order.imageUrl && (
              <View style={{ paddingTop: 4 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 }}>
                  <ImageIcon size={10} color={C.gray400} />
                  <Text style={[fs(10, S), { fontWeight: '700', color: C.gray400, textTransform: 'uppercase', letterSpacing: 0.4 }]}>
                    Abroad Warehouse Received
                  </Text>
                </View>
                <View style={{ width: 64, height: 64, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: C.gray100 }}>
                  <ProductImage uri={order.imageUrl} style={{ width: '100%', height: '100%' }} />
                </View>
              </View>
            )}

            {order.payments?.length > 0 && (
              <View style={{ paddingTop: 4 }}>
                <Text
                  style={[fs(10, S), { fontWeight: '700', color: C.gray400, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 6 }]}
                >
                  Payment History
                </Text>
                <View style={{ gap: 4 }}>
                  {order.payments.map((p, i) => (
                    <Row
                      key={i}
                      shrink={S}
                      small
                      label={`${p.method || 'Payment'} — ${p.date || '__'}`}
                      value={`+৳${money(parseInt(p.amount || 0, 10))}`}
                      tone="green"
                    />
                  ))}
                </View>
              </View>
            )}

            {showRefundBlock(order) && (
              <View style={{ paddingTop: 4, flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                {order.refundStatus ? (
                  <>
                    <Pill shrink={S} color={order.refundStatus === 'rejected' ? 'red' : 'emerald'}>
                      Refund {order.refundStatus}
                    </Pill>
                    {refundedAmount(order) > 0 && <Refunded amount={refundedAmount(order)} />}
                  </>
                ) : (
                  <Press
                    onPress={() => onApplyRefund(order)}
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
                    <RefreshCw size={10} color={C.gray700} />
                    <Text style={[fs(10, S), { fontWeight: '700', color: C.gray700 }]}>
                      {refundMode(order) === 'quick' ? 'Quick Refund' : 'After Sale Refund'}
                    </Text>
                  </Press>
                )}
                {parseInt(order.refund, 10) > 0 && <Refunded amount={parseInt(order.refund, 10)} />}
              </View>
            )}

            {!!order.additionalNotes && (
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
                <Text style={[fs(11, S), { color: C.gray500 }]}>
                  <Text style={{ fontWeight: '700', color: C.amber700 }}>Note: </Text>
                  {order.additionalNotes}
                </Text>
              </View>
            )}
          </Animated.View>
        )}
      </View>

      {/* ── Remaining balance + actions ── */}
      <View style={{ borderTopWidth: 1, borderTopColor: C.gray100, paddingHorizontal: 16, paddingVertical: 12, gap: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={[fs('xs', S), { fontWeight: '700', color: C.gray600 }]}>
            {totalDue > 0 ? 'Remaining Balance Due:' : 'Total Paid:'}
          </Text>
          <Text style={[fs('lg', S), { fontWeight: '800', color: totalDue > 0 ? ORANGE : C.green600 }]}>
            ৳{money(totalDue > 0 ? totalDue : totalPaid)}
          </Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Press
            onPress={() => onOpen(order)}
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
            <Text style={[fs('xs', S), { fontWeight: '700', color: C.gray600 }]}>View Details</Text>
          </Press>
          {parseInt(order.shippingChargeCustomer, 10) > 0 && (
            <Press
              onPress={() => onInvoice(order)}
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
              })}
            >
              <FileText size={13} color={C.gray600} />
            </Press>
          )}
          {payable ? (
            <OrangeAction Icon={CreditCard} label="Pay Now" onPress={() => onPayNow(order)} />
          ) : reorderId ? (
            <OrangeAction Icon={RotateCcw} label=" Buy Again" onPress={() => onReorder(reorderId)} />
          ) : (
            <View style={{ paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center' }}>
              <PayBadge status={order.paymentStatus} shrink={S} />
            </View>
          )}
        </View>

        {/* Why this order was cancelled — an auto-cancel is otherwise
            indistinguishable from one our team rejected. */}
        {autoCancelled && (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'flex-start',
              gap: 8,
              borderRadius: 16,
              paddingHorizontal: 14,
              paddingVertical: 10,
              backgroundColor: '#fdeaea',
              borderWidth: 1,
              borderColor: '#f7cccc',
            }}
          >
            <View style={{ marginTop: 1 }}>
              <XCircle size={14} color="#F5222D" />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[fs(11, S), { fontWeight: '700', color: '#F5222D' }]}>পেমেন্ট না হওয়ায় অর্ডারটি বাতিল হয়েছে</Text>
              <Text style={[fs(10, S), { color: C.gray500 }]}>
                Cancelled automatically — no payment was received within 72 hours
                {order.cancelledAt ? ` (${usDate(order.cancelledAt)})` : ''}.
              </Text>
            </View>
          </View>
        )}

        {/* Buy Again — additive: any delivered order, and any cancelled one. */}
        {(delivered || cancelled) && (
          <ScalePress
            onPress={() => onBuyAgain(order)}
            style={{
              paddingVertical: 10,
              borderRadius: 12,
              borderWidth: 2,
              borderColor: ORANGE,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}
          >
            <RefreshCw size={13} color={ORANGE} />
            <Text style={[fs('xs', S), { fontWeight: '700', color: ORANGE }]}>Buy Again</Text>
          </ScalePress>
        )}
      </View>
    </View>
  );
}

function Refunded({ amount }) {
  return (
    <Text style={[fs(10, S), { color: C.gray500 }]}>
      Refunded: <Text style={{ fontWeight: '700' }}>৳{money(amount)}</Text>
    </Text>
  );
}

/* `flex-none px-4 py-2.5 rounded-xl text-white text-xs font-bold gap-1.5
   bg-[#FF6A00] hover:bg-[#E05900] active:scale-95` */
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
      <Text style={[fs('xs', S), { fontWeight: '700', color: '#ffffff' }]}>{label}</Text>
    </ScalePress>
  );
}

/* Shipping charge still unknown: `flex items-start gap-2 bg-gray-50
   rounded-xl px-3 py-2.5`, orange Info dot + the Bangla note. */
export function ShippingNote({ shrink = S }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
        backgroundColor: C.gray50,
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
      }}
    >
      <View
        style={{
          width: 16,
          height: 16,
          borderRadius: 8,
          backgroundColor: ORANGE,
          alignItems: 'center',
          justifyContent: 'center',
          marginTop: 2,
          flexShrink: 0,
        }}
      >
        <Info size={10} color="#ffffff" />
      </View>
      <Text style={[fs(11, shrink, 'relaxed'), { color: C.gray500, flex: 1 }]}>
        পার্সেল বাংলাদেশে আসার পর প্রকৃত ওজন (Actual Weight) মেপে শিপিং চার্জ হিসাব করা হবে।
      </Text>
    </View>
  );
}

export default memo(MyOrderCard);
