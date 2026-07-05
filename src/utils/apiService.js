import axios from "axios";
import baseURL from "./baseURL.js";
import { store } from "../store/store";

const apiClient = axios.create({
    baseURL: baseURL,
    withCredentials: true,
    timeout: 60000,
});

apiClient.interceptors.request.use(
    (config) => {
        // Fetch token from Redux store
        const state = store.getState();
        const token = state.user.token;
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        // CRITICAL: Force clear Content-Type for FormData
        if (config.data && typeof config.data.append === "function") {
            delete config.headers["Content-Type"];
            // Also ensure no default is lurking in the common headers
            if (config.headers.common) delete config.headers.common["Content-Type"];
        }

        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

apiClient.interceptors.response.use(
    (response) => {
        return response;
    },
    (error) => {
        if (error.response) {
            const { status, data } = error.response;

            if (data?.seassonExpired) {
                // navigateToLogin();
                // toaster("error", "Session expired. Please log in again.");
            }

            switch (status) {
                case 401:
                    console.error("Unauthorized access");
                    break;
                case 403:
                    console.error("Access forbidden");
                    break;
                case 500:
                    console.error("Server error");
                    break;
                default:
                    console.error("Request failed:", data, status);
            }
        } else if (error.request) {
            console.error("Network error:", error.request);
        } else {
            console.log("Error:", error.message);
        }
        return Promise.reject(error);
    }
);

class ApiService {
    async get(endpoint, config = {}) {
        try {
            const response = await apiClient.get(endpoint, config);
            return response.data;
        } catch (error) {
            throw error;
        }
    }

    async post(endpoint, data = {}, config = {}) {
        try {
            const response = await apiClient.post(endpoint, data, config);
            return response.data;
        } catch (error) {
            throw error;
        }
    }

    async put(endpoint, data = {}, config = {}) {
        try {
            const response = await apiClient.put(endpoint, data, config);
            return response.data;
        } catch (error) {
            throw error;
        }
    }

    async delete(endpoint, config = {}) {
        try {
            const response = await apiClient.delete(endpoint, config);
            return response.data;
        } catch (error) {
            throw error;
        }
    }

    async patch(endpoint, data = {}, config = {}) {
        try {
            const response = await apiClient.patch(endpoint, data, config);
            return response.data;
        } catch (error) {
            throw error;
        }
    }
}
const apiService = new ApiService();

export default apiService;

export { ApiService };
