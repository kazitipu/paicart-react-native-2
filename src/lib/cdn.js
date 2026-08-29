/* ─── Product image URLs ───
 *
 * Consolidates what the web app copy-pasted into 14 separate call sites
 * (page.jsx, collection/[id], product/[id] ×2, cart, place-order, wishlist,
 * 1688/[id], RefundApplyModal, and the four dashboard screens). Having one
 * copy per screen meant the `_200x200.webp` variant and the plain variant
 * drifted apart; keep every new call site pointed here.
 *
 * Two upstream quirks this has to absorb:
 *
 *   1. `cbu01.alicdn.com` is geo-blocked / slow from Bangladesh.
 *      `global-img-cdn.1688.com` is the accessible mirror.
 *
 *   2. Some 1688 URLs come back as `http:`. On the web that was handled
 *      globally by the `upgrade-insecure-requests` CSP header in
 *      next.config.mjs. React Native has no such switch, and cleartext HTTP is
 *      blocked by default on both platforms, so the upgrade happens here
 *      instead — otherwise those images simply never load.
 */

const ALI_HOST = 'cbu01.alicdn.com';
const MIRROR_HOST = 'global-img-cdn.1688.com';

/* Single URL: mirror the host and force https. */
export const cdn = (u) => {
  if (!u) return '';
  return String(u).replace(ALI_HOST, MIRROR_HOST).replace(/^http:\/\//i, 'https://');
};

/* Grid/thumbnail variant. `_200x200.webp` is a 1688 CDN resize convention —
   appending it to an already-suffixed URL yields a 404, so guard against
   double-suffixing (the web app never did, because each of its three copies
   only ever saw raw URLs). */
export const cdnThumb = (u) => {
  const base = cdn(u);
  if (!base) return '';
  return /_\d+x\d+\.(webp|jpg|png)$/i.test(base) ? base : `${base}_200x200.webp`;
};

/* Rewrites every occurrence inside an HTML blob — the product description is
   raw HTML from 1688 with inline <img> tags. Mirrors the global regex the web
   product page used at product/[id]/page.jsx:3045. */
export const cdnHtml = (html) => {
  if (!html) return '';
  return String(html).replace(
    new RegExp(`https?://${ALI_HOST.replace(/\./g, '\\.')}`, 'g'),
    `https://${MIRROR_HOST}`,
  );
};

/* ⚠️ Load-bearing. 1688 blocks hotlinked images, which the web app defeated
   with referrerPolicy="no-referrer" on ~59 <img> tags across 26 files. React
   Native's <Image> has no such prop — an empty Referer header is the
   equivalent. Every remote product image must go through this; without it the
   CDN answers 403 and the whole catalogue renders blank.
   Returns null for empty input so <Image source={null}> stays valid. */
export const imageSource = (u) => {
  const uri = cdn(u);
  return uri ? { uri, headers: { Referer: '' } } : null;
};

export const thumbSource = (u) => {
  const uri = cdnThumb(u);
  return uri ? { uri, headers: { Referer: '' } } : null;
};
