import React, { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import Animated, { FadeIn, useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { ChevronDown, HelpCircle } from 'lucide-react-native';
import ContentPage from '@/components/ContentPage';
import { Breadcrumb, Hero, ProhibitedChip, TS, C, SHADOW, RED, relaxed, Press } from '@/components/static/StaticBits';

/* Web: src/app/pages/faq/page.jsx (< 640px). Copy verbatim. One accordion,
   first question open, tapping the open one closes it. The hero's
   "{n} questions" pill is `hidden sm:flex`, so it is not shown on a phone.
   (This page's list differs from the home page FAQ in data/homeContent.js —
   it carries its own copy, so it lives here.) */

const PROHIBITED = [
  'সেক্স টয়', 'SKD (আমদানি নিষিদ্ধ পণ্যের অংশ)', 'সোনা/গোল্ড', 'সিরিঞ্জ',
  'পাকিস্তানি ক্রিম', 'হাতকড়া/পিস্তল/বন্দুক বা অস্ত্র সাদৃশ্য পণ্য',
  'সিগারেট', 'মেডিসিন', 'মোবাইল ফোন', 'অ্যালকোহলজাত পানীয়',
  'ড্রোন ও ড্রোনের যন্ত্রাংশ', 'ওয়াকিটকি', 'পুরাতন বা ব্যবহৃত পণ্য',
  'মোটরসাইকেল ও গাড়ি (বাচ্চাদের খেলনা ছাড়া)',
];

const FAQS = [
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

/* Chevron: transition-transform duration-200 to rotate-180 (purely visual). */
function Chevron({ open }) {
  const r = useSharedValue(open ? 180 : 0);
  useEffect(() => {
    r.value = withTiming(open ? 180 : 0, { duration: 200 });
  }, [open, r]);
  const style = useAnimatedStyle(() => ({ transform: [{ rotate: `${r.value}deg` }] }));
  return (
    <Animated.View style={style}>
      <ChevronDown size={16} color={open ? RED : C.gray400} />
    </Animated.View>
  );
}

function FaqItem({ faq, i, open, onToggle }) {
  return (
    <View
      style={{
        backgroundColor: '#ffffff',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: open ? 'rgba(230,34,34,0.3)' : C.gray100,
        boxShadow: SHADOW.base,
        overflow: 'hidden',
      }}
    >
      <Press
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          paddingHorizontal: 20,
          paddingVertical: 16,
          backgroundColor: pressed ? 'rgba(249,250,251,0.6)' : '#ffffff', // hover:bg-gray-50/60
        })}
      >
        <View
          style={{
            width: 28,
            height: 28,
            borderRadius: 12,
            backgroundColor: open ? RED : C.gray100,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={[TS.xs, { fontWeight: '800', color: open ? '#ffffff' : C.gray500 }]}>{i + 1}</Text>
        </View>
        <Text style={[TS.sm, { fontWeight: '600', color: C.gray800, flex: 1, paddingRight: 8 }]}>{faq.q}</Text>
        <Chevron open={open} />
      </Press>

      {open && (
        <Animated.View
          entering={FadeIn.duration(200)}
          style={{ paddingHorizontal: 20, paddingBottom: 20, borderTopWidth: 1, borderTopColor: C.gray50 }}
        >
          <View style={{ paddingTop: 12, paddingLeft: 40 }}>
            <Text style={[relaxed(14), { color: C.gray600 }]}>{faq.a}</Text>
            {faq.prohibited && (
              <View
                style={{
                  marginTop: 16,
                  backgroundColor: C.red50,
                  borderRadius: 12,
                  padding: 12,
                  borderWidth: 1,
                  borderColor: C.red100,
                }}
              >
                <Text style={[TS.xs, { fontWeight: '700', color: C.red600, marginBottom: 8 }]}>আমদানি নিষিদ্ধ পণ্য:</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {PROHIBITED.map((item) => (
                    <ProhibitedChip key={item} item={item} bg="#ffffff" border={C.red200} px={8} py={2} />
                  ))}
                </View>
              </View>
            )}
          </View>
        </Animated.View>
      )}
    </View>
  );
}

export default function Faq() {
  const [open, setOpen] = useState(0);

  return (
    <ContentPage>
      <Breadcrumb title="FAQ" />
      <Hero Icon={HelpCircle} title="FAQ" subtitle="Frequently Asked Questions" />

      <ContentPage.Body style={{ paddingHorizontal: 16, paddingTop: 24, paddingBottom: 64, gap: 8 }}>
        {FAQS.map((faq, i) => (
          <FaqItem key={i} faq={faq} i={i} open={open === i} onToggle={() => setOpen(open === i ? -1 : i)} />
        ))}
      </ContentPage.Body>
    </ContentPage>
  );
}
