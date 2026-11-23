/* Figures for the customer dashboard overview (app/pages/dashboard).
 *
 * Everything is derived from the customer's own records:
 *   orders     — ordersApi          (Buy & Ship for me / website orders)
 *   requests   — bookingRequest     (Requested products)
 *   shipments  — shipForMe          (Ship for me)
 *   paymentRequests — paymentRequestApi + paymentRequest (slips they uploaded)
 */
import { getTotalDue as getOrderDue, getTotalPaid } from './orderMath';
import { isRefundGiven, getOrderBucket, getRequestBucket, getShipBucket } from './buckets';

const toInt = (v) => parseInt(v, 10) || 0;
const paidOf = (r) => ((r && r.payments) || []).reduce((a, p) => a + Math.max(toInt(p && p.amount), 0), 0);
const lower = (v) => String(v || '').trim().toLowerCase();

/* ── Bills ─────────────────────────────────────────────────────────────── */

/* Same formula as the product-request list (my-request/page.jsx getTotalDue). */
export const requestBill = (b) => {
  const base = b.actualTotal
    ? toInt(b.actualTotal)
    : (b.unitPrice ? toInt(b.unitPrice) * (toInt(b.productQuantity) || 1) : 0);
  const offerAmt = toInt(b.offer) > 0 && toInt(b.actualTotalAfterCoupon) > 0
    ? Math.round(toInt(b.actualTotalAfterCoupon) * (toInt(b.offer) / 100))
    : 0;
  return base + toInt(b.shippingChargeCustomer) + toInt(b.localShipping) + toInt(b.otherCost)
    - toInt(b.discount) - toInt(b.couponAmount) - offerAmt;
};
export const requestDue = (b) => requestBill(b) - paidOf(b);

export const orderBill = (o) => getOrderDue(o) + getTotalPaid(o);

/* A Ship For Me invoice exists only once the parcel is weighed and the actual
   charge is set — the booking-time estimate is not a bill yet. */
export const shipmentBill = (s) => toInt(s.shippingChargeCustomer);
export const shipmentDue = (s) => shipmentBill(s) - paidOf(s);

/* ── Outstanding due ───────────────────────────────────────────────────── */

/* Only invoices for goods Paicart is already handling count as due:
   To Ship → In Shipment → To Receive → Delivered. To Pay orders, Pending /
   Approved (quoted, unpaid) requests, Rejected and Refunded records are
   left out. Ship For Me has no To Ship stage, so it starts at In Shipment,
   and only once the parcel is weighed and billed.

   Mirrored in the website (paicart-nextjs15), the mobile app
   (paicart-react-native) and the admin panel's Client Due page
   (paicart-backend2 src/constants/clientDue.js) — keep them in sync. */
export const DUE_BUCKETS = ['To Ship', 'In Shipment', 'To Receive', 'Delivered'];
export const isOrderDueCounted = (o) => DUE_BUCKETS.includes(getOrderBucket(o));
export const isRequestDueCounted = (b) => DUE_BUCKETS.includes(getRequestBucket(b));
export const isShipmentDueCounted = (s) =>
  DUE_BUCKETS.includes(getShipBucket(s)) && !isRefundGiven(s) && shipmentBill(s) > 0;

/* One due bill, for the per-category lists under Total Outstanding Due. */
const dueBill = (kind, rec, id, bucket, bill, due, title) => ({
  key: `${kind}-${id}`,
  kind,
  id: String(id || ''),
  bucket,
  title: title || '',
  bill,
  paid: paidOf(rec),
  due,
  time: parseRecordDate(rec.date, rec.time),
});
const byDue = (a, b) => (b.due - a.due) || ((b.time || 0) - (a.time || 0));

/* Pending (unapproved) payment slips do not reduce the due — only payments
   recorded on the record do. Overpayments never net off another invoice.
   `bills` lists every invoice behind each figure, biggest due first. */
