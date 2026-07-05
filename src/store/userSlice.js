import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  user: null,
  token: null,
  isLoggedIn: false,
  loading: false,
};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    loginStart: state => {
      state.loading = true;
    },

    loginSuccess: (state, action) => {
      state.user = action.payload.user || action.payload;
      state.token = action.payload.token || state.token;
      state.isLoggedIn = true;
      state.loading = false;
    },

    loginFailure: state => {
      state.loading = false;
    },

    logout: state => {
      state.user = null;
      state.token = null;
      state.isLoggedIn = false;
    },

    updateUser: (state, action) => {
      state.user = {
        ...state.user,
        ...action.payload,
      };
    },
  },
});

export const { loginStart, loginSuccess, loginFailure, logout, updateUser } =
  userSlice.actions;

export default userSlice.reducer;
