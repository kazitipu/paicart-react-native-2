import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, TextInput } from 'react-native';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';
import { Minus, Plus, X } from 'lucide-react-native';
import ProductImage from '@/components/ui/ProductImage';
import { findVariantByProperties, propVal } from '@/lib/product';
import { applyDiscount } from '@/lib/discount';
import { Press as Pressable, t, C, ORANGE, ORANGE2, SHADOW, fmt } from './ui';

/* ═══════════════════════════════════════════════════════════════════════
   Variant / quantity selector — the web VariantSelector in its
   `mobileDrawer` form (the only one a phone ever shows; the desktop copy is
   `hidden lg:block`).
   ═══════════════════════════════════════════════════════════════════════ */

const SWATCH = 52;
const SWATCH_GAP = 12;
const ROW_PAD = 12; // pl-2 + pr-1
const COLOR_ROWS = 2; // mobile: max 2 rows

/* Quantity box. Keeps its own text while focused so a re-render from the
   parent (which clamps/rounds to the pack size) never drops keystrokes; it
   resyncs to the committed value on blur. */
export function QtyInput({ value, onChange, style, placeholder = '0', showZero = false, placeholderColor }) {
  const show = (v) => (v ? String(v) : showZero ? String(v || 0) : '');
  const [text, setText] = useState(show(value));
  const focused = useRef(false);
  useEffect(() => {
    if (!focused.current) setText(show(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return (
    <TextInput
      value={text}
      onChangeText={(v) => {
        const d = v.replace(/[^0-9]/g, '');
        setText(d);
        onChange(d);
      }}
      onFocus={() => {
        focused.current = true;
      }}
      onBlur={() => {
        focused.current = false;
        setText(show(value));
      }}
      keyboardType="number-pad"
      placeholder={placeholder}
      placeholderTextColor={placeholderColor || C.gray400}
      selectTextOnFocus
      style={[{ textAlign: 'center', padding: 0, includeFontPadding: false }, style]}
    />
  );
}

/* ৳amount with the struck original inline (PriceTag inside a text run). */
function InlinePrice({ unit, size }) {
  return (
    <>
      ৳{fmt(unit.amount)}
      {unit.original > unit.amount && (
        <Text style={{ fontSize: size * 0.85, color: C.gray400, fontWeight: '400', textDecorationLine: 'line-through' }}>
          {'  '}৳{fmt(unit.original)}
        </Text>
      )}
    </>
  );
}

/* The −/input/+ cluster of a quantity row (w-7 buttons, w-12 input). */
function RowStepper({ qty, onMinus, onPlus, onType }) {
  const on = qty > 0;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <Pressable
        onPress={onMinus}
        hitSlop={4}
        style={({ pressed }) => ({
          width: 28,
          height: 28,
          borderRadius: 8,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: on ? (pressed ? '#E05500' : ORANGE2) : pressed ? C.gray300 : C.gray200,
        })}
      >
        <Minus size={12} color={on ? '#ffffff' : C.gray400} />
      </Pressable>
      <QtyInput
        value={qty}
        onChange={onType}
        style={[
          t('sm'),
          {
            width: 48,
            height: 32,
            fontWeight: '700',
            borderRadius: 8,
            borderWidth: 2,
            backgroundColor: '#ffffff',
            borderColor: on ? 'rgba(255,102,0,0.4)' : C.gray200,
            color: on ? ORANGE2 : C.gray500,
          },
        ]}
      />
      <Pressable
        onPress={onPlus}
        hitSlop={4}
        style={({ pressed }) => ({
          width: 28,
          height: 28,
          borderRadius: 8,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: ORANGE,
          opacity: pressed ? 0.9 : 1,
        })}
      >
        <Plus size={12} color="#ffffff" />
      </Pressable>
    </View>
  );
}

/* One quantity row (size row, or the colours-only row with its thumbnail). */
function QtyRow({ label, image, qty, unit, stock, onSet, batch }) {
  const on = qty > 0;
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        borderRadius: 16,
        borderWidth: 2,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderColor: on ? 'rgba(255,102,0,0.3)' : C.gray100,
        backgroundColor: on ? 'rgba(255,247,237,0.5)' : 'rgba(249,250,251,0.5)',
      }}
    >
      {!!image && (
        <ProductImage
          uri={image}
          thumb
          style={{ width: 32, height: 32, borderRadius: 8, borderWidth: 1, borderColor: C.gray200 }}
          fallbackIconSize={12}
        />
      )}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={t('sm')}>
          <Text style={{ fontWeight: on ? '700' : '500', color: on ? ORANGE2 : C.gray700 }}>{label}</Text>
          {unit && (
            <Text style={[t('10'), { fontWeight: '600', color: ORANGE }]}>
              {'  '}
              <InlinePrice unit={unit} size={9} />
              /pc
            </Text>
          )}
          {stock > 0 && <Text style={[t('10'), { color: C.gray400 }]}>{`  (${stock} in stock)`}</Text>}
        </Text>
      </View>
      <RowStepper qty={qty} onMinus={() => onSet(qty - batch)} onPlus={() => onSet(qty + batch)} onType={onSet} />
    </View>
  );
}

