import React from 'react';
import { View, Dimensions } from 'react-native';
import { Skeleton } from '@/components/ui/Skeleton';
import { C } from './ui';

const { width: SCREEN_W } = Dimensions.get('window');
const W = SCREEN_W - 16;

const g100 = { backgroundColor: C.gray100 };
const card = (r, p) => ({ backgroundColor: '#ffffff', borderRadius: r, padding: p });

/* ─── Loading skeleton — the web PageSkeleton at its single-column (mobile)
   breakpoint, rendered under the breadcrumb placeholder. ─── */
export default function ProductSkeleton({ breadcrumb = true }) {
  return (
    <View>
      {breadcrumb && <View style={{ height: 36, backgroundColor: 'rgba(255,255,255,0.8)', borderBottomWidth: 1, borderBottomColor: C.gray200 }} />}
      <View style={{ paddingHorizontal: 8, paddingVertical: 16, gap: 16 }}>
        {/* Col 1 — image + thumbnails + seller */}
        <View style={{ gap: 12 }}>
          <Skeleton style={{ width: W, height: W, borderRadius: 24 }} />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {[0, 1, 2, 3, 4].map((i) => (
              <Skeleton key={i} style={{ width: 56, height: 56, borderRadius: 12 }} />
            ))}
          </View>
          <View style={[card(16, 16), { gap: 8 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Skeleton style={{ width: 40, height: 40, borderRadius: 12 }} />
              <View style={{ flex: 1, gap: 8 }}>
                <Skeleton style={{ height: 12, width: '75%', borderRadius: 999 }} />
                <Skeleton style={[{ height: 8, width: '50%', borderRadius: 999 }, g100]} />
              </View>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} style={[{ height: 32, width: (W - 32 - 8) / 2, borderRadius: 8 }, g100]} />
              ))}
            </View>
          </View>
        </View>

        {/* Col 2 — title + variants */}
        <View style={{ gap: 12 }}>
          <View style={[card(24, 20), { gap: 12 }]}>
            <Skeleton style={{ height: 16, borderRadius: 999 }} />
            <Skeleton style={{ height: 16, width: '75%', borderRadius: 999 }} />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} style={[{ height: 24, width: 64, borderRadius: 999 }, g100]} />
              ))}
            </View>
          </View>
          <View style={[card(24, 20), { gap: 8 }]}>
            <Skeleton style={{ height: 12, width: '33%', borderRadius: 999 }} />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} style={[{ height: 48, flex: 1, borderRadius: 12 }, g100]} />
              ))}
            </View>
          </View>
          {[0, 1, 2].map((i) => (
            <View key={i} style={[card(16, 16), { gap: 8 }]}>
              <Skeleton style={{ height: 12, width: '33%', borderRadius: 999 }} />
              <Skeleton style={[{ height: 16, borderRadius: 999 }, g100]} />
              <Skeleton style={[{ height: 16, width: '66%', borderRadius: 999 }, g100]} />
            </View>
          ))}
        </View>

        {/* Col 3 — pricing + actions */}
        <View style={{ gap: 12 }}>
          {[0, 1, 2, 3].map((i) => (
            <View key={i} style={card(16, 16)}>
              <Skeleton style={{ height: 12, width: '50%', borderRadius: 999, marginBottom: 8 }} />
              <Skeleton style={[{ height: 36, borderRadius: 12 }, g100]} />
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}
