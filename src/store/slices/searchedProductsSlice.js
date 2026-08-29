import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  products: [],
  symbol: 'Tk',
  product_details: [],
  totalResults: 0,
  totalFound: 0,
  searchKey: '',
  page: 1,
  hasMore: true,
};

const searchedProductsSlice = createSlice({
  name: 'searchedProducts',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addMatcher(
        (action) => action.type === 'SET_SEARCHED_PRODUCTS_ARRAY',
        (state, action) => {
          const seen = new Map(state.products.map(p => [p.id, p]));
          action.payload.forEach(p => seen.set(p.id, p));
          state.products = Array.from(seen.values());
          state.totalResults = action.totalResults;
          state.totalFound = action.totalFound;
          if (action.searchKey !== undefined) state.searchKey = action.searchKey;
          if (action.page     !== undefined) state.page      = action.page;
          if (action.hasMore  !== undefined) state.hasMore   = action.hasMore;
        }
      )
      .addMatcher(
        (action) => action.type === 'EMPTY_SEARCHED_PRODUCTS_ARRAY',
        (state) => {
          state.products = [];
          state.totalResults = 0;
          state.totalFound = 0;
          state.searchKey = '';
          state.page = 1;
          state.hasMore = true;
        }
      );
  },
});

export default searchedProductsSlice.reducer;
