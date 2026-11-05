/* Refund state for the dashboard Refunds screen — web
 * pages/dashboard/refund/page.jsx, verbatim. The same fields the admin panel
 * writes on ordersApi / bookingRequest / shipForMe docs:
 *   refundStatus ('requested' | 'given' | 'rejected'), refund (amount),
 *   refundNote (reason).
 * Shipments may only carry refundClaimRequested / refundClaimNote until an
 * admin processes them. No Firestore reads of its own: the screen uses the
 * three per-user list actions the web page dispatches. */

export const getRefundState = (item) => {
  if (item.refundStatus === 'rejected') return 'rejected';
  if (item.refundStatus === 'given' || parseFloat(item.refund) > 0) return 'given';
  return 'requested';
};

export const hasRefundActivity = (item) =>
  !!item?.refundStatus || parseFloat(item?.refund) > 0 || !!item?.refundClaimRequested;