/* A colour swatch. Selection grows it (scale-110) behind a 3px ring with a
   2px white offset and an orange-200 glow. */
function Swatch({ color, selected, total, onPress, onExpand }) {
  /* A static scale, not a per-swatch shared value: products routinely carry
     100+ colours and they are all mounted at once in the drawer. */
  return (
    <Pressable onPress={onPress} style={{ width: SWATCH, height: SWATCH, zIndex: selected ? 10 : 0 }}>
      <View
        style={[
          {
            width: SWATCH,
            height: SWATCH,
            borderRadius: 12,
            backgroundColor: color.url ? '#ffffff' : C.gray50,
            boxShadow: selected
              ? `0 0 0 2px #ffffff, 0 0 0 5px ${ORANGE2}, 0 10px 15px -3px ${C.orange200}, 0 4px 6px -4px ${C.orange200}`
              : `0 0 0 1px ${C.gray200}`,
          },
          selected && { transform: [{ scale: 1.1 }] },
        ]}
      >
        {color.url ? (
          <View style={{ width: '100%', height: '100%', borderRadius: 12, overflow: 'hidden' }}>
            <ProductImage uri={color.url} thumb style={{ width: '100%', height: '100%' }} fallbackIconSize={14} />
            {!!color.value && (
              <View
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: 'rgba(0,0,0,0.5)',
                  paddingVertical: 2,
                  paddingHorizontal: 2,
                }}
              >
                <Text style={{ color: '#ffffff', fontSize: 8, lineHeight: 8, textAlign: 'center' }} numberOfLines={1}>
                  {color.value.slice(0, 10)}
                </Text>
              </View>
            )}
          </View>
        ) : (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 }}>
            <Text
              style={[t('9', 'tight'), { textAlign: 'center', fontWeight: selected ? '700' : '500', color: selected ? C.gray900 : C.gray600 }]}
              numberOfLines={3}
            >
              {color.value || Object.values(color)[0]}
            </Text>
          </View>
        )}
        {total > 0 && (
          <Animated.View
            entering={ZoomIn.duration(180)}
            style={{
              position: 'absolute',
              top: -8,
              left: -8,
              zIndex: 30,
              minWidth: 18,
              height: 18,
              paddingHorizontal: 4,
              borderRadius: 9,
              backgroundColor: ORANGE,
              borderWidth: 1,
              borderColor: '#ffffff',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: SHADOW.base,
            }}
          >
            <Text style={{ color: '#ffffff', fontSize: 8, lineHeight: 10, fontWeight: '700' }}>{total}</Text>
          </Animated.View>
        )}
        {/* The full-screen view is a deliberate, separate magnifier so a mis-tap
            while browsing colours doesn't take over the screen. */}
        <Pressable
          onPress={onExpand}
          hitSlop={8}
          accessibilityLabel="View larger"
          style={({ pressed }) => ({
            position: 'absolute',
            top: -1,
            right: 0,
            zIndex: 30,
            width: 14,
            height: 14,
            borderTopRightRadius: 6,
            backgroundColor: pressed ? ORANGE : C.gray200,
            borderWidth: 1,
            borderColor: pressed ? ORANGE : C.gray300,
            boxShadow: SHADOW.base,
          })}
        />
      </View>
    </Pressable>
  );
}

