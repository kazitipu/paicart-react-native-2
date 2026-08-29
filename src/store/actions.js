import { toast } from '@/lib/toast';
import { getJSON, getString, setString, KEYS } from '@/lib/storage';
import Axios from 'axios';
import {
  setProductRequest,
  getAllBookingsOfSingleUser,
  getAllShipForMeOfSingleUser,
  uploadPaymentRequest2,
  uploadOrderPaymentRequest,
  uploadRefundApply,
  getCurrency,
  addCartItemTofirestore,
  removeItemFromCart,
  addToOrdersApi,
  getAllOrdersApi,
  updateOrdersApi,
  deleteOrderApi,
  cancelUnpaidOrderApi,
  setShipForMe,
  updateShipForMe,
  updateShipmentRequest,
  uploadShipmentPaymentRequest,
  getAllD2DRates,
  getAllBanners,
  getAllCampaigns,
  getSiteDiscount,
  getAllShipForMeList,
  uploadShipForMeList,
  updateShipForMeList,
  deleteShipForMeList,
  getSingleShipForMe,
  getAllHomeCategory,
  sendOtp,
  verifyOtp,
  getSingleOrderApi,
  getAllNotices,
  getSingleProductRequest,
  getOrderOrShipmentRequest,
} from '../lib/firebaseUtils';

export const setCurrentUser = (user) => ({ type: 'SET_CURRENT_USER', payload: user });

export const setReduxCart = (cartArray) => ({ type: 'SET_REDUX_CART', payload: cartArray });

export const setReduxWishlist = (wishlistArray) => ({
  type: 'SET_REDUX_WISHLIST_ARRAY',
  payload: wishlistArray,
});

export const setSearchedProductsArray = (totalResults, productsArray, totalFound, searchKey, page, hasMore) => ({
  type: 'SET_SEARCHED_PRODUCTS_ARRAY',
  payload: productsArray,
  totalResults,
  totalFound,
  searchKey,
  page,
  hasMore,
});

export const emptySearchedProductsArray = () => ({ type: 'EMPTY_SEARCHED_PRODUCTS_ARRAY' });

export const setSearchedProductDetail = (product, route) => ({
  type: 'SET_SEARCHED_PRODUCT_DETAIL',
  payload: product,
  route,
});

export const getAllHomeCategoryRedux = () => async (dispatch) => {
  const allCategories = await getAllHomeCategory();
  dispatch({ type: 'GET_ALL_HOME_CATEGORIES', payload: allCategories });
};

export const addToCart = (currentUser, product) => async (dispatch) => {
  const cartArray = await addCartItemTofirestore(currentUser, product);
  dispatch({ type: 'ADD_TO_CART', payload: cartArray });
};

export const setIntroModal = (introModal) => async (dispatch) => {
  dispatch({ type: 'SET_INTRO_MODAL', payload: introModal });
};

export const addToOrdersApiRedux = (currentUser, orders) => async (dispatch) => {
  const ordersArray = await addToOrdersApi(currentUser, orders);
  dispatch({ type: 'ADD_TO_ORDERS_API', payload: ordersArray });
};

export const updateSingleOrderApiRedux = (order) => async (dispatch) => {
  dispatch({ type: 'UPDATE_SINGLE_ORDER_API', payload: order });
};

export const getSingleOrderApiRedux = (bookingId) => async (dispatch) => {
  const orderObj = await getSingleOrderApi(bookingId);
  dispatch({ type: 'GET_SINGLE_ORDER_API', payload: orderObj });
};

export const getSingleProductRequestRedux = (bookingId) => async (dispatch) => {
  const orderObj = await getSingleProductRequest(bookingId);
  dispatch({ type: 'GET_SINGLE_PRODUCT_REQUEST', payload: orderObj });
};

export const getSingleShipForMeRedux = (bookingId) => async (dispatch) => {
  const shipForMeObj = await getSingleShipForMe(bookingId);
  dispatch({ type: 'GET_SINGLE_SHIP_FOR_ME', payload: shipForMeObj });
};

export const updateOrdersApiRedux = (currentUser, orders) => async (dispatch) => {
  const ordersArray = await updateOrdersApi(currentUser, orders);
  dispatch({ type: 'UPDATE_ORDERS_API', payload: ordersArray });
};

export const removeItemFromCartRedux = (currentUser, item) => async (dispatch) => {
  const cartArray = await removeItemFromCart(currentUser, item);
  dispatch({ type: 'REMOVE_FROM_CART_API', payload: cartArray });
};

export const addToPendingOrdersRedux = (pendingOrders) => async (dispatch) => {
  dispatch({ type: 'ADD_TO_PENDING_ORDERS', payload: pendingOrders });
};

/* cartSlice's ADD_TO_CART matcher reads `action.payload`. The web version
   passed `product`, so every dispatch resolved to `undefined || []` and wiped
   the cart instead of adding to it. */
