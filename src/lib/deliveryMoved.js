/* "Home delivery requested" feedback.
 *
 * A Pathao (Home Delivery) request moves the item out of the To Receive tab
 * and into "My Home Delivery Request" on the Overview. The card that sent
 * the request unmounts as soon as its list reloads, so the confirmation is
 * shown by <DeliveryMovedSheet />, mounted once at the app root (App.jsx),
 * and triggered from anywhere with showDeliveryMoved().
 *
 *   showDeliveryMoved({ items: [{ id, label }], methodLabel })
 */
import { recordIdOf } from '@/lib/deliveryRequest';

const listeners = new Set();

export function showDeliveryMoved({ items = [], methodLabel = '' } = {}) {
  const payload = { items: items.filter(Boolean), methodLabel: String(methodLabel || '') };
  listeners.forEach((fn) => fn(payload));
}

export function subscribeDeliveryMoved(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/* Product / parcel name of a To Receive record. */
export const recordTitle = (kind, rec) => {
  if (!rec) return '';
  if (kind === 'order') return (rec.items && rec.items[0] && rec.items[0].name) || rec.shopName || '';
  if (kind === 'request') return rec.productType || rec.othersProductName || '';
  return rec.othersProductName || rec.productType || '';
};

const KIND_LABEL = { order: 'Order', request: 'Product request', ship: 'Ship for me' };

/* { id, label } for the sheet — "Order #id · product name". */
export const movedItem = (kind, rec) => {
  const id = recordIdOf(kind, rec);
  const title = recordTitle(kind, rec);
  return { id: `${kind}-${id}`, label: `${KIND_LABEL[kind] || 'Item'} #${id}${title ? ` · ${title}` : ''}` };
};
