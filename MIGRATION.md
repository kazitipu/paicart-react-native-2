# Paicart — Next.js → React Native Migration

Port of `../paicart-nextjs15` (Next.js 16, ~28,000 lines, 53 route files, 21
components, 12 Redux slices) to a native mobile app on **the same Firebase
project (`paicart`)** with full feature parity.

> **How to use this file.** Work phases in order — each layer is finished before
> the next depends on it. Tick `- [x]` as items land and stamp the phase heading
> with a date. A resumed session should read this file first and continue from
> the first unticked box, not restart.
>
> ## Status: Phases 0–12 complete. All 52 screens ported.
>
> The only unticked work is in **Phase 13**, and three of its items are blocked
> on things only the project owner can do (registering the apps in the Firebase
> console, the Google web client id, and the Firestore indexes). Run
> `npm run verify` before and after any change.

**Do not run an Android or iOS build until Phase 13.** Builds are slow; the
whole port is verified by Metro bundling (`npm run bundle:check`) until then.

---

## Locked decisions

| | |
|---|---|
| Framework | Bare React Native CLI **0.87.1**, JS/JSX (matches the source) |
| Firebase | **`@react-native-firebase` v26** — native SDKs, full modular API |
| Styling | **NativeWind v4** + `tailwind.config.js` brand tokens |
| Navigation | **React Navigation 7** — bottom tabs + native stack per tab |
| Persistence | **`react-native-mmkv`** (synchronous — no redux-persist, no PersistGate) |
| Scope | Full parity, all ~60 routes including static content pages |
| Phone OTP | Ported as-is; only the un-awaited verify bug is fixed |
| bKash | `paicart://payment-return` deep link; backend to follow |
| Bundle id | **`com.paicart.app`** (Android package + iOS bundle) |

### Environment constraint

Dev machine is **macOS 12 Monterey with no Xcode**. Android SDK, Java 17,
Node 22, CocoaPods, Watchman are present. **Local iOS builds are impossible**
until macOS ≥14 + Xcode ≥16. Android builds work locally.

### Why this is tractable

- Only **7 external packages** are actually imported across the web `src/`
  (`next`, `react`, `react-redux`, `@reduxjs/toolkit`, `axios`, `firebase`,
  `lucide-react`). **11 of 29 declared dependencies have zero importers.**
  No framer-motion, no headless-UI, no CSS-in-JS; every carousel is hand-built.
- **`@react-native-firebase` v26 ships the full modular API** (verified by
  unpacking the tarballs), so `firebaseUtils.js` — 1,185 lines, 56 functions —
  ports as an **import-path swap**, not a rewrite.
- **`src/lib/` is mostly pure JS** and copies verbatim.

---

## Phase 0 — Scaffold & toolchain ✅ 2026-08-29

- [x] `npx @react-native-community/cli init` → RN 0.87.1 at `paicart-react-native`
- [x] Rename Android package + iOS bundle to `com.paicart.app` (moved
      `android/app/src/main/java/com/paicart/` → `com/paicart/app/`)
- [x] Install navigation, Firebase, Redux, MMKV, NativeWind, icons, media deps
- [x] `react-native-worklets@0.12.x` (required peer of Reanimated 4)
- [x] `babel.config.js` — NativeWind preset, `@/` → `./src` module-resolver,
      `react-native-worklets/plugin` last
- [x] `metro.config.js` — `withNativeWind({ input: './global.css' })`
- [x] `tailwind.config.js` — brand tokens (see below), named type ramp
- [x] `jsconfig.json` / `tsconfig.json` with the `@/*` path
- [x] Copy `public/*.png` → `src/assets/`
- [x] `src/` tree scaffolded
- [x] **Verified: `npm run bundle:check` bundles clean**

### Brand tokens (in `tailwind.config.js`)

`#FF6A00` primary · `#fff1e6` primary-tint · `#e62222` brand · `#f97316`
secondary · `#1C1C1C` ink · `#FF6600` offer · WhatsApp `#25d366`/`#075e54`/
`#ece5dd`/`#f0f0f0` · bKash `#e2136e`/`#d62267` · teal `#00B8A9`/`#0d9488` ·
amber `#FABC16`/`#fef6e0`/`#fde68a` · toast `#22c55e`/`#f59e0b` · invoice
`#00B42A`/`#F5222D` · background `#f8fafc` · foreground `#1e293b`

The web app had only 4 CSS variables and bypassed them, hard-coding ~20 literal
hex values across inline styles. They are consolidated here — use the tokens.

---

## Phase 1 — `src/lib/` (pure logic + data layer) ✅ 2026-08-29

### Verbatim copies (zero changes)
- [x] `orderMath.js` — **`getOrderBucket()` is the single source of truth for
      the six order tabs.** Reuse it everywhere; never reimplement.
- [x] `refund.js` · [ ] `shipment.js` · [ ] `buyerLevel.js`
- [x] `discount.js` · [ ] `campaignPricing.js`
- [x] `toast.js` (pub/sub is pure; only the renderer is rewritten, Phase 4)

