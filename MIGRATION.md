# Paicart — Next.js → React Native Migration

Port of `../paicart-nextjs15` (Next.js 16, ~28,000 lines, 53 route files, 21
components, 12 Redux slices) to a native mobile app on **the same Firebase
project (`paicart`)** with full feature parity.

> **How to use this file.** Work phases in order — each layer is finished before
> the next depends on it. Tick `- [x]` as items land and stamp the phase heading
> with a date. A resumed session should read this file first and continue from
> the first unticked box, not restart.

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

## Phase 6 — Storefront browse

- [ ] **Home** (774 lines) — banner carousel, campaign cards, services row,
      ~40-icon category grid, N independent `CategorySection` fetches
      (`GET alg.com.bd/api/products/search`, 12s timeout, **2 retries with 1.5s
      backoff — keep the retry logic**), trust bar, Bengali FAQ accordion
- [ ] **Collection** (755 lines) — tri-mode: keyword / vendor (`?shop_name=`) /
      image search (`id = img_uploads`). `IntersectionObserver` infinite scroll
      → `FlashList onEndReached`; keep the Redux result cache and scroll
      restoration; crop-and-re-search loop via the picker.
- [ ] **Search** (191 lines) — Taobao keyword search against **`alglimited.com`**
      (a different host from the rest of the app); `react-infinite-scroll-component`
      → `FlashList`

---

## Phase 7 — Product detail ⭐ largest single item

- [ ] `product/[id]` — **5,343 lines, 5× the next-largest file**, ~40 `useState`
      hooks in the page component alone. **Split into real sub-components**
      rather than transcribing:
  - [ ] `MediaDownloadModal` · [ ] `ColorVariantViewer` · [ ] `PriceTierRow`
  - [ ] `VariantSelector` · [ ] `SizeWeightTable` · [ ] `ShippingMethodCard`
  - [ ] `ShippingRateModal` · [ ] `SellerStatusBadges` · [ ] gallery
  - [ ] tabbed description — HTML sanitised via `DOMParser` on web; render in a
        WebView with `cdn()` applied, or parse to native nodes
  - [ ] 5 alg.com.bd endpoints: detail, category, vendor-products, related
        search, debounced shipping quote
- [ ] `1688/[id]` (764 lines)
- [ ] `taobao/[id]` (287 lines) — **note:** renders purely from Redux and
      fetches nothing, so a deep link currently shows a permanent spinner.
      Fix by fetching on cold start.
- [ ] Unauthenticated Buy Now intent (`sessionStorage` on web) → MMKV + nav param

---

## Phase 8 — Cart & checkout

- [ ] **Cart** (1,272 lines) — per-shop/item/SKU selection tree, quantity
      steppers that re-derive the wholesale tier price, per-item live shipping
      quotes, metadata backfill, pre-checkout stock verification (parallel
      `Promise.all` re-fetch) + drop-out-of-stock modal
- [ ] **Place Order** (1,015 lines) — **this is the checkout page**; there is no
      `src/app/checkout` in the web app. Address from `addressBook`, per-shop
      RedX delivery charge, coupon lookup, per-item campaign-vs-site discount,
      one order document written per shop, then `PrePaymentModal`.
  - [ ] ⚠️ **`REDX_TOKEN` is a hardcoded bearer token** (web line 36). Do not
        ship it in the bundle — an APK is trivially unpacked. Put the charge
        calculator behind a configurable base URL; backend task logged below.
- [ ] Payment modals — replace `window.open(bkashURL,'_self')` with
      `react-native-inappbrowser-reborn` returning to `paicart://payment-return`
  - [ ] **Preserve the money rules exactly:** default amount
        `initialAmount ?? (totalPaid === 0 ? round(totalDue * 0.6) : totalDue)`;
        first payment ≥60% of due unless a tier was taken; bKash fee 1.5%
- [ ] Order Success screens

---

## Phase 9 — Dashboard: orders & product requests

- [ ] Overview (468 lines) — `getOrderStatCounts` / `getShipStatCounts` use
      `getCountFromServer` aggregations; **needs composite Firestore indexes**
- [ ] My Orders list (906) + detail (516)
- [ ] My Product Requests list (943, has its own inline `BookingPaymentModal`)
      + detail (189)
- [ ] My Delivered · [ ] My Forwarding Parcel
- [ ] Status tabs driven by `orderMath.getOrderBucket()` — reuse, don't rewrite
- [ ] `?tab=` params (read via `window.location.search` on web) → nav params

---

## Phase 10 — Ship For Me

- [ ] **`_shared.jsx` (1,026 lines) first — it unblocks three routes.** Exports
      `getTotal`, `calcRate`, `canPayShipment`, `STEPS`/`STEP_ICONS`,
      `EditModal`, `StartShippingModal`, `PaymentModal`, `ShippingInfoCard`,
      `ShipmentProgress`, `BANK_ACCOUNTS`, `DocxPreviewModal`
  - [ ] Move `BANK_ACCOUNTS` into `src/lib/` — `PrePaymentModal` currently
        imports it from a route folder
  - [ ] `DocxPreviewModal` uses `docx-preview`'s `renderAsync` (DOM-only) →
        WebView viewer or external-app handoff via `Linking`
- [ ] Ship For Me request form (523 lines — dynamic tracking-number field array
      + 3 file uploads)
- [ ] my-request list (798) + detail (410)
- [ ] my-delivered · [ ] my-forwarding-parcel

---

## Phase 11 — Invoices, refunds, points, profile

- [ ] Shipment invoice · [ ] dual-mode order/product-request invoice → PDF + share
- [ ] Refund screen (3-tab switcher: orders / product requests / shipments)
- [ ] Points (`buyerLevel.js`, thresholds 0 / 100k / 300k / 500k Tk)
- [ ] User Information (586 lines) — Personal / Company / Address Book tabs,
      with the RedX `areas` district→area dropdown that `place-order` later
      reads for `delivery_area_id`

---

## Phase 12 — Public & static screens

- [ ] Track Order (391 lines, animated vertical timeline). **Note:**
      `getOrderOrShipmentRequest` does up to **6 Firestore round trips** per
      lookup — worth optimising.
- [ ] Cost Calculator (293) · [ ] Buy For Me (383)
- [ ] Notices list + detail
- [ ] About · [ ] Contact · [ ] FAQ · [ ] How To Order
- [ ] Privacy Policy · [ ] Refund Policy · [ ] Terms
- [ ] Tax & Shipping — contains an HTML `<table>` needing a native replacement

---

## Phase 13 — Native config & build ⛔ do not start until 0–12 are done

- [ ] Register Android (`com.paicart.app`) + iOS apps in the **existing
      `paicart` Firebase project**
- [ ] Add `google-services.json` + `GoogleService-Info.plist`
- [ ] Permissions (camera, photo library)
- [ ] `usesCleartextTraffic` / ATS for any surviving `http:` image URLs
- [ ] Deep-link intent filters + associated domains
- [ ] App icons + `react-native-bootsplash`
- [ ] Create the Firestore composite indexes for the stat-count aggregations
- [ ] **Android build** (`npx react-native run-android`)
- [ ] iOS build — blocked until macOS ≥14 + Xcode ≥16

---

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
