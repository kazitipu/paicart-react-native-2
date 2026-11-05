import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import Animated, {
  FadeIn,
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';
import {
  Clock, ThumbsUp, Warehouse, PlaneTakeoff, Ship, ShieldCheck, Home, CheckCircle2,
  RotateCcw, MapPin,
} from 'lucide-react-native';
import { C, SHADOW } from '@/components/product/ui';
import { isSeaShipment, readyStepLabel } from '@/lib/shipment';
import { decorRing } from '@/lib/decorClock';

/* ═══════════════════════════════════════════════════════════════════════
   Pieces of the Track Order port (web src/app/pages/track-order/page.jsx,
   < 640px). The page has no scoped mobile font shrink, so these are plain
   Tailwind v4 sizes: a named size carries its own line-height ratio, an
   arbitrary text-[Npx] inherits the body's 1.5.
   ═══════════════════════════════════════════════════════════════════════ */

export const ORANGE = '#FF6A00';
export const RED = '#e62222';
export const BODY = '#1e293b'; // body `color: var(--foreground)`

export const TS = {
  xs: { fontSize: 12, lineHeight: 16 },
  sm: { fontSize: 14, lineHeight: 20 },
  base: { fontSize: 16, lineHeight: 24 },
  lg: { fontSize: 18, lineHeight: 28 },
};
export const tpx = (n) => ({ fontSize: n, lineHeight: n * 1.5 });

/* Tailwind v4 shadow-sm / shadow-lg. */
export const SHADOW_SM = SHADOW.base;
export const SHADOW_LG = SHADOW.lg;

/* Extra palette values beyond ui.jsx's C. */
export const TC = {
  red300: '#fca5a5',
  red400: '#f87171',
  emerald100: '#d1fae5',
  emerald700: '#047857',
  amber100: '#fef3c7',
  amber700: '#b45309',
};

/* The seven milestones, verbatim from the web page. */
export const STEPS = [
  {
    score: 1,
    label: 'Pending',
    icon: Clock,
    dateKey: (r) => r.date || r.orderedDate,
    desc: 'Order received and under review',
    color: '#f59e0b',
    bg: '#fffbeb',
  },
  {
    score: 2,
    label: 'Approved',
    icon: ThumbsUp,
    dateKey: (r) => r['Rates ProvidedDate'] || r.PurchasedDate,
    desc: 'Order approved and processing',
    color: '#8b5cf6',
    bg: '#f5f3ff',
  },
  {
    score: 3,
    label: 'Abroad Warehouse',
    icon: Warehouse,
    dateKey: (r) => r['Received in WarehouseDate'],
    desc: 'Arrived at overseas warehouse',
    color: '#3b82f6',
    bg: '#eff6ff',
  },
  {
    score: 4,
    label: 'Ready to Fly',
    icon: PlaneTakeoff,
    /* The only milestone whose wording depends on freight mode — a sea parcel
       is loaded onto a vessel, not flown. The stored status and its
       `Ready for flyDate` key are the admin's and stay as they are. */
    labelFor: (r) => readyStepLabel(r, 'Ready to Fly'),
    iconFor: (r) => (isSeaShipment(r) ? Ship : PlaneTakeoff),
    dateKey: (r) => r['Ready for flyDate'],
    desc: 'Dispatched for air/sea shipment',
    color: '#06b6d4',
    bg: '#ecfeff',
  },
  {
    score: 5,
    label: '🇧🇩 Bangladesh Customs',
    icon: ShieldCheck,
    dateKey: (r) => r['Bangladesh customsDate'],
    desc: 'Clearing 🇧🇩 Bangladesh customs',
    color: '#f97316',
    bg: '#fff7ed',
  },
  {
    score: 6,
    label: 'Paicart Warehouse',
    icon: Home,
    dateKey: (r) => r['Paicart WarehouseDate'] || r['Paicart warehouseDate'],
    desc: 'At Paicart local warehouse',
    color: '#10b981',
    bg: '#ecfdf5',
  },
  {
    score: 7,
    label: 'Delivered',
    icon: CheckCircle2,
    dateKey: (r) => r.DeliveredDate,
    desc: 'Package delivered successfully',
    color: '#e62222',
    bg: '#fff1f2',
  },
];

/* Dates are stored by the admin panel as display strings. Anything else
   (a stray Timestamp) is not something the web could render either. */
const printable = (v) => (typeof v === 'string' || typeof v === 'number' ? String(v) : null);

/* RotateCcw with `.spin-loader` (0.9s linear, clockwise). */
export function SpinIcon({ size, color }) {
  const rot = useSharedValue(0);
  useEffect(() => {
    rot.value = withRepeat(withTiming(360, { duration: 900, easing: Easing.linear }), -1, false);
    return () => cancelAnimation(rot);
  }, [rot]);
  const style = useAnimatedStyle(() => ({ transform: [{ rotate: `${rot.value}deg` }] }));
  return (
    <Animated.View style={style}>
      <RotateCcw size={size} color={color} />
    </Animated.View>
  );
}

/* Order-info grid cell (InfoField on the web). */
export function InfoField({ Icon, label, value, color }) {
  return (
    <View style={{ flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: 12,
          marginTop: 2,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: `${color}15`,
        }}
      >
        <Icon size={14} color={color} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[tpx(10), { color: C.gray400, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.25 }]}>
          {label}
        </Text>
        <Text style={[TS.sm, { color: C.gray800, fontWeight: '700' }]} numberOfLines={1}>
          {value}
        </Text>
      </View>
    </View>
  );
}

