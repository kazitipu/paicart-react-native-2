/* ─── "Pay More, Get More" partial-payment tiers ───
 *   যত বেশী পেমেন্ট, তত বেশী অফার
 *
 * An admin-configured `partial-payments` document offers a discount for paying
 * a larger share up front: `payNow60`, `payNow80`, `payNow100` each hold a
 * percentage. PrePaymentModal runs this at checkout and OrderPaymentModal runs
 * it again when an unpaid order is settled later — identical maths, which is
 * why it lives here rather than being written twice.
 *
 * Two rules that are easy to lose and expensive to get wrong:
 *
 *   1. `maximumDiscountAmount` CAPS the discount. Recomputing base × offer%
 *      elsewhere and ignoring the cap is exactly the bug orderMath's
 *      getOfferDiscount() documents — the order screen showed the full
 *      uncapped figure while the payment modal showed the real, smaller one.
 *
 *   2. A tier FIXES the amount. The discount is earned by paying exactly that
 *      share, so the amount field must not stay editable once a tier is taken.
 */

export const TIER_PERCENTAGES = [60, 80, 100];

/* The minimum share of the bill a first payment must cover when no tier is
   taken. Also the seeded default in the amount field. */
export const MIN_FIRST_PAYMENT_PCT = 60;

export const capDiscount = (raw, maximumDiscountAmount) => {
  const cap = parseFloat(maximumDiscountAmount) || 0;
  return Math.round(cap > 0 ? Math.min(raw, cap) : raw);
};

export const buildTiers = (activePartial, baseAmount) => {
  if (!activePartial) return [];
  const max = activePartial.maximumDiscountAmount;
  return TIER_PERCENTAGES.map((pct) => {
    const offer = parseFloat(activePartial[`payNow${pct}`]) || 0;
    return { pct, offer, discountAmount: capDiscount(baseAmount * (offer / 100), max) };
  });
};

/* A tier may only be granted on a first payment: it discounts the whole bill,
   so it cannot be handed out twice on an order that is already part-paid. */
export const isOfferEligible = ({ activePartial, totalPaid, alreadyDiscounted, totalDue, tiers }) =>
  !!activePartial &&
  totalPaid === 0 &&
  !alreadyDiscounted &&
  totalDue >= (parseFloat(activePartial?.minimumOrderAmount) || 0) &&
  tiers.some((t) => t.offer > 0);

/* What the customer pays now, and what is left, for a chosen tier. */
export const tierBreakdown = (tier, totalDue) => {
  const discountedDue = tier
    ? Math.round(totalDue - tier.discountAmount)
    : Math.round(totalDue);
  const payNow = tier ? Math.round(discountedDue * (tier.pct / 100)) : discountedDue;
  return { discountedDue, payNow, dueLater: discountedDue - payNow };
};

export const minFirstPayment = (totalDue) =>
  Math.round((totalDue * MIN_FIRST_PAYMENT_PCT) / 100);

/* Written onto the payment document so the order carries the granted discount.
   All three are numbers — never the legacy "20%" strings. */
export const offerFieldsFor = (tier) =>
  tier
    ? {
        offer: tier.offer,
        offerPayNowPercent: tier.pct,
        offerDiscountAmount: tier.discountAmount,
      }
    : {};
