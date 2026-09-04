import React, { useState, useRef, useCallback } from "react";
import {
    View,
    Text,
    Image,
    Animated,
    Dimensions,
    Pressable,
    StatusBar,
    ScrollView,
    BackHandler,
    Modal,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useSelector, useDispatch } from "react-redux";
import { logoutAndClearToken } from "../store/slices/userSlice";
import {
    Drawer,
    IconButton,
    Surface,
    Avatar,
    Divider,
    Button,
} from "react-native-paper";
import HomeMap from "../components/HomeMap";
import UserDashboard from "./UserDashboard";
import AgencyAdminDashboard from "./AgencyAdminDashboard";
import SuperAdminDashboard from "./SuperAdminDashboard";
import SendNotificationModal from "../components/SendNotificationModal";
import useRolePermissions from "../hooks/useRolePermissions";
import { ROLES, PERMISSIONS, ROLE_DISPLAY_NAMES } from "../utils/rbacConfig";

const { width } = Dimensions.get("window");
const DRAWER_WIDTH = width * 0.75;

const Home = ({ navigation }) => {
    const dispatch = useDispatch();
    const { user, role, hasPermission, hasAnyPermission } =
        useRolePermissions();
    const unreadCount = useSelector(
        (state) => state.notification?.unreadCount || 0
    );
    const [activeView, setActiveView] = useState("dashboard"); // 'dashboard' or 'map'
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [exitDialogVisible, setExitDialogVisible] = useState(false);
    const [sendPushModalOpen, setSendPushModalOpen] = useState(false);
    const drawerAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
    const backdropAnim = useRef(new Animated.Value(0)).current;
    const lastBackPressRef = useRef(0);

    const toggleDrawer = useCallback(
        (open) => {
            if (open) {
                setDrawerOpen(true);
                Animated.parallel([
                    Animated.timing(drawerAnim, {
                        toValue: 0,
                        duration: 300,
                        useNativeDriver: true,
                    }),
                    Animated.timing(backdropAnim, {
                        toValue: 1,
                        duration: 300,
                        useNativeDriver: true,
                    }),
                ]).start();
            } else {
                Animated.parallel([
                    Animated.timing(drawerAnim, {
                        toValue: -DRAWER_WIDTH,
                        duration: 250,
                        useNativeDriver: true,
                    }),
                    Animated.timing(backdropAnim, {
                        toValue: 0,
                        duration: 250,
                        useNativeDriver: true,
                    }),
                ]).start(() => setDrawerOpen(false));
            }
        },
        [backdropAnim, drawerAnim]
    );

    useFocusEffect(
        useCallback(() => {
            const onBackPress = () => {
                if (drawerOpen) {
                    toggleDrawer(false);
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
        }, [drawerOpen, activeView, toggleDrawer, exitDialogVisible])
    );

    const handleLogout = () => {
        toggleDrawer(false);
        dispatch(logoutAndClearToken());
    };

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
                            toggleDrawer(true);
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
                    <HomeMap />
                )}
            </View>

            {/* Backdrop */}
            {Boolean(drawerOpen) && (
                <Animated.View
                    className="absolute inset-0 bg-black/50 z-10"
                    style={{
                        opacity: backdropAnim,
                    }}
                >
                    <Pressable
                        className="flex-1"
                        onPress={() => toggleDrawer(false)}
                    />
                </Animated.View>
            )}

            {/* Drawer */}
            <Animated.View
                className="absolute top-0 left-0 bottom-0 z-20"
                style={{
                    width: DRAWER_WIDTH,
                    transform: [{ translateX: drawerAnim }],
                }}
            >
                <Surface elevation={5} className="flex-1 bg-white pt-14">
                    {/* User profile header */}
                    <View className="px-5 flex-row items-center mb-4">
                        <Avatar.Text
                            size={56}
                            label={
                                user?.name?.substring(0, 2).toUpperCase() ||
                                "US"
                            }
                            style={{ backgroundColor: "#ff9933" }}
                        />
                        <View className="ml-4 flex-1">
                            <Text
                                className="text-base font-bold text-slate-800"
                                numberOfLines={1}
                            >
                                {user?.name || "User"}
                            </Text>
                            <View className="flex-row items-center mt-1">
                                <View className="bg-carrot-100 px-2 py-0.5 rounded self-start">
                                    <Text className="text-carrot-800 font-bold text-xs">
                                        {String(
                                            "                                     " +
                                                (ROLE_DISPLAY_NAMES[role] ||
                                                    "Customer") +
                                                "                                 "
                                        ).trim()}
                                    </Text>
                                </View>
                            </View>
                        </View>
                    </View>

                    <Divider className="mx-4 mb-2 bg-gray-200" />

                    {/* Navigation Menu Organized into Categorized Sections */}
                    <View className="flex-1">
                        <ScrollView
                            className="flex-1"
                            showsVerticalScrollIndicator={false}
                        >
                            {/* SECTION 1: MAIN NAVIGATION */}
                            <Drawer.Section
                                title="Navigation"
                                showDivider={false}
                            >
                                <Drawer.Item
                                    icon="view-dashboard"
                                    label="Dashboard"
                                    active={activeView === "dashboard"}
                                    onPress={() => {
                                        setActiveView("dashboard");
                                        toggleDrawer(false);
                                    }}
                                />

                                {Boolean(
                                    hasPermission(PERMISSIONS.VIEW_MAP)
                                ) && (
                                    <Drawer.Item
                                        icon="map-search"
                                        label="Map View"
                                        active={activeView === "map"}
                                        onPress={() => {
                                            setActiveView("map");
                                            toggleDrawer(false);
                                        }}
                                    />
                                )}
                            </Drawer.Section>

                            {/* SECTION 2: MY ACCOUNT & SERVICES */}
                            <Divider className="my-1 mx-4 bg-slate-100" />
                            <Drawer.Section
                                title="My Account"
                                showDivider={false}
                            >
                                <Drawer.Item
                                    icon="bell-outline"
                                    label={
                                        unreadCount > 0
                                            ? `Notifications (${unreadCount})`
                                            : "Notifications"
                                    }
                                    onPress={() => {
                                        toggleDrawer(false);
                                        navigation.navigate(
                                            "NotificationScreen"
                                        );
                                    }}
                                />

                                <Drawer.Item
                                    icon="account"
                                    label="My Profile"
                                    onPress={() => {
                                        toggleDrawer(false);
                                        navigation.navigate("Profile");
                                    }}
                                />

                                {Boolean(
                                    hasPermission(PERMISSIONS.BOOK_PARKING)
                                ) && (
                                    <Drawer.Item
                                        icon="car"
                                        label="My Bookings"
                                        onPress={() => {
                                            toggleDrawer(false);
                                            navigation.navigate("MyBookings");
                                        }}
                                    />
                                )}

                                {Boolean(
                                    hasPermission(PERMISSIONS.VIEW_WALLET)
                                ) && (
                                    <Drawer.Item
                                        icon="wallet"
                                        label={
                                            hasPermission(
                                                PERMISSIONS.BOOK_PARKING
                                            )
                                                ? "Wallet & Transactions"
                                                : "Earnings & Wallet"
                                        }
                                        onPress={() => {
                                            toggleDrawer(false);
                                            navigation.navigate("Wallet");
                                        }}
                                    />
                                )}
                            </Drawer.Section>

                            {/* SECTION 3: PARKING OPERATIONS */}
                            {Boolean(
                                hasAnyPermission([
                                    PERMISSIONS.MANAGE_BOOKINGS,
                                    PERMISSIONS.MANAGE_LOCATIONS,
                                ])
                            ) && (
                                <>
                                    <Divider className="my-1 mx-4 bg-slate-100" />
                                    <Drawer.Section
                                        title="Operations"
                                        showDivider={false}
                                    >
                                        {Boolean(
                                            hasPermission(
                                                PERMISSIONS.MANAGE_BOOKINGS
                                            )
                                        ) && (
                                            <Drawer.Item
                                                icon="calendar-check"
                                                label="Check In / Out"
                                                onPress={() => {
                                                    toggleDrawer(false);
                                                    navigation.navigate(
                                                        "CheckInOut"
                                                    );
                                                }}
                                            />
                                        )}

                                        {Boolean(
                                            hasPermission(
                                                PERMISSIONS.MANAGE_LOCATIONS
                                            )
                                        ) && (
                                            <>
                                                <Drawer.Item
                                                    icon="map-marker-multiple"
                                                    label="Manage Parking"
                                                    onPress={() => {
                                                        toggleDrawer(false);
                                                        navigation.navigate(
                                                            "ManageParking"
                                                        );
                                                    }}
                                                />
                                                <Drawer.Item
                                                    icon="clock-outline"
                                                    label="Working Hours"
                                                    onPress={() => {
                                                        toggleDrawer(false);
                                                        navigation.navigate(
                                                            "WorkingHours"
                                                        );
                                                    }}
                                                />
                                            </>
                                        )}
                                    </Drawer.Section>
                                </>
                            )}

                            {/* SECTION 4: ADMINISTRATION & SUPPORT */}
                            {Boolean(
                                hasAnyPermission([
                                    PERMISSIONS.MANAGE_AGENCIES,
                                    PERMISSIONS.MANAGE_USERS,
                                    PERMISSIONS.MANAGE_COMPLAINTS,
                                    PERMISSIONS.MANAGE_SETTINGS,
                                ])
                            ) && (
                                <>
                                    <Divider className="my-1 mx-4 bg-slate-100" />
                                    <Drawer.Section
                                        title="Administration"
                                        showDivider={false}
                                    >
                                        {Boolean(
                                            hasPermission(
                                                PERMISSIONS.MANAGE_AGENCIES
                                            )
                                        ) && (
                                            <Drawer.Item
                                                icon="office-building"
                                                label="Manage Agencies"
                                                onPress={() => {
                                                    toggleDrawer(false);
                                                    navigation.navigate(
                                                        "ManageUsers",
                                                        {
                                                            initialTab:
                                                                "agencies",
                                                        }
                                                    );
                                                }}
                                            />
                                        )}

                                        {Boolean(
                                            hasPermission(
                                                PERMISSIONS.MANAGE_USERS
                                            )
                                        ) && (
                                            <Drawer.Item
                                                icon="account-multiple-outline"
                                                label="Manage Staff"
                                                onPress={() => {
                                                    toggleDrawer(false);
                                                    navigation.navigate(
                                                        "ManageUsers"
                                                    );
                                                }}
                                            />
                                        )}

                                        {Boolean(
                                            hasPermission(
                                                PERMISSIONS.MANAGE_COMPLAINTS
                                            )
                                        ) && (
                                            <Drawer.Item
                                                icon="alert-circle-outline"
                                                label="Customer Complaints"
                                                onPress={() => {
                                                    toggleDrawer(false);
                                                    navigation.navigate(
                                                        "ManageComplaints"
                                                    );
                                                }}
                                            />
                                        )}

                                        {Boolean(
                                            hasPermission(
                                                PERMISSIONS.MANAGE_SETTINGS
                                            )
                                        ) && (
                                            <>
                                                <Drawer.Item
                                                    icon="bell-ring-outline"
                                                    label="Send Push Notification"
                                                    onPress={() => {
                                                        toggleDrawer(false);
                                                        setSendPushModalOpen(
                                                            true
                                                        );
                                                    }}
                                                />
                                                <Drawer.Item
                                                    icon="cog"
                                                    label="System Settings"
                                                    onPress={() => {
                                                        toggleDrawer(false);
                                                        navigation.navigate(
                                                            "SuperAdminSettings"
                                                        );
                                                    }}
                                                />
                                            </>
                                        )}
                                    </Drawer.Section>
                                </>
                            )}
                        </ScrollView>
                    </View>

                    {/* SECTION 5: APP INFO & SIGN OUT */}
                    <Drawer.Section className="mb-5 border-t border-gray-100 pt-2">
                        <Drawer.Item
                            icon="information-outline"
                            label="About App"
                            onPress={() => {
                                toggleDrawer(false);
                                navigation.navigate("About");
                            }}
                        />
                        <Drawer.Item
                            icon="logout"
                            label="Sign Out"
                            onPress={handleLogout}
                        />
                    </Drawer.Section>
                </Surface>
            </Animated.View>

            {/* Send Push Notification Modal */}
            <SendNotificationModal
                visible={sendPushModalOpen}
                onClose={() => setSendPushModalOpen(false)}
            />

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
