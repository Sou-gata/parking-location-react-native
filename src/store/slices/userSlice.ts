import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import tokenStorage from "../../utils/tokenStorage";

export interface User {
    id: string;
    name: string;
    username: string;
    email: string;
    phone_number: string;
    role: string;
    status: string;
    password?: string;
    agencyId?: string;
    address?: string;
    landmark?: string;
    latitude?: number | string;
    longitude?: number | string;
    profile_photo?: string;
}

export interface WalletTransaction {
    id: string;
    type: "credit" | "debit";
    amount: number;
    description: string;
    date: string;
}

export interface UserState {
    user: User | null;
    token: string | null;
    isLoggedIn: boolean;
    loading: boolean;
    walletBalance: number;
    walletTransactions: WalletTransaction[];
}

const initialState: UserState = {
    user: null,
    token: null,
    isLoggedIn: false,
    loading: false,
    walletBalance: 500.0,
    walletTransactions: [],
};

const userSlice = createSlice({
    name: "user",
    initialState,
    reducers: {
        loginStart: (state) => {
            state.loading = true;
        },

        loginSuccess: (
            state,
            action: PayloadAction<User | { user: User; token?: string | null }>
        ) => {
            const payload = action.payload;
            if (payload && "user" in payload) {
                state.user = payload.user;
                state.token = payload.token || state.token;
            } else {
                state.user = payload;
            }
            state.isLoggedIn = true;
            state.loading = false;
        },

        loginFailure: (state) => {
            state.loading = false;
        },

        logout: (state) => {
            state.user = null;
            state.token = null;
            state.isLoggedIn = false;
        },

        updateUser: (state, action: PayloadAction<Partial<User>>) => {
            if (state.user) {
                state.user = {
                    ...state.user,
                    ...action.payload,
                };
            } else {
                state.user = action.payload as User;
            }
        },

        addMoney: (state, action: PayloadAction<number | string>) => {
            const amount = Number(action.payload);
            state.walletBalance = Number(
                (state.walletBalance + amount).toFixed(2)
            );
            state.walletTransactions.unshift({
                id: `tx_${Date.now()}`,
                type: "credit",
                amount,
                description: "Added to Wallet",
                date: new Date().toISOString(),
            });
        },

        deductMoney: (
            state,
            action: PayloadAction<{
                amount: number | string;
                description?: string;
            }>
        ) => {
            const { amount, description } = action.payload;
            const numericAmount = Number(amount);
            state.walletBalance = Number(
                Math.max(0, state.walletBalance - numericAmount).toFixed(2)
            );
            state.walletTransactions.unshift({
                id: `tx_${Date.now()}`,
                type: "debit",
                amount: numericAmount,
                description: description || "Wallet Deduction",
                date: new Date().toISOString(),
            });
        },

        setWalletData: (
            state,
            action: PayloadAction<{
                walletBalance: number | string;
                walletTransactions: WalletTransaction[];
            }>
        ) => {
            state.walletBalance = Number(action.payload.walletBalance);
            state.walletTransactions = action.payload.walletTransactions;
        },
    },
});

export const {
    loginStart,
    loginSuccess,
    loginFailure,
    logout,
    updateUser,
    addMoney,
    deductMoney,
    setWalletData,
} = userSlice.actions;

export const logoutAndClearToken = () => async (dispatch: any) => {
    try {
        await tokenStorage.removeToken();
    } catch (error) {
        console.error("Failed to remove token during logout:", error);
    }
    dispatch(logout());
};

export default userSlice.reducer;
