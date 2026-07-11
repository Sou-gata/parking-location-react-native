import { AppRegistry } from "react-native";
import App from "./App";
import { name as appName } from "./app.json";
import { Logger } from "@maplibre/maplibre-react-native";

// Suppress MapLibre request cancellation info warnings
Logger.setLogCallback((log) => {
    if (log.message) {
        const msg = log.message;
        if (
            msg.includes("Request failed due to a permanent error: Canceled") ||
            msg.includes("[ParseStyle]: source must have tiles") ||
            msg.includes("Failed to obtain last location update")
        ) {
            return true;
        }
    }
    return false;
});

AppRegistry.registerComponent(appName, () => App);
