import React, { useState } from 'react';
import { View, Text, ScrollView, Dimensions } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { ClipboardList, X, Check, Truck } from 'lucide-react-native';
import { C, SHADOW, Press, ScalePress, Spinner, Overlay } from '@/components/product/ui';
import { sf, SC } from '@/components/shipping/ShipBits';

/* ═══════════════════════════════════════════════════════════════════════
   StartShippingModal of web ship-for-me/my-request/_shared.jsx, < 640px:
   a bottom sheet (`rounded-t-3xl max-h-[92vh]`) with the teal header and
   its matching handle strip, six numbered instructions (fading in 40ms
   apart, as the web staggers them), the agree box, Close / Start Shipping.
   Inside the page's shrink root, so type is `sf`.
   ═══════════════════════════════════════════════════════════════════════ */

const INSTRUCTIONS = [
  'অনুগ্রহ করে আপনার সকল পার্সেল বা কার্টুন সবুজ বোনা ব্যাগে প্যাকেজিং করুন। অন্যথায় আমাদের ওয়্যারহাউজ কর্তৃক সবুজ বোনা ব্যাগে প্যাকেজিং করলে রি প্যাকিং খরচ যুক্ত হবে।',
  'প্রতিটা বক্সের প্যাকেজিং সম্পূর্ণ করার পর প্রতিটি বক্সের উপর আপনার শিপিং মার্ক, পণ্যের নাম, প্যাকেজিং সহ পণ্যের সঠিক ওজন, পণ্যের পরিমান সম্পর্কিত তালিকা লিখে দিন। অন্যথায় ওয়্যারহাউজ কর্তৃক পণ্য শিপমেন্ট হবে না।',
  'লিকুইড, পাউডার, মেশিন ও কাঁচ যাতীয় ভঙ্গুর পণ্য অবশ্যই কাঠের বক্সে পাঠাতে হবে।',
  'ভুল পণ্য ডিক্লারেশন করলে পণ্যের জরিমানা ও যাবতীয় খরচ Paicart কর্তৃপক্ষ বহন করবে না।',
  'যথা সময়ে আপনার পার্সেলের ট্রাকিং নাম্বার যোগ করুন। ট্রাকিং নাম্বার ছাড়া আপনার পণ্য শিপমেন্ট করা হবে না।',
  'পণ্য শিপমেন্ট সময়কালীন ফ্রেইট ও ট্যাক্স বৃদ্ধি পেলে শিপিং খরচ বৃদ্ধি পাবে।',
];

export default function StartShippingModal({ booking, onClose, onSubmit, submitting, onTerms }) {
  return (
    <Overlay visible={!!booking} onClose={onClose} zIndex={50} scrim="rgba(0,0,0,0.5)">
      {booking ? <Sheet key={String(booking.bookingId)} onClose={onClose} onSubmit={onSubmit} submitting={submitting} onTerms={onTerms} /> : null}
    </Overlay>
  );
}

