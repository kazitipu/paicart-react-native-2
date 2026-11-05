import React from 'react';
import { View, Text } from 'react-native';
import { Package, Hash, Calendar, ArrowRight, Check, X, Clock, RotateCcw } from 'lucide-react-native';
import ProductImage from '@/components/ui/ProductImage';
import { Pill } from '@/components/orders/OrderBits';
import { C, ORANGE, SHADOW, Press, Spinner } from '@/components/product/ui';
import { TS, tpx, RED } from '@/components/cart/CartBits';

/* ═══════════════════════════════════════════════════════════════════════
   Pieces of the web dashboard Refunds page (pages/dashboard/refund/page.jsx)
   at < 640px. Tailwind v4, no scoped font shrink on this page: named sizes
   carry their own line-height, text-[Npx] inherits the body's 1.5.
   ═══════════════════════════════════════════════════════════════════════ */

const GREEN = '#00B42A';
const RED_STATE = '#F5222D';
const RED200 = '#fecaca';
/* tracking-wide = 0.025em */
const wide = (px) => ({ letterSpacing: px * 0.025 });

export const STATE_META = {
  given: { color: 'emerald', Icon: Check, label: 'Refund Given' },
  rejected: { color: 'red', Icon: X, label: 'Refund Rejected' },
  requested: { color: 'amber', Icon: Clock, label: 'Under Review' },
};

/* `bg-white rounded-2xl border border-gray-100 shadow-sm p-5`: the red
   RotateCcw tile (w-11 h-11 rounded-2xl shadow-md shadow-red-200) + title. */
export function RefundsHeader() {
  return (
    <View
      style={{
        backgroundColor: '#ffffff',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: C.gray100,
        boxShadow: SHADOW.base,
        padding: 20,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 16,
            backgroundColor: RED,
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            boxShadow: `0 4px 6px -1px ${RED200}, 0 2px 4px -2px ${RED200}`,
          }}
        >
          <RotateCcw size={19} color="#ffffff" />
        </View>
        <View style={{ flexShrink: 1 }}>
          <Text style={[TS.lg, { fontWeight: '800', color: C.gray900 }]}>My Refunds</Text>
          <Text style={[TS.xs, { color: C.gray400, marginTop: 2 }]}>
            Track refund status, amount and reason across your orders
          </Text>
        </View>
      </View>
    </View>
  );
}

/* `grid grid-cols-3 gap-2`; each `flex flex-col items-center gap-1.5 py-3
   rounded-2xl border-2` — active orange border on orange-50, inactive
   gray-100 on white (hover gray-200 → pressed). Red count badge
   `absolute -top-2 -right-2.5 min-w-[16px] h-4 text-[9px] font-extrabold`. */
