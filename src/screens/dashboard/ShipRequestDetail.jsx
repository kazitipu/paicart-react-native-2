import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, ActivityIndicator, Pressable, Linking } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSelector, useDispatch } from 'react-redux';
import Clipboard from '@react-native-clipboard/clipboard';
import { FileText, Copy } from 'lucide-react-native';
import DashboardLayout from '@/components/DashboardLayout';
import ShipmentCard from '@/components/shipping/ShipmentCard';
import ShipmentProgress from '@/components/shipping/ShipmentProgress';
import ShipmentPaymentModal from '@/components/shipping/ShipmentPaymentModal';
import RefundApplyModal from '@/components/RefundApplyModal';
import EmptyState from '@/components/ui/EmptyState';
import { getAllShipForMeOfSingleUserRedux } from '@/store/actions';
import { getSingleShipForMe, getAllWarehouses } from '@/lib/firebaseUtils';
import { refundMode } from '@/lib/refund';
import { toast } from '@/lib/toast';
import colors from '@/theme/colors';

export default function ShipRequestDetail() {
  const navigation = useNavigation();
  const route = useRoute();
  const dispatch = useDispatch();
  const { bookingId } = route.params || {};

  const currentUser = useSelector((s) => s.user?.currentUser);
  const cached = useSelector((s) =>
    (s.bookingRequests?.shipForMeOfSingleUser || []).find(
      (r) => String(r.bookingId) === String(bookingId),
    ),
  );

  const [req, setReq] = useState(cached || null);
  const [loading, setLoading] = useState(!cached);
  const [warehouses, setWarehouses] = useState([]);
  const [payOpen, setPayOpen] = useState(false);
  const [refundOpen, setRefundOpen] = useState(false);

  const load = useCallback(() => {
    getSingleShipForMe(bookingId)
      .then((r) => setReq(r || null))
      .catch(() => {})
      .finally(() => setLoading(false));
    if (currentUser?.id) dispatch(getAllShipForMeOfSingleUserRedux(currentUser.id));
  }, [bookingId, currentUser?.id, dispatch]);

  useEffect(() => {
    load();
    getAllWarehouses().then((w) => setWarehouses(w || [])).catch(() => {});
  }, [load]);

  useEffect(() => {
    if (cached) setReq(cached);
  }, [cached]);

  /* The admin writes each milestone's date under `${status}Date`. */
  const dates = useMemo(() => {
    if (!req) return {};
    const out = {};
    Object.keys(req).forEach((k) => {
      if (k.endsWith('Date') && req[k]) out[k.replace(/Date$/, '')] = req[k];
    });
    return out;
  }, [req]);

  const docs = useMemo(
    () =>
      [
        { label: 'Waybill', url: req?.waybillUrl },
        { label: 'Packing list', url: req?.packingListUrl },
        { label: 'Product image', url: req?.imageUrl },
      ].filter((d) => d.url),
    [req],
  );

  if (loading) {
    return (
      <DashboardLayout title="Shipment">
        <View className="py-16 items-center">
          <ActivityIndicator color={colors.primary} />
        </View>
      </DashboardLayout>
    );
  }

  if (!req) {
    return (
      <DashboardLayout title="Shipment">
        <EmptyState title="Shipment not found" />
      </DashboardLayout>
    );
  }

  const warehouse = warehouses[0];

  return (
    <DashboardLayout title={`Shipment #${req.bookingId}`} contentClassName="p-3">
      <ShipmentCard
        req={req}
        onPay={() => setPayOpen(true)}
        onRefund={() => setRefundOpen(true)}
        onInvoice={() => navigation.navigate('ShipmentInvoice', { bookingId: req.bookingId })}
      />

      <View className="bg-white rounded-xl border border-gray-100 p-3 mt-1">
        <Text className="text-3xs font-extrabold text-gray-500 uppercase tracking-widest mb-3">
          Progress
        </Text>
        <ShipmentProgress score={req.shipmentStatusScore} req={req} dates={dates} />
      </View>

      {docs.length > 0 && (
        <View className="bg-white rounded-xl border border-gray-100 p-3 mt-3">
          <Text className="text-3xs font-extrabold text-gray-500 uppercase tracking-widest mb-2">
            Documents
          </Text>
          {docs.map((d) => (
            <Pressable
              key={d.label}
              /* The web previewed .docx inline with docx-preview, which is
                 DOM-only. Handing the file to whatever app the phone has for
                 it is both simpler and more capable. */
              onPress={() => Linking.openURL(d.url).catch(() => toast.error('Could not open that file.'))}
              className="flex-row items-center gap-2 py-2.5 border-t border-gray-50"
            >
              <FileText size={15} color={colors.primary} />
              <Text className="flex-1 text-smd text-foreground">{d.label}</Text>
              <Text className="text-2xs text-primary font-semibold">Open</Text>
            </Pressable>
          ))}
        </View>
      )}

      {warehouse && (
        <View className="bg-white rounded-xl border border-gray-100 p-3 mt-3">
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-3xs font-extrabold text-gray-500 uppercase tracking-widest">
              Our China warehouse
            </Text>
            <Pressable
              onPress={() => {
                Clipboard.setString(
                  [warehouse.name, warehouse.address, warehouse.phone, `Code: ${req.bookingId}`]
                    .filter(Boolean)
                    .join('\n'),
                );
                toast.success('Address copied');
              }}
              hitSlop={8}
              className="flex-row items-center gap-1"
            >
              <Copy size={12} color={colors.primary} />
              <Text className="text-2xs font-bold text-primary">Copy all</Text>
            </Pressable>
          </View>
          {[
            { label: 'Name', value: warehouse.name },
            { label: 'Address', value: warehouse.address },
            { label: 'Phone', value: warehouse.phone },
            { label: 'Your code', value: String(req.bookingId) },
          ]
            .filter((r) => r.value)
            .map((r) => (
              <View key={r.label} className="py-1">
                <Text className="text-xxs text-gray-400">{r.label}</Text>
                <Text className="text-smd text-foreground">{r.value}</Text>
              </View>
            ))}
        </View>
      )}

      <ShipmentPaymentModal
        visible={payOpen}
        bookings={[req]}
        currentUser={currentUser}
        onClose={() => setPayOpen(false)}
        onSuccess={() => {
          setPayOpen(false);
          load();
        }}
      />

      <RefundApplyModal
        visible={refundOpen}
        target={req}
        kind="productRequest"
        mode={refundMode(req)}
        onClose={() => setRefundOpen(false)}
        onSuccess={load}
      />
    </DashboardLayout>
  );
}
