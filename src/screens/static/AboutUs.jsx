import React from 'react';
import { View, Text } from 'react-native';
import { Building2, Plane, Ship, Users, AlertTriangle, Globe } from 'lucide-react-native';
import ContentPage from '@/components/ContentPage';
import {
  Breadcrumb, Hero, Card, P, ProhibitedChip, TS, tpx, C, SC, ORANGE,
} from '@/components/static/StaticBits';

/* Web: src/app/pages/about-us/page.jsx (< 640px). Copy verbatim — note the
   web's own spellings and its differing day counts between the Bangla and
   English paragraphs; both are kept as published. */

const PROHIBITED = [
  'সেক্স টয়', 'SKD (আমদানী নিষিদ্ধ পণ্যের অংশ)', 'গোল্ড', 'সিরিঞ্জ',
  'পাকিস্তানি ক্রিম', 'হাতকড়া / পিস্তল / বন্দুক সাদৃশ্য পণ্য',
  'সিগারেট', 'মোবাইল ফোন', 'এলকোহলজাত পানীয়', 'ড্রোন / ড্রোন পার্টস',
  'ওয়াকিটকি', 'পুরাতন পন্য', 'মটর সাইকেল / কার (বাচ্চাদের খেলনা ছাড়া)',
];

/* bg-*-50 / text-*-600 / border-*-100 */
const STATS = [
  { Icon: Plane, label: 'By Air', value: '15–20 days', bg: C.blue50, fg: C.blue600, border: C.blue100 },
  { Icon: Ship, label: 'By Sea', value: '45–60 days', bg: SC.teal50, fg: SC.teal600, border: SC.teal100 },
  { Icon: Users, label: 'Support', value: 'Dedicated', bg: SC.purple50, fg: SC.purple600, border: SC.purple100 },
  { Icon: Globe, label: 'Source', value: 'Wholesale', bg: C.orange50, fg: SC.orange600, border: C.orange100 },
];

function Stat({ Icon, label, value, bg, fg, border }) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: '#ffffff',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: border,
        padding: 12,
        alignItems: 'center',
        gap: 6,
      }}
    >
      <View style={{ width: 32, height: 32, borderRadius: 12, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={15} color={fg} />
      </View>
      <Text
        style={[tpx(10), { fontWeight: '500', color: C.gray400, textTransform: 'uppercase', letterSpacing: 0.25, textAlign: 'center' }]}
      >
        {label}
      </Text>
      <Text style={[TS.xs, { fontWeight: '800', color: C.gray800, textAlign: 'center' }]}>{value}</Text>
    </View>
  );
}

function LangCard({ pill, headBg, pillBg, pillFg, children }) {
  return (
    <Card>
      <View
        style={{
          paddingHorizontal: 20,
          paddingVertical: 12,
          backgroundColor: headBg,
          borderBottomWidth: 1,
          borderBottomColor: C.gray50,
          flexDirection: 'row',
          alignItems: 'center',
        }}
      >
        <View style={{ backgroundColor: pillBg, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 }}>
          <Text style={[TS.xs, { fontWeight: '700', color: pillFg }]}>{pill}</Text>
        </View>
      </View>
      <View style={{ paddingHorizontal: 20, paddingVertical: 16, gap: 12 }}>{children}</View>
    </Card>
  );
}

export default function AboutUs() {
  return (
    <ContentPage>
      <Breadcrumb
        title="About Paicart"
        right={<Text style={[TS.xs, { color: C.red200, fontWeight: '500' }]}>TRAD/DSCC/000588/2024</Text>}
      />
      <Hero Icon={Building2} title="About Paicart" subtitle="🇧🇩 Bangladesh's #1 🇨🇳 China wholesale sourcing platform" />

      <ContentPage.Body style={{ paddingHorizontal: 16, paddingTop: 24, paddingBottom: 64, gap: 16 }}>
        {/* Stats: grid-cols-2 gap-3 */}
        <View style={{ gap: 12 }}>
          {[STATS.slice(0, 2), STATS.slice(2)].map((pair, r) => (
            <View key={r} style={{ flexDirection: 'row', gap: 12 }}>
              {pair.map((s) => (
                <Stat key={s.label} {...s} />
              ))}
            </View>
          ))}
        </View>

        <LangCard pill="বাংলা" headBg="#fff1e6" pillBg="#ffffff" pillFg={ORANGE}>
          <P>
            Paicart wholesale মার্কেট প্লেসে আপনাকে স্বাগতম। চায়নায় লক্ষাধিক পণ্যের সমাহার এখন Paicart.com এ। আমদের মার্কেট প্লেসটি মূলত ক্ষুদ্র ও মাঝারী শ্রেনির উদ্যোক্তা/ব্যাবসায়ী/ই-কমার্স ব্যাবসায়ীদের জন্য। পণ্য সোর্সিং এর মূল সমস্যা হচ্ছে চায়নাতে উৎপাদনকারী প্রতিষ্ঠান খুঁজে বের করা। আমাদের এই marketplace এর মাধ্যমে আপনি উৎপাদনকারী প্রতিষ্ঠান থেকে সরাসরি পণ্য ক্রয় করতে পারবেন একদম হোলসেল রেটে।
          </P>
          <P>
            পণ্য ক্রয় করে চায়না ওয়ারহাউসে পোঁছানোর পর থেকে ১২/২৪ দিন বাই এয়ার-এ এবং ৪৫/৬০ দিন বাই সী তে বাংলাদেশে পৌঁছাবে। LC এবং Customs সংক্রান্ত সমস্ত ঝামেলা ও ডকুমেন্টস এর দায়িত্ব আমাদের। শিপিং চার্জ পণ্য হাতে পাবার পরে প্রযোজ্য।
          </P>
        </LangCard>

        <LangCard pill="English" headBg={C.blue50} pillBg={C.blue50} pillFg={C.blue600}>
          <P>
            Welcome to the Paicart.com wholesale marketplace. Millions of products in China are now available on Paicart. Our marketplace is mainly for small and medium entrepreneurs/traders/e-commerce traders. Through our marketplace, you can directly purchase products from the manufacturing company at wholesale rates.
          </P>
          <P>
            12/20 days by air and 40/60 days by sea will arrive in Bangladesh after purchasing the goods in the China warehouse. We are responsible for all the hassles and documents related to LC and Customs. Shipping charges are applicable upon receipt of the product. Our dedicated customer service team is there for your convenience.
          </P>
        </LangCard>

        {/* Prohibited products */}
        <Card style={{ borderColor: C.red100 }}>
          <View
            style={{
              paddingHorizontal: 20,
              paddingVertical: 12,
              backgroundColor: C.red50,
              borderBottomWidth: 1,
              borderBottomColor: C.red100,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <AlertTriangle size={14} color={C.red500} />
            <Text style={[TS.sm, { fontWeight: '700', color: C.red700 }]}>Prohibited Products</Text>
            <Text style={[TS.xs, { color: SC.red400, marginLeft: 'auto' }]}>নিষিদ্ধ পণ্য</Text>
          </View>
          <View style={{ paddingHorizontal: 20, paddingVertical: 16 }}>
            <Text style={[TS.xs, { color: C.gray500, marginBottom: 12 }]}>
              নিচের পণ্যগুলো অর্ডার করা সম্পূর্ণ নিষিদ্ধ এবং শাস্তিযোগ্য অপরাধ।
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {PROHIBITED.map((item) => (
                <ProhibitedChip key={item} item={item} bg={C.red50} border={C.red100} px={10} py={4} weight="500" />
              ))}
            </View>
          </View>
        </Card>
      </ContentPage.Body>
    </ContentPage>
  );
}
