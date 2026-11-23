import React, { useState } from 'react';
import { View, Text, Modal, ScrollView, Pressable, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ProductImage from '@/components/ui/ProductImage';
import { Press } from '@/components/product/ui';
import { toast } from '@/lib/toast';
import { PATHAO_STAGES, PATHAO_STATUS_LABEL, formatDateTime } from '@/lib/dashboardData';
import Icon from './icons';
import { money } from './ui';

/* Port of the web's _overview/HomeDeliveryModal.jsx: the customer's Pathao
   home deliveries (orders / product requests / ship-for-me) in three tabs,
   each with its bill breakdown, request details and delivery timeline.
   <details> accordions become local toggles. */

const TABS = [
  { key: 'order', label: 'Website Order', title: 'My Home Delivery Request', subtitle: 'Website orders with Pathao home delivery tracking.' },
  { key: 'request', label: 'Product Request', title: 'My Home Delivery Request', subtitle: 'Product requests with Pathao home delivery tracking.' },
  { key: 'ship', label: 'Ship for Me', title: 'Ship for Me', subtitle: 'Your China shipments with Pathao last-mile delivery tracking.' },
];

/* Pathao's public tracking page for a consignment */
const trackUrl = (row) =>
  `https://merchant.pathao.com/tracking?consignment_id=${encodeURIComponent(row.consignmentId)}${
    row.recipientPhone ? `&phone=${encodeURIComponent(row.recipientPhone)}` : ''
  }`;

const open = (url) => Linking.openURL(url).catch(() => toast.error('Could not open the link.'));

function StatusPill({ label, terminal }) {
  return (
    <View style={{ paddingHorizontal: 8, paddingVertical: 5, borderRadius: 999, backgroundColor: terminal ? '#fff1f0' : '#fff3e7' }}>
      <Text style={{ fontSize: 9.5, fontWeight: '800', color: terminal ? '#c2463e' : '#bf6417' }} numberOfLines={1}>{label}</Text>
    </View>
  );
}

function Timeline({ row }) {
  const [open_, setOpen] = useState(false);
  const terminal = row.status === 'cancelled' || row.status === 'returned';
  const idx = PATHAO_STAGES.findIndex((s) => s.key === row.status);
  const lastIndex = terminal ? -1 : idx;
  const progress = Math.max(0, Math.min(100, ((lastIndex + 1) / PATHAO_STAGES.length) * 100));
  const reached = Math.max(0, lastIndex + 1);
  const label = PATHAO_STATUS_LABEL[row.status] || 'Request received';

  return (
    <View style={{ marginTop: 9, borderWidth: 1, borderColor: '#e8f0fa', borderRadius: 14, backgroundColor: '#f8fbff', overflow: 'hidden' }}>
      <Pressable onPress={() => setOpen((v) => !v)} style={{ flexDirection: 'row', alignItems: 'center', gap: 9, padding: 11 }}>
        <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: '#eaf3ff', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="truck" size={17} color="#3478bc" strokeWidth={1.7} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ fontSize: 11.5, fontWeight: '800', color: '#2d3742' }}>Pathao Delivery Timeline</Text>
          <Text style={{ fontSize: 10, color: '#7b8998', marginTop: 2 }}>{terminal ? label : `${reached} of 6 delivery steps reached`}</Text>
          <View style={{ height: 4, marginTop: 6, borderRadius: 99, backgroundColor: '#e3eaf2', overflow: 'hidden' }}>
            <View style={{ width: `${progress}%`, height: '100%', borderRadius: 99, backgroundColor: '#3478bc' }} />
          </View>
        </View>
        <StatusPill label={label} terminal={terminal} />
        <View style={{ transform: [{ rotate: open_ ? '180deg' : '0deg' }] }}>
          <Icon name="chevronDown" size={15} color="#7b8998" strokeWidth={2} />
        </View>
      </Pressable>

      {open_ ? (
        <View style={{ paddingHorizontal: 11, paddingBottom: 12, borderTopWidth: 1, borderTopColor: '#e8f0fa' }}>
          {/* stepper */}
          <View style={{ flexDirection: 'row', marginTop: 12 }}>
            {PATHAO_STAGES.map((stage, i) => {
              const done = !terminal && (i < lastIndex || (i === lastIndex && row.status === 'delivered'));
              const current = !terminal && i === lastIndex && row.status !== 'delivered';
              return (
                <View key={stage.key} style={{ flex: 1, alignItems: 'center' }}>
                  {i > 0 ? (
                    <View style={{ position: 'absolute', top: 10, right: '50%', width: '100%', height: 2, backgroundColor: i <= lastIndex && !terminal ? '#22a06b' : '#e3e8ee' }} />
                  ) : null}
                  <View
                    style={{
                      width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center',
                      backgroundColor: done ? '#22a06b' : current ? '#ff6a00' : '#ffffff',
                      borderWidth: done || current ? 0 : 2, borderColor: '#dfe5eb',
                    }}
                  >
                    <Text style={{ color: '#fff', fontSize: 11, fontWeight: '900' }}>{done ? '✓' : current ? '•' : ''}</Text>
                  </View>
                  <Text style={{ marginTop: 5, fontSize: 8.5, lineHeight: 11, textAlign: 'center', color: done || current ? '#2d3742' : '#93a0ad', fontWeight: current ? '800' : '600' }}>
                    {stage.label}
                  </Text>
                </View>
              );
            })}
          </View>

          {/* latest event */}
          <View style={{ flexDirection: 'row', gap: 9, marginTop: 12, padding: 10, borderRadius: 11, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#edf1f5' }}>
            <View style={{ width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: terminal ? '#e0564c' : '#22a06b' }}>
              <Text style={{ color: '#fff', fontSize: 11, fontWeight: '900' }}>{terminal ? '!' : '✓'}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 11.5, fontWeight: '800', color: '#25303b' }}>{label}</Text>
              <Text style={{ fontSize: 10, lineHeight: 14, color: '#6f7b88', marginTop: 2 }}>
                Latest status from Pathao: {row.rawStatus}. Open live tracking for every scan.
              </Text>
              <Text style={{ fontSize: 9.5, color: '#93a0ad', marginTop: 4 }}>{formatDateTime(row.bookedAt)}</Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: 6, marginTop: 9 }}>
            {['cancelled', 'returned'].map((k) => {
              const sel = row.status === k;
              return (
                <View key={k} style={{ paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999, borderWidth: 1, borderColor: sel ? '#f2c9c5' : '#e7ebef', backgroundColor: sel ? '#fff1f0' : '#ffffff' }}>
                  <Text style={{ fontSize: 9.5, fontWeight: '700', color: sel ? '#c2463e' : '#93a0ad' }}>{k === 'cancelled' ? 'Cancelled' : 'Returned'}</Text>
                </View>
              );
            })}
          </View>
        </View>
      ) : null}
    </View>
  );
}

