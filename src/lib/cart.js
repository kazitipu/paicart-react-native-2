/* ─── Cart quantity and pricing rules ───
 *
 * Pulled out of the 1,272-line web cart page. These are the rules that decide
 * what a customer is actually allowed to order, and the checkout re-derives
 * from the same numbers — so they have to live somewhere both can reach.
 *
 * Three constraints stack, in this order:
 *   1. BATCH  — the supplier sells in packs. A quantity must be a multiple of
 *               it, and the pack size is also the floor.
 *   2. MOQ    — a per-PRODUCT minimum counted across every variant, not per
 *               variant. How low one variant may go therefore depends on what
 *               its siblings already hold.
 *   3. STOCK  — never raise a line past what the supplier holds.
 */

/* `price_range` is [minQuantity, price] pairs; older records store it as a
   JSON string. The applicable tier is the LAST one whose minimum the quantity
   reaches, so the scan runs backwards. Returns BDT, or null when there is no
   usable tier table. */
export function getActiveTierPrice(priceRangeRaw, totalQty, taka) {
  if (!priceRangeRaw) return null;
  try {
    const range =
      typeof priceRangeRaw === 'string' ? JSON.parse(priceRangeRaw) : priceRangeRaw;
    if (!Array.isArray(range) || !range.length) return null;
    for (let i = range.length - 1; i >= 0; i--) {
      const minQ = i === 0 ? 0 : parseInt(range[i][0] ?? range[i].beginAmount ?? 0, 10);
      if (totalQty >= minQ) {
        return Math.round(parseFloat(range[i][1] ?? range[i].price ?? 0) * taka);
      }
    }
  } catch {
    return null;
  }
  return null;
}

/* Variant sets are matched on sku_id where the supplier gives one, falling
   back to the property signature. Segment order varies between responses, so
   it is sorted before comparing — the same reason product.js normalises. */
export const normProps = (v) => (v || '').split(';').filter(Boolean).sort().join(';');

const snapToBatch = (n, batch) => (batch > 1 ? Math.round(n / batch) * batch : n);

/* Resolves a requested quantity for one variant against all three rules.
   Returns the allowed quantity plus a reason when it had to be changed, so the
   caller can toast — the web toasted from inside the setter, which meant a
   silent clamp whenever the value was set programmatically. */
export function resolveQty({ requested, batch = 1, moq = 1, othersQty = 0, stock = 0 }) {
  const b = Math.max(1, parseInt(batch, 10) || 1);
  const m = Math.max(1, parseInt(moq, 10) || 1);

  let n = parseInt(requested, 10) || b;
  if (n < b) n = b;
  n = snapToBatch(n, b);

  let reason = null;

  /* MOQ counts across the product's other variants. */
  const minForThis = Math.max(b, m - othersQty);
  if (n < minForThis) {
    n = b > 1 ? Math.ceil(minForThis / b) * b : minForThis;
    reason = `Minimum order quantity is ${m} pcs.`;
  }

  /* Stock travelling with a cart entry is whatever was true when it was added;
     the live re-check at checkout catches anything sold out since. */
  const s = parseInt(stock, 10) || 0;
  if (s > 0 && n > s) {
    n = b > 1 ? Math.max(b, Math.floor(s / b) * b) : s;
    reason = `Only ${s} pcs available for this variant.`;
  }

  return { qty: n, reason };
}

/* Blocking problems with the current selection, checked before checkout. */
export function collectCartIssues(items, { qtyOf, batchOf, moqOf, labelOf }) {
  const issues = [];
  items.forEach((item) => {
    const qty = qtyOf(item);
    if (qty <= 0) return;
    const moq = moqOf(item);
    const batch = batchOf(item);
    const label = labelOf(item);
    if (qty < moq) {
      issues.push({
        item,
        kind: 'moq',
        text: `${label} — minimum order is ${moq} pcs, add ${moq - qty} more.`,
      });
    } else if (batch > 1 && qty % batch !== 0) {
      issues.push({
        item,
        kind: 'batch',
        text: `${label} — must be ordered in packs of ${batch}.`,
      });
    }
  });
  return issues;
}

/* Compares one requested line against a freshly-read product payload.
   Returns the available quantity, or null when the upstream gives us nothing
   to judge by — in which case the order must NOT be blocked. */
export function availableFor(liveProduct, sku) {
  const variants = Array.isArray(liveProduct?.variants) ? liveProduct.variants : [];
  const totalAvail = parseInt(liveProduct?.totalAvailableQuantity, 10);
  const v =
    variants.find((x) => String(x.sku_id) === String(sku.sku_id)) ||
    variants.find((x) => normProps(x.properties) === normProps(sku.properties));
  if (v) return parseInt(v.quantity, 10) || 0;
  if (variants.length === 0 && Number.isFinite(totalAvail)) return totalAvail;
  return null;
}