export const computeOutstanding = (orders = [], requests = [], shipments = []) => {
  const websiteOrder = orders
    .filter(isOrderDueCounted)
    .map((o) => dueBill('order', o, o.orderId, getOrderBucket(o), orderBill(o),
      Math.max(getOrderDue(o), 0), (o.items && o.items[0] && o.items[0].name) || o.shopName))
    .filter((b) => b.due > 0)
    .sort(byDue);

  const requestedProduct = requests
    .filter(isRequestDueCounted)
    .map((b) => dueBill('request', b, b.bookingId, getRequestBucket(b), requestBill(b),
      Math.max(requestDue(b), 0), b.productType || b.othersProductName))
    .filter((b) => b.due > 0)
    .sort(byDue);

  const shipment = shipments
    .filter(isShipmentDueCounted)
    .map((s) => dueBill('ship', s, s.bookingId, getShipBucket(s), shipmentBill(s),
      Math.max(shipmentDue(s), 0), s.othersProductName || s.productType))
    .filter((b) => b.due > 0)
    .sort(byDue);

  const sum = (list) => list.reduce((a, b) => a + b.due, 0);
  const websiteOrderDue = sum(websiteOrder);
  const requestedProductDue = sum(requestedProduct);
  const shipmentDueTotal = sum(shipment);

  return {
    websiteOrderDue,
    requestedProductDue,
    shipmentDue: shipmentDueTotal,
    total: websiteOrderDue + requestedProductDue + shipmentDueTotal,
    bills: { websiteOrder, shipment, requestedProduct },
  };
};

/* ── Status counts (same rules as each list page's tabs) ──────────────── */

const countBy = (list, fn) => list.reduce((acc, r) => {
  const k = fn(r);
  acc[k] = (acc[k] || 0) + 1;
  return acc;
}, {});
export const orderCounts = (orders) => countBy(orders, getOrderBucket);
export const shipmentCounts = (shipments) => countBy(shipments, getShipBucket);
export const requestCounts = (requests) => countBy(requests, getRequestBucket);

/* ── Dates ─────────────────────────────────────────────────────────────── */