function Sheet({ onClose, onSubmit, submitting, onTerms }) {
  const [agreed, setAgreed] = useState(false);
  const maxH = Dimensions.get('window').height * 0.92;

  return (
    <View
      style={{
        backgroundColor: '#ffffff',
        maxHeight: maxH,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        overflow: 'hidden',
        boxShadow: SHADOW['2xl'],
      }}
    >
      {/* Handle strip carries the header's colour */}
      <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 4, backgroundColor: SC.TEAL_DARK }}>
        <View style={{ width: 40, height: 4, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.4)' }} />
      </View>
      <View
        style={{
          backgroundColor: SC.TEAL_DARK,
          paddingHorizontal: 20,
          paddingVertical: 16,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flexShrink: 1 }}>
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 12,
              backgroundColor: 'rgba(255,255,255,0.2)',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: SHADOW.inner,
            }}
          >
            <ClipboardList size={17} color="#ffffff" />
          </View>
          <View style={{ flexShrink: 1 }}>
            <Text style={[sf('sm'), { fontWeight: '700', color: '#ffffff', letterSpacing: 0.33 }]}>Freight Company Instruction</Text>
            <Text style={[sf('xs'), { color: '#ccfbf1' }]}>Please read carefully before proceeding</Text>
          </View>
        </View>
        <Press
          onPress={onClose}
          accessibilityLabel="Close"
          style={({ pressed }) => ({
            width: 32,
            height: 32,
            borderRadius: 12,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: pressed ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.1)',
          })}
        >
          <X size={15} color="#ffffff" />
        </Press>
      </View>

      <ScrollView style={{ flexGrow: 0, flexShrink: 1 }} contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 16, gap: 10 }}>
        {INSTRUCTIONS.map((text, i) => (
          <Animated.View
            key={i}
            entering={FadeIn.duration(300).delay(i * 40)}
            style={{
              flexDirection: 'row',
              gap: 12,
              padding: 12,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: C.gray100,
              backgroundColor: C.gray50,
            }}
          >
            <View
              style={{
                width: 24,
                height: 24,
                borderRadius: 12,
                backgroundColor: SC.TEAL,
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                boxShadow: SHADOW.base, // v4 shadow-sm
              }}
            >
              <Text style={[sf('xs'), { fontWeight: '800', color: '#ffffff' }]}>{i + 1}</Text>
            </View>
            <Text style={[sf('sm', 'relaxed'), { color: C.gray600, flexShrink: 1 }]}>{text}</Text>
          </Animated.View>
        ))}
        <Animated.View entering={FadeIn.duration(300).delay(INSTRUCTIONS.length * 40 + 40)} style={{ marginTop: 4 }}>
          <Press
            onPress={() => setAgreed((v) => !v)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: agreed }}
            style={{
              flexDirection: 'row',
              alignItems: 'flex-start',
              gap: 12,
              padding: 14,
              borderRadius: 16,
              borderWidth: 2,
              backgroundColor: agreed ? '#f0fdfa' : SC.blue50,
              borderColor: agreed ? '#5eead4' : SC.blue100,
            }}
          >
            <View
              style={{
                width: 20,
                height: 20,
                borderRadius: 6,
                borderWidth: 2,
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                backgroundColor: agreed ? SC.teal500 : '#ffffff',
                borderColor: agreed ? SC.teal500 : C.gray300,
              }}
            >
              {agreed && <Check size={11} color="#ffffff" strokeWidth={3} />}
            </View>
            <Text style={[sf('sm'), { color: C.gray700, flexShrink: 1 }]}>
              I have read and agreed to the{' '}
              <Text onPress={onTerms} suppressHighlighting style={{ color: SC.teal600, fontWeight: '600' }}>
                Terms and Conditions
              </Text>
              .
            </Text>
          </Press>
        </Animated.View>
      </ScrollView>

      <View
        style={{
          borderTopWidth: 1,
          borderTopColor: C.gray100,
          paddingHorizontal: 20,
          paddingVertical: 16,
          flexDirection: 'row',
          gap: 12,
          backgroundColor: 'rgba(255,255,255,0.8)',
        }}
      >
        <ScalePress
          onPress={onClose}
          containerStyle={{ flex: 1 }}
          style={{ paddingVertical: 10, borderRadius: 16, borderWidth: 1, borderColor: C.gray200, alignItems: 'center' }}
        >
          <Text style={[sf('sm'), { fontWeight: '600', color: C.gray600 }]}>Close</Text>
        </ScalePress>
        <ScalePress
          onPress={() => agreed && onSubmit()}
          disabled={!agreed || submitting}
          containerStyle={{ flex: 1 }}
          style={{
            paddingVertical: 10,
            borderRadius: 16,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            backgroundColor: agreed ? SC.TEAL : '#9ca3af',
            boxShadow: agreed ? '0 4px 14px rgba(13,148,136,0.333)' : undefined,
            opacity: submitting ? 0.75 : 1,
          }}
        >
          {submitting ? (
            <>
              <Spinner size={14} color="#ffffff" />
              <Text style={[sf('sm'), { fontWeight: '700', color: '#ffffff' }]}>Processing…</Text>
            </>
          ) : (
            <>
              <Truck size={14} color="#ffffff" />
              <Text style={[sf('sm'), { fontWeight: '700', color: '#ffffff' }]}>Start Shipping</Text>
            </>
          )}
        </ScalePress>
      </View>
    </View>
  );
}
