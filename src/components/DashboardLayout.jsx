import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, ScrollView, Keyboard, Platform, Dimensions, RefreshControl } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useAnimatedRef, useAnimatedStyle, useAnimatedReaction, runOnJS } from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import { ChevronLeft } from 'lucide-react-native';
import { useSelector } from 'react-redux';
import Avatar from '@/components/Avatar';
import Header from '@/components/Header';
import useHideOnScroll from '@/lib/useHideOnScroll';
import { C, SHADOW, ORANGE, Press } from '@/components/product/ui';
import colors from '@/theme/colors';

/* The web component carried three layouts at once: a mobile top bar, a desktop
 * breadcrumb strip and a 256px sticky sidebar holding the dashboard nav. Only
 * the first has a native equivalent — the tab bar and stack already provide
 * what the sidebar and breadcrumb did, and duplicating the nav inside every
 * screen would mean two competing back stacks.
 *
 * The web sidebar also only linked six of the dashboard's seventeen screens;
 * the rest were reachable only by deep link or from inside another page. Those
 * orphans are now reachable from the More tab and DashboardOverview.
 *
 * `mounted` gating is gone too: it existed because currentUser came from
 * localStorage-persisted Redux which is absent during SSR. MMKV is read
 * synchronously before the store is created, so the user is there on frame one.
 */
export default function DashboardLayout(props) {
  if (props.webChrome) return <WebChromeLayout {...props} />;
  return <LegacyDashboardLayout {...props} />;
}

