/* When a customer may apply for a refund, and which of the admin's two
 * queues the request belongs in. Shared by the 1688 order screens and the
 * product-request screens so the four entry points cannot drift apart.
 *
 * The admin splits `refundRequest` by the `quickRefund` boolean — see the
 * note at the top of RefundApplyModal.jsx.
 */

/* Works for both shapes: orders carry `orderStatus`, product requests carry
 * `status`, and both carry `shipmentStatusScore` (7 = delivered). */
export const isDeliveredRecord = (r) =>
  parseInt(r?.shipmentStatusScore || 1) >= 7 ||
  String(r?.orderStatus || r?.status || '').toLowerCase() === 'delivered';

/* Before the parcel ships it is a Quick Refund; once it is delivered the
 * claim is an After Sale one. Nothing in between: while a parcel is in
 * transit there is no amount to argue about yet. */
export const refundMode = (r) => (isDeliveredRecord(r) ? 'afterSale' : 'quick');

/* Return & Refund Policy: after-sale claims must be made within 72 hours of
 * delivery. Every refund entry point (orders, product requests, ship-for-me)
 * reads the deadline from here. */
export const REFUND_WINDOW_HOURS = 72;

/* The admin stamps delivery as `DeliveredDate` "dd/mm/yyyy" plus
 * `DeliveredTime` "HH:MM:SS" (en-GB, local time). null when not stamped. */
export const getDeliveredAt = (r) => {
  const [d, m, y] = String(r?.DeliveredDate || '').split('/').map(Number);
  if (!d || !m || !y) return null;
  const [hh = 0, mm = 0, ss = 0] = String(r?.DeliveredTime || '').split(':').map((n) => Number(n) || 0);
  return new Date(y, m - 1, d, hh, mm, ss).getTime();
};

/* When the after-sale window closes, or null if the delivery time is unknown
 * (then nothing is blocked — a missing stamp is not the customer's fault). */
export const refundDeadline = (r) => {
  const at = getDeliveredAt(r);
  return at === null ? null : at + REFUND_WINDOW_HOURS * 60 * 60 * 1000;
};

/* Still in the To Ship stage: nothing has moved past the seller yet. Same
 * boundaries getOrderBucket / getRequestBucket draw around To Ship — a
 * tracking number, the China warehouse (score 3+), or a weight/invoice all
 * mean the parcel is already on its way. */
const notShippedYet = (r) =>
  !r.trackingNo &&
  (parseInt(r.shipmentStatusScore) || 1) < 3 &&
  !r.receivedWeight &&
  !(parseInt(r.shippingChargeCustomer) > 0);

/* Money must actually have been taken, no refund may already be on file, and
 * the record has to be at one of the two ends of its life — To Ship (Quick
 * Refund), or delivered and still inside the 72-hour window (After Sale). */
export const canApplyRefund = (r) => {
  if (!r) return false;
  const pay = String(r.paymentStatus || '');
  if (pay !== 'Paid' && pay !== 'Partially Paid') return false;
  if (r.refundStatus) return false;
  if (isDeliveredRecord(r)) {
    const deadline = refundDeadline(r);
    return deadline === null || Date.now() <= deadline;
  }
  return notShippedYet(r);
};

/* Whether to render the refund section at all — either there is something to
 * report, or something to apply for. */
export const showRefundBlock = (r) => {
  if (!r) return false;
  const pay = String(r.paymentStatus || '');
  if (pay !== 'Paid' && pay !== 'Partially Paid') return false;
  return !!r.refundStatus || canApplyRefund(r);
};

/* After a refund is given, Pay Now gives way to a way to order again. Buy
 * Again opens the product page (today's price and stock, never the old
 * order's), Book Again opens the Buy For Me form pre-filled from the old
 * request. null when there is nothing to reorder from. */
export const buyAgainProductId = (order) => order?.items?.[0]?.id ?? null;
export const bookAgainId = (request) => request?.bookingId ?? null;

/* What was actually refunded, as entered by the admin on approval (`refund`
 * on the record). 0 when nothing has been recorded. */
export const refundedAmount = (r) => {
  const n = parseFloat(r?.refund);
  return n > 0 ? Math.round(n) : 0;
};
