import { createSlice, PayloadAction, createAsyncThunk } from "@reduxjs/toolkit";
import apiService from "../../utils/apiService";

export interface AppNotification {
    id: number | string;
    type: string; // 'general', 'booking', 'wallet', 'alert', 'complaint', 'custom', etc.
    title: string;
    message: string;
    data?: any;
    isRead: boolean;
    createdAt: string | Date;
}

export interface NotificationState {
    notifications: AppNotification[];
    unreadCount: number;
    loading: boolean;
    loadingMore: boolean;
    refreshing: boolean;
    pagination: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}

const initialState: NotificationState = {
    notifications: [],
    unreadCount: 0,
    loading: false,
    loadingMore: false,
    refreshing: false,
    pagination: {
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 1,
    },
};

// Async Thunks
export const fetchNotifications = createAsyncThunk(
    "notification/fetchNotifications",
    async (params: { page?: number; limit?: number; isRefresh?: boolean } = {}, { rejectWithValue }) => {
        try {
            const page = params.page || 1;
            const limit = params.limit || 20;
            const res = await apiService.get(`notifications?page=${page}&limit=${limit}`);
            if (res && res.success) {
                return {
                    notifications: res.data?.notifications || (Array.isArray(res.data) ? res.data : []),
                    pagination: res.data?.pagination || { total: 0, page, limit, totalPages: 1 },
                    unreadCount: res.data?.unreadCount !== undefined ? res.data.unreadCount : 0,
                    page,
                    isRefresh: params.isRefresh || false,
                };
            }
            return rejectWithValue(res?.message || "Failed to fetch notifications");
        } catch (error: any) {
            return rejectWithValue(error.message || "Failed to fetch notifications");
        }
    }
);

export const fetchUnreadCount = createAsyncThunk(
    "notification/fetchUnreadCount",
    async (_, { rejectWithValue }) => {
        try {
            const res = await apiService.get("notifications/unread-count");
            if (res && res.success) {
                return res.data?.count || 0;
            }
            return 0;
        } catch (error: any) {
            return rejectWithValue(error.message || "Failed to fetch unread count");
        }
    }
);

export const markAllAsRead = createAsyncThunk(
    "notification/markAllAsRead",
    async (_, { rejectWithValue }) => {
        try {
            const res = await apiService.post("notifications/mark-read");
            if (res && res.success) {
                return true;
            }
            return rejectWithValue(res?.message || "Failed to mark all as read");
        } catch (error: any) {
            return rejectWithValue(error.message || "Failed to mark all as read");
        }
    }
);

export const markNotificationAsRead = createAsyncThunk(
    "notification/markNotificationAsRead",
    async (notificationId: number | string, { rejectWithValue }) => {
        try {
            const res = await apiService.post(`notifications/mark-read/${notificationId}`);
            if (res && res.success) {
                return notificationId;
            }
            return rejectWithValue(res?.message || "Failed to mark notification as read");
        } catch (error: any) {
            return rejectWithValue(error.message || "Failed to mark notification as read");
        }
    }
);

export const clearNotifications = createAsyncThunk(
    "notification/clearNotifications",
    async (_, { rejectWithValue }) => {
        try {
            const res = await apiService.delete("notifications/clear");
            if (res && res.success) {
                return true;
            }
            return rejectWithValue(res?.message || "Failed to clear notifications");
        } catch (error: any) {
            return rejectWithValue(error.message || "Failed to clear notifications");
        }
    }
);

const notificationSlice = createSlice({
    name: "notification",
    initialState,
    reducers: {
        addNotification: (state, action: PayloadAction<AppNotification>) => {
            const newNotif = action.payload;
            // Promo notifications shouldn't be added to the in-app list
            if (newNotif.type === "promo") return;

            // Check if already in list
            const exists = state.notifications.some((n) => String(n.id) === String(newNotif.id));
            if (!exists) {
                state.notifications.unshift(newNotif);
                if (!newNotif.isRead) {
                    state.unreadCount += 1;
                }
            }
        },
        setUnreadCount: (state, action: PayloadAction<number>) => {
            state.unreadCount = action.payload;
        },
        resetNotificationState: (state) => {
            state.notifications = [];
            state.unreadCount = 0;
            state.loading = false;
            state.loadingMore = false;
            state.refreshing = false;
            state.pagination = {
                total: 0,
                page: 1,
                limit: 20,
                totalPages: 1,
            };
        },
    },
    extraReducers: (builder) => {
        // Fetch notifications
        builder.addCase(fetchNotifications.pending, (state, action) => {
            const isPageGreaterThanOne = (action.meta.arg?.page || 1) > 1;
            if (isPageGreaterThanOne) {
                state.loadingMore = true;
            } else if (action.meta.arg?.isRefresh) {
                state.refreshing = true;
            } else {
                state.loading = true;
            }
        });
        builder.addCase(fetchNotifications.fulfilled, (state, action) => {
            state.loading = false;
            state.loadingMore = false;
            state.refreshing = false;

            const isPageGreaterThanOne = action.payload.page > 1;
            if (isPageGreaterThanOne) {
                // Append new notifications avoiding duplicates
                const existingIds = new Set(state.notifications.map((n) => String(n.id)));
                const newItems = action.payload.notifications.filter(
                    (n: AppNotification) => !existingIds.has(String(n.id))
                );
                state.notifications = [...state.notifications, ...newItems];
            } else {
                state.notifications = action.payload.notifications;
            }

            state.pagination = action.payload.pagination;
            if (action.payload.unreadCount !== undefined) {
                state.unreadCount = action.payload.unreadCount;
            }
        });
        builder.addCase(fetchNotifications.rejected, (state) => {
            state.loading = false;
            state.loadingMore = false;
            state.refreshing = false;
        });

        // Fetch unread count
        builder.addCase(fetchUnreadCount.fulfilled, (state, action) => {
            state.unreadCount = action.payload;
        });

        // Mark all as read
        builder.addCase(markAllAsRead.fulfilled, (state) => {
            state.notifications = state.notifications.map((n) => ({
                ...n,
                isRead: true,
            }));
            state.unreadCount = 0;
        });

        // Mark one as read
        builder.addCase(markNotificationAsRead.fulfilled, (state, action) => {
            const id = action.payload;
            const target = state.notifications.find((n) => String(n.id) === String(id));
            if (target && !target.isRead) {
                target.isRead = true;
                state.unreadCount = Math.max(0, state.unreadCount - 1);
            }
        });

        // Clear all notifications
        builder.addCase(clearNotifications.fulfilled, (state) => {
            state.notifications = [];
            state.unreadCount = 0;
        });
    },
});

export const { addNotification, setUnreadCount, resetNotificationState } =
    notificationSlice.actions;

export default notificationSlice.reducer;