function Cell({ label, value, orange }) {
  return (
    <View style={{ flex: 1, minWidth: 0, padding: 8, borderRadius: 10, backgroundColor: '#f8f9fb', borderWidth: 1, borderColor: '#eef1f4' }}>
      <Text style={{ fontSize: 8.5, fontWeight: '700', color: '#8b95a1', letterSpacing: 0.5 }}>{label}</Text>
      <Text style={{ fontSize: 11.5, fontWeight: '800', color: orange ? '#e66a1b' : '#25303b', marginTop: 3 }} numberOfLines={1}>{value}</Text>
    </View>
  );
}

function BreakRow({ label, value, total }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, ...(total ? { borderTopWidth: 1, borderTopColor: '#f0f2f4', marginTop: 2, paddingTop: 7 } : null) }}>
      <Text style={{ fontSize: 10.5, color: total ? '#25303b' : '#6f7b88', fontWeight: total ? '800' : '500' }}>{label}</Text>
      <Text style={{ fontSize: 11, fontWeight: '800', color: total ? '#e66a1b' : '#25303b' }}>{value}</Text>
    </View>
  );
}

function SmallBtn({ label, primary, onPress }) {
  return (
    <Press
      onPress={onPress}
      style={({ pressed }) => ({
        paddingHorizontal: 11, paddingVertical: 8, borderRadius: 9, borderWidth: 1,
        borderColor: primary ? '#ffd8be' : '#ece9e6', backgroundColor: primary ? '#fff5ed' : '#ffffff', opacity: pressed ? 0.7 : 1,
      })}
    >
      <Text style={{ fontSize: 11, fontWeight: '800', color: primary ? '#d45b08' : '#59636e' }}>{label}</Text>
    </Press>
  );
}

