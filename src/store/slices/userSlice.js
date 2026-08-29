import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  currentUser: { displayName: '', email: '' },
  currency: null,
  homeCategories: [],
  otpNumber: '',
  introModal: null,
};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addMatcher(
        (action) => action.type === 'SET_CURRENT_USER',
        (state, action) => { state.currentUser = action.payload; }
      )
      .addMatcher(
        (action) => action.type === 'SET_INTRO_MODAL',
        (state, action) => { state.introModal = action.payload; }
      )
      .addMatcher(
        (action) => action.type === 'GET_CURRENCY_REDUX',
        (state, action) => { state.currency = action.payload; }
      )
      .addMatcher(
        (action) => action.type === 'GET_ALL_HOME_CATEGORIES',
        (state, action) => { state.homeCategories = [...action.payload]; }
      )
      .addMatcher(
        (action) => action.type === 'SET_NUMBER',
        (state, action) => { state.otpNumber = action.payload; }
      );
  },
});

export default userSlice.reducer;
