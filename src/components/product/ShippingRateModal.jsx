import React, { memo, useState } from 'react';
import { View, Text, ScrollView, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';
import { Plane, Ship, Tag, X, ChevronUp, ChevronDown, ArrowRight, ShieldAlert } from 'lucide-react-native';
import { Press as Pressable, Overlay, ScalePress, Radio, Chip, t, C, ORANGE, ORANGE2, SHADOW, DG_TONES } from './ui';

const { height: SCREEN_H } = Dimensions.get('window');
const BN_NOTE =
  '*এই ওজন ও রেট আনুমানিক। চূড়ান্ত শিপিং চার্জ পণ্য চীন ওয়্যারহাউসে পৌঁছানোর পর চূড়ান্ত পরিমাপের ভিত্তিতে নিশ্চিত করা হবে।';

/* One shipping method — the platform's own cargo service priced for one goods
   type: radio + carrier tile + headline rate on the collapsed card, kg slots /
   route / caveat behind the chevron. Selecting re-prices the order (it sets
   the goods type); expanding is independent of selecting. */
function ShippingMethodCard({ method, mode, selected, onSelect, open, onToggle }) {
  const { label, Icon, id, tiers, mainTier, originWarehouse } = method;
  const ModeIcon = mode === 'sea' ? Ship : Plane;
  const modeLabel = mode === 'sea' ? 'Cargo - By Sea' : 'Cargo - By Air';
  const transitTime = mode === 'sea' ? '40-45 Days' : '14-20 Days';
  const rateText = `৳${mainTier?.rate.toLocaleString()}${mainTier?.unit || ''}`;

  return (
    <Animated.View
      layout={LinearTransition.duration(200)}
      style={{
        borderRadius: 12,
        borderWidth: 1,
        borderColor: selected ? ORANGE : C.gray200,
        backgroundColor: selected ? 'rgba(255,247,237,0.3)' : '#ffffff',
        overflow: 'hidden',
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 10 }}>
        <Pressable onPress={onSelect} style={{ flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Radio selected={selected} />
          <View style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: ORANGE, alignItems: 'center', justifyContent: 'center' }}>
            <ModeIcon size={16} color="#ffffff" />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[t('12'), { fontWeight: '700', color: C.gray800 }]} numberOfLines={1}>
              Paicart Cargo Shipping
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <ModeIcon size={10} color={C.gray500} />
              <Text style={[t('10'), { color: C.gray500 }]}>{modeLabel}</Text>
            </View>
            <Text style={[t('10'), { color: C.gray400 }]}>
              Shipping Time: <Text style={{ fontWeight: '600', color: C.gray600 }}>{transitTime}</Text>
            </Text>
          </View>
        </Pressable>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={[t('15', 'tight'), { fontWeight: '800', color: ORANGE }]} numberOfLines={1}>
              ৳{mainTier?.rate.toLocaleString()}
              <Text style={[t('10'), { fontWeight: '500', color: C.gray400 }]}>{mainTier?.unit}</Text>
            </Text>
            <Chip Icon={Icon} label={label} tone={DG_TONES[id] || DG_TONES.regular} size={9} iconSize={9} gap={4} />
          </View>
          <Pressable
            onPress={onToggle}
            hitSlop={8}
            accessibilityLabel={open ? 'Hide kg slot price' : 'Show kg slot price'}
            style={({ pressed }) => ({
              width: 24,
              height: 24,
              borderRadius: 6,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: pressed ? C.gray100 : 'transparent',
            })}
          >
            {open ? <ChevronUp size={14} color={C.gray500} /> : <ChevronDown size={14} color={C.gray500} />}
          </Pressable>
        </View>
      </View>

      {open && (
        <Animated.View
          entering={FadeIn.duration(180)}
          exiting={FadeOut.duration(120)}
          style={{ borderTopWidth: 1, borderTopColor: C.gray100, paddingHorizontal: 12, paddingVertical: 10, gap: 10 }}
        >
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Text style={[t('11'), { fontWeight: '700', color: C.gray700, width: 74 }]}>Kg Slot Price:</Text>
            <View style={{ flex: 1, gap: 4 }}>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
                <Text style={[t('11'), { fontWeight: '600', color: C.gray700 }]}>Main Price:</Text>
                <Text style={[t('11'), { fontWeight: '700', color: C.gray800 }]}>{rateText}</Text>
              </View>
              {tiers.map((tr) => (
                <View key={tr.sub} style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
                  <Text style={[t('11'), { flexShrink: 1, fontWeight: tr.active ? '700' : '500', color: tr.active ? ORANGE : C.gray500 }]}>
                    {tr.label}
                    <Text style={{ fontWeight: '400', color: C.gray400 }}> ({tr.sub})</Text>
                  </Text>
                  <Text style={[t('11'), { fontWeight: tr.active ? '800' : '600', color: tr.active ? ORANGE : C.gray600 }]}>
                    ৳{tr.rate.toLocaleString()}
                    {tr.unit}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Text style={[t('11'), { fontWeight: '700', color: C.gray700, width: 74 }]}>Route:</Text>
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
              <Text style={[t('11'), { color: C.gray600 }]}>{originWarehouse}</Text>
              <ArrowRight size={11} color={ORANGE} />
              <Text style={[t('11'), { color: C.gray600 }]}>Dhaka Warehouse, BD</Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Text style={[t('11'), { fontWeight: '700', color: C.gray700, width: 74 }]}>N.B.</Text>
            <Text style={[t('10', 'relaxed'), { flex: 1, color: C.gray500 }]}>
              This rate of <Text style={{ fontWeight: '600', color: C.gray700 }}>{rateText}</Text> covers freight up to our
              Dhaka warehouse only, not doorstep delivery. Courier charge inside Bangladesh is paid separately.
            </Text>
          </View>
        </Animated.View>
      )}
    </Animated.View>
  );
}

const Label = ({ children }) => (
  <Text style={[t('xs'), { fontWeight: '700', color: C.gray700, marginBottom: 6 }]}>{children}</Text>
);

/* Shipping-category picker + full rate table (web ShippingRateModal) as an
   in-screen bottom sheet with the orange header and tinted drag handle. */
function ShippingRateModal({
  visible,
  productType,
  shipMode,
  setShipMode,
  shippingMethods,
  effectiveGoodsType,
  onSelectGoodsType,
  quoteWeightKg,
  quoteCharge,
  totalQty,
  onClose,
}) {
  const insets = useSafeAreaInsets();

  /* The method that actually prices the order is expanded on open; reset
     during render (not in an effect) so a stale row never flashes open. */
  const [openMethod, setOpenMethod] = useState(effectiveGoodsType);
  const [syncedGoodsType, setSyncedGoodsType] = useState(effectiveGoodsType);
  if (syncedGoodsType !== effectiveGoodsType) {
    setSyncedGoodsType(effectiveGoodsType);
    setOpenMethod(effectiveGoodsType);
  }
  const isDgSelected = effectiveGoodsType !== 'regular';

  return (
    <Overlay visible={visible} onClose={onClose} zIndex={50} scrim="rgba(0,0,0,0.55)">
      <View
        style={{
          backgroundColor: '#ffffff',
          maxHeight: SCREEN_H * 0.92,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          overflow: 'hidden',
          boxShadow: SHADOW['2xl'],
        }}
      >
        <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 4, backgroundColor: ORANGE }}>
          <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.4)' }} />
        </View>

        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, backgroundColor: ORANGE }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
            <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' }}>
              <Tag size={16} color="#ffffff" />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[t('sm'), { fontWeight: '700', color: '#ffffff' }]}>Shipping Rate Details</Text>
              <Text style={[t('xs'), { color: 'rgba(255,255,255,0.7)' }]} numberOfLines={1}>
                {productType || 'Others'}
              </Text>
            </View>
          </View>
          <Pressable
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
          </Pressable>
        </View>

        <ScrollView style={{ flexGrow: 0, flexShrink: 1 }} contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 16, gap: 16 }} overScrollMode="never">
          {/* Product Category — auto-detected, never a manual pick. */}
          <View>
            <Label>Product Category</Label>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                backgroundColor: C.gray50,
                borderWidth: 1,
                borderColor: C.gray200,
                borderRadius: 12,
                paddingHorizontal: 12,
                paddingVertical: 10,
              }}
            >
              <Tag size={13} color={ORANGE} />
              <Text style={[t('sm'), { flex: 1, fontWeight: '500', color: C.gray800 }]} numberOfLines={1}>
                {productType || 'Others'}
              </Text>
              <View style={{ backgroundColor: '#ffffff', borderWidth: 1, borderColor: C.gray200, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 }}>
                <Text style={[t('9'), { fontWeight: '600', color: C.gray400 }]}>Auto-detected</Text>
              </View>
            </View>
          </View>

          <View>
            <Label>Shipping Mode</Label>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 20, rowGap: 8 }}>
              {[
                { id: 'air', label: 'Air Cargo', Icon: Plane },
                { id: 'sea', label: 'Sea Cargo', Icon: Ship },
              ].map(({ id, label, Icon }) => (
                <Pressable key={id} onPress={() => setShipMode(id)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Radio selected={shipMode === id} />
                  <Icon size={12} color={shipMode === id ? ORANGE : C.gray400} />
                  <Text style={[t('12'), { fontWeight: '600', color: shipMode === id ? C.gray800 : C.gray500 }]}>{label}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View>
            <Label>Select Shipping Method</Label>
            <View style={{ gap: 8 }}>
              {shippingMethods.map((method) => (
                <ShippingMethodCard
                  key={method.id}
                  method={method}
                  mode={shipMode}
                  selected={effectiveGoodsType === method.id}
                  onSelect={() => onSelectGoodsType(method.id)}
                  open={openMethod === method.id}
                  onToggle={() => setOpenMethod((cur) => (cur === method.id ? null : method.id))}
                />
              ))}
            </View>
            {isDgSelected && (
              <View style={{ marginTop: 8, flexDirection: 'row', alignItems: 'flex-start', gap: 4 }}>
                <ShieldAlert size={11} color={C.red600} style={{ marginTop: 2 }} />
                <Text style={[t('11'), { flex: 1, color: C.red600 }]}>
                  Special-handling goods ship via the Hong Kong warehouse, so this is already the higher DG rate. Extra
                  restrictions may still apply, confirmed after warehouse inspection.
                </Text>
              </View>
            )}
          </View>

          {/* Approximate weight/cost preview — 1 pc until variants are picked. */}
          <View style={{ backgroundColor: 'rgba(255,247,237,0.6)', borderWidth: 1, borderColor: C.orange100, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12 }}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 20, rowGap: 4 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: C.gray400 }} />
                <Text style={[t('12'), { fontWeight: '600', color: C.gray700 }]}>
                  Approximate weight: <Text style={{ color: C.gray900 }}>{quoteWeightKg}kg</Text>
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: C.gray400 }} />
                <Text style={[t('12'), { fontWeight: '600', color: C.gray700 }]}>
                  Approximate shipping cost: <Text style={{ color: ORANGE2 }}>৳{quoteCharge.toLocaleString()}</Text>
                </Text>
              </View>
            </View>
            {totalQty === 0 && (
              <Text style={[t('10'), { marginTop: 4, color: C.gray500 }]}>Quoted for 1 pc — pick your variants for the full order.</Text>
            )}
            <Text style={[t('10', 'relaxed'), { marginTop: 6, color: C.red500 }]}>{BN_NOTE}</Text>
          </View>
        </ScrollView>

        <View style={{ flexDirection: 'row', gap: 12, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16 + insets.bottom, borderTopWidth: 1, borderTopColor: C.gray100 }}>
          <Pressable
            onPress={onClose}
            style={({ pressed }) => ({
              flex: 1,
              borderWidth: 2,
              borderColor: C.gray200,
              borderRadius: 12,
              paddingVertical: 10,
              alignItems: 'center',
              backgroundColor: pressed ? C.gray50 : '#ffffff',
            })}
          >
            <Text style={[t('13'), { fontWeight: '700', color: C.gray600 }]}>Close</Text>
          </Pressable>
          <View style={{ flex: 1 }}>
            <ScalePress onPress={onClose} style={{ backgroundColor: ORANGE, borderRadius: 12, paddingVertical: 12, alignItems: 'center' }}>
              <Text style={[t('13'), { fontWeight: '700', color: '#ffffff' }]}>Done</Text>
            </ScalePress>
          </View>
        </View>
      </View>
    </Overlay>
  );
}

/* Rendered on every Product render; nothing to update while it stays closed
   (Overlay renders null then). */
export default memo(ShippingRateModal, (prev, next) => !prev.visible && !next.visible);