/* `.scale-pop` — 0.5 → 1.12 → 1 with a fade, 0.4s, staggered 80ms a step.
   Purely decorative: nothing inside it is tappable. */
function PopCircle({ delay, style, children }) {
  const p = useSharedValue(0);
  useEffect(() => {
    const ease = Easing.bezier(0.4, 0, 0.2, 1);
    p.value = withDelay(
      delay,
      withSequence(withTiming(0.7, { duration: 280, easing: ease }), withTiming(1, { duration: 120, easing: ease })),
    );
    return () => cancelAnimation(p);
  }, [p, delay]);
  const aStyle = useAnimatedStyle(() => {
    const v = p.value;
    const scale = v <= 0.7 ? 0.5 + (v / 0.7) * 0.62 : 1.12 - ((v - 0.7) / 0.3) * 0.12;
    return { opacity: Math.min(1, v), transform: [{ scale }] };
  });
  return <Animated.View style={[style, aStyle]}>{children}</Animated.View>;
}

/* `.pulse-glow` — box-shadow 0 0 0 0 → 0 0 0 8px of rgba(230,34,34,.4 → 0),
   1.8s ease-in-out, forever. Drawn as a ring behind the circle that grows by
   8px a side while it fades, then comes back. */
function PulseRing() {
  /* One ripple per play of the shared decor clock (lib/decorClock); it used
     to breathe nonstop, which kept the tracking screen redrawing. */
  const aStyle = useAnimatedStyle(() => decorRing(0.4, 0.4));
  return (
    <Animated.View
      pointerEvents="none"
      style={[{ position: 'absolute', top: 0, left: 0, width: 40, height: 40, borderRadius: 20, backgroundColor: RED }, aStyle]}
    />
  );
}

/* `.fill-line` — the connector fills top-down over 0.7s. */
function FillLine({ color, delay }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withDelay(delay, withTiming(1, { duration: 700, easing: Easing.ease }));
    return () => cancelAnimation(p);
  }, [p, delay]);
  const aStyle = useAnimatedStyle(() => ({ height: `${p.value * 100}%` }));
  return (
    <Animated.View
      style={[{ position: 'absolute', top: 0, left: 0, right: 0, borderRadius: 999, backgroundColor: color }, aStyle]}
    />
  );
}

