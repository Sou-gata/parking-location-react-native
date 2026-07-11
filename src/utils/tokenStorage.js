import * as Keychain from "react-native-keychain";

const SERVICE_NAME = "auth_token";

const tokenStorage = {
    async setToken(token) {
        try {
            await Keychain.setGenericPassword("user_token", token, {
                service: SERVICE_NAME,
            });
        } catch (error) {
            console.error("Could not save token:", error);
        }
    },

    async getToken() {
        try {
            const credentials = await Keychain.getGenericPassword({
                service: SERVICE_NAME,
            });
            if (credentials) {
                return credentials.password;
            }
            return null;
        } catch (error) {
            console.error("Could not retrieve token:", error);
            return null;
        }
    },

    async removeToken() {
        try {
            await Keychain.resetGenericPassword({ service: SERVICE_NAME });
        } catch (error) {
            console.error("Could not remove token:", error);
        }
    },
};

export default tokenStorage;
