import React, { useRef } from 'react';
import { View, Text, ScrollView, Dimensions, PanResponder } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';
import { X, Download, ChevronLeft, ChevronRight, Minus, Plus } from 'lucide-react-native';
import ProductImage from '@/components/ui/ProductImage';
import { QtyInput } from './VariantSelector';
import { Press as Pressable, Price, Spinner, ScalePress, t, ORANGE, SHADOW, fmt } from './ui';

const { height: SCREEN_H } = Dimensions.get('window');

/* −/input/+ on the black viewer (w-9 buttons, w-16 input). */
function Stepper({ value, onChange, batch }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <Pressable
        onPress={() => onChange(value - batch)}
        style={{
          width: 36,
          height: 36,
          borderRadius: 12,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: value > 0 ? ORANGE : 'rgba(255,255,255,0.15)',
        }}
      >
        <Minus size={16} color={value > 0 ? '#ffffff' : 'rgba(255,255,255,0.4)'} />
      </Pressable>
      <QtyInput
        value={value}
        onChange={onChange}
        placeholderColor="rgba(255,255,255,0.4)"
        style={[
          t('base'),
          {
            width: 64,
            height: 36,
            fontWeight: '700',
            color: '#ffffff',
            backgroundColor: 'rgba(255,255,255,0.1)',
            borderRadius: 12,
            borderWidth: 2,
            borderColor: 'rgba(255,255,255,0.15)',
          },
        ]}
      />
      <Pressable
        onPress={() => onChange(value + batch)}
        style={({ pressed }) => ({
          width: 36,
          height: 36,
          borderRadius: 12,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: ORANGE,
          opacity: pressed ? 0.9 : 1,
        })}
      >
        <Plus size={16} color="#ffffff" />
      </Pressable>
    </View>
  );
}

/* ─── Expanded colour viewer (mobile drawer) ───
   The variant full-screen: the large image, its unit price and a quantity
   stepper, with the neighbouring colours peeking at the edges so the whole set
   can be stepped through without closing first. Native addition: a horizontal
   swipe on the image steps to the neighbouring colour. */
