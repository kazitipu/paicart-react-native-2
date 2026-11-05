/* ─── Product domain helpers ───
 *
 * Lifted out of the web product page, which held all of this inline in a
 * 5,343-line component. The dangerous-goods regexes in particular are subtle
 * and hand-tuned — they are copied verbatim, including their exclusions, and
 * should not be "simplified":
 *
 *   - the battery exclusion strips "battery-free" / "no batteries" from the
 *     haystack BEFORE matching, so a battery-free mouse is not flagged for the
 *     battery it explicitly does not have
 *   - the replica matcher deliberately does NOT match a bare "fake": fake
 *     eyelashes, fake nails and fake flowers are ordinary listings here
 *
 * Getting a DG classification wrong is not cosmetic — it selects the Hong Kong
 * `_hk` freight tier (see lib/freight.js) and so changes what the customer is
 * quoted.
 */
import {
  Battery, Droplet, FlaskConical, Magnet, Copy,
  Factory, Crown, BadgeCheck,
} from 'lucide-react-native';

export const DG_TYPES = [
  {
    id: "battery",
    label: "Battery",
    Icon: Battery,
    className: "text-amber-700 bg-amber-50 border-amber-200",
    /* Stripped from the haystack before testing, so "battery-free
       wireless mouse" does not get flagged for the battery it explicitly
       does not have. */
    exclude:
      /\bbatter(?:y|ies)[\s-]*(?:free|not\s*included|excluded)\b|\b(?:no|without|excl(?:uding|udes)?)\s+batter(?:y|ies)\b/gi,
    match:
      /\bbatter(?:y|ies)\b|\blithium\b|\bli-?ion\b|\brechargeable\b|\bpower\s*bank\b|\d+\s*mah\b|\blead-?acid\b|\bbutton\s*cell\b|\bcoin\s*cell\b|\baccumulator\b/i,
  },
  {
    id: "liquid",
    label: "Liquid",
    Icon: Droplet,
    className: "text-sky-700 bg-sky-50 border-sky-200",
    match:
      /\bliquid\b|\bperfume\b|\bcologne\b|\bessential\s*oil\b|\bnail\s*polish\b|\bsyrup\b|\balcohol\b|\bsanitizer\b|\baerosol\b|\bfragrance\b|\bink\b/i,
  },
  {
    id: "chemical",
    label: "Chemical",
    Icon: FlaskConical,
    className: "text-violet-700 bg-violet-50 border-violet-200",
    match:
      /\bchemical\b|\bacid\b|\bsolvent\b|\bpesticide\b|\bfertili[sz]er\b|\badhesive\b|\bglue\b|\bpaint\b|\bdye\b|\bbleach\b|\bdetergent\b|\bpigment\b/i,
  },
  {
    id: "magnet",
    label: "Magnetic",
    Icon: Magnet,
    className: "text-rose-700 bg-rose-50 border-rose-200",
    match: /\bmagnet(?:ic)?\b|\bneodymium\b/i,
  },
  {
    id: "replica",
    label: "Copy / Replica",
    Icon: Copy,
    className: "text-orange-700 bg-orange-50 border-orange-200",
    /* Deliberately excludes bare "fake" - "fake eyelashes", "fake nails" and
       "fake flowers" are ordinary, extremely common listings on this
       platform and are not replica/IP goods. */
    match:
      /\breplica\b|\bcounterfeit\b|\bimitation\b|\bknock-?off\b|\bhigh\s*copy\b|\baaa\s*quality\b|\b1:1\s*replica\b/i,
  },
];

export const stripHtml = (html) => String(html || "").replace(/<[^>]*>/g, " ");

/* Gathers every piece of seller-authored text on the product - title,
   description, spec name/value pairs, and variant option names (a colour
   option can itself read "Battery-included version") - into one haystack. */
export const classifyDangerousGoods = (product) => {
  if (!product) return { isDangerousGoods: false, types: [] };
  const parts = [
    product.name,
    stripHtml(product.description),
    ...((product.specs || []).flatMap((s) => [s.name, s.value])),
    ...Object.values(product.props_list || {}),
  ];
  const haystack = parts.filter(Boolean).join(" \u2022 ");

  const types = DG_TYPES.filter(({ match, exclude }) => {
    const text = exclude ? haystack.replace(exclude, " ") : haystack;
    return match.test(text);
  });
  return { isDangerousGoods: types.length > 0, types };
};