function StepRow({ step, idx, record, score, isCurrent, isLast }) {
  const completed = score >= step.score;
  const Icon = step.iconFor ? step.iconFor(record) : step.icon;
  const date = printable(step.dateKey(record));
  const delay = idx * 80;

  const circleStyle = {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: completed ? step.color : C.gray100,
    /* On the web the current step's pulse animation owns box-shadow, so its
       coloured drop shadow only shows on the other completed steps. */
    boxShadow: completed && !isCurrent ? `0 4px 12px ${step.color}40` : undefined,
  };
  const icon = <Icon size={16} color={completed ? '#ffffff' : C.gray300} />;

  return (
    <Animated.View entering={FadeIn.duration(300).delay(delay)} style={{ flexDirection: 'row', gap: 16 }}>
      {/* Icon + connector */}
      <View style={{ width: 42, alignItems: 'center' }}>
        <View style={{ width: 40, height: 40, zIndex: 10 }}>
          {isCurrent && <PulseRing delay={delay} />}
          {completed && !isCurrent ? (
            <PopCircle delay={delay} style={circleStyle}>
              {icon}
            </PopCircle>
          ) : (
            <View style={circleStyle}>{icon}</View>
          )}
        </View>
        {!isLast && (
          <View
            style={{
              width: 2,
              flexGrow: 1,
              minHeight: 32,
              marginVertical: 4,
              borderRadius: 999,
              overflow: 'hidden',
              backgroundColor: C.gray100,
            }}
          >
            {score >= step.score + 1 && <FillLine color={step.color} delay={delay} />}
          </View>
        )}
      </View>

      {/* Content */}
      <View style={{ flex: 1, minWidth: 0, paddingBottom: isLast ? 0 : 20 }}>
        <View
          style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: 6, marginBottom: 2 }}
        >
          <Text style={{ fontSize: 14, lineHeight: 17.5, fontWeight: '700', color: completed ? C.gray900 : C.gray300 }}>
            {step.labelFor ? step.labelFor(record) : step.label}
          </Text>
          {isCurrent && (
            <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, backgroundColor: step.color }}>
              <Text style={[tpx(10), { fontWeight: '700', color: '#ffffff', letterSpacing: 0.25 }]}>CURRENT</Text>
            </View>
          )}
        </View>
        <Text style={{ fontSize: 12, lineHeight: 19.5, color: completed ? C.gray400 : C.gray200 }}>{step.desc}</Text>
        {!!date && completed && (
          <View
            style={{
              alignSelf: 'flex-start',
              marginTop: 6,
              paddingHorizontal: 10,
              paddingVertical: 4,
              borderRadius: 8,
              backgroundColor: step.bg,
            }}
          >
            <Text style={[tpx(11), { fontWeight: '600', color: step.color }]}>{date}</Text>
          </View>
        )}
      </View>
    </Animated.View>
  );
}

const CARD = {
  backgroundColor: '#ffffff',
  borderRadius: 16,
  borderWidth: 1,
  borderColor: C.gray100,
  boxShadow: SHADOW_SM,
};

/* "Shipment Journey" card. */
export function JourneyCard({ record, score }) {
  const currentStepIdx = Math.min(score, STEPS.length) - 1;
  return (
    <View style={[CARD, { overflow: 'hidden' }]}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          paddingHorizontal: 20,
          paddingVertical: 16,
          borderBottomWidth: 1,
          borderBottomColor: C.gray100,
        }}
      >
        <MapPin size={15} color={C.red500} />
        <Text style={[tpx(15), { fontWeight: '700', color: C.gray800 }]}>Shipment Journey</Text>
        <View style={{ marginLeft: 'auto', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: ORANGE }}>
          <Text style={[tpx(11), { fontWeight: '600', color: '#ffffff' }]}>
            Step {score} of {STEPS.length}
          </Text>
        </View>
      </View>

      <View style={{ padding: 20 }}>
        {STEPS.map((step, idx) => (
          <StepRow
            key={step.score}
            step={step}
            idx={idx}
            record={record}
            score={score}
            isCurrent={idx === currentStepIdx}
            isLast={idx === STEPS.length - 1}
          />
        ))}
      </View>
    </View>
  );
}

/* score 0: "Order Not Shipped Yet". */
export function NotShippedCard() {
  return (
    <View style={[CARD, { padding: 32, alignItems: 'center' }]}>
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: 16,
          marginBottom: 16,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#fef6e0',
        }}
      >
        <Clock size={26} color={C.amber400} />
      </View>
      {/* mb-1 + mt-1 collapse to a single 4px gap on the web. */}
      <Text style={[TS.base, { fontWeight: '700', color: C.gray800, marginBottom: 4, textAlign: 'center' }]}>
        Order Not Shipped Yet
      </Text>
      <Text style={{ fontSize: 12, lineHeight: 19.5, color: C.gray400, textAlign: 'center' }}>
        {'Your order is being processed.\nShipment tracking will appear here once dispatched.'}
      </Text>
    </View>
  );
}

export { CARD };
