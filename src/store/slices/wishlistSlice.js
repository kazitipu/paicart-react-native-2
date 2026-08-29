import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  wishlist: [],
};

const wishlistSlice = createSlice({
  name: 'wishlist',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addMatcher(
        (action) => action.type === 'SET_REDUX_WISHLIST_ARRAY',
        (state, action) => { state.wishlist = action.payload || []; }
      )
      .addMatcher(
        (action) => action.type === 'ADD_TO_WISHLIST',
        (state, action) => {
          if (!state.wishlist.find((item) => item.id === action.product?.id)) {
            state.wishlist.push(action.product);
          }
        }
      )
      .addMatcher(
        (action) => action.type === 'REMOVE_FROM_WISHLIST',
        (state, action) => {
          state.wishlist = state.wishlist.filter((item) => item.id !== action.product_id);
        }
      );
  },
});

export default wishlistSlice.reducer;
