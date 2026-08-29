import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  orders: [],
  ordersApi: [],
  orderTrackingResult: null,
  banners: [],
  campaigns: [],
  siteDiscount: null,
  orderObj: null,
};

const ordersSlice = createSlice({
  name: 'orders',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addMatcher(
        (action) => action.type === 'SET_ORDER_OBJECT',
        (state, action) => { state.orders = [...state.orders, action.payload]; }
      )
      .addMatcher(
        (action) => action.type === 'UPDATE_ORDERS_API',
        (state, action) => { state.ordersApi = action.payload; }
      )
      .addMatcher(
        (action) => action.type === 'UPDATE_SINGLE_ORDER_API',
        (state, action) => {
          state.ordersApi = state.ordersApi.map((order) =>
            order.orderId == action.payload.orderId
              ? { ...action.payload, paymentStatus: 'pending' }
              : order
          );
        }
      )
      .addMatcher(
        (action) => action.type === 'UPLOAD_REFUND_APPLY',
        (state, action) => {
          state.ordersApi = state.ordersApi.map((order) =>
            order.orderId == action.payload.orderId ? action.payload : order
          );
        }
      )
      .addMatcher(
        (action) => action.type === 'GET_SINGLE_ORDER_API',
        (state, action) => { state.orderObj = action.payload; }
      )
      .addMatcher(
        (action) => action.type === 'ADD_TO_ORDERS_API',
        (state, action) => {
          if (!action.payload) return;
          const incoming = Array.isArray(action.payload) ? action.payload : [action.payload];
          const existingIds = new Set(state.ordersApi.map((o) => o.orderId));
          const merged = [
            ...incoming.filter((o) => !existingIds.has(o.orderId)),
            ...state.ordersApi,
          ];
          state.ordersApi = merged.sort((a, b) => b.time - a.time);
        }
      )
      .addMatcher(
        (action) => action.type === 'GET_ALL_ORDERS_API_OF_SINGLE_USER',
        (state, action) => { state.ordersApi = action.payload; }
      )
      .addMatcher(
        (action) => action.type === 'REMOVE_ORDER_API',
        (state, action) => {
          state.ordersApi = state.ordersApi.filter((order) => order.orderId !== action.payload);
        }
      )
      .addMatcher(
        (action) => action.type === 'UPDATE_ORDER_API',
        (state, action) => {
          state.ordersApi = state.ordersApi.map((order) =>
            order.orderId === action.payload.orderId
              ? { ...order, ...action.payload }
              : order
          );
        }
      )
      .addMatcher(
        (action) => action.type === 'GET_ORDER_TRACKING_RESULT',
        (state, action) => { state.orderTrackingResult = action.payload; }
      )
      .addMatcher(
        (action) => action.type === 'GET_ALL_BANNERS',
        (state, action) => { state.banners = action.payload; }
      )
      .addMatcher(
        (action) => action.type === 'GET_ALL_CAMPAIGNS',
        (state, action) => { state.campaigns = action.payload; }
      )
      .addMatcher(
        (action) => action.type === 'GET_SITE_DISCOUNT',
        (state, action) => { state.siteDiscount = action.payload; }
      );
  },
});

export default ordersSlice.reducer;
