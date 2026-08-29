import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  shipForMeList: [],
};

const shipForMeListSlice = createSlice({
  name: 'shipForMeList',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addMatcher(
        (action) => action.type === 'GET_ALL_SHIP_FOR_ME_LIST',
        (state, action) => { state.shipForMeList = [...action.payload]; }
      )
      .addMatcher(
        (action) => action.type === 'UPLOAD_SHIP_FOR_ME_LIST',
        (state, action) => {
          state.shipForMeList = [action.payload, ...state.shipForMeList];
        }
      )
      .addMatcher(
        (action) => action.type === 'UPDATE_SHIP_FOR_ME_LIST',
        (state, action) => {
          const filtered = state.shipForMeList.filter(
            (item) => item.bookingId !== action.payload.bookingId
          );
          state.shipForMeList = [action.payload, ...filtered];
        }
      )
      .addMatcher(
        (action) => action.type === 'DELETE_SHIP_FOR_ME_LIST',
        (state, action) => {
          state.shipForMeList = state.shipForMeList.filter(
            (item) => item.bookingId !== action.payload.bookingId
          );
        }
      );
  },
});

export default shipForMeListSlice.reducer;
