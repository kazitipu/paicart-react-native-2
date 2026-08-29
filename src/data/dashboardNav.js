/* The web DashboardLayout sidebar, as data.
 *
 * Note the label collision it shipped with: "My Shipments -> My Orders" sits
 * next to "My Orders -> My Orders". Renamed here to what each actually lists,
 * because on a phone the parent section is not visible beside the leaf.
 *
 * The web sidebar covered only six screens. The orphans it never linked —
 * Refunds, Points, Delivered, Forwarding Parcel — are included, since deep
 * links and in-page buttons were the only way to reach them before. */
export const DASHBOARD_NAV = [
  {
    title: 'My Orders',
    icon: 'Package',
    links: [
      { label: 'My Product Requests', screen: 'BuyShipMyRequests' },
      { label: 'My Orders', screen: 'BuyShipMyOrders' },
      { label: 'Delivered', screen: 'BuyShipDelivered' },
      { label: 'Forwarding Parcel', screen: 'BuyShipForwarding' },
    ],
  },
  {
    title: 'My Shipments',
    icon: 'Truck',
    links: [
      { label: 'My Shipment Requests', screen: 'ShipMyRequests' },
      { label: 'Delivered', screen: 'ShipDelivered' },
      { label: 'Forwarding Parcel', screen: 'ShipForwarding' },
    ],
  },
  {
    title: 'Account',
    icon: 'User',
    links: [
      { label: 'Information', screen: 'UserInformation' },
      { label: 'Security', screen: 'UserSecurity' },
      { label: 'Points & Level', screen: 'Points' },
      { label: 'Refunds', screen: 'Refunds' },
    ],
  },
];
