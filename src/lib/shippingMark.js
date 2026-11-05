/* Shipping mark customers write on parcels: "<userId>-<Name>",
   e.g. "101-Md Mostafa Sheikh". Falls back to the bare user ID when the
   profile has no name, and '' when there's no user ID yet.

   Port of the web's src/lib/shippingMark.js. The web title-cases with
   /\b\p{L}/gu; Unicode property escapes are not something to rely on in
   Hermes, so the same rule is applied by hand: a letter is capitalised when
   it sits on a `\b` boundary — i.e. its ASCII-word-ness differs from the
   previous character's (start of string counts as non-word). */
const isWordChar = (c) => /[A-Za-z0-9_]/.test(c || '');
const isLetter = (c) => c.toLowerCase() !== c.toUpperCase();

const titleCase = (s) => {
  const lower = String(s || '').toLowerCase();
  let out = '';
  for (let i = 0; i < lower.length; i += 1) {
    const c = lower[i];
    const boundary = isWordChar(lower[i - 1]) !== isWordChar(c);
    out += boundary && isLetter(c) ? c.toUpperCase() : c;
  }
  return out.trim();
};

export const getShippingMark = (user) => {
  if (!user?.userId) return '';
  const name = titleCase(user.displayName);
  return name ? `${user.userId}-${name}` : `${user.userId}`;
};