### New — `src/lib/cdn.js`
The rewrite `u.replace('cbu01.alicdn.com','global-img-cdn.1688.com')` is
**copy-pasted in 14 places** in the web app. Consolidate:
- [x] `cdn(url)` — host rewrite **+ force `https:`** (replaces the
      `upgrade-insecure-requests` CSP header, which has no RN equivalent)
- [x] `cdnThumb(url)` — appends `_200x200.webp` (3 grid call sites)
- [x] `imageSource(url)` → `{ uri, headers: { Referer: '' } }`
      ⚠️ **Load-bearing.** Replaces `referrerPolicy="no-referrer"` (~59 `<img>`
      tags across 26 files). Without it 1688 hotlink protection 403s every
      product image.

### New — `src/lib/storage.js`
- [x] MMKV wrapper with JSON helpers + a single `KEYS` registry
      (`paicart_state`, `paicart_banners_v1`, `imageSearchInstances`,
      `paicart_pending_{id}`). Chosen because MMKV is **synchronous**, which is
      what lets Phase 2 keep the original `preloadedState` shape.

### New — `src/lib/events.js`
- [x] `DeviceEventEmitter` wrapper replacing the four
      `document.dispatchEvent(new CustomEvent(...))` channels:
      `fly-to-icon`, `toggle-categories`, `toggle-whatsapp`, `readystatechange`

### `firebase.js` → RNFirebase
- [x] Swap to `@react-native-firebase/{app,auth,firestore,storage}`
- [x] Drop `signInWithPopup` and the dead `singInWithFacebook` (never called)
- [x] Google: `GoogleSignin.signIn()` → `GoogleAuthProvider.credential(idToken)`
      → `signInWithCredential`
- [x] Config comes from `google-services.json` / `GoogleService-Info.plist`,
      not the hardcoded object. RNFirebase persists sessions natively.

### `firebaseUtils.js` (1,185 lines / 56 functions) — import swap + fixes
- [x] Import swap `firebase/*` → `@react-native-firebase/*`
- [x] **Fix 10 `alert()` calls** (web lines 301, 321, 382, 399, 548, 565, 625,
      819, 964, 968) — `alert` does not exist in RN; each is a hard crash.
      Route to `toast` / `Alert.alert`.
- [x] `uploadImage` / `uploadShipForMeFile` take a browser `File` → use
      `putFile(localUri)`; give `uploadImage` a real extension + `contentType`
      (it currently writes extensionless octet-streams)
- [x] `uploadPaymentRequest2` uses `forEach(async …)` — un-awaited fan-out that
      returns before writes land. Convert to `for…of`.

### `imageUtils.js`
- [x] `resizeAndCompressDataUrl` (canvas) → `@bam.tech/react-native-image-resizer`
- [x] `imageSearchInstances` trio (localStorage) → MMKV

### `flyToIcon.js`
- [x] `getBoundingClientRect` + `CustomEvent` → `measureInWindow()` + events.js

---

## Phase 2 — Redux store ✅ 2026-08-29

- [x] Copy all **12 slices verbatim** — every one uses `extraReducers` +
      `addMatcher` on legacy string constants with `reducers: {}`. No
      `createSlice` action creators, no `createAsyncThunk`, nothing web-coupled.
- [x] **`singleProductSlice.js` — port character-for-character.** It is a
      response normalizer inside the reducer and the *only* place the 1688 and
      Taobao product schemas are unified (`num_iid→id`, `title→name`,
      `price→salePrice`, `orginal_price→price`, `skus.sku→variants`). It reads
      the typo'd key `prodct_array` — keep the typo.
- [x] `store/index.js` on MMKV (**synchronous**, so the existing
      `loadFromLocalStorage()` / `preloadedState` shape ports directly)
  - [x] **Whitelist `user`, `cartList`, `wishlist` only.** Persisting everything
        serialises `searchedProducts.products`, `data.products` and
        `singleProduct.product` — full 1688/Taobao payloads with `props_list`
        and description HTML. Storage bomb on mobile.
  - [x] **Debounce the write (~300ms).** Today every dispatch — including every
        `onSnapshot` tick — stringifies the entire root state.
- [x] `actions.js` port, with fixes:
  - [x] `toast.warn` (line 143) doesn't exist — `toast.js` exports `warning`; it
        throws today
  - [x] `addToCartUnsafe` passes `{product}` but the reducer reads
        `action.payload` → silently empties the cart
  - [x] `getAllBannersRedux` localStorage cache → MMKV
  - [x] Drop dead creators: `getAllProductsFirestore`, `fetchSingleProduct`,
        `setImgUrl`

---

**Also done in this phase**
- [x] `react-native-nitro-modules` — undeclared-in-docs peer of MMKV v4; the
      bundle check caught it (`Unable to resolve module react-native-nitro-modules`)
- [x] `scripts/parse-check.js` + `npm run parse:check` — Babel-parses every file
      under `src/` with the project config
- [x] `npm run bundle:check` — full Metro bundle, no native build required

## Phase 3 — Navigation shell & Providers ✅ 2026-08-29

