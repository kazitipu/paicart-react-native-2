import React from 'react';
import { View, Text, Pressable, ScrollView, Linking, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import {
  Ship, Package, MapPin, ListOrdered, Calculator, Bell, Info, Phone,
  HelpCircle, Shield, RotateCcw, FileText, Percent, ChevronRight,
  LogIn, Mail, MessageCircle, Heart, Award, Wallet, User,
} from 'lucide-react-native';
import { emit, EVENTS } from '@/lib/events';
import { CONTACT } from '@/data/contact';
import Avatar from '@/components/Avatar';
import colors from '@/theme/colors';

const LOGO = require('@/assets/paicart_transparent.png');

/* The web app put all of this in a Footer. A phone has no footer, so the
   fifth tab carries it: the two services, the account screens the sidebar
   never linked, the policy pages, and the contact details. */

const SERVICES = [
  { label: 'Ship For Me', screen: 'ShipForMeForm', Icon: Ship },
  { label: 'Request For Product', screen: 'BuyForMe', Icon: Package },
  { label: 'Track My Order', screen: 'TrackOrder', Icon: MapPin },
  { label: 'How To Order', screen: 'HowToOrder', Icon: ListOrdered },
  { label: 'Cost Calculator', screen: 'CostCalculator', Icon: Calculator },
];

const ACCOUNT = [
  { label: 'My Wishlist', tab: 'HomeTab', screen: 'Wishlist', Icon: Heart },
  { label: 'Points & Level', tab: 'OrdersTab', screen: 'Points', Icon: Award },
  { label: 'Refunds', tab: 'OrdersTab', screen: 'Refunds', Icon: Wallet },
  { label: 'Profile', tab: 'OrdersTab', screen: 'UserInformation', Icon: User },
];

const INFORMATION = [
  { label: 'About Us', screen: 'AboutUs', Icon: Info },
  { label: 'Contact Us', screen: 'Contact', Icon: Phone },
  { label: 'FAQ', screen: 'Faq', Icon: HelpCircle },
  { label: 'Notices', screen: 'Notices', Icon: Bell },
  { label: 'Tax & Shipping', screen: 'TaxAndShipping', Icon: Percent },
  { label: 'Privacy Policy', screen: 'PrivacyPolicy', Icon: Shield },
  { label: 'Refund Policy', screen: 'RefundPolicy', Icon: RotateCcw },
  { label: 'Terms & Conditions', screen: 'Terms', Icon: FileText },
];

function Row({ Icon, label, onPress, tint = colors.muted }) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center gap-3 px-4 py-3.5 bg-white active:bg-gray-50"
    >
      <Icon size={18} color={tint} />
      <Text className="flex-1 text-smd text-foreground">{label}</Text>
      <ChevronRight size={16} color="#d1d5db" />
    </Pressable>
  );
}

function Section({ title, children }) {
  return (
    <View className="mt-3">
      <Text className="text-2xs uppercase tracking-widest text-gray-400 font-bold px-4 pb-1.5">
        {title}
      </Text>
      <View className="border-y border-gray-100">{children}</View>
    </View>
  );
}

export default function More() {
  const navigation = useNavigation();
  const currentUser = useSelector((s) => s.user?.currentUser);
  const isLoggedIn =
    currentUser && (currentUser.email || currentUser.displayName) && currentUser.email !== '';

  const go = (screen) => navigation.navigate(screen);
  const goTab = (tab, screen) => navigation.navigate(tab, { screen });

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <ScrollView contentContainerClassName="pb-10">
        {/* Account header */}
        <Pressable
          onPress={() =>
            isLoggedIn
              ? goTab('OrdersTab', 'UserInformation')
              : navigation.navigate('Login')
          }
          className="flex-row items-center gap-3 px-4 py-4 bg-ink"
        >
          {isLoggedIn ? (
            <Avatar
              user={currentUser}
              sizeClass="w-12 h-12"
              roundedClass="rounded-full"
              bgClass="bg-white/20"
            />
          ) : (
            <View className="w-12 h-12 rounded-full bg-white/20 items-center justify-center">
              <LogIn size={20} color="#ffffff" />
            </View>
          )}
          <View className="flex-1">
            <Text className="text-white font-bold text-md" numberOfLines={1}>
              {isLoggedIn ? currentUser.displayName || 'My Account' : 'Sign in'}
            </Text>
            <Text className="text-white/60 text-2xs" numberOfLines={1}>
              {isLoggedIn ? currentUser.email || currentUser.mobileNo : 'Access your orders and shipments'}
            </Text>
          </View>
          <ChevronRight size={18} color="rgba(255,255,255,0.5)" />
        </Pressable>

        {/* WhatsApp — the web's fifth bottom-nav tab. */}
        <Pressable
          onPress={() => emit(EVENTS.TOGGLE_WHATSAPP)}
          className="flex-row items-center gap-3 mx-4 mt-4 px-4 py-3.5 rounded-xl active:opacity-80"
          style={{ backgroundColor: colors.whatsapp }}
        >
          <MessageCircle size={20} color="#ffffff" />
          <View className="flex-1">
            <Text className="text-white font-bold text-smd">Chat on WhatsApp</Text>
            <Text className="text-white/80 text-2xs">{CONTACT.hours}</Text>
          </View>
        </Pressable>

        <Section title="Our Services">
          {SERVICES.map((s) => (
            <Row key={s.screen} Icon={s.Icon} label={s.label} onPress={() => go(s.screen)} tint={colors.primary} />
          ))}
        </Section>

        <Section title="My Account">
          {ACCOUNT.map((s) => (
            <Row key={s.screen} Icon={s.Icon} label={s.label} onPress={() => goTab(s.tab, s.screen)} />
          ))}
        </Section>

        <Section title="Information">
          {INFORMATION.map((s) => (
            <Row key={s.screen} Icon={s.Icon} label={s.label} onPress={() => go(s.screen)} />
          ))}
        </Section>

        <Section title="Contact Us">
          <Row
            Icon={Phone}
            label={CONTACT.phone}
            onPress={() => Linking.openURL(`tel:${CONTACT.phone}`)}
          />
          <Row
            Icon={Mail}
            label={CONTACT.email}
            onPress={() => Linking.openURL(`mailto:${CONTACT.email}`)}
          />
          <View className="flex-row items-center gap-3 px-4 py-3.5 bg-white">
            <MapPin size={18} color={colors.muted} />
            <Text className="flex-1 text-smd text-gray-500">{CONTACT.address}</Text>
          </View>
        </Section>

        <View className="items-center pt-8 pb-2">
          <Image source={LOGO} className="w-28 h-10" resizeMode="contain" />
          <Text className="text-2xs text-gray-400 mt-2">© 2025–2027 Paicart.com</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
