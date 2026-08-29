export const getActiveDiscountPercent = (siteDiscount) => {
  if (!siteDiscount) return 0;
  if (siteDiscount.expirationDate && new Date(siteDiscount.expirationDate).getTime() <= Date.now()) {
    return 0;
  }
  return parseFloat(siteDiscount.percentage) || 0;
};

export const applyDiscount = (price, percent) => {
  const p = parseFloat(price) || 0;
  if (!percent) return p;
  return p - (p * percent) / 100;
};
