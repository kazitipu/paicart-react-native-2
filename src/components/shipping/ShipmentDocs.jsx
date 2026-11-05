import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, Linking, Dimensions, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import Clipboard from '@react-native-clipboard/clipboard';
import { MapPin, Copy, Check, Download, X } from 'lucide-react-native';
import ProductImage from '@/components/ui/ProductImage';
import { C, SHADOW, Press, Spinner, Overlay } from '@/components/product/ui';
import { getShippingMark } from '@/lib/shippingMark';
import { toast } from '@/lib/toast';
import { sf, SC } from '@/components/shipping/ShipBits';

/* ── ShippingInfoCard (web _shared.jsx): warehouse address with Copy
   Address, and the shipping mark to write on the box. `mx-4 mb-4 space-y-3`. ── */
export function ShippingInfoCard({ booking, currentUser }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);
  /* Older bookings keep the mark they were saved with ("ST-101") */
  const shippingMark = booking.shippingMark || getShippingMark(currentUser);

  const handleCopy = () => {
    Clipboard.setString(booking.warehouse || '');
    setCopied(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 2000);
  };

  return (
    <View style={{ marginHorizontal: 16, marginBottom: 16, gap: 12 }}>
      {!!booking.warehouse && (
        <View style={{ backgroundColor: '#e3f8f6', borderWidth: 1, borderColor: SC.teal100, borderRadius: 16, padding: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <MapPin size={10} color={SC.teal600} />
            <Text style={[sf(10), { fontWeight: '800', color: SC.teal600, textTransform: 'uppercase', letterSpacing: 0.9 }]}>
              Warehouse Address
            </Text>
          </View>
          <Text style={[sf('sm', 'relaxed'), { fontWeight: '500', color: C.gray700 }]}>{booking.warehouse}</Text>
          <Press
            onPress={handleCopy}
            style={({ pressed }) => ({
              marginTop: 10,
              alignSelf: 'flex-start',
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 8,
              backgroundColor: copied ? SC.green500 : pressed ? '#99f6e4' : SC.teal100,
            })}
          >
            {copied ? <Check size={12} color="#ffffff" /> : <Copy size={12} color={SC.teal700} />}
            <Text style={[sf('xs'), { fontWeight: '700', color: copied ? '#ffffff' : SC.teal700 }]}>
              {copied ? 'Copied!' : 'Copy Address'}
            </Text>
          </Press>
        </View>
      )}
      <View style={{ backgroundColor: '#fef6e0', borderWidth: 1, borderColor: SC.amber100, borderRadius: 16, padding: 16 }}>
        <Text style={[sf(10), { fontWeight: '800', color: SC.amber600, textTransform: 'uppercase', letterSpacing: 0.9, marginBottom: 8 }]}>
          Shipping Mark
        </Text>
        <Text style={[sf('sm'), { fontWeight: '700', color: C.gray800 }]}>{shippingMark}</Text>
        <Text style={[sf(11), { fontWeight: '500', color: SC.amber600, marginTop: 6 }]}>*** Please use this shipping mark on the box.</Text>
      </View>
    </View>
  );
}

const openExternal = (url) => Linking.openURL(url).catch(() => toast.error('Could not open that file.'));

/* ── DocxPreviewModal (web _shared.jsx) — a Word packing list rendered in-page
   instead of forcing a download. The web drew it with docx-preview (DOM
   only); here Microsoft's Office viewer renders it inside a WebView. Same
   dialog: `max-w-3xl max-h-[90vh] rounded-2xl`, title, Download, close,
   loading and error states. ── */
export function DocxPreviewModal({ url, onClose }) {
  return (
    <Overlay visible={!!url} onClose={onClose} full zIndex={55}>
      {url ? <DocxPanel url={url} onClose={onClose} /> : null}
    </Overlay>
  );
}

function DocxPanel({ url, onClose }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const h = Dimensions.get('window').height * 0.9 - 32;
  const viewer = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`;

  return (
    <View style={StyleSheet.absoluteFill}>
      <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.6)' }]} onPress={onClose} accessibilityLabel="Close" />
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 }} pointerEvents="box-none">
        <View
          style={{
            width: '100%',
            maxWidth: 768,
            height: h,
            backgroundColor: '#ffffff',
            borderRadius: 16,
            overflow: 'hidden',
            boxShadow: SHADOW['2xl'],
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 20,
              paddingVertical: 12,
              borderBottomWidth: 1,
              borderBottomColor: C.gray100,
            }}
          >
            <Text style={[sf('sm'), { fontWeight: '700', color: C.gray800 }]}>Packing List Preview</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Press onPress={() => openExternal(url)} hitSlop={6} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                {({ pressed }) => (
                  <>
                    <Download size={12} color={SC.blue500} />
                    <Text style={[sf('xs'), { fontWeight: '600', color: SC.blue500, textDecorationLine: pressed ? 'underline' : 'none' }]}>
                      Download
                    </Text>
                  </>
                )}
              </Press>
              <Press
                onPress={onClose}
                accessibilityLabel="Close"
                style={({ pressed }) => ({
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: pressed ? C.gray200 : C.gray100,
                })}
              >
                <X size={14} color={C.gray500} />
              </Press>
            </View>
          </View>
          <View style={{ flex: 1, backgroundColor: C.gray50, padding: 16 }}>
            {!error && (
              <WebView
                source={{ uri: viewer }}
                style={{ flex: 1, backgroundColor: C.gray50, opacity: loading ? 0 : 1 }}
                onLoadEnd={() => setLoading(false)}
                onError={() => {
                  setError(true);
                  setLoading(false);
                }}
                onHttpError={() => {
                  setError(true);
                  setLoading(false);
                }}
              />
            )}
            {loading && !error && (
              <View style={[StyleSheet.absoluteFill, { top: 16, height: 160, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }]}>
                <Spinner size={18} color={C.gray400} />
                <Text style={{ fontSize: 16, lineHeight: 24, color: C.gray400 }}>Loading preview…</Text>
              </View>
            )}
            {error && (
              <View style={{ height: 160, alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <Text style={[sf('sm'), { color: C.gray400 }]}>Couldn't load a preview for this file.</Text>
                <Press onPress={() => openExternal(url)}>
                  {({ pressed }) => (
                    <Text style={[sf('xs'), { fontWeight: '600', color: SC.blue500, textDecorationLine: pressed ? 'underline' : 'none' }]}>
                      Open / Download instead
                    </Text>
                  )}
                </Press>
              </View>
            )}
          </View>
        </View>
      </View>
    </View>
  );
}

/* Tap-to-enlarge for the waybill / packing-list thumbnails (a native
   affordance; the web showed only the 48px thumbnail). */
export function ImagePreview({ uri, onClose }) {
  return (
    <Overlay visible={!!uri} onClose={onClose} full zIndex={55}>
      {uri ? (
        <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.9)', alignItems: 'center', justifyContent: 'center' }]} onPress={onClose}>
          <ProductImage uri={uri} resizeMode="contain" style={{ width: '100%', height: '80%' }} />
          <View style={{ position: 'absolute', top: 16, right: 16, width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' }}>
            <X size={16} color="#ffffff" />
          </View>
        </Pressable>
      ) : null}
    </Overlay>
  );
}

export { openExternal };
