import React from 'react';
import { View } from 'react-native';
import { Shield, Lock, Database, Eye, RefreshCw, UserCheck, Globe, Cookie, Award, Users } from 'lucide-react-native';
import ContentPage from '@/components/ContentPage';
import { Breadcrumb, Hero, Card, SectionCard, P, Divider } from '@/components/static/StaticBits';

/* Web: src/app/pages/privacy-policy/page.jsx (< 640px). Copy verbatim. */

const BODY = { paddingHorizontal: 16, paddingTop: 24, paddingBottom: 64, gap: 12 }; // px-4 py-6 pb-16 space-y-3

export default function PrivacyPolicy() {
  return (
    <ContentPage toc>
      <Breadcrumb title="Privacy Policy" />
      <Hero Icon={Shield} title="Privacy Policy" subtitle="How we collect, use and protect your data" />

      <ContentPage.Body style={BODY}>
        {/* Intro */}
        <View
          style={{
            backgroundColor: '#fff1e6',
            borderWidth: 1,
            borderColor: 'rgba(255,106,0,0.1)',
            borderRadius: 16,
            padding: 20,
          }}
        >
          <P>Paicart মার্কেট প্লেসে আপনাকে স্বাগতম। আমরা আমাদের ওয়েবসাইট ব্যবহারকারীদের গোপনীয়তা রক্ষায় সদা তৎপর, তাই আপনাদের তথ্যের গোপনীয়তা রক্ষায় আমরা একটি গোপনীয়তা নীতিমালায় প্রকাশ করছি।</P>
          <P style={{ marginTop: 12 }}>আপনার ব্যক্তিগত তথ্যসমূহ কিভাবে আমরা সংগ্রহ, ব্যবহার ও প্রকাশ করি, সেটা এই গোপনীয়তার নীতিমালা খুব ভালভাবে ব্যাখ্যা করে। এই সাইটে প্রবেশের মাধ্যমে আপনি নীতিমালাটি মেনে নিলেন।</P>
        </View>

        <SectionCard Icon={Lock} title="ব্যক্তিগত তথ্যঃ" color="#FF6A00" gap={12}>
          <P>আমরা আপনার ব্যক্তিগত তথ্য অন্য কোনো ব্যক্তি বা প্রতিষ্ঠান কে প্রদান করি না। শুধুমাত্র আপনার অর্ডারকৃত পণ্য কুরিয়ার করার ক্ষেত্রে কুরিয়ার সার্ভিস কোম্পানিকে দেয়া হয়। তবে দেশের আইন প্রযোগকারী কোন সংস্থা যদি তদন্তের প্রয়োজনে তথ্য চায় সেই ক্ষেত্রে আমরা দিতে বাধ্য থাকবো।</P>
        </SectionCard>

        <SectionCard Icon={Database} title="তথ্য সরবরাহঃ" color="#1677FF" gap={12}>
          <P>আপনি যখন আমাদের ওয়েবসাইটে রেজিস্ট্রেশন করেন তখন আপনার ফোন নাম্বার নেয়া হয়। পরবর্তীতে আপনি যখন অর্ডার দিতে যান তখন আপনার নাম, ফোন নাম্বার, ইমেইল এড্রেস, ঠিকানা সংগ্রহ করি। আপনার যাবতীয় তথ্য আমরা নিরাপদ ও সুরক্ষিত সার্ভারে সংগ্রহ করি।</P>
        </SectionCard>

        <SectionCard Icon={Eye} title="ডেটা সংগ্রহ সম্পর্কিত তথ্যঃ" color="#00B8A9" gap={12}>
          <P>আপনার অর্ডার প্রসেস করতে আপনার দেওয়া তথ্য আমরা ব্যবহার করবো। পরবর্তীতে, আপনার অ্যাকাউন্ট পরিচালনার জন্য আপনার দেওয়া তথ্য আমরা ব্যবহার করবো এবং আপনার পেমেন্টের কাজে ব্যবহৃত সকল অর্থনৈতিক লেনদেন যাচাই এবং সম্পন্ন করব।</P>
        </SectionCard>

        <SectionCard Icon={RefreshCw} title="গোপনীয়তা নীতিমালা পরিবর্তনঃ" color="#FFB800" gap={12}>
          <P>এই গোপনীয়তা নীতিমালাটি paicart.com এর কর্তৃপক্ষ যেকোন সময়ে পরিবর্তন করার অধিকার রাখে। আমাদের গোপনীয়তা নীতিমালায় যদি কোন পরিবর্তন আনা হয়, সেই ক্ষেত্রে পরিবর্তিত গোপনীয়তা নীতিমালাটি আমরা এখানে রাখবো।</P>
        </SectionCard>

        <SectionCard Icon={UserCheck} title="আপনার সম্মতিঃ" color="#FF6A00" gap={12}>
          <P>আমাদের ওয়েবসাইট ব্যবহার করার মাধ্যমে আপনি এই গোপনীয়তা নীতিমালায় সম্মতি প্রকাশ করছেন। আমাদের গোপনীয়তা নীতিমালা নিয়ে আপনার যদি কোন প্রশ্ন বা জিজ্ঞাসা থেকে থাকে তাহলে আমাদের সাথে যোগাযোগ করার অনুরোধ করা হলো।</P>
        </SectionCard>

        <Divider label="English Policy" />

        <Card style={{ padding: 20, gap: 12, overflow: 'visible' }}>
          <P>Data protection is a matter of trust and your privacy is important to us. We shall therefore only use your name and other information which relates to you in the manner set out in this Privacy Policy.</P>
          <P>We will only keep your information for as long as we are either required to by law or as is relevant for the purposes for which it was collected.</P>
          <P>You can visit the Site and browse without having to provide personal details. During your visit to the Site you remain anonymous and at no time can we identify you unless you have an account on the Site.</P>
        </Card>

        <SectionCard Icon={Database} title="1. Data that we collect" color="#1677FF" gap={12}>
          <P>We may collect various pieces of information if you seek to place an order for a product with us on the Site.</P>
          <P>We collect, store and process your data for processing your purchase on the Site. We may collect personal information including, but not limited to, your name, gender, date of birth, email address, postal address, delivery address, telephone number, mobile number, payment details, and bank account details.</P>
          <P>We will use the information you provide to process your orders, administer your account, verify financial transactions, audit data downloads, improve our website, and carry out research on our users&apos; demographics.</P>
          <P>We may pass your name and address on to a third party in order to make delivery of the product to you (for example to our courier or supplier).</P>
          <P>Your actual order details may be stored with us but for security reasons cannot be retrieved directly by us. However, you may access this information by logging into your account on the Site.</P>
        </SectionCard>

        <SectionCard Icon={Users} title="Other uses of your Personal Information" color="#00B8A9" gap={12}>
          <P>We may use your personal information for opinion and market research. Your details are anonymous and will only be used for statistical purposes. You can choose to opt out of this at any time.</P>
          <P>We may also send you other information about us, the Site, our products, sales promotions, and newsletters. If you would prefer not to receive any of this additional information please click the &apos;unsubscribe&apos; link in any email that we send to you.</P>
          <P>We may further anonymize data about users of the Site generally and use it for various purposes, including ascertaining the general location of the users and supplying that anonymized data to third parties such as publishers.</P>
        </SectionCard>

        <SectionCard Icon={Award} title="Competitions" color="#FFB800" gap={12}>
          <P>For any competition we use the data to notify winners and advertise our offers. You can find more details where applicable in our participation terms for the respective competition.</P>
        </SectionCard>

        <SectionCard Icon={Globe} title="Third Parties and Links" color="#FF6A00" gap={12}>
          <P>We may pass your details to other companies in our group, agents, and subcontractors to help us with our uses of your data. We may use third parties to assist us with delivering products, collecting payments, analyzing data, and providing marketing or customer service assistance.</P>
          <P>Other than as set out in this Privacy Policy, we shall NOT sell or disclose your personal data to third parties without obtaining your prior consent unless required to do so by law.</P>
        </SectionCard>

        <SectionCard Icon={Cookie} title="2. Cookies" color="#1677FF" gap={12}>
          <P>The acceptance of cookies is not a requirement for visiting the Site. However the use of the &apos;basket&apos; functionality and ordering is only possible with the activation of cookies. Cookies are tiny text files which identify your computer to our server as a unique user when you visit certain pages.</P>
          <P>This website uses Google Analytics. Google Analytics uses cookies to help the website analyze how users use the site. The information generated by the cookie (including your IP address) will be transmitted to and stored by Google on servers in the United States.</P>
        </SectionCard>

        <SectionCard Icon={Lock} title="3. Security" color="#00B8A9" gap={12}>
          <P>We have in place appropriate technical and security measures to prevent unauthorized or unlawful access to or accidental loss of your information. When we collect data through the Site, we collect your personal details on a secure server. We use firewalls on our servers.</P>
        </SectionCard>

        <SectionCard Icon={UserCheck} title="4. Your rights" color="#FFB800" gap={12}>
          <P>If you are concerned about your data you have the right to request access to the personal data which we may hold or process about you. You have the right to require us to correct any inaccuracies in your data free of charge. At any stage you also have the right to ask us to stop using your personal data for direct marketing purposes.</P>
        </SectionCard>
      </ContentPage.Body>
    </ContentPage>
  );
}

