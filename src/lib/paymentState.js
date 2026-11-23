/* The payment state a customer sees, worked out the same way the admin panel
 * does (paicart-backend2 constants/paymentMath.js getDisplayPaymentState):
 * from the recorded payments against the bill, not the stored
 * `paymentStatus` field.
 *
 * The stored field is deliberately left at "Partially Paid" when a payment is
 * approved before the shipping charge is known (so the customer can still pay
 * that later), which made the customer app say "Partial" while the admin said
 * "Paid" for the same fully-settled bill.
 *
 * A request still waiting for admin review wins, so the customer sees that
 * their screenshot is being checked. */
const sumPaid = (record) =>
  ((record && record.payments) || []).reduce((a, p) => a + (parseInt(p && p.amount) || 0), 0);

export const derivePaymentState = (record, due) => {
  if (!record) return 'Not Paid';
  if (record.paymentStatus === 'pending' || record.paymentRequested) return 'pending';
  const paid = sumPaid(record);
  if (paid <= 0) return 'Not Paid';
  return due > 0 ? 'Partially Paid' : 'Paid';
};

/* Ship For Me bill: the actual charge once weighed, else the booking estimate
   (admin getShipmentPayable). */
export const shipmentDue = (req) => {
  const actual = parseInt(req && req.shippingChargeCustomer) || 0;
  const payable = actual > 0 ? actual : parseFloat(req && req.result && req.result.result) || 0;
  return Math.round(payable) - sumPaid(req);
};
