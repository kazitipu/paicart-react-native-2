export const getSingleShopTotal = (order) => {
  let total = 0;
  order.items?.forEach(item =>
    item.skus?.forEach(sku => {
      total += parseInt(parseFloat(sku.price || 0) * parseInt(sku.totalQuantity || 0));
    })
  );
  return total;
};

export const getTotalPaid = (order) => {
  if (!order.payments?.length) return 0;
  return order.payments.reduce((a, p) => a + parseInt(p.amount || 0), 0);
};

/* The "pay now %" bonus, as an amount. `offer` is a plain number (20) —
   parseFloat also copes with the legacy "20%" strings written before this was
   standardised. Without subtracting it the balance kept billing the full
   amount even though the customer was granted the discount. */
export const getOfferDiscount = (order) => {
  /* The amount granted at payment time is authoritative. Recomputing
     base × offer% ignores the offer's `maximumDiscountAmount` cap, so a capped
     discount was shown as its full uncapped value here while the payment
     modal (which applies the cap) showed the real, smaller figure. Only fall
     back to recomputing for older records that predate this field. */
  const stored = parseFloat(order?.offerDiscountAmount);
  if (Number.isFinite(stored) && stored > 0) return Math.round(stored);
  const pct = parseFloat(order?.offer) || 0;
  const base = parseInt(order?.actualTotalAfterCoupon) || 0;
  if (pct <= 0 || base <= 0) return 0;
  return Math.round(base * (pct / 100));
};

export const getTotalDue = (order) => {
  const totalPaid = getTotalPaid(order);
  const goods = order.orderTotal ? parseInt(order.orderTotal) : getSingleShopTotal(order);
  const offerAmt = getOfferDiscount(order);
  let totalBill;
  if (order.shippingChargeCustomer && parseInt(order.shippingChargeCustomer) !== 0) {
    totalBill = goods
      + parseInt(order.shippingChargeCustomer || 0)
      + parseInt(order.localShipping || 0)
      + parseInt(order.otherCost || 0)
      - parseInt(order.discount || 0);
  } else {
    totalBill = goods
      + parseInt(order.localShipping || 0)
      + parseInt(order.otherCost || 0)
      - parseInt(order.discount || 0);
  }
  return parseInt(totalBill) - offerAmt - totalPaid;
};

export const getGoodsTotal = (order) =>
  order.actualTotal ? parseInt(order.actualTotal)
  : (order.orderTotal ? parseInt(order.orderTotal) : getSingleShopTotal(order));

export const canPayOrder = (order) => {
  const isRejected = (order.orderStatus || '').toLowerCase() === 'reject';
  /* Once a refund is given the order is finished — nothing more is owed */
  return !isRejected
    && !isRefundGiven(order)
    && order.paymentStatus !== 'Paid'
    && order.paymentStatus !== 'pending'
    && getTotalDue(order) > 0;
};

/* Tab rules live in buckets.js (a copy of the web repo's, shared with the
   Cloud Function that stores each order's `bucket` for the dashboard). */
import { isRefundGiven } from './buckets';

export { getOrderBucket, isRefundGiven } from './buckets';