- [x] `Providers.jsx` — auth listener + three `onSnapshot` listeners
      (`users/{uid}`, `carts/{uid}`, `wishlists/{uid}`)
  - [x] **Fix the listener leak.** The cleanup closure is returned from the
        `onAuthStateChanged` callback, whose return value Firebase discards, so
        three listeners stack up on every auth-state change. Benign on web
        (page reloads), compounding in a long-lived native app. Hoist the
        unsubscribes into a ref; clean up from the `useEffect`.
- [x] Bottom tabs — the web `BottomNav` already defines exactly five:
      **Category · Cart · Home · My Orders · WhatsApp**
- [x] Native stack per tab; auth-gated root switch
- [x] `linking` config mapping the original web paths (including the typo'd
      `/pages/terms-and-coditions` and capitalised `/pages/tax-and-Shipping` —
      both are live URLs) plus `paicart://payment-return`
- [x] **Delete rather than port:** `GlobalLoader` (intercepts capture-phase
      document clicks + `composedPath()`; React Navigation handles transitions)
      and `SplashScreen` (gated on `document.readyState` → `react-native-bootsplash`)

---

**Also done in this phase**
- [x] `src/navigation/routes.js` — one registry of 52 routes (name → web path →
      owning tab), read by both the navigators and the linking config
- [x] `src/navigation/screenRegistry.js` — name → component
- [x] `src/screens/**` — 52 placeholder screens via `scripts/gen-screens.js`
      (non-destructive; re-running never overwrites a ported screen), so the
      shell and every deep link are walkable from day one
- [x] `src/theme/colors.js` — raw palette for navigator options / SVG / status bar
- [x] `App.jsx` — GestureHandlerRoot → SafeArea → Providers → NavigationContainer
- [x] `scripts/check-routes.js` + `npm run check:routes`

**Bug caught by the route checker:** the first linking config registered the
redirect targets as synthetic screen names (`LoginAlias`, `BuyForMeAlias`) that
no navigator declared. The bundle still built — it would only have failed when
someone opened one of those links. Redirects are now a path rewrite in
`getStateFromPath`, and `check:routes` fails the build if it regresses.

**Deviation from web, recorded deliberately:** the web's fifth tab opened a
WhatsApp sheet. A phone has no footer, so that tab is **More** here and houses
everything the web `Footer` linked to (services, policy pages, profile), with
WhatsApp at the top of it and on the floating button.

### Tab → screen counts

| Tab | Screens |
|---|---|
| HomeTab | 7 |
| CategoryTab | 1 |
| CartTab | 8 |
| OrdersTab | 17 |
| MoreTab | 16 |
| Root (auth + payment return) | 4 |

## Phase 4 — Design system & shared components ✅ 2026-08-29

- [x] `src/theme/` tokens module (mirrors tailwind.config.js for inline styles)
- [x] Shared list primitives — `OrderCard`, `Collapsible`, `StatusBadge`,
      `Tabs`, `EmptyState`, skeletons. **Build these properly:** the dashboard
      screens in Phases 9–10 are ~4,000 lines that mostly repeat them.
- [x] `PriceTag` — unify `৳` vs `Tk`. It already exists as the intended single
      formatter but most web call sites bypass it.
- [x] `PhoneInput` · [ ] `CopyIdButton` (→ `@react-native-clipboard/clipboard`)
- [x] `Avatar` (→ image picker + `putFile`)
- [x] `ToastProvider` (renderer only)
- [x] `CategoryDrawer` — the 11-category `CATEGORY_TREE` is a hardcoded
      constant, copies verbatim
- [x] `DashboardLayout` · [ ] `FloatingWhatsApp` (→ `Linking.openURL('https://wa.me/8801629773885')`)
- [x] `FlyToIconAnimation` — full Reanimated rewrite
- [x] `ImageCropModal` — **deleted, not ported.** The web shipped 182 lines of
      pointer-driven drag handles + canvas.drawImage; every platform already has
      a native cropper people know how to use, so it is now `cropImage()` in
      `lib/picker.js`.
- [x] `InvoiceShell` (`react-to-print`+`html2canvas`+`jspdf` → HTML→PDF + share)
- [x] `ComplaintModal` · [ ] `RefundApplyModal` · [ ] `PrePaymentModal` · [ ] `OrderPaymentModal`
- [x] `Footer` → content on a **More** screen (a footer is a web idiom)

---

**Also done in this phase**
- [x] `lib/payments.js` — `BANK_ACCOUNTS` moved out of the route folder that
      `PrePaymentModal` was importing *upward* from; captures the two distinct
      bKash rates (**2% manual send** vs **1.5% gateway**) which are not
      interchangeable
- [x] `lib/partialOffers.js` — the "Pay More, Get More" tier maths, previously
      duplicated between the two payment modals. Enforces the
      `maximumDiscountAmount` cap that `orderMath.getOfferDiscount()` documents
      as a past source of mismatched figures.
- [x] `lib/picker.js` — one wrapper for the eight web `<input type="file">`
      call sites, plus `cropImage()`
- [x] `payments/`: `BankPicker` (with a copy button on the account number),
      `ManualBkashTotal`, `ScreenshotUpload`, `TierPicker`
- [x] `data/`: `categoryTree.js` (extracted verbatim), `dashboardNav.js`,
      `contact.js` (the phone number appeared in five places on the web)
