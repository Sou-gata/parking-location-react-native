import { Platform, PermissionsAndroid } from "react-native";
import {
    getMessaging,
    getToken,
    requestPermission,
    onMessage,
    onTokenRefresh,
    onNotificationOpenedApp,
    getInitialNotification,
} from "@react-native-firebase/messaging";
import notifee, { AndroidImportance, EventType } from "@notifee/react-native";
import apiService from "./apiService";
import tokenStorage from "./tokenStorage";

class NotificationService {
    isInitialized = false;
    currentToken = null;
    unsubscribeOnMessage = null;
    unsubscribeOnTokenRefresh = null;
    unsubscribeOnNotificationOpened = null;
    unsubscribeNotifeeForeground = null;

    /**
     * Request push notification permissions (Android 13+ & iOS)
     */
    async requestPermission() {
        try {
            if (Platform.OS === "android" && Platform.Version >= 33) {
                const granted = await PermissionsAndroid.request(
                    PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
                );
                if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
                    console.log(
                        "[NotificationService] Android POST_NOTIFICATIONS permission denied"
                    );
                    return false;
                }
            }

            // Also request permission through notifee
            await notifee.requestPermission();

            const messaging = getMessaging();
            const authStatus = await requestPermission(messaging);
            const enabled =
                authStatus === 1 || // AuthorizationStatus.AUTHORIZED
                authStatus === 2; // AuthorizationStatus.PROVISIONAL

            console.log(
                "[NotificationService] Permission authStatus:",
                authStatus,
                "enabled:",
                enabled
            );
            return enabled;
        } catch (error) {
            console.error(
                "[NotificationService] Failed to request notification permission:",
                error
            );
            return false;
        }
    }

    /**
     * Get device FCM registration token
     */
    async getFCMToken() {
        try {
            const messaging = getMessaging();
            const token = await getToken(messaging);
            if (token) {
                this.currentToken = token;
                console.log(
                    "[NotificationService] Device FCM Token retrieved:",
                    token
                );
            }
            return token;
        } catch (error) {
            console.error(
                "[NotificationService] Error getting FCM token:",
                error
            );
            return null;
        }
    }

    /**
     * Register current device FCM token with backend
     */
    async registerDevice() {
        try {
            const authToken = await tokenStorage.getToken();
            if (!authToken) {
                console.log(
                    "[NotificationService] No auth token available. Skipping device registration."
                );
                return false;
            }

            const fcmToken = this.currentToken || (await this.getFCMToken());
            if (!fcmToken) {
                console.warn(
                    "[NotificationService] No FCM token available to register."
                );
                return false;
            }

            const response = await apiService.post(
                "notifications/register-device",
                {
                    fcm_token: fcmToken,
                    device_type: Platform.OS,
                }
            );

            if (response && response.success) {
                console.log(
                    "[NotificationService] Device successfully registered with backend."
                );
                return true;
            } else {
                console.warn(
                    "[NotificationService] Backend returned error during device registration:",
                    response?.message
                );
                return false;
            }
        } catch (error) {
            console.error(
                "[NotificationService] Device registration request failed:",
                error
            );
            return false;
        }
    }

    /**
     * Unregister device FCM token from backend (e.g. on logout)
     */
    async unregisterDevice() {
        try {
            const fcmToken = this.currentToken || (await this.getFCMToken());
            if (!fcmToken) return true;

            await apiService.delete("notifications/unregister-device", {
                data: { fcm_token: fcmToken },
            });
            console.log(
                "[NotificationService] Device unregistered from backend."
            );
            return true;
        } catch (error) {
            console.error(
                "[NotificationService] Failed to unregister device:",
                error
            );
            return false;
        }
    }

    /**
     * Initialize notification service: request permission, fetch & register token,
     * create high-importance channel, and wire up foreground/background/quit handlers.
     */
    async initialize(onForegroundMessage, onNotificationClick) {
        if (this.isInitialized) {
            // Re-register device in case auth state changed
            await this.registerDevice();
            return;
        }

        const hasPermission = await this.requestPermission();
        if (hasPermission) {
            const token = await this.getFCMToken();
            if (token) {
                await this.registerDevice();
            }
        }

        // Create High-Priority Notification Channel for Android Notification Panel
        if (Platform.OS === "android") {
            try {
                await notifee.createChannel({
                    id: "parking_notifications",
                    name: "Parking Notifications",
                    importance: AndroidImportance.HIGH,
                    sound: "default",
                    vibration: true,
                });
            } catch (chanErr) {
                console.error(
                    "[NotificationService] Failed to create notification channel:",
                    chanErr
                );
            }
        }

        const messaging = getMessaging();

        // 1. Foreground message handler: display in Android System Notification Panel
        this.unsubscribeOnMessage = onMessage(
            messaging,
            async (remoteMessage) => {
                console.log(
                    "[NotificationService] Received foreground message:",
                    remoteMessage
                );

                const title =
                    remoteMessage.notification?.title ||
                    "ParkVerse Notification";
                const body = remoteMessage.notification?.body || "";

                try {
                    await notifee.displayNotification({
                        title,
                        body,
                        data: remoteMessage.data,
                        android: {
                            channelId: "parking_notifications",
                            importance: AndroidImportance.HIGH,
                            smallIcon: "ic_launcher",
                            pressAction: {
                                id: "default",
                            },
                        },
                    });
                } catch (displayErr) {
                    console.error(
                        "[NotificationService] Error displaying notifee notification:",
                        displayErr
                    );
                }

                if (onForegroundMessage) {
                    onForegroundMessage(remoteMessage);
                }
            }
        );

        // 2. Notifee foreground notification press listener
        this.unsubscribeNotifeeForeground = notifee.onForegroundEvent(
            ({ type, detail }) => {
                if (type === EventType.PRESS && detail.notification?.data) {
                    console.log(
                        "[NotificationService] Notifee notification pressed:",
                        detail.notification.data
                    );
                    if (onNotificationClick) {
                        onNotificationClick(detail.notification.data);
                    }
                }
            }
        );

        // 3. Token refresh listener
        this.unsubscribeOnTokenRefresh = onTokenRefresh(
            messaging,
            async (newToken) => {
                console.log(
                    "[NotificationService] FCM token refreshed:",
                    newToken
                );
                this.currentToken = newToken;
                await this.registerDevice();
            }
        );

        // 4. App opened from background by tapping notification
        this.unsubscribeOnNotificationOpened = onNotificationOpenedApp(
            messaging,
            (remoteMessage) => {
                console.log(
                    "[NotificationService] Notification opened from background:",
                    remoteMessage
                );
                if (onNotificationClick && remoteMessage.data) {
                    onNotificationClick(remoteMessage.data);
                }
            }
        );

        // 5. App opened from quit state by tapping notification
        getInitialNotification(messaging)
            .then((remoteMessage) => {
                if (remoteMessage) {
                    console.log(
                        "[NotificationService] Notification opened from quit state:",
                        remoteMessage
                    );
                    if (onNotificationClick && remoteMessage.data) {
                        onNotificationClick(remoteMessage.data);
                    }
                }
            })
            .catch((err) => {
                console.error(
                    "[NotificationService] Error getting initial notification:",
                    err
                );
            });

        this.isInitialized = true;
    }

    /**
     * Send push notification via backend API
     */
    async sendPushNotification(payload) {
        try {
            const response = await apiService.post(
                "notifications/send-push",
                payload
            );
            return response;
        } catch (error) {
            console.error(
                "[NotificationService] Failed to send push notification:",
                error
            );
            throw error;
        }
    }

    /**
     * Clean up listeners
     */
    destroy() {
        if (this.unsubscribeOnMessage) {
            this.unsubscribeOnMessage();
            this.unsubscribeOnMessage = null;
        }
        if (this.unsubscribeOnTokenRefresh) {
            this.unsubscribeOnTokenRefresh();
            this.unsubscribeOnTokenRefresh = null;
        }
        if (this.unsubscribeOnNotificationOpened) {
            this.unsubscribeOnNotificationOpened();
            this.unsubscribeOnNotificationOpened = null;
        }
        if (this.unsubscribeNotifeeForeground) {
            this.unsubscribeNotifeeForeground();
            this.unsubscribeNotifeeForeground = null;
        }
        this.isInitialized = false;
    }
}

export default new NotificationService();