function DeliveryCard({ row, onOpenRecord }) {
  const [details, setDetails] = useState(false);
  const [bill, setBill] = useState(false);
  const fee = row.deliveryFee || 0;
  return (
    <View style={{ padding: 12, borderWidth: 1, borderColor: '#e9edf1', borderRadius: 15, backgroundColor: '#ffffff', boxShadow: '0 3px 12px rgba(32,42,54,0.035)' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={{ width: 28, height: 28, borderRadius: 9, backgroundColor: '#fff1e7', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="box" size={15} color="#e66a1b" />
        </View>
        <Text style={{ flex: 1, fontSize: 12.5, fontWeight: '800', color: '#25303b' }} numberOfLines={1}>{row.title}</Text>
        <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, backgroundColor: '#eaf3ff' }}>
          <Text style={{ fontSize: 9.5, fontWeight: '800', color: '#3478bc' }}>Pathao</Text>
        </View>
      </View>
      <Text style={{ fontSize: 10, color: '#8b95a1', marginTop: 6 }}>Booked {formatDateTime(row.bookedAt)}</Text>

      <View style={{ flexDirection: 'row', gap: 7, marginTop: 9 }}>
        <Cell label={row.kind === 'order' ? 'ORDER ID' : 'BOOKING ID'} value={row.id} />
        <Cell label="CONSIGNMENT ID" value={row.consignmentId} orange />
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 9 }}>
        <View style={{ width: 48, height: 48, borderRadius: 11, overflow: 'hidden', borderWidth: 1, borderColor: '#edf0f3', backgroundColor: '#f6f7f9' }}>
          {row.image ? <ProductImage uri={row.image} style={{ width: '100%', height: '100%' }} fallbackIconSize={16} /> : null}
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#25303b' }} numberOfLines={2}>{row.title}</Text>
          {row.qty > 0 ? <Text style={{ fontSize: 10, color: '#8b95a1', marginTop: 2 }}>Qty: <Text style={{ fontWeight: '800', color: '#25303b' }}>{row.qty}</Text></Text> : null}
        </View>
      </View>

      <View style={{ marginTop: 9, borderWidth: 1, borderColor: '#eef1f4', borderRadius: 11, overflow: 'hidden' }}>
        <Pressable onPress={() => setBill((v) => !v)} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 9, backgroundColor: '#fafbfc' }}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: '#3c4651' }}>Bill Details & Breakdown</Text>
          <Text style={{ fontSize: 10.5, fontWeight: '800', color: '#e66a1b' }}>{bill ? 'Collapse' : 'Expand'}</Text>
        </Pressable>
        {bill ? (
          <View style={{ paddingHorizontal: 10, paddingBottom: 8 }}>
            <BreakRow label="Product bill due" value={money(row.productDue)} />
            <BreakRow label="Pathao delivery charge" value={row.deliveryFee == null ? '—' : money(fee)} />
            <BreakRow label="Pathao collection amount" value={money(row.amountToCollect)} total />
          </View>
        ) : null}
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
        <Text style={{ fontSize: 11, color: '#3c4651', fontWeight: '600' }}>Pathao Collection Amount:</Text>
        <Text style={{ fontSize: 14, fontWeight: '900', color: '#e66a1b' }}>{money(row.amountToCollect)}</Text>
      </View>
      <Text style={{ fontSize: 9.5, color: '#8b95a1', marginTop: 2 }}>Collected by the rider on delivery (cash on delivery)</Text>

      <Press
        onPress={() => setDetails((v) => !v)}
        style={({ pressed }) => ({ marginTop: 10, paddingVertical: 10, borderRadius: 11, borderWidth: 1, borderColor: '#e1e6eb', alignItems: 'center', backgroundColor: pressed ? '#f6f7f9' : '#ffffff' })}
      >
        <Text style={{ fontSize: 12, fontWeight: '800', color: '#344050' }}>{details ? 'Hide Details' : 'View Details'}</Text>
      </Press>

      {details ? (
        <View style={{ marginTop: 10, padding: 10, borderRadius: 12, backgroundColor: '#fbfcfd', borderWidth: 1, borderColor: '#edf0f3' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <Text style={{ fontSize: 11.5, fontWeight: '800', color: '#25303b' }}>Pathao Request Details</Text>
            <Text style={{ fontSize: 10, fontWeight: '700', color: '#bf6417' }}>{PATHAO_STATUS_LABEL[row.status]}</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 7 }}>
            <Cell label="CONSIGNMENT ID" value={row.consignmentId} />
            <Cell label="RECIPIENT PHONE" value={row.recipientPhone || '—'} />
          </View>
          <View style={{ flexDirection: 'row', gap: 7, marginTop: 7 }}>
            <Cell label="DELIVERY PARTNER" value="Pathao" />
            <Cell label="COLLECTION METHOD" value={row.amountToCollect > 0 ? 'Cash on Delivery (COD)' : 'No collection due'} />
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
            <SmallBtn primary label="Track on Pathao ↗" onPress={() => open(trackUrl(row))} />
            <SmallBtn label={`Open ${row.kind === 'order' ? 'order' : 'booking'}`} onPress={() => onOpenRecord(row)} />
          </View>
        </View>
      ) : null}

      <Timeline row={row} />
    </View>
  );
}

