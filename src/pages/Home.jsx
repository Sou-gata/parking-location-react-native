import React, { useState, useRef } from "react";
import {
    View,
    Text,
    Animated,
    Dimensions,
    Pressable,
    StatusBar,
    ScrollView,
} from "react-native";
import { useSelector, useDispatch } from "react-redux";
import { logout, updateUser } from "../store/userSlice";
import {
    Drawer,
    IconButton,
    Surface,
    Avatar,
    Divider,
    Badge,
} from "react-native-paper";
import HomeMap from "../components/HomeMap";
import useRolePermissions from "../hooks/useRolePermissions";
import { ROLES, PERMISSIONS, ROLE_DISPLAY_NAMES } from "../utils/rbacConfig";
import PermissionGuard from "../components/PermissionGuard";

const { width } = Dimensions.get("window");
const DRAWER_WIDTH = width * 0.75;

const Home = ({ navigation }) => {
    const dispatch = useDispatch();
    const { role, hasPermission } = useRolePermissions();
    const user = useSelector((state) => state.user.user);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const drawerAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
    const backdropAnim = useRef(new Animated.Value(0)).current;

    const toggleDrawer = (open) => {
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
    };

    const handleLogout = () => {
        toggleDrawer(false);
        dispatch(logout());
    };

    const handleRoleSwitch = (newRole) => {
        dispatch(updateUser({ role: newRole }));
    };

    return (
        <View className="flex-1 bg-gray-50">
            <StatusBar backgroundColor="#4338ca" barStyle="light-content" />

            {/* Header */}
            <Surface
                elevation={4}
                className="bg-primary rounded-b-3xl flex-row items-center justify-between px-2"
                style={{ height: 110, paddingTop: StatusBar.currentHeight }}
            >
                <IconButton
                    icon="menu"
                    iconColor="white"
                    size={28}
                    onPress={() => toggleDrawer(true)}
                />
                <Text className="text-white text-xl font-bold">
                    Parking Locator
                </Text>
                <IconButton
                    icon="bell"
                    iconColor="white"
                    size={24}
                    onPress={() => {}}
                />
            </Surface>

            {/* Main Content - Map with Search */}
            <View className="flex-1">
                <HomeMap />
            </View>

            {/* Backdrop */}
            {drawerOpen && (
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
                    <View className="px-5 flex-row items-center mb-3">
                        <Avatar.Text
                            size={56}
                            label={
                                user?.name?.substring(0, 2).toUpperCase() ||
                                "US"
                            }
                            style={{ backgroundColor: "#4338ca" }}
                        />
                        <View className="ml-4 flex-1">
                            <Text
                                className="text-base font-bold text-slate-800"
                                numberOfLines={1}
                            >
                                {user?.name || "User"}
                            </Text>
                            <View className="flex-row items-center mt-1">
                                <Badge className="bg-indigo-100 text-indigo-800 font-bold px-2 py-0.5 rounded text-xs self-start">
                                    {ROLE_DISPLAY_NAMES[role] || "Customer"}
                                </Badge>
                            </View>
                        </View>
                    </View>

                    {/* Interactive Role Switcher for Testing */}
                    <View className="px-5 mb-4 mt-2">
                        <Text className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                            Simulate Role (Testing)
                        </Text>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            className="flex-row py-1"
                        >
                            {Object.values(ROLES).map((r) => (
                                <Pressable
                                    key={r}
                                    onPress={() => handleRoleSwitch(r)}
                                    className={`px-3 py-1.5 rounded-full border mr-2 items-center justify-center ${
                                        role === r
                                            ? "bg-indigo-600 border-indigo-600"
                                            : "bg-slate-100 border-slate-200"
                                    }`}
                                >
                                    <Text
                                        className={`text-xs font-bold ${
                                            role === r
                                                ? "text-white"
                                                : "text-slate-600"
                                        }`}
                                    >
                                        {ROLE_DISPLAY_NAMES[r]}
                                    </Text>
                                </Pressable>
                            ))}
                        </ScrollView>
                    </View>

                    <Divider className="mx-4 mb-2 bg-gray-200" />

                    {/* Navigation Menu */}
                    <View className="flex-1">
                        <ScrollView
                            className="flex-1"
                            showsVerticalScrollIndicator={false}
                        >
                            <Drawer.Section showDivider={false}>
                                <Drawer.Item
                                    icon="home"
                                    label="Home"
                                    active={true}
                                    onPress={() => toggleDrawer(false)}
                                />
                                <Drawer.Item
                                    icon="account"
                                    label="Profile"
                                    onPress={() => toggleDrawer(false)}
                                />

                                {/* Customer Feature */}
                                <PermissionGuard
                                    permission={PERMISSIONS.BOOK_PARKING}
                                >
                                    <Drawer.Item
                                        icon="car"
                                        label="My Bookings"
                                        onPress={() => {
                                            toggleDrawer(false);
                                            navigation.navigate("MyBookings");
                                        }}
                                    />
                                </PermissionGuard>

                                {/* Security Guard / Manager booking operations */}
                                <PermissionGuard
                                    permission={PERMISSIONS.MANAGE_BOOKINGS}
                                >
                                    <Drawer.Item
                                        icon="calendar-check"
                                        label="Check In/Out"
                                        onPress={() => {
                                            toggleDrawer(false);
                                            navigation.navigate("CheckInOut");
                                        }}
                                    />
                                </PermissionGuard>

                                {/* Location Management */}
                                <PermissionGuard
                                    permission={PERMISSIONS.MANAGE_LOCATIONS}
                                >
                                    <Drawer.Item
                                        icon="map-marker-multiple"
                                        label="Manage Parking"
                                        onPress={() => {
                                            toggleDrawer(false);
                                            navigation.navigate("ManageParking");
                                        }}
                                    />
                                </PermissionGuard>

                                {/* User Management */}
                                <PermissionGuard
                                    permission={PERMISSIONS.MANAGE_USERS}
                                >
                                    <Drawer.Item
                                        icon="account-multiple-outline"
                                        label={
                                            role === ROLES.SUPER_ADMIN
                                                ? "Manage Users"
                                                : "Manage Staff"
                                        }
                                        onPress={() => {
                                            toggleDrawer(false);
                                            navigation.navigate("ManageUsers");
                                        }}
                                    />
                                </PermissionGuard>

                                <Drawer.Item
                                    icon="cog"
                                    label="Settings"
                                    onPress={() => toggleDrawer(false)}
                                />
                            </Drawer.Section>
                        </ScrollView>
                    </View>

                    <Drawer.Section className="mb-5 border-t border-gray-100 pt-2">
                        <Drawer.Item
                            icon="logout"
                            label="Sign Out"
                            onPress={handleLogout}
                        />
                    </Drawer.Section>
                </Surface>
            </Animated.View>
        </View>
    );
};

export default Home;
