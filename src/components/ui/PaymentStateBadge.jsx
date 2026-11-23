import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, Easing } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { Check } from 'lucide-react-native';

/* Payment state pill — Paid / Partial / In review / Unpaid. Mirrors the web's
   PaymentBadge (ship-for-me/my-request/_shared.jsx). Pass the state from
   derivePaymentState() (lib/paymentState.js), not the raw stored field, so it
   matches the admin panel. Every older badge in the app delegates here. */

function PulseDot({ color }) {
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(pulse, { toValue: 1, duration: 1200, easing: Easing.out(Easing.ease), useNativeDriver: true }),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  return (
    <View style={{ width: 12, height: 12, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View
        style={{
          position: 'absolute', width: 8, height: 8, borderRadius: 4, backgroundColor: color,
          opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.55, 0] }),
          transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 2.2] }) }],
        }}
      />
      <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: color }} />
    </View>
  );
}

const CFG = {
  Paid: {
    label: 'Paid', fg: '#047857', bg: '#e3f8ef', ring: 'rgba(16,185,129,0.28)',
    icon: () => (
      <View style={{ width: 13, height: 13, borderRadius: 7, backgroundColor: '#10b981', alignItems: 'center', justifyContent: 'center' }}>
        <Check size={9} color="#fff" strokeWidth={3.5} />
      </View>
    ),
  },
  'Partially Paid': {
    label: 'Partial', fg: '#b45309', bg: '#fef6dc', ring: 'rgba(245,158,11,0.32)',
    icon: () => (
      <Svg width={13} height={13} viewBox="0 0 16 16">
        <Circle cx="8" cy="8" r="6.5" fill="#fff" stroke="#f59e0b" strokeWidth={1.8} />
        <Path d="M8 3.2 A4.8 4.8 0 0 1 8 12.8 Z" fill="#f59e0b" />
      </Svg>
    ),
  },
  pending: {
    label: 'In review', fg: '#1677FF', bg: '#e9f2ff', ring: 'rgba(22,119,255,0.24)',
    icon: () => <PulseDot color="#1677FF" />,
  },
  'Not Paid': {
    label: 'Unpaid', fg: '#475569', bg: '#f1f4f8', ring: 'rgba(100,116,139,0.24)',
    icon: () => (
      <View style={{ width: 12, height: 12, borderRadius: 6, borderWidth: 1.6, borderStyle: 'dashed', borderColor: '#94a3b8' }} />
    ),
  },
};

export default function PaymentStateBadge({ status, size = 10 }) {
  const cfg = CFG[status] || CFG['Not Paid'];
  return (
    <View
      style={{
        flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start',
        paddingLeft: 4, paddingRight: 9, paddingVertical: 2.5, borderRadius: 999,
        backgroundColor: cfg.bg, borderWidth: 1, borderColor: cfg.ring,
      }}
    >
      {cfg.icon()}
      <Text style={{ marginLeft: 5, fontSize: size, fontWeight: '800', letterSpacing: 0.2, color: cfg.fg }}>
        {cfg.label}
      </Text>
    </View>
  );
}
