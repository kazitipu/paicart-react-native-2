/* ─── China → Bangladesh freight pricing ───
 *
 * Rates come from a `1688Category` document (see firebaseUtils
 * get1688CategoryRateById). Extracted from the web product page, where the
 * whole model lived inline in a 5,343-line component — the cart and the
 * checkout both re-derive shipping and must agree with it exactly.
 *
 * Two things here are load-bearing and easy to get wrong:
 *
 *   1. Air's 0–0.3kg slot is a FLAT PARCEL CHARGE, not a per-kg rate. Costing
 *      it by weight bills a 0.2kg parcel a fraction of the real minimum.
 *
 *   2. Dangerous goods (battery / liquid / chemical / magnet) cannot be flown
 *      out of the mainland. They are consolidated through the Hong Kong
 *      warehouse and priced from the `_hk` variants of each tier field. A
 *      category whose `_hk` fields an admin has not filled in yet falls back
 *      to its own non-DG price — NOT to the flat platform default, or an
 *      unpriced DG slot would read as cheaper than the regular one.
 */

export const DEFAULT_RATE_PER_KG = 850;

/* Air's flat-charge band, in kg. */
export const AIR_PARCEL_MAX_KG = 0.3;

const val = (v) => {
  const n = parseFloat(v);
  return Number.isFinite(n) && n > 0 ? n : null;
};

export const rateField = (categoryRate, key, dg) => {
  if (!categoryRate) return null;
  return dg
    ? val(categoryRate[`${key}_hk`]) ?? val(categoryRate[key])
    : val(categoryRate[key]);
};

/* `above_100kg` is a newer field admins don't always fill in. Only categories
   that have it get the extra bulk tier; everything else keeps the older
   3-tier air table with "5kg+" uncapped. */
export const hasBulkAirTier = (categoryRate, dg) =>
  rateField(categoryRate, 'above_100kg', dg) != null;

/* Which slot a parcel weight falls in.
     AIR: parcel / 0.3–5kg / 5–100kg (or 5kg+ uncapped) / 100kg+
     SEA: ≤100kg / <1000kg / ≥1000kg, by TOTAL order weight. */
export const ratePerKgFor = (categoryRate, mode, weightKg, dg = false) => {
  if (!categoryRate) return DEFAULT_RATE_PER_KG;
  const f = (key) => rateField(categoryRate, key, dg);
  const tierValue =
    mode === 'sea'
      ? weightKg <= 100
        ? f('100kg')
        : weightKg <= 1000
          ? f('below_1000kg')
          : f('above_1000kg')
      : weightKg <= AIR_PARCEL_MAX_KG
        ? f('parcel')
        : weightKg <= 5
          ? f('ten')
          : hasBulkAirTier(categoryRate, dg) && weightKg > 100
            ? f('above_100kg')
            : f('eleven');
  return tierValue ?? DEFAULT_RATE_PER_KG;
};

/* Whether this parcel is billed flat rather than per kilo. */
export const isParcelRate = (mode, weightKg) =>
  mode === 'air' && weightKg > 0 && weightKg <= AIR_PARCEL_MAX_KG;

export const chargeFor = (categoryRate, mode, weightKg, dg = false) => {
  const rate = ratePerKgFor(categoryRate, mode, weightKg, dg);
  if (!(rate > 0) || !(weightKg > 0)) return 0;
  return isParcelRate(mode, weightKg) ? Math.round(rate) : Math.round(weightKg * rate);
};

/* Every rate slot for a category, so the calculator can show Air and Sea side
   by side rather than only the active mode. Bengali labels are what customers
   see on the web and are kept verbatim. */
export const buildRateTiers = (categoryRate, mode, weightKg, dg = false) => {
  const dv = (key) => rateField(categoryRate, key, dg) ?? DEFAULT_RATE_PER_KG;

  if (mode === 'sea') {
    return [
      { label: '১০০ কেজি পর্যন্ত', sub: '0 – 100 kg', unit: '/kg', rate: dv('100kg'), active: weightKg <= 100 },
      { label: '১০০০ কেজির নিচে', sub: '100 – 1000 kg', unit: '/kg', rate: dv('below_1000kg'), active: weightKg > 100 && weightKg <= 1000 },
      { label: '১০০০ কেজির বেশি', sub: '1000 kg +', unit: '/kg', rate: dv('above_1000kg'), active: weightKg > 1000 },
    ];
  }

  const bulk = hasBulkAirTier(categoryRate, dg);
  return [
    { label: 'পার্সেল', sub: '0 – 0.3 kg', unit: '/parcel', rate: dv('parcel'), active: weightKg > 0 && weightKg <= AIR_PARCEL_MAX_KG },
    { label: '৫ কেজি পর্যন্ত', sub: '0.3 – 5 kg', unit: '/kg', rate: dv('ten'), active: weightKg > AIR_PARCEL_MAX_KG && weightKg <= 5 },
    {
      label: bulk ? '১০০ কেজি পর্যন্ত' : '৫ কেজির বেশি',
      sub: bulk ? '5 – 100 kg' : '5 kg +',
      unit: '/kg',
      rate: dv('eleven'),
      active: weightKg > 5 && (!bulk || weightKg <= 100),
    },
    ...(bulk
      ? [{ label: '১০০ কেজির বেশি', sub: '100 kg +', unit: '/kg', rate: dv('above_100kg'), active: weightKg > 100 }]
      : []),
  ];
};
