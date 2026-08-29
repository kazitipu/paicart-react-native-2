import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  symbol: 'Tk',
  value: 1,
};

const currencySlice = createSlice({
  name: 'currency',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addMatcher(
      (action) => action.type === 'CHANGE_CURRENCY',
      (state, action) => { state.symbol = action.symbol; }
    );
  },
});

export default currencySlice.reducer;
