/* ── Request Delivery (To Receive) ──────────────────────────────────────
 *
 * Once a website order, product request or Ship For Me parcel reaches
 * To Receive (it is in Bangladesh), the customer picks how they want it:
 *
 *   office_pickup  Office Pickup        collect from the Paicart warehouse
 *   van_truck      Van / Truck          inside Dhaka — bulk or heavy cargo
 *   pathao         Home Delivery        Pathao courier
 *   sundorbon      Sundorbon Express    outside Dhaka — nationwide
 *
 * Van / Truck and Sundorbon hand the goods to a third party with no cash
 * collection, so they need the invoice 100% paid. Office Pickup and Pathao
 * (which can collect the due on delivery) are always available.
 *
 * Stored on the record itself as `deliveryRequest`:
 *   { method, label, status, requestedAt (ms), requestedDate (dd/mm/yyyy),
 *     fullyPaid, dueAtRequest, note, requestedBy,
 *     source: 'customer' | 'admin', enteredBy (admin name),
 *     address: the customer's default shipping address at request time,
 *     groupId / groupSize: set when several records were requested together }
 * A customer can't pick Van / Truck or Sundorbon unless every record in the
 * request is fully paid; Paicart staff (source 'admin') may override.
 * status: 'requested' → set by Paicart: 'arranged' | 'delivered' |
 *   'cancelled' (shown as Rejected — only then can it be requested again).
 * A Pathao booking made by Paicart lives in `pathaoBooking` (consignmentId).
 *
 * SAME FILE in paicart-nextjs15 and paicart-react-native (src/lib/) — keep
 * them identical. */
import { getOrderBucket, getRequestBucket, getShipBucket } from './buckets';
import { getTotalDue } from './orderMath';
import { requestDue, shipmentBill, shipmentDue } from './dashboardData';

export const DELIVERY_METHODS = [
  {
    key: 'office_pickup',
    label: 'Office Pickup',
    hint: 'Collect from the Paicart warehouse',
    needsFullPayment: false,
  },
  {
    key: 'van_truck',
    label: 'Van / Truck',
    hint: 'Inside Dhaka · bulk or heavy cargo',
    needsFullPayment: true,
  },
  {
    key: 'pathao',
    label: 'Home Delivery (Pathao)',
    hint: 'Courier to your address',
    needsFullPayment: false,
  },
  {
    key: 'sundorbon',
    label: 'Sundorbon Express',
    hint: 'Outside Dhaka · nationwide',
    needsFullPayment: true,
  },
];

export const deliveryMethod = (key) => DELIVERY_METHODS.find((m) => m.key === key) || null;

/* kind: 'order' (ordersApi) | 'request' (bookingRequest) | 'ship' (shipForMe) */
const BUCKET_OF = { order: getOrderBucket, request: getRequestBucket, ship: getShipBucket };

export const recordIdOf = (kind, rec) => String((kind === 'order' ? rec?.orderId : rec?.bookingId) || '');

/* What is still owed on the invoice. Pending payment slips don't count. A
   Ship For Me parcel has no invoice until it is weighed, so it can't be
   "fully paid" before that. */
export const deliveryDue = (kind, rec) => {
  if (!rec) return 0;
  if (kind === 'order') return Math.max(getTotalDue(rec), 0);
  if (kind === 'request') return Math.max(requestDue(rec), 0);
  return Math.max(shipmentDue(rec), 0);
};

export const isFullyPaid = (kind, rec) => {
  if (!rec) return false;
  if (kind === 'ship' && !(shipmentBill(rec) > 0)) return false;
  return deliveryDue(kind, rec) <= 0;
};

/* The button shows only in To Receive */
export const canRequestDelivery = (kind, rec) => {
  const bucketOf = BUCKET_OF[kind];
  return !!rec && !!bucketOf && bucketOf(rec) === 'To Receive';
};

export const isMethodAllowed = (method, fullyPaid) => !!method && (!method.needsFullPayment || fullyPaid);

export const isPathaoBooked = (rec) => !!rec?.pathaoBooking?.consignmentId;

/* One request at a time: once a request is submitted the record can't be
   requested again until Paicart rejects it (stored status 'cancelled'). */
export const canChangeDeliveryRequest = (rec) =>
  !isPathaoBooked(rec) &&
  (!rec?.deliveryRequest || !rec.deliveryRequest.method || rec.deliveryRequest.status === 'cancelled');

