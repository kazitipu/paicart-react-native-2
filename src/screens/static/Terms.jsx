import React from 'react';
import { View, Text, Linking } from 'react-native';
import { FileText, Globe } from 'lucide-react-native';
import ContentPage from '@/components/ContentPage';
import { Breadcrumb, Hero, SectionCard, Item, Divider, relaxed, C, RED, SC } from '@/components/static/StaticBits';
import { CONTACT } from '@/data/contact';

/* Web: src/app/pages/terms-and-coditions/page.jsx (< 640px). Copy verbatim.
   The phone numbers in the two callouts are plain text on the web; here
   they also dial (native extra, no visual change). */

const BODY = { paddingHorizontal: 16, paddingTop: 24, paddingBottom: 64, gap: 12 }; // px-4 py-6 pb-16 space-y-3

const call = () => Linking.openURL(`tel:${CONTACT.phone}`).catch(() => {});

function Callout({ bg, border, children }) {
  return (
    <View
      style={{
        backgroundColor: bg,
        borderWidth: 1,
        borderColor: border,
        borderRadius: 12,
        padding: 12,
        marginBottom: 4, // mb-3 (12) replaces the body's space-y-2 (8)
      }}
    >
      <Text style={[relaxed(14), { color: C.gray700, fontWeight: '600' }]}>{children}</Text>
    </View>
  );
}

