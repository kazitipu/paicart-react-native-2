/* ─── Route registry ───
 *
 * One table, two consumers: the stack navigators and the deep-linking config.
 * Keeping them together is what stops a screen being reachable in-app but not
 * by URL (or the reverse), which is easy to do when the paths are spelled out
 * separately in both places.
 *
 * `path` is the ORIGINAL web URL. Existing paicart.com links — in emails, SMS,
 * the admin panel, anything already in the wild — must keep working, so two
 * legacy spellings are preserved deliberately and must not be "corrected":
 *
 *   /pages/terms-and-coditions   (typo: "coditions")
 *   /pages/tax-and-Shipping      (capital S)
 *
 * `tab` names the bottom tab a screen belongs under. Screens with no `tab`
 * live in the root modal/full-screen stack.
 */

export const TABS = {
  CATEGORY: 'CategoryTab',
  CART: 'CartTab',
  HOME: 'HomeTab',
  ORDERS: 'OrdersTab',
  MORE: 'MoreTab',
};

/* name -> { path, tab } */
export const ROUTES = {
  /* ── Storefront ── */
  Home: { path: '', tab: TABS.HOME },
  Collection: { path: 'collection/:id', tab: TABS.HOME },
  Product: { path: 'product/:id', tab: TABS.HOME },
  Product1688: { path: '1688/:id', tab: TABS.HOME },
  ProductTaobao: { path: 'taobao/:id', tab: TABS.HOME },
  TaobaoSearch: { path: 'pages/search', tab: TABS.HOME },
  Wishlist: { path: 'wishlist', tab: TABS.HOME },
  Categories: { path: 'categories', tab: TABS.CATEGORY },

  /* ── Cart & checkout ──
     Checkout is /dashboard/pages/place-order — there is no /checkout route. */
  Cart: { path: 'cart', tab: TABS.CART },
  PlaceOrder: { path: 'dashboard/pages/place-order', tab: TABS.CART },
  LegacyCart: { path: 'dashboard/pages/cart', tab: TABS.CART },
  PlaceOrderSuccess: { path: 'dashboard/pages/order-success', tab: TABS.CART },
  OrderSuccess: { path: 'order-success', tab: TABS.CART },
  OrderSuccessDetail: { path: 'order-success/:id', tab: TABS.CART },
  LegacyOrderDetail: { path: 'dashboard/pages/orders/:orderId', tab: TABS.CART },
  LegacyOrderLogistics: { path: 'dashboard/pages/orderslogistics/:orderId', tab: TABS.CART },

  /* ── Dashboard ── */
  DashboardOverview: { path: 'pages/dashboard', tab: TABS.ORDERS },
  BuyShipMyOrders: { path: 'pages/dashboard/buy-and-ship-for-me/my-orders', tab: TABS.ORDERS },
  BuyShipOrderDetail: { path: 'pages/dashboard/buy-and-ship-for-me/my-orders/:orderId', tab: TABS.ORDERS },
  BuyShipMyRequests: { path: 'pages/dashboard/buy-and-ship-for-me/my-request', tab: TABS.ORDERS },
  BuyShipRequestDetail: { path: 'pages/dashboard/buy-and-ship-for-me/my-request/:orderId', tab: TABS.ORDERS },
  BuyShipDelivered: { path: 'pages/dashboard/buy-and-ship-for-me/my-delivered', tab: TABS.ORDERS },
  BuyShipForwarding: { path: 'pages/dashboard/buy-and-ship-for-me/my-forwarding-parcel', tab: TABS.ORDERS },
  ShipMyRequests: { path: 'pages/dashboard/ship-for-me/my-request', tab: TABS.ORDERS },
  ShipRequestDetail: { path: 'pages/dashboard/ship-for-me/my-request/:bookingId', tab: TABS.ORDERS },
  ShipDelivered: { path: 'pages/dashboard/ship-for-me/my-delivered', tab: TABS.ORDERS },
  ShipForwarding: { path: 'pages/dashboard/ship-for-me/my-forwarding-parcel', tab: TABS.ORDERS },
  ShipmentInvoice: { path: 'pages/dashboard/ship-for/invoice/:bookingId', tab: TABS.ORDERS },
  OrderInvoice: { path: 'pages/dashboard/buy-and-ship-for/invoice/:bookingId', tab: TABS.ORDERS },
  Refunds: { path: 'pages/dashboard/refund', tab: TABS.ORDERS },
  Points: { path: 'pages/dashboard/points', tab: TABS.ORDERS },
  UserInformation: { path: 'pages/dashboard/user/information', tab: TABS.ORDERS },
  UserSecurity: { path: 'pages/dashboard/user/security', tab: TABS.ORDERS },

  /* ── Services & public ── */
  ShipForMeForm: { path: 'pages/ship-for-me', tab: TABS.MORE },
  BuyForMe: { path: 'pages/buy-for-me', tab: TABS.MORE },
  TrackOrder: { path: 'pages/track-order', tab: TABS.MORE },
  CostCalculator: { path: 'pages/cost-calculator', tab: TABS.MORE },
  Notices: { path: 'pages/notices', tab: TABS.MORE },
  NoticeDetail: { path: 'pages/notices/:noticeId', tab: TABS.MORE },
  More: { path: 'more', tab: TABS.MORE },

  /* ── Static content ── */
  AboutUs: { path: 'pages/about-us', tab: TABS.MORE },
  Contact: { path: 'pages/contact', tab: TABS.MORE },
  Faq: { path: 'pages/faq', tab: TABS.MORE },
  HowToOrder: { path: 'pages/how-to-order', tab: TABS.MORE },
  PrivacyPolicy: { path: 'pages/privacy-policy', tab: TABS.MORE },
  RefundPolicy: { path: 'pages/refund-policy', tab: TABS.MORE },
  TaxAndShipping: { path: 'pages/tax-and-Shipping', tab: TABS.MORE },
  Terms: { path: 'pages/terms-and-coditions', tab: TABS.MORE },

  /* ── Auth (root stack — presented over the tabs) ── */
  Login: { path: 'pages/login' },
  Register: { path: 'pages/register' },
  ForgotPassword: { path: 'pages/forget-password' },

  /* ── bKash gateway return ──
     Reached only via the paicart:// scheme; it has no web counterpart. */
  PaymentReturn: { path: 'payment-return' },
};

/* Web routes that only ever redirected, as path -> path rewrites. Applied
   before React Navigation parses a deep link (see linking.js), because a
   linking config can only bind one path per screen — registering these as
   extra screen names produced entries no navigator declared.

   `/pages/register` is deliberately absent: it is a real screen here (the
   register tab of the auth screen) rather than the redirect stub it was on
   the web. */
export const REDIRECTS = {
  '/pages/request-for-product': '/pages/buy-for-me',
};

export const screensForTab = (tab) =>
  Object.entries(ROUTES)
    .filter(([, cfg]) => cfg.tab === tab)
    .map(([name]) => name);

export const ROOT_SCREENS = Object.entries(ROUTES)
  .filter(([, cfg]) => !cfg.tab)
  .map(([name]) => name);
