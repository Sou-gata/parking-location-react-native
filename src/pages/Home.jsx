import React, { useState, useRef, useCallback, useEffect } from "react";
import {
    View,
    Text,
    Image,
    Pressable,
    StatusBar,
    BackHandler,
    Modal,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useSelector } from "react-redux";
import {
    IconButton,
    Surface,
    Button,
} from "react-native-paper";
import HomeMap from "../components/HomeMap";
import UserDashboard from "./UserDashboard";
import AgencyAdminDashboard from "./AgencyAdminDashboard";
import SuperAdminDashboard from "./SuperAdminDashboard";
import useRolePermissions from "../hooks/useRolePermissions";
import { PERMISSIONS } from "../utils/rbacConfig";
import { useSidebar } from "../context/SidebarContext";

const Home = ({ navigation, route }) => {
    const { hasPermission } = useRolePermissions();
    const { isOpen: sidebarOpen, openSidebar, closeSidebar } = useSidebar();
    const unreadCount = useSelector(
        (state) => state.notification?.unreadCount || 0
    );
    const [activeView, setActiveView] = useState("dashboard"); // 'dashboard' or 'map'
    const [exitDialogVisible, setExitDialogVisible] = useState(false);
    const lastBackPressRef = useRef(0);

    // Sync route params for view switcher (e.g. from sidebar navigation)
    useEffect(() => {
        if (route?.params?.view) {
            setActiveView(route.params.view);
        }
    }, [route?.params?.view]);

    useFocusEffect(
        useCallback(() => {
            const onBackPress = () => {
                if (sidebarOpen) {
                    closeSidebar();
                    return true;
                }
                if (activeView === "map") {
                    setActiveView("dashboard");
                    return true;
                }

                if (exitDialogVisible) {
                    BackHandler.exitApp();
                    return true;
                }

                const now = Date.now();
                if (now - lastBackPressRef.current < 2000) {
                    BackHandler.exitApp();
                    return true;
                }

                lastBackPressRef.current = now;
                setExitDialogVisible(true);
                return true;
            };

            const subscription = BackHandler.addEventListener(
                "hardwareBackPress",
                onBackPress
            );

            return () => subscription.remove();
        }, [sidebarOpen, activeView, closeSidebar, exitDialogVisible])
    );

    const renderRoleDashboard = () => {
        if (hasPermission(PERMISSIONS.MANAGE_AGENCIES)) {
            return (
                <SuperAdminDashboard
                    navigation={navigation}
                    onOpenMap={() => setActiveView("map")}
                />
            );
        } else if (hasPermission(PERMISSIONS.MANAGE_BOOKINGS)) {
            return (
                <AgencyAdminDashboard
                    navigation={navigation}
                    onOpenMap={() => setActiveView("map")}
                />
            );
        } else {
            return (
                <UserDashboard
                    navigation={navigation}
                    onOpenMap={() => setActiveView("map")}
                />
            );
        }
    };

    return (
        <View className="flex-1 bg-white">
            <StatusBar backgroundColor="#ff9933" barStyle="light-content" />

            {/* Top Navigation Bar */}
            <Surface
                elevation={4}
                className="bg-carrot-400 rounded-b-3xl flex-row items-center justify-between px-2"
                style={{ height: 110, paddingTop: StatusBar.currentHeight }}
            >
                <IconButton
                    icon={activeView === "dashboard" ? "menu" : "arrow-left"}
                    iconColor="white"
                    size={28}
                    onPress={() => {
                        if (activeView === "map") {
                            setActiveView("dashboard");
                        } else {
                            openSidebar();
                        }
                    }}
                />

                {/* Absolute Centered Header Title / Logo */}
                <View
                    className="absolute left-0 right-0 items-center justify-center"
                    style={{
                        top: StatusBar.currentHeight || 0,
                        bottom: 0,
                    }}
                    pointerEvents="none"
                >
                    {activeView === "dashboard" ? (
                        <Image
                            source={require("../assets/logo_text.png")}
                            style={{ width: 140, height: 32 }}
                            resizeMode="contain"
                        />
                    ) : (
                        <Text className="text-white text-xl font-bold">
                            Map View
                        </Text>
                    )}
                </View>

                <View className="flex-row items-center">
                    {/* Notification Bell Icon with Badge */}
                    <View style={{ position: "relative" }}>
                        <IconButton
                            icon="bell-outline"
                            iconColor="white"
                            size={24}
                            onPress={() =>
                                navigation.navigate("NotificationScreen")
                            }
                        />
                        {unreadCount > 0 && (
                            <View
                                style={{
                                    position: "absolute",
                                    top: 4,
                                    right: 4,
                                    backgroundColor: "#ef4444",
                                    borderRadius: 10,
                                    minWidth: 18,
                                    height: 18,
                                    alignItems: "center",
                                    justifyContent: "center",
                                    paddingHorizontal: 4,
                                    borderWidth: 1.5,
                                    borderColor: "#ff9933",
                                }}
                            >
                                <Text
                                    style={{
                                        color: "#ffffff",
                                        fontSize: 10,
                                        fontWeight: "bold",
                                    }}
                                >
                                    {unreadCount > 99 ? "99+" : unreadCount}
                                </Text>
                            </View>
                        )}
                    </View>

                    {/* View Switcher (Dashboard / Map) */}
                    {Boolean(hasPermission(PERMISSIONS.VIEW_MAP)) && (
                        <IconButton
                            icon={
                                activeView === "dashboard"
                                    ? "map-marker"
                                    : "view-dashboard"
                            }
                            iconColor="white"
                            size={24}
                            onPress={() =>
                                setActiveView(
                                    activeView === "dashboard"
                                        ? "map"
                                        : "dashboard"
                                )
                            }
                        />
                    )}
                </View>
            </Surface>

            {/* Main Active View */}
            <View className="flex-1">
                {activeView === "dashboard" ||
                !hasPermission(PERMISSIONS.VIEW_MAP) ? (
                    renderRoleDashboard()
                ) : (
                    <HomeMap shouldOpenIntentOnMount />
                )}
            </View>



            {/* Exit App Confirmation Dialog */}
            <Modal
                visible={exitDialogVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setExitDialogVisible(false)}
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
                        onPress={() => setExitDialogVisible(false)}
                    />
                    <View
                        style={{
                            width: "100%",
                            maxWidth: 340,
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
                        {/* Glowing Icon Badge Container */}
                        <View className="w-16 h-16 rounded-full bg-rose-50 items-center justify-center mb-4 border border-rose-100">
                            <IconButton
                                icon="power"
                                iconColor="#e11d48"
                                size={32}
                                style={{ margin: 0 }}
                            />
                        </View>

                        {/* Modal Title & Text */}
                        <Text className="text-xl font-bold text-slate-800 text-center mb-1">
                            Exit Application?
                        </Text>
                        <Text className="text-sm text-slate-500 text-center mb-6 px-2 leading-5">
                            Are you sure you want to close Park Verse? Pressing
                            back again will also exit.
                        </Text>

                        {/* Action Buttons Row */}
                        <View className="flex-row items-center justify-between w-full gap-3">
                            <View className="flex-1">
                                <Button
                                    mode="outlined"
                                    onPress={() => setExitDialogVisible(false)}
                                    style={{
                                        borderRadius: 12,
                                        borderColor: "#cbd5e1",
                                    }}
                                    textColor="#475569"
                                    contentStyle={{ paddingVertical: 4 }}
                                >
                                    Cancel
                                </Button>
                            </View>
                            <View className="flex-1">
                                <Button
                                    mode="contained"
                                    onPress={() => BackHandler.exitApp()}
                                    style={{ borderRadius: 12 }}
                                    buttonColor="#e11d48"
                                    textColor="white"
                                    icon="exit-to-app"
                                    contentStyle={{ paddingVertical: 4 }}
                                >
                                    Exit App
                                </Button>
                            </View>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

export default Home;
