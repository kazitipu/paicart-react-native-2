/* ── Which tab an order / ship-for-me request belongs in ──
 *
 * COPY of paicart-nextjs15/src/lib/buckets.js — that file is the source of
 * truth, shared with the Cloud Function (paicart-nextjs15/functions/) that
 * stores the result on every document as `bucket`. The dashboard counts read
 * that stored field, so if a rule changes, change it in the web repo,
 * redeploy the function, re-run its backfill, then copy the file here.
 */

/* Refunds are written by the admin panel onto the record itself:
   `refundStatus` 'requested' → 'given' | 'rejected', with the amount in
   `refund`. A refund is FULL when it gives back (nearly) everything paid —
   the 3% slack covers the 2.5% cancellation fee the policy deducts. */
const FULL_REFUND_SHARE = 0.97;

/* Same sum as orderMath.getTotalPaid */
const totalPaid = (r) =>
  (r?.payments || []).reduce((a, p) => a + (parseInt(p.amount) || 0), 0);

export const isFullyRefunded = (r) => {
  if (r?.refundStatus !== 'given') return false;
  const refunded = parseFloat(r.refund) || 0;
  return refunded > 0 && refunded >= totalPaid(r) * FULL_REFUND_SHARE;
};

/* ── Which tab an order belongs in ──
   One bucket per order, evaluated in priority order, so tabs can never
   overlap or leave an order homeless. Driven by the concrete fields that
   actually change during the journey rather than by score alone:

     To Pay      Not Paid, Pending Payment          (payment timeout → Rejected)
     To Ship     Paid / Partially Paid, until a tracking number exists
     In Shipment tracking number generated → CN warehouse → ready for
                 flight/vessel → on board → BD customs → customs released
                 (score 3–5 counts even if no tracking number was entered)
     To Receive  weight updated / invoice generated / payment due / received
     Delivered   delivered
     Refunded    fully refunded before delivery — nothing left to ship
     Rejected    payment timeout, or cancelled by user or admin

   The Refunds tab is deliberately not a bucket: it is a cross-cutting flag
   (`refundStatus`) an order carries while sitting in any bucket above. A
   pending request or a PARTIAL refund leaves the order in its stage (the
   remaining items still ship); only a full refund takes it out of the
   pipeline. Refunded orders show under All and Refunds only. */
export const getOrderBucket = (order) => {
  const pay = (order?.paymentStatus || '').toLowerCase();
  const st = (order?.orderStatus || '').toLowerCase();
  const score = parseInt(order?.shipmentStatusScore) || 1;

  if (st === 'reject') return 'Rejected';
  if (score >= 7 || st === 'delivered') return 'Delivered';

  /* Delivered wins above: goods the customer already has stay Delivered even
     if an after-sale refund later covers them in full. */
  if (isFullyRefunded(order)) return 'Refunded';

  /* The parcel is in Bangladesh and the final bill is being settled — weight
     taken, invoice raised, payment due or received against it. */
  if (score >= 6 || !!order?.receivedWeight || parseInt(order?.shippingChargeCustomer) > 0)
    return 'To Receive';

  /* A tracking number is the moment it stops being "waiting to ship" — and
     so is reaching the China warehouse (score 3), which admins sometimes mark
     without entering a tracking number. */
  if (order?.trackingNo || score >= 3) return 'In Shipment';

  if (pay === 'paid' || pay === 'partially paid') return 'To Ship';

  /* Not Paid and Pending Payment both sit here — a payment awaiting review is
     still money the customer has committed but the order has not banked. */
  return 'To Pay';
};

/* Ship-for-me requests, with the same one-bucket-per-document rule. Checked
   in priority order so a request is never in two tabs (a rejected request
   that once reached the warehouse is Rejected, not also In Shipment). */
export const getShipBucket = (req) => {
  const status = req?.status || '';
  const score  = parseInt(req?.shipmentStatusScore) || 1;

  if (status === 'Reject' || status === 'Cancelled') return 'Rejected';
  if (score >= 7 || status === 'Delivered') return 'Delivered';
  /* Landed in the Paicart warehouse — waiting for the customer to receive it. */
  if (score === 6) return 'To Receive';
  if (score >= 3) return 'In Shipment';
  if (status === 'Rates Provided') return 'Approved';
  return 'Pending';
};

export const ORDER_BUCKETS = ['To Pay', 'To Ship', 'In Shipment', 'To Receive', 'Delivered', 'Refunded', 'Rejected'];
export const SHIP_BUCKETS  = ['Pending', 'Approved', 'In Shipment', 'To Receive', 'Delivered', 'Rejected'];