export const addToCartUnsafe = (cart) => ({ type: 'ADD_TO_CART', payload: cart });

export const removeFromCart = (product) => (dispatch) => {
  toast.error('Item Removed from Cart');
  dispatch({ type: 'REMOVE_FROM_CART', product });
};

export const removeCart = () => ({ type: 'REMOVE_CART' });

export const incrementQty = (product, qty) => (dispatch) => {
  dispatch(addToCartUnsafe(product, qty));
};

export const decrementQty = (product) => (dispatch) => {
  toast.warning('Item Decrement Qty to Cart');
  dispatch({ type: 'DECREMENT_QTY', product });
};

export const addToWishlist = (product) => (dispatch) => {
  dispatch({ type: 'ADD_TO_WISHLIST', product });
};

export const removeFromWishlist = (product_id) => (dispatch) => {
  dispatch({ type: 'REMOVE_FROM_WISHLIST', product_id });
};

export const setOrderObj = (orderObj) => ({ type: 'SET_ORDER_OBJECT', payload: orderObj });

export const filterBrand = (brand) => ({ type: 'FILTER_BRAND', brand });
export const filterColor = (color) => ({ type: 'FILTER_COLOR', color });
export const filterPrice = (value) => ({ type: 'FILTER_PRICE', value });
export const filterSort = (sort_by) => ({ type: 'SORT_BY', sort_by });

export const changeCurrency = (symbol) => ({ type: 'CHANGE_CURRENCY', symbol });


export const getOrderTrackingResultRedux = (trackingNo) => async (dispatch) => {
  const resultObj = await getOrderOrShipmentRequest(trackingNo);
  dispatch({ type: 'GET_ORDER_TRACKING_RESULT', payload: resultObj });
};

export const getAllD2DRatesRedux = (freightType, country) => async (dispatch) => {
  const allD2DRatesArray = await getAllD2DRates(freightType, country);
  dispatch({ type: 'GET_ALL_D2D_RATES', payload: allD2DRatesArray });
};

export const getAllNoticesRedux = () => async (dispatch) => {
  const noticesArray = await getAllNotices();
  dispatch({ type: 'GET_ALL_NOTICES', payload: noticesArray });
};

export const setBookingRequestRedux = (bookingObj) => async (dispatch) => {
  const result = await Axios.post('https://alglimited.com/api/v1/alg-set-booking', {
    ...bookingObj,
  });
  dispatch({ type: 'SET_BOOKING_REQUEST', payload: result.data });
};

export const setProductRequestRedux = (bookingObj) => async (dispatch) => {
  const uploadedBookingObj = await setProductRequest(bookingObj);
  dispatch({ type: 'SET_PRODUCT_REQUEST', payload: uploadedBookingObj });
};

export const setShipForMeRedux = (bookingObj) => async (dispatch) => {
  const uploadedBookingObj = await setShipForMe(bookingObj);
  dispatch({ type: 'SET_SHIP_FOR_ME', payload: uploadedBookingObj });
};

export const updateShipForMeRedux = (bookingObj) => async (dispatch) => {
  const uploadedBookingObj = await updateShipForMe(bookingObj);
  dispatch({ type: 'UPDATE_SHIP_FOR_ME', payload: uploadedBookingObj });
};

export const getAllBookingsOfSingleUserRedux = (userId) => async (dispatch) => {
  const bookingsArray = await getAllBookingsOfSingleUser(userId);
  dispatch({ type: 'GET_ALL_BOOKINGS_OF_SINGLE_USER', payload: bookingsArray });
};

export const getAllShipForMeOfSingleUserRedux = (userId) => async (dispatch) => {
  const bookingsArray = await getAllShipForMeOfSingleUser(userId);
  dispatch({ type: 'GET_ALL_SHIP_FOR_ME_OF_SINGLE_USER', payload: bookingsArray });
};

export const updateShipmentRequestRedux = (requestObj) => async (dispatch) => {
  const updatedRequest = await updateShipmentRequest(requestObj);
  dispatch({ type: 'UPDATE_SHIPMENT_REQUEST', payload: updatedRequest });
};

export const updateShipForMeListRedux = (shipForMeObj) => async (dispatch) => {
  const updatedShipForMe = await updateShipForMeList(shipForMeObj);
  dispatch({ type: 'UPDATE_SHIP_FOR_ME_LIST', payload: updatedShipForMe });
};

export const deleteShipForMeListRedux = (shipForMeObj) => async (dispatch) => {
  await deleteShipForMeList(shipForMeObj);
  dispatch({ type: 'DELETE_SHIP_FOR_ME_LIST', payload: shipForMeObj });
};

export const getAllOrdersApiRedux = (userId) => async (dispatch) => {
  const ordersApiArray = await getAllOrdersApi(userId);
  dispatch({ type: 'GET_ALL_ORDERS_API_OF_SINGLE_USER', payload: ordersApiArray });
};

