/* Per-category RMB rate + discount overrides configured inside a single
   campaign (admin: paicart-backend2 → Campaigns). When a product's category
   matches one of these overrides, the campaign's own rate/discount is used
   instead of the global currency rate / site-wide discount. */

const isCampaignActive = (c) => !c.expiryDate || new Date(c.expiryDate).getTime() > Date.now();

/* candidateIds: most-specific first (leaf → broadest), same convention as the
   1688 shipping-rate category matching elsewhere in this app. */
export const getCampaignRateForCategoryIds = (campaigns, candidateIds) => {
  const ids = (candidateIds || []).filter(Boolean).map(String);
  if (ids.length === 0) return null;
  const activeCampaigns = (campaigns || []).filter(isCampaignActive);
  for (const cid of ids) {
    for (const c of activeCampaigns) {
      const match = (c.categoryRates || []).find((r) => String(r.categoryId) === cid);
      if (match) {
        return {
          campaignId: c.id,
          campaignName: c.name,
          rmbRate: parseFloat(match.rmbRate) || 0,
          discountPercent: parseFloat(match.discountPercent) || 0,
        };
      }
    }
  }
  return null;
};

/* Convenience wrapper for a full product object from the single-product
   fetch (has the thirdCategoryId/secondCategoryId/topCategoryId/categoryId
   hierarchy). */
export const getCampaignRateForProduct = (campaigns, product) => {
  if (!product) return null;
  return getCampaignRateForCategoryIds(campaigns, [
    product.thirdCategoryId,
    product.secondCategoryId,
    product.topCategoryId,
    product.categoryId,
  ]);
};
