import React from 'react';
import { View, Text } from 'react-native';
import {
  RefreshCw, MapPin, AlertTriangle, CheckCircle, XCircle, Clock, Truck, FileText, Package, Zap, Headphones, Info,
} from 'lucide-react-native';
import ContentPage from '@/components/ContentPage';
import {
  Breadcrumb, Hero, Card, SectionCard, Item, Bullet, relaxed, copyText, TS, C, RED, Press,
} from '@/components/static/StaticBits';

/* Web: src/app/pages/refund-policy/page.jsx (< 640px). Copy verbatim. */

const BODY = { paddingHorizontal: 16, paddingTop: 24, paddingBottom: 64, gap: 12 }; // px-4 py-6 pb-16 space-y-3

const COURIER_ADDRESS = [
  'Sundarban Courier Service',
  'Paicart.com',
  'Suite#F2, (2nd Floor), Trapical Razia Shopping Complex,',
  '26/1 Chamelibagh, Shantinagar, Dhaka 1217',
];

export default function RefundPolicy() {
  return (
    <ContentPage toc>
      <Breadcrumb title="Return & Refund Policy" />
      <Hero Icon={RefreshCw} title="Return & Refund Policy" subtitle="আমাদের রিফান্ড ও রিটার্ন নীতিমালা" />

      <ContentPage.Body style={BODY}>
        {/* Intro callout */}
        <View
          style={{
            backgroundColor: C.amber50,
            borderWidth: 1,
            borderColor: C.amber200,
            borderRadius: 16,
            padding: 16,
            flexDirection: 'row',
            alignItems: 'flex-start',
            gap: 12,
          }}
        >
          <View style={{ marginTop: 2 }}>
            <AlertTriangle size={16} color={C.amber600} />
          </View>
          <Text style={[relaxed(14), { color: C.amber800, flex: 1 }]}>
            আমরা গ্রাহকের অর্ডার করার পর সরাসরি চায়না সেলার থেকে পণ্য সংগ্রহ করে আপনার দরজায় পৌঁছে দিই। আমাদের কাছে কোনো পণ্যের রেডি স্টক থাকে না। তাই খুব সীমিত কিছু বিশেষ পরিস্থিতি ছাড়া রিফান্ড অথবা রিটার্ন প্রযোজ্য হয় না।
          </Text>
        </View>

        <SectionCard Icon={Zap} title="কুইক রিফান্ড (Quick Refund) নীতি" color="#FF6A00">
          <Bullet label="আবেদনের শর্ত">অর্ডারটি &quot;To Ship&quot; (শিপমেন্টের অপেক্ষায়) অবস্থায় থাকলে যেকোনো পণ্যের জন্য ‘কুইক রিফান্ড’-এর আবেদন করা যাবে।</Bullet>
          <Bullet label="অযোগ্যতা">পণ্যটি &quot;To Ship&quot; অবস্থায় না থাকলে পরবর্তীতে আর কুইক রিফান্ডের আবেদন গ্রহণ করা হবে না।</Bullet>
        </SectionCard>

        <SectionCard Icon={Headphones} title="বিক্রয়োত্তর সেবা (After Sales Service)" color="#1677FF">
          <Bullet label="আবেদনের সময়সীমা">পণ্য &quot;Delivered&quot; (হস্তান্তরিত) হওয়ার পর বিক্রয়োত্তর সেবার জন্য আবেদন করার সময়সীমা সর্বোচ্চ ৭২ ঘণ্টা।</Bullet>
          <Bullet label="সময় অতিক্রম">৭২ ঘণ্টা সময় পার হয়ে গেলে উক্ত অর্ডারের জন্য কোনো প্রকার বিক্রয়োত্তর সেবার আবেদন গ্রহণযোগ্য হবে না।</Bullet>
        </SectionCard>

        <SectionCard Icon={CheckCircle} title="কোন কোন ক্ষেত্রে রিফান্ড প্রযোজ্য হবে" color="#00B42A">
          <Item n="১" label="ত্রুটিপূর্ণ/ক্ষতিগ্রস্ত পণ্য">পণ্য ডেলিভারি পাওয়ার পর তাতে কোনো ত্রুটি বা ড্যামেজ থাকলে, অথবা ভুল বা অসম্পূর্ণ পণ্য পাঠানো হলে, ডেলিভারির ৭২ ঘণ্টার মধ্যে উপযুক্ত প্রমাণসহ রিফান্ডের আবেদন করতে হবে।</Item>
          <Item n="২" label="পণ্য স্টক-আউট">সেলারের কাছে আপনার অর্ডারকৃত পণ্য না থাকলে রিফান্ডের জন্য আবেদন করতে পারবেন।</Item>
          <Item n="৩" label="ডেলিভারিতে অতিরিক্ত বিলম্ব">বাই এয়ারের (বিমানযোগে) ক্ষেত্রে ৪৫ কার্যদিবস এবং বাই শিপের (জাহাজযোগে) ক্ষেত্রে ৯০ কার্যদিবসের (সকল প্রকার সরকারি ও সাপ্তাহিক ছুটি ব্যতীত) মধ্যে পণ্য না পৌঁছালে রিফান্ডের জন্য আবেদন করা যাবে।</Item>
          <Item n="৪" label="অর্ডার বাতিল ফি">ভুল পণ্য সিলেক্ট, কনফার্মেশনের পর অর্ডার ক্যানসেল, অথবা কাস্টমস কর্তৃক নিষিদ্ধ পণ্য অর্ডার করে ক্যানসেল করলে আংশিক পরিশোধিত অর্থের (Partial Payment) ২.৫% কেটে রেখে বাকি টাকা রিফান্ড করা হবে।</Item>
          <Item n="৫" label="সাধারণ পণ্যের ক্ষতিপূরণ">সাধারণ পণ্যের ক্ষেত্রে কোনো পণ্য নষ্ট বা ক্ষতিগ্রস্ত হয়ে পৌঁছালে, গ্রাহক শুধুমাত্র পণ্যের পরিশোধিত সমুদয় মূল্য ফেরত পাবেন।</Item>
        </SectionCard>

        <SectionCard Icon={XCircle} title="যেসব ক্ষেত্রে রিটার্ন বা রিফান্ড প্রযোজ্য হবে না" color="#F5222D">
          <Item n="১">পণ্য রিসিভ করার ৭২ ঘণ্টার মধ্যে আমাদেরকে অবহিত না করলে।</Item>
          <Item n="২">মোবাইলের ডিসপ্লে কালার সেটিংসের কারণে মূল পণ্যের সাথে ছবির রঙের সামান্য তারতম্য মনে হলে।</Item>
          <Item n="৩">পণ্যের সাইজের ক্ষেত্রে ১–৪ ইঞ্চি পর্যন্ত পার্থক্য বা তারতম্য হলে।</Item>
          <Item n="৪">পণ্যের কোয়ালিটি বা গুণগত মান নিয়ে ব্যক্তিগত অসন্তুষ্টি থাকলে।</Item>
          <Item n="৫">পণ্যটি ইতোমধ্যে ব্যবহার করা হয়ে থাকলে।</Item>
          <Item n="৬">সেলারের নিজস্ব কোনো রিটার্ন সিস্টেম বা ওয়ারেন্টি বাংলাদেশে কার্যকর হবে না।</Item>
          <Item n="৭">মাছ ধরার সরঞ্জাম (Fishing Toolkit) বা অতিরিক্ত ভঙ্গুর পণ্য ফেরতযোগ্য নয়।</Item>
          <Item n="৮">পণ্য বাংলাদেশে আসার পর সর্বোচ্চ ৩০ কার্যদিবসের মধ্যে রিসিভ না করার কারণে পণ্য হারিয়ে গেলে Paicart দায়বদ্ধ থাকবে না।</Item>
          <Item n="৯">বাংলাদেশে আসার পর ৪৫ কার্যদিবসের মধ্যে ডেলিভারি গ্রহণ না করলে, শিপমেন্ট খরচ উসুলের জন্য Paicart পণ্যটি নিলাম বা অন্যত্র বিক্রি করার পূর্ণ অধিকার রাখে।</Item>
          <Item n="১০" label="প্যাকেজিং দুর্বলতা">বর্ষাকালে বৃষ্টির পানিতে ভিজে পার্সেল যেন ক্ষতিগ্রস্ত (Damage) না হয়, সেজন্য ফ্যাক্টরি বা সেলারকে বক্সের ভেতরে ও বাইরে পলিথিন (Poly) ব্যবহার করতে হবে এবং তার ওপর সবুজ ওভেন ব্যাগ (Green Woven Bag) দিয়ে মুড়িয়ে দিতে হবে। প্যাকেজিং দুর্বল হওয়ার কারণে বৃষ্টির পানিতে পার্সেল ক্ষতিগ্রস্ত হলে Paicart দায়ী থাকবে না।</Item>
        </SectionCard>

        <SectionCard Icon={Package} title="পণ্য মিসিং বা হারিয়ে যাওয়ার ক্ষেত্রে রিফান্ড নির্দেশাবলী বা অভিযোগ প্রদানের নিয়ম" color="#1677FF">
          <Item n="১">ডেলিভারিকৃত পার্সেলটি আনবক্সিং (Unboxing) করার পুরো সময়টিতে ভিডিও ফুটেজ ধারণ করে রাখতে হবে।</Item>
          <Item n="২">প্রতিটি প্রোডাক্টের বক্সের ওপরে থাকা চাইনিজ ইনভয়েস/স্টিকার এবং বক্সের ভেতরের ইনভয়েসের স্পষ্ট ছবি তুলে সংরক্ষণ করতে হবে।</Item>
          <Item n="৩">ওয়েট মেশিনের ওপর বক্সসহ সকল প্রোডাক্ট রেখে ওজন করার দৃশ্য ছবি বা ভিডিওতে স্পষ্ট রাখতে হবে।</Item>
          <Item n="৪">মিসিং প্রোডাক্টের ক্ষেত্রে যথাযথ সাইজ/কালার উল্লেখ করে বিস্তারিত বিবরণ ও ছবিসহ আমাদের জানাতে হবে।</Item>
          <Item n="৫">ওপরের পদ্ধতিগুলোর মাধ্যমে যাচাই করা সম্ভব না হলে, প্রাপ্ত সকল প্রোডাক্ট আমাদের ওয়্যারহাউসে ফেরত পাঠাতে হবে।</Item>
          <Item n="৬">পণ্য ডেলিভারি হওয়ার ৭২ ঘণ্টার মধ্যে উপরোক্ত প্রমাণাদিসহ কাস্টমার সাপোর্টে অভিযোগ জানাতে হবে।</Item>
        </SectionCard>

        <SectionCard Icon={Package} title="রিটার্ন করার শর্তাবলী" color="#FF6A00">
          <Item n="১">রিটার্নকৃত পণ্যটি অবশ্যই সম্পূর্ণ অব্যবহৃত হতে হবে; কোনোভাবেই ধৌত করা, ভাঁজ নষ্ট করা বা ব্যবহার করা যাবে না।</Item>
          <Item n="২">পণ্যটি অবশ্যই সাপ্লায়ারের মূল (Original) প্যাকেট বা বক্সে সতর্কতার সাথে প্যাকিং করে রিটার্ন করতে হবে।</Item>
        </SectionCard>

        <SectionCard Icon={Info} title="কিছু সাধারণ নিয়মাবলী" color="#722ED1">
          <Bullet label="চার্জ অফেরতযোগ্য">Paicart-এর শিপিং চার্জ বা ওজন চার্জ সম্পূর্ণ অফেরতযোগ্য।</Bullet>
          <Bullet label="এক্সচেঞ্জ নীতি">আমাদের সিস্টেমে পণ্য এক্সচেঞ্জ করার কোনো সুযোগ নেই।</Bullet>
          <Bullet label="আংশিক বিলম্ব">একাধিক পণ্য একসাথে অর্ডার করলে সেলার কিছু পণ্য পাঠাতে দেরি করতে পারে। এ ক্ষেত্রে বাকি পণ্যগুলো পৌঁছানো পর্যন্ত অপেক্ষা করতে হবে।</Bullet>
        </SectionCard>

        <SectionCard Icon={Truck} title="শুধুমাত্র &quot;শিপ ফর মি&quot; (Ship For Me) সার্ভিসের জন্য রিটার্ন ও রিফান্ড নীতি" color="#FFB800">
          <Item n="১" label="হারিয়ে যাওয়া পণ্য">কোনো পণ্য হারিয়ে গেলে বা কম পাওয়া গেলে অরিজিনাল ইনভয়েস, প্যাকিং লিস্ট ও পেমেন্ট স্লিপ যাচাই করে রিফান্ড প্রদান করা হবে।</Item>
          <Item n="২" label="আংশিক রিফান্ড ক্লেইম">আংশিক রিফান্ডের ক্ষেত্রে ইনভয়েসের মোট মূল্যের ২০% হিসাব করে সর্বোচ্চ ২০০ ডলার পর্যন্ত রিফান্ড পাওয়া যাবে।</Item>
          <Item n="৩" label="বিশেষ পণ্যের প্যাকিং">লিকুইড, পাউডার, ভারী মেশিন ও যন্ত্রপাতির ক্ষেত্রে কাঠের বক্স (Wooden Box) থাকা বাধ্যতামূলক। কাঠের বক্স ব্যতীত পণ্য ক্ষতিগ্রস্ত হলে Paicart কোনো দায়ভার বহন করবে না।</Item>
        </SectionCard>

        <SectionCard Icon={Clock} title="রিফান্ড প্রক্রিয়াকরণের সময়সীমা" color="#00B8A9">
          <Item n="১">সকল শর্ত মেনে আবেদন করার পর আমাদের টিম আপনার সাথে যোগাযোগ করবে। আবেদনটি পলিসির আওতাভুক্ত হলে ১০–১৫ কার্যদিবসের মধ্যে রিফান্ড প্রদান করা হবে।</Item>
          <Item n="২">কোনো অনাকাঙ্ক্ষিত পরিস্থিতি বা প্রাকৃতিক দুর্যোগের কারণে (যেমন: লকডাউন) চালান বিলম্বিত হলে, রিফান্ড প্রক্রিয়া সম্পূর্ণরূপে সেলারের চূড়ান্ত সিদ্ধান্তের ওপর নির্ভর করবে।</Item>
        </SectionCard>

        <SectionCard Icon={FileText} title="যেভাবে রিফান্ড/রিটার্নের জন্য আবেদন করবেন" color="#FF6A00">
          <Item
            n="১"
            after={
              <View style={{ marginTop: 8, gap: 6 }}>
                <Bullet>কুইক রিফান্ডের (Quick Refund) জন্য &quot;To Ship&quot; অপশন থেকে &quot;View Details&quot;-এ প্রবেশ করুন এবং &quot;Quick Refund&quot; বাটনে ক্লিক করে আবেদন সম্পন্ন করুন।</Bullet>
                <Bullet>বিক্রয়োত্তর সেবার (After Sales Service) জন্য &quot;Delivered&quot; অপশন থেকে &quot;View Details&quot;-এ প্রবেশ করুন এবং &quot;After Sales Service&quot; বাটনে ক্লিক করুন।</Bullet>
              </View>
            }
          >
            আপনার অ্যাকাউন্টে লগইন করুন।
          </Item>
          <Item n="২">যে পণ্যটির জন্য রিফান্ডের আবেদন করতে চান, তার পরিমাণ (Quantity) সিলেক্ট করে ক্লিক করুন।</Item>
          <Item n="৩">রিফান্ড আবেদনের কারণ বিস্তারিত বর্ণনা করুন।</Item>
          <Item n="৪">রিফান্ডের টাকা গ্রহণের জন্য আপনার ব্যাংক অ্যাকাউন্টের তথ্য অথবা মোবাইল ব্যাংকিংয়ের বিস্তারিত তথ্য প্রদান করে সাবমিট করুন।</Item>
          <Item n="৫">রিটার্নের ক্ষেত্রে পণ্যটি সাপ্লায়ারের মূল বক্সে সুন্দরভাবে প্যাকিং করুন।</Item>
          <Item n="৬">ঢাকার মধ্যে হলে সরাসরি আমাদের অফিসে এসে রিটার্ন দিতে পারবেন অথবা আমাদের ঠিকানায় কুরিয়ার করতে পারবেন।</Item>
          <Item n="৭">পণ্য সরেজমিনে বা কুরিয়ারে পাঠানোর আগে অবশ্যই আমাদেরকে ফোন বা ইমেইলের মাধ্যমে অবহিত করতে হবে।</Item>
        </SectionCard>

        {/* Courier address — long-press copies it (native extra). */}
        <Card>
          <View style={{ height: 2, backgroundColor: '#BFBFBF' }} />
          <Press
            onLongPress={() => copyText(COURIER_ADDRESS.join('\n'))}
            delayLongPress={350}
            style={({ pressed }) => ({
              padding: 20,
              flexDirection: 'row',
              alignItems: 'flex-start',
              gap: 16,
              backgroundColor: pressed ? C.gray50 : '#ffffff',
            })}
          >
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                backgroundColor: C.gray100,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <MapPin size={18} color={RED} />
            </View>
            <View style={{ flexShrink: 1 }}>
              <Text
                style={[TS.xs, { fontWeight: '700', color: C.gray400, letterSpacing: 0.3, textTransform: 'uppercase', marginBottom: 8 }]}
              >
                কুরিয়ার করার ঠিকানা
              </Text>
              <Text style={[TS.sm, { fontWeight: '800', color: C.gray800 }]}>{COURIER_ADDRESS[0]}</Text>
              {COURIER_ADDRESS.slice(1).map((l) => (
                <Text key={l} style={[TS.sm, { color: C.gray600 }]}>{l}</Text>
              ))}
            </View>
          </Press>
        </Card>
      </ContentPage.Body>
    </ContentPage>
  );
}
