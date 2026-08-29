import React from 'react';
import SoftPill from './SoftPill';
import { READY_STATUS, READY_SEA_LABEL, isSeaShipment } from '@/lib/shipment';

/* `READY_STATUS` ('Ready for fly') is a literal value written by the admin
   panel — the key must not be renamed, only what the customer reads changes,
   because a sea parcel is loaded onto a vessel rather than flown. */
export const STATUS_BADGE = {
  Pending: { color: 'orange', label: 'Booking Confirmed' },
  'Rates Provided': { color: 'blue', label: 'Rates Provided' },
  'Abroad Warehouse': { color: 'violet', label: 'Abroad Warehouse' },
  [READY_STATUS]: { color: 'sky', label: READY_STATUS },
  'Bangladesh customs': { color: 'amber', label: '🇧🇩 BD Customs' },
  'Paicart warehouse': { color: 'teal', label: 'Paicart WH' },
  Delivered: { color: 'emerald', label: 'Delivered' },
  Reject: { color: 'red', label: 'Rejected' },
  Cancelled: { color: 'red', label: 'Cancelled' },
};

export function StatusBadge({ status, req }) {
  const s = STATUS_BADGE[status] || { color: 'orange', label: status || 'Pending' };
  const label =
    status === READY_STATUS && isSeaShipment(req) ? READY_SEA_LABEL : s.label;
  return (
    <SoftPill color={s.color} className="px-2 py-0.5">
      {label}
    </SoftPill>
  );
}

export function PaymentBadge({ status }) {
  const val = status || 'Not Paid';
  if (val === 'Paid') return <SoftPill color="emerald">✓ Paid</SoftPill>;
  if (val === 'Partially Paid') return <SoftPill color="amber">◑ Partial</SoftPill>;
  return <SoftPill color="gray">✕ Unpaid</SoftPill>;
}

export default StatusBadge;