- [x] `scripts/import-probe.js` + `npm run bundle:all` / `npm run verify`

**Verification gap closed:** `bundle:check` only bundles what the current
screens reach, so a component written in one phase but not wired up until a
later one sat unverified in between. `bundle:all` generates an entry importing
every module under `src/` — **120 modules** currently — so a bad import path or
missing native package surfaces in the phase that introduced it.

**`npm run verify`** = parse-check + route-check + bundle-all. Run it at the end
of every phase.

## Phase 5 — Auth ✅ 2026-08-29

- [x] Split web `login/page.jsx` (604 lines) → Login / Register / OTP screens
      sharing a tab header
- [x] Google sign-in via `@react-native-google-signin`
- [x] OTP against `https://paicart.com/api/v1/otp-sms-send/{phone}`, ported as-is
  - [x] **Fix the un-awaited `verifyOtpRedux`** — today it toasts "OTP verified!"
        and navigates even when the code is wrong
- [x] Forgot Password (web has two implementations — consolidate to one)
- [x] Change Password (`reauthenticateWithCredential` → `updatePassword`)
- [x] `returnTo` (a `useSearchParams` value on web) → navigation param

---

**Screens:** `auth/Login` (Sign In / Register / Phone tabs in one screen, as on
the web), `auth/Register` (kept as a route so old links resolve — opens Login on
its Register tab instead of dropping people on Sign In), `auth/ForgotPassword`,
`dashboard/UserSecurity`.

**Also done**
- [x] `ui/Field` — labelled input with show/hide password
- [x] `ui/OtpBoxes` — six boxes with `autoComplete="sms-otp"` /
      `textContentType="oneTimeCode"` so the keyboard offers the code straight
      from the SMS, plus paste-spreading and backspace traversal

**The OTP bug, fixed.** The web did `dispatch(verifyOtpRedux(...))` without
awaiting it, then toasted "OTP verified!" and navigated — **a wrong code still
let people in**. `verifyOtp` now returns null on both failure paths (expired /
incorrect), `verifyOtpRedux` resolves false and no longer overwrites the current
user, and the screen awaits it. The underlying security weakness is unchanged
and remains issue #3 below, by decision.

**Google cancellation** is not an error: `signInWithGoogle` resolves null when
the sheet is dismissed, and the screen neither toasts nor navigates.

**Password change** is unavailable to phone-OTP users — those sessions are
anonymous and carry no email, so there is no credential to reauthenticate with.
The screen says so rather than failing obscurely.

## Phase 6 — Storefront browse ✅ 2026-08-29

- [x] **Home** (774 lines) — banner carousel, campaign cards, services row,
      ~40-icon category grid, N independent `CategorySection` fetches
      (`GET alg.com.bd/api/products/search`, 12s timeout, **2 retries with 1.5s
      backoff — keep the retry logic**), trust bar, Bengali FAQ accordion
- [x] **Collection** (755 lines) — tri-mode: keyword / vendor (`?shop_name=`) /
      image search (`id = img_uploads`). `IntersectionObserver` infinite scroll
      → `FlashList onEndReached`; keep the Redux result cache and scroll
      restoration; crop-and-re-search loop via the picker.
- [x] **Search** (191 lines) — Taobao keyword search against **`alglimited.com`**
      (a different host from the rest of the app); `react-infinite-scroll-component`
      → `FlashList`

---
- [x] **Wishlist** — also ported here since it reuses the same grid

**Also done**
- [x] `lib/api.js` — every non-Firebase endpoint in one module. On the web
      these were inline at ~20 call sites, which is how the Taobao search ended
      up on a different host without anyone noticing and how a bearer token
      ended up in a page component. Carries `getWithRetry` (2 retries, 1.5s
      apart) that the homepage shelves depend on.
- [x] `components/ProductCard.jsx` — the tile was redeclared in three web
      files, which is why the wishlist heart behaved differently on each
- [x] `components/SearchBar.jsx` — text + image search, including the 35-char
      keyword-vs-URL cut-off and `get1688ProductId` (`?offerId=` / `/123.html`)
- [x] `data/homeContent.js` — extracted verbatim: 8 Bengali FAQs, 14
      prohibited-goods entries, 16 quick categories, 6 product shelves

**Not carried over from the web Header:** the typewriter placeholder (it wrote
`el.placeholder` directly to dodge re-rendering 15 icons per keystroke) and the
scroll-hide behaviour (it set `dataset` attributes on the header element).
Neither has a native analogue worth reproducing.

**`REDX_PROXY_BASE` is deliberately `null`.** The RedX courier calls degrade to
a default rather than embedding the hardcoded bearer token the web page carried
— an APK is trivially unpacked and the token cannot be rotated without a store
release. See issue #1.

## Phase 7 — Product detail ✅ 2026-08-29

- [x] `product/[id]` — **5,343 lines, 5× the next-largest file**, ~40 `useState`
      hooks in the page component alone. **Split into real sub-components**
      rather than transcribing:
  - [x] `MediaDownloadModal` · [ ] `ColorVariantViewer` · [ ] `PriceTierRow`
  - [x] `VariantSelector` · [ ] `SizeWeightTable` · [ ] `ShippingMethodCard`
  - [x] `ShippingRateModal` · [ ] `SellerStatusBadges` · [ ] gallery
  - [x] tabbed description — HTML sanitised via `DOMParser` on web; render in a
        WebView with `cdn()` applied, or parse to native nodes
  - [x] 5 alg.com.bd endpoints: detail, category, vendor-products, related
        search, debounced shipping quote
