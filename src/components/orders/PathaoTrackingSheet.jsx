/* Pathao tracking for one consignment — opened from the "Pathao Booked"
 * badge (DeliveryRequestPanel). Asks the website's /api/pathao/track for the
 * parcel's current Pathao status and shows it on the same stages as My Home
 * Delivery Request (PATHAO_STAGES). Same screen on the website
 * (paicart-nextjs15 components/PathaoTrackingDialog.jsx). */
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, Modal, Pressable, Dimensions, StyleSheet, ActivityIndicator, Linking } from 'react-native';
import { Truck, RefreshCw, Check, TriangleAlert, ExternalLink, X } from 'lucide-react-native';
import { C, ORANGE, Press, SHADOW } from '@/components/product/ui';
import CopyIdButton from '@/components/CopyIdButton';
import { PATHAO_STAGES, PATHAO_STATUS_LABEL, normalizePathaoStatus } from '@/lib/dashboardData';
import { getPathaoTracking } from '@/lib/pathaoLocations';

const pathaoTrackUrl = (id, phone) =>
  `https://merchant.pathao.com/tracking?consignment_id=${encodeURIComponent(id)}${phone ? `&phone=${encodeURIComponent(phone)}` : ''}`;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
/* "2026-11-23 12:15:04" (Dhaka time) → "23 Nov 2026, 12:15 PM" */
const fmtWhen = (s) => {
  const m = String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/);
  if (!m) return s || '';
  const h = +m[4];
  return `${+m[3]} ${MONTHS[+m[2] - 1]} ${m[1]}, ${h % 12 || 12}:${m[5]} ${h < 12 ? 'AM' : 'PM'}`;
};

