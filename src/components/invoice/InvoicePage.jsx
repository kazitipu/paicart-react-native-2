import React, { useRef, useState } from 'react';
import { View, Text, ScrollView, RefreshControl, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, Printer, Download } from 'lucide-react-native';
import { captureRef } from 'react-native-view-shot';
import { generatePDF } from 'react-native-html-to-pdf';
import Share from 'react-native-share';
import Header from '@/components/Header';
import useHideOnScroll from '@/lib/useHideOnScroll';
import { toast } from '@/lib/toast';
import { C, ORANGE, Press, Spinner } from '@/components/product/ui';
import { InvoiceSheet, InvoiceHeader, InvoiceFooter, INVOICE_COLORS, MM } from '@/components/invoice/InvoiceParts';

/* ═══════════════════════════════════════════════════════════════════════
   Web components/InvoiceShell.jsx at < 640px, under the global site Header
   (AppShell renders it on invoice pages; it hides on scroll like Cart's):
   `min-h-screen bg-gray-50 py-6 px-3`, the toolbar (← Back · Print ·
   Download PDF — icon-only below sm), then the A4 sheet inside a 640px
   min-width box that scrolls sideways on a phone.

   Print / Download PDF: the web rasterised the sheet with html2canvas at
   scale 2 and sliced the image into A4 pages with jsPDF. Here the sheet view
   is captured (react-native-view-shot), sliced into A4 pages the same way in
   a tiny HTML document, rendered by react-native-html-to-pdf, and handed to
   the share sheet — which covers printing, saving to Files/Drive, mail and
   WhatsApp in one step. Both buttons produce the same PDF.
   ═══════════════════════════════════════════════════════════════════════ */

const A4_W_MM = 210;
const A4_H_MM = 297;

function pagedHtml(base64, ratio) {
  const imgHmm = A4_W_MM * ratio;
  const pages = Math.max(1, Math.ceil(imgHmm / A4_H_MM - 0.002));
  const src = `data:image/jpeg;base64,${base64}`;
  const page = (i) =>
    `<div class="p"><img src="${src}" style="top:-${(i * A4_H_MM).toFixed(3)}mm"/></div>`;
  return `<!doctype html><html><head><meta charset="utf-8"/><style>
@page{size:A4;margin:0}
html,body{margin:0;padding:0;background:#fff}
.p{width:${A4_W_MM}mm;height:${A4_H_MM}mm;overflow:hidden;position:relative;page-break-after:always;break-after:page}
.p:last-child{page-break-after:auto;break-after:auto}
.p img{position:absolute;left:0;width:${A4_W_MM}mm;height:auto;display:block}
</style></head><body>${Array.from({ length: pages }, (_, i) => page(i)).join('')}</body></html>`;
}