function LegacyDashboardLayout({
  children,
  title,
  showBack = true,
  headerAction = null,
  scroll = true,
  contentClassName = '',
}) {
  const navigation = useNavigation();
  const currentUser = useSelector((s) => s.user?.currentUser);

  const Body = scroll ? ScrollView : View;
  const bodyProps = scroll
    ? { contentContainerClassName: `pb-8 ${contentClassName}`, keyboardShouldPersistTaps: 'handled' }
    : { className: `flex-1 ${contentClassName}` };

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <View className="flex-row items-center gap-2 px-3 py-2.5 bg-white border-b border-gray-100">
        {showBack && navigation.canGoBack() && (
          <Pressable onPress={() => navigation.goBack()} hitSlop={8} className="p-1">
            <ChevronLeft size={22} color={colors.foreground} />
          </Pressable>
        )}
        <View className="flex-1">
          <Text className="text-md font-bold text-foreground" numberOfLines={1}>
            {title || 'Dashboard'}
          </Text>
          <Text className="text-2xs text-gray-400">Paicart Sourcing Hub</Text>
        </View>
        {headerAction || (
          <Avatar
            user={currentUser}
            sizeClass="w-8 h-8"
            textClass="text-smd"
            roundedClass="rounded-full"
            bgClass="bg-primary"
            ringClass=""
          />
        )}
      </View>

      <Body {...bodyProps}>{children}</Body>
    </SafeAreaView>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   `webChrome` — the web's mobile (< 1024px) dashboard shell, faithfully:

   - the global site Header (AppShell renders it on every page), absolute and
     hiding on scroll-down exactly like Cart's;
   - DashboardLayout's own top bar — `sticky top-0 z-30 bg-white border-b
     border-gray-100 shadow-sm`, title 15px bold + "Paicart Sourcing Hub",
     avatar on the right, back arrow only when `showBack` is passed (the web
     default is none). It scrolls up under the Header and sticks at the top
     once it gets there; the Header (z-50) slides back over it on scroll-up.
     The stuck state is a fixed copy faded in at the top rather than
     ScrollView stickyHeaderIndices: those move the bar with a transform,
     and on Android Fabric a transform moves pixels, not the hit area;
   - `main` = `px-2 py-4` on `bg-gray-50`. The BottomNav the web renders here
     is the app's tab bar; the global Footer has no native port.

   Screens opt in one at a time — the default export keeps the legacy layout
   for every dashboard screen that has not been ported yet.

   Keyboard: Android edge-to-edge does not shrink the window, so while the
   keyboard is open the scroll content gets that much bottom padding and a
   focused field is scrolled clear of the keyboard's top edge. Inputs register
   themselves through useDashboardKeyboard().focus(ref).
   ═══════════════════════════════════════════════════════════════════════ */

const KeyboardCtx = createContext(null);
export const useDashboardKeyboard = () => useContext(KeyboardCtx);

const GRAY50 = '#f9fafb';

function WebTopBar({ title, showBack, headerAction, currentUser }) {
  const navigation = useNavigation();
  return (
    <View
      style={{
        backgroundColor: '#ffffff',
        borderBottomWidth: 1,
        borderBottomColor: C.gray100,
        boxShadow: SHADOW.base,
        zIndex: 30,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 16,
          paddingVertical: 12,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 1 }}>
          {showBack && navigation.canGoBack() && (
            <Press
              onPress={() => navigation.goBack()}
              accessibilityLabel="Go back"
              hitSlop={6}
              style={({ pressed }) => ({
                width: 32,
                height: 32,
                marginLeft: -4,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <ChevronLeft size={22} color={C.gray700} />
            </Press>
          )}
          <View style={{ flexShrink: 1 }}>
            <Text style={{ fontSize: 15, lineHeight: 18.75, fontWeight: '700', color: C.gray800 }} numberOfLines={1}>
              {title || 'Dashboard'}
            </Text>
            <Text style={{ fontSize: 10, lineHeight: 15, fontWeight: '500', color: C.gray400 }}>
              Paicart Sourcing Hub
            </Text>
          </View>
        </View>
        {headerAction || (
          <Avatar
            user={currentUser}
            sizeClass="w-8 h-8"
            textClass="text-sm"
            roundedClass="rounded-full"
            bgClass=""
            ringClass=""
            ringStyle={{ backgroundColor: ORANGE }}
          />
        )}
      </View>
    </View>
  );
}

/* Opt-in extras for `webChrome` (all optional, so existing callers are
   unaffected):
   - `list`: FlatList props ({ data, renderItem, keyExtractor, extraData,
     ListEmptyComponent, ListFooterComponent, ItemSeparatorComponent, …}).
     The body then becomes an Animated.FlatList: `children` render above the
     items, inside `main`'s px-2 / pt-4, and each item gets the same px-2.
     Long lists (My Orders) must virtualise rather than mount every card
     inside one ScrollView.
   - `onRefresh` / `refreshing`: pull-to-refresh, its spinner dropped below
     the Header and the top bar. */
const MAIN_PX = 8;
const TOPBAR_H = 60; // py-3 + 15px title line + 10px subtitle line + border

function WebChromeLayout({
  children,
  title,
  showBack = false,
  headerAction = null,
  overlays = null,
  list = null,
  onRefresh = null,
  refreshing = false,
}) {
  const insets = useSafeAreaInsets();
  const currentUser = useSelector((s) => s.user?.currentUser);
  const { onScroll, scrollY, isHidden, headerH, setHeaderH, headerStyle } = useHideOnScroll();
  const scrollRef = useAnimatedRef();

  /* sticky top-0: stuck once the bar's natural position (below the Header's
     height) has scrolled to the top. */
  const [stuck, setStuck] = useState(false);
  useAnimatedReaction(
    () => scrollY.value >= headerH,
    (now, prev) => {
      if (now !== prev) runOnJS(setStuck)(now);
    },
    [headerH],
  );
  const stuckStyle = useAnimatedStyle(() => ({ opacity: scrollY.value >= headerH ? 1 : 0 }), [headerH]);

  const isList = !!list;
  const scrollToY = (y) => {
    if (isList) scrollRef.current?.scrollToOffset?.({ offset: y, animated: true });
    else scrollRef.current?.scrollTo({ y, animated: true });
  };

  const focusedRef = useRef(null);
  const kbTopRef = useRef(0);
  const [kbPad, setKbPad] = useState(0);

  const ensureVisible = useCallback(() => {
    const input = focusedRef.current?.current;
    if (!input || !kbTopRef.current || !input.measureInWindow) return;
    input.measureInWindow((_x, y, _w, h) => {
      const overlap = y + h + 16 - kbTopRef.current;
      if (overlap > 0) scrollToY(scrollY.value + overlap);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scrollRef, scrollY, isList]);

  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvt, (e) => {
      const kbH = e.endCoordinates?.height || 0;
      kbTopRef.current = e.endCoordinates?.screenY || Dimensions.get('window').height - kbH;
      setKbPad(kbH);
      setTimeout(ensureVisible, 80);
    });
    const hide = Keyboard.addListener(hideEvt, () => {
      kbTopRef.current = 0;
      setKbPad(0);
    });
    return () => {
      show.remove();
      hide.remove();
    };
  }, [ensureVisible]);

  /* Moving between fields while the keyboard stays up fires no new
     keyboardDidShow, so a focus re-checks on its own. */
  const kb = useMemo(
    () => ({
      focus: (ref) => {
        focusedRef.current = ref;
        if (kbTopRef.current) setTimeout(ensureVisible, 60);
      },
      blur: (ref) => {
        if (focusedRef.current === ref) focusedRef.current = null;
      },
      /* Bring a block that just opened (e.g. an inline form) into view,
         its top just under the sticky top bar. */
      reveal: (viewRef) => {
        const v = viewRef?.current;
        if (!v?.measureInWindow) return;
        v.measureInWindow((_x, y, _w, h) => {
          const winH = Dimensions.get('window').height;
          if (y + Math.min(h, 240) <= winH - 72) return;
          scrollToY(Math.max(0, scrollY.value + y - insets.top - 72));
        });
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ensureVisible, scrollRef, scrollY, insets.top, isList],
  );

  const refreshControl = onRefresh ? (
    <RefreshControl
      refreshing={!!refreshing}
      onRefresh={onRefresh}
      colors={[ORANGE]}
      tintColor={ORANGE}
      progressViewOffset={headerH + TOPBAR_H}
    />
  ) : undefined;

  const topChrome = (
    <>
      <View style={{ height: headerH }} />
      <WebTopBar title={title} showBack={showBack} headerAction={headerAction} currentUser={currentUser} />
    </>
  );

  return (
    <KeyboardCtx.Provider value={kb}>
      <View style={{ flex: 1, backgroundColor: GRAY50 }}>
        {isList ? (
          <Animated.FlatList
            {...list}
            ref={scrollRef}
            onScroll={onScroll}
            scrollEventThrottle={16}
            style={{ flex: 1, marginTop: insets.top }}
            contentContainerStyle={{ flexGrow: 1, paddingBottom: kbPad }}
            keyboardShouldPersistTaps="handled"
            refreshControl={refreshControl}
            ListHeaderComponent={
              <>
                {topChrome}
                <View style={{ paddingHorizontal: MAIN_PX, paddingTop: 16 }}>{children}</View>
              </>
            }
            renderItem={(info) => <View style={{ paddingHorizontal: MAIN_PX }}>{list.renderItem(info)}</View>}
            ListEmptyComponent={
              list.ListEmptyComponent ? (
                <View style={{ paddingHorizontal: MAIN_PX }}>{list.ListEmptyComponent}</View>
              ) : null
            }
            ListFooterComponent={
              <View style={{ paddingHorizontal: MAIN_PX, paddingBottom: 16 }}>{list.ListFooterComponent || null}</View>
            }
          />
        ) : (
          <Animated.ScrollView
            ref={scrollRef}
            onScroll={onScroll}
            scrollEventThrottle={16}
            style={{ flex: 1, marginTop: insets.top }}
            contentContainerStyle={{ flexGrow: 1, paddingBottom: kbPad }}
            keyboardShouldPersistTaps="handled"
            refreshControl={refreshControl}
          >
            {topChrome}
            <View style={{ paddingHorizontal: MAIN_PX, paddingVertical: 16 }}>{children}</View>
          </Animated.ScrollView>
        )}

        <Animated.View
          pointerEvents={stuck ? 'auto' : 'none'}
          style={[{ position: 'absolute', top: insets.top, left: 0, right: 0, zIndex: 30 }, stuckStyle]}
        >
          <WebTopBar title={title} showBack={showBack} headerAction={headerAction} currentUser={currentUser} />
        </Animated.View>

        <Animated.View
          pointerEvents={isHidden ? 'none' : 'box-none'}
          style={[{ position: 'absolute', top: insets.top, left: 0, right: 0, zIndex: 50 }, headerStyle]}
        >
          <Header hidden={isHidden} onLayout={(e) => setHeaderH(e.nativeEvent.layout.height)} />
        </Animated.View>
        <View
          style={{ position: 'absolute', top: 0, left: 0, right: 0, height: insets.top, backgroundColor: '#ffffff', zIndex: 51 }}
        />

        {overlays}
      </View>
    </KeyboardCtx.Provider>
  );
}
