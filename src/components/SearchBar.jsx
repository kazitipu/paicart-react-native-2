import React, { memo, useState, useCallback, useEffect, useRef } from 'react';
import { View, TextInput, Pressable, StyleSheet } from 'react-native';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  cancelAnimation,
  useAnimatedProps,
  Easing,
  useReducedMotion,
} from 'react-native-reanimated';
import { Search, Camera, Sparkles, Loader2 } from 'lucide-react-native';
import { emptySearchedProductsArray } from '@/store/actions';
import { pickImage } from '@/lib/picker';
import { decorWave } from '@/lib/decorClock';
import { resizeAndCompressToBase64, startImageSearchInstances } from '@/lib/imageUtils';
import { uploadSearchImage } from '@/lib/api';
import { toast } from '@/lib/toast';
import { TABS } from '@/navigation/routes';
import Sweep from '@/components/ui/Sweep';

const ORANGE = '#FF6A00';

/* Product id from a pasted link, with the web Header's exact rules:
   a 1688 link (the text contains "1688") → `?offerId=` or `/123.html`;
   any other link (Taobao/Tmall) → `?id=`. Returns null when there is none. */
export function get1688ProductId(url) {
  return (
    /[?&]offerId=(\d+)/.exec(url)?.[1] ||
    /\/(\d+)\.html/.exec(String(url).split(/[?#]/)[0])?.[1] ||
    null
  );
}

export function productIdFromLink(text) {
  const q = String(text || '');
  if (q.includes('1688')) return get1688ProductId(q);
  if (!/^https?:\/\//i.test(q)) return null; // web: `new URL()` throws
  return /[?&]id=(\d+)/.exec(q)?.[1] || null;
}

/* The last uploaded image, so picking the same photo again reuses its id
   instead of uploading it twice. (The web compared against the last base64
   too, but then silently did nothing — here the results open again.) */
let lastUpload = null;

/* ── Typewriter placeholder (web Header useTypewriterPlaceholder) ──
   Same phrases and timings: 65ms per typed char, 1.6s hold, 28ms per deleted
   char, 350ms between phrases, 600ms initial delay; honours reduce-motion.

   It runs entirely on the UI thread. The first port kept the text in React
   state, so every tick (up to ~35/s while deleting) was a React render plus a
   Fabric commit of the whole screen tree — on the product page that kept the
   JS thread ~75% busy and taps took seconds to land. Now one shared value
   walks a fixed timeline and a worklet turns it into text, which is written
   straight to a read-only overlay input via animatedProps. Zero JS per tick. */
const PLACEHOLDERS = ['Search products from China', 'Search by jewelry', 'Search by shoes'];
const FALLBACK_PLACEHOLDER = `${PLACEHOLDERS[0]}...`;
const TYPE_MS = 65;
const HOLD_MS = 1600;
const DELETE_MS = 28;
const GAP_MS = 350;
const START_DELAY_MS = 600;
/* The web types forever. Here it plays a few rounds and then rests on the
   static placeholder: an endless loop kept budget phones redrawing every
   frame, and nobody is still watching it by round three. */
const ROUNDS = 3;
const CYCLE_MS = PLACEHOLDERS.reduce((sum, p) => sum + p.length * (TYPE_MS + DELETE_MS) + HOLD_MS + GAP_MS, 0);

/* Text shown `t` ms into a cycle. Empty (between phrases) falls back to the
   static placeholder, exactly as the web hook did. */
function typewriterTextAt(t) {
  'worklet';
  let x = t;
  for (let i = 0; i < PLACEHOLDERS.length; i++) {
    const p = PLACEHOLDERS[i];
    const len = p.length;
    if (x < len * TYPE_MS) return p.slice(0, Math.min(len, Math.floor(x / TYPE_MS) + 1));
    x -= len * TYPE_MS;
    if (x < HOLD_MS) return p;
    x -= HOLD_MS;
    if (x < len * DELETE_MS) {
      const shown = len - 1 - Math.floor(x / DELETE_MS);
      return shown > 0 ? p.slice(0, shown) : FALLBACK_PLACEHOLDER;
    }
    x -= len * DELETE_MS;
    if (x < GAP_MS) return FALLBACK_PLACEHOLDER;
    x -= GAP_MS;
  }
  return FALLBACK_PLACEHOLDER;
}

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

function TypewriterOverlay({ active }) {
  const t = useSharedValue(0);
  useEffect(() => {
    if (!active) {
      cancelAnimation(t);
      return undefined;
    }
    t.value = 0;
    t.value = withDelay(
      START_DELAY_MS,
      withRepeat(withTiming(CYCLE_MS, { duration: CYCLE_MS, easing: Easing.linear }), ROUNDS, false),
    );
    return () => cancelAnimation(t);
  }, [active, t]);
  const animatedProps = useAnimatedProps(() => ({ text: typewriterTextAt(t.value) }));
  return (
    <AnimatedTextInput
      pointerEvents="none"
      editable={false}
      importantForAccessibility="no"
      accessibilityElementsHidden
      defaultValue={FALLBACK_PLACEHOLDER}
      animatedProps={animatedProps}
      numberOfLines={1}
      className="px-3 text-sm"
      style={[StyleSheet.absoluteFill, { paddingVertical: 8, color: '#9ca3af' }]}
    />
  );
}

/* hdrSparkle: opacity .6→1, scale 1→1.35, rotate 0→20deg, 1.8s ease-in-out. */
function SparkleIcon({ paused = false }) {
  const reduceMotion = useReducedMotion();
  const still = paused || reduceMotion;
  /* One pulse per play of the shared decor clock (the web pulses nonstop). */
  const style = useAnimatedStyle(() => {
    const t = still ? 0 : decorWave();
    return {
      opacity: 0.6 + 0.4 * t,
      transform: [{ scale: 1 + 0.35 * t }, { rotate: `${20 * t}deg` }],
    };
  }, [still]);
  return (
    <Animated.View style={style}>
      <Sparkles size={12} color={ORANGE} />
    </Animated.View>
  );
}

function Spinner({ size, color }) {
  const r = useSharedValue(0);
  useEffect(() => {
    r.value = withRepeat(withTiming(1, { duration: 1000, easing: Easing.linear }), -1);
  }, [r]);
  const style = useAnimatedStyle(() => ({ transform: [{ rotate: `${360 * r.value}deg` }] }));
  return (
    <Animated.View style={style}>
      <Loader2 size={size} color={color} />
    </Animated.View>
  );
}

/* The web Header's search form, at its mobile breakpoint: an orange 2.5px
 * ring with a skewed shimmer, an AI sparkle badge, a typewriter placeholder,
 * an image-search camera and an orange search button with its own shimmer.
 * "AI" and "Search" labels are `hidden sm:inline` on the web, so they are not
 * shown on a phone either. */
/* Collection / Product live in the Home tab's stack. From a screen in that
   stack a plain navigate works; from another tab it has to name the Home tab;
   from a root-stack screen (the auth screens, which also show this Header)
   it has to pop back to the tab navigator first — navigate actions only
   bubble UP, so none of the latter two were handled before. */
const goStorefront = (navigation, name, params) => {
  const names = navigation.getState?.()?.routeNames || [];
  if (names.includes(name)) navigation.navigate(name, params);
  else if (names.includes('Tabs')) navigation.popTo('Tabs', { screen: TABS.HOME, params: { screen: name, params } });
  else navigation.navigate(TABS.HOME, { screen: name, params });
};

/* The search field plus its typewriter overlay. While the overlay plays,
   the real input shows no placeholder of its own (the overlay sits exactly on
   top with identical padding and font). Memoised so SearchPill re-renders
   (camera press, uploading) don't touch it. */
const TypewriterField = memo(function TypewriterField({
  inputRef,
  initialValue,
  animate,
  onChangeText,
  onSubmitEditing,
  onFocus,
  onBlur,
}) {
  const reduceMotion = useReducedMotion();
  const playing = animate && !reduceMotion;
  return (
    <View style={{ flex: 1, minWidth: 0, justifyContent: 'center' }}>
      <TextInput
        ref={inputRef}
        defaultValue={initialValue}
        onChangeText={onChangeText}
        onSubmitEditing={onSubmitEditing}
        onFocus={onFocus}
        onBlur={onBlur}
        returnKeyType="search"
        placeholder={playing ? '' : FALLBACK_PLACEHOLDER}
        placeholderTextColor="#9ca3af"
        accessibilityLabel="Search products"
        className="px-3 text-sm text-gray-700"
        style={{ paddingVertical: 8 }}
      />
      {playing && <TypewriterOverlay active />}
    </View>
  );
});

export function SearchPill({ initialValue = '', paused: pausedProp = false }) {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  /* Every screen in a stack stays mounted with its own Header, so without this
     each covered screen kept its typewriter and shimmers running — the main
     reason taps took seconds to register deep in a stack. */
  const isFocused = useIsFocused();
  const paused = pausedProp || !isFocused;
  /* Uncontrolled on purpose: the native field owns its text, so no re-render
     (typewriter, focus, redux) can ever reset what is being typed. */
  const inputRef = useRef(null);
  const qRef = useRef(initialValue);
  const [hasText, setHasText] = useState(initialValue.length > 0);
  const [uploading, setUploading] = useState(false);
  const [camPressed, setCamPressed] = useState(false);
  const [focused, setFocused] = useState(false);
  const onChangeText = useCallback((t) => {
    qRef.current = t;
    setHasText(t.length > 0);
  }, []);
  const onFocus = useCallback(() => setFocused(true), []);
  const onBlur = useCallback(() => setFocused(false), []);

  const submit = useCallback(() => {
    const query = qRef.current.trim();
    if (!query) return;

    /* Same rules as the web Header: under 35 characters is a keyword search;
       anything longer is a pasted link, opened only if a product id can be
       read from it. The result cache is cleared only when a search actually
       runs — the web cleared it first, so a long non-link entry wiped the
       results on screen and went nowhere. */
    if (query.length < 35) {
      dispatch(emptySearchedProductsArray());
      goStorefront(navigation, 'Collection', { id: query });
    } else {
      const id = productIdFromLink(query);
      if (!id) {
        toast.info("Couldn't find a product in that link");
        return; // keep the typed text so it can be corrected
      }
      dispatch(emptySearchedProductsArray());
      goStorefront(navigation, 'Product', { id });
    }
    qRef.current = '';
    setHasText(false);
    inputRef.current?.clear();
  }, [dispatch, navigation]);

  const imageSearch = useCallback(async () => {
    if (uploading) return;
    let asset;
    try {
      asset = await pickImage({ title: 'Search by image' });
    } catch {
      toast.error('Could not open the picker.');
      return;
    }
    if (!asset) return;

    setUploading(true);
    try {
      /* Downscale to 500x500 JPEG q0.7 before upload — the same budget the web
         used, and on a phone the original is often 12MP. */
      const { base64 } = await resizeAndCompressToBase64(asset.uri);
      let imgId;
      if (lastUpload && lastUpload.base64 === base64) {
        imgId = lastUpload.id;
      } else {
        imgId = await uploadSearchImage(base64);
        if (!imgId) throw new Error('No image id returned');
        lastUpload = { base64, id: imgId };
      }
      /* A fresh pick resets the crop history; later crops append to it. The
         full-quality original is kept as the preview (web: the original data
         URL), so crops are cut from it rather than from the 500px upload. */
      startImageSearchInstances(imgId, asset.uri);
      dispatch(emptySearchedProductsArray());
      goStorefront(navigation, 'Collection', { id: 'img_uploads', imageUrl: imgId });
    } catch {
      toast.error('There was an error uploading your image.');
    }
    setUploading(false);
  }, [uploading, dispatch, navigation]);

  return (
    <View className="rounded-full overflow-hidden" style={{ padding: 2.5, backgroundColor: ORANGE }}>
      <Sweep skew opacity={0.28} paused={paused} />

      <View className="flex-row items-center bg-white rounded-full overflow-hidden">
        {/* AI badge */}
        <View className="pl-3">
          <View className="flex-row items-center rounded-full px-2 py-0.5" style={{ backgroundColor: '#fff1e6' }}>
            <SparkleIcon paused={paused} />
          </View>
        </View>

        {/* The typewriter stops the moment the field is focused or has text
            (a render between keystrokes could reset the native text) and
            while the bar is hidden or its screen is covered. */}
        <TypewriterField
          inputRef={inputRef}
          initialValue={initialValue}
          animate={!paused && !focused && !hasText}
          onChangeText={onChangeText}
          onSubmitEditing={submit}
          onFocus={onFocus}
          onBlur={onBlur}
        />

        {/* Image search */}
        <View className="border-l border-gray-100 px-2.5 items-center justify-center">
          <Pressable
            onPress={imageSearch}
            onPressIn={() => setCamPressed(true)}
            onPressOut={() => setCamPressed(false)}
            disabled={uploading}
            hitSlop={8}
            className="w-7 h-7 rounded-full items-center justify-center"
            style={{ opacity: uploading ? 0.6 : 1 }}
          >
            {camPressed && !uploading && (
              <View
                className="absolute inset-0 rounded-full border-2 border-violet-400"
                style={{ transform: [{ scale: 1.25 }] }}
              />
            )}
            {uploading ? (
              <Spinner size={16} color="#8b5cf6" />
            ) : (
              <Camera size={16} color={camPressed ? '#8b5cf6' : '#9ca3af'} />
            )}
          </Pressable>
        </View>

        {/* Submit */}
        <Pressable
          onPress={submit}
          className="self-stretch flex-row items-center px-4 overflow-hidden active:opacity-75"
          style={{ backgroundColor: ORANGE }}
        >
          <Sweep opacity={0.22} paused={paused} />
          <Search size={15} color="#ffffff" />
        </Pressable>
      </View>
    </View>
  );
}

/* Standalone search row for screens that do not carry the full Header. */
export default function SearchBar({ initialValue = '' }) {
  return (
    <View className="px-3 py-2.5 bg-white border-b border-gray-100">
      <SearchPill initialValue={initialValue} />
    </View>
  );
}
