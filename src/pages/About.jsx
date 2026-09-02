import React, { useState } from "react";
import {
    View,
    ScrollView,
    Linking,
    StatusBar,
    Image,
    ActivityIndicator,
    Modal,
    Pressable,
} from "react-native";
import { Text, Card, Surface, Button, Divider } from "react-native-paper";
import { MaterialDesignIcons } from "@react-native-vector-icons/material-design-icons";
import apiService from "../utils/apiService";
import baseURL from "../utils/baseURL";
import useToast from "../hooks/useToast";

const CURRENT_VERSION_NAME = "1.0.1";
const CURRENT_VERSION_CODE = 2;

export default function About({ navigation }) {
    const toast = useToast();
    const [checking, setChecking] = useState(false);
    const [updateModalVisible, setUpdateModalVisible] = useState(false);
    const [updateInfo, setUpdateInfo] = useState(null);
    const [lastChecked, setLastChecked] = useState(null);

    const getFullDownloadUrl = (path) => {
        if (!path) return "";
        if (path.startsWith("http://") || path.startsWith("https://"))
            return path;
        const origin = baseURL.replace(/\/api\/v1\/?$/, "").replace(/\/$/, "");
        return `${origin}${path.startsWith("/") ? "" : "/"}${path}`;
    };

    const isNewerVersion = (serverVersionName, serverVersionCode) => {
        if (
            typeof serverVersionCode === "number" &&
            serverVersionCode > CURRENT_VERSION_CODE
        ) {
            return true;
        }
        if (serverVersionName && serverVersionName !== CURRENT_VERSION_NAME) {
            const currentParts = CURRENT_VERSION_NAME.split(".").map(Number);
            const serverParts = serverVersionName.split(".").map(Number);
            for (
                let i = 0;
                i < Math.max(currentParts.length, serverParts.length);
                i++
            ) {
                const c = currentParts[i] || 0;
                const s = serverParts[i] || 0;
                if (s > c) return true;
                if (s < c) return false;
            }
        }
        return false;
    };

    const handleCheckForUpdate = async () => {
        try {
            setChecking(true);
            const res = await apiService.get("/config/check-update");
            setLastChecked(new Date().toLocaleTimeString());

            if (res && res.success && res.data) {
                const data = res.data;
                const updateAvailable = isNewerVersion(
                    data.versionName,
                    data.versionCode
                );

                if (updateAvailable) {
                    setUpdateInfo(data);
                    setUpdateModalVisible(true);
                    toast.info(
                        `New version ${data.versionName} available!`,
                        "Update Available",
                        true
                    );
                } else {
                    toast.success(
                        `You are on the latest version (v${CURRENT_VERSION_NAME}).`,
                        "Up to Date",
                        true
                    );
                }
            } else {
                toast.error(
                    "Unable to retrieve version details from server.",
                    "Error",
                    true
                );
            }
        } catch (error) {
            console.error("Error checking for update:", error);
            toast.error(
                error.message ||
                    "Failed to check for updates. Please check network connection.",
                "Error",
                true
            );
        } finally {
            setChecking(false);
        }
    };

    const handleDownloadApk = () => {
        if (!updateInfo || !updateInfo.downloadUrl) {
            toast.error("Download link unavailable.", "Error", true);
            return;
        }
        const fullUrl = getFullDownloadUrl(updateInfo.downloadUrl);
        setUpdateModalVisible(false);
        Linking.openURL(fullUrl).catch((err) => {
            console.error("Failed to open URL:", err);
            toast.error("Could not launch download URL.", "Error", true);
        });
    };

    return (
        <View className="flex-1 bg-slate-50">
            <StatusBar backgroundColor="#4338ca" barStyle="light-content" />

            <ScrollView
                contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
                showsVerticalScrollIndicator={false}
            >
                {/* Brand Header Banner */}
                <Surface
                    elevation={2}
                    className="bg-indigo-700 rounded-3xl p-6 items-center mb-4"
                >
                    <View className="w-20 h-20 rounded-xl bg-white/50 items-center justify-center mb-1 p-1.5 border border-white shadow-sm">
                        <Image
                            source={require("../assets/app_logo.png")}
                            style={{ width: 64, height: 64, borderRadius: 14 }}
                            resizeMode="contain"
                        />
                    </View>
                    <Text className="text-2xl font-bold text-white mb-1">
                        Pointo Park
                    </Text>
                    {/* <Image
                        source={require("../assets/logo_text.png")}
                        style={{ width: 180, height: 30 }}
                        resizeMode="contain"
                    /> */}
                    <Text className="text-xs text-indigo-200 text-center mb-3.5">
                        Smart Parking & Space Management System
                    </Text>
                    {/* <View className="flex-row items-center bg-white/20 border border-white/30 px-3.5 py-1.5 rounded-full">
                        <MaterialDesignIcons
                            name="information-outline"
                            size={16}
                            color="#ffffff"
                        />
                        <Text className="text-xs font-semibold text-white ml-1.5">
                            v{CURRENT_VERSION_NAME} (Build{" "}
                            {CURRENT_VERSION_CODE})
                        </Text>
                    </View> */}
                </Surface>

                {/* Check For Update Action Section */}
                <Card elevation={2} className="bg-white rounded-2xl mb-4">
                    <Card.Content>
                        <View className="flex-row items-center mb-3">
                            <MaterialDesignIcons
                                name="update"
                                size={26}
                                color="#4338ca"
                            />
                            <Text className="text-base font-bold text-slate-800 ml-2.5">
                                Software Update
                            </Text>
                        </View>

                        <Text className="text-xs text-slate-500 leading-5 mb-3">
                            Check if a new version of ParkVerse is available
                            with new features, bug fixes, and security
                            enhancements.
                        </Text>

                        {Boolean(lastChecked) && (
                            <Text className="text-xs text-slate-400 italic mb-3">
                                Last checked: {lastChecked}
                            </Text>
                        )}

                        <Button
                            mode="contained"
                            onPress={handleCheckForUpdate}
                            disabled={checking}
                            className="rounded-xl mt-1 py-0.5"
                            buttonColor="#4338ca"
                            contentStyle={{ paddingVertical: 4 }}
                            icon={({ size, color }) =>
                                checking ? (
                                    <ActivityIndicator
                                        size={size}
                                        color={color}
                                    />
                                ) : (
                                    <MaterialDesignIcons
                                        name="refresh"
                                        size={size}
                                        color={color}
                                    />
                                )
                            }
                        >
                            {checking
                                ? "Checking for Updates..."
                                : "Check for Update"}
                        </Button>
                    </Card.Content>
                </Card>

                {/* App Information Card */}
                <Card elevation={2} className="bg-white rounded-2xl mb-4">
                    <Card.Content>
                        <View className="flex-row items-center mb-3">
                            <MaterialDesignIcons
                                name="cellphone-information"
                                size={26}
                                color="#4338ca"
                            />
                            <Text className="text-base font-bold text-slate-800 ml-2.5">
                                Application Specs
                            </Text>
                        </View>

                        <View className="flex-row justify-between items-center py-2.5">
                            <Text className="text-sm text-slate-500">
                                App Name
                            </Text>
                            <Text className="text-sm font-semibold text-slate-900">
                                ParkVerse Mobile
                            </Text>
                        </View>
                        <Divider className="bg-slate-100" />

                        <View className="flex-row justify-between items-center py-2.5">
                            <Text className="text-sm text-slate-500">
                                Installed Version
                            </Text>
                            <Text className="text-sm font-semibold text-slate-900">
                                {CURRENT_VERSION_NAME}
                            </Text>
                        </View>
                        <Divider className="bg-slate-100" />

                        <View className="flex-row justify-between items-center py-2.5">
                            <Text className="text-sm text-slate-500">
                                Build Number
                            </Text>
                            <Text className="text-sm font-semibold text-slate-900">
                                {CURRENT_VERSION_CODE}
                            </Text>
                        </View>
                        <Divider className="bg-slate-100" />

                        <View className="flex-row justify-between items-center py-2.5">
                            <Text className="text-sm text-slate-500">
                                Developer
                            </Text>
                            <Text className="text-sm font-semibold text-slate-900">
                                GBT Solutions
                            </Text>
                        </View>
                    </Card.Content>
                </Card>

                {/* Footer / Copyright */}
                <View className="items-center my-3">
                    <Text className="text-xs text-slate-400">
                        © 2026 GBT Solutions. All rights reserved.
                    </Text>
                </View>
            </ScrollView>

            {/* Update Available Modal */}
            <Modal
                visible={updateModalVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setUpdateModalVisible(false)}
                statusBarTranslucent={true}
            >
                <View
                    style={{
                        flex: 1,
                        backgroundColor: "rgba(0,0,0,0.5)",
                        justifyContent: "center",
                        alignItems: "center",
                        padding: 24,
                    }}
                >
                    <Pressable
                        style={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                        }}
                        onPress={() => setUpdateModalVisible(false)}
                    />
                    <View
                        style={{
                            width: "100%",
                            maxWidth: 380,
                            backgroundColor: "#ffffff",
                            borderRadius: 24,
                            padding: 24,
                            alignItems: "center",
                            elevation: 10,
                            shadowColor: "#000",
                            shadowOffset: { width: 0, height: 4 },
                            shadowOpacity: 0.25,
                            shadowRadius: 12,
                        }}
                    >
                        <View className="w-16 h-16 rounded-full bg-indigo-100 items-center justify-center mb-3">
                            <MaterialDesignIcons
                                name="cloud-download-outline"
                                size={38}
                                color="#4338ca"
                            />
                        </View>

                        <Text className="text-xl font-bold text-slate-800 mb-2">
                            Update Available!
                        </Text>

                        <View className="flex-row items-center bg-indigo-100 px-3.5 py-1.5 rounded-full mb-4">
                            <MaterialDesignIcons
                                name="star"
                                size={16}
                                color="#4338ca"
                            />
                            <Text className="text-xs font-bold text-indigo-700 ml-1.5">
                                Version {updateInfo?.versionName || "New"}
                            </Text>
                        </View>

                        <Text className="self-start text-xs font-bold text-slate-600 mb-1.5">
                            What's New:
                        </Text>
                        <View className="bg-slate-50 rounded-xl p-3 w-full border border-slate-200 mb-5">
                            <ScrollView style={{ maxHeight: 120 }}>
                                <Text className="text-xs text-slate-700 leading-5">
                                    {updateInfo?.releaseNotes ||
                                        "Performance fixes and improvements."}
                                </Text>
                            </ScrollView>
                        </View>

                        <View className="flex-row justify-between w-full gap-3">
                            <View className="flex-1">
                                <Button
                                    mode="outlined"
                                    onPress={() => setUpdateModalVisible(false)}
                                    className="rounded-xl border-slate-300"
                                    textColor="#64748b"
                                >
                                    Later
                                </Button>
                            </View>
                            <View className="flex-[1.3]">
                                <Button
                                    mode="contained"
                                    onPress={handleDownloadApk}
                                    className="rounded-xl"
                                    buttonColor="#4338ca"
                                    icon={({ size, color }) => (
                                        <MaterialDesignIcons
                                            name="download"
                                            size={size}
                                            color={color}
                                        />
                                    )}
                                >
                                    Download APK
                                </Button>
                            </View>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}
