/* Verbatim copy of the category tree from the web CategoryDrawer.
   It is a hardcoded constant there, not Firestore data, so it is lifted
   unchanged — 11 top categories x 2-5 subgroups x 3-8 keyword chips. Each chip
   navigates to Collection with the chip text as the search keyword.

   ICON_BG cycles through 11 tints so adjacent category rows never share one. */
export const ICON_BG = [
  'bg-purple-100 text-purple-600',
  'bg-blue-100 text-blue-600',
  'bg-orange-100 text-orange-600',
  'bg-green-100 text-green-600',
  'bg-yellow-100 text-yellow-600',
  'bg-teal-100 text-teal-600',
  'bg-red-100 text-red-600',
  'bg-emerald-100 text-emerald-600',
  'bg-pink-100 text-pink-600',
  'bg-lime-100 text-lime-600',
  'bg-cyan-100 text-cyan-600',
];

export const CATEGORY_TREE = [
  {
    id: 'Dress & Clothing',
    icon: '👗',
    sub: [
      { label: "Women's Clothing", items: ['womens clothing', 'skirts', 'womens dress', 'floral dress', 'camisole', 'womens T-shirt', 'womens shirt'] },
      { label: "Men's Market", items: ['mens T-Shirt', 'mens POLO', 'casual shirt', 'jacket', 'hoodie', 'PU leather jacket', 'casual shorts', 'denim shorts'] },
      { label: 'Underwear / Homewear', items: ['womens pajamas', 'night dress', 'couple pajamas', 'long johns', 'silk panties', 'maternity panties'] },
    ],
  },
  {
    id: 'Accessories & Shoes',
    icon: '👟',
    sub: [
      { label: 'Jewelry & Watches', items: ['Quartz watch', 'mechanical watch', 'digital watch', 'necklace', 'earring', 'Jewelry Set'] },
      { label: "Men's Shoes", items: ['sandals', 'mens shoes', 'skate shoes'] },
      { label: "Women's Shoes", items: ['womens sandals', 'sports shoes', 'casual shoes', 'High heel'] },
      { label: 'Bags & Luggage', items: ['womens canvas bag', 'womens leather bag', 'computer business bag', 'mens backpack'] },
    ],
  },
  {
    id: 'Handbags & Wallets',
    icon: '👜',
    sub: [
      { label: 'Handbags', items: ["Men's Handbags", 'Purses', "Women's handbags", "Women's clutches", "Women's backpacks"] },
      { label: 'Wallets', items: ['Wallets', 'Cardholders', 'Cases for mobile phones'] },
      { label: 'Travel Bags', items: ['Backpacks', 'Shoulder Bag', 'Waist Bags', 'Suitcases'] },
    ],
  },
  {
    id: 'Sports & Apparel',
    icon: '🏃',
    sub: [
      { label: 'Sportswear', items: ['gym clothes', 'sports trousers', 'sports bra', 'yoga clothes', 'dance costume'] },
      { label: 'Sports Accessories', items: ['fanny pack', 'backpack', 'arm bag', 'gloves', 'scarf'] },
      { label: 'Equipment', items: ['yoga mat', 'jump rope', 'Hula Hoop', 'treadmill', 'fishing reel'] },
      { label: 'Outdoor & Cycling', items: ['foldable bicycle', 'mountain bike', 'Bicycle Light', 'telescope', 'folding chair'] },
    ],
  },
  {
    id: "Children's Clothing",
    icon: '🧒',
    sub: [
      { label: "Children's Wear", items: ['childrens wear', 'childrens t-shirt', 'childrens underwear', 'sleeping clothes'] },
      { label: 'Mother & Baby', items: ['nursing pad', 'baby pool', 'saliva towel', 'Anti lost', 'bed rail'] },
      { label: 'Toys & Games', items: ['vent decompression', 'blind box'] },
    ],
  },
  {
    id: 'Home Furnishings',
    icon: '🏠',
    sub: [
      { label: 'Daily Use', items: ['drying rack', 'Coat hanger', 'Vanity mirror', 'Toilet mat'] },
      { label: 'Bed & Textiles', items: ['hotel linen', 'Duvet Covers', 'gift towel', 'painting', 'photo frame'] },
      { label: 'Outdoor', items: ['flashlight', 'headlamp', 'raincoat', 'poncho'] },
    ],
  },
  {
    id: 'Home Improvement',
    icon: '🔧',
    sub: [
      { label: 'Hardware', items: ['curtain accessories', 'door suction', 'Furniture Hardware', 'glue'] },
      { label: 'Flooring & Tiles', items: ['wall tiles', 'floor tiles', 'laminate floor'] },
      { label: 'Furniture', items: ['study desk and chair', 'children bed', 'computer desk'] },
      { label: 'Lighting', items: ['candle light', 'night light', 'landscape lights', 'solar light'] },
    ],
  },
  {
    id: 'Office & Pets',
    icon: '🐾',
    sub: [
      { label: 'Office & Display', items: ['trophy', 'medal', 'display stand', 'banner'] },
      { label: 'Pet Supplies', items: ['pet clothing', 'pet accessories', 'cat litter', 'pet box/bag', 'Leash', 'collar dog tag'] },
    ],
  },
  {
    id: 'Beauty & Makeup',
    icon: '💄',
    sub: [
      { label: 'Makeup', items: ['eyebrow pencil', 'blush', 'mascara', 'makeup brush', 'fake eyelashes'] },
      { label: 'Skin Care', items: ['Facial mask', 'facial serum', 'eye care', 'mens skin care'] },
      { label: 'Nail Products', items: ['Nail stickers', 'Polisher', 'manicure', 'Nail Pen'] },
      { label: 'Hair & Wigs', items: ['Wig long curly hair', 'long straight wig', 'real hair wig'] },
      { label: 'Cleaning', items: ['Laundry soap', 'glass cleaner', 'kitchen paper', 'toilet paper'] },
    ],
  },
  {
    id: 'Food & Drink',
    icon: '🍜',
    sub: [
      { label: 'Beverages', items: ['dairy beverages', 'nice wine', 'Liquor', 'Carbonated drinks'] },
      { label: 'Snacks', items: ['pudding', 'hard candy', 'fish snacks', 'fondant'] },
      { label: 'Fresh & Dry', items: ['shiitake mushroom', 'kelp seaweed', 'wild fungi', 'Russian honey'] },
    ],
  },
  {
    id: 'Digital & Electronics',
    icon: '📱',
    sub: [
      { label: 'Mobile Accessories', items: ['cellphone battery', 'phone film', 'phone case', 'data line'] },
      { label: 'Smart Devices', items: ['smart wristband', 'smart watch strap', 'smart tutoring machine'] },
      { label: 'Home Appliances', items: ['card speaker', 'Mite removal machine', 'mosquito killer lamp'] },
      { label: 'Auto Supplies', items: ['driving recorder', 'Child safety seat', 'mini scooter', 'car lights'] },
    ],
  },
];
