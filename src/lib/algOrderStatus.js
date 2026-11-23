/* COPY of paicart-nextjs15/src/lib/algOrderStatus.js — change it there, then copy here. */
/* Website (1688) order status from ALG's lot tracking.
 *
 * After an order is Purchased, the parcel goes to ALG's China warehouse and
 * travels with an ALG lot. ALG's API (orderTracking-alg/<trackingNo>) reports
 * the lot's stage; this maps it onto our pipeline so orders move forward on
 * their own from "Received in Warehouse" (China warehouse) up to "Custom
 * released" (stored "Bangladesh warehouse"). Paicart warehouse and Delivered
 * stay manual.
 *
 * Same for product requests and Ship For Me bookings (see ALG_KINDS).
 *
 * SINGLE SOURCE OF TRUTH, plain dependency-free JS, used by:
 *   - functions/ (scheduled job; firebase.json predeploy copies this file)
 *   - paicart-backend2/src/constants/algOrderStatus.js (copy — admin sync)
 *
 * ALG lot: { shipmentStatus, shipmentStatusScore, abroadWarehouseDate,
 *   abroadCustomsDate, readyToFlyDate, bangladeshCustomsDate,
 *   localWarehouseDate, shipmentDate } — dates like "10/12/2026 (11:35:20 AM)"
 *   (month/day/year). Parcel: { dateofWarehouseReceive: "10/12/2026" }.
 */

/* our stages in order; Custom released sits after BD customs */
export const ALG_STAGES = [
  'Received in Warehouse',
  'Ready for fly',
  'Bangladesh customs',
  'Bangladesh warehouse',
];
const RANK = {
  pending: 0,
  Purchased: 1,
  'Received in Warehouse': 2,
  'Ready for fly': 3,
  'Bangladesh customs': 4,
  'Bangladesh warehouse': 5,
  'Paicart warehouse': 6,
  Delivered: 7,
};
/* shipmentStatusScore our app stores per status (same as the admin modal) */
export const STATUS_SCORE = {
  'Received in Warehouse': 3,
  'Ready for fly': 4,
  'Bangladesh customs': 5,
  'Bangladesh warehouse': 5,
};
/* Per record type: which field holds the status, and which statuses get
   moved automatically. Website orders and product requests only once they're
   bought (Purchased); a Ship For Me parcel is sent to ALG by the customer, so
   it moves from Pending / Rates Provided as soon as ALG has received it. */
export const ALG_KINDS = {
  order: {
    collection: 'ordersApi', field: 'orderStatus',
    from: ['Purchased', 'Received in Warehouse', 'Ready for fly', 'Bangladesh customs'],
  },
  request: {
    collection: 'bookingRequest', field: 'orderStatus',
    from: ['Purchased', 'Received in Warehouse', 'Ready for fly', 'Bangladesh customs'],
  },
  ship: {
    collection: 'shipForMe', field: 'status',
    from: ['Pending', 'Rates Provided', 'Received in Warehouse', 'Ready for fly', 'Bangladesh customs'],
  },
};
RANK.Pending = 0;
RANK['Rates Provided'] = 0.5;

/* ALG lot → index into ALG_STAGES, or -1 if the lot tells us nothing */
const lotStageIndex = (lot) => {
  if (!lot) return -1;
  const name = String(lot.shipmentStatus || '').toLowerCase();
  if (name.includes('local warehouse') || name.includes('bangladesh warehouse') || name.includes('released')) return 3;
  if (name.includes('bangladesh customs')) return 2;
  if (name.includes('abroad customs') || name.includes('ready')) return 1;
  if (name.includes('abroad warehouse')) return 0;
  const score = parseInt(lot.shipmentStatusScore, 10);
  if (score >= 5) return 3;
  if (score === 4) return 2;
  if (score === 2 || score === 3) return 1;
  if (score === 1) return 0;
  return -1;
};

/* ALG's month/day/year (optionally " (11:35:20 AM)") or ISO → our en-GB
   { date: "dd/mm/yyyy", time: "HH:MM:SS" }; null if unreadable */
export const parseAlgDate = (raw) => {
  const s = String(raw || '').trim();
  if (!s) return null;
  let y; let m; let d;
  let iso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  let us = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (iso) { y = +iso[1]; m = +iso[2]; d = +iso[3]; }
  else if (us) { m = +us[1]; d = +us[2]; y = +us[3]; }
  else return null;
  if (!y || !m || !d || m > 12 || d > 31) return null;
  let time = '';
  const t = s.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?/i);
  if (t) {
    let h = +t[1];
    if (t[4]) {
      const pm = t[4].toUpperCase() === 'PM';
      if (pm && h < 12) h += 12;
      if (!pm && h === 12) h = 0;
    }
    time = `${String(h).padStart(2, '0')}:${t[2]}:${t[3] || '00'}`;
  }
  return { date: `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`, time };
};

