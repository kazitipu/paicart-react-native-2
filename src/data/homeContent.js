/* Homepage content, lifted verbatim from the web src/app/page.jsx.
 *
 * The Bengali FAQ copy and the prohibited-goods list are customer-facing legal
 * text — they mirror /pages/faq and must not be paraphrased.
 *
 * QUICK_CATEGORIES carries a lucide icon component and an accent colour per
 * tile; `href` is kept as the original web path so the keyword it maps to
 * stays obvious, and the screen turns it into a Collection route param. */
import {
  Handbag, Footprints, Gem, Sparkles, Shirt, Flower2, Baby, Glasses,
  Smartphone, Dumbbell, Watch, Luggage, Headphones, Sofa, Blocks, Trophy,
} from 'lucide-react-native';

export const HOME_FAQ_PROHIBITED = [
  'সেক্স টয়', 'SKD (আমদানি নিষিদ্ধ পণ্যের অংশ)', 'সোনা/গোল্ড', 'সিরিঞ্জ',
  'পাকিস্তানি ক্রিম', 'হাতকড়া/পিস্তল/বন্দুক বা অস্ত্র সাদৃশ্য পণ্য',
  'সিগারেট', 'মেডিসিন', 'মোবাইল ফোন', 'অ্যালকোহলজাত পানীয়',
  'ড্রোন ও ড্রোনের যন্ত্রাংশ', 'ওয়াকিটকি', 'পুরাতন বা ব্যবহৃত পণ্য',
  'মোটরসাইকেল ও গাড়ি (বাচ্চাদের খেলনা ছাড়া)',
];

export const HOME_FAQS = [
  {
    q: 'Paicart-এ কীভাবে যেকোনো চায়না পণ্য খুঁজে বের করে অর্ডার করব?',
    a: 'খুব সহজ! Paicart-এর সার্চ বারে যেকোনো পণ্যের নাম লিখে অথবা পণ্যের ছবি আপলোড (Image Search) করে সহজেই আপনার কাঙ্ক্ষিত পণ্য খুঁজে নিয়ে সরাসরি অর্ডার প্লেস করতে পারবেন।',
  },
  {
    q: 'সাইটে প্রোডাক্টের দাম ও শিপিং খরচ কীভাবে হিসাব করা হয়? কোনো হিডেন চার্জ আছে কি?',
    a: 'Paicart-এ প্রোডাক্টের সাথে রিয়েল চায়না লোকাল কুরিয়ার চার্জ যুক্ত করে চায়নাতে পণ্যের আসল খরচ কত পড়ে তা সরাসরি দেখা যায়। পাশাপাশি এয়ার (Air) বা সি (Sea) শিপমেন্ট রেটের ওপর ভিত্তি করে সম্ভাব্য শিপিং চার্জ চেকআউটে দেখতে পাবেন। প্রদর্শিত পণ্যের মূল্য ও শিপিং খরচ ছাড়া বাড়তি কোনো হিডেন চার্জ নেই।',
  },
  {
    q: 'ক্যাশ অন ডেলিভারি (COD) সুবিধা আছে কি?',
    a: 'না, Paicart-এ ক্যাশ অন ডেলিভারি সুবিধা নেই। কারণ Paicart একটি ক্রস-বর্ডার (Cross-Border) ই-কমার্স প্ল্যাটফর্ম। সাইটের পণ্যগুলো Paicart-এর নিজস্ব স্টক নয়, এগুলো মূলত চায়না সেলারদের পণ্য। ওয়েবসাইট থেকে অর্ডার করার পরেই পণ্যগুলো চায়না থেকে ইমপোর্ট করে বাংলাদেশে আপনার ঠিকানায় পৌঁছে দেওয়া হয়।',
  },
  {
    q: 'অর্ডার করার পর পার্সেল হাতে পেতে কত দিন সময় লাগে?',
    a: 'বাই এয়ার (Air Shipment): ১০ থেকে ১৪ দিন।\nবাই সি (Sea Shipment): ৩৫ থেকে ৪৫ দিন।\n\nনোট: এটি শুধুমাত্র শিপমেন্টের সময়। সেলারের কাছ থেকে আমাদের চায়না ওয়্যারহাউজে পণ্য পৌঁছানোর সময়ের সাথে এই সময়টি যুক্ত হবে।',
  },
  {
    q: 'ওয়েবসাইটে কোনো পণ্য খুঁজে না পেলে কী করব?',
    a: 'পছন্দসই পণ্য ওয়েবসাইট বা সার্চে না পেলে আমাদের "Product Request" অপশন ব্যবহার করতে পারেন। আপনার কাঙ্ক্ষিত পণ্যের বিবরণ বা ছবি জমা দিলে চায়নার যেকোনো আইনসম্মত (Legal) পণ্য আমাদের এক্সপার্ট টিম সোর্স করে এনে দিতে পারবে।',
  },
  {
    q: 'আমি কি আমার পার্সেলের লোকেশন ট্র্যাক করতে পারব?',
    a: 'জ্বী! "Track Order" সেকশনে গিয়ে আপনার অর্ডার আইডি লিখলেই চায়না ওয়্যারহাউজ থেকে শুরু করে বাংলাদেশে পৌঁছানো পর্যন্ত পার্সেলের লাইভ আপডেট দেখতে পারবেন।',
  },
  {
    q: 'আমি নিজে চায়না থেকে কেনাকাটা করলে আপনারা কি শুধু শিপিং করে দেবেন?',
    a: 'জ্বী, আমাদের "Ship For Me" সার্ভিসের মাধ্যমে আপনি নিজে কেনাকাটা করে আমাদের চায়না ওয়্যারহাউজের ঠিকানায় পণ্য পাঠিয়ে দিতে পারেন। আমরা সেখান থেকে তা নিরাপদে বাংলাদেশে আপনার কাছে ডেলিভারি করে দেব।',
  },
  {
    q: 'Paicart দিয়ে কি যেকোনো পণ্য অর্ডার করা যাবে?',
    a: 'বাংলাদেশ কাস্টমস (Customs) এর নিয়ম অনুযায়ী কিছু পণ্যের ওপর সরকারি নিষেধাজ্ঞা রয়েছে। তাই চায়না থেকে যেকোনো আইনসম্মত (Legal) পণ্য ইমপোর্ট করা গেলেও কাস্টমস কর্তৃক আমদানি নিষিদ্ধ কোনো পণ্য অর্ডার করা যাবে না।\n\nভুলবশত কোনো নিষিদ্ধ পণ্য অর্ডার করা হলে আপনার পেমেন্টকৃত টাকা থেকে ২.৫% পেমেন্ট গেটওয়ে ফি কেটে বাকি টাকা ১২ কর্মদিবসের মধ্যে রিফান্ড করে দেওয়া হবে।',
    prohibited: true,
  },
];