/* Records store `date` as "dd/mm/yyyy" (en-GB) and often `time` (ms). */
export const parseRecordDate = (dateStr, time) => {
  const t = Number(time);
  if (Number.isFinite(t) && t > 0) return t;
  const [d, m, y] = String(dateStr || '').split('/').map(Number);
  if (d && m && y) return new Date(y, m - 1, d, 12).getTime();
  const parsed = Date.parse(dateStr);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const formatDateTime = (ms) => {
  if (!ms) return '—';
  return new Date(ms).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
};

/* ── Transaction history ───────────────────────────────────────────────── */

const BANK_WORDS = ['bank', 'city', 'brac', 'brack', 'dbbl', 'dutch', 'islami', 'ebl', 'ucb', 'prime', 'eastern'];

/* direct = bKash gateway · bank = bank transfer · manual = bKash/Nagad/Rocket
   slip · cash = recorded by Paicart in person */
export const classifyMethod = (method) => {
  const m = lower(method);
  if (m.includes('cash')) return 'cash';
  if (BANK_WORDS.some((w) => m.includes(w))) return 'bank';
  return 'manual';
};

const METHOD_TYPE_LABEL = {
  direct: 'bKash Direct',
  bank: 'Bank Transfer',
  manual: 'Manual bKash',
  cash: 'Cash received by Paicart',
};
export const TXN_TYPE_LABELS = METHOD_TYPE_LABEL;

const labelFor = (type, method) => {
  if (type === 'direct') return 'bKash Direct';
  if (type === 'cash') return 'Cash received by Paicart';
  if (type === 'bank') return method && lower(method) !== 'bank' ? `Bank Transfer · ${method}` : 'Bank Transfer';
  return method ? `Manual ${method}` : 'Manual payment';
};

const KIND_LABEL = { order: 'Website Order', request: 'Requested Product', ship: 'Ship for me' };

const hrefFor = (kind, id) => (
  kind === 'order' ? `/pages/dashboard/buy-and-ship-for-me/my-orders/${id}`
    : kind === 'request' ? `/pages/dashboard/buy-and-ship-for-me/my-request/${id}`
      : `/pages/dashboard/ship-for-me/my-request/${id}`
);
const listHrefFor = (kind) => (
  kind === 'order' ? '/pages/dashboard/buy-and-ship-for-me/my-orders'
    : kind === 'request' ? '/pages/dashboard/buy-and-ship-for-me/my-request'
      : '/pages/dashboard/ship-for-me/my-request'
);

const requestStatus = (s) => {
  const v = lower(s);
  if (v === 'approved' || v === 'paid') return 'approved';
  if (v.startsWith('reject')) return 'rejected';
  return 'pending';
};

/* Builds one list from two sources:
 *  1. Payment slips the customer uploaded (pending / approved / rejected).
 *  2. Payments recorded straight on an order / request / shipment that no
 *     slip accounts for: bKash gateway payments (grouped by TrxID) and
 *     payments Paicart recorded in person (cash, or an offline transfer).
 * Approving a slip also writes a payment line onto the record, so those
 * lines are matched back to their slip and not listed twice. */
export const buildTransactions = ({ paymentRequests = [], orders = [], requests = [], shipments = [] }) => {
  const txns = [];
  const fromSlipKeys = new Set();

  paymentRequests.forEach((r) => {
    const kind = r._collection === 'paymentRequest' ? 'ship' : r.productRequest ? 'request' : 'order';
    const items = (r.pendingOrders && r.pendingOrders.length ? r.pendingOrders : r.productRequestArray) || [];
    const ids = items.map((i) => i && (i.orderId || i.bookingId)).filter(Boolean).map(String);
    const status = requestStatus(r.status);
    const type = classifyMethod(r.method);
    const amount = toInt(r.payableTotal || r.amount);
    if (status === 'approved') ids.forEach((id) => fromSlipKeys.add(`${kind}|${id}|${r.date}|${lower(r.method)}`));
    txns.push({
      key: `slip-${r._collection}-${r._id}`,
      id: `PAY-${r.paymentId || r._id}`,
      reference: String(r.paymentId || r._id),
      type,
      methodLabel: labelFor(type, r.method),
      amount,
      status,
      time: parseRecordDate(r.date, r.time),
      kind,
      ids,
      invoice: `${KIND_LABEL[kind]} · ${ids.join(', ') || '—'}`,
      href: ids.length === 1 ? hrefFor(kind, ids[0]) : listHrefFor(kind),
      listHref: listHrefFor(kind),
      slipUrl: r.imageUrl || '',
      note: status === 'rejected'
        ? 'This payment slip could not be verified. Please upload a clear slip with the correct transaction ID.'
        : status === 'pending'
          ? 'Your payment slip is waiting for verification.'
          : 'Payment slip verified by Paicart.',
    });
  });

  const gateway = new Map();
  const scan = (records, kind, idOf, billOf) => {
    records.forEach((rec) => {
      const id = String(idOf(rec) || '');
      const payments = (rec.payments || [])
        .map((p, index) => ({ ...p, _index: index, _time: parseRecordDate(p && p.date) }))
        .filter((p) => toInt(p.amount) > 0)
        .sort((a, b) => (a._time - b._time) || (a._index - b._index));
      const bill = billOf(rec);
      let runningPaid = 0;
      payments.forEach((p) => {
        const amount = toInt(p.amount);
        const dueBefore = Math.max(bill - runningPaid, 0);
        runningPaid += amount;

        const isGateway = p.receivedBy === 'Bkash-Gateway' || lower(p.approvedBy) === 'bkash-gateway' || (p.trxID && lower(p.method) === 'bkash');
        if (isGateway) {
          const k = p.trxID || `${kind}-${id}-${p.date}`;
          const g = gateway.get(k) || {
            key: `gw-${k}`, id: `BKD-${p.trxID || id}`, reference: p.trxID || '—', type: 'direct',
            methodLabel: 'bKash Direct', amount: 0, status: 'approved', time: p._time, kind, ids: [],
            note: 'Gateway payment confirmed automatically.',
          };
          g.amount += amount;
          g.ids.push(id);
          gateway.set(k, g);
          return;
        }
        const fromSlip = kind === 'ship'
          ? lower(p.approvedBy) === 'admin' && lower(p.paidBy) !== 'admin'
          : fromSlipKeys.has(`${kind}|${id}|${p.date}|${lower(p.method)}`);
        if (fromSlip) return;

        const type = classifyMethod(p.method);
        txns.push({
          key: `rec-${kind}-${id}-${p._index}`,
          id: `${type === 'cash' ? 'CSH' : 'REC'}-${id}-${p._index + 1}`,
          reference: `${id}-${p._index + 1}`,
          type,
          methodLabel: type === 'cash' ? 'Cash received by Paicart' : `${labelFor(type, p.method)} · recorded by Paicart`,
          amount,
          status: 'approved',
          time: p._time,
          kind,
          ids: [id],
          invoice: `${KIND_LABEL[kind]} · ${id}`,
          href: hrefFor(kind, id),
          recorded: true,
          receivedBy: p.receivedBy || p.approvedBy || 'Paicart',
          dueBefore,
          dueAfter: Math.max(dueBefore - amount, 0),
          note: 'Recorded by Paicart and adjusted against the invoice balance.',
        });
      });
    });
  };
  scan(orders, 'order', (o) => o.orderId, orderBill);
  scan(requests, 'request', (b) => b.bookingId, requestBill);
  scan(shipments, 'ship', (s) => s.bookingId, shipmentBill);

  gateway.forEach((g) => {
    const ids = Array.from(new Set(g.ids));
    txns.push({
      ...g,
      ids,
      invoice: `${KIND_LABEL[g.kind]} · ${ids.join(', ')}`,
      href: ids.length === 1 ? hrefFor(g.kind, ids[0]) : listHrefFor(g.kind),
    });
  });

  return txns.sort((a, b) => (b.time || 0) - (a.time || 0));
};

/* ── Pathao home delivery ──────────────────────────────────────────────── */

export const PATHAO_STAGES = [
  { key: 'pickup_requested', label: 'Pickup Requested' },
  { key: 'rider_assigned', label: 'Rider Assigned' },
  { key: 'picked_from_paicart', label: 'Picked from Paicart' },
  { key: 'in_transit', label: 'In Transit' },
  { key: 'ready_for_delivery', label: 'Ready for Delivery' },
  { key: 'delivered', label: 'Delivered' },
];
export const PATHAO_STATUS_LABEL = {
  pickup_requested: 'Pathao pickup requested',
  rider_assigned: 'Rider assigned',
  picked_from_paicart: 'Picked parcel from Paicart',
  in_transit: 'In Transit',
  ready_for_delivery: 'Ready for Delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  returned: 'Returned',
};

/* Pathao's order_status strings (Pending, Pickup_Requested,
   Assigned_for_Pickup, Picked, In_Transit, At_the_Sorting_HUB,
   Assigned_for_Delivery, Delivered, Cancelled, Return …) → our 8 states. */
export const normalizePathaoStatus = (raw) => {
  const s = lower(raw).replace(/[\s-]+/g, '_');
  if (!s || s === 'pending' || s.includes('pickup_request')) return 'pickup_requested';
  if (s.includes('cancel')) return 'cancelled';
  if (s.includes('return')) return 'returned';
  if (s.includes('deliver') && !s.includes('assigned') && !s.includes('for_delivery')) return 'delivered';
  if (s.includes('for_delivery') || s.includes('last_mile') || s.includes('out_for')) return 'ready_for_delivery';
  if (s.includes('transit') || s.includes('hub') || s.includes('sorting')) return 'in_transit';
  if (s.includes('picked')) return 'picked_from_paicart';
  if (s.includes('assign')) return 'rider_assigned';
  return 'pickup_requested';
};

const firstOrderItem = (o) => {
  const item = (o.items || [])[0] || {};
  const sku = (item.skus || [])[0] || {};
  return {
    title: item.name || o.shopName || 'Website order',
    image: sku.image || item.picture || '',
    qty: (o.items || []).reduce((a, it) => a + (it.skus || []).reduce((b, s) => b + toInt(s.totalQuantity), 0), 0),
  };
};

export const buildHomeDeliveries = (orders = [], requests = [], shipments = []) => {
  const rows = [];
  const push = (kind, rec, id, info, due) => {
    const b = rec.pathaoBooking;
    if (!b || !b.consignmentId) return;
    rows.push({
      kind,
      id: String(id),
      href: hrefFor(kind, id),
      title: info.title,
      image: info.image,
      qty: info.qty,
      consignmentId: String(b.consignmentId),
      status: normalizePathaoStatus(b.orderStatus),
      rawStatus: b.orderStatus || 'Pending',
      deliveryFee: b.deliveryFee != null ? toInt(b.deliveryFee) : null,
      amountToCollect: toInt(b.amountToCollect),
      recipientPhone: b.recipientPhone || '',
      bookedAt: b.bookedAt ? Date.parse(b.bookedAt) : parseRecordDate(b.bookedDate),
      productDue: Math.max(due, 0),
    });
  };
  orders.forEach((o) => push('order', o, o.orderId, firstOrderItem(o), getOrderDue(o)));
  requests.forEach((r) => push('request', r, r.bookingId, {
    title: r.productType || r.othersProductName || 'Requested product', image: r.imageUrl || '', qty: toInt(r.productQuantity),
  }, requestDue(r)));
  shipments.forEach((s) => push('ship', s, s.bookingId, {
    title: s.othersProductName || 'Shipment', image: s.imageUrl || '', qty: toInt(s.productQuantity),
  }, shipmentDue(s)));
  return rows.sort((a, b) => (b.bookedAt || 0) - (a.bookedAt || 0));
};

/* ── Recent activity ───────────────────────────────────────────────────── */

const newest = (list) => [...list].sort((a, b) => (b.time || 0) - (a.time || 0));

/* Newest order that is still moving; falls back to the newest of all. */
export const recentActiveOrder = (orders) => {
  const sorted = newest(orders);
  return sorted.find((o) => !['Delivered', 'Rejected', 'Refunded'].includes(getOrderBucket(o))) || sorted[0] || null;
};
export const recentActiveShipment = (shipments) => {
  const sorted = newest(shipments);
  return sorted.find((s) => !['Delivered', 'Rejected'].includes(getShipBucket(s))) || sorted[0] || null;
};
export { firstOrderItem };
