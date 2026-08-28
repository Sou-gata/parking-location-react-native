import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import tokenStorage from "../utils/tokenStorage";
import { loginSuccess } from "../store/slices/userSlice";
import { showToast } from "../store/slices/toastSlice";
import apiService from "../utils/apiService";
import notificationService from "../utils/notificationService";

const AuthInitializer: React.FC<{ children: React.ReactNode }> = ({
    children,
}) => {
    const dispatch = useDispatch();
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

    // Initialize Push Notifications when logged in
    useEffect(() => {
        if (isLoggedIn) {
            notificationService.initialize(
                (remoteMessage: any) => {
                    const title =
                        remoteMessage.notification?.title || "New Notification";
                    const message = remoteMessage.notification?.body || "";
                    dispatch(
                        showToast({
                            title,
                            message,
                            type: "info",
                            showHeading: true,
                        })
                    );
                },
                (data: any) => {}
            );
        }
    }, [isLoggedIn, dispatch]);

    return <>{children}</>;
};

export default AuthInitializer;