- [x] `1688/[id]` (764 lines)
- [x] `taobao/[id]` (287 lines) — **note:** renders purely from Redux and
      fetches nothing, so a deep link currently shows a permanent spinner.
      Fix by fetching on cold start.
- [x] Unauthenticated Buy Now intent (`sessionStorage` on web) → MMKV + nav param

---

**The 5,343 lines did not survive as 5,343 lines.** Most of that file was
domain logic tangled into JSX. It came out as three tested modules:

- [x] `lib/freight.js` — the China→Bangladesh rate model. Two rules here are
      load-bearing and were easy to lose: **air's 0–0.3 kg band is a flat
      parcel charge, not a per-kg rate** (costing it by weight bills a 0.2 kg
      parcel a fraction of the real minimum), and **dangerous goods price from
      the Hong Kong `_hk` tier, falling back to the category's own non-DG price
      — never to the platform default**, or an unpriced DG slot reads as
      cheaper than the regular one. Unit-checked against 9 cases.
- [x] `lib/product.js` — DG classification, variant lookup, tier pricing, MOQ.
      The DG regexes are copied verbatim including their exclusions: a
      battery-**free** mouse must not be flagged, and a bare "fake" must not
      read as a replica (fake eyelashes / nails / flowers are ordinary
      listings). Getting this wrong is not cosmetic — it selects the `_hk`
      freight tier and changes what the customer is quoted. Unit-checked
      against 14 cases.
- [x] `components/product/`: `VariantSelector`, `ShippingRateModal`

**`normalizeProperties` matters.** A variant's `properties` string joins its
segments in whatever order the source SKU's attribute list happened to be in —
it is *not* always colour-first. Every lookup compares the **sorted** segment
set, or variants silently fail to match.

**Two deliberate deviations, both fixing web bugs:**
- `taobao/:id` **now fetches on a cold start.** The web rendered it purely from
  Redux, so a deep link or a refresh showed a permanent spinner — it only
  worked when arriving from the search screen.
- `/1688/:id` **forwards to `/product/:id`** rather than being ported as a
  second copy. The two rendered the same upstream product from the same
  endpoints; keeping two divergent implementations of the most complex screen
  in the app is how they drifted apart. The route is kept so old links resolve.

**The description is a WebView.** It is raw seller HTML with inline `<img>`
tags; `cdnHtml()` rewrites the CDN host inside it first. A native
re-implementation would have to handle arbitrary vendor markup.

## Phase 8 — Cart & checkout ✅ 2026-08-30

- [x] **Cart** (1,272 lines) — per-shop/item/SKU selection tree, quantity
      steppers that re-derive the wholesale tier price, per-item live shipping
      quotes, metadata backfill, pre-checkout stock verification (parallel
      `Promise.all` re-fetch) + drop-out-of-stock modal
- [x] **Place Order** (1,015 lines) — **this is the checkout page**; there is no
      `src/app/checkout` in the web app. Address from `addressBook`, per-shop
      RedX delivery charge, coupon lookup, per-item campaign-vs-site discount,
      one order document written per shop, then `PrePaymentModal`.
  - [x] ⚠️ **`REDX_TOKEN` is a hardcoded bearer token** (web line 36). Do not
        ship it in the bundle — an APK is trivially unpacked. Put the charge
        calculator behind a configurable base URL; backend task logged below.
- [x] Payment modals — replace `window.open(bkashURL,'_self')` with
      `react-native-inappbrowser-reborn` returning to `paicart://payment-return`
  - [x] **Preserve the money rules exactly:** default amount
        `initialAmount ?? (totalPaid === 0 ? round(totalDue * 0.6) : totalDue)`;
        first payment ≥60% of due unless a tier was taken; bKash fee 1.5%
- [x] Order Success screens

---

**Two tested modules carry the rules both the cart and the checkout depend on:**