export default function Terms() {
  return (
    <ContentPage toc>
      <Breadcrumb title="Terms & Conditions" />
      <Hero Icon={FileText} title="Terms & Conditions" subtitle="অর্ডার করার আগে অবশ্যই পড়ুন" />

      <ContentPage.Body style={BODY}>
        {/* Bangla */}
        <SectionCard Icon={FileText} title="বাংলা শর্তাবলী" color="#FF6A00">
          <Callout bg="rgba(230,34,34,0.05)" border="rgba(230,34,34,0.1)">
            আমাদের থেকে পণ্য ক্রয়ের আগে নিম্নোক্ত বিষয়গুলো বুঝে পণ্য ক্রয় করবেন, যাতে বিক্রয়োত্তর কোনো ঝামেলা না হয়। কোনো বিষয়ে দ্বিধা থাকলে আমাদেরকে{' '}
            <Text onPress={call} style={{ fontWeight: '800', color: RED }}>+৮৮০১৬২৯৭৭৩৮৮৫</Text> নম্বরে কল করে জেনে নিন।
          </Callout>
          <Item n="১">আমরা কোনো পণ্যের রেডি স্টক রাখি না। শুধুমাত্র আপনার অর্ডারকৃত পণ্যই চায়না সাপ্লায়ার থেকে ক্রয় করা হয়। তাই কখনো ২–৩ দিনের মধ্যে পণ্য ডেলিভারি দেওয়া সম্ভব নয়।</Item>
          <Item n="২">পণ্যের ন্যূনতম ৬০% অগ্রিম পেমেন্ট ছাড়া কোনো অর্ডার নেওয়া হয় না। পণ্যের বাকি পেমেন্ট এবং চায়না থেকে বাংলাদেশ শিপিং চার্জ ডেলিভারির সময় প্রদান করতে হবে।</Item>
          <Item n="৩">আমাদের ওয়েবসাইটে উল্লেখিত পণ্যের ওজন সেলারের দেওয়া তথ্যের ওপর ভিত্তি করে প্রদর্শিত হচ্ছে, যা ১০০% সঠিক নাও হতে পারে। পণ্য আসার পর প্রকৃত ওজনের ওপর ভিত্তি করেই শিপিং ও কাস্টমস চার্জ প্রদান করতে হবে।</Item>
          <Item n="৪">বাণিজ্যিক পণ্য ‘বাই এয়ার’-এ (বিমানযোগে) আমাদের ওয়্যারহাউসে পৌঁছানোর দিন থেকে ১৫–২০ কার্যদিবস এবং ‘বাই শিপ’-এ (জাহাজযোগে) ৪৫–৬০ কার্যদিবস (সকল প্রকার সরকারি ও সাপ্তাহিক ছুটি ব্যতীত) সময় লাগে।</Item>
          <Item n="৫">পণ্যমূল্যের মধ্যে বাংলাদেশের লোকাল কুরিয়ার বা ট্রান্সপোর্ট চার্জ অন্তর্ভুক্ত নয়।</Item>
          <Item n="৬">বাংলাদেশে পণ্য আসার পর অফিস থেকে ডেলিভারি নিতে হবে অথবা গ্রাহকের সম্মতিতে তাঁর নিজ খরচে ঢাকার মধ্যে ‘পাঠাও’ ও ‘স্টেডফাস্ট’ কুরিয়ারে এবং ঢাকার বাইরে ‘সুন্দরবন’ কুরিয়ারে পণ্য পাঠানো হবে।</Item>
          <Item n="৭">পণ্য কেনার আগে অবশ্যই রিটার্ন ও রিফান্ড পলিসি জেনে নিন। বাই এয়ারের পণ্য ৪৫ কার্যদিবস এবং বাই শিপের পণ্য ৯০ কার্যদিবস অতিক্রম করার পর শর্ত সাপেক্ষে রিফান্ড করা হবে।</Item>
          <Item n="৮">কাস্টমস কর্তৃক আমদানি নিষিদ্ধ পণ্য অর্ডার করা যাবে না। ভুলবশত অর্ডার করলে তা বাতিল হবে এবং গেটওয়ে চার্জ ২.৫০% কেটে বাকি টাকা রিফান্ড করা হবে।</Item>
          <Item n="৯">অর্ডারকৃত পণ্য একাধিক সাপ্লায়ারের কাছ থেকে হলে সব আইটেম একসাথে নাও আসতে পারে। সে ক্ষেত্রে আংশিক ডেলিভারি নিতে চাইলে উক্ত অর্ডারের সম্পূর্ণ বকেয়া টাকা পরিশোধ করতে হবে।</Item>
        </SectionCard>

        <Divider label="English Terms" />

        {/* English */}
        <SectionCard Icon={Globe} title="English Terms & Conditions" color="#1677FF">
          <Callout bg={C.blue50} border={C.blue100}>
            Please review and understand the following points before purchasing products from us to avoid any post-sale misunderstandings. If you have any doubts or questions, feel free to call us at{' '}
            <Text onPress={call} style={{ fontWeight: '800', color: SC.blue700 }}>+8801629773885</Text>.
          </Callout>
          <Item n="1">We do not keep ready stock for any product. We purchase products from Chinese suppliers only after you place an order. Therefore, product delivery within 2–3 days is never possible.</Item>
          <Item n="2">No order will be accepted without a minimum advance payment of 60%. The remaining payment for the product and the China-to-Bangladesh shipping charges must be paid at the time of delivery.</Item>
          <Item n="3">The product weight displayed on our website is based on information provided by the seller, which may not be 100% accurate. Shipping and customs charges will be calculated based on the actual weight upon arrival.</Item>
          <Item n="4">Commercial goods take 15–20 working days by air and 45–60 working days by sea (excluding all public and weekly holidays) from the day they arrive at our warehouse.</Item>
          <Item n="5">Product prices do not include local courier or transportation charges within Bangladesh.</Item>
          <Item n="6">Once the products arrive in Bangladesh, they must be collected from our office, or, with the customer&apos;s consent, sent at their own expense via Pathao/Steadfast within Dhaka, or Sundarban Courier outside Dhaka.</Item>
          <Item n="7">Please read and understand our Return and Refund Policy before making a purchase. Refunds will be processed under specific conditions if delivery exceeds 45 working days for air shipments and 90 working days for sea shipments.</Item>
          <Item n="8">Products prohibited by customs cannot be ordered. If ordered by mistake, the order will be canceled, and the remaining amount will be refunded after deducting a 2.50% gateway charge.</Item>
          <Item n="9">If ordered products are sourced from multiple suppliers, all items may not arrive together. If you wish to take partial delivery, the full outstanding balance of the order must be cleared.</Item>
        </SectionCard>
      </ContentPage.Body>
    </ContentPage>
  );
}
