import React, { useEffect } from "react";
import { useDispatch } from "react-redux";
import tokenStorage from "../utils/tokenStorage";
import { loginSuccess } from "../store/slices/userSlice";
import apiService from "../utils/apiService";

const AuthInitializer: React.FC<{ children: React.ReactNode }> = ({
    children,
}) => {
    const dispatch = useDispatch();

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

    return <>{children}</>;
};

export default AuthInitializer;
