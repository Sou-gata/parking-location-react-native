import React, { useState, useEffect, useRef, useCallback } from "react";
import {
    View,
    Text,
    Image,
    Animated,
    Dimensions,
    Pressable,
    ScrollView,
    BackHandler,
    TouchableOpacity,
    StatusBar,
    Modal,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSelector, useDispatch } from "react-redux";
import { IconButton } from "react-native-paper";
import { useSidebar } from "../context/SidebarContext";
import useRolePermissions from "../hooks/useRolePermissions";
import { logoutAndClearToken } from "../store/slices/userSlice";
import { ROLES, PERMISSIONS, ROLE_DISPLAY_NAMES } from "../utils/rbacConfig";
import { navigate, getCurrentRouteName } from "../utils/navigationRef";
import SendNotificationModal from "./SendNotificationModal";

const { width } = Dimensions.get("window");
const DRAWER_WIDTH = Math.min(width * 0.82, 330);

const ROLE_STYLES = {
    [ROLES.SUPER_ADMIN]: {
        badgeBgClass: "bg-amber-100 border-amber-300",
        badgeTextClass: "text-amber-800",
        iconColor: "#b45309",
        icon: "shield-crown",
    },
    [ROLES.AGENCY_ADMIN]: {
        badgeBgClass: "bg-sky-100 border-sky-300",
        badgeTextClass: "text-sky-800",
        iconColor: "#0369a1",
        icon: "office-building",
    },
    [ROLES.AGENCY_USER]: {
        badgeBgClass: "bg-emerald-100 border-emerald-300",
        badgeTextClass: "text-emerald-800",
        iconColor: "#15803d",
        icon: "badge-account",
    },
    [ROLES.USER]: {
        badgeBgClass: "bg-carrot-100 border-carrot-300",
        badgeTextClass: "text-carrot-800",
        iconColor: "#c2410c",
        icon: "account",
    },
};

