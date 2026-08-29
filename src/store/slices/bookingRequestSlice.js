import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  bookingRequests: [],
  bookingsArrayOfSingleUser: [],
  shipForMeOfSingleUser: [],
  shipForMeObj: null,
  bookingObj: null,
  d2dRates: [],
  productRequests: [],
  productRequestObj: null,
};

const bookingRequestSlice = createSlice({
  name: 'bookingRequests',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addMatcher(
        (action) => action.type === 'SET_BOOKING_REQUEST',
        (state, action) => { state.bookingRequests = [...state.bookingRequests, action.payload]; }
      )
      .addMatcher(
        (action) => action.type === 'SET_PRODUCT_REQUEST',
        (state, action) => { state.productRequests = [...state.productRequests, action.payload]; }
      )
      .addMatcher(
        (action) => action.type === 'UPLOAD_REFUND_APPLY_PRODUCT_REQUEST',
        (state, action) => {
          state.bookingsArrayOfSingleUser = state.bookingsArrayOfSingleUser.map((order) =>
            order.bookingId == action.payload.bookingId ? action.payload : order
          );
        }
      )
      .addMatcher(
        (action) => action.type === 'GET_ALL_BOOKINGS_OF_SINGLE_USER',
        (state, action) => { state.bookingsArrayOfSingleUser = action.payload; }
      )
      .addMatcher(
        (action) => action.type === 'GET_ALL_SHIP_FOR_ME_OF_SINGLE_USER',
        (state, action) => { state.shipForMeOfSingleUser = action.payload; }
      )
      .addMatcher(
        (action) => action.type === 'GET_SINGLE_SHIP_FOR_ME',
        (state, action) => { state.shipForMeObj = action.payload; }
      )
      .addMatcher(
        (action) => action.type === 'GET_SINGLE_PRODUCT_REQUEST',
        (state, action) => { state.productRequestObj = action.payload; }
      )
      .addMatcher(
        (action) => action.type === 'SET_SHIP_FOR_ME',
        (state, action) => {
          state.shipForMeOfSingleUser = [action.payload, ...state.shipForMeOfSingleUser];
        }
      )
      .addMatcher(
        (action) => action.type === 'UPDATE_SHIP_FOR_ME',
        (state, action) => {
          state.shipForMeOfSingleUser = state.shipForMeOfSingleUser.map((booking) =>
            booking.bookingId === action.payload.bookingId ? action.payload : booking
          );
        }
      )
      .addMatcher(
        (action) => action.type === 'UPDATE_SHIPMENT_REQUEST',
        (state, action) => {
          state.shipForMeOfSingleUser = state.shipForMeOfSingleUser.map((booking) =>
            booking.bookingId == action.payload.bookingId ? { ...action.payload } : booking
          );
        }
      )
      .addMatcher(
        (action) => action.type === 'UPDATE_SHIPMENT_PAYMENT_REQUEST',
        (state, action) => {
          state.shipForMeOfSingleUser = state.shipForMeOfSingleUser.map((booking) =>
            booking.bookingId == action.payload.bookingId
              ? { ...action.payload, paymentRequested: true }
              : booking
          );
        }
      )
      .addMatcher(
        (action) => action.type === 'UPDATE_BOOKINGS_OF_SINGLE_USER',
        (state, action) => {
          state.bookingsArrayOfSingleUser = state.bookingsArrayOfSingleUser.map((booking) => {
            const newBooking = action.payload.productRequestArray.find(
              (b) => b.bookingId == booking.bookingId
            );
            return newBooking ? { ...newBooking, paymentStatus: 'pending' } : booking;
          });
        }
      )
      .addMatcher(
        (action) => action.type === 'GET_SINGLE_BOOKING',
        (state, action) => { state.bookingObj = action.payload; }
      )
      .addMatcher(
        (action) => action.type === 'GET_ALL_D2D_RATES',
        (state, action) => { state.d2dRates = [...action.payload]; }
      );
  },
});

export default bookingRequestSlice.reducer;