/* Variations shown before the "show all" toggle - products routinely carry
   dozens of SKUs with identical parcel dimensions. */
export const SIZE_ROWS_COLLAPSED = 5;

export const propVal = (raw) => {
  if (!raw) return "";
  const idx = raw.indexOf(":");
  return idx >= 0 ? raw.slice(idx + 1) : raw;
};

/* A variant's `properties` string joins its dimension segments
   (e.g. "0:0;1:2") in whatever order the source SKU's own attribute list
   happened to be in - it is NOT always color-first. Comparing the raw
   strings breaks whenever a variant's segment order differs from the
   color-first key we build locally (colorProps;sizeProps), so every
   variant lookup below matches on the sorted segment set instead. */
export const normalizeProperties = (props) =>
  (props || "")
    .split(";")
    .filter(Boolean)
    .sort()
    .join(";");

export const findVariantByProperties = (variants, key) => {
  if (!variants || !key) return undefined;
  const target = normalizeProperties(key);
  return variants.find((v) => normalizeProperties(v.properties) === target);
};

/* 1688 seller-identity tags -> seller status badges.
   Only the listing endpoints (search / vendor / collection) return
   `sellerIdentities`; the product-detail endpoint omits it. It is carried over
   from the listing product cached in Redux when the user arrives from one, and
   resolved from the shop's own listing on a direct load. Highest priority
   first, at most two badges so the card stays compact. */
export const SELLER_STATUSES = [
  /* web tones: text-[#FF6A00] bg-orange-50 border-orange-100 / rose-600 rose-50
     rose-100 / blue-600 blue-50 blue-100 */
  { id: 'super_factory', label: 'Direct Factory', Icon: Factory, color: '#FF6A00', bg: '#fff7ed', border: '#ffedd5' },
  { id: 'powerful_merchants', label: 'Top Rated', Icon: Crown, color: '#e11d48', bg: '#fff1f2', border: '#ffe4e6' },
  { id: 'tp_member', label: 'Certified Merchant', Icon: BadgeCheck, color: '#2563eb', bg: '#eff6ff', border: '#dbeafe' },
];

export function getSellerStatuses(ids) {
  const list = ids || [];
  return SELLER_STATUSES.filter((s) => list.includes(s.id)).slice(0, 2);
}

/* ─── Wholesale price tiers ───
   `price_range` is a 1688 array of [minQuantity, price] pairs (older records
   store it as a JSON string, hence the parse in firebaseUtils' getPrice). The
   applicable tier is the LAST one whose minimum the quantity reaches, so the
   scan runs backwards. Returns BDT. */
export const getUnitPrice = (variantPrice, qty = 0, range = [], taka = 1) => {
  if (range.length > 0) {
    let tp = parseFloat(range[0][1] ?? range[0].price ?? 0);
    for (let i = range.length - 1; i >= 0; i--) {
      const minQ = i === 0 ? 0 : parseInt(range[i][0] ?? range[i].beginAmount ?? 0, 10);
      if (qty >= minQ) {
        tp = parseFloat(range[i][1] ?? range[i].price ?? 0);
        break;
      }
    }
    return Math.round(tp * taka);
  }
  return Math.round(parseFloat(variantPrice || 0) * taka);
};

/* The API's `moq` is a per-PRODUCT minimum counted across every variant, not
   per variant. On the web it was only ever printed on the page, so a 2-piece
   minimum could still be ordered one piece at a time. */
export const moqOf = (product) => parseInt(product?.moq, 10) || 1;

export const moqState = (product, totalQty) => {
  const moq = moqOf(product);
  const shortfall = Math.max(0, moq - totalQty);
  return {
    moq,
    shortfall,
    below: totalQty > 0 && shortfall > 0,
    blocked: totalQty < moq,
    message:
      totalQty === 0
        ? 'Please select quantity first.'
        : `Minimum order is ${moq} pcs — add ${shortfall} more.`,
  };
};

/* The product's colour options (dimension 0), as [{ properties, value, url }].
   Web: the `props_imgs.prop_img` entries (which carry the swatch image) come
   first, then every remaining dimension-0 key without a picture. */
