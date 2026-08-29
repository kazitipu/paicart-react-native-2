import React from 'react';
import { View, Text, Pressable, ScrollView, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, MessageCircle } from 'lucide-react-native';
import { CONTACT_INFO } from '@/data/staticContent';
import { CONTACT, whatsappUrl } from '@/data/contact';
import colors from '@/theme/colors';

/* Each INFO entry carries its own lucide icon from the extracted data. Rows
   that look like a phone, an email or a URL become tappable. */
const linkFor = (value) => {
  const v = String(value || '');
  if (/^\+?\d[\d\s-]{6,}$/.test(v)) return `tel:${v.replace(/\s/g, '')}`;
  if (v.includes('@')) return `mailto:${v}`;
  if (/^https?:\/\//.test(v)) return v;
  return null;
};

export default function Contact() {
  const navigation = useNavigation();

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <View className="flex-row items-center gap-2 px-3 py-2.5 bg-white border-b border-gray-100">
        {navigation.canGoBack() && (
          <Pressable onPress={() => navigation.goBack()} hitSlop={8} className="p-1">
            <ArrowLeft size={22} color={colors.foreground} />
          </Pressable>
        )}
        <Text className="flex-1 text-md font-bold text-foreground">Contact Us</Text>
      </View>

      <ScrollView contentContainerClassName="p-3 pb-10">
        <Pressable
          onPress={() => Linking.openURL(whatsappUrl()).catch(() => {})}
          className="flex-row items-center gap-3 rounded-xl px-4 py-3.5 mb-3"
          style={{ backgroundColor: colors.whatsapp }}
        >
          <MessageCircle size={20} color="#ffffff" />
          <View className="flex-1">
            <Text className="text-white font-bold text-smd">Chat on WhatsApp</Text>
            <Text className="text-white/80 text-2xs">{CONTACT.hours}</Text>
          </View>
        </Pressable>

        {CONTACT_INFO.map((info, i) => {
          const value = info.value || info.text || info.detail;
          const href = linkFor(value);
          const Icon = info.Icon || info.icon;
          const Row = (
            <View className="flex-row items-start gap-3 bg-white rounded-xl border border-gray-100 px-4 py-3.5 mb-2">
              {Icon ? <Icon size={17} color={colors.primary} /> : null}
              <View className="flex-1">
                <Text className="text-2xs text-gray-400">{info.label || info.title}</Text>
                <Text className={`text-smd mt-0.5 ${href ? 'text-primary' : 'text-foreground'}`}>
                  {value}
                </Text>
              </View>
            </View>
          );
          return href ? (
            <Pressable key={i} onPress={() => Linking.openURL(href).catch(() => {})}>
              {Row}
            </Pressable>
          ) : (
            <View key={i}>{Row}</View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}