export default function VariantSelector({
  product,
  width,
  colorsArray,
  allSizes,
  sizesForColor,
  hasVariants,
  selectedColor,
  handleColorClick,
  skuQtys,
  setSkuQty,
  setSkuQtys,
  simpleQty,
  setSimpleQty,
  handleSimpleQtyChange,
  batch,
  maxQty,
  priceRange,
  totalQty,
  selectedSkus,
  getSizeKey,
  colorTotal,
  getUnitPrice,
  discountPct,
  onSwatchExpand,
}) {
  /* Unit price of one variant at the current running total. */
  const unitPriceOf = (variantProperties) => {
    const v = findVariantByProperties(product.variants, variantProperties);
    const raw = getUnitPrice(v?.price, totalQty, priceRange);
    if (!raw) return null;
    return { original: raw, amount: Math.round(applyDiscount(raw, discountPct)) };
  };

  if (!hasVariants) {
    return (
      <View>
        <Text style={[t('xs'), { fontWeight: '600', color: C.gray600, marginBottom: 12 }]}>Quantity</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          <View
            style={{
              flexDirection: 'row',
              borderRadius: 16,
              borderWidth: 2,
              borderColor: C.gray200,
              overflow: 'hidden',
              boxShadow: SHADOW.sm,
            }}
          >
            <Pressable
              onPress={() => setSimpleQty((q) => Math.max(0, q - batch))}
              style={({ pressed }) => ({ paddingHorizontal: 16, paddingVertical: 12, backgroundColor: pressed ? C.orange50 : C.gray50 })}
            >
              {({ pressed }) => <Minus size={15} color={pressed ? ORANGE2 : C.gray600} />}
            </Pressable>
            <QtyInput
              value={simpleQty}
              onChange={handleSimpleQtyChange}
              showZero
              style={[
                t('sm'),
                {
                  width: 64,
                  fontWeight: '700',
                  color: C.gray800,
                  backgroundColor: '#ffffff',
                  borderLeftWidth: 2,
                  borderRightWidth: 2,
                  borderColor: C.gray200,
                },
              ]}
            />
            <Pressable
              onPress={() => setSimpleQty((q) => Math.min(q + batch, maxQty))}
              style={({ pressed }) => ({ paddingHorizontal: 16, paddingVertical: 12, backgroundColor: pressed ? C.orange50 : C.gray50 })}
            >
              {({ pressed }) => <Plus size={15} color={pressed ? ORANGE2 : C.gray600} />}
            </Pressable>
          </View>
          {maxQty < 9999 && (
            <View
              style={{
                borderRadius: 999,
                borderWidth: 1,
                borderColor: C.emerald100,
                backgroundColor: C.emerald50,
                paddingHorizontal: 12,
                paddingVertical: 4,
              }}
            >
              <Text style={[t('xs'), { color: C.emerald600, fontWeight: '500' }]}>{maxQty} in stock</Text>
            </View>
          )}
        </View>
      </View>
    );
  }

  /* Swatch grid geometry: row 1 fills every column the width fits, then
     row 2; only then does a new block of columns start (scroll right). */
  const usable = Math.max(0, (width || 0) - ROW_PAD);
  const numCols = Math.max(1, Math.floor((usable + SWATCH_GAP) / (SWATCH + SWATCH_GAP)));
  const rows = Math.min(COLOR_ROWS, Math.max(1, Math.ceil(colorsArray.length / numCols)));
  const gridH = rows * SWATCH + (rows - 1) * SWATCH_GAP + 20;
  const perPage = numCols * COLOR_ROWS;
  const pages = [];
  for (let i = 0; i < colorsArray.length; i += perPage) pages.push(colorsArray.slice(i, i + perPage));

  return (
    <View style={{ gap: 16 }}>
      {colorsArray.length > 0 && (
        <View>
          <Text style={[t('xs'), { fontWeight: '600', color: C.gray600, marginBottom: 10 }]}>
            {product.propertyNames?.[0] || 'Color'}
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ height: gridH, marginHorizontal: 0 }}
            contentContainerStyle={{ paddingLeft: 8, paddingRight: 4, paddingTop: 12, paddingBottom: 8, gap: SWATCH_GAP }}
          >
            {pages.map((page, p) => {
              const cols = Math.min(numCols, page.length);
              return (
                <View
                  key={p}
                  style={{
                    width: cols * SWATCH + (cols - 1) * SWATCH_GAP,
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    alignContent: 'flex-start',
                    gap: SWATCH_GAP,
                  }}
                >
                  {page.map((color) => (
                    <Swatch
                      key={color.properties}
                      color={color}
                      selected={selectedColor?.properties === color.properties}
                      total={colorTotal(color)}
                      onPress={() => handleColorClick(color)}
                      onExpand={() => {
                        handleColorClick(color);
                        onSwatchExpand?.(color);
                      }}
                    />
                  ))}
                </View>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Colours-only variants: one quantity box for the selected colour. */}
      {colorsArray.length > 0 && allSizes.length === 0 && (
        <View style={{ gap: 8 }}>
          <Text style={[t('xs'), { fontWeight: '600', color: C.gray600, marginBottom: 2 }]}>Quantity per Color</Text>
          {selectedColor ? (
            <QtyRow
              label={selectedColor.value || Object.values(selectedColor)[0]}
              image={selectedColor.url}
              qty={skuQtys[selectedColor.properties] || 0}
              unit={unitPriceOf(selectedColor.properties)}
              stock={findVariantByProperties(product.variants, selectedColor.properties)?.quantity}
              batch={batch}
              onSet={(v) => setSkuQty(selectedColor.properties, v)}
            />
          ) : (
            <Text style={[t('xs'), { color: C.gray400, fontStyle: 'italic', paddingHorizontal: 4 }]}>
              Select a color above to set quantity
            </Text>
          )}
        </View>
      )}

      {sizesForColor.length > 0 && (
        <View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <Text style={[t('xs'), { fontWeight: '600', color: C.gray600 }]}>
              {product.propertyNames?.[1] || 'Size'} &amp; Quantity
            </Text>
            {selectedSkus.length > 0 && (
              <Pressable onPress={() => setSkuQtys({})} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                {({ pressed }) => (
                  <>
                    <X size={10} color={pressed ? C.red500 : C.gray400} />
                    <Text style={[t('10'), { color: pressed ? C.red500 : C.gray400 }]}>Clear all</Text>
                  </>
                )}
              </Pressable>
            )}
          </View>
          {/* ~5 rows visible before the list scrolls (max-h-[320px]). */}
          <ScrollView nestedScrollEnabled style={{ maxHeight: 320 }} contentContainerStyle={{ gap: 8, paddingRight: 4 }} showsVerticalScrollIndicator={false}>
            {sizesForColor.map((size) => {
              const key = getSizeKey(size.properties);
              const v = findVariantByProperties(product.variants, key);
              return (
                <QtyRow
                  key={key}
                  label={size.value}
                  qty={skuQtys[key] || 0}
                  unit={unitPriceOf(key)}
                  stock={v?.quantity}
                  batch={batch}
                  onSet={(val) => setSkuQty(key, val)}
                />
              );
            })}
          </ScrollView>
        </View>
      )}

      {selectedSkus.length > 0 && (
        <Animated.View entering={FadeIn.duration(200)} style={{ paddingTop: 12, borderTopWidth: 1, borderTopColor: C.gray100 }}>
          <Text
            style={[t('10'), { fontWeight: '700', color: C.gray400, textTransform: 'uppercase', letterSpacing: 0.9, marginBottom: 8 }]}
          >
            Order Summary
          </Text>
          <View style={{ gap: 6 }}>
            {selectedSkus.map(([key, q]) => {
              const cp = key.split(';').find((p) => p.startsWith('0'));
              const sp = key.split(';').find((p) => p.startsWith('1'));
              const cName = cp ? propVal(product.props_list?.[cp]) : null;
              const sName = sp ? propVal(product.props_list?.[sp]) : null;
              const cObj = colorsArray.find((c) => c.properties === cp);
              const v = findVariantByProperties(product.variants, key);
              const p = getUnitPrice(v?.price, totalQty, priceRange);
              const n = parseInt(q, 10);
              const amount = Math.round(applyDiscount(p, discountPct)) * n;
              const original = p * n;
              return (
                <View
                  key={key}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 10,
                    backgroundColor: C.gray50,
                    borderRadius: 16,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderWidth: 1,
                    borderColor: C.gray100,
                  }}
                >
                  {!!cObj?.url && (
                    <ProductImage
                      uri={cObj.url}
                      thumb
                      style={{ width: 28, height: 28, borderRadius: 8, borderWidth: 1, borderColor: C.gray200 }}
                      fallbackIconSize={10}
                    />
                  )}
                  <Text style={[t('xs'), { flex: 1, color: C.gray600 }]} numberOfLines={1}>
                    {[cName, sName].filter(Boolean).join(' · ')}
                  </Text>
                  <Text style={[t('xs'), { color: C.gray500, fontWeight: '500' }]}>×{q}</Text>
                  <Text style={[t('xs'), { color: ORANGE2, fontWeight: '700' }]}>
                    <InlinePrice unit={{ amount, original }} size={11} />
                  </Text>
                  <Pressable
                    onPress={() =>
                      setSkuQtys((prev) => {
                        const next = { ...prev };
                        delete next[key];
                        return next;
                      })
                    }
                    hitSlop={8}
                    style={({ pressed }) => ({
                      width: 20,
                      height: 20,
                      borderRadius: 10,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: pressed ? C.red100 : C.gray200,
                    })}
                  >
                    <X size={10} color={C.gray400} />
                  </Pressable>
                </View>
              );
            })}
          </View>
        </Animated.View>
      )}
    </View>
  );
}
