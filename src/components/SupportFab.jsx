import React, { useEffect } from 'react';
import { Linking, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  useReducedMotion,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { CONTACT } from '@/data/contact';
import { decorRing } from '@/lib/decorClock';

const GREEN = '#25D366';
const SIZE = 52;

/* The WhatsApp mark — same path as the web BottomNav / FloatingWhatsApp glyph. */
function WhatsAppGlyph({ size = 26, color = '#ffffff' }) {
  return (
    <Svg viewBox="0 0 24 24" width={size} height={size}>
      <Path
        fill={color}
        d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"
      />
    </Svg>
  );
}

/* Floating WhatsApp button, ported from alg-ecommerce-react-native's
 * SupportFab: a 52px green circle 16px from the right edge that deep-links
 * straight into WhatsApp with Paicart's support number. Place it inside a
 * screen that sits above the tab bar; `bottom` is measured from that screen's
 * bottom edge, i.e. from the top of the tab bar.
 *
 * Native touches: it springs in on mount, scales down on press, and a soft
 * ring ripples out every few seconds so it reads as "live support". */
export default function SupportFab({ bottom = 16, right = 16 }) {
  const reduceMotion = useReducedMotion();
  const enter = useSharedValue(reduceMotion ? 1 : 0);
  const press = useSharedValue(1);

  useEffect(() => {
    if (reduceMotion) return;
    enter.value = withDelay(400, withSpring(1, { damping: 12, stiffness: 160 }));
  }, [reduceMotion, enter]);

  const fabStyle = useAnimatedStyle(() => ({
    opacity: enter.value,
    transform: [{ scale: enter.value * press.value }],
  }));
  /* One ripple per play of the shared decor clock (lib/decorClock). */
  const ringStyle = useAnimatedStyle(
    () => (reduceMotion ? { opacity: 0, transform: [{ scale: 1 }] } : decorRing(0.45, 0.6)),
    [reduceMotion],
  );

  /* wa.me hands off to the installed WhatsApp app (or the browser when it is
     not installed), exactly as the ALG button does. */
  const open = () => Linking.openURL(`https://wa.me/${CONTACT.whatsappNumber}`).catch(() => {});

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[{ position: 'absolute', right, bottom, width: SIZE, height: SIZE, zIndex: 20 }, fabStyle]}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          { position: 'absolute', width: SIZE, height: SIZE, borderRadius: SIZE / 2, backgroundColor: GREEN },
          ringStyle,
        ]}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Chat with Paicart on WhatsApp"
        onPress={open}
        onPressIn={() => {
          press.value = withTiming(0.9, { duration: 90 });
        }}
        onPressOut={() => {
          press.value = withSpring(1, { damping: 10, stiffness: 300 });
        }}
        style={{
          width: SIZE,
          height: SIZE,
          borderRadius: SIZE / 2,
          backgroundColor: GREEN,
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(0,0,0,0.18)',
        }}
      >
        <WhatsAppGlyph size={26} />
      </Pressable>
    </Animated.View>
  );
}
