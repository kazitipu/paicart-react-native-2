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
   `refund`. Once a refund has been GIVEN the order is finished, whatever the
   amount: before delivery (Quick Refund) it leaves the pipeline for the
   Refunds tab; after delivery (After Sales) it stays Delivered. Either way
   nothing more is owed — the customer is offered Buy / Book Again instead
   of Pay Now. */
export const isRefundGiven = (r) => r?.refundStatus === 'given';

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
     Refunded    a Quick Refund was given (before delivery) — finished
     Rejected    payment timeout, or cancelled by user or admin

   The Refunds tab is deliberately not a bucket: it is a cross-cutting flag
   (`refundStatus`) an order carries while sitting in any bucket above. A
   pending or rejected request leaves the order in its stage; a given refund
   takes it out of the pipeline (Refunded, shown under All and Refunds), or
   leaves it in Delivered when the goods were already received. */
export const getOrderBucket = (order) => {
  const pay = (order?.paymentStatus || '').toLowerCase();
  const st = (order?.orderStatus || '').toLowerCase();
  const score = parseInt(order?.shipmentStatusScore) || 1;
  const delivered = score >= 7 || st === 'delivered';

  /* A Quick Refund moves the order straight to Refunds — even one the admin
     also rejected. Goods already received stay Delivered (After Sales). */
  if (isRefundGiven(order) && !delivered) return 'Refunded';
  if (st === 'reject') return 'Rejected';
  if (delivered) return 'Delivered';

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

/* Product requests ("Buy & Ship For Me" — bookingRequest) follow the 1688
   order pipeline, with two steps in front of it while the price is agreed:

     Pending     booked, waiting for the admin to quote
     Approved    admin quoted ("Rates Provided"), not paid yet — a payment
                 still awaiting admin approval stays here
     To Ship     payment approved (Paid / Partially Paid) — Quick Refund here
     In Shipment / To Receive / Delivered / Refunded / Rejected — exactly as
                 getOrderBucket

   Rates Provided and Purchased are both score 2, so the early steps key off
   the status and payment, not the score. */
export const getRequestBucket = (req) => {
  const pay = (req?.paymentStatus || '').toLowerCase();
  const st = (req?.orderStatus || req?.status || '').toLowerCase();
  const score = parseInt(req?.shipmentStatusScore) || 1;

  const delivered = score >= 7 || st === 'delivered';

  if (isRefundGiven(req) && !delivered) return 'Refunded';
  if (st === 'reject') return 'Rejected';
  if (delivered) return 'Delivered';
  if (score >= 6 || !!req?.receivedWeight || parseInt(req?.shippingChargeCustomer) > 0)
    return 'To Receive';
  if (req?.trackingNo || score >= 3) return 'In Shipment';
  if (pay === 'paid' || pay === 'partially paid' || st === 'purchased') return 'To Ship';
  if (st === 'rates provided') return 'Approved';
  return 'Pending';
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
