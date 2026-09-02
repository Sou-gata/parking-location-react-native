import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import tokenStorage from "../utils/tokenStorage";
import { loginSuccess } from "../store/slices/userSlice";
import { showToast } from "../store/slices/toastSlice";
import apiService from "../utils/apiService";
import notificationService from "../utils/notificationService";

import {
    fetchNotifications,
    fetchUnreadCount,
    addNotification,
} from "../store/slices/notificationSlice";

const AuthInitializer: React.FC<{ children: React.ReactNode }> = ({
    children,
}) => {
    const dispatch = useDispatch<any>();
    const isLoggedIn = useSelector((state: any) => state.user.isLoggedIn);

    useEffect(() => {
        const initAuth = async () => {
            try {
                const token = await tokenStorage.getToken();
                if (token) {
                    const profileRes = await apiService.get("users/profile", {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    });
                    if (profileRes && profileRes.success) {
                        dispatch(
                            loginSuccess({ user: profileRes.data, token })
                        );
                    } else {
                        await tokenStorage.removeToken();
                    }
                }
            } catch (error: any) {
                console.error("Auth initialization failed:", error);
                if (
                    error.response &&
                    [401, 403, 404].includes(error.response.status)
                ) {
                    await tokenStorage.removeToken();
                }
            }
        };

        initAuth();
    }, [dispatch]);

    // Initialize Notifications and fetch past history when logged in
    useEffect(() => {
        if (isLoggedIn) {
            // 1. Fetch initial notifications and unread badge count from backend
            dispatch(fetchNotifications({ page: 1, limit: 20 }));
            dispatch(fetchUnreadCount());

            // 2. Initialize Push Notifications & Realtime Listeners
            notificationService.initialize(
                (remoteMessage: any) => {
                    const title =
                        remoteMessage.notification?.title ||
                        remoteMessage.data?.title ||
                        "New Notification";
                    const message =
                        remoteMessage.notification?.body ||
                        remoteMessage.data?.message ||
                        "";
                    const type = remoteMessage.data?.type || "general";
                    const notifId =
                        remoteMessage.data?.notification_id ||
                        remoteMessage.messageId ||
                        `notif_${Date.now()}`;

                    // Add to Redux store in real-time if not promo
                    if (type !== "promo") {
                        dispatch(
                            addNotification({
                                id: notifId,
                                type,
                                title,
                                message,
                                data: remoteMessage.data,
                                isRead: false,
                                createdAt: new Date().toISOString(),
                            })
                        );
                    }

                    // Show in-app Toast alert
                    dispatch(
                        showToast({
                            title,
                            message,
                            type: "info",
                            showHeading: true,
                        })
                    );
                },
                (data: any) => {
                    console.log("[AuthInitializer] Notification clicked:", data);
                }
            );
        }
    }, [isLoggedIn, dispatch]);

    return <>{children}</>;
};

export default AuthInitializer;
