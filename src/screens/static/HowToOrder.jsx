import React from 'react';
import { View, Text } from 'react-native';
import { Search, ShoppingCart, CreditCard, Package, CheckCircle } from 'lucide-react-native';
import ContentPage from '@/components/ContentPage';
import { Breadcrumb, Card, P, TS, tpx, relaxed, C, SC, RED } from '@/components/static/StaticBits';

/* Web: src/app/pages/how-to-order/page.jsx (< 640px). Copy verbatim.
   Breadcrumb only (no hero tile), bg-gray-50, an intro card and four step
   cards. The web page has no videos, links or CTA beyond the breadcrumb. */

const STEPS = [
  {
    Icon: Search,
    bg: C.blue50,
    fg: C.blue600,
    title: 'পণ্যের নাম বা ছবি দিয়ে সার্চ করুন',
    en: 'Search by Name or Image',
    desc: 'আপনার পছন্দের পণ্যটি খুঁজে পেতে Paicart-এর সার্চ বারে পণ্যের নাম (Name) লিখে সার্চ করুন। এছাড়া আপনি চাইলে সরাসরি প্রোডাক্টের ছবি তুলে বা মোবাইলের গ্যালারি থেকে ছবি আপলোড (Upload) করেও খুব সহজে আপনার কাঙ্ক্ষিত পণ্যটি খুঁজে নিতে পারেন।',
  },
  {
    Icon: ShoppingCart,
    bg: C.orange50,
    fg: SC.orange600,
    title: 'পণ্য বাছাই এবং কার্টে যোগ করুন',
    en: 'Select & Add to Cart',
    desc: "পণ্যটি খুঁজে পাওয়ার পর আপনার পছন্দ অনুযায়ী সঠিক সাইজ (Size), কালার (Color) এবং পরিমাণ (Quantity) সিলেক্ট করে পণ্যটি কার্টে যোগ (Add to Cart) করুন অথবা সরাসরি 'Place Order'-এ ক্লিক করুন।\n(মনে রাখবেন: অর্ডার সম্পন্ন করতে আমাদের সাইটে অবশ্যই রেজিস্ট্রেশন করা থাকতে হবে।)",
  },
  {
    Icon: CreditCard,
    bg: C.green50,
    fg: C.green600,
    title: 'পেমেন্ট করুন',
    en: 'Make Payment',
    desc: 'আপনার অর্ডারটি নিশ্চিত করতে আমাদের উল্লেখিত পেমেন্ট গেটওয়েগুলোর যেকোনো একটির মাধ্যমে পণ্যের ন্যূনতম ৬০% (60%) অগ্রিম পেমেন্ট সম্পন্ন করুন।',
  },
  {
    Icon: Package,
    bg: C.red50,
    fg: RED,
    title: 'শিপমেন্ট ও ডেলিভারি গ্রহণ করুন',
    en: 'Receive Your Order',
    desc: 'পেমেন্ট সম্পন্ন হওয়ার পর আপনার পণ্যটি চায়না থেকে বাংলাদেশে চলে আসবে।\nবাই এয়ার (By Air) শিপমেন্ট: ১০ থেকে ১৪ কার্যদিবস।\nবাই সি (By Sea) শিপমেন্ট: ৩৫ থেকে ৪৫ কার্যদিবস।\n\n⚠️ বিশেষ দ্রষ্টব্য (Note): চায়না সেলার বা ফ্যাক্টরির লোকেশন থেকে পণ্যটি আমাদের নিজস্ব চায়না ওয়্যারহাউজে (China Warehouse) এসে পৌঁছানোর জন্য যে সময়টুকু লাগবে, তা মূল ডেলিভারি সময়ের সাথে যুক্ত হবে।',
  },
];

function Step({ step, i, last }) {
  const { Icon } = step;
  return (
    <Card style={{ padding: 16, flexDirection: 'row', alignItems: 'flex-start', gap: 16, overflow: 'visible' }}>
      <View style={{ alignItems: 'center' }}>
        <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: step.bg, alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={18} color={step.fg} />
        </View>
        {!last && <View style={{ width: 2, height: 16, backgroundColor: C.gray100, marginTop: 4 }} />}
      </View>
      <View style={{ flex: 1, paddingTop: 4 }}>
        <Text
          style={[tpx(10), { fontWeight: '700', color: C.gray400, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }]}
        >
          Step {i + 1}
        </Text>
        <Text style={[TS.sm, { fontWeight: '700', color: C.gray800 }]}>{step.title}</Text>
        <Text style={[tpx(11), { fontWeight: '500', color: C.gray400, marginBottom: 4 }]}>{step.en}</Text>
        <Text style={[relaxed(12), { color: C.gray600 }]}>{step.desc}</Text>
      </View>
      <View
        style={{
          width: 24,
          height: 24,
          borderRadius: 12,
          backgroundColor: C.green50,
          alignItems: 'center',
          justifyContent: 'center',
          marginTop: 4,
        }}
      >
        <CheckCircle size={14} color={SC.green500} />
      </View>
    </Card>
  );
}

export default function HowToOrder() {
  return (
    <ContentPage bg={C.gray50}>
      <Breadcrumb title="How To Order" />

      <ContentPage.Body style={{ paddingHorizontal: 16, paddingTop: 32, paddingBottom: 64, gap: 16 }}>
        {/* Intro */}
        <Card style={{ padding: 20, overflow: 'visible' }}>
          <View style={{ borderLeftWidth: 4, borderLeftColor: RED, paddingLeft: 12, marginBottom: 8 }}>
            <Text style={[TS.base, { fontWeight: '700', color: C.gray800 }]}>কিভাবে অর্ডার করবেন?</Text>
          </View>
          <P>
            নিচে উল্লেখিত মাত্র সামান্য কিছু স্টেপ এর মাধ্যমে সম্পন্ন করে ফেলুন আপনার প্রথম অর্ডারটি। অর্ডার সম্পন্ন করতে অবশ্যই আমাদের সাইটে রেজিস্ট্রেশন করা লাগবে।
          </P>
        </Card>

        {/* Steps: space-y-3 */}
        <View style={{ gap: 12 }}>
          {STEPS.map((step, i) => (
            <Step key={i} step={step} i={i} last={i === STEPS.length - 1} />
          ))}
        </View>
      </ContentPage.Body>
    </ContentPage>
  );
}