export function RefundTabs({ tabs, value, counts, onChange }) {
  return (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      {tabs.map(({ id, label, Icon }) => {
        const active = value === id;
        return (
          <Press
            key={id}
            onPress={() => onChange(id)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            style={({ pressed }) => ({
              flexGrow: 1,
              flexBasis: 0,
              alignItems: 'center',
              gap: 6,
              paddingVertical: 12,
              borderRadius: 16,
              borderWidth: 2,
              borderColor: active ? ORANGE : pressed ? C.gray200 : C.gray100,
              backgroundColor: active ? C.orange50 : '#ffffff',
            })}
          >
            <View>
              <Icon size={18} color={active ? ORANGE : C.gray400} />
              {counts[id] > 0 && (
                <View
                  style={{
                    position: 'absolute',
                    top: -8,
                    right: -10,
                    minWidth: 16,
                    height: 16,
                    paddingHorizontal: 4,
                    borderRadius: 999,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: RED,
                  }}
                >
                  <Text style={{ fontSize: 9, lineHeight: 12, fontWeight: '800', color: '#ffffff' }}>{counts[id]}</Text>
                </View>
              )}
            </View>
            <Text style={[tpx(11), { fontWeight: '700', color: active ? C.gray800 : C.gray500 }]} numberOfLines={1}>
              {label}
            </Text>
          </Press>
        );
      })}
    </View>
  );
}

/* The web's generic RefundCard. */
export function RefundCard({ image, title, refId, date, amount, state, reason, onOpen, MethodIcon }) {
  const meta = STATE_META[state];
  const given = state === 'given';
  const amt = parseFloat(amount);
  return (
    <View
      style={{
        backgroundColor: '#ffffff',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: C.gray100,
        boxShadow: SHADOW.base,
        overflow: 'hidden',
      }}
    >
      <View style={{ height: 2, backgroundColor: given ? GREEN : state === 'rejected' ? RED_STATE : ORANGE }} />
      <View style={{ padding: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
          <View
            style={{
              width: 56,
              height: 56,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: C.gray100,
              backgroundColor: C.gray50,
              overflow: 'hidden',
              flexShrink: 0,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {image ? (
              <ProductImage uri={image} thumb style={{ width: '100%', height: '100%' }} />
            ) : (
              <Package size={20} color={C.gray200} />
            )}
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
              <Text style={[TS.sm, { fontWeight: '700', color: C.gray800, flexShrink: 1 }]} numberOfLines={1}>
                {title}
              </Text>
              <View style={{ flexShrink: 0 }}>
                <Pill color={meta.color} Icon={meta.Icon}>
                  {meta.label}
                </Pill>
              </View>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginTop: 4 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Hash size={10} color={C.gray400} />
                <Text style={[tpx(11), { color: C.gray400 }]}>{refId}</Text>
              </View>
              {!!date && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Calendar size={10} color={C.gray400} />
                  <Text style={[tpx(11), { color: C.gray400 }]}>{date}</Text>
                </View>
              )}
              {MethodIcon && <MethodIcon size={11} color={C.gray400} />}
            </View>
          </View>
        </View>

        {/* Refund amount */}
        <View
          style={{
            marginTop: 12,
            borderRadius: 12,
            paddingHorizontal: 16,
            paddingVertical: 12,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: given ? '#e5f9e9' : '#fafafa',
            borderWidth: 1,
            borderColor: given ? C.green200 : '#f0f0f0',
          }}
        >
          <Text style={[tpx(11), wide(11), { fontWeight: '700', color: C.gray500, textTransform: 'uppercase' }]}>
            Refunded Amount
          </Text>
          <Text style={[TS.lg, { fontWeight: '800', color: given ? GREEN : C.gray400 }]}>
            {amt > 0 ? `৳${amt.toLocaleString()}` : state === 'rejected' ? '—' : 'Pending'}
          </Text>
        </View>

        {/* Refund reason */}
        <View style={{ marginTop: 10 }}>
          <Text
            style={[tpx(10), wide(10), { fontWeight: '700', color: C.gray400, textTransform: 'uppercase', marginBottom: 4 }]}
          >
            Refund Reason
          </Text>
          <View style={{ backgroundColor: C.gray50, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 }}>
            <Text style={{ fontSize: 12, lineHeight: 19.5, color: C.gray600 }}>{reason || 'No reason provided yet.'}</Text>
          </View>
        </View>

        {onOpen && (
          <Press
            onPress={onOpen}
            style={({ pressed }) => ({
              marginTop: 12,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              paddingVertical: 8,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: C.orange100,
              backgroundColor: pressed ? C.orange50 : 'transparent',
            })}
          >
            {({ pressed }) => (
              <>
                <Text style={[TS.xs, { fontWeight: '700', color: pressed ? '#E05900' : ORANGE }]}>View Details</Text>
                <ArrowRight size={12} color={pressed ? '#E05900' : ORANGE} />
              </>
            )}
          </Press>
        )}
      </View>
    </View>
  );
}

/* `bg-white rounded-2xl border border-gray-100 p-10 text-center`. While the
   first fetch is still out the same card holds a spinner instead (the web
   shows "No refund activity" until its lists arrive). */
export function RefundEmpty({ Icon, text, loading }) {
  return (
    <View
      style={{
        backgroundColor: '#ffffff',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: C.gray100,
        padding: 40,
        alignItems: 'center',
      }}
    >
      {loading ? (
        <Spinner size={24} color={ORANGE} />
      ) : (
        <>
          <View
            style={{
              width: 56,
              height: 56,
              backgroundColor: C.gray50,
              borderRadius: 16,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 12,
            }}
          >
            <Icon size={24} color={C.gray200} />
          </View>
          <Text style={[TS.sm, { fontWeight: '600', color: C.gray500, textAlign: 'center' }]}>No refund activity</Text>
          <Text style={[TS.xs, { color: C.gray400, marginTop: 4, textAlign: 'center' }]}>{text}</Text>
        </>
      )}
    </View>
  );
}
