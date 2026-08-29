import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  brand: [],
  value: { min: 0, max: 10000 },
  sortBy: '',
  category: '',
};

const filtersSlice = createSlice({
  name: 'filters',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addMatcher(
        (action) => action.type === 'FILTER_BRAND',
        (state, action) => { state.brand = action.brand; }
      )
      .addMatcher(
        (action) => action.type === 'FILTER_COLOR',
        (state, action) => { state.color = action.color; }
      )
      .addMatcher(
        (action) => action.type === 'FILTER_PRICE',
        (state, action) => { state.value = action.value; }
      )
      .addMatcher(
        (action) => action.type === 'SORT_BY',
        (state, action) => { state.sortBy = action.sort_by; }
      );
  },
});

export default filtersSlice.reducer;
