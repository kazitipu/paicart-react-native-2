import React, { memo } from 'react';
import { View, Text, FlatList, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Play, Download } from 'lucide-react-native';
import ProductImage from '@/components/ui/ProductImage';
import { Press as Pressable, Overlay, Spinner, ScalePress, t, C, SHADOW } from './ui';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const COLS = 3;
const GAP = 12;
const TILE = (SCREEN_W - 40 - GAP * (COLS - 1)) / COLS;

/* ─── Download picker ───
   A grid of every image and video on the product, each saved individually on
   tap — one file per tap, so the customer takes only what they need. */
function MediaDownloadSheet({ visible, media, onClose, onDownload, downloadingIdx }) {
  const insets = useSafeAreaInsets();
  return (
    <Overlay visible={visible} onClose={onClose} zIndex={80}>
      <View
        style={{
          backgroundColor: '#ffffff',
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          maxHeight: SCREEN_H * 0.85,
          boxShadow: SHADOW['2xl'],
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12 }}>
          <Text style={[t('lg'), { fontWeight: '800', color: C.gray900 }]}>Download Images &amp; Videos</Text>
          <Pressable
            onPress={onClose}
            accessibilityLabel="Close"
            style={({ pressed }) => ({
              width: 32,
              height: 32,
              borderRadius: 16,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: pressed ? C.gray200 : C.gray100,
            })}
          >
            <X size={16} color={C.gray500} />
          </Pressable>
        </View>
        <Text style={[t('11'), { paddingHorizontal: 20, paddingBottom: 12, color: C.gray400 }]}>
          Tap any item to save it — {media.length} file{media.length === 1 ? '' : 's'} available
        </Text>
        <FlatList
          data={media}
          numColumns={COLS}
          keyExtractor={(_, i) => `m-${i}`}
          columnWrapperStyle={{ gap: GAP }}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 + insets.bottom, gap: GAP }}
          initialNumToRender={12}
          renderItem={({ item: m, index: i }) => {
            const thumb = m.type === 'video' ? m.thumb || null : m.url;
            const busy = downloadingIdx === i;
            return (
              <ScalePress
                onPress={() => onDownload(m, i)}
                disabled={busy}
                style={{
                  width: TILE,
                  height: TILE,
                  borderRadius: 12,
                  overflow: 'hidden',
                  borderWidth: 1,
                  borderColor: C.gray200,
                  backgroundColor: C.gray50,
                }}
              >
                {thumb ? (
                  <ProductImage uri={thumb} thumb style={{ width: '100%', height: '100%' }} />
                ) : (
                  <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                    <Play size={22} color={C.gray400} fill={C.gray400} />
                  </View>
                )}
                {m.type === 'video' && !!thumb && (
                  <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.25)' }}>
                    <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.9)', alignItems: 'center', justifyContent: 'center' }}>
                      <Play size={12} color={C.gray900} fill={C.gray900} style={{ marginLeft: 2 }} />
                    </View>
                  </View>
                )}
                <View
                  style={{
                    position: 'absolute',
                    bottom: 4,
                    right: 4,
                    width: 24,
                    height: 24,
                    borderRadius: 8,
                    backgroundColor: 'rgba(0,0,0,0.6)',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {busy ? <Spinner size={12} /> : <Download size={12} color="#ffffff" />}
                </View>
              </ScalePress>
            );
          }}
        />
      </View>
    </Overlay>
  );
}

/* Rendered on every Product render; nothing to update while it stays closed
   (Overlay renders null then). */
export default memo(MediaDownloadSheet, (prev, next) => !prev.visible && !next.visible);
