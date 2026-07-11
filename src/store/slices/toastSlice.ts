import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export type ToastType = "success" | "info" | "warning" | "danger";

interface ToastState {
    visible: boolean;
    message: string;
    title: string;
    type: ToastType;
    showHeading: boolean;
}

const initialState: ToastState = {
    visible: false,
    message: "",
    title: "",
    type: "info",
    showHeading: true,
};

interface ShowToastPayload {
    message: string;
    title?: string;
    type?: ToastType;
    showHeading?: boolean;
}

const toastSlice = createSlice({
    name: "toast",
    initialState,
    reducers: {
        showToast: (state, action: PayloadAction<ShowToastPayload>) => {
            const { message, title, type, showHeading } = action.payload;
            state.visible = true;
            state.message = message || "";
            state.title = title || "";
            state.type = type || "info";
            state.showHeading = showHeading !== undefined ? showHeading : true;
        },
        hideToast: (state) => {
            state.visible = false;
        },
    },
});

export const { showToast, hideToast } = toastSlice.actions;
export default toastSlice.reducer;
