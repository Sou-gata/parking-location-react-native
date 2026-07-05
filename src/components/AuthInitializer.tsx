import React, { useEffect } from "react";
import { useDispatch } from "react-redux";
import tokenStorage from "../utils/tokenStorage";
import { loginSuccess } from "../store/userSlice";

const AuthInitializer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const dispatch = useDispatch();

    useEffect(() => {
        const initAuth = async () => {
            try {
                const token = await tokenStorage.getToken();
                if (token) {
                    dispatch(loginSuccess({ token }));
                }
            } catch (error) {
                console.error("Auth initialization failed:", error);
            }
        };

        initAuth();
    }, [dispatch]);

    return <>{children}</>;
};

export default AuthInitializer;