/* For colouring an item by how much of its invoice is paid:
   'paid' (green) | 'partial' (yellow) | 'unpaid' or 'not_billed' (red) */
export const deliveryPaymentState = (kind, rec) => {
  if (kind === 'ship' && !(shipmentBill(rec) > 0)) return 'not_billed';
  if (isFullyPaid(kind, rec)) return 'paid';
  const paid = ((rec && rec.payments) || []).reduce((a, p) => a + Math.max(parseInt(p && p.amount, 10) || 0, 0), 0);
  return paid > 0 ? 'partial' : 'unpaid';
};

/* The customer's default shipping address, copied onto the request so
   Paicart sees where to deliver even if the record has no address of its
   own. Same shape as users.addressBook entries. */
export const defaultShippingAddress = (user) => {
  const book = (user && Array.isArray(user.addressBook) && user.addressBook) || [];
  const a = book.find((x) => x && x.defaultShipping) || book[0] || null;
  if (!a) return null;
  return {
    name: a.name || '',
    mobileNo: a.mobileNo || '',
    address: a.address || '',
    area: a.area || '',
    thana: a.thana || '',
    district: a.district || '',
    division: a.division || '',
    /* Pathao city / zone / area ids — Paicart books Pathao straight from these */
    pathao: a.pathao || null,
  };
};

/* Records that stop Van / Truck and Sundorbon from being chosen, and why —
   so the customer can see exactly which order is holding them back.
   items: [{ kind, record }] → [{ kind, id, due, reason: 'due' | 'not_billed' }] */
export const paymentBlockers = (items = []) =>
  items
    .filter(({ kind, record }) => !isFullyPaid(kind, record))
    .map(({ kind, record }) => ({
      kind,
      id: recordIdOf(kind, record),
      due: deliveryDue(kind, record),
      reason: kind === 'ship' && !(shipmentBill(record) > 0) ? 'not_billed' : 'due',
    }));

export const KIND_SHORT = { order: 'Order', request: 'Product request', ship: 'Ship for me' };

/* "Order #123 (৳500 due), Ship for me #77 (not billed yet)" */
export const describeBlockers = (blockers = []) =>
  blockers
    .map((b) => `${KIND_SHORT[b.kind] || ''} #${b.id} (${
      b.reason === 'not_billed' ? 'not billed yet' : `৳${Math.round(b.due).toLocaleString('en-IN')} due`})`)
    .join(', ');

/* One request for several records (bulk) — every record gets the same
   groupId so Paicart handles them as one delivery. A method that needs full
   payment is refused unless EVERY record is fully paid.
   items: [{ kind, record }] → [{ kind, id, request }] */
export const buildDeliveryRequests = (items, methodKey, { note = '', userId = '', address = null, source = 'customer', enteredBy = '' } = {}) => {
  const method = deliveryMethod(methodKey);
  if (!method) throw new Error('Please choose a delivery method.');
  if (!items || !items.length) throw new Error('Please select at least one item.');
  const blockers = paymentBlockers(items);
  if (method.needsFullPayment && blockers.length && source === 'customer') {
    throw new Error(`${method.label} needs every selected invoice 100% paid. Not fully paid: ${describeBlockers(blockers)}.`);
  }
  const now = new Date();
  const groupId = items.length > 1 ? `DR-${now.getTime()}` : '';
  return items.map(({ kind, record }) => ({
    kind,
    id: recordIdOf(kind, record),
    request: {
      method: method.key,
      label: method.label,
      status: 'requested',
      requestedAt: now.getTime(),
      requestedDate: now.toLocaleDateString('en-GB'),
      fullyPaid: isFullyPaid(kind, record),
      dueAtRequest: deliveryDue(kind, record),
      note: String(note || '').trim().slice(0, 500),
      requestedBy: userId || '',
      source,
      enteredBy: enteredBy || '',
      address: address || null,
      groupId,
      groupSize: items.length,
    },
  }));
};

/* Single record (kept for existing callers) */
export const buildDeliveryRequest = (kind, rec, methodKey, options = {}) =>
  buildDeliveryRequests([{ kind, record: rec }], methodKey, options)[0].request;

export const DELIVERY_STATUS_LABEL = {
  requested: 'Delivery Request Submitted',
  arranged: 'Delivery Arranged',
  delivered: 'Delivered',
  cancelled: 'Delivery Request Rejected',
};
