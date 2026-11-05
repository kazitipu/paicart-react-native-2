import React, { memo, useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { ShieldAlert, ChevronDown, ChevronUp } from 'lucide-react-native';
import ProductImage from '@/components/ui/ProductImage';
import { SIZE_ROWS_COLLAPSED } from '@/lib/product';
import { Chip, t, C, ORANGE2, DG_TONES } from './ui';

const BN_NOTE =
  '*এই ওজন ও মাপ আনুমানিক। চূড়ান্ত শিপিং চার্জ পণ্য চীন ওয়্যারহাউসে পৌঁছানোর পর চূড়ান্ত পরিমাপের ভিত্তিতে নিশ্চিত করা হবে।';

/* `min-w-[520px]` table: the numeric columns size to their nowrap headers,
   the Specification column takes what is left. */
const COL = { dim: 86, cbm: 78, weight: 86 };
const TABLE_MIN = 520;

/* Per-variant parcel size & weight (web SizeWeightTable). Six columns never
   fit a phone, so the table scrolls sideways inside its own box. */
function SizeWeightTable({ rows, hasDims, hasWeights, dgTypes = [] }) {
  const [expanded, setExpanded] = useState(false);
  const fixed = (hasDims ? COL.dim * 3 + COL.cbm : 0) + (hasWeights ? COL.weight : 0);
  const specW = Math.max(150, TABLE_MIN - fixed);
  const shown = expanded ? rows : rows.slice(0, SIZE_ROWS_COLLAPSED);

  const th = (label, w, sup) => (
    <View style={{ width: w, paddingHorizontal: 12, paddingVertical: 10 }}>
      <Text style={[t('xs'), { fontWeight: '600', color: C.gray600 }]} numberOfLines={1}>
        {label}
        {sup && <Text style={{ fontSize: 8 }}>3</Text>}
        {sup && ')'}
      </Text>
    </View>
  );
  const td = (value, w) => (
    <View style={{ width: w, paddingHorizontal: 12, paddingVertical: 8, justifyContent: 'center' }}>
      <Text style={[t('xs'), { color: C.gray700 }]}>{value}</Text>
    </View>
  );

  return (
    <View>
      <Text style={[t('sm'), { fontWeight: '700', color: C.gray800 }]}>Product Size &amp; Weight</Text>
      <Text style={[t('11', 'snug'), { marginTop: 4, color: '#e62222' }]}>{BN_NOTE}</Text>

      {dgTypes.length > 0 && (
        <View
          style={{
            marginTop: 8,
            flexDirection: 'row',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: 6,
            backgroundColor: C.red50,
            borderWidth: 1,
            borderColor: C.red200,
            borderRadius: 8,
            paddingHorizontal: 10,
            paddingVertical: 8,
          }}
        >
          <ShieldAlert size={12} color={C.red500} />
          <Text style={[t('10'), { fontWeight: '700', color: C.red700 }]}>Special handling —</Text>
          {dgTypes.map(({ id, label, Icon }) => (
            <Chip key={id} Icon={Icon} label={label} tone={DG_TONES[id]} size={10} iconSize={10} gap={4} />
          ))}
          <Text style={[t('10'), { color: 'rgba(220,38,38,0.8)' }]}>— shipping charges may differ from standard items.</Text>
        </View>
      )}

      <View style={{ marginTop: 12, borderRadius: 12, borderWidth: 1, borderColor: C.gray100, overflow: 'hidden' }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} nestedScrollEnabled>
          <View style={{ minWidth: TABLE_MIN }}>
            <View style={{ flexDirection: 'row', backgroundColor: C.gray50 }}>
              {th('Specification', specW)}
              {hasDims && (
                <>
                  {th('Length (cm)', COL.dim)}
                  {th('Width (cm)', COL.dim)}
                  {th('Height (cm)', COL.dim)}
                  {th('CBM (m', COL.cbm, true)}
                </>
              )}
              {hasWeights && th('Weight (kg)', COL.weight)}
            </View>
            {shown.map((row, i) => (
              <Animated.View
                key={row.key}
                entering={i >= SIZE_ROWS_COLLAPSED ? FadeIn.duration(200) : undefined}
                style={{ flexDirection: 'row', borderTopWidth: 1, borderTopColor: C.gray100 }}
              >
                <View style={{ width: specW, paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  {row.image ? (
                    <ProductImage
                      uri={row.image}
                      thumb
                      style={{ width: 36, height: 36, borderRadius: 6, borderWidth: 1, borderColor: C.gray100, backgroundColor: C.gray50 }}
                      fallbackIconSize={12}
                    />
                  ) : (
                    <View style={{ width: 36, height: 36, borderRadius: 6, borderWidth: 1, borderColor: C.gray100, backgroundColor: C.gray50 }} />
                  )}
                  <Text style={[t('xs', 'snug'), { flex: 1, color: C.gray800 }]}>{row.label}</Text>
                </View>
                {hasDims && (
                  <>
                    {td(row.length ?? '—', COL.dim)}
                    {td(row.width ?? '—', COL.dim)}
                    {td(row.height ?? '—', COL.dim)}
                    {td(row.cbm ? row.cbm.toFixed(4) : '—', COL.cbm)}
                  </>
                )}
                {hasWeights && td(row.weight ?? '—', COL.weight)}
              </Animated.View>
            ))}
          </View>
        </ScrollView>
      </View>

      {rows.length > SIZE_ROWS_COLLAPSED && (
        <Pressable
          onPress={() => setExpanded((v) => !v)}
          style={{ width: '100%', marginTop: 8, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 }}
        >
          {({ pressed }) => (
            <>
              <Text style={[t('xs'), { fontWeight: '600', color: pressed ? ORANGE2 : C.gray600 }]}>
                {expanded ? 'Show less variations' : `Show all ${rows.length} variations`}
              </Text>
              {expanded ? (
                <ChevronUp size={14} color={pressed ? ORANGE2 : C.gray600} />
              ) : (
                <ChevronDown size={14} color={pressed ? ORANGE2 : C.gray600} />
              )}
            </>
          )}
        </Pressable>
      )}
    </View>
  );
}

export default memo(SizeWeightTable);
