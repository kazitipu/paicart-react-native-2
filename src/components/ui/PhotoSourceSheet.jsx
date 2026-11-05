import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { Camera, Images, ShieldCheck } from 'lucide-react-native';
import { Overlay, ScalePress, Press, C, SHADOW, ORANGE } from '@/components/product/ui';
import { registerPhotoSourceSheet } from '@/lib/picker';

/* ─── "Add a photo" chooser ───
 * Replaces the stock Android Alert ("CANCEL / CHOOSE FROM LIBRARY / TAKE
 * PHOTO") behind every pickImage() call: image search, product requests,
 * Ship For Me, payment screenshots, profile pictures, waybills. Mounted once
 * in App above the navigator; lib/picker drives it. */

const OPTIONS = [
  {
    source: 'camera',
    Icon: Camera,
    label: 'Take photo',
    hint: 'Use your camera',
    from: '#FF8A3D',
    to: ORANGE,
    tint: '#FFF4EC',
    line: '#FFE0CC',
  },
  {
    source: 'library',
    Icon: Images,
    label: 'Choose from gallery',
    hint: 'Pick from your photos',
    from: '#4D9BFF',
    to: '#1677FF',
    tint: '#EFF6FF',
    line: '#DBEAFE',
  },
];

function IconTile({ Icon, from, to, id }) {
  return (
    <View style={{ width: 56, height: 56, borderRadius: 18, overflow: 'hidden', boxShadow: `0 8px 16px -6px ${to}88` }}>
      <Svg width={56} height={56} style={{ position: 'absolute' }}>
        <Defs>
          <LinearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={from} />
            <Stop offset="1" stopColor={to} />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="56" height="56" fill={`url(#${id})`} />
      </Svg>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={26} color="#ffffff" strokeWidth={2.2} />
      </View>
    </View>
  );
}

export default function PhotoSourceSheet() {
  const insets = useSafeAreaInsets();
  const [request, setRequest] = useState(null);
  const callbackRef = useRef(null);

  useEffect(
    () =>
      registerPhotoSourceSheet((req, onChoose) => {
        /* A second request while one is open cancels the first. */
        callbackRef.current?.(null);
        callbackRef.current = onChoose;
        setRequest(req || {});
      }),
    [],
  );

  const finish = useCallback((source) => {
    const cb = callbackRef.current;
    callbackRef.current = null;
    setRequest(null);
    /* Let the sheet start sliding away before the system picker covers it. */
    if (cb) setTimeout(() => cb(source), source ? 160 : 0);
  }, []);
  const cancel = useCallback(() => finish(null), [finish]);

  const title = request?.title || 'Add a photo';
  const subtitle = request?.subtitle || 'Choose how you’d like to add your photo';

  return (
    <Overlay visible={!!request} onClose={cancel} zIndex={900}>
      <View
        style={{
          backgroundColor: '#ffffff',
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
          paddingHorizontal: 20,
          paddingTop: 10,
          paddingBottom: 16 + insets.bottom,
          boxShadow: SHADOW['2xl'],
        }}
      >
        {/* grabber */}
        <View style={{ alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: C.gray200, marginBottom: 18 }} />

        <Text style={{ fontSize: 19, lineHeight: 24, fontWeight: '800', color: C.gray900 }} numberOfLines={1}>
          {title}
        </Text>
        <Text style={{ fontSize: 13, lineHeight: 18, color: C.gray500, marginTop: 4 }}>{subtitle}</Text>

        <View style={{ flexDirection: 'row', gap: 12, marginTop: 20 }}>
          {OPTIONS.map((o, i) => (
            <Animated.View key={o.source} entering={FadeInDown.duration(260).delay(60 + i * 70)} style={{ flex: 1 }}>
              <ScalePress
                onPress={() => finish(o.source)}
                scaleTo={0.96}
                accessibilityLabel={o.label}
                style={{
                  alignItems: 'center',
                  paddingVertical: 20,
                  paddingHorizontal: 12,
                  borderRadius: 20,
                  backgroundColor: o.tint,
                  borderWidth: 1,
                  borderColor: o.line,
                }}
              >
                <IconTile Icon={o.Icon} from={o.from} to={o.to} id={`pss-${o.source}`} />
                <Text style={{ fontSize: 14, lineHeight: 19, fontWeight: '800', color: C.gray800, marginTop: 12, textAlign: 'center' }}>
                  {o.label}
                </Text>
                <Text style={{ fontSize: 12, lineHeight: 16, color: C.gray500, marginTop: 2, textAlign: 'center' }}>{o.hint}</Text>
              </ScalePress>
            </Animated.View>
          ))}
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 16 }}>
          <ShieldCheck size={13} color={C.gray400} />
          <Text style={{ fontSize: 11.5, lineHeight: 16, color: C.gray400 }}>Your photo is only used for this request</Text>
        </View>

        <Press
          onPress={cancel}
          accessibilityRole="button"
          style={({ pressed }) => ({
            marginTop: 14,
            paddingVertical: 14,
            borderRadius: 16,
            alignItems: 'center',
            backgroundColor: pressed ? C.gray200 : C.gray100,
          })}
        >
          <Text style={{ fontSize: 15, lineHeight: 20, fontWeight: '700', color: C.gray700 }}>Cancel</Text>
        </Press>
      </View>
    </Overlay>
  );
}
