/* The category tree from the web CategoryDrawer (a hardcoded constant there,
   not Firestore data) — 10 top categories x 2-5 subgroups x 3-8 keyword chips.
   Each chip navigates to Collection with the chip text as the search keyword.
   Icons come from data/categoryIcons.js, keyed by the category id. */
export const CATEGORY_TREE = [
  {
    id: 'Dress & Clothing',
    sub: [
      { label: "Women's Clothing", items: ['womens clothing', 'skirts', 'womens dress', 'floral dress', 'camisole', 'womens T-shirt', 'womens shirt'] },
      { label: "Men's Market", items: ['mens T-Shirt', 'mens POLO', 'casual shirt', 'jacket', 'hoodie', 'PU leather jacket', 'casual shorts', 'denim shorts'] },
      { label: 'Underwear / Homewear', items: ['womens pajamas', 'night dress', 'couple pajamas', 'long johns', 'silk panties', 'maternity panties'] },
    ],
  },
  {
    id: 'Accessories & Shoes',
    sub: [
      { label: 'Jewelry & Watches', items: ['Quartz watch', 'mechanical watch', 'digital watch', 'necklace', 'earring', 'Jewelry Set'] },
      { label: "Men's Shoes", items: ['sandals', 'mens shoes', 'skate shoes'] },
      { label: "Women's Shoes", items: ['womens sandals', 'sports shoes', 'casual shoes', 'High heel'] },
      { label: 'Bags & Luggage', items: ['womens canvas bag', 'womens leather bag', 'computer business bag', 'mens backpack'] },
    ],
  },
  {
    id: 'Handbags & Wallets',
    sub: [
      { label: 'Handbags', items: ["Men's Handbags", 'Purses', "Women's handbags", "Women's clutches", "Women's backpacks"] },
      { label: 'Wallets', items: ['Wallets', 'Cardholders', 'Cases for mobile phones'] },
      { label: 'Travel Bags', items: ['Backpacks', 'Shoulder Bag', 'Waist Bags', 'Suitcases'] },
    ],
  },
  {
    id: 'Sports & Apparel',
    sub: [
      { label: 'Sportswear', items: ['gym clothes', 'sports trousers', 'sports bra', 'yoga clothes', 'dance costume'] },
      { label: 'Sports Accessories', items: ['fanny pack', 'backpack', 'arm bag', 'gloves', 'scarf'] },
      { label: 'Equipment', items: ['yoga mat', 'jump rope', 'Hula Hoop', 'treadmill', 'fishing reel'] },
      { label: 'Outdoor & Cycling', items: ['foldable bicycle', 'mountain bike', 'Bicycle Light', 'telescope', 'folding chair'] },
    ],
  },
  {
    id: "Children's Clothing",
    sub: [
      { label: "Children's Wear", items: ['childrens wear', 'childrens t-shirt', 'childrens underwear', 'sleeping clothes'] },
      { label: 'Mother & Baby', items: ['nursing pad', 'baby pool', 'saliva towel', 'Anti lost', 'bed rail'] },
      { label: 'Toys & Games', items: ['vent decompression', 'blind box'] },
    ],
  },
  {
    id: 'Home Furnishings',
    sub: [
      { label: 'Daily Use', items: ['drying rack', 'Coat hanger', 'Vanity mirror', 'Toilet mat'] },
      { label: 'Bed & Textiles', items: ['hotel linen', 'Duvet Covers', 'gift towel', 'painting', 'photo frame'] },
      { label: 'Outdoor', items: ['flashlight', 'headlamp', 'raincoat', 'poncho'] },
    ],
  },
  {
    id: 'Home Improvement',
    sub: [
      { label: 'Hardware', items: ['curtain accessories', 'door suction', 'Furniture Hardware', 'glue'] },
      { label: 'Flooring & Tiles', items: ['wall tiles', 'floor tiles', 'laminate floor'] },
      { label: 'Furniture', items: ['study desk and chair', 'children bed', 'computer desk'] },
      { label: 'Lighting', items: ['candle light', 'night light', 'landscape lights', 'solar light'] },
    ],
  },
  {
    id: 'Office & Pets',
    sub: [
      { label: 'Office & Display', items: ['trophy', 'medal', 'display stand', 'banner'] },
      { label: 'Pet Supplies', items: ['pet clothing', 'pet accessories', 'cat litter', 'pet box/bag', 'Leash', 'collar dog tag'] },
    ],
  },
  {
    id: 'Beauty & Makeup',
    sub: [
      { label: 'Makeup', items: ['eyebrow pencil', 'blush', 'mascara', 'makeup brush', 'fake eyelashes'] },
      { label: 'Skin Care', items: ['Facial mask', 'facial serum', 'eye care', 'mens skin care'] },
      { label: 'Nail Products', items: ['Nail stickers', 'Polisher', 'manicure', 'Nail Pen'] },
      { label: 'Hair & Wigs', items: ['Wig long curly hair', 'long straight wig', 'real hair wig'] },
      { label: 'Cleaning', items: ['Laundry soap', 'glass cleaner', 'kitchen paper', 'toilet paper'] },
    ],
  },
  {
    id: 'Digital & Electronics',
    sub: [
      { label: 'Mobile Accessories', items: ['cellphone battery', 'phone film', 'phone case', 'data line'] },
      { label: 'Smart Devices', items: ['smart wristband', 'smart watch strap', 'smart tutoring machine'] },
      { label: 'Home Appliances', items: ['card speaker', 'Mite removal machine', 'mosquito killer lamp'] },
      { label: 'Auto Supplies', items: ['driving recorder', 'Child safety seat', 'mini scooter', 'car lights'] },
    ],
  },
];
