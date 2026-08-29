import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  products: [],
  symbol: 'Tk',
  product_details: [],
};

const productSlice = createSlice({
  name: 'data',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addMatcher(
        (action) => action.type === 'RECEIVE_PRODUCTS',
        (state, action) => { state.products = action.products; }
      )
      .addMatcher(
        (action) => action.type === 'FETCH_ALL_PRODUCTS_FROM_FIRESTORE',
        (state, action) => {
          state.products = action.payload.map((product) => {
            if (product.price_range && product.price_range.length > 0) {
              return { ...product, price_range: JSON.parse(product.price_range) };
            }
            return product;
          });
        }
      )
      .addMatcher(
        (action) => action.type === 'FETCH_SINGLE_PRODUCT',
        (state, action) => {
          const product = {
            ...action.payload,
            price_range:
              action.payload.price_range && action.payload.price_range.length > 0
                ? JSON.parse(action.payload.price_range)
                : [],
          };
          state.products = [...state.products, product];
        }
      )
      .addMatcher(
        (action) => action.type === 'CHANGE_CURRENCY',
        (state, action) => { state.symbol = action.symbol; }
      );
  },
});

export default productSlice.reducer;