export default function InvoicePage({
  backRoute,
  docType,
  docId,
  docDate,
  status,
  paid,
  loading,
  notFound,
  onRefresh,
  refreshing = false,
  children,
}) {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { width: winW } = useWindowDimensions();
  const { onScroll, isHidden, headerH, setHeaderH, headerStyle } = useHideOnScroll();
  const sheetRef = useRef(null);
  const sheetSize = useRef({ w: 0, h: 0 });
  const [busy, setBusy] = useState(null); // 'print' | 'pdf'

  /* mx-auto w-[210mm] max-w-full › overflow-x-auto › min-w-[640px] › sheet w-[210mm] max-w-full */
  const outerW = Math.min(A4_W_MM * MM, winW - 24);
  const sheetW = Math.min(A4_W_MM * MM, Math.max(640, outerW));

  const goBack = () => {
    if (navigation.canGoBack()) navigation.goBack();
    else if (backRoute) navigation.navigate(backRoute);
  };

  const exportPdf = async (mode) => {
    if (!sheetRef.current || busy || loading) return;
    setBusy(mode);
    try {
      const base64 = await captureRef(sheetRef, { format: 'jpg', quality: 0.95, result: 'base64' });
      const { w, h } = sheetSize.current;
      const name = `Paicart-Invoice-${docId}`;
      const { filePath } = await generatePDF({
        html: pagedHtml(base64, w > 0 ? h / w : A4_H_MM / A4_W_MM),
        fileName: name,
        width: 595,
        height: 842,
        padding: 0,
        paddingTop: 0,
        paddingBottom: 0,
        paddingLeft: 0,
        paddingRight: 0,
        bgColor: '#FFFFFF',
        shouldPrintBackgrounds: true,
      });
      if (!filePath) throw new Error('No file produced');
      await Share.open({
        url: filePath.startsWith('file://') ? filePath : `file://${filePath}`,
        type: 'application/pdf',
        filename: `${name}.pdf`,
        title: mode === 'print' ? 'Print invoice' : 'Save invoice',
        failOnCancel: false,
      });
    } catch {
      toast.error(mode === 'print' ? 'Could not prepare the invoice for printing.' : 'Could not generate the PDF. Try Print instead.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.gray50 }}>
      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        style={{ flex: 1, marginTop: insets.top }}
        contentContainerStyle={{ flexGrow: 1 }}
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={!!refreshing}
              onRefresh={onRefresh}
              colors={[ORANGE]}
              tintColor={ORANGE}
              progressViewOffset={headerH}
            />
          ) : undefined
        }
      >
        <View style={{ height: headerH }} />
        <View style={{ paddingTop: 24, paddingHorizontal: 12 }}>
          {/* Toolbar */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 16 }}>
            <Press onPress={goBack} hitSlop={6}>
              {({ pressed }) => (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <ArrowLeft size={14} color={pressed ? ORANGE : C.gray500} />
                  <Text style={{ fontSize: 14, lineHeight: 20, fontWeight: '500', color: pressed ? ORANGE : C.gray500 }}>Back</Text>
                </View>
              )}
            </Press>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Press
                onPress={() => exportPdf('print')}
                disabled={!!busy || loading}
                accessibilityLabel="Print"
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: C.gray200,
                  backgroundColor: pressed ? C.gray100 : '#ffffff',
                })}
              >
                {busy === 'print' ? <Spinner size={14} color={C.gray700} /> : <Printer size={14} color={C.gray700} />}
              </Press>
              <Press
                onPress={() => exportPdf('pdf')}
                disabled={!!busy || loading}
                accessibilityLabel="Download PDF"
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 12,
                  backgroundColor: ORANGE,
                  opacity: busy === 'pdf' ? 0.6 : 1,
                }}
              >
                {busy === 'pdf' ? <Spinner size={14} color="#ffffff" /> : <Download size={14} color="#ffffff" />}
              </Press>
            </View>
          </View>

          {loading ? (
            <View style={{ height: 256, alignItems: 'center', justifyContent: 'center' }}>
              <Spinner size={32} color={ORANGE} />
            </View>
          ) : (
            /* Wide enough to keep the A4 layout; scrolls sideways on a phone */
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ flexGrow: 0 }}
              /* py-6's bottom 24px sits inside the scroller so the sheet's shadow isn't clipped */
              contentContainerStyle={{ paddingBottom: 24 }}
            >
              <View
                onLayout={(e) => {
                  sheetSize.current = { w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height };
                }}
              >
                <InvoiceSheet ref={sheetRef} width={sheetW} paid={paid && !notFound}>
                  <InvoiceHeader docType={docType} docId={docId} docDate={docDate} status={notFound ? null : status} />
                  {notFound ? (
                    <Text style={{ fontSize: 16, lineHeight: 24, color: INVOICE_COLORS.subtle, textAlign: 'center', paddingVertical: 64 }}>
                      Invoice not found.
                    </Text>
                  ) : (
                    children
                  )}
                  <InvoiceFooter />
                </InvoiceSheet>
              </View>
            </ScrollView>
          )}
        </View>
      </Animated.ScrollView>

      <Animated.View
        pointerEvents={isHidden ? 'none' : 'box-none'}
        style={[{ position: 'absolute', top: insets.top, left: 0, right: 0, zIndex: 50 }, headerStyle]}
      >
        <Header hidden={isHidden} onLayout={(e) => setHeaderH(e.nativeEvent.layout.height)} />
      </Animated.View>
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: insets.top, backgroundColor: '#ffffff', zIndex: 51 }} />
    </View>
  );
}
