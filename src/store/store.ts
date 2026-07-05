import { configureStore } from "@reduxjs/toolkit";
import userReducer from "./userSlice";
import toastReducer from "./slices/toastSlice";
import parkingReducer from "./parkingSlice";

export const store = configureStore({
    reducer: {
        user: userReducer,
        toast: toastReducer,
        parking: parkingReducer,
    },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