const GlobalSidebar = () => {
    const dispatch = useDispatch();
    const insets = useSafeAreaInsets();
    const {
        isOpen,
        closeSidebar,
        sendPushModalOpen,
        openSendPushModal,
        closeSendPushModal,
    } = useSidebar();
    const { user, role, hasPermission, hasAnyPermission } =
        useRolePermissions();
    const unreadCount = useSelector(
        (state) => state.notification?.unreadCount || 0
    );

    const [modalVisible, setModalVisible] = useState(false);
    const drawerAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
    const backdropAnim = useRef(new Animated.Value(0)).current;

    // Handle slide in/out animations
    useEffect(() => {
        if (isOpen) {
            setModalVisible(true);
            drawerAnim.setValue(-DRAWER_WIDTH);
            backdropAnim.setValue(0);
            Animated.parallel([
                Animated.timing(drawerAnim, {
                    toValue: 0,
                    duration: 260,
                    useNativeDriver: true,
                }),
                Animated.timing(backdropAnim, {
                    toValue: 1,
                    duration: 260,
                    useNativeDriver: true,
                }),
            ]).start();
        } else if (modalVisible) {
            Animated.parallel([
                Animated.timing(drawerAnim, {
                    toValue: -DRAWER_WIDTH,
                    duration: 220,
                    useNativeDriver: true,
                }),
                Animated.timing(backdropAnim, {
                    toValue: 0,
                    duration: 220,
                    useNativeDriver: true,
                }),
            ]).start(() => {
                setModalVisible(false);
            });
        }
    }, [isOpen, backdropAnim, drawerAnim, modalVisible]);

    // Handle hardware back press when sidebar is open
    useEffect(() => {
        if (!isOpen) return;

        const onBackPress = () => {
            closeSidebar();
            return true;
        };

        const subscription = BackHandler.addEventListener(
            "hardwareBackPress",
            onBackPress
        );
        return () => subscription.remove();
    }, [isOpen, closeSidebar]);

    const handleNavigate = useCallback(
        (screenName, params = {}) => {
            closeSidebar();
            setTimeout(() => {
                navigate(screenName, params);
            }, 100);
        },
        [closeSidebar]
    );

    const handleLogout = useCallback(() => {
        closeSidebar();
        dispatch(logoutAndClearToken());
    }, [closeSidebar, dispatch]);

    const currentRoute = getCurrentRouteName();
    const roleConfig = ROLE_STYLES[role] || ROLE_STYLES[ROLES.USER];
    const roleLabel = ROLE_DISPLAY_NAMES[role] || "Customer";

    const renderMenuItem = ({
        icon,
        label,
        onPress,
        badgeCount = 0,
        isActive = false,
        iconColor = "#475569",
        iconBgClass = "bg-slate-100",
        danger = false,
    }) => {
        return (
            <TouchableOpacity
                activeOpacity={0.7}
                onPress={onPress}
                className={`flex-row items-center py-2.5 px-3 rounded-2xl mb-1 ${
                    danger
                        ? "bg-rose-50"
                        : isActive
                        ? "bg-carrot-50 border-l-4 border-carrot-600"
                        : ""
                }`}
            >
                <View
                    className={`w-9 h-9 rounded-xl items-center justify-center mr-3 ${
                        danger
                            ? "bg-rose-100"
                            : isActive
                            ? "bg-carrot-100"
                            : iconBgClass
                    }`}
                >
                    <IconButton
                        icon={icon}
                        iconColor={
                            danger
                                ? "#ef4444"
                                : isActive
                                ? "#ea580c"
                                : iconColor
                        }
                        size={20}
                        className="m-0 w-6 h-6"
                    />
                </View>
                <Text
                    className={`text-sm flex-1 ${
                        danger
                            ? "text-rose-600 font-bold"
                            : isActive
                            ? "text-carrot-600 font-bold"
                            : "text-slate-700 font-semibold"
                    }`}
                    numberOfLines={1}
                >
                    {label}
                </Text>

                {badgeCount > 0 && (
                    <View className="bg-red-500 rounded-full min-w-[20px] h-5 items-center justify-center px-1.5 mr-1">
                        <Text className="text-white text-[10px] font-bold">
                            {badgeCount > 99 ? "99+" : badgeCount}
                        </Text>
                    </View>
                )}

                {!danger && (
                    <IconButton
                        icon="chevron-right"
                        iconColor={isActive ? "#ea580c" : "#cbd5e1"}
                        size={18}
                        className="m-0 ml-auto"
                    />
                )}
            </TouchableOpacity>
        );
    };

    return (
        <>
            <Modal
                visible={modalVisible}
                transparent={true}
                animationType="none"
                onRequestClose={closeSidebar}
                statusBarTranslucent={true}
            >
                <View className="flex-1">
                    {/* Dark Translucent Backdrop */}
                    <Animated.View
                        className="absolute inset-0 bg-slate-900/60"
                        style={{ opacity: backdropAnim }}
                    >
                        <Pressable className="flex-1" onPress={closeSidebar} />
                    </Animated.View>

                    {/* Sidebar Slide-in Drawer */}
                    <Animated.View
                        className="absolute top-0 left-0 bottom-0 bg-white rounded-r-3xl overflow-hidden shadow-2xl elevation-16"
                        style={{
                            width: DRAWER_WIDTH,
                            paddingBottom: Math.max(insets.bottom, 16),
                            transform: [{ translateX: drawerAnim }],
                        }}
                    >
                        {/* Header Banner - Full Width, No Top/Side Margin */}
                        <View
                            className="bg-carrot-400 px-4 pb-5 shadow-md elevation-4"
                            style={{
                                paddingTop:
                                    Math.max(
                                        insets.top,
                                        StatusBar.currentHeight || 0,
                                        16
                                    ) + 12,
                            }}
                        >
                            <View className="flex-row items-center justify-between mb-3.5">
                                <View className="flex-row items-center">
                                    <Image
                                        source={require("../assets/app_logo.png")}
                                        className="w-7 h-7 mr-2 rounded-full p-1.5 border-white border-[0.5px] shadow-transparent"
                                        resizeMode="contain"
                                    />
                                    <Text className="text-white text-base font-extrabold tracking-wider">
                                        PointOPark
                                    </Text>
                                </View>
                                <TouchableOpacity
                                    className="w-8 h-8 rounded-full bg-white/20 items-center justify-center"
                                    onPress={closeSidebar}
                                    activeOpacity={0.8}
                                >
                                    <IconButton
                                        icon="close"
                                        iconColor="#ffffff"
                                        size={20}
                                        className="m-0"
                                    />
                                </TouchableOpacity>
                            </View>

                            {/* User Profile Block */}
                            <View className="flex-row items-center">
                                <View className="w-14 h-14 rounded-full border-2 border-white overflow-hidden bg-white items-center justify-center shadow-sm elevation-3">
                                    {user?.profile_photo ? (
                                        <Image
                                            source={{ uri: user.profile_photo }}
                                            className="w-full h-full"
                                        />
                                    ) : (
                                        <View className="w-full h-full bg-carrot-500 items-center justify-center">
                                            <Text className="text-white text-xl font-extrabold">
                                                {user?.name
                                                    ?.substring(0, 2)
                                                    .toUpperCase() || "PV"}
                                            </Text>
                                        </View>
                                    )}
                                </View>

                                <View className="ml-3 flex-1">
                                    <Text
                                        className="text-white text-base font-bold"
                                        numberOfLines={1}
                                    >
                                        {user?.name || "Welcome"}
                                    </Text>
                                    <Text
                                        className="text-white/85 text-xs mt-0.5 mb-1"
                                        numberOfLines={1}
                                    >
                                        {user?.email ||
                                            user?.phone_number ||
                                            "Park Verse Member"}
                                    </Text>
                                </View>
                            </View>
                        </View>

                        {/* Scrollable Navigation Items */}
                        <ScrollView
                            className="flex-1"
                            showsVerticalScrollIndicator={false}
                            contentContainerClassName="px-3 pb-5"
                        >
                            {/* SECTION: MAIN */}
                            <View className="mt-3.5 mb-1.5 px-2">
                                <Text className="text-[11px] font-bold text-slate-400 tracking-wider">
                                    NAVIGATION
                                </Text>
                            </View>

                            {renderMenuItem({
                                icon: "view-dashboard-outline",
                                label: "Dashboard",
                                isActive: currentRoute === "Home",
                                iconColor: "#ea580c",
                                iconBgClass: "bg-carrot-50",
                                onPress: () =>
                                    handleNavigate("Home", {
                                        view: "dashboard",
                                    }),
                            })}

                            {Boolean(hasPermission(PERMISSIONS.VIEW_MAP)) &&
                                renderMenuItem({
                                    icon: "map-marker-radius-outline",
                                    label: "Map View",
                                    iconColor: "#0284c7",
                                    iconBgClass: "bg-sky-50",
                                    onPress: () =>
                                        handleNavigate("Home", { view: "map" }),
                                })}

                            {/* SECTION: MY ACCOUNT */}
                            <View className="mt-3.5 mb-1.5 px-2">
                                <Text className="text-[11px] font-bold text-slate-400 tracking-wider">
                                    MY ACCOUNT
                                </Text>
                            </View>

                            {renderMenuItem({
                                icon: "bell-outline",
                                label: "Notifications",
                                isActive: currentRoute === "NotificationScreen",
                                badgeCount: unreadCount,
                                iconColor: "#f59e0b",
                                iconBgClass: "bg-amber-50",
                                onPress: () =>
                                    handleNavigate("NotificationScreen"),
                            })}

                            {renderMenuItem({
                                icon: "account-circle-outline",
                                label: "My Profile",
                                isActive: currentRoute === "Profile",
                                iconColor: "#6366f1",
                                iconBgClass: "bg-indigo-50",
                                onPress: () => handleNavigate("Profile"),
                            })}

                            {Boolean(hasPermission(PERMISSIONS.BOOK_PARKING)) &&
                                renderMenuItem({
                                    icon: "car-outline",
                                    label: "My Bookings",
                                    isActive: currentRoute === "MyBookings",
                                    iconColor: "#10b981",
                                    iconBgClass: "bg-emerald-50",
                                    onPress: () => handleNavigate("MyBookings"),
                                })}

                            {Boolean(hasPermission(PERMISSIONS.VIEW_WALLET)) &&
                                renderMenuItem({
                                    icon: "wallet-outline",
                                    label: hasPermission(
                                        PERMISSIONS.BOOK_PARKING
                                    )
                                        ? "Wallet & Transactions"
                                        : "Earnings & Wallet",
                                    isActive: currentRoute === "Wallet",
                                    iconColor: "#8b5cf6",
                                    iconBgClass: "bg-purple-50",
                                    onPress: () => handleNavigate("Wallet"),
                                })}

                            {/* SECTION: OPERATIONS (AGENCY / ADMIN) */}
                            {Boolean(
                                hasAnyPermission([
                                    PERMISSIONS.MANAGE_BOOKINGS,
                                    PERMISSIONS.MANAGE_LOCATIONS,
                                ])
                            ) && (
                                <>
                                    <View className="mt-3.5 mb-1.5 px-2">
                                        <Text className="text-[11px] font-bold text-slate-400 tracking-wider">
                                            OPERATIONS
                                        </Text>
                                    </View>

                                    {Boolean(
                                        hasPermission(
                                            PERMISSIONS.MANAGE_BOOKINGS
                                        )
                                    ) &&
                                        renderMenuItem({
                                            icon: "calendar-check-outline",
                                            label: "Check In / Out",
                                            isActive:
                                                currentRoute === "CheckInOut",
                                            iconColor: "#059669",
                                            iconBgClass: "bg-emerald-50",
                                            onPress: () =>
                                                handleNavigate("CheckInOut"),
                                        })}

                                    {Boolean(
                                        hasPermission(
                                            PERMISSIONS.MANAGE_LOCATIONS
                                        )
                                    ) && (
                                        <>
                                            {renderMenuItem({
                                                icon: "parking",
                                                label: "Manage Parking",
                                                isActive:
                                                    currentRoute ===
                                                    "ManageParking",
                                                iconColor: "#d97706",
                                                iconBgClass: "bg-amber-50",
                                                onPress: () =>
                                                    handleNavigate(
                                                        "ManageParking"
                                                    ),
                                            })}
                                            {renderMenuItem({
                                                icon: "clock-time-four-outline",
                                                label: "Working Hours",
                                                isActive:
                                                    currentRoute ===
                                                    "WorkingHours",
                                                iconColor: "#0284c7",
                                                iconBgClass: "bg-sky-50",
                                                onPress: () =>
                                                    handleNavigate(
                                                        "WorkingHours"
                                                    ),
                                            })}
                                        </>
                                    )}
                                </>
                            )}

                            {/* SECTION: ADMINISTRATION */}
                            {Boolean(
                                hasAnyPermission([
                                    PERMISSIONS.MANAGE_AGENCIES,
                                    PERMISSIONS.MANAGE_USERS,
                                    PERMISSIONS.MANAGE_COMPLAINTS,
                                    PERMISSIONS.MANAGE_SETTINGS,
                                ])
                            ) && (
                                <>
                                    <View className="mt-3.5 mb-1.5 px-2">
                                        <Text className="text-[11px] font-bold text-slate-400 tracking-wider">
                                            ADMINISTRATION
                                        </Text>
                                    </View>

                                    {Boolean(
                                        hasPermission(
                                            PERMISSIONS.MANAGE_AGENCIES
                                        )
                                    ) &&
                                        renderMenuItem({
                                            icon: "office-building-outline",
                                            label: "Manage Agencies",
                                            isActive:
                                                currentRoute === "ManageUsers",
                                            iconColor: "#4f46e5",
                                            iconBgClass: "bg-indigo-50",
                                            onPress: () =>
                                                handleNavigate("ManageUsers", {
                                                    initialTab: "agencies",
                                                }),
                                        })}

                                    {Boolean(
                                        hasPermission(PERMISSIONS.MANAGE_USERS)
                                    ) &&
                                        renderMenuItem({
                                            icon: "account-group-outline",
                                            label: "Manage Staff",
                                            isActive:
                                                currentRoute === "ManageUsers",
                                            iconColor: "#0284c7",
                                            iconBgClass: "bg-sky-50",
                                            onPress: () =>
                                                handleNavigate("ManageUsers"),
                                        })}

                                    {Boolean(
                                        hasPermission(
                                            PERMISSIONS.MANAGE_COMPLAINTS
                                        )
                                    ) &&
                                        renderMenuItem({
                                            icon: "alert-circle-outline",
                                            label: "Customer Complaints",
                                            isActive:
                                                currentRoute ===
                                                "ManageComplaints",
                                            iconColor: "#e11d48",
                                            iconBgClass: "bg-rose-50",
                                            onPress: () =>
                                                handleNavigate(
                                                    "ManageComplaints"
                                                ),
                                        })}

                                    {Boolean(
                                        hasPermission(
                                            PERMISSIONS.MANAGE_SETTINGS
                                        )
                                    ) && (
                                        <>
                                            {renderMenuItem({
                                                icon: "bell-ring-outline",
                                                label: "Send Push Notification",
                                                iconColor: "#d97706",
                                                iconBgClass: "bg-amber-50",
                                                onPress: () => {
                                                    closeSidebar();
                                                    openSendPushModal();
                                                },
                                            })}
                                            {renderMenuItem({
                                                icon: "cog-outline",
                                                label: "System Settings",
                                                isActive:
                                                    currentRoute ===
                                                    "SuperAdminSettings",
                                                iconColor: "#64748b",
                                                iconBgClass: "bg-slate-100",
                                                onPress: () =>
                                                    handleNavigate(
                                                        "SuperAdminSettings"
                                                    ),
                                            })}
                                        </>
                                    )}
                                </>
                            )}

                            {/* SECTION: GENERAL & LOGOUT */}
                            <View className="mt-3.5 mb-1.5 px-2">
                                <Text className="text-[11px] font-bold text-slate-400 tracking-wider">
                                    MORE
                                </Text>
                            </View>

                            {renderMenuItem({
                                icon: "information-outline",
                                label: "About App",
                                isActive: currentRoute === "About",
                                iconColor: "#64748b",
                                iconBgClass: "bg-slate-50",
                                onPress: () => handleNavigate("About"),
                            })}

                            {renderMenuItem({
                                icon: "logout",
                                label: "Sign Out",
                                danger: true,
                                onPress: handleLogout,
                            })}
                        </ScrollView>

                        {/* Footer Section */}
                        <View className="py-2.5 px-4 border-t border-slate-100 items-center">
                            <Text className="text-[11px] text-slate-400 font-medium">
                                PointOPark • Version 1.0.4
                            </Text>
                        </View>
                    </Animated.View>
                </View>
            </Modal>

            {/* Global Push Notification Modal */}
            <SendNotificationModal
                visible={sendPushModalOpen}
                onClose={closeSendPushModal}
            />
        </>
    );
};

export default GlobalSidebar;
