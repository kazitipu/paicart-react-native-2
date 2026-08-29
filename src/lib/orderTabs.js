/* ─── Order list tabs and the unpaid window ───
 *
 * Bucketing itself lives in orderMath.getOrderBucket() — the single source of
 * truth for which stage an order is in. This adds the two things the list
 * screens layer on top: the Refunds cross-cut, and the 72-hour auto-cancel.
 */
import { getOrderBucket } from './orderMath';

export const STATUS_TABS = [
  'All', 'To Pay', 'To Ship', 'In Shipment', 'To Receive', 'Delivered', 'Refunds', 'Rejected',
];

export const matchesTab = (order, tab) => {
  if (tab === 'All') return true;
  /* Refunds is a cross-cutting flag, not a stage — an order can be awaiting a
     refund while sitting in any other bucket. */
  if (tab === 'Refunds') return !!order.refundStatus;
  return getOrderBucket(order) === tab;
};

export const tabCounts = (orders) =>
  Object.fromEntries(
    STATUS_TABS.map((t) => [
      t,
      t === 'All' ? orders.length : orders.filter((o) => matchesTab(o, t)).length,
    ]),
  );

/* ── The 72-hour unpaid window ── */

export const UNPAID_WINDOW_MS = 72 * 60 * 60 * 1000;

export const isFullyUnpaid = (order) =>
  !order.paymentStatus || order.paymentStatus === 'purchaseLater';

export const unpaidDeadline = (order) => (order.time || 0) + UNPAID_WINDOW_MS;

export const isCancelled = (order) =>
  (order.orderStatus || '').toLowerCase() === 'reject';

/* Auto-cancelled for non-payment: kept on record and shown under Rejected
   rather than deleted, so the customer can see what happened and re-order. */
export const isAutoCancelled = (order) => isCancelled(order) && !!order.autoCancelled;

/* ⚠️ There is no server-side cron in this project. An order is only actually
   swept once a client loads the list with it still present — the same
   client-side sweep the web ran. It should become a Cloud Function; noted in
   MIGRATION.md. */
export const expiredUnpaidOrders = (orders, now = Date.now()) =>
  orders.filter((o) => isFullyUnpaid(o) && !isCancelled(o) && now > unpaidDeadline(o));

export const remainingMs = (order, now = Date.now()) =>
  Math.max(0, unpaidDeadline(order) - now);

export const formatCountdown = (ms) => {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};