/* When ALG says each of our stages happened, for one tracking number */
const stageDates = (lot, parcels) => {
  const l = lot || {};
  const firstParcel = (parcels || []).find((p) => p && p.dateofWarehouseReceive);
  return {
    /* the parcel's own receive date first — ALG's lot-level abroadWarehouseDate
       is often stale (2021/2025 dates seen on 2026 lots) */
    'Received in Warehouse': parseAlgDate(firstParcel && firstParcel.dateofWarehouseReceive) || parseAlgDate(l.abroadWarehouseDate),
    'Ready for fly': parseAlgDate(l.readyToFlyDate) || parseAlgDate(l.abroadCustomsDate) || parseAlgDate(l.shipmentDate),
    'Bangladesh customs': parseAlgDate(l.bangladeshCustomsDate),
    'Bangladesh warehouse': parseAlgDate(l.localWarehouseDate),
  };
};

/* A tracking number typed as a stand-in ("123456", "0", "00000", "test")
   matches parcels of many customers on ALG; its lot says nothing about this
   order. Same rule as the admin's constants/cartons.js. */
const PLACEHOLDER_WORDS = ['test', 'na', 'n/a', 'none', 'null', 'undefined', 'nil', 'tbd', 'pending'];
export const isPlaceholderTracking = (value) => {
  const t = String(value == null ? '' : value).trim().toLowerCase();
  if (t.length < 5 || PLACEHOLDER_WORDS.includes(t) || /^(.)\1+$/.test(t)) return true;
  if (/^\d+$/.test(t)) {
    const d = t.split('').map(Number);
    if (d.every((v, i) => i === 0 || v === (d[i - 1] + 1) % 10)) return true;
    if (d.every((v, i) => i === 0 || v === (d[i - 1] + 9) % 10)) return true;
  }
  return false;
};

/* An answer spanning many shipping marks / lots is a shared number */
const isSharedAnswer = (parcels) => {
  const marks = new Set(parcels.map((p) => String(p.shippingMark || '').trim().toLowerCase()).filter(Boolean));
  const lots = new Set(parcels.map((p) => String(p.lotNo || '').trim().toLowerCase()).filter(Boolean));
  return marks.size > 3 || lots.size > 5;
};

/* One tracking number's ALG answer → its stage index (-1 = nothing yet) */
export const algStageOf = (alg) => {
  if (!alg) return -1;
  const parcels = alg.parcelsArray || alg.parcels || [];
  if (isSharedAnswer(parcels)) return -1;
  const idx = lotStageIndex(alg.lotObj || alg.lot);
  /* cartons on file at ALG mean it's at least in the China warehouse */
  return Math.max(idx, parcels.length ? 0 : -1);
};

/* The fields to write on an order, or null.
 *   order        the ordersApi document
 *   algByNo      { [trackingNo]: raw ALG response ({ lotObj, parcelsArray }) or null }
 * Forward-only; the order moves only as far as its slowest tracked parcel. */
export const algStatusPatch = (record, algByNo, kind = 'order', now = new Date()) => {
  const cfg = ALG_KINDS[kind] || ALG_KINDS.order;
  const current = record && (record[cfg.field] || (kind === 'ship' ? 'Pending' : ''));
  if (!record || !cfg.from.includes(current)) return null;
  const order = record;
  const found = Object.values(algByNo || {}).filter((a) => algStageOf(a) >= 0);
  if (!found.length) return null;
  const idx = Math.min(...found.map(algStageOf));
  const target = ALG_STAGES[idx];
  if (!target || RANK[target] <= (RANK[current] || 0)) return null;

  const patch = {
    [cfg.field]: target,
    shipmentStatusScore: STATUS_SCORE[target],
    statusSource: 'alg',
    statusSyncedAt: now.getTime(),
  };
  /* stamp every stage reached (incl. ones skipped over) that has no date yet,
     with ALG's own date for it when it has one */
  const dates = stageDates(found[0].lotObj || found[0].lot, found[0].parcelsArray || found[0].parcels);
  ALG_STAGES.slice(0, idx + 1).forEach((stage) => {
    if (order[`${stage}Date`]) return;
    const when = dates[stage];
    patch[`${stage}Date`] = when ? when.date : now.toLocaleDateString('en-GB');
    patch[`${stage}Time`] = when && when.time ? when.time : now.toLocaleTimeString('en-GB');
  });
  return patch;
};

/* website orders (kept for existing callers) */
export const algOrderStatusPatch = (order, algByNo, now = new Date()) =>
  algStatusPatch(order, algByNo, 'order', now);

/* true when ALG has received at least one of the record's parcels — used by
   the Ship For Me auto-reject so a parcel that did arrive is never rejected */
export const algHasReceived = (algByNo) =>
  Object.values(algByNo || {}).some((a) => algStageOf(a) >= 0);

/* Tracking numbers of an order (array, else the comma-joined string) */
export const orderTrackingNumbers = (order) => {
  const list = Array.isArray(order && order.trackingNumbers) && order.trackingNumbers.length
    ? order.trackingNumbers
    : String((order && order.trackingNo) || '').split(/[,\n]/);
  return Array.from(new Set(list.map((t) => String(t || '').trim()).filter((t) => t && !isPlaceholderTracking(t))));
};