export default function ColorVariantViewer({
  colorsArray,
  selectedColor,
  onSelect,
  onClose,
  allSizes,
  sizesForColor,
  skuQtys,
  setSkuQty,
  batch,
  getSizeKey,
  priceFor,
  onDownload,
  downloading,
}) {
  const insets = useSafeAreaInsets();
  const idx = colorsArray.findIndex((c) => c.properties === selectedColor?.properties);

  const prev = idx > 0 ? colorsArray[idx - 1] : null;
  const next = idx >= 0 && idx < colorsArray.length - 1 ? colorsArray[idx + 1] : null;

  /* Latest neighbours for the (created-once) responder. */
  const nav = useRef({});
  nav.current = { prev, next, onSelect };
  const swipe = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 24 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
      onPanResponderRelease: (_, g) => {
        const { prev: p, next: n, onSelect: sel } = nav.current;
        if (g.dx < -50 && n) sel(n);
        else if (g.dx > 50 && p) sel(p);
      },
    }),
  ).current;

  if (idx < 0) return null;

  const hasSizes = allSizes.length > 0;
  const unit = priceFor(selectedColor.properties);
  const qty = skuQtys[selectedColor.properties] || 0;

  const arrow = (side, target, Icon, label) => (
    <View style={{ position: 'absolute', top: 0, bottom: 0, [side]: 12, justifyContent: 'center' }} pointerEvents="box-none">
      <ScalePress
        onPress={() => onSelect(target)}
        accessibilityLabel={label}
        style={{
          width: 44,
          height: 44,
          borderRadius: 22,
          backgroundColor: 'rgba(0,0,0,0.7)',
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.3)',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: SHADOW.xl,
        }}
      >
        <Icon size={22} strokeWidth={2.5} color="#ffffff" />
      </ScalePress>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#000000', paddingTop: insets.top, paddingBottom: insets.bottom }}>
      {/* Top bar */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 }}>
        <Pressable
          onPress={onClose}
          accessibilityLabel="Close"
          style={({ pressed }) => ({
            width: 36,
            height: 36,
            borderRadius: 18,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: pressed ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)',
          })}
        >
          <X size={18} color="#ffffff" />
        </Pressable>
        <Text style={[t('sm'), { fontWeight: '500', color: 'rgba(255,255,255,0.8)' }]}>
          {idx + 1}/{colorsArray.length}
        </Text>
        <Pressable
          onPress={() => onDownload?.(selectedColor.url, selectedColor.value)}
          disabled={!selectedColor.url || downloading}
          accessibilityLabel="Download this image"
          style={({ pressed }) => ({
            width: 36,
            height: 36,
            borderRadius: 18,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: pressed ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.1)',
            opacity: !selectedColor.url || downloading ? 0.3 : 1,
          })}
        >
          {downloading ? <Spinner size={18} /> : <Download size={18} color="#ffffff" />}
        </Pressable>
      </View>

      {/* Image + prev/next */}
      <View {...swipe.panHandlers} style={{ flex: 1, minHeight: 0, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 }}>
          {selectedColor.url ? (
            <Animated.View key={selectedColor.properties} entering={FadeIn.duration(220)} style={{ width: '100%', height: '100%' }}>
              <ProductImage uri={selectedColor.url} resizeMode="contain" style={{ width: '100%', height: '100%' }} fallbackIconSize={40} />
            </Animated.View>
          ) : (
            <View style={{ paddingHorizontal: 32, alignItems: 'center' }}>
              <Text style={[t('sm'), { color: 'rgba(255,255,255,0.4)' }]}>No image available</Text>
              <Text style={[t('lg'), { color: '#ffffff', fontWeight: '700', marginTop: 8, textAlign: 'center' }]}>
                {selectedColor.value}
              </Text>
            </View>
          )}
          {prev && arrow('left', prev, ChevronLeft, 'Previous colour')}
          {next && arrow('right', next, ChevronRight, 'Next colour')}
      </View>

      {/* Neighbouring colour names peek at the edges, current one highlighted */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingHorizontal: 16, paddingVertical: 12 }}>
        <Pressable onPress={() => prev && onSelect(prev)} disabled={!prev} style={{ flex: 1, minWidth: 0, opacity: prev ? 1 : 0 }}>
          <Text style={[t('11'), { color: 'rgba(255,255,255,0.35)', textAlign: 'left' }]} numberOfLines={1}>
            {prev?.value}
          </Text>
        </Pressable>
        <View style={{ maxWidth: '46%', backgroundColor: ORANGE, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 6 }}>
          <Text style={[t('sm'), { color: '#ffffff', fontWeight: '700' }]} numberOfLines={1}>
            {selectedColor.value || Object.values(selectedColor)[0]}
          </Text>
        </View>
        <Pressable onPress={() => next && onSelect(next)} disabled={!next} style={{ flex: 1, minWidth: 0, opacity: next ? 1 : 0 }}>
          <Text style={[t('11'), { color: 'rgba(255,255,255,0.35)', textAlign: 'right' }]} numberOfLines={1}>
            {next?.value}
          </Text>
        </Pressable>
      </View>

      {/* Price + quantity */}
      <View style={{ paddingHorizontal: 20, paddingBottom: 32, paddingTop: 4, alignItems: 'center', gap: 12 }}>
        {unit && <Price amount={unit.amount} original={unit.original} style={[t('2xl'), { fontWeight: '800', color: '#ffffff' }]} />}
        {hasSizes ? (
          sizesForColor.length > 0 ? (
            <ScrollView
              style={{ width: '100%', maxHeight: SCREEN_H * 0.26 }}
              contentContainerStyle={{ gap: 8, paddingRight: 4 }}
              nestedScrollEnabled
              keyboardShouldPersistTaps="handled"
            >
              {sizesForColor.map((size) => {
                const key = getSizeKey(size.properties);
                const sQty = skuQtys[key] || 0;
                const sUnit = priceFor(key);
                return (
                  <View
                    key={key}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 12,
                      borderRadius: 16,
                      backgroundColor: 'rgba(255,255,255,0.08)',
                      borderWidth: 1,
                      borderColor: 'rgba(255,255,255,0.1)',
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                    }}
                  >
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={[t('sm'), { color: '#ffffff' }]} numberOfLines={1}>
                        {size.value}
                      </Text>
                      {sUnit && (
                        <Text style={[t('10'), { color: ORANGE, fontWeight: '600' }]}>৳{fmt(sUnit.amount)}/pc</Text>
                      )}
                    </View>
                    <Stepper value={sQty} batch={batch} onChange={(v) => setSkuQty(key, v)} />
                  </View>
                );
              })}
            </ScrollView>
          ) : (
            <Text style={[t('xs'), { color: 'rgba(255,255,255,0.4)' }]}>No sizes available for this colour</Text>
          )
        ) : (
          <Stepper value={qty} batch={batch} onChange={(v) => setSkuQty(selectedColor.properties, v)} />
        )}
      </View>
    </View>
  );
}