- [x] `lib/cart.js` — the three stacked quantity constraints: **batch** (a pack
      size that is also the floor, and every quantity snaps to a multiple),
      **MOQ** (a per-PRODUCT minimum counted across every variant, so one
      line's floor depends on what its siblings hold), and **stock**.
      `availableFor()` returns null when the upstream gives nothing to judge
      by — an unknown must never block a legitimate order. 17 cases checked.
- [x] `lib/checkout.js` — basket totals, coupon caps, the pre-order block
      reasons, and `buildOrderDocs`. **Discount precedence matters:** a per-item
      `campaignDiscountPercent` supersedes the site-wide discount for that item,
      and a basket can mix both — so it is summed per item, never applied once
      to the basket total. 15 cases checked.

**Screens:** `Cart` (selection tree, batch-aware steppers, live stock re-check
with a drop-and-continue sheet), `PlaceOrder` (address, per-shop RedX charge,
coupon, per-seller notes, one order document per shop, then `PrePaymentModal`),
plus the success and legacy detail screens.

**Duplicates forwarded rather than re-ported:** `/dashboard/pages/cart` (a
78-line simplified copy of the main cart) and `/dashboard/pages/orders/:orderId`
(a thinner copy of the order detail). Both routes still resolve.

**The double-submit guard is preserved.** Every shop builds its own `orderId`
from `Math.random()`, so a second run creates a whole extra order rather than
colliding harmlessly. `submittingRef` is cleared only on failure — on success
it stays set, because the order exists.

**RedX delivery charge** returns null while no proxy exists, so the default 100
stands rather than the order being blocked. See issue #1.

## Phase 9 — Dashboard: orders & product requests ✅ 2026-08-30

- [x] Overview (468 lines) — `getOrderStatCounts` / `getShipStatCounts` use
      `getCountFromServer` aggregations; **needs composite Firestore indexes**
- [x] My Orders list (906) + detail (516)
- [x] My Product Requests list (943, has its own inline `BookingPaymentModal`)
      + detail (189)
- [x] My Delivered · [ ] My Forwarding Parcel
- [x] Status tabs driven by `orderMath.getOrderBucket()` — reuse, don't rewrite
- [x] `?tab=` params (read via `window.location.search` on web) → nav params

---

**Also done**
- [x] `lib/orderTabs.js` — the Refunds cross-cut (a flag an order carries while
      sitting in any bucket, not a stage of its own) and the 72-hour unpaid
      window. 12 cases checked against `getOrderBucket`.
- [x] `components/orders/`: `OrderCard`, `RequestCard`, `FilteredOrderList`
      — the web repeated this markup across four screens with three
      independent collapsibles each
- [x] `payments/BookingPaymentModal` — the web declared this **inline inside**
      the my-request page rather than as a component, which is how it drifted
      from the order payment modal. It has no tier step: the partial-payment
      offer applies to orders only.

**Delivered now uses `getOrderBucket`.** The web filtered on
`status === 'Delivered'`, which missed orders that reached
`shipmentStatusScore` 7 without the string being written.

⚠️ **The 72-hour auto-cancel is still client-side**, exactly as on the web: an
order is only swept once a client opens the list with it still present. There is
no server cron in this project. It belongs in a Cloud Function — issue #9.

## Phase 10 — Ship For Me ✅ 2026-08-30

- [x] **`_shared.jsx` (1,026 lines) first — it unblocks three routes.** Exports
      `getTotal`, `calcRate`, `canPayShipment`, `STEPS`/`STEP_ICONS`,
      `EditModal`, `StartShippingModal`, `PaymentModal`, `ShippingInfoCard`,
      `ShipmentProgress`, `BANK_ACCOUNTS`, `DocxPreviewModal`
  - [x] Move `BANK_ACCOUNTS` into `src/lib/` — `PrePaymentModal` currently
        imports it from a route folder
  - [x] `DocxPreviewModal` uses `docx-preview`'s `renderAsync` (DOM-only) →
        WebView viewer or external-app handoff via `Linking`
- [x] Ship For Me request form (523 lines — dynamic tracking-number field array
      + 3 file uploads)
- [x] my-request list (798) + detail (410)
- [x] my-delivered · [ ] my-forwarding-parcel

---

**Also done**
- [x] `lib/shipForMe.js` — `getTotal`, `calcRate`, `canPayShipment`, the
      7-step timeline and its sea relabelling. **`calcRate` is a different
      table from `lib/freight.js`**: that one prices goods bought through the
      site, this prices a parcel the customer shipped to our China warehouse
      themselves. Air's 0–0.3 kg band is again flat, and its `perKg` there is a
      display figure (`parcel × 3.333333`), not a rate anything is billed at.
      16 cases checked.
- [x] `components/shipping/`: `ShipmentCard`, `ShipmentProgress`,
      `ShipmentPaymentModal`, `FilteredShipmentList`
- [x] `ui/Select` (there is no `<select>` in React Native, and a picker wheel
      handles long lists badly on Android — so it is a sheet of rows) and
      `ui/FileField`

**The stepper is vertical.** Seven milestones do not fit across a phone the way
the web's horizontal stepper did. Only the ready-for-departure milestone changes
label and icon by freight mode; its **stored** status value stays
`'Ready for fly'` either way — the admin panel writes that literal.

**`DocxPreviewModal` is not ported.** It used `docx-preview`'s `renderAsync`,
which is DOM-only. Documents open in whatever app the phone has for them via
`Linking` — simpler and more capable than an in-app renderer.

**`BANK_ACCOUNTS` moved to `lib/payments.js`** in Phase 4, resolving the web's
inversion where `PrePaymentModal` imported it *upward* out of a route folder.

## Phase 11 — Invoices, refunds, points, profile ✅ 2026-08-30

- [x] Shipment invoice · [ ] dual-mode order/product-request invoice → PDF + share
- [x] Refund screen (3-tab switcher: orders / product requests / shipments)
- [x] Points (`buyerLevel.js`, thresholds 0 / 100k / 300k / 500k Tk)
- [x] User Information (586 lines) — Personal / Company / Address Book tabs,
      with the RedX `areas` district→area dropdown that `place-order` later
      reads for `delivery_area_id`

---

**Invoices render twice from one source.** Each invoice screen passes the same
data to the native view and to `toHtml()` for the PDF, so the document and the
screen cannot disagree on the figures.

**`OrderInvoice` falls back rather than requiring its flag.** The web read a
query-string flag to decide whether the id named an order or a product request.
A deep link from an email may not carry it, so it tries the order first and
falls back to the request.

**Address book:** the RedX area object is stored whole on the address —
`place-order` later reads `area.id` as `delivery_area_id`. Exactly one address
is default at a time, the first one added becomes it automatically (checkout
has nothing to ship to otherwise), and deleting the default promotes another.
When the RedX proxy is absent the area list is empty and the screen says so
instead of blocking the save.

## Phase 12 — Public & static screens ✅ 2026-08-30

- [x] Track Order (391 lines, animated vertical timeline). **Note:**
      `getOrderOrShipmentRequest` does up to **6 Firestore round trips** per
      lookup — worth optimising.
- [x] Cost Calculator (293) · [ ] Buy For Me (383)
- [x] Notices list + detail
- [x] About · [ ] Contact · [ ] FAQ · [ ] How To Order
- [x] Privacy Policy · [ ] Refund Policy · [ ] Terms
- [x] Tax & Shipping — contains an HTML `<table>` needing a native replacement

---
- [x] `PaymentReturn` — the bKash deep-link landing screen

**All 52 screens are ported. `npm run check:routes` reports 0 stubs.**

**Static copy is extracted, not retyped.** `data/legalContent.js` and
`data/staticContent.js` are generated from the web pages so the Bengali legal
text cannot drift. Counts were checked against the source: privacy 12 sections
/ 20 paragraphs, refund 7 sections / **35 items**, terms 2 sections /
**18 items**, plus 8 FAQs, 14 prohibited-goods entries, 4 about stats, 4
contact rows, 4 how-to-order steps.

⚠️ **A first extraction pass silently dropped all 53 `<Item>` clauses** from the
refund policy and terms — the regex only captured `<P>` paragraphs. Caught by
comparing item counts against `grep -c '<Item'` in the source. If this content
is ever regenerated, check the counts again.

**Tax & Shipping** was an HTML `<table>` on the web; on a phone that needs
horizontal scrolling, so each weight band is a card with its figures stacked.

**`PaymentReturn` never claims a success it cannot verify.** The gateway is the
authority on the result and nothing is written client-side; a redirect carrying
no status is reported as *pending*, not success.

## Phase 13 — Native config & build

Configuration is **done**; the build is not, by instruction. The three items
below are blocked on things only you can do, then Android is one command.

### Done in code
- [x] Android permissions — `CAMERA`, `READ_MEDIA_IMAGES` (Android 13+), and
      `READ_EXTERNAL_STORAGE` capped at API 32 for older devices
- [x] `<queries>` for `https` VIEW intents, so WhatsApp hand-off and supplier
      document links resolve on Android 11+
- [x] Deep-link intent filters: the `paicart://` scheme (which carries
      `paicart://payment-return`) and `https://paicart.com` /
      `https://www.paicart.com` with `autoVerify`
- [x] `com.google.gms:google-services` plugin **4.5.0** wired into both gradle
      files (matching the version `@react-native-firebase` itself pins under
      `sdkVersions.android.gmsGoogleServicesGradle`)
- [x] **Firebase BoM deliberately NOT added.** The Firebase Android setup docs
      tell you to put `implementation platform('com.google.firebase:firebase-bom:34.18.0')`
      and per-product SDK dependencies in the app-level gradle file. That guidance
      is for native Android apps using the Firebase SDK directly. **RNFirebase
      already does it** — `@react-native-firebase/app` applies
      `firebase-bom:34.18.0` (the same version) and each of `/auth`,
      `/firestore`, `/storage` declares its own product dependency against it.
      Adding them by hand is redundant and risks a version conflict. Only the
      google-services *plugin* half of those instructions applies to us.
- [x] iOS `Info.plist` — camera / photo-library / photo-add usage strings,
      the `paicart` URL scheme, and `LSApplicationQueriesSchemes`
- [x] `usesCleartextTraffic` is already templated; `cdn()` forces `https:`
      anyway, so no HTTP image should reach the network layer

### Blocked on you
- [x] **Android app registered** as `com.paicart.app` in the `paicart` project;
      `android/app/google-services.json` is in place (2026-08-30).
- [x] **Google Sign-In web client id wired** — `GOOGLE_WEB_CLIENT_ID` in
      `src/lib/firebase.js`, called from `App.jsx` at module scope.
- [ ] ⚠️ **Add a SHA-1 fingerprint for `com.paicart.app`.** The supplied
      `google-services.json` has **no `client_type: 1` (Android) OAuth client**
      for our package — only the `client_type: 3` (web) one. That means no
      signing certificate is registered, and **Google Sign-In will fail on
      Android** with `DEVELOPER_ERROR` until one is added. Note the file's
      *other* client, the older `com.paicart`, does have a `client_type: 1`
      entry — so this is specific to the new package, not the project.

      Firebase console -> Project settings -> Your apps -> the
      `com.paicart.app` Android app -> Add fingerprint. Debug keystore SHA-1
      (`android/app/debug.keystore`):

      ```
      5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25
      ```

      Add the **release** keystore's SHA-1 too before shipping, and the Play
      App Signing SHA-1 from the Play Console if you use it — each signing
      certificate needs its own fingerprint. Re-download
      `google-services.json` afterwards; it should then carry a
      `client_type: 1` entry for `com.paicart.app`.
- [ ] **iOS:** register the `com.paicart.app` bundle and drop
      `GoogleService-Info.plist` into `ios/Paicart/`. Not yet supplied.
- [ ] **Firestore composite indexes** for the dashboard stat counts
      (`getOrderStatCounts` / `getShipStatCounts` use `getCountFromServer`):
      `ordersApi` on (userId + paymentStatus), (userId + shipmentStatusScore),
      (userId + paymentStatus + orderStatus); `shipForMe` likewise. Firestore
      will print a ready-made index link the first time each query runs.

### Then
- [ ] App icons and `react-native-bootsplash` assets
- [ ] `npx react-native run-android`
- [ ] iOS — blocked until macOS ≥14 + Xcode ≥16 (see the constraint above)

## Verification

The web app has **no test suite** (CI passes on build success alone; QA is
manual), so verification is staged — which is why the build is deferred:

1. **Per phase:** `npm run bundle:check` bundles clean. Proves the module graph
   resolves without a native build.
2. **After Phase 2:** log the rehydrated store on cold start; confirm only
   `user` / `cartList` / `wishlist` persist.
3. **After Phase 13:** walk the critical path against live Firebase —
   register/login (all three methods) → home → keyword search → image search →
   product detail → add to cart → place order → payment modal → order lands in
   My Orders in the right tab bucket → track order. Then ship-for-me submit →
   my-request → invoice PDF.
4. **Watch specifically for:** product images 403ing (the `Referer: ''` header),
   the Firestore listener count staying flat across repeated login/logout, and
   MMKV writes not stuttering the UI during `onSnapshot` bursts.

---

## Known issues / deferred

Carried over from the web app, or created by the port. None block the migration.

| # | Issue | Action |
|---|---|---|
| 1 | **`REDX_TOKEN` hardcoded** in place-order | Must move server-side before release — an APK is trivially unpacked |
| 2 | **bKash return URL** | paicart.com must honour `paicart://payment-return` |
| 3 | **Phone OTP is client-verified** | SMS gateway returns the OTP to the client; it is written to `otpSms/{number}`, compared client-side with `==`, and the session is `signInAnonymously()` — so the Firebase uid never matches the `users/{phone}` profile doc. Ported as-is by decision. Revisit with Firebase Phone Auth or a custom-token Cloud Function. |
| 4 | `otpSms` cleanup is a 60s `setTimeout` | Won't fire if the app is backgrounded. Use a Firestore TTL policy or Cloud Function. |
| 5 | `GenerateUniqueID()` is 5 chars | Collision-prone; the code recurses on collision |
| 6 | `incrementUserCountByOne()` | Racy read-modify-write, not a transaction |
| 7 | `getOrderOrShipmentRequest` | Up to 6 Firestore round trips per tracking lookup |
| 8 | iOS build blocked | macOS 12 + no Xcode; needs macOS ≥14 + Xcode ≥16 |
| 9 | 72h unpaid auto-cancel runs client-side | Carried over from the web. An order is only cancelled once a client loads the orders list with it present. Belongs in a Cloud Function. |

### `../paicart-nextjs15/CLAUDE.md` is stale — corrections found during audit

- `firebaseUtils.js` is **1,185 lines / 56 functions**, not "~400 lines".
- The collection list names `bookings`, `shipments`, `shipForMeRequests`,
  `productRequests` — **none of these exist**. The real names are
  **`bookingRequest`, `shipForMe`, `shipForMeList`, `ordersApi`**.
- The alicdn CDN rewrite is **not** in `next.config.mjs`. It is 14 copy-pasted
  JS call sites (now consolidated into `src/lib/cdn.js`).
- There is **no `src/app/checkout`** — checkout is `/dashboard/pages/place-order`.
- The Header has **no categories mega-menu**; categories live in a separate
  persistent left `CategoryDrawer`.

### Firestore collections actually used (22)

`users`, `admins`, `userCount`, `carts`, `wishlists`, `orders`, `ordersApi`,
`bookingRequest`, `shipForMe`, `shipForMeList`, `banners`, `campaigns`,
`notices`, `homeCategories`, `warehouses`, `coupons`, `intros`, `complain`,
`refundRequest`, `paymentRequest`, `paymentRequestApi`, `otpSms`,
`partial-payments`, `site-discount`, `Currency`, `1688Category`,
`d2d-rates-{freightType}-{country}` (dynamic name).

### External hosts

`alg.com.bd` (product/search API, 7 endpoints) · `alglimited.com` (Taobao search
only) · `paicart.com/api/v1` (`otp-sms-send`, `bkash/create-payment`) ·
`openapi.redx.com.bd` (courier charge calculator + areas) ·
`global-img-cdn.1688.com` · `wa.me`
