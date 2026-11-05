import React, { useState, useEffect, useMemo, useCallback, useRef, memo, forwardRef, useImperativeHandle } from 'react';
import { View, Text, ScrollView, RefreshControl, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSelector, useDispatch } from 'react-redux';
import Animated, { FadeIn, FadeInDown, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import Clipboard from '@react-native-clipboard/clipboard';
import {
  ChevronRight, ChevronDown, ChevronUp, Heart, Check, Factory, Copy, Download, Minus, Plus, Package, Package2,
  MapPin, Info, Plane, Ship, AlertCircle, AlertTriangle, Tag, ShieldAlert, Calendar, Star, ShoppingCart, ShoppingBag,
} from 'lucide-react-native';
import Header from '@/components/Header';
import ProductImage from '@/components/ui/ProductImage';
import Gallery from '@/components/product/Gallery';
import PriceTierRow from '@/components/product/PriceTierRow';
import ProductDrawer from '@/components/product/ProductDrawer';
import ColorVariantViewer from '@/components/product/ColorVariantViewer';
import ShippingRateModal from '@/components/product/ShippingRateModal';
import MediaDownloadSheet from '@/components/product/MediaDownloadSheet';
import SizeWeightTable from '@/components/product/SizeWeightTable';
import ProductTabs from '@/components/product/ProductTabs';
import SellerCard from '@/components/product/SellerCard';
import ProductSkeleton from '@/components/product/ProductSkeleton';
import {
  Overlay, Price, Stars, Chip, Radio, RingSpinner, ScalePress, t, C, ORANGE, ORANGE2, PAGE_BG, SHADOW, DG_TONES,
  Press as Pressable,
} from '@/components/product/ui';
import {
  addToCart, addToPendingOrdersRedux, addToWishlist, removeFromWishlist, getAllD2DRatesRedux, setSearchedProductDetail,
} from '@/store/actions';
import { getAllD2DRates, get1688CategoryRateById } from '@/lib/firebaseUtils';
import { getProductById, getShippingQuote, getProductCategory, getVendorProducts, searchProducts } from '@/lib/api';
import {
  classifyDangerousGoods, findVariantByProperties, propVal, getUnitPrice as unitPriceAt, buildColorsArray,
  buildSizesArray, buildSizesForColor, buildVariantSpecs, buildSizeWeightRows, getSellerStatuses,
} from '@/lib/product';
import { chargeFor, ratePerKgFor, buildRateTiers, mainTierOf } from '@/lib/freight';
import { getActiveDiscountPercent, applyDiscount } from '@/lib/discount';
import { getCampaignRateForCategoryIds } from '@/lib/campaignPricing';
import { cdn, cdnHtml } from '@/lib/cdn';
import { flyToIconFromRef } from '@/lib/flyToIcon';
import { saveRemoteFile, extOf, safeName } from '@/lib/mediaDownload';
import { getJSON, setJSON, remove, KEYS } from '@/lib/storage';
import { toast } from '@/lib/toast';
import useHideOnScroll from '@/lib/useHideOnScroll';
import { TABS } from '@/navigation/routes';
import { goHome as goHomeNav } from '@/navigation/goHome';

/* ═══════════════════════════════════════════════════════════════════════
   PRODUCT — port of paicart-nextjs15 src/app/product/[id]/page.jsx at its
   mobile breakpoint (single column; `lg:hidden` parts included: the pinned
   CTA bar, the bottom drawer, the expanded colour viewer, the mobile seller
   card and delivery-date card).
   Native additions: swipeable gallery, pull to refresh, press feedback,
   fading entrances, swipe between colours in the viewer.
   ═══════════════════════════════════════════════════════════════════════ */

const SHIP_DEBOUNCE_MS = 800;
const SITE = 'https://www.paicart.com';
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/* Resolved seller tags per shop id — one lookup per shop per app session. */
const sellerIdentityCache = new Map();

/* Web: `Axios.get(/products/:id)` response unwrapping + normalisation. */
const normalizeProduct = (data, prev) => {
  const d = data?.id || data?.num_iid ? data : data?.product || data?.item || data;
  if (!d || !(d.id || d.num_iid)) return null;
  const pics = Array.isArray(d.pictures) ? d.pictures : [d.pic_url, ...(d.item_imgs?.map((i) => i.url) || [])].filter(Boolean);
  return {
    ...d,
    id: d.id || d.num_iid,
    pictures: pics,
    variants: d.variants || d.skus?.sku || [],
    props_list: d.props_list || {},
    props_imgs: d.props_imgs || d.prop_imgs || null,
    productShippingInfo: d.productShippingInfo || null,
    price_range: d.price_range || d.priceRange || [],
    availability: d.availability || prev?.availability,
    sellerIdentities: d.sellerIdentities || prev?.sellerIdentities || [],
  };
};

/* The gallery owns which picture is showing. It used to live in Product, so
   every thumbnail tap or swipe re-rendered the entire screen — specs, seller,
   size table, modals — and on a debug build a tap took ~12s of JS to land.
   The colour picker still steers it through the ref (showColor). Remounted
   per product via `key`, which also resets it to the first picture. */
const GallerySection = memo(
  forwardRef(function GallerySection({ allMedia, pics, isDirectFactory, imgRef }, ref) {
    const [activeImg, setActiveImg] = useState(0);
    const [colorOverrideImg, setColorOverrideImg] = useState(null);

    useImperativeHandle(
      ref,
      () => ({
        showColor(color) {
          if (!color?.url) {
            setColorOverrideImg(null);
            return;
          }
          const idx = pics.findIndex((p) => p === color.url || p?.includes(color.url));
          if (idx >= 0) {
            setActiveImg(idx);
            setColorOverrideImg(null);
          } else setColorOverrideImg(color.url);
        },
      }),
      [pics],
    );

    const onSelect = useCallback((i) => {
      setActiveImg(i);
      setColorOverrideImg(null);
    }, []);
    const onUserSwipe = useCallback(() => setColorOverrideImg(null), []);

    return (
      <Gallery
        allMedia={allMedia}
        pics={pics}
        activeImg={activeImg}
        onSelect={onSelect}
        onUserSwipe={onUserSwipe}
        colorOverrideImg={colorOverrideImg ? cdn(colorOverrideImg) : null}
        isDirectFactory={isDirectFactory}
        imgRef={imgRef}
      />
    );
  }),
);

/* Web share-icon glyphs (Facebook / WhatsApp). */
const FacebookIcon = () => (
  <Svg width={14} height={14} viewBox="0 0 24 24" fill="#1877F2">
    <Path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </Svg>
);
const WhatsAppIcon = () => (
  <Svg width={14} height={14} viewBox="0 0 16 16" fill="#25D366">
    <Path d="M13.601 2.326A7.854 7.854 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.933 7.933 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.898 7.898 0 0 0 13.6 2.326zM7.994 14.521a6.573 6.573 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.557 6.557 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592zm3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.729.729 0 0 0-.529.247c-.182.198-.691.677-.691 1.654 0 .977.71 1.916.81 2.049.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232z" />
  </Svg>
);

/* Section card chrome used all down the page. */
const card = (radius = 16, extra) => ({
  backgroundColor: '#ffffff',
  borderRadius: radius,
  borderWidth: 1,
  borderColor: C.gray100,
  boxShadow: SHADOW.sm,
  ...extra,
});

/* The stepper drawn on the mobile summary card — visual only; the whole card
   opens the drawer, which is where quantity actually gets set. */
const FakeStepper = ({ value }) => (
  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
    <View style={{ width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: C.gray200 }}>
      <Minus size={12} color={C.gray400} />
    </View>
    <View style={{ width: 48, borderRadius: 8, borderWidth: 2, borderColor: C.gray200, backgroundColor: '#ffffff', paddingVertical: 4 }}>
      <Text style={[t('sm'), { textAlign: 'center', fontWeight: '700', color: C.gray400 }]}>{value}</Text>
    </View>
    <View style={{ width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: ORANGE }}>
      <Plus size={12} color="#ffffff" />
    </View>
  </View>
);

/* "নোট:" callouts (sea note / weight note / delivery note). */
const NoteText = ({ style, boldColor, children }) => (
  <Text style={style}>
    <Text style={{ fontWeight: '700', color: boldColor }}>নোট:</Text> {children}
  </Text>
);

export default function Product() {
  const navigation = useNavigation();
  const route = useRoute();
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();
  const { id, campaignCategoryId } = route.params || {};

  const reduxProduct = useSelector((s) => s.singleProduct?.product);
  const globalTaka = parseFloat(useSelector((s) => s.user?.currency?.taka)) || 18;
  const globalDiscountPct = getActiveDiscountPercent(useSelector((s) => s.orders?.siteDiscount));
  const campaigns = useSelector((s) => s.orders?.campaigns || []);
  const currentUser = useSelector((s) => s.user?.currentUser);
  const reduxD2dRates = useSelector((s) => s.bookingRequests?.d2dRates || []);
  const wishlistItems = useSelector((s) => s.wishlist?.wishlist || []);

  const hasCachedFor = (pid) => !!(reduxProduct && String(reduxProduct.id) === String(pid));
  const [product, setProduct] = useState(() => (hasCachedFor(id) ? reduxProduct : null));
  const [loading, setLoading] = useState(() => !hasCachedFor(id));
  const [refreshing, setRefreshing] = useState(false);
  const [fetchErr, setFetchErr] = useState(false);
  const [selectedColor, setSelectedColor] = useState(null);
  const [skuQtys, setSkuQtys] = useState({});
  const [simpleQty, setSimpleQty] = useState(0);
  const [shipping, setShipping] = useState(null);
  const [shipLoading, setShipLoading] = useState(false);
  /* The quantity `shipping` was actually fetched for (see shipChargePending). */
  const [shipQty, setShipQty] = useState(0);
  const [productType, setProductType] = useState('');
  const [warning, setWarning] = useState('');
  const [cartLoading, setCartLoading] = useState(false);
  const [downloadModalOpen, setDownloadModalOpen] = useState(false);
  const [downloadingMediaIdx, setDownloadingMediaIdx] = useState(null);
  const [downloadingSingleImage, setDownloadingSingleImage] = useState(false);
  const [vendorProducts, setVendorProducts] = useState([]);
  const [vendorProductIds, setVendorProductIds] = useState(null);
  const [resolvedIdentities, setResolvedIdentities] = useState([]);
  const [selectedD2DRate, setSelectedD2DRate] = useState('');
  const [shipMode, setShipMode] = useState('air');
  const [seaD2dRates, setSeaD2dRates] = useState([]);
  const [categoryRate, setCategoryRate] = useState(null);
  const [rateModalOpen, setRateModalOpen] = useState(false);
  /* null = not yet chosen; defaults to the first detected DG type. */
  const [goodsType, setGoodsType] = useState(null);
  const [shipCalcOpen, setShipCalcOpen] = useState(false);
  const [deliveryNoteOpen, setDeliveryNoteOpen] = useState(true);
  const [activeTab, setActiveTab] = useState('specs');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [colorViewerOpen, setColorViewerOpen] = useState(false);
  const [crumbH, setCrumbH] = useState(47);

  const debounceRef = useRef(null);
  const shipFnRef = useRef(null);
  const pendingRestoreRef = useRef(null);
  const imgRef = useRef(null);
  const galleryRef = useRef(null);

  /* ── scroll chrome: header slides away, breadcrumb fades with it ── */
  const { onScroll, hidden, isHidden, headerH, setHeaderH, headerStyle } = useHideOnScroll();
  const crumbStyle = useAnimatedStyle(() => ({
    opacity: withTiming(hidden.value ? 0 : 1, { duration: 300, easing: Easing.out(Easing.ease) }),
  }));

  /* ── campaign pricing ── */
  const campaignRate = useMemo(
    () =>
      getCampaignRateForCategoryIds(campaigns, [
        campaignCategoryId,
        product?.thirdCategoryId,
        product?.secondCategoryId,
        product?.topCategoryId,
        product?.categoryId,
      ]),
    [campaigns, product, campaignCategoryId],
  );
  const taka = campaignRate && campaignRate.rmbRate > 0 ? campaignRate.rmbRate : globalTaka;
  const discountPct = campaignRate ? campaignRate.discountPercent : globalDiscountPct;

  /* ── fetch product ── */
  const fetchProduct = useCallback(
    (prev) =>
      getProductById(id)
        .then((res) => {
          const p = normalizeProduct(res.data, prev || reduxProduct);
          if (p) setProduct(p);
        })
        .catch(() => setFetchErr(true)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [id],
  );

  useEffect(() => {
    setSelectedColor(null);
    setSkuQtys({});
    setSimpleQty(0);
    setShipping(null);
    setShipQty(0);
    setWarning('');
    setFetchErr(false);
    setSelectedD2DRate('');
    setActiveTab('specs');
    setCategoryRate(null);
    setGoodsType(null);
    setRateModalOpen(false);
    setDrawerOpen(false);
    setColorViewerOpen(false);
    setDownloadModalOpen(false);
    setDownloadingMediaIdx(null);
    setResolvedIdentities([]);

    const hasCached = hasCachedFor(id);
    if (hasCached) {
      setProduct(reduxProduct);
      setLoading(false);
    } else {
      setProduct(null);
      setLoading(true);
    }

    /* Selection captured before a login detour (web sessionStorage). */
    pendingRestoreRef.current = getJSON(KEYS.pendingProduct(id));
    if (pendingRestoreRef.current) remove(KEYS.pendingProduct(id));

    fetchProduct(hasCached ? reduxProduct : null).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchProduct(product).finally(() => setRefreshing(false));
  }, [fetchProduct, product]);

  /* ── fetch category name + D2D rates + 1688 category rate ── */
  useEffect(() => {
    if (!product) return undefined;
    let cancelled = false;
    const catId = product.thirdCategoryId || product.secondCategoryId || product.topCategoryId || product.categoryId;
    if (catId) {
      getProductCategory({ categoryId: catId })
        .then((res) => {
          const c = res.data?.category;
          if (c && !cancelled) setProductType(c.translatedName || 'Others');
        })
        .catch(() => {});
    }
    if (reduxD2dRates.length === 0) dispatch(getAllD2DRatesRedux('air', 'china')).catch(() => {});
    if (seaD2dRates.length === 0) {
      getAllD2DRates('sea', 'china')
        .then((arr) => !cancelled && setSeaD2dRates(arr || []))
        .catch(() => {});
    }
    /* Walk leaf-to-root through the category chain, stop at the first
       configured rate doc — one to four single-doc reads. */
    const candidateIds = [product.thirdCategoryId, product.secondCategoryId, product.topCategoryId, product.categoryId]
      .filter(Boolean)
      .map(String);
    (async () => {
      for (const cid of candidateIds) {
        const rate = await get1688CategoryRateById(cid);
        if (cancelled) return;
        if (rate) {
          setCategoryRate(rate);
          return;
        }
      }
      if (!cancelled) setCategoryRate(null);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?.id, product?.thirdCategoryId, product?.secondCategoryId, product?.topCategoryId, product?.categoryId]);

  /* ── auto-select D2D rate (re-matches when ship mode changes) ── */
  const activeD2dRates = shipMode === 'sea' ? seaD2dRates : reduxD2dRates;
  useEffect(() => {
    if (!productType || activeD2dRates.length === 0) return;
    if (activeD2dRates.some((r) => r.id === selectedD2DRate)) return;
    const pt = productType.toLowerCase();
    const match =
      activeD2dRates.find((r) => r.id?.toLowerCase() === pt) ||
      activeD2dRates.find((r) => pt.includes(r.id?.toLowerCase() || '') || (r.id?.toLowerCase() || '').includes(pt));
    if (match) setSelectedD2DRate(match.id);
  }, [productType, activeD2dRates, selectedD2DRate]);

  /* ── derived variants ── */
  const colorsArray = useMemo(() => buildColorsArray(product), [product]);
  const allSizes = useMemo(() => buildSizesArray(product), [product]);
  const sizesForColor = useMemo(() => buildSizesForColor(product, allSizes, selectedColor), [product, allSizes, selectedColor]);
  const hasVariants = colorsArray.length > 0 || allSizes.length > 0;
  const variantSpecs = useMemo(() => buildVariantSpecs(product), [product]);
  const dgInfo = useMemo(() => classifyDangerousGoods(product), [product]);
  const sizeWeightRows = useMemo(() => buildSizeWeightRows(product), [product]);
  const hasDims = sizeWeightRows.some((r) => r.length || r.width || r.height);
  const hasWeights = sizeWeightRows.some((r) => r.weight);
  const hasSizeWeight = hasDims;

  const getUnitPrice = useCallback((variantPrice, qty = 0, range = []) => unitPriceAt(variantPrice, qty, range, taka), [taka]);

  const { totalQty, totalPrice } = useMemo(() => {
    if (!product) return { totalQty: 0, totalPrice: 0 };
    const range = product.price_range || [];
    if (!hasVariants) {
      const p = getUnitPrice(parseFloat(product.salePrice || product.price || 0), simpleQty, range);
      return { totalQty: simpleQty, totalPrice: p * simpleQty };
    }
    const runQty = Object.values(skuQtys).reduce((s, q) => s + (parseInt(q, 10) || 0), 0);
    let qty = 0;
    let price = 0;
    Object.entries(skuQtys).forEach(([key, q]) => {
      if (!q || q <= 0) return;
      const v = findVariantByProperties(product.variants, key);
      const p = getUnitPrice(v?.price, runQty, range);
      qty += parseInt(q, 10);
      price += p * parseInt(q, 10);
    });
    return { totalQty: qty, totalPrice: price };
  }, [product, hasVariants, simpleQty, skuQtys, getUnitPrice]);

  const activePriceTier = useMemo(() => {
    const range = product?.price_range;
    if (!range?.length) return null;
    for (let i = range.length - 1; i >= 0; i--) {
      const minQ = i === 0 ? 0 : parseInt(range[i][0] ?? range[i].beginAmount ?? 0, 10);
      if (totalQty >= minQ) return i;
    }
    return 0;
  }, [product, totalQty]);

  const batch = parseInt(product?.batch, 10) || 1;
  const maxQty = parseInt(product?.totalAvailableQuantity, 10) || 9999;
  const pics = useMemo(() => product?.pictures || [], [product]);
  const allMedia = useMemo(() => {
    const videos = (product?.videos || []).filter((v) => v?.Url || v?.url);
    return [
      ...pics.map((url) => ({ type: 'image', url })),
      ...videos.map((v) => ({ type: 'video', url: v.Url || v.url, thumb: v.PreviewUrl || v.previewUrl || '' })),
    ];
  }, [pics, product?.videos]);
  const priceRange = useMemo(() => product?.price_range || [], [product]);
  const basePrice = useMemo(() => {
    if (!product) return 0;
    const raw = parseFloat(product.salePrice || product.price || 0);
    if (raw > 0) return Math.round(raw * taka);
    if (priceRange.length > 0) return Math.round(parseFloat(priceRange[0][1] ?? priceRange[0].price ?? 0) * taka);
    /* Only the variants are priced: show the cheapest as a "from" price. */
    const variantPrices = (product.variants || []).map((v) => parseFloat(v.price)).filter((n) => n > 0);
    return variantPrices.length ? Math.round(Math.min(...variantPrices) * taka) : 0;
  }, [product, priceRange, taka]);
  const discountedBasePrice = Math.round(applyDiscount(basePrice, discountPct));
  const discountedTotalPrice = Math.round(applyDiscount(totalPrice, discountPct));
  const rating = parseFloat(product?.rating) || 0;
  const sold = parseInt(product?.totalSold || product?.orders, 10) || 0;
  const moq = parseInt(product?.moq, 10) || 1;
  /* `moq` is a per-PRODUCT minimum counted across every variant. */
  const moqShortfall = Math.max(0, moq - totalQty);
  const belowMoq = totalQty > 0 && moqShortfall > 0;
  /* The China courier charge is baked into the order payload, so ordering
     before it settles would commit the previous quantity's charge. */
  const shipChargePending = totalQty > 0 && (shipLoading || shipQty !== totalQty);
  const moqMessage = totalQty === 0 ? 'Please select quantity first.' : `Minimum order is ${moq} pcs — add ${moqShortfall} more.`;

  const blockedByMoq = () => {
    if (totalQty >= moq) return false;
    setWarning(moqMessage);
    toast.error(
      totalQty === 0 ? 'Please select a quantity first.' : `Minimum order quantity is ${moq} pcs — please add ${moqShortfall} more.`,
    );
    return true;
  };

  /* ── vendor products ── */
  useEffect(() => {
    const shopId = product?.shop_id;
    if (!shopId) return undefined;
    let alive = true;
    setVendorProducts([]);
    setVendorProductIds(null);
    getVendorProducts({ vendorId: shopId, framePosition: 1, filterByCategory: 'Default' })
      .then((res) => {
        if (!alive) return;
        const all = res.data?.products || [];
        setVendorProductIds(all.map((p) => String(p.id)));
        setVendorProducts(all.filter((p) => String(p.id) !== String(id)).slice(0, 8));
      })
      .catch(() => alive && setVendorProductIds([]));
    return () => {
      alive = false;
    };
  }, [product?.shop_id, id]);

  /* ── resolve seller status tags (the detail endpoint never returns them) ── */
  useEffect(() => {
    const shopId = product?.shop_id;
    const shopName = product?.shop_name || product?.shopName;
    if (product?.sellerIdentities?.length) {
      setResolvedIdentities(product.sellerIdentities);
      return undefined;
    }
    if (!shopId || !shopName || !vendorProductIds?.length) return undefined;
    if (sellerIdentityCache.has(shopId)) {
      setResolvedIdentities(sellerIdentityCache.get(shopId));
      return undefined;
    }
    let cancelled = false;
    searchProducts(shopName, { framePosition: 1 })
      .then((res) => {
        const own = new Set(vendorProductIds);
        const match = (res.data?.products || []).find((p) => own.has(String(p.id)) && p.sellerIdentities?.length);
        const ids = match?.sellerIdentities || [];
        sellerIdentityCache.set(shopId, ids);
        if (!cancelled) setResolvedIdentities(ids);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [product?.shop_id, product?.shop_name, product?.shopName, product?.sellerIdentities, vendorProductIds]);

  /* ── first colour selected / pending selection restored ── */
  useEffect(() => {
    const pending = pendingRestoreRef.current;
    if (pending && product) {
      if (pending.skuQtys) setSkuQtys(pending.skuQtys);
      if (pending.simpleQty) setSimpleQty(pending.simpleQty);
      if (pending.selectedD2DRate) setSelectedD2DRate(pending.selectedD2DRate);
      setSelectedColor(pending.selectedColor ?? colorsArray[0] ?? null);
      pendingRestoreRef.current = null;
    } else if (colorsArray.length > 0 && !selectedColor) {
      setSelectedColor(colorsArray[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [colorsArray.length, product?.id]);

  /* Back from Login with the selection still on screen: the stored copy is
     no longer needed. */
  useEffect(() => {
    if (currentUser?.id || currentUser?.email) remove(KEYS.pendingProduct(id));
  }, [currentUser?.id, currentUser?.email, id]);

  /* ── China-local courier quote, debounced 800ms ── */
  shipFnRef.current = async (qty) => {
    if (!product || qty <= 0) {
      setShipping(null);
      setShipQty(qty);
      return;
    }
    setShipLoading(true);
    try {
      const skuList = Object.entries(skuQtys)
        .filter(([, q]) => q > 0)
        .map(([key, q]) => ({ totalQuantity: q, ...(findVariantByProperties(product.variants, key) || {}) }));
      const res = await getShippingQuote({ productId: product.id, totalQuantity: qty, skus: JSON.stringify(skuList) });
      const sc = res.data?.shippingCost;
      if (sc?.freePostage) setShipping('free');
      else if (sc?.freight) setShipping(String(Math.round(parseFloat(sc.freight) * taka)));
      else setShipping('later');
    } catch {
      setShipping('later');
    } finally {
      setShipQty(qty);
      setShipLoading(false);
    }
  };
  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => shipFnRef.current?.(totalQty), SHIP_DEBOUNCE_MS);
  }, [totalQty]);
  useEffect(() => () => clearTimeout(debounceRef.current), []);

  /* ── handlers ── */
  const handleColorClick = useCallback(
    (color) => {
      setSelectedColor(color);
      galleryRef.current?.showColor(color);
      setWarning('');
    },
    [],
  );

  const getSizeKey = (sizeProps) => (selectedColor ? `${selectedColor.properties};${sizeProps}` : sizeProps);

  const setSkuQty = (key, val) => {
    const variant = findVariantByProperties(product?.variants, key);
    const variantMax = parseInt(variant?.quantity, 10) > 0 ? parseInt(variant.quantity, 10) : maxQty;
    let n = Math.max(0, Math.min(parseInt(val, 10) || 0, variantMax));
    if (batch > 1 && n > 0) {
      n = Math.ceil(n / batch) * batch;
      if (n > variantMax) n = Math.floor(variantMax / batch) * batch;
    }
    setSkuQtys((prev) => ({ ...prev, [key]: n }));
    setWarning('');
  };

  /* Unit price for a variant key — a bare colour segment prices from the
     cheapest variant carrying it, a full colour;size key prices exactly. */
  const priceFor = (properties) => {
    const vs = product?.variants || [];
    const exact = findVariantByProperties(vs, properties);
    const pool = exact ? [exact] : vs.filter((v) => (v.properties || '').split(';').includes(properties));
    if (!pool.length) return null;
    const raw = Math.min(...pool.map((v) => getUnitPrice(v.price, totalQty, priceRange)));
    if (!raw || !isFinite(raw)) return null;
    return { original: raw, amount: Math.round(applyDiscount(raw, discountPct)) };
  };

  const colorTotal = (color) =>
    Object.entries(skuQtys)
      .filter(([k]) => k.startsWith(color.properties))
      .reduce((s, [, v]) => s + (parseInt(v, 10) || 0), 0);

  const handleSimpleQtyChange = (val) => {
    let n = Math.min(parseInt(val, 10) || 0, maxQty);
    if (batch > 1 && n > 0) {
      n = Math.ceil(n / batch) * batch;
      if (n > maxQty) n = Math.floor(maxQty / batch) * batch;
    }
    setSimpleQty(n);
  };

  const isLoggedIn = !!(currentUser?.id || currentUser?.email);
  /* Login is pushed on top of this screen and pops back to it, so the
     selection survives on screen; the stored copy covers a cold restart. */
  const requireLogin = (intent) => {
    if (isLoggedIn) return false;
    setJSON(KEYS.pendingProduct(id), { skuQtys, simpleQty, selectedColor, selectedD2DRate, intent });
    navigation.navigate('Login');
    return true;
  };

  /* ── shipping cost breakdown ── */
  const approxWeightKg = parseFloat(((product?.item_weight || 0) * totalQty).toFixed(2));
  const goodsTypeOptions = [{ id: 'regular', label: 'Regular (No Battery)', Icon: Package }, ...dgInfo.types];
  const effectiveGoodsType = goodsType || (dgInfo.types[0]?.id ?? 'regular');
  const isDgGoods = effectiveGoodsType !== 'regular';
  const shippingRatePerKg = ratePerKgFor(categoryRate, shipMode, approxWeightKg, isDgGoods);
  const isParcelRate = shipMode === 'air' && approxWeightKg <= 0.3;
  const rateUnitBn = isParcelRate ? 'পার্সেল' : 'কেজি';
  const cnToBdCharge = totalQty > 0 ? chargeFor(categoryRate, shipMode, approxWeightKg, isDgGoods) : 0;
  const chinaLocalNum = shipping && shipping !== 'free' && shipping !== 'later' ? parseInt(shipping, 10) : 0;
  const mainRateTier = mainTierOf(shipMode, buildRateTiers(categoryRate, shipMode, approxWeightKg, isDgGoods));
  const shippingMethods = goodsTypeOptions.map((opt) => {
    const dg = opt.id !== 'regular';
    const tiers = buildRateTiers(categoryRate, shipMode, approxWeightKg, dg);
    return {
      ...opt,
      dg,
      tiers,
      mainTier: mainTierOf(shipMode, tiers),
      originWarehouse: dg ? 'Hong Kong Warehouse, HK' : 'China Warehouse, CN',
    };
  });
  const quoteQty = totalQty || 1;
  const quoteWeightKg = parseFloat(((product?.item_weight || 0) * quoteQty).toFixed(2));
  const quoteCharge = chargeFor(categoryRate, shipMode, quoteWeightKg, isDgGoods);

  /* estimated delivery date range — Air: 14–20 days, Sea: 40–45 days */
  const deliveryDateRange = (() => {
    const isSea = shipMode === 'sea';
    const f = (days) => {
      const d = new Date();
      d.setDate(d.getDate() + days);
      return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
    };
    return `${f(isSea ? 40 : 14)} - ${f(isSea ? 45 : 20)}`;
  })();

  /* Both actions send the identical payload; only the destination differs.
     Shape kept compatible with the Cart / PlaceOrder screens. */
  const buildOrderPayload = () => {
    const skus = !hasVariants
      ? [{ totalQuantity: simpleQty, price: basePrice, sku_id: Date.now().toString() }]
      : Object.entries(skuQtys)
          .filter(([, q]) => q > 0)
          .map(([key, q]) => {
            const v = findVariantByProperties(product.variants, key);
            const cp = key.split(';').find((p) => p.startsWith('0'));
            const sp = key.split(';').find((p) => p.startsWith('1'));
            return {
              totalQuantity: parseInt(q, 10),
              color: cp ? propVal(product.props_list?.[cp]) : null,
              size: sp ? propVal(product.props_list?.[sp]) : null,
              image: colorsArray.find((c) => c.properties === cp)?.url || null,
              ...v,
              price: getUnitPrice(v?.price || product.salePrice || product.price || 0, totalQty, priceRange),
            };
          });
    const localShip = !shipping || shipping === 'free' || shipping === 'later' ? '0' : `${parseInt(shipping, 10)}`;
    return {
      shopId: product.shop_id,
      shopName: product.shop_name || product.shopName,
      localShipping: localShip,
      currency: taka,
      items: [
        {
          id: product.id,
          name: product.name,
          detail_url: product.detail_url,
          availability: product.availability,
          picture: pics[0],
          variants: hasVariants ? false : [],
          skus,
          propertyNames: product.propertyNames || product.props_name,
          price_range: priceRange.length ? JSON.stringify(priceRange) : '',
          /* the same per-kg rate shown on the page */
          shippingRate: shippingRatePerKg,
          productType: productType || 'Others',
          shipmentMethod: shipMode === 'sea' ? 'Sea' : 'Air',
          campaignId: campaignRate?.campaignId || null,
          campaignDiscountPercent: campaignRate ? discountPct : 0,
          weight: parseFloat((product.item_weight || 0) * totalQty).toFixed(2),
          batch: product.batch || '',
          /* the cart re-enforces both of these when quantities change */
          moq,
          /* Air's 0–0.3kg band is charged per parcel, not per kg. */
          unitWeight: parseFloat(product.item_weight) || 0,
          shippingRateUnit: isParcelRate ? 'parcel' : 'kg',
        },
      ],
    };
  };

  const handleBuyNow = () => {
    if (blockedByMoq() || requireLogin('order')) return;
    setWarning('');
    dispatch(addToPendingOrdersRedux([buildOrderPayload()]));
    navigation.navigate(TABS.CART, { screen: 'PlaceOrder' });
  };

  const handleAddToCart = async (sourceRef = null) => {
    if (blockedByMoq() || requireLogin('cart')) return;
    setWarning('');
    setCartLoading(true);
    try {
      await dispatch(addToCart(currentUser, buildOrderPayload()));
      flyToIconFromRef(cdn(pics[0]), sourceRef || imgRef, 'cart');
    } catch {
      toast.error('Failed to add to cart. Please try again.');
    } finally {
      setCartLoading(false);
    }
  };

  /* The intent comes from the button pressed, never from state. */
  const handleDrawerConfirm = async (intent, sourceRef = null) => {
    if (blockedByMoq()) return;
    if (intent === 'cart') await handleAddToCart(sourceRef);
    else handleBuyNow();
    setDrawerOpen(false);
  };

  const isWishlisted = wishlistItems.some((w) => w.id === product?.id);
  const toggleWishlist = () => {
    if (!isLoggedIn) {
      navigation.navigate('Login');
      return;
    }
    if (isWishlisted) dispatch(removeFromWishlist(product.id));
    else {
      dispatch(addToWishlist({ ...product, source: 'taobao' }));
      flyToIconFromRef(cdn(pics[0]), imgRef, 'wishlist');
    }
  };

  /* One image, as the original file the CDN serves (the viewer shows a
     resized derivative). */
  const handleDownloadSingleImage = async (rawUrl, label) => {
    if (!rawUrl || downloadingSingleImage) return;
    setDownloadingSingleImage(true);
    try {
      const url = cdn(rawUrl);
      const ext = extOf(url);
      const done = await saveRemoteFile(url, `${safeName(label || product?.name, 'image')}.${ext}`, ext);
      if (done) toast.success('Image saved to gallery!');
    } catch (e) {
      if (__DEV__) console.warn('[download] single image failed:', e?.message || e);
      toast.error('Failed to download image. Please try again.');
    } finally {
      setDownloadingSingleImage(false);
    }
  };

  /* One file — image or video — in its original format. A video host that
     refuses the read falls back to opening the file directly. */
  const handleDownloadMedia = async (item, index) => {
    if (downloadingMediaIdx !== null || !item?.url) return;
    setDownloadingMediaIdx(index);
    const url = item.type === 'video' ? item.url : cdn(item.url);
    const ext = extOf(url, item.type === 'video' ? 'mp4' : 'jpg');
    try {
      const done = await saveRemoteFile(url, `${safeName(product?.name, 'product')}-${String(index + 1).padStart(2, '0')}.${ext}`, ext);
      if (done) toast.success(item.type === 'video' ? 'Video saved to gallery!' : 'Image saved to gallery!');
    } catch (e) {
      if (__DEV__) console.warn('[download] media failed:', e?.message || e);
      if (item.type === 'video') {
        Linking.openURL(url).catch(() => {});
        toast.success('Video opened — long-press or right-click to save.');
      } else {
        toast.error('Failed to download. Please try again.');
      }
    } finally {
      setDownloadingMediaIdx(null);
    }
  };

  const shareUrl = `${SITE}/product/${id}`;
  const openStore = useCallback(
    () => navigation.navigate('Collection', { id: product.shop_id, shopName: product.shop_name || product.shopName || '' }),
    [navigation, product],
  );
  const openVendorProduct = useCallback(
    (p) => {
      dispatch(setSearchedProductDetail(p, '1688'));
      navigation.push('Product', { id: p.id });
    },
    [dispatch, navigation],
  );
  const goHome = () => goHomeNav();
  const goBack = () => (navigation.canGoBack() ? navigation.goBack() : goHome());

  const closeDrawer = useCallback(() => setDrawerOpen(false), []);
  const closeViewer = useCallback(() => setColorViewerOpen(false), []);
  const closeRate = useCallback(() => setRateModalOpen(false), []);
  const closeDownload = useCallback(() => setDownloadModalOpen(false), []);

  const ready = !!product;
  const selectedSkus = Object.entries(skuQtys).filter(([, v]) => v > 0);
  const sellerStatuses = useMemo(
    () => (product ? getSellerStatuses(product.sellerIdentities?.length ? product.sellerIdentities : resolvedIdentities) : []),
    [product, resolvedIdentities],
  );
  /* Rewrites every image URL in the description — far too heavy to redo on
     each render, and a new string would also defeat ProductTabs' memo. */
  const descHtml = useMemo(() => (product ? cdnHtml(product.description || '') : ''), [product]);
  const topPad = insets.top + headerH;

  const variantProps = {
    product,
    colorsArray,
    allSizes,
    sizesForColor,
    hasVariants,
    selectedColor,
    handleColorClick,
    skuQtys,
    setSkuQty,
    setSkuQtys,
    simpleQty,
    setSimpleQty,
    handleSimpleQtyChange,
    batch,
    maxQty,
    priceRange,
    totalQty,
    selectedSkus,
    getSizeKey,
    colorTotal,
    getUnitPrice,
    discountPct,
    onSwatchExpand: () => setColorViewerOpen(true),
  };

  /* ════════════════ RENDER PIECES ════════════════ */

  const breadcrumb = ready && (
    <Animated.View
      pointerEvents={isHidden ? 'none' : 'box-none'}
      onLayout={(e) => setCrumbH(e.nativeEvent.layout.height)}
      style={[
        {
          position: 'absolute',
          top: topPad,
          left: 0,
          right: 0,
          zIndex: 5,
          backgroundColor: 'rgba(255,255,255,0.9)',
          borderBottomWidth: 1,
          borderBottomColor: C.gray100,
          boxShadow: SHADOW.sm,
        },
        crumbStyle,
      ]}
    >
      <View style={{ paddingHorizontal: 8, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 }}>
          <Pressable onPress={goHome} hitSlop={6}>
            {({ pressed }) => <Text style={[t('xs'), { color: pressed ? ORANGE2 : C.gray400 }]}>Home</Text>}
          </Pressable>
          <ChevronRight size={10} color={C.gray300} />
          <Pressable onPress={goBack} hitSlop={6}>
            {({ pressed }) => <Text style={[t('xs'), { color: pressed ? ORANGE2 : C.gray400 }]}>Results</Text>}
          </Pressable>
          <ChevronRight size={10} color={C.gray300} />
          <Text style={[t('11'), { flex: 1, color: C.gray600, fontWeight: '500' }]} numberOfLines={1}>
            {product.name}
          </Text>
        </View>
        <ScalePress onPress={toggleWishlist} scaleTo={0.85} hitSlop={6} style={{ padding: 8, borderRadius: 999 }}>
          <Heart size={14} color={isWishlisted ? ORANGE2 : C.gray400} fill={isWishlisted ? ORANGE2 : 'transparent'} />
        </ScalePress>
      </View>
    </Animated.View>
  );

  const nameCard = ready && (
    <View style={card(24, { padding: 20 })}>
      <Text style={[t('15', 'snug'), { fontWeight: '700', color: C.gray900, marginBottom: 12 }]} numberOfLines={2}>
        {product.name}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }} contentContainerStyle={{ alignItems: 'center', gap: 6 }}>
          {rating > 0 && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.amber50, borderRadius: 999, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1, borderColor: C.amber100 }}>
              <Stars rating={rating} size={9} />
              <Text style={[t('10'), { fontWeight: '600', color: C.amber700 }]}>{rating.toFixed(1)}</Text>
            </View>
          )}
          {sold > 0 && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: C.gray50, borderRadius: 999, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1, borderColor: C.gray200 }}>
              <Text style={[t('10'), { fontWeight: '600', color: ORANGE2 }]}>{sold >= 1000 ? `${(sold / 1000).toFixed(1)}k` : sold}</Text>
              <Text style={[t('10'), { color: C.gray500 }]}>sold</Text>
            </View>
          )}
          {product.totalAvailableQuantity > 0 && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: C.emerald50, borderRadius: 999, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1, borderColor: C.emerald100 }}>
              <Check size={9} color={C.emerald600} />
              <Text style={[t('10'), { fontWeight: '600', color: C.emerald600 }]}>
                {typeof product.totalAvailableQuantity === 'number'
                  ? product.totalAvailableQuantity.toLocaleString()
                  : product.totalAvailableQuantity}{' '}
                in stock
              </Text>
            </View>
          )}
          {product.isDirectFactory && (
            <Chip Icon={Factory} label="Factory Direct" tone={{ fg: C.emerald700, bg: C.emerald50, border: C.emerald100 }} size={9} weight="400" />
          )}
        </ScrollView>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginLeft: 4 }}>
          <ScalePress
            scaleTo={0.85}
            hitSlop={6}
            accessibilityLabel="Copy Link"
            onPress={() => {
              Clipboard.setString(shareUrl);
              toast.success('Link copied!');
            }}
          >
            <Copy size={14} color={C.gray400} />
          </ScalePress>
          <ScalePress
            scaleTo={0.85}
            hitSlop={6}
            accessibilityLabel="Share to Facebook"
            onPress={() => Linking.openURL(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`).catch(() => {})}
          >
            <FacebookIcon />
          </ScalePress>
          <ScalePress
            scaleTo={0.85}
            hitSlop={6}
            accessibilityLabel="Share to WhatsApp"
            onPress={() => Linking.openURL(`https://wa.me/?text=${encodeURIComponent(`${product.name}\n${shareUrl}`)}`).catch(() => {})}
          >
            <WhatsAppIcon />
          </ScalePress>
          <ScalePress scaleTo={0.85} hitSlop={6} accessibilityLabel="Download images & videos" onPress={() => setDownloadModalOpen(true)}>
            <Download size={14} color={C.gray400} />
          </ScalePress>
        </View>
      </View>
    </View>
  );

  const priceCard =
    ready &&
    /* hidden when variants exist but no price data */
    !(hasVariants && basePrice === 0 && priceRange.length === 0) && (
      <View style={card(16, { paddingHorizontal: 12, paddingVertical: 12, overflow: 'hidden' })}>
        {priceRange.length > 0 ? (
          <View>
            <PriceTierRow priceRange={priceRange} taka={taka} discountPct={discountPct} activePriceTier={activePriceTier} />
            {totalQty > 0 &&
              activePriceTier !== null &&
              (() => {
                const tier = priceRange[activePriceTier];
                const activeTierBdt = Math.round(parseFloat(tier[1] ?? tier.price ?? 0) * taka);
                return (
                  <Animated.View entering={FadeIn.duration(200)} style={{ marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Check size={10} color={C.emerald600} />
                    <Price
                      amount={Math.round(applyDiscount(activeTierBdt, discountPct))}
                      original={activeTierBdt}
                      style={[t('10'), { color: C.emerald600, fontWeight: '500' }]}
                    />
                    <Text style={[t('10'), { color: C.emerald600, fontWeight: '500' }]}>/pc at {totalQty} pcs</Text>
                  </Animated.View>
                );
              })()}
          </View>
        ) : (
          <View>
            {!hasVariants && (
              <Text style={[t('9'), { color: C.gray400, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 4 }]}>Unit Price</Text>
            )}
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
              <Price
                amount={discountedBasePrice}
                original={basePrice}
                style={[t('3xl'), { fontWeight: '800', color: ORANGE, letterSpacing: -0.7 }]}
              />
              <Text style={[t('xs'), { color: C.gray400, marginLeft: 4 }]}>/ pc</Text>
            </View>
            {hasVariants && <Text style={[t('10'), { color: C.gray400, marginTop: 2 }]}>Starting price · varies by variant</Text>}
          </View>
        )}
      </View>
    );

  const moqCard = (
    <View style={{ backgroundColor: C.green50, borderWidth: 1, borderColor: C.green200, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, alignItems: 'center' }}>
      <Text style={[t('sm'), { fontWeight: '700', color: C.green700, textAlign: 'center' }]}>সর্বনিম্ন অর্ডার করুন {moq} পিস</Text>
      <Text style={[t('xs'), { color: C.green600, marginTop: 2, textAlign: 'center' }]}>(শুধুমাত্র এই পণ্যের ক্ষেত্রে প্রযোজ্য)</Text>
    </View>
  );

  const packCard = batch > 1 && (
    <View style={{ backgroundColor: '#e8f1ff', borderWidth: 1, borderColor: '#bcd8ff', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
      <Package size={16} color="#1677FF" style={{ marginTop: 2 }} />
      <View style={{ flex: 1 }}>
        <Text style={[t('sm'), { fontWeight: '700', color: '#0f5fd8' }]}>প্যাক সাইজ: {batch} পিস = ১ প্যাক</Text>
        <Text style={[t('xs'), { color: '#1677FF', marginTop: 2 }]}>আপনাকে অবশ্যই পুরো প্যাক অর্ডার করতে হবে (১ পিস বেছে নেওয়া যাবে না)</Text>
      </View>
    </View>
  );

  /* Mobile: variant summary → tap to open the drawer */
  const variantSummary = ready && (
    <View style={card(16, { borderColor: C.gray200, overflow: 'hidden' })}>
      <Pressable
        onPress={() => setDrawerOpen(true)}
        style={({ pressed }) => ({
          paddingHorizontal: 16,
          paddingVertical: 12,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: pressed ? C.gray50 : '#ffffff',
        })}
      >
        <View>
          <Text style={[t('xs'), { fontWeight: '700', color: C.gray600 }]}>{totalQty > 0 ? `${totalQty} pcs selected` : 'Select Options'}</Text>
          {totalQty > 0 ? (
            <Price amount={discountedTotalPrice} original={totalPrice} style={[t('lg', 'tight'), { color: ORANGE2, fontWeight: '800' }]} />
          ) : (
            <Text style={[t('xs'), { color: C.gray400, marginTop: 2 }]}>Tap to choose color, size &amp; quantity</Text>
          )}
        </View>
        <ChevronDown size={18} color={C.gray400} />
      </Pressable>

      {hasVariants && colorsArray.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ borderTopWidth: 1, borderTopColor: C.gray50 }}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 10, paddingTop: 4, gap: 8, alignItems: 'center' }}
        >
          {colorsArray.map((c) => (
            <Pressable
              key={c.properties}
              onPress={() => {
                handleColorClick(c);
                setDrawerOpen(true);
              }}
              style={({ pressed }) => ({
                width: 44,
                height: 44,
                borderRadius: 8,
                borderWidth: 2,
                overflow: 'hidden',
                opacity: pressed ? 0.75 : 1,
                borderColor: selectedColor?.properties === c.properties ? ORANGE2 : C.gray200,
              })}
            >
              {c.url ? (
                <ProductImage uri={c.url} thumb style={{ width: '100%', height: '100%' }} fallbackIconSize={12} />
              ) : (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.gray50, paddingHorizontal: 2 }}>
                  <Text style={[t('9', 'tight'), { fontWeight: '700', color: C.gray500, textAlign: 'center' }]} numberOfLines={3}>
                    {c.value}
                  </Text>
                </View>
              )}
            </Pressable>
          ))}
        </ScrollView>
      )}

      {/* Colours-only variants: one tap target that opens the drawer */}
      {hasVariants && colorsArray.length > 0 && allSizes.length === 0 && selectedColor && (
        <View style={{ paddingHorizontal: 16, paddingBottom: 12, paddingTop: 8, borderTopWidth: 1, borderTopColor: C.gray50 }}>
          <Text style={[t('xs'), { fontWeight: '600', color: C.gray600, marginBottom: 8 }]}>Quantity per Color</Text>
          <Pressable
            onPress={() => setDrawerOpen(true)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              borderRadius: 16,
              borderWidth: 2,
              paddingHorizontal: 12,
              paddingVertical: 10,
              borderColor: skuQtys[selectedColor.properties] > 0 ? 'rgba(255,102,0,0.3)' : C.gray100,
              backgroundColor: skuQtys[selectedColor.properties] > 0 ? 'rgba(255,247,237,0.5)' : 'rgba(249,250,251,0.5)',
            }}
          >
            {!!selectedColor.url && (
              <ProductImage uri={selectedColor.url} thumb style={{ width: 32, height: 32, borderRadius: 8, borderWidth: 1, borderColor: C.gray200 }} fallbackIconSize={12} />
            )}
            <Text style={[t('sm'), { flex: 1, minWidth: 0 }]} numberOfLines={2}>
              <Text
                style={{
                  fontWeight: skuQtys[selectedColor.properties] > 0 ? '700' : '500',
                  color: skuQtys[selectedColor.properties] > 0 ? ORANGE2 : C.gray700,
                }}
              >
                {selectedColor.value || Object.values(selectedColor)[0]}
              </Text>
              {(() => {
                const v = product.variants?.find((x) => x.properties === selectedColor.properties);
                return v?.quantity > 0 ? <Text style={[t('10'), { color: C.gray400 }]}>{`  (${v.quantity} in stock)`}</Text> : null;
              })()}
            </Text>
            <FakeStepper value={skuQtys[selectedColor.properties] || 0} />
          </Pressable>
        </View>
      )}

      {hasVariants && sizesForColor.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 12, gap: 8, alignItems: 'center' }}>
          {sizesForColor.map((s) => (
            <Pressable
              key={s.properties}
              onPress={() => setDrawerOpen(true)}
              style={({ pressed }) => ({
                paddingHorizontal: 14,
                paddingVertical: 6,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: C.gray200,
                backgroundColor: pressed ? C.gray100 : C.gray50,
              })}
            >
              <Text style={[t('12'), { fontWeight: '600', color: C.gray700 }]} numberOfLines={1}>
                {s.value}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      )}

      {/* Colour+size variants: a placeholder stepper that opens the drawer */}
      {hasVariants && sizesForColor.length > 0 && (
        <View style={{ paddingHorizontal: 16, paddingBottom: 12, paddingTop: 4, borderTopWidth: 1, borderTopColor: C.gray50 }}>
          <Text style={[t('xs'), { fontWeight: '600', color: C.gray600, marginBottom: 8 }]}>Quantity</Text>
          <Pressable
            onPress={() => setDrawerOpen(true)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              borderRadius: 16,
              borderWidth: 2,
              paddingHorizontal: 12,
              paddingVertical: 10,
              borderColor: totalQty > 0 ? 'rgba(255,102,0,0.3)' : C.gray100,
              backgroundColor: totalQty > 0 ? 'rgba(255,247,237,0.5)' : 'rgba(249,250,251,0.5)',
            }}
          >
            <Text style={[t('sm'), { flex: 1, minWidth: 0, fontWeight: totalQty > 0 ? '700' : '500', color: totalQty > 0 ? ORANGE2 : C.gray400 }]} numberOfLines={1}>
              {totalQty > 0 ? `${totalQty} pcs selected` : 'Tap to choose size & quantity'}
            </Text>
            <FakeStepper value={totalQty || 0} />
          </Pressable>
        </View>
      )}
    </View>
  );

  const summaryRow = (label, value, key) => (
    <View key={key} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: 1, borderTopColor: C.gray100 }}>
      {typeof label === 'string' ? <Text style={[t('xs'), { color: C.gray500, flexShrink: 1 }]}>{label}</Text> : label}
      {value}
    </View>
  );

  const courierValue = shipLoading ? (
    <RingSpinner />
  ) : totalQty === 0 ? (
    <Text style={[t('xs'), { color: C.gray400, fontStyle: 'italic' }]}>__</Text>
  ) : shipping === 'free' ? (
    <Text style={[t('xs'), { fontWeight: '700', color: C.emerald600 }]}>✓ ফ্রি শিপিং</Text>
  ) : shipping === 'later' || shipping === null ? (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <Info size={12} color={C.gray400} />
      <Text style={[t('xs'), { color: C.gray400 }]}>Included at checkout</Text>
    </View>
  ) : (
    <Text style={[t('xs'), { fontWeight: '700', color: C.gray800 }]}>৳{chinaLocalNum.toLocaleString()}</Text>
  );

  const orderSummaryCard = (
    <View style={card(16, { borderColor: C.gray200, overflow: 'hidden' })}>
      <View style={{ backgroundColor: '#ffffff', paddingHorizontal: 12, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <MapPin size={13} color={C.gray400} />
        <View style={{ backgroundColor: C.red50, borderWidth: 1, borderColor: C.red200, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 2 }}>
          <Text style={[t('11'), { fontWeight: '600', color: C.red600 }]}>🇨🇳 চীন থেকে</Text>
        </View>
        <Text style={[t('xs'), { fontWeight: '700', color: C.gray400 }]}>→</Text>
        <View style={{ backgroundColor: C.green50, borderWidth: 1, borderColor: C.green200, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 2 }}>
          <Text style={[t('11'), { fontWeight: '600', color: C.green700 }]}>🇧🇩 বাংলাদেশ</Text>
        </View>
        <Text style={[t('11'), { fontWeight: '500', color: C.gray500 }]}>ডেলিভারি</Text>
      </View>
      {summaryRow(
        <Text style={[t('xs'), { fontWeight: '700', color: 'rgb(78,78,78)', paddingVertical: 4 }]}>অর্ডার সারসংক্ষেপ</Text>,
        null,
        'h',
      )}
      {summaryRow('মোট পরিমাণ:', <Text style={[t('xs'), { fontWeight: '700', color: C.gray800 }]}>{totalQty > 0 ? `${totalQty} pc` : '—'}</Text>, 'q')}
      {summaryRow(
        'পণ্যের মূল্য:',
        totalPrice > 0 ? (
          <Price amount={discountedTotalPrice} original={totalPrice} currency="Tk " style={[t('xs'), { fontWeight: '700', color: C.gray800 }]} />
        ) : (
          <Text style={[t('xs'), { fontWeight: '700', color: C.gray800 }]}>—</Text>
        ),
        'p',
      )}
      {summaryRow('চায়না লোকাল কুরিয়ার চার্জ:', courierValue, 'c')}
    </View>
  );

  const shipModeOption = (mode, Icon, label) => {
    const on = shipMode === mode;
    return (
      <Pressable
        onPress={() => setShipMode(mode)}
        style={({ pressed }) => ({
          flex: 1,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          paddingVertical: 8,
          borderRadius: 8,
          borderWidth: 1,
          borderColor: on ? ORANGE2 : pressed ? C.gray300 : C.gray200,
          backgroundColor: on ? C.orange50 : '#ffffff',
        })}
      >
        <Radio selected={on} size={14} dot={6} color={ORANGE2} />
        <Icon size={13} color={on ? ORANGE2 : C.gray400} />
        <Text style={[t('11'), { fontWeight: '600', color: on ? C.gray800 : C.gray600 }]}>{label}</Text>
      </Pressable>
    );
  };

  const weightShippingCard = ready && (
    <View style={card(16, { borderColor: C.gray200, overflow: 'hidden' })}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.gray100 }}>
        <Package size={15} color={ORANGE2} />
        <Text style={[t('xs'), { fontWeight: '700', color: 'rgb(78,78,78)' }]}>ওজন ও শিপিং তথ্য</Text>
      </View>

      <View style={{ padding: 14, gap: 10 }}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {shipModeOption('air', Plane, 'Air Ship')}
          {shipModeOption('sea', Ship, 'Sea Ship')}
        </View>

        {shipMode === 'sea' && (
          <Animated.View
            entering={FadeIn.duration(200)}
            style={{ backgroundColor: C.red50, borderWidth: 1, borderColor: C.red200, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, flexDirection: 'row', gap: 6 }}
          >
            <AlertCircle size={12} color={C.red500} style={{ marginTop: 2 }} />
            <NoteText style={[t('10', 'relaxed'), { flex: 1, color: C.red800, fontWeight: '500' }]}>
              অর্ডার প্লেস করার পর আমাদের একজন প্রতিনিধি আপনার সঙ্গে যোগাযোগ করবেন এবং উক্ত প্রোডাক্টটি সি শিপমেন্টের মাধ্যমে আনা
              যাবে কি না এবং শিপিং চার্জ কত হবে, সে বিষয়ে নিশ্চিত করবেন। নিশ্চিত হওয়ার আগে কোনো ধরনের পেমেন্ট করা থেকে বিরত থাকুন।
            </NoteText>
          </Animated.View>
        )}

        {/* Shipping category & rate — opens the full rate modal */}
        <Pressable
          onPress={() => setRateModalOpen(true)}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
            backgroundColor: '#ffffff',
            borderWidth: 1,
            borderColor: pressed ? 'rgba(255,106,0,0.5)' : C.gray200,
            borderRadius: 8,
            paddingHorizontal: 10,
            paddingVertical: 8,
          })}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
            <Tag size={12} color={ORANGE} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                <Text style={[t('9'), { color: C.gray400, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.2 }]}>
                  Shipping Category &amp; Rate
                </Text>
                {dgInfo.isDangerousGoods && (
                  <>
                    <ShieldAlert size={11} color={C.red500} />
                    {dgInfo.types.map(({ id: dgId, label, Icon }) => (
                      <Chip key={dgId} Icon={Icon} label={label} tone={DG_TONES[dgId]} size={9} iconSize={9} gap={4} />
                    ))}
                  </>
                )}
              </View>
              <Text style={[t('11'), { fontWeight: '700', color: C.gray800 }]} numberOfLines={1}>
                {productType || 'Others'} · ৳{mainRateTier?.rate.toLocaleString()}
                {mainRateTier?.unit}
              </Text>
            </View>
          </View>
          <ChevronRight size={13} color={C.gray400} />
        </Pressable>

        {/* Collapsible shipping charge row */}
        <Pressable
          onPress={() => setShipCalcOpen((v) => !v)}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 6,
            backgroundColor: pressed ? C.gray100 : C.gray50,
            borderWidth: 1,
            borderColor: C.gray200,
            paddingHorizontal: 10,
            paddingVertical: 8,
            borderRadius: 8,
          })}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 }}>
            <Package2 size={13} color={ORANGE2} />
            <Text style={[t('11'), { flex: 1, fontWeight: '700', color: C.gray700 }]}>সম্ভাব্য শিপিং চার্জ (বাংলাদেশ আসার পর যুক্ত হবে)</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={[t('12'), { fontWeight: '800', color: C.gray800 }]}>৳{cnToBdCharge.toLocaleString()}</Text>
            {shipCalcOpen ? <ChevronUp size={14} color={C.gray500} /> : <ChevronDown size={14} color={C.gray500} />}
          </View>
        </Pressable>

        {shipCalcOpen && (
          <Animated.View entering={FadeInDown.duration(200)} style={{ gap: 10 }}>
            <View
              style={{
                borderWidth: 1,
                borderColor: C.gray300,
                borderRadius: 8,
                flexDirection: 'row',
                alignItems: 'stretch',
                paddingVertical: 8,
                backgroundColor: '#ffffff',
                boxShadow: SHADOW.inner,
              }}
            >
              <View style={{ flex: 1, paddingHorizontal: 4, alignItems: 'center' }}>
                <Text style={[t('10'), { color: C.gray500, marginBottom: 4 }]}>মোট ওজন</Text>
                <Text style={[t('11'), { fontWeight: '700', color: C.gray800 }]}>{approxWeightKg}KG</Text>
              </View>
              <View style={{ flex: 1, paddingHorizontal: 4, alignItems: 'center', borderLeftWidth: 1, borderLeftColor: C.gray200 }}>
                <Text style={[t('10'), { color: C.gray500, marginBottom: 4 }]} numberOfLines={1}>
                  শিপিং রেট/{rateUnitBn}
                </Text>
                <Text style={[t('11'), { fontWeight: '700', color: C.gray800 }]}>৳{shippingRatePerKg}</Text>
              </View>
              <View
                style={{
                  flex: 1,
                  paddingHorizontal: 4,
                  paddingVertical: 4,
                  alignItems: 'center',
                  borderLeftWidth: 1,
                  borderLeftColor: C.gray200,
                  backgroundColor: 'rgba(255,247,237,0.6)',
                  borderTopRightRadius: 8,
                  borderBottomRightRadius: 8,
                }}
              >
                <Text style={[t('10'), { color: ORANGE2, fontWeight: '500', marginBottom: 4 }]} numberOfLines={1}>
                  মোট বিল
                </Text>
                <Text style={[t('12'), { fontWeight: '800', color: ORANGE2 }]}>৳{cnToBdCharge.toLocaleString()}</Text>
              </View>
            </View>

            <View style={{ backgroundColor: C.amber50, borderWidth: 1, borderColor: C.amber200, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, flexDirection: 'row', gap: 6 }}>
              <AlertTriangle size={12} color={C.amber500} style={{ marginTop: 2 }} />
              <NoteText style={[t('10', 'relaxed'), { flex: 1, color: C.amber800 }]}>
                পণ্যের ওজনটি একটি সম্ভাব্য হিসাব। প্যাকেজিংসহ বাংলাদেশে পার্সেল আসার পর প্রকৃত ওজন সঠিকভাবে মেপে আসল শিপিং বিল নির্ধারণ করা
                হবে।
              </NoteText>
            </View>
          </Animated.View>
        )}
      </View>
    </View>
  );

  const deliveryCard = (
    <View style={card(16, { overflow: 'hidden' })}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, paddingVertical: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, flexShrink: 1 }}>
          <Calendar size={16} color={ORANGE2} />
          <Text style={[t('13'), { fontWeight: '700', color: C.gray800 }]}>ডেলিভারি তারিখ:</Text>
          <View style={{ backgroundColor: C.orange50, borderWidth: 1, borderColor: C.orange200, borderRadius: 4, paddingHorizontal: 8, paddingVertical: 2 }}>
            <Text style={[t('13'), { fontWeight: '800', color: ORANGE2 }]}>{deliveryDateRange}</Text>
          </View>
        </View>
        <Pressable
          onPress={() => setDeliveryNoteOpen((v) => !v)}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            backgroundColor: pressed ? C.blue600 : C.blue500,
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderRadius: 4,
            boxShadow: SHADOW.sm,
          })}
        >
          <Star size={11} color="#ffffff" fill="#ffffff" />
          <Text style={[t('11'), { fontWeight: '700', color: '#ffffff' }]}>নোট</Text>
          {deliveryNoteOpen ? <ChevronUp size={13} color="#ffffff" /> : <ChevronDown size={13} color="#ffffff" />}
        </Pressable>
      </View>
      {deliveryNoteOpen && (
        <Animated.View
          entering={FadeIn.duration(200)}
          style={{
            marginHorizontal: 16,
            marginBottom: 12,
            flexDirection: 'row',
            gap: 8,
            backgroundColor: 'rgba(239,246,255,0.6)',
            padding: 10,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: C.blue100,
          }}
        >
          <Star size={11} color={C.blue500} fill={C.blue500} style={{ marginTop: 2 }} />
          <NoteText style={[t('11', 'relaxed'), { flex: 1, color: C.gray600, fontWeight: '500' }]} boldColor={C.gray700}>
            আমাদের দেওয়া ডেলিভারি তারিখটি মূলত একটি সম্ভাব্য সময়, যা আমাদের চায়না ওয়ারহাউজ থেকে বাংলাদেশ ওয়ারহাউজে পণ্য পৌঁছানো
            পর্যন্ত হিসাব করা হয়েছে। তবে কোনো কারণে যদি সেলার (Seller) চায়না ওয়ারহাউজে পণ্য পাঠাতে স্বাভাবিকের চেয়ে বেশি সময় নেন, তবে
            ডেলিভারির তারিখটি পরিবর্তন হতে পারে।
          </NoteText>
        </Animated.View>
      )}
    </View>
  );

  /* ════════════ MOBILE CTA — permanently pinned ════════════ */
  const ctaBar = ready && (
    <View
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 40,
        backgroundColor: '#ffffff',
        borderTopWidth: 1,
        borderTopColor: C.gray200,
        boxShadow: SHADOW['2xl'],
        paddingBottom: insets.bottom,
      }}
    >
      <Pressable
        onPress={() => setDrawerOpen(true)}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 16,
          paddingVertical: 10,
          backgroundColor: pressed ? C.gray100 : C.gray50,
          borderBottomWidth: 1,
          borderBottomColor: C.gray100,
        })}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={[t('13'), { fontWeight: '500', color: C.gray600 }]}>Select Details</Text>
          {drawerOpen ? <ChevronUp size={14} color={C.gray400} /> : <ChevronDown size={14} color={C.gray400} />}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flexShrink: 1 }}>
          <Text style={[t('12'), { fontWeight: '500', color: C.gray500 }]} numberOfLines={1}>
            Quantity: {totalQty} pcs
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
            <Text style={[t('15'), { fontWeight: '700', color: ORANGE2 }]}>Pay Now: </Text>
            <Price
              amount={discountedTotalPrice + chinaLocalNum}
              original={totalPrice + chinaLocalNum}
              style={[t('15'), { fontWeight: '900', color: ORANGE2 }]}
            />
          </View>
        </View>
      </Pressable>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 10 }}>
        <ScalePress
          onPress={toggleWishlist}
          scaleTo={0.9}
          accessibilityLabel={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
          style={{
            width: 45,
            height: 45,
            borderRadius: 12,
            borderWidth: 1,
            alignItems: 'center',
            justifyContent: 'center',
            borderColor: isWishlisted ? ORANGE2 : C.gray300,
            backgroundColor: isWishlisted ? C.orange50 : '#ffffff',
          }}
        >
          <Heart size={19} color={isWishlisted ? ORANGE2 : C.gray500} fill={isWishlisted ? ORANGE2 : 'transparent'} />
        </ScalePress>
        <View style={{ flex: 1, flexDirection: 'row', gap: 8 }}>
          <View style={{ flex: 1 }}>
            <ScalePress
              onPress={() => {
                setDrawerOpen(true);
                /* below the minimum already? say why now, not at the last step */
                if (belowMoq) blockedByMoq();
              }}
              style={{ borderWidth: 2, borderColor: ORANGE2, borderRadius: 12, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            >
              <ShoppingCart size={15} color={ORANGE2} />
              <Text style={[t('13'), { fontWeight: '700', color: ORANGE2 }]}>Add to Cart</Text>
            </ScalePress>
          </View>
          <View style={{ flex: 1 }}>
            <ScalePress
              onPress={() => {
                setDrawerOpen(true);
                if (belowMoq) blockedByMoq();
              }}
              style={{ backgroundColor: ORANGE, borderRadius: 12, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: SHADOW.cta }}
            >
              <ShoppingBag size={15} color="#ffffff" />
              <Text style={[t('13'), { fontWeight: '700', color: '#ffffff' }]}>Place Order</Text>
            </ScalePress>
          </View>
        </View>
      </View>
    </View>
  );

  /* ════════════════ SCREEN ════════════════ */
  let body;
  if (!product && loading && !fetchErr) {
    body = <ProductSkeleton />;
  } else if (!product) {
    body = (
      <View style={{ paddingHorizontal: 16, paddingVertical: 64, alignItems: 'center' }}>
        <Animated.View
          entering={FadeInDown.duration(300)}
          style={{ backgroundColor: '#ffffff', borderRadius: 24, padding: 40, boxShadow: SHADOW.sm, maxWidth: 384, width: '100%', borderWidth: 1, borderColor: C.gray100, alignItems: 'center' }}
        >
          <Text style={{ fontSize: 48, lineHeight: 52, marginBottom: 16 }}>📦</Text>
          <Text style={[t('base'), { fontWeight: '700', color: C.gray800, marginBottom: 4 }]}>Product not found</Text>
          <Text style={[t('sm'), { color: C.gray400, marginBottom: 24, textAlign: 'center' }]}>This product may no longer be available.</Text>
          <ScalePress onPress={goBack} style={{ backgroundColor: ORANGE, paddingHorizontal: 28, paddingVertical: 10, borderRadius: 999 }}>
            <Text style={[t('sm'), { fontWeight: '700', color: '#ffffff' }]}>← Go Back</Text>
          </ScalePress>
        </Animated.View>
      </View>
    );
  } else {
    body = (
      <View style={{ paddingHorizontal: 8, paddingTop: 16 + crumbH, paddingBottom: 16 + 120 + insets.bottom }}>
        <View style={{ gap: 16 }}>
          {/* COL 1 — gallery */}
          <Animated.View entering={FadeIn.duration(250)}>
            <GallerySection
              key={id}
              ref={galleryRef}
              allMedia={allMedia}
              pics={pics}
              isDirectFactory={product.isDirectFactory}
              imgRef={imgRef}
            />
          </Animated.View>

          {/* COL 2 — product details */}
          <Animated.View entering={FadeInDown.duration(300).delay(60)} style={{ gap: 12 }}>
            {nameCard}
            {priceCard}
            {moqCard}
            {packCard}
            {variantSummary}
          </Animated.View>

          {/* COL 3 — order summary + shipping */}
          <Animated.View entering={FadeInDown.duration(300).delay(120)} style={{ gap: 12 }}>
            {orderSummaryCard}
            {weightShippingCard}
            {deliveryCard}
          </Animated.View>
        </View>

        <SellerCard
          product={product}
          sellerStatuses={sellerStatuses}
          vendorProducts={vendorProducts}
          taka={taka}
          discountPct={discountPct}
          currentId={id}
          onOpenStore={openStore}
          onOpenProduct={openVendorProduct}
        />

        <ProductTabs product={product} variantSpecs={variantSpecs} descHtml={descHtml} activeTab={activeTab} setActiveTab={setActiveTab} />

        {/* Size & Weight — always open, no tab to find */}
        {hasSizeWeight && (
          <View style={card(16, { marginTop: 16, overflow: 'hidden', paddingBottom: 128 })}>
            <View style={{ paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.gray100 }}>
              <Text style={[t('sm'), { fontWeight: '700', color: C.gray800 }]}>Size &amp; Weight</Text>
            </View>
            <View style={{ padding: 16 }}>
              <SizeWeightTable rows={sizeWeightRows} hasDims={hasDims} hasWeights={hasWeights} dgTypes={dgInfo.types} />
            </View>
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: PAGE_BG }}>
      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingTop: topPad }}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          product ? (
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[ORANGE]} tintColor={ORANGE} progressViewOffset={topPad + crumbH} />
          ) : undefined
        }
      >
        {body}
      </Animated.ScrollView>

      {breadcrumb}

      {/* Header (slides away on scroll) under a fixed status-bar strip */}
      <Animated.View
        pointerEvents={isHidden ? 'none' : 'box-none'}
        style={[{ position: 'absolute', top: insets.top, left: 0, right: 0, zIndex: 10 }, headerStyle]}
      >
        <Header hidden={isHidden} onLayout={(e) => setHeaderH(e.nativeEvent.layout.height)} />
      </Animated.View>
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: insets.top, backgroundColor: '#ffffff', zIndex: 11 }} />

      {ctaBar}

      {ready && (
        <>
          <ProductDrawer
            visible={drawerOpen}
            onClose={closeDrawer}
            pics={pics}
            priceRange={priceRange}
            taka={taka}
            discountPct={discountPct}
            activePriceTier={activePriceTier}
            priceFor={priceFor}
            selectedColor={selectedColor}
            allSizes={allSizes}
            hasVariants={hasVariants}
            discountedBasePrice={discountedBasePrice}
            basePrice={basePrice}
            variantProps={variantProps}
            warning={warning}
            totalQty={totalQty}
            discountedTotalPrice={discountedTotalPrice}
            totalPrice={totalPrice}
            shipLoading={shipLoading}
            shipping={shipping}
            chinaLocalNum={chinaLocalNum}
            belowMoq={belowMoq}
            moq={moq}
            moqShortfall={moqShortfall}
            cartLoading={cartLoading}
            shipChargePending={shipChargePending}
            onConfirm={handleDrawerConfirm}
          />

          <ShippingRateModal
            visible={rateModalOpen}
            productType={productType}
            shipMode={shipMode}
            setShipMode={setShipMode}
            shippingMethods={shippingMethods}
            effectiveGoodsType={effectiveGoodsType}
            onSelectGoodsType={setGoodsType}
            quoteWeightKg={quoteWeightKg}
            quoteCharge={quoteCharge}
            totalQty={totalQty}
            onClose={closeRate}
          />

          <MediaDownloadSheet
            visible={downloadModalOpen && allMedia.length > 0}
            media={allMedia}
            onClose={closeDownload}
            onDownload={handleDownloadMedia}
            downloadingIdx={downloadingMediaIdx}
          />

          {/* Expanded colour variant — above the drawer */}
          <Overlay visible={colorViewerOpen && !!selectedColor && colorsArray.length > 0} onClose={closeViewer} zIndex={70} full>
            <ColorVariantViewer
              colorsArray={colorsArray}
              selectedColor={selectedColor}
              onSelect={handleColorClick}
              onClose={closeViewer}
              allSizes={allSizes}
              sizesForColor={sizesForColor}
              skuQtys={skuQtys}
              setSkuQty={setSkuQty}
              batch={batch}
              getSizeKey={getSizeKey}
              priceFor={priceFor}
              onDownload={handleDownloadSingleImage}
              downloading={downloadingSingleImage}
            />
          </Overlay>
        </>
      )}
    </View>
  );
}
