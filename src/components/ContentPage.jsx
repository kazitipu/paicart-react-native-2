import React, { useCallback, useMemo, useRef, useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedRef,
  useAnimatedReaction,
  runOnJS,
} from 'react-native-reanimated';
import { ArrowUp, List, ChevronRight } from 'lucide-react-native';
import Header from '@/components/Header';
import useHideOnScroll from '@/lib/useHideOnScroll';
import { C, SHADOW, Press, ScalePress, Overlay } from '@/components/product/ui';
import { TS, TocContext, PAGE_BG } from '@/components/static/StaticBits';

/* ═══════════════════════════════════════════════════════════════════════
   Shell for the static information pages. The web renders each of them
   under its global Header (hide-on-scroll) with no BottomNav and no pinned
   bar, then its Footer (not ported, as on Cart). So: an Animated.ScrollView
   whose content starts below the absolute Header, the white status-bar
   strip, and — native extras only, layout untouched — a scroll-to-top
   button and, on the long legal pages (`toc`), a "jump to section" sheet.

   Children are the page itself. Wrap the part that holds SectionCards /
   Dividers in <ContentPage.Body style={…}> so their offsets can be
   resolved for the jump sheet.
   ═══════════════════════════════════════════════════════════════════════ */

const SHOW_FAB_AT = 600;

function Body({ style, children }) {
  const ctx = React.useContext(TocContext);
  return (
    <Animated.View
      entering={FadeIn.duration(250)}
      onLayout={ctx ? (e) => ctx.registerBody(e.nativeEvent.layout.y) : undefined}
      style={style}
    >
      {children}
    </Animated.View>
  );
}

function RoundButton({ Icon, onPress, label }) {
  return (
    <ScalePress
      onPress={onPress}
      accessibilityLabel={label}
      scaleTo={0.9}
      style={{
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderColor: C.gray100,
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: SHADOW.md,
      }}
    >
      <Icon size={18} color={C.gray700} />
    </ScalePress>
  );
}

export default function ContentPage({ bg = PAGE_BG, toc = false, children }) {
  const insets = useSafeAreaInsets();
  const scrollRef = useAnimatedRef();
  const { onScroll, scrollY, isHidden, headerH, setHeaderH, headerStyle } = useHideOnScroll();
  const topPad = insets.top + headerH;

  /* ── scroll-to-top / TOC buttons appear once the page is scrolled ── */
  const [showFab, setShowFab] = useState(false);
  useAnimatedReaction(
    () => scrollY.value > SHOW_FAB_AT,
    (v, prev) => {
      if (v !== prev) runOnJS(setShowFab)(v);
    },
  );

  /* ── section registry for the jump sheet ── */
  const bodyY = useRef(0);
  const sections = useRef({});
  const [tocOpen, setTocOpen] = useState(false);
  const [entries, setEntries] = useState([]);
  const ctx = useMemo(
    () =>
      toc
        ? {
            registerBody: (y) => {
              bodyY.current = y;
            },
            registerSection: (label, y) => {
              sections.current[label] = y;
            },
          }
        : null,
    [toc],
  );

  const openToc = () => {
    setEntries(Object.entries(sections.current).sort((a, b) => a[1] - b[1]));
    setTocOpen(true);
  };

  const jumpTo = useCallback(
    (y) => {
      setTocOpen(false);
      /* onLayout y is measured from the content container's origin, so
         bodyY already includes the paddingTop. */
      const abs = bodyY.current + y;
      const goingDown = abs > scrollY.value;
      /* Scrolling down parks the header off-screen; scrolling up brings it back. */
      const target = Math.max(0, abs - (goingDown ? insets.top : topPad) - 12);
      scrollRef.current?.scrollTo({ y: target, animated: true });
    },
    [topPad, insets.top, scrollRef, scrollY],
  );

  const page = (
    <Animated.ScrollView
      ref={scrollRef}
      onScroll={onScroll}
      scrollEventThrottle={16}
      style={{ flex: 1, backgroundColor: bg }}
      contentContainerStyle={{ paddingTop: topPad, flexGrow: 1 }}
    >
      {children}
    </Animated.ScrollView>
  );

  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      {ctx ? <TocContext.Provider value={ctx}>{page}</TocContext.Provider> : page}

      {/* chrome: hide-on-scroll Header + white status-bar strip */}
      <Animated.View
        pointerEvents={isHidden ? 'none' : 'box-none'}
        style={[{ position: 'absolute', top: insets.top, left: 0, right: 0, zIndex: 10 }, headerStyle]}
      >
        <Header hidden={isHidden} onLayout={(e) => setHeaderH(e.nativeEvent.layout.height)} />
      </Animated.View>
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: insets.top, backgroundColor: '#ffffff', zIndex: 11 }} />

      {showFab && (
        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(150)}
          style={{ position: 'absolute', right: 16, bottom: 16, gap: 10, zIndex: 20 }}
        >
          {toc && <RoundButton Icon={List} label="Jump to section" onPress={openToc} />}
          <RoundButton
            Icon={ArrowUp}
            label="Scroll to top"
            onPress={() => scrollRef.current?.scrollTo({ y: 0, animated: true })}
          />
        </Animated.View>
      )}

      {toc && (
        <Overlay visible={tocOpen} onClose={() => setTocOpen(false)}>
          <View
            style={{
              backgroundColor: '#ffffff',
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16,
              paddingTop: 16,
              paddingBottom: 16 + insets.bottom,
              maxHeight: 520,
            }}
          >
            <Text style={[TS.sm, { fontWeight: '700', color: C.gray800, paddingHorizontal: 20, marginBottom: 8 }]}>
              Jump to section
            </Text>
            <ScrollView>
              {entries.map(([label, y]) => (
                <Press
                  key={label}
                  onPress={() => jumpTo(y)}
                  style={({ pressed }) => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                    paddingHorizontal: 20,
                    paddingVertical: 12,
                    backgroundColor: pressed ? C.gray50 : '#ffffff',
                  })}
                >
                  <Text style={[TS.sm, { color: C.gray700, flex: 1 }]}>{label}</Text>
                  <ChevronRight size={14} color={C.gray400} />
                </Press>
              ))}
            </ScrollView>
          </View>
        </Overlay>
      )}
    </View>
  );
}

ContentPage.Body = Body;