export const deleteOrderApiRedux = (orderId) => async (dispatch) => {
  await deleteOrderApi(orderId);
  dispatch({ type: 'REMOVE_ORDER_API', payload: orderId });
};

/* Auto-cancel (not delete) an order whose unpaid window ran out — it moves to
   the Rejected tab carrying its reason, rather than vanishing. */
export const cancelUnpaidOrderRedux = (orderId, reason) => async (dispatch) => {
  await cancelUnpaidOrderApi(orderId, reason);
  dispatch({
    type: 'UPDATE_ORDER_API',
    payload: {
      orderId,
      orderStatus: 'reject',
      cancelledReason: reason || 'unpaid-window-expired',
      cancelledAt: Date.now(),
      autoCancelled: true,
    },
  });
};



export const getAllBannersRedux = () => async (dispatch) => {
  // 1. Hydrate from cache immediately — zero waiting time on repeat visits
  try {
    const cached = getJSON(KEYS.BANNERS, null);
    if (cached) dispatch({ type: 'GET_ALL_BANNERS', payload: cached });
  } catch { /* ignore */ }

  // 2. Fetch fresh from Firestore in the background
  const fresh = await getAllBanners();
  if (!fresh) return;

  // 3. Only update cache + Redux if the data actually changed (picks up admin edits)
  try {
    const freshStr = JSON.stringify(fresh);
    if (freshStr !== getString(KEYS.BANNERS)) {
      setString(KEYS.BANNERS, freshStr);
      dispatch({ type: 'GET_ALL_BANNERS', payload: fresh });
    }
  } catch {
    dispatch({ type: 'GET_ALL_BANNERS', payload: fresh });
  }
};

export const getAllCampaignsRedux = () => async (dispatch) => {
  const campaigns = await getAllCampaigns();
  dispatch({ type: 'GET_ALL_CAMPAIGNS', payload: campaigns });
};

export const getSiteDiscountRedux = () => async (dispatch) => {
  const siteDiscount = await getSiteDiscount();
  dispatch({ type: 'GET_SITE_DISCOUNT', payload: siteDiscount });
};

export const getAllShipForMeListRedux = (userId) => async (dispatch) => {
  const shipForMesArray = await getAllShipForMeList(userId);
  dispatch({ type: 'GET_ALL_SHIP_FOR_ME_LIST', payload: shipForMesArray });
};

export const getCurrencyRedux = () => async (dispatch) => {
  const currency = await getCurrency();
  dispatch({ type: 'GET_CURRENCY_REDUX', payload: currency });
};

export const uploadPaymentRequestRedux2 = (paymentObject) => async (dispatch) => {
  const paymentObj = await uploadPaymentRequest2(paymentObject);
  dispatch({ type: 'UPDATE_BOOKINGS_OF_SINGLE_USER', payload: paymentObj });
};

export const uploadOrderPaymentRequestRedux = (paymentObject) => async (dispatch) => {
  const paymentObj = await uploadOrderPaymentRequest(paymentObject);
  dispatch({ type: 'UPDATE_SINGLE_ORDER_API', payload: paymentObj.pendingOrders[0] });
};

export const uploadRefundApplyRedux = (refundObject) => async (dispatch) => {
  const refund = await uploadRefundApply(refundObject);
  /* Both reducers index into the payload, so a missing record would throw
     inside the store rather than at the call site. */
  if (!refund) return;
  dispatch({
    type: refundObject.productRequest ? 'UPLOAD_REFUND_APPLY_PRODUCT_REQUEST' : 'UPLOAD_REFUND_APPLY',
    payload: refund,
  });
};

export const uploadShipForMeListRedux = (shipForMeObj) => async (dispatch) => {
  const shipObj = await uploadShipForMeList(shipForMeObj);
  dispatch({ type: 'UPLOAD_SHIP_FOR_ME_LIST', payload: shipObj });
};

export const uploadShipmentPaymentRequestRedux = (paymentObject) => async (dispatch) => {
  const paymentObj = await uploadShipmentPaymentRequest(paymentObject);
  dispatch({
    type: 'UPDATE_SHIPMENT_PAYMENT_REQUEST',
    payload: paymentObj.productRequestArray[0],
  });
};

export const sendOtpRedux = (number) => async (dispatch) => {
  dispatch({ type: 'SET_NUMBER', payload: number });
};

/* Resolves true only when the code was right. verifyOtp now returns null on
   both failure paths (expired / wrong), so a bad code no longer overwrites the
   current user and the caller can branch on the result. */
export const verifyOtpRedux = (number, otp) => async (dispatch) => {
  const userObj = await verifyOtp(number, otp);
  if (!userObj) return false;
  dispatch({ type: 'SET_CURRENT_USER', payload: userObj });
  return true;
};