/* Line-art icons in a soft tint of their own accent colour — the emoji set
   these replaced rendered differently on every platform and read as generic. */
export const QUICK_CATEGORIES = [
  { name: 'Bags',       Icon: Handbag,    color: '#E11D48', href: '/collection/bags' },
  { name: 'Shoes',      Icon: Footprints, color: '#B45309', href: '/collection/shoes' },
  { name: 'Jewelry',    Icon: Gem,        color: '#0EA5E9', href: '/collection/jewelry' },
  { name: 'Beauty',     Icon: Sparkles,   color: '#EC4899', href: '/collection/beauty' },
  { name: "Men's",      Icon: Shirt,      color: '#2563EB', href: '/collection/mens-clothing' },
  { name: "Women's",    Icon: Flower2,    color: '#9333EA', href: '/collection/womens-clothing' },
  { name: 'Baby',       Icon: Baby,       color: '#F59E0B', href: '/collection/baby' },
  { name: 'Sunglasses', Icon: Glasses,    color: '#0F766E', href: '/collection/sunglasses' },
  { name: 'Phones',     Icon: Smartphone, color: '#6366F1', href: '/collection/phone-accessories' },
  { name: 'Fitness',    Icon: Dumbbell,   color: '#DC2626', href: '/collection/fitness' },
  { name: 'Watches',    Icon: Watch,      color: '#0891B2', href: '/collection/watches' },
  { name: 'Travel',     Icon: Luggage,    color: '#FF6A00', href: '/collection/traveling' },
  { name: 'Gadgets',    Icon: Headphones, color: '#475569', href: '/collection/gadgets' },
  { name: 'Home Decor', Icon: Sofa,       color: '#16A34A', href: '/collection/home-decor' },
  { name: 'Toys',       Icon: Blocks,     color: '#CA8A04', href: '/collection/toys' },
  { name: 'Sports',     Icon: Trophy,     color: '#7C3AED', href: '/collection/sports' },
];

export const CATEGORY_SECTIONS = [
  { title: 'Ladies Bags', categoryId: 'Ladies Bags' },
  { title: 'Shoes',       categoryId: 'Shoe' },
  { title: 'Jewelry',     categoryId: 'Jewelry' },
  { title: 'Cosmetics',   categoryId: 'Cosmetics' },
  { title: 'Kids',        categoryId: 'Kids' },
  { title: 'Toys',        categoryId: 'Toys' },
];
