import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  notices: [],
  introModal: null,
  blogs: [],
};

const noticesSlice = createSlice({
  name: 'notices',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addMatcher(
        (action) => action.type === 'GET_ALL_NOTICES',
        (state, action) => { state.notices = [...action.payload]; }
      )
      .addMatcher(
        (action) => action.type === 'GET_ALL_BLOGS',
        (state, action) => { state.blogs = [...action.payload]; }
      )
      .addMatcher(
        (action) => action.type === 'SET_INTRO_MODAL',
        (state, action) => { state.introModal = action.payload; }
      );
  },
});

export default noticesSlice.reducer;