export default function HomeDeliveryModal({ visible, rows, onClose, onOpenRecord }) {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState('order');
  const meta = TABS.find((t) => t.key === tab);
  const list = rows.filter((r) => r.kind === tab);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 10, paddingTop: insets.top + 12, paddingBottom: insets.bottom + 12 }}>
        <Pressable accessibilityLabel="Close request window" onPress={onClose} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(20,27,36,0.48)' }} />
        <View style={{ maxHeight: '100%', borderRadius: 20, borderWidth: 1, borderColor: '#e9edf1', backgroundColor: '#ffffff', overflow: 'hidden', boxShadow: '0 22px 60px rgba(15,23,32,0.25)' }}>
          {/* header */}
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 14, paddingHorizontal: 15, paddingTop: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#f0f2f4' }}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ fontSize: 9.5, fontWeight: '800', letterSpacing: 1.1, color: '#e66a1b', marginBottom: 5 }}>PAICART · MY REQUEST</Text>
              <Text style={{ fontSize: 17, fontWeight: '800', color: '#222b35' }}>{meta.title}</Text>
              <Text style={{ fontSize: 11, color: '#87919c', marginTop: 4 }}>{meta.subtitle}</Text>
            </View>
            <Press
              onPress={onClose}
              accessibilityLabel="Close"
              style={({ pressed }) => ({ width: 34, height: 34, borderRadius: 11, borderWidth: 1, borderColor: '#edf0f3', alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? '#f6f7f9' : '#ffffff' })}
            >
              <Icon name="close" size={17} color="#687482" strokeWidth={2} />
            </Press>
          </View>

          {/* tabs */}
          <View style={{ flexDirection: 'row', gap: 5, paddingHorizontal: 10, paddingTop: 10, paddingBottom: 9 }}>
            {TABS.map((t) => {
              const active = tab === t.key;
              const n = rows.filter((r) => r.kind === t.key).length;
              return (
                <Press
                  key={t.key}
                  onPress={() => setTab(t.key)}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                  style={{
                    flex: 1, minHeight: 40, paddingHorizontal: 3, borderRadius: 11, borderWidth: 1, alignItems: 'center', justifyContent: 'center',
                    borderColor: active ? '#ffd2b5' : '#e9edf1', backgroundColor: active ? '#fff0e3' : '#f8f9fa',
                  }}
                >
                  <Text style={{ fontSize: 10.5, fontWeight: '800', color: active ? '#d95700' : '#6d7783' }} numberOfLines={1}>
                    {t.label}{n > 0 ? ` (${n})` : ''}
                  </Text>
                </Press>
              );
            })}
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 9, marginHorizontal: 10, marginBottom: 10, padding: 10, borderRadius: 13, borderWidth: 1, borderColor: '#edf0f3', backgroundColor: '#f8fafc' }}>
            <View style={{ width: 32, height: 32, borderRadius: 10, borderWidth: 1, borderColor: '#ffe0ca', backgroundColor: '#fff2e8', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="truck" size={18} color="#eb6508" strokeWidth={1.7} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 11.5, fontWeight: '800', color: '#2d3742' }}>Pathao Delivery Tracking</Text>
              <Text style={{ fontSize: 9.5, lineHeight: 13, color: '#7b8998', marginTop: 2 }}>
                Pickup requested · Rider assigned · Picked from Paicart · In Transit · Ready for Delivery · Delivered · Cancelled · Returned
              </Text>
            </View>
          </View>

          <ScrollView style={{ flexGrow: 0, flexShrink: 1 }} contentContainerStyle={{ paddingHorizontal: 10, paddingBottom: 12, gap: 9 }}>
            {list.length === 0 ? (
              <View style={{ minHeight: 150, alignItems: 'center', justifyContent: 'center', padding: 18, borderRadius: 15, borderWidth: 1, borderStyle: 'dashed', borderColor: '#e4e9ee', backgroundColor: '#fbfcfd' }}>
                <View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: '#fff1e7', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="truck" size={21} color="#e66a1b" />
                </View>
                <Text style={{ marginTop: 9, fontSize: 12, fontWeight: '800', color: '#3c4651', textAlign: 'center' }}>No {meta.label} home delivery requests yet</Text>
                <Text style={{ marginTop: 4, maxWidth: 260, fontSize: 10.5, lineHeight: 15, color: '#8b95a1', textAlign: 'center' }}>
                  When Paicart books your parcel with Pathao it will appear here with live tracking.
                </Text>
              </View>
            ) : (
              list.map((row) => <DeliveryCard key={`${row.kind}-${row.id}`} row={row} onOpenRecord={onOpenRecord} />)
            )}
          </ScrollView>

          <Text style={{ paddingHorizontal: 13, paddingTop: 9, paddingBottom: 12, borderTopWidth: 1, borderTopColor: '#f0f2f4', fontSize: 9.5, color: '#a0a8b1', textAlign: 'center' }}>
            Pathao collection amount is what the rider collects on delivery.
          </Text>
        </View>
      </View>
    </Modal>
  );
}
