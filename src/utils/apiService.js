import axios from "axios";
import baseURL from "./baseURL.js";
import { store } from "../store/store";

const apiClient = axios.create({
    baseURL: baseURL,
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

        // CRITICAL: Force clear Content-Type for FormData so React Native auto-generates boundary
        if (config.data && typeof config.data.append === "function") {
            delete config.headers["Content-Type"];
            delete config.headers["content-type"];
            if (config.headers && typeof config.headers.delete === "function") {
                config.headers.delete("Content-Type");
                config.headers.delete("content-type");
            }
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

            // Attach backend error message directly to error.message
            if (data && data.message) {
                error.message = data.message;
            }

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
            if (data && typeof data.append === "function") {
                return new Promise((resolve, reject) => {
                    const xhr = new XMLHttpRequest();
                    const url = endpoint.startsWith("http")
                        ? endpoint
                        : `${baseURL}${endpoint}`;

                    xhr.open("POST", url);

                    const state = store.getState();
                    const token = state.user?.token;
                    if (token) {
                        xhr.setRequestHeader("Authorization", `Bearer ${token}`);
                    }

                    // DO NOT set Content-Type header on xhr!
                    // React Native XHR automatically generates multipart/form-data; boundary=...

                    xhr.onload = () => {
                        try {
                            const resData = JSON.parse(xhr.responseText);
                            if (xhr.status >= 200 && xhr.status < 300) {
                                resolve(resData);
                            } else {
                                const err = new Error(
                                    resData.message ||
                                        `Request failed with status ${xhr.status}`
                                );
                                err.response = {
                                    status: xhr.status,
                                    data: resData,
                                };
                                reject(err);
                            }
                        } catch (e) {
                            if (xhr.status >= 200 && xhr.status < 300) {
                                resolve(xhr.responseText);
                            } else {
                                reject(
                                    new Error(
                                        `Request failed with status ${xhr.status}`
                                    )
                                );
                            }
                        }
                    };

                    xhr.onerror = (e) => {
                        console.error(
                            "XHR Error details:",
                            e,
                            "status:",
                            xhr.status,
                            "responseText:",
                            xhr.responseText
                        );
                        const errDetails = xhr.responseText
                            ? ` (${xhr.responseText})`
                            : "";
                        const err = new Error(
                            `Network Error (status: ${xhr.status || 0})${errDetails}`
                        );
                        err.response = { status: xhr.status, data: xhr.responseText };
                        reject(err);
                    };

                    xhr.ontimeout = () => {
                        reject(new Error("Request timed out"));
                    };

                    xhr.send(data);
                });
            }

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