export const buildColorsArray = (product) => {
  if (!product?.props_list) return [];
  const withPic = product.props_imgs?.prop_img || [];
  const without = Object.keys(product.props_list)
    .filter((k) => k.startsWith('0'))
    .map((k) => ({ properties: k, value: propVal(product.props_list[k]) }));
  if (!withPic.length) return without;
  const seen = new Set();
  return [...withPic, ...without].filter((c) => !seen.has(c.properties) && seen.add(c.properties));
};

/* Every dimension-1 option, as [{ properties, value }]. */
export const buildSizesArray = (product) => {
  if (!product?.props_list) return [];
  return Object.keys(product.props_list)
    .filter((k) => k.startsWith('1'))
    .map((k) => ({ properties: k, value: propVal(product.props_list[k]) }));
};

/* Only the sizes that actually exist for the selected colour. */
export const buildSizesForColor = (product, allSizes, selectedColor) => {
  if (!allSizes.length || !product?.variants) return allSizes;
  if (!selectedColor) return allSizes;
  const seen = new Set();
  return product.variants
    .filter((v) => v.properties?.split(';').find((p) => p.startsWith('0')) === selectedColor.properties)
    .map((v) => {
      const sp = v.properties?.split(';').find((p) => p.startsWith('1'));
      if (!sp || !product.props_list?.[sp]) return null;
      return { properties: sp, value: propVal(product.props_list[sp]) };
    })
    .filter((s) => s && !seen.has(s.properties) && seen.add(s.properties));
};

/* Every variant dimension, flattened for the Specifications table.
   `props_list` keys are "<dimIndex>:<valueIndex>" and their values are
   "<PropertyName>:<value>" - grouped by dimension so a product with 78
   colours prints one "Color" row listing all 78, not 78 separate rows. */
export const buildVariantSpecs = (product) => {
  const list = product?.props_list;
  if (!list) return [];
  const groups = new Map();
  Object.keys(list).forEach((k) => {
    const dim = k.split(':')[0];
    const raw = list[k] || '';
    const idx = raw.indexOf(':');
    const name =
      (idx >= 0 ? raw.slice(0, idx) : '') ||
      product.propertyNames?.[Number(dim)] ||
      (dim === '0' ? 'Color' : dim === '1' ? 'Size' : `Option ${+dim + 1}`);
    const value = propVal(raw);
    if (!value) return;
    if (!groups.has(dim)) groups.set(dim, { name, values: [] });
    const g = groups.get(dim);
    if (!g.values.includes(value)) g.values.push(value);
  });
  return [...groups.entries()]
    .sort((a, b) => Number(a[0]) - Number(b[0]))
    .map(([dim, g]) => ({ dim, ...g }));
};

/* Per-variant parcel size & weight, joined onto the variants by sku id.
   `skuShippingDetails[].skuId` lines up 1:1 with `variants[].sku_id`.
   - `skuShippingInfoList` carries the SAME dimensions with the weight in
     GRAMS, so only `skuShippingDetails` is read (unit never ambiguous).
   - A 0 means "the seller never filled this in", so zeros are treated as
     missing. Top-level length/width/height/weight are the fallback. */
export const buildSizeWeightRows = (product) => {
  const psi = product?.productShippingInfo;
  const details = psi?.skuShippingDetails;
  if (!psi || !details?.length) return [];

  const num = (v) => {
    const n = parseFloat(v);
    return Number.isFinite(n) && n > 0 ? n : null;
  };
  const bySku = new Map((product.variants || []).map((v) => [String(v.sku_id), v]));
  const imgByProps = new Map((product.props_imgs?.prop_img || []).map((i) => [i.properties, i.url]));

  return details.map((d, i) => {
    const variant = bySku.get(String(d.skuId));
    const segs = (variant?.properties || '').split(';').filter(Boolean);
    const label =
      segs
        .map((seg) => propVal(product.props_list?.[seg]))
        .filter(Boolean)
        .join(' / ') || `Variation ${i + 1}`;
    const length = num(d.length) ?? num(psi.length);
    const width = num(d.width) ?? num(psi.width);
    const height = num(d.height) ?? num(psi.height);
    return {
      key: String(d.skuId || i),
      label,
      image: segs.map((seg) => imgByProps.get(seg)).find(Boolean) || null,
      length,
      width,
      height,
      weight: num(d.weight) ?? num(psi.weight),
      /* cm³ -> m³ */
      cbm: length && width && height ? (length * width * height) / 1e6 : null,
    };
  });
};
