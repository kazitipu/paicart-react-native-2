/* ─── Ship For Me domain ───
 *
 * Extracted from the web's 1,026-line `_shared.jsx`, which lived inside a
 * ROUTE folder that components then imported upward from. The pure rules land
 * here; the UI pieces became real components.
 */
import { READY_STATUS, READY_SEA_LABEL } from './shipment';

export function getTotal(booking) {
  let total = 0;
  booking?.payments?.forEach((p) => {
    total += parseInt(p.amount, 10) || 0;
  });
  return total;
}

/* D2D rate lookup. Note this is a DIFFERENT table from the 1688 category
   rates in lib/freight.js: those price goods bought through the site, these
   price a parcel the customer shipped to our China warehouse themselves.
   Air's 0–0.3kg band is again a flat parcel charge; `perKg` there is a display
   figure only (parcel × 3.333333), not a rate anything is billed at. */
export function calcRate(weight, productType, d2dRates, method) {
  const selected = (d2dRates || []).find((r) => r.id === productType);
  if (!selected) return null;
  const w = parseFloat(weight);
  if (!Number.isFinite(w)) return null;

  if (method === 'sea') {
    if (w <= 100) return { result: Math.round(w * selected['100kg']), perKg: selected['100kg'] };
    if (w <= 1000)
      return { result: Math.round(w * selected.below_1000kg), perKg: selected.below_1000kg };
    return { result: Math.round(w * selected.above_1000kg), perKg: selected.above_1000kg };
  }

  if (w <= 0.3) return { result: selected.parcel, perKg: Math.round(selected.parcel * 3.333333) };
  if (w <= 10) return { result: Math.round(w * selected.ten), perKg: selected.ten };
  return { result: Math.round(w * selected.eleven), perKg: selected.eleven };
}

/* Whether a shipment can be paid right now: an invoice has been raised, no
   payment request is already under review, it is not already paid, and it is
   neither still Pending nor Rejected. Lives here so the list screen, the
   detail screen and the selection checkboxes cannot drift apart on the rule. */
export const canPayShipment = (req) => {
  if (!req) return false;
  return (
    !!req.shippingChargeCustomer &&
    !req.paymentRequested &&
    req.paymentStatus !== 'Paid' &&
    req.status !== 'Pending' &&
    req.status !== 'Reject'
  );
};

export const STEPS = [
  'Pending',
  'Approved',
  'Abroad Warehouse',
  READY_STATUS,
  '🇧🇩 Bangladesh customs',
  'Paicart warehouse',
  'Delivered',
];

/* The fourth milestone is the only one whose wording depends on freight mode —
   the parcel is loaded onto a plane or onto a vessel. Its STORED status value
   stays READY_STATUS either way; only the label swaps. */
export const READY_STEP_INDEX = 3;

export const stepsFor = (isSea) =>
  isSea ? STEPS.map((s, i) => (i === READY_STEP_INDEX ? READY_SEA_LABEL : s)) : STEPS;

/* Shipment progress is stored as a 1-based score. */
export const stepIndexFor = (score) => Math.max(0, Math.min(STEPS.length - 1, (parseInt(score, 10) || 1) - 1));
