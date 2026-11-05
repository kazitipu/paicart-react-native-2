/* ─── "Buy For Me" product-request bill maths ───
 *
 * Verbatim port of the helpers declared at the top of the web's
 * app/pages/dashboard/buy-and-ship-for-me/my-request/page.jsx (getSingleShopTotal,
 * getTotalPaid, getTotalDue, canPayBooking). A product request is one product
 * with a unit price and quantity, not an order's shops/items/skus tree, so it
 * has its own maths — lib/orderMath does not apply to it.
 *
 * BookingPaymentModal and the My Requests combined-pay selection both use
 * these, so the due amount in the sheet is the web's figure.
 */
import { isRefundGiven } from './buckets';

export function getSingleShopTotal(booking) {
  return booking.unitPrice
    ? parseInt(booking.unitPrice) * (parseInt(booking.productQuantity) || 1)
    : 0;
}

export function getTotalPaid(booking) {
  return (booking.payments || []).reduce((s, p) => s + (parseInt(p.amount) || 0), 0);
}

export function getTotalDue(booking) {
  const paid = getTotalPaid(booking);
  const base = booking.actualTotal ? parseInt(booking.actualTotal) : getSingleShopTotal(booking);
  const charge = parseInt(booking.shippingChargeCustomer) || 0;
  const localShip = parseInt(booking.localShipping) || 0;
  const other = parseInt(booking.otherCost) || 0;
  const disc = parseInt(booking.discount) || 0;
  const coupon = parseInt(booking.couponAmount) || 0;
  const offerAmt =
    parseInt(booking.offer) > 0 && parseInt(booking.actualTotalAfterCoupon) > 0
      ? Math.round(parseInt(booking.actualTotalAfterCoupon) * (parseInt(booking.offer) / 100))
      : 0;
  return base + charge + localShip + other - disc - coupon - offerAmt - paid;
}

export function canPayBooking(booking) {
  const os = booking.orderStatus || booking.status || '';
  /* Once a refund is given the request is finished — nothing more is owed */
  return (
    os !== 'Pending' &&
    os !== 'Reject' &&
    !isRefundGiven(booking) &&
    booking.paymentStatus !== 'pending' &&
    booking.paymentStatus !== 'Paid' &&
    getTotalDue(booking) > 0
  );
}
