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

/* Money must actually have been taken, no refund may already be on file, and
 * the record has to be at one of the two ends of its life — not yet shipped,
 * or delivered. */
export const canApplyRefund = (r) => {
  if (!r) return false;
  const pay = String(r.paymentStatus || '');
  if (pay !== 'Paid' && pay !== 'Partially Paid') return false;
  if (r.refundStatus) return false;
  return isDeliveredRecord(r) || !r.trackingNo;
};

/* Whether to render the refund section at all — either there is something to
 * report, or something to apply for. */
export const showRefundBlock = (r) => {
  if (!r) return false;
  const pay = String(r.paymentStatus || '');
  if (pay !== 'Paid' && pay !== 'Partially Paid') return false;
  return !!r.refundStatus || canApplyRefund(r);
};
