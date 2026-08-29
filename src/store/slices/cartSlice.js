import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  cart: [],
  pendingOrders: [],
};

const cartSlice = createSlice({
  name: 'cartList',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addMatcher(
        (action) => action.type === 'SET_REDUX_CART',
        (state, action) => { state.cart = action.payload || []; }
      )
      .addMatcher(
        (action) => action.type === 'ADD_TO_CART',
        (state, action) => { state.cart = action.payload || []; }
      )
      .addMatcher(
        (action) => action.type === 'REMOVE_FROM_CART_API',
        (state, action) => { state.cart = action.payload || []; }
      )
      .addMatcher(
        (action) => action.type === 'ADD_TO_PENDING_ORDERS',
        (state, action) => { state.pendingOrders = action.payload; }
      )
      .addMatcher(
        (action) => action.type === 'REMOVE_CART',
        (state) => { state.cart = []; }
      );
  },
});

export default cartSlice.reducer;
