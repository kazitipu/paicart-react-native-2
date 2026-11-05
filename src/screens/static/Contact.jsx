import React from 'react';
import { View, Text, Linking } from 'react-native';
import { WebView } from 'react-native-webview';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { MapPin, Phone, Mail, MessageSquare, Headphones } from 'lucide-react-native';
import ContentPage from '@/components/ContentPage';
import {
  Breadcrumb, Hero, Card, TS, tpx, snug, C, Press, copyText, coloredShadowMd,
} from '@/components/static/StaticBits';
import { CONTACT, whatsappUrl } from '@/data/contact';

/* Web: src/app/pages/contact/page.jsx (< 640px). Copy verbatim.
   The web shows every detail as plain text (no links, no form). Native
   extras, with no visual change: each line taps through (tel / mailto /
   Google Maps), long-press copies it, and the WhatsApp card opens a chat. */

const MAP_EMBED =
  'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3652.144104937872!2d90.41012947607189!3d23.742240089088064!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3755b861d40306a1%3A0xab9176cf68a61e7b!2sTropical%20Razia%20Shopping%20Complex!5e0!3m2!1sen!2sbd!4v1716773488997!5m2!1sen!2sbd';
const MAP_SEARCH =
  'https://www.google.com/maps/search/?api=1&query=Tropical+Razia+Shopping+Complex%2C+26%2F1+Chamelibagh%2C+Shantinagar%2C+Dhaka+1217';

const MAP_HTML = `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;height:100%;background:#f3f4f6}iframe{border:0;width:100%;height:100%;display:block}</style></head><body><iframe src="${MAP_EMBED}" loading="lazy" referrerpolicy="no-referrer-when-downgrade" allowfullscreen></iframe></body></html>`;

const TEL = `tel:${CONTACT.phone}`;
const INFO = [
  {
    Icon: Phone,
    title: 'Phone',
    subtitle: 'Call us anytime',
    lines: ['+88-01629773885', '+88-01629773885'],
    href: () => TEL,
    color: '#1677FF',
    bg: C.blue50,
  },
  {
    Icon: MapPin,
    title: 'Address',
    subtitle: 'Visit our office',
    lines: ['Suite#F2, (2nd floor) Tropical Razia Shopping Complex,', '26/1 Chamelibagh, Shantinagar, Dhaka 1217'],
    href: () => MAP_SEARCH,
    copyAll: true,
    color: '#00B8A9',
    bg: '#f0fdfa', // teal-50
  },
  {
    Icon: Mail,
    title: 'Support Email',
    subtitle: 'For order support',
    lines: ['support@paicart.com'],
    href: (l) => `mailto:${l}`,
    color: '#FFB800',
    bg: C.amber50,
  },
  {
    Icon: Mail,
    title: 'General Enquiry',
    subtitle: 'For general info',
    lines: ['info@paicart.com'],
    href: (l) => `mailto:${l}`,
    color: '#FF6A00',
    bg: C.orange50,
  },
];

const open = (url) => Linking.openURL(url).catch(() => {});

function Gradient({ id, from, to, diagonal }) {
  return (
    <Svg style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} width="100%" height="100%">
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2="1" y2={diagonal ? '1' : '0'}>
          <Stop offset="0" stopColor={from} />
          <Stop offset="1" stopColor={to} />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${id})`} />
    </Svg>
  );
}

function InfoCard({ Icon, title, subtitle, lines, href, copyAll, color, bg }) {
  return (
    <Card>
      <View style={{ height: 4, backgroundColor: color }} />
      <View style={{ padding: 16, flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
        <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={17} color={color} />
        </View>
        <View style={{ flexShrink: 1 }}>
          <Text style={[TS.xs, { fontWeight: '700', color: C.gray800 }]}>{title}</Text>
          <Text style={[tpx(10), { color: C.gray400, marginBottom: 4 }]}>{subtitle}</Text>
          {lines.map((line, i) => (
            <Press
              key={i}
              onPress={() => open(href(line))}
              onLongPress={() => copyText(copyAll ? lines.join(' ') : line)}
              delayLongPress={350}
              style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
            >
              <Text style={[snug(14), { fontWeight: '600', color: C.gray700 }]}>{line}</Text>
            </Press>
          ))}
        </View>
      </View>
    </Card>
  );
}

export default function Contact() {
  return (
    <ContentPage>
      <Breadcrumb title="Contact Us" />
      <Hero Icon={Headphones} title="Contact Us" subtitle="We're here to help — reach out anytime" />

      <ContentPage.Body style={{ paddingHorizontal: 16, paddingTop: 24, paddingBottom: 64, gap: 16 }}>
        {/* Map: rounded-2xl border shadow-sm h-56 */}
        <Card style={{ height: 224 }}>
          <WebView
            /* Google's embed URL refuses to render as a top-level page ("must
               be used in an iframe"), so it is wrapped in one — as the web does. */
            source={{ html: MAP_HTML, baseUrl: 'https://www.paicart.com' }}
            style={{ flex: 1, backgroundColor: C.gray100, opacity: 0.99 }} // 0.99: lets Android clip the WebView to the card's rounded corners
            nestedScrollEnabled
            setSupportMultipleWindows={false}
            onShouldStartLoadWithRequest={(req) => {
              if (!req.isTopFrame || req.url.startsWith('https://www.google.com/maps/embed') || req.url === 'about:blank' || req.url.startsWith('https://www.paicart.com')) {
                return true;
              }
              open(req.url); // "View larger map", directions… → Maps app / browser
              return false;
            }}
          />
        </Card>

        {/* Contact cards: grid-cols-1 gap-3 */}
        <View style={{ gap: 12 }}>
          {INFO.map((info) => (
            <InfoCard key={info.title} {...info} />
          ))}
        </View>

        {/* WhatsApp */}
        <Card>
          <View style={{ height: 4 }}>
            <Gradient id="waBar" from="#25d366" to="#128c7e" />
          </View>
          <Press
            onPress={() => open(whatsappUrl())}
            onLongPress={() => copyText('+880 1629-773885')}
            delayLongPress={350}
            style={({ pressed }) => ({
              padding: 16,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 16,
              backgroundColor: pressed ? C.gray50 : '#ffffff',
            })}
          >
            <View style={{ width: 48, height: 48, borderRadius: 16, boxShadow: coloredShadowMd(C.green200) }}>
              <View style={{ flex: 1, borderRadius: 16, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
                <Gradient id="waTile" from="#25d366" to="#128c7e" diagonal />
                <MessageSquare size={20} color="#ffffff" />
              </View>
            </View>
            <View style={{ flexShrink: 1 }}>
              <Text style={[TS.sm, { fontWeight: '800', color: C.gray800 }]}>WhatsApp Support</Text>
              <Text style={[TS.xs, { color: C.gray400, marginTop: 2 }]}>Chat with us instantly for quick answers</Text>
              <Text style={[TS.base, { fontWeight: '800', color: '#128c7e', marginTop: 4 }]}>+880 1629-773885</Text>
            </View>
          </Press>
        </Card>
      </ContentPage.Body>
    </ContentPage>
  );
}

