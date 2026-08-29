/* ─── Checkout maths ───
 *
 * Extracted from the web place-order page. Everything here is pure so the
 * summary a customer reads and the order documents written to Firestore come
 * from one calculation rather than two that can drift.
 *
 * NOTE the discount precedence: a per-item `campaignDiscountPercent` set at
 * add-to-cart time SUPERSEDES the site-wide discount for that item. A cart can
 * legitimately mix campaign and non-campaign items, so the discount is summed
 * per item, never applied once to the basket total.
 */

export const getItemTotal = (item) =>
  (item.skus || []).reduce(
    (b, sku) => b + Math.round(parseFloat(sku.price) * parseInt(sku.totalQuantity, 10)),
    0,
  );

export const getItemDiscountPct = (item, siteDiscountPct) =>
  parseFloat(item?.campaignDiscountPercent) > 0
    ? parseFloat(item.campaignDiscountPercent)
    : siteDiscountPct;

export const getShopTotal = (shop) =>
  (shop.items || []).reduce((a, item) => a + getItemTotal(item), 0);

export const getShopSiteDiscount = (shop, siteDiscountPct) =>
  (shop.items || []).reduce(
    (a, item) => a + getItemTotal(item) * (getItemDiscountPct(item, siteDiscountPct) / 100),
    0,
  );

export const getShopQty = (shop) =>
  (shop.items || []).reduce(
    (a, item) =>
      a + (item.skus || []).reduce((b, sku) => b + (parseInt(sku.totalQuantity, 10) || 0), 0),
    0,
  );

/* Percentage coupons are capped by `maximumDiscount`; fixed ones are taken as
   given. */
export const couponAmountFor = (coupon, totalAmount) => {
  if (!coupon) return 0;
  if (coupon.discountType === 'percentage') {
    const raw = (totalAmount * coupon.discountAmount) / 100;
    return coupon.maximumDiscount > 0 ? Math.min(raw, coupon.maximumDiscount) : raw;
  }
  return coupon.discountAmount || 0;
};

export function summarise(pendingOrders, { siteDiscountPct = 0, coupon = null } = {}) {
  const totalAmount = pendingOrders.reduce((a, shop) => a + getShopTotal(shop), 0);
  const totalQty = pendingOrders.reduce((a, shop) => a + getShopQty(shop), 0);
  const goodsCategory = pendingOrders.reduce((a, shop) => a + (shop.items?.length || 0), 0);
  const siteDiscountAmount = pendingOrders.reduce(
    (a, shop) => a + getShopSiteDiscount(shop, siteDiscountPct),
    0,
  );
  const totalLocalShipping = pendingOrders.reduce(
    (a, shop) => a + (parseInt(shop.localShipping, 10) || 0),
    0,
  );
  const couponAmount = couponAmountFor(coupon, totalAmount);
  return {
    totalAmount,
    totalQty,
    goodsCategory,
    siteDiscountAmount,
    couponAmount,
    totalLocalShipping,
    totalPayable: totalAmount - siteDiscountAmount - couponAmount + totalLocalShipping,
  };
}

/* Everything the cart resolved has to arrive intact. An unresolved China local
   courier charge, or an item under its own minimum, means the order would be
   placed on numbers the customer never saw settle — so the button stays locked
   and says which one is holding it up. */
export function orderBlockReason(pendingOrders) {
  const courierUnresolved = pendingOrders.some((shop) => {
    const v = shop.localShipping;
    return v === undefined || v === null || v === '' || !Number.isFinite(parseInt(v, 10));
  });
  if (courierUnresolved) return 'China local courier charge not settled';

  const short = pendingOrders
    .flatMap((shop) => shop.items || [])
    .find((item) => {
      const moq = parseInt(item.moq, 10) || 1;
      const qty = (item.skus || []).reduce(
        (a, sk) => a + (parseInt(sk.totalQuantity, 10) || 0),
        0,
      );
      return qty > 0 && qty < moq;
    });
  if (short) return `Minimum order quantity is ${parseInt(short.moq, 10) || 1} pcs`;

  return '';
}

/* Validates a coupon against the basket and the customer's usage history.
   Returns an error string, or null when it may be applied. */
export function validateCoupon(coupon, { totalAmount, usedCoupons = [] }) {
  if (!coupon) return 'Coupon not found';
  if (coupon.minimumOrder > totalAmount) {
    return `Minimum order is ৳${coupon.minimumOrder} to use this coupon`;
  }
  if (new Date(coupon.expirationDate).getTime() < Date.now()) {
    return 'This coupon has expired';
  }
  const used = usedCoupons.find((c) => c.id === coupon.id);
  if (used && used.used >= coupon.usageLimit) {
    return `You've reached the usage limit (${coupon.usageLimit}) for this coupon`;
  }
  return null;
}

/* One order document per shop. The coupon is split evenly across shops, as on
   the web — the customer applied it to the basket, not to any one seller. */
export function buildOrderDocs(pendingOrders, ctx) {
  const {
    siteDiscountPct, coupon, couponAmount, taka, defaultShipping,
    deliveryCharges = {}, shopNotes = {}, now = new Date(), timestamp = null,
  } = ctx;

  return pendingOrders.map((shop) => {
    const shopTotal = getShopTotal(shop);
    const shopCoupon = couponAmount / pendingOrders.length;
    const shopSiteDiscount = getShopSiteDiscount(shop, siteDiscountPct);

    return {
      ...shop,
      orderId: String(Math.floor(Math.random() * Date.now())),
      time: now.getTime(),
      orderedDate: now.toLocaleDateString('en-GB'),
      orderedTime: now.toLocaleTimeString('en-US'),
      orderStatus: 'pending',
      shipmentMethod: shop.items?.[0]?.shipmentMethod || 'Air',
      /* Air's 0–0.3kg band is billed per parcel, not per kg — hoisted to the
         order so the admin panel and invoices don't have to dig into items[0]
         to know which unit the rate is quoted in. */
      shippingRateUnit: shop.items?.[0]?.shippingRateUnit || 'kg',
      actualTotal: shopTotal,
      actualTotalAfterCoupon: shopTotal - shopSiteDiscount - shopCoupon,
      orderTotal: shopTotal - shopSiteDiscount - shopCoupon,
      couponUsed: coupon || null,
      couponAmount: shopCoupon,
      siteDiscountPercent: siteDiscountPct,
      siteDiscountAmount: shopSiteDiscount,
      paymentStatus: 'purchaseLater',
      additionalNotes: shopNotes[shop.shopId] || '',
      createdAt: timestamp,
      shipmentStatusScore: 1,
      websiteName: '1688.com',
      currency: taka,
      deliveryAddress: defaultShipping,
      deliveryCharge: deliveryCharges[shop.shopId] ?? 100,
    };
  });
}
