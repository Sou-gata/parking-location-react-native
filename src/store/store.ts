import { configureStore } from "@reduxjs/toolkit";
import userReducer from "./slices/userSlice";
import toastReducer from "./slices/toastSlice";
import parkingReducer from "./slices/parkingSlice";
import notificationReducer from "./slices/notificationSlice";

export const store = configureStore({
    reducer: {
        user: userReducer,
        toast: toastReducer,
        parking: parkingReducer,
        notification: notificationReducer,
    },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