export default function PathaoTrackingSheet({ visible, onClose, consignmentId, phone }) {
  const [state, setState] = useState({ loading: false, data: null, error: '' });

  const load = useCallback(() => {
    setState((s) => ({ ...s, loading: true, error: '' }));
    getPathaoTracking(consignmentId)
      .then((data) => setState({ loading: false, data, error: '' }))
      .catch((e) => setState((s) => ({ loading: false, data: s.data, error: e.message })));
  }, [consignmentId]);

  useEffect(() => {
    if (visible && consignmentId) load();
  }, [visible, consignmentId, load]);

  const { loading, data, error } = state;
  const key = data ? normalizePathaoStatus(data.status || data.statusSlug) : null;
  const problem = key === 'cancelled' || key === 'returned';
  const current = PATHAO_STAGES.findIndex((s) => s.key === key);
  const width = Math.min(Dimensions.get('window').width - 32, 400);

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 }}>
        <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.45)' }]} onPress={onClose} accessibilityLabel="Close" />
        <View accessibilityViewIsModal style={{ width, backgroundColor: '#fff', borderRadius: 20, overflow: 'hidden', boxShadow: SHADOW.xl }}>
          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 18, paddingBottom: 14, backgroundColor: C.orange50, borderBottomWidth: 1, borderBottomColor: '#ffedd5' }}>
            <View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: ORANGE, alignItems: 'center', justifyContent: 'center' }}>
              <Truck size={20} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: '800', color: '#111827' }}>Pathao tracking</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                <Text selectable style={{ fontSize: 12, fontWeight: '700', color: '#c2410c' }}>{consignmentId}</Text>
                <CopyIdButton value={consignmentId} />
              </View>
            </View>
            <Press onPress={onClose} hitSlop={10} accessibilityLabel="Close">
              <X size={20} color="#6b7280" />
            </Press>
          </View>

          <View style={{ padding: 18 }}>
            {loading && !data ? (
              <View style={{ alignItems: 'center', paddingVertical: 30, gap: 8 }}>
                <ActivityIndicator color={ORANGE} />
                <Text style={{ fontSize: 13, color: '#6b7280' }}>Checking with Pathao…</Text>
              </View>
            ) : error && !data ? (
              <View style={{ flexDirection: 'row', gap: 8, padding: 12, borderRadius: 14, backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fee2e2' }}>
                <TriangleAlert size={16} color="#b91c1c" />
                <Text style={{ flex: 1, fontSize: 13, color: '#b91c1c' }}>{error}</Text>
              </View>
            ) : data ? (
              <>
                {/* Current status */}
                <View style={{ padding: 14, borderRadius: 14, borderWidth: 1, borderColor: problem ? '#fee2e2' : '#ffedd5', backgroundColor: problem ? '#fef2f2' : '#fffaf5' }}>
                  <Text style={{ fontSize: 10.5, fontWeight: '800', letterSpacing: 0.6, color: '#6b7280' }}>CURRENT STATUS</Text>
                  <Text style={{ marginTop: 2, fontSize: 18, fontWeight: '800', color: problem ? '#b91c1c' : key === 'delivered' ? '#15803d' : '#111827' }}>
                    {PATHAO_STATUS_LABEL[key] || data.status || 'Unknown'}
                  </Text>
                  <Text style={{ marginTop: 2, fontSize: 11.5, color: '#6b7280' }}>
                    Pathao: {String(data.status || '').replace(/_/g, ' ') || '—'}
                    {data.updatedAt ? ` · updated ${fmtWhen(data.updatedAt)}` : ''}
                  </Text>
                </View>

                {/* Stages */}
                {!problem ? (
                  <View style={{ marginTop: 16 }}>
                    {PATHAO_STAGES.map((s, i) => {
                      const done = i < current || key === 'delivered';
                      const now = i === current && key !== 'delivered';
                      const last = i === PATHAO_STAGES.length - 1;
                      return (
                        <View key={s.key} style={{ flexDirection: 'row', gap: 12, minHeight: last ? 24 : 36 }}>
                          <View style={{ alignItems: 'center', width: 24 }}>
                            <View
                              style={{
                                width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
                                backgroundColor: done ? ORANGE : now ? '#fff' : '#e5e7eb',
                                borderWidth: now ? 2 : 0, borderColor: ORANGE,
                              }}
                            >
                              {done ? <Check size={13} color="#fff" strokeWidth={3} /> : now ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: ORANGE }} /> : null}
                            </View>
                            {!last && <View style={{ flex: 1, width: 2, backgroundColor: i < current ? ORANGE : '#e5e7eb' }} />}
                          </View>
                          <Text style={{ paddingTop: 3, fontSize: 13.5, fontWeight: done || now ? '700' : '400', color: done || now ? '#111827' : '#9ca3af' }}>
                            {s.label}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                ) : (
                  <Text style={{ marginTop: 12, fontSize: 12.5, color: '#4b5563', lineHeight: 18 }}>
                    {key === 'returned' ? 'Pathao is returning this parcel to Paicart.' : 'This Pathao delivery was cancelled.'} Our team will contact you — or call{' '}
                    <Text style={{ color: '#c2410c', fontWeight: '700' }} onPress={() => Linking.openURL('tel:+8801629773885')}>+8801629773885</Text>.
                  </Text>
                )}
                {error ? <Text style={{ marginTop: 10, fontSize: 12, color: '#dc2626' }}>{error}</Text> : null}
              </>
            ) : null}

            {/* Actions */}
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
              <Press
                onPress={load}
                disabled={loading}
                style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', paddingVertical: 11, opacity: loading ? 0.6 : 1 }}
              >
                {loading ? <ActivityIndicator size="small" color="#374151" /> : <RefreshCw size={15} color="#374151" />}
                <Text style={{ fontSize: 13.5, fontWeight: '700', color: '#374151' }}>Refresh</Text>
              </Press>
              <Press
                onPress={() => Linking.openURL(pathaoTrackUrl(consignmentId, phone))}
                style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 12, backgroundColor: ORANGE, paddingVertical: 11 }}
              >
                <Text style={{ fontSize: 13.5, fontWeight: '800', color: '#fff' }}>Full tracking</Text>
                <ExternalLink size={14} color="#fff" />
              </Press>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}
