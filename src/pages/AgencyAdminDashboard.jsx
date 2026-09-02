import React, { useState, useEffect, useCallback } from "react";
import {
    View,
    ScrollView,
    RefreshControl,
    TouchableOpacity,
    ActivityIndicator,
} from "react-native";
import { Text, Surface, Avatar } from "react-native-paper";
import { MaterialDesignIcons } from "@react-native-vector-icons/material-design-icons";
import apiService from "../utils/apiService";
import useRolePermissions from "../hooks/useRolePermissions";
import { imageBaseURL } from "../utils/baseURL";

const AgencyAdminDashboard = ({ navigation, onOpenMap }) => {
    const { user } = useRolePermissions();

    const getImageUrl = (path) => {
        if (!path) return null;
        if (
            path.startsWith("http://") ||
            path.startsWith("https://") ||
            path.startsWith("data:") ||
            path.startsWith("file:")
        ) {
            return path;
        }
        const cleanPath = path.startsWith("uploads/")
            ? path.substring(8)
            : path;
        return `${imageBaseURL}${cleanPath}`;
    };

    const userPhotoPath =
        user?.profile_photo ||
        user?.profile_photo_path ||
        user?.profilePhoto ||
        user?.avatar;
    const profilePhotoUrl = getImageUrl(userPhotoPath);

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [stats, setStats] = useState({
        agencyName: user?.org_name || user?.name || "Agency Admin",
        status: "active",
        walletBalance: 0,
        commissionPercentage: 0,
        twoWheelerCapacity: 0,
        carCapacity: 0,
        suvCapacity: 0,
        evCapacity: 0,
        totalCapacity: 0,
        activeBookings: 0,
        todayBookings: 0,
        totalBookings: 0,
        forceCancelsCount: 0,
        staffCount: 0,
        pendingWithdrawalsCount: 0,
        recentBookings: [],
    });

    const fetchDashboardStats = useCallback(async () => {
        try {
            const response = await apiService.get("dashboard/dashboard-stats");
            if (response?.data) {
                setStats(response.data);
            }
        } catch (error) {
            console.error("Error fetching agency dashboard stats:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchDashboardStats();
    }, [fetchDashboardStats]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchDashboardStats();
    };

    const formatCurrency = (val) => {
        return `₹${Math.max(0, Number(val || 0)).toFixed(2)}`;
    };

    const calculateOccupancyPercent = () => {
        if (!stats.totalCapacity || stats.totalCapacity === 0) return 0;
        return Math.min(
            100,
            Math.round((stats.activeBookings / stats.totalCapacity) * 100)
        );
    };

    const getStatusStyle = (status) => {
        switch (status) {
            case "booked":
                return { bg: "#dbeafe", text: "#1e40af", border: "#bfdbfe" };
            case "checked_in":
                return { bg: "#d1fae5", text: "#065f46", border: "#a7f3d0" };
            case "completed":
                return { bg: "#f1f5f9", text: "#334155", border: "#e2e8f0" };
            case "cancelled":
                return { bg: "#ffe4e6", text: "#9f1239", border: "#fecdd3" };
            default:
                return { bg: "#f3f4f6", text: "#374151", border: "#e5e7eb" };
        }
    };

    return (
        <ScrollView
            className="flex-1 bg-slate-50"
            contentContainerStyle={{ paddingBottom: 40 }}
            refreshControl={
                <RefreshControl
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    colors={["#4338ca"]}
                />
            }
        >
            {loading && !refreshing ? (
                <View className="py-12 items-center justify-center">
                    <ActivityIndicator size="large" color="#4338ca" />
                    <Text className="text-slate-500 mt-3 font-semibold">
                        Loading Agency Statistics...
                    </Text>
                </View>
            ) : (
                <View className="px-4 mt-4">
                    {/* Integrated Agency Admin Header & Revenue Hero Card */}
                    <Surface
                        className="bg-emerald-950 rounded-3xl p-5 mb-5 border border-emerald-800/50 shadow-lg"
                        elevation={4}
                    >
                        {/* Profile & Full Name Header */}
                        <View className="flex-row items-center justify-between">
                            <TouchableOpacity
                                className="flex-row items-center flex-1 mr-2"
                                onPress={() => navigation.navigate("Profile")}
                                activeOpacity={0.8}
                            >
                                <View className="relative">
                                    <View className="w-[46px] h-[46px] rounded-full border border-white/80 items-center justify-center overflow-hidden bg-emerald-900/80 shadow-sm">
                                        {profilePhotoUrl ? (
                                            <Avatar.Image
                                                size={44}
                                                source={{ uri: profilePhotoUrl }}
                                                style={{ backgroundColor: "#064e3b" }}
                                            />
                                        ) : (
                                            <MaterialDesignIcons
                                                name="account"
                                                size={26}
                                                color="#ffffff"
                                            />
                                        )}
                                    </View>
                                    <View className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-400 rounded-full border-2 border-emerald-950" />
                                </View>
                                <View className="ml-3.5 flex-1 justify-center">
                                    <Text
                                        className="text-white text-xl font-extrabold tracking-tight mt-0.5"
                                        numberOfLines={1}
                                    >
                                        {user?.full_name ||
                                            user?.name ||
                                            stats.agencyName ||
                                            "Agency Admin"}
                                    </Text>
                                    {Boolean(user?.username || user?.org_name) && (
                                        <Text className="text-emerald-300 text-[11px] font-bold tracking-wider">
                                            {user?.username ? `@${user.username}` : user?.org_name}
                                        </Text>
                                    )}
                                </View>
                            </TouchableOpacity>

                            <TouchableOpacity
                                className="w-9 h-9 rounded-full bg-emerald-900/80 items-center justify-center border border-emerald-700/60"
                                onPress={() => navigation.navigate("Profile")}
                            >
                                <MaterialDesignIcons
                                    name="chevron-right"
                                    size={20}
                                    color="#a7f3d0"
                                />
                            </TouchableOpacity>
                        </View>

                        {/* Subtle Divider Line */}
                        <View className="h-[1px] bg-emerald-800/60 my-4" />

                        {/* Earnings & Action */}
                        <View className="flex-row items-center justify-between">
                            <View>
                                <Text className="text-emerald-300 text-[11px] font-bold tracking-wider uppercase">
                                    AGENCY NET EARNINGS
                                </Text>
                                <Text className="text-white text-3xl font-extrabold mt-1">
                                    {formatCurrency(stats.walletBalance)}
                                </Text>
                                {stats.commissionPercentage > 0 && (
                                    <Text className="text-emerald-300 text-xs mt-1">
                                        Commission Rate:{" "}
                                        {stats.commissionPercentage}%
                                    </Text>
                                )}
                            </View>
                            <TouchableOpacity
                                className="bg-emerald-600/90 px-4 py-2.5 rounded-2xl flex-row items-center border border-emerald-400/30 shadow-sm"
                                onPress={() => navigation.navigate("Wallet")}
                                activeOpacity={0.8}
                            >
                                <MaterialDesignIcons
                                    name="cash-fast"
                                    size={18}
                                    color="#ffffff"
                                />
                                <Text className="text-white font-bold ml-1.5 text-xs">
                                    Withdraw
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </Surface>

                    {/* Occupancy Card */}
                    <Surface
                        className="bg-white rounded-2xl p-4 mb-4 border border-slate-100"
                        elevation={2}
                    >
                        <View className="flex-row justify-between items-center mb-2">
                            <Text className="text-slate-800 text-sm font-bold">
                                Parking Lot Occupancy
                            </Text>
                            <Text className="text-indigo-700 text-sm font-extrabold">
                                {stats.activeBookings} / {stats.totalCapacity}{" "}
                                Spots
                            </Text>
                        </View>

                        {/* Progress Bar Container */}
                        <View className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden mb-2">
                            <View
                                className="h-full bg-indigo-700 rounded-full"
                                style={{
                                    width: `${calculateOccupancyPercent()}%`,
                                }}
                            />
                        </View>
                        <View className="flex-row justify-between items-center">
                            <Text className="text-slate-500 text-xs font-medium">
                                {calculateOccupancyPercent()}% Occupied
                            </Text>
                            <Text className="text-emerald-600 text-xs font-semibold">
                                {Math.max(
                                    0,
                                    stats.totalCapacity - stats.activeBookings
                                )}{" "}
                                Spots Available
                            </Text>
                        </View>
                    </Surface>

                    {/* Stats Grid */}
                    <View className="flex-row justify-between mb-4">
                        <Surface
                            className="flex-1 bg-white p-3.5 rounded-2xl items-center mx-1 border border-slate-100"
                            elevation={1}
                        >
                            <View className="w-10 h-10 rounded-full justify-center items-center mb-2 bg-blue-100">
                                <MaterialDesignIcons
                                    name="calendar-today"
                                    size={22}
                                    color="#2563eb"
                                />
                            </View>
                            <Text className="text-slate-500 text-[11px] font-semibold text-center">
                                Today's Bookings
                            </Text>
                            <Text className="text-slate-800 text-lg font-bold mt-0.5">
                                {stats.todayBookings}
                            </Text>
                        </Surface>

                        <Surface
                            className="flex-1 bg-white p-3.5 rounded-2xl items-center mx-1 border border-slate-100"
                            elevation={1}
                        >
                            <View className="w-10 h-10 rounded-full justify-center items-center mb-2 bg-purple-100">
                                <MaterialDesignIcons
                                    name="account-group-outline"
                                    size={22}
                                    color="#7c3aed"
                                />
                            </View>
                            <Text className="text-slate-500 text-[11px] font-semibold text-center">
                                Total Staff
                            </Text>
                            <Text className="text-slate-800 text-lg font-bold mt-0.5">
                                {stats.staffCount}
                            </Text>
                        </Surface>

                        <Surface
                            className="flex-1 bg-white p-3.5 rounded-2xl items-center mx-1 border border-slate-100"
                            elevation={1}
                        >
                            <View className="w-10 h-10 rounded-full justify-center items-center mb-2 bg-amber-100">
                                <MaterialDesignIcons
                                    name="history"
                                    size={22}
                                    color="#d97706"
                                />
                            </View>
                            <Text className="text-slate-500 text-[11px] font-semibold text-center">
                                Total Bookings
                            </Text>
                            <Text className="text-slate-800 text-lg font-bold mt-0.5">
                                {stats.totalBookings}
                            </Text>
                        </Surface>

                        <Surface
                            className="flex-1 bg-white p-3.5 rounded-2xl items-center mx-1 border border-slate-100"
                            elevation={1}
                        >
                            <View className="w-10 h-10 rounded-full justify-center items-center mb-2 bg-rose-100">
                                <MaterialDesignIcons
                                    name="cancel"
                                    size={22}
                                    color="#e11d48"
                                />
                            </View>
                            <Text className="text-slate-500 text-[11px] font-semibold text-center">
                                Force Cancels
                            </Text>
                            <Text className="text-rose-600 text-lg font-bold mt-0.5">
                                {stats.forceCancelsCount || 0}
                            </Text>
                        </Surface>
                    </View>

                    {/* Quick Management Tools */}
                    <Text className="text-slate-700 text-base font-bold mb-3">
                        Management Tools
                    </Text>
                    <View className="flex-row flex-wrap justify-between mb-2">
                        <TouchableOpacity
                            className="w-[48%] p-3.5 rounded-2xl mb-3 flex-row items-center bg-indigo-700"
                            onPress={() => navigation.navigate("ManageParking")}
                        >
                            <View className="w-10 h-10 rounded-xl justify-center items-center mr-2.5 bg-white/20">
                                <MaterialDesignIcons
                                    name="parking"
                                    size={24}
                                    color="#ffffff"
                                />
                            </View>
                            <View className="flex-1">
                                <Text className="text-white font-bold text-xs">
                                    Parking Lots
                                </Text>
                                <Text className="text-slate-200 text-[11px]">
                                    Rates & Slots
                                </Text>
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity
                            className="w-[48%] p-3.5 rounded-2xl mb-3 flex-row items-center bg-emerald-600"
                            onPress={() => navigation.navigate("CheckInOut")}
                        >
                            <View className="w-10 h-10 rounded-xl justify-center items-center mr-2.5 bg-white/20">
                                <MaterialDesignIcons
                                    name="qrcode-scan"
                                    size={24}
                                    color="#ffffff"
                                />
                            </View>
                            <View className="flex-1">
                                <Text className="text-white font-bold text-xs">
                                    Check In / Out
                                </Text>
                                <Text className="text-slate-200 text-[11px]">
                                    Verify Code
                                </Text>
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity
                            className="w-[48%] p-3.5 rounded-2xl mb-3 flex-row items-center bg-white border border-slate-200"
                            onPress={() => navigation.navigate("ManageUsers")}
                        >
                            <View className="w-10 h-10 rounded-xl justify-center items-center mr-2.5 bg-purple-100">
                                <MaterialDesignIcons
                                    name="account-supervisor-outline"
                                    size={24}
                                    color="#7c3aed"
                                />
                            </View>
                            <View className="flex-1">
                                <Text className="text-slate-800 font-bold text-xs">
                                    Manage Staff
                                </Text>
                                <Text className="text-slate-500 text-[11px]">
                                    Guards & Accounts
                                </Text>
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity
                            className="w-[48%] p-3.5 rounded-2xl mb-3 flex-row items-center bg-white border border-slate-200"
                            onPress={() => navigation.navigate("WorkingHours")}
                        >
                            <View className="w-10 h-10 rounded-xl justify-center items-center mr-2.5 bg-blue-100">
                                <MaterialDesignIcons
                                    name="clock-outline"
                                    size={24}
                                    color="#2563eb"
                                />
                            </View>
                            <View className="flex-1">
                                <Text className="text-slate-800 font-bold text-xs">
                                    Working Hours
                                </Text>
                                <Text className="text-slate-500 text-[11px]">
                                    Days & Holidays
                                </Text>
                            </View>
                        </TouchableOpacity>


                        {/* Pending Complaints Alert Banner */}
                        {Boolean(stats.pendingComplaintsCount > 0) && (
                            <TouchableOpacity
                                className="mb-4 p-3.5 bg-rose-50 rounded-2xl border border-rose-200 flex-row items-center justify-between"
                                onPress={() =>
                                    navigation.navigate("ManageComplaints")
                                }
                            >
                                <View className="flex-row items-center">
                                    <View className="w-10 h-10 rounded-xl justify-center items-center mr-2.5 bg-rose-100">
                                        <MaterialDesignIcons
                                            name="alert-circle-outline"
                                            size={24}
                                            color="#e11d48"
                                        />
                                    </View>
                                    <View>
                                        <Text className="text-rose-900 font-bold text-xs">
                                            Pending Complaints
                                        </Text>
                                        <Text className="text-rose-600 text-[11px]">
                                            {stats.pendingComplaintsCount} items
                                            require attention
                                        </Text>
                                    </View>
                                </View>
                                <MaterialDesignIcons
                                    name="chevron-right"
                                    size={20}
                                    color="#e11d48"
                                />
                            </TouchableOpacity>
                        )}

                        <TouchableOpacity
                            className="w-[48%] p-3.5 rounded-2xl mb-3 flex-row items-center bg-white border border-slate-200"
                            onPress={() =>
                                navigation.navigate("ManageComplaints")
                            }
                        >
                            <View className="w-10 h-10 rounded-xl justify-center items-center mr-2.5 bg-rose-100">
                                <MaterialDesignIcons
                                    name="alert-circle-outline"
                                    size={24}
                                    color="#e11d48"
                                />
                            </View>
                            <View className="flex-1">
                                <Text className="text-slate-800 font-bold text-xs">
                                    Complaints
                                </Text>
                                <Text className="text-slate-500 text-[11px]">
                                    Review Complaints
                                </Text>
                            </View>
                        </TouchableOpacity>
                    </View>

                    {/* Spot Capacities Breakdown */}
                    <Text className="text-slate-700 text-base font-bold mb-3">
                        Vehicle Slot Breakdown
                    </Text>
                    <View className="flex-row flex-wrap justify-between mb-3">
                        <Surface
                            className="w-[48%] bg-white p-3 rounded-2xl mb-2.5 border border-slate-100 flex-row items-center"
                            elevation={1}
                        >
                            <MaterialDesignIcons
                                name="motorbike"
                                size={26}
                                color="#4338ca"
                            />
                            <View className="ml-3">
                                <Text className="text-slate-500 text-[11px] font-medium">
                                    Two Wheeler
                                </Text>
                                <Text className="text-slate-900 text-sm font-bold mt-0.5">
                                    {stats.twoWheelerCapacity} Spots
                                </Text>
                            </View>
                        </Surface>

                        <Surface
                            className="w-[48%] bg-white p-3 rounded-2xl mb-2.5 border border-slate-100 flex-row items-center"
                            elevation={1}
                        >
                            <MaterialDesignIcons
                                name="car-side"
                                size={26}
                                color="#059669"
                            />
                            <View className="ml-3">
                                <Text className="text-slate-500 text-[11px] font-medium">
                                    Four Wheeler
                                </Text>
                                <Text className="text-slate-900 text-sm font-bold mt-0.5">
                                    {stats.carCapacity} Spots
                                </Text>
                            </View>
                        </Surface>

                        <Surface
                            className="w-[48%] bg-white p-3 rounded-2xl mb-2.5 border border-slate-100 flex-row items-center"
                            elevation={1}
                        >
                            <MaterialDesignIcons
                                name="car-estate"
                                size={26}
                                color="#d97706"
                            />
                            <View className="ml-3">
                                <Text className="text-slate-500 text-[11px] font-medium">
                                    SUV & Vans
                                </Text>
                                <Text className="text-slate-900 text-sm font-bold mt-0.5">
                                    {stats.suvCapacity} Spots
                                </Text>
                            </View>
                        </Surface>

                        <Surface
                            className="w-[48%] bg-white p-3 rounded-2xl mb-2.5 border border-slate-100 flex-row items-center"
                            elevation={1}
                        >
                            <MaterialDesignIcons
                                name="ev-station"
                                size={26}
                                color="#2563eb"
                            />
                            <View className="ml-3">
                                <Text className="text-slate-500 text-[11px] font-medium">
                                    EV Charging
                                </Text>
                                <Text className="text-slate-900 text-sm font-bold mt-0.5">
                                    {stats.evCapacity} Slots
                                </Text>
                            </View>
                        </Surface>
                    </View>

                    {/* Recent Agency Activity */}
                    <View className="flex-row justify-between items-center mt-2 mb-3">
                        <Text className="text-slate-700 text-base font-bold">
                            Recent Agency Activity
                        </Text>
                        <TouchableOpacity
                            onPress={() => navigation.navigate("CheckInOut")}
                        >
                            <Text className="text-indigo-700 font-semibold text-xs">
                                Manage All
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {stats.recentBookings && stats.recentBookings.length > 0 ? (
                        stats.recentBookings.map((b) => {
                            const statusSt = getStatusStyle(b.status);
                            return (
                                <Surface
                                    key={b.booking_id || b.booking_code}
                                    className="bg-white rounded-2xl p-3 mb-2.5 border border-slate-100 flex-row items-center justify-between"
                                    elevation={1}
                                >
                                    <View className="w-9 h-9 rounded-xl bg-slate-100 justify-center items-center mr-3">
                                        <MaterialDesignIcons
                                            name="car-key"
                                            size={22}
                                            color="#475569"
                                        />
                                    </View>
                                    <View className="flex-1 mr-2">
                                        <Text
                                            className="text-slate-800 font-bold text-sm"
                                            numberOfLines={1}
                                        >
                                            {b.user_name || "Customer"}
                                        </Text>
                                        <Text className="text-slate-500 text-xs mt-0.5">
                                            {`Code: ${b.booking_code || ""} • ${
                                                b.vehicle_type || ""
                                            } (${b.vehicle_number || ""})`}
                                        </Text>
                                    </View>
                                    <View
                                        className="px-2.5 py-1 rounded-xl border"
                                        style={{
                                            backgroundColor: statusSt.bg,
                                            borderColor: statusSt.border,
                                        }}
                                    >
                                        <Text
                                            className="text-[10px] font-bold"
                                            style={{ color: statusSt.text }}
                                        >
                                            {(b.status || "").toUpperCase()}
                                        </Text>
                                    </View>
                                </Surface>
                            );
                        })
                    ) : (
                        <Surface
                            className="bg-white rounded-2xl p-6 items-center justify-center border border-slate-100"
                            elevation={1}
                        >
                            <MaterialDesignIcons
                                name="calendar-remove"
                                size={36}
                                color="#cbd5e1"
                            />
                            <Text className="text-slate-400 text-xs font-medium mt-2">
                                No agency bookings found yet
                            </Text>
                        </Surface>
                    )}
                </View>
            )}
        </ScrollView>
    );
};

export default AgencyAdminDashboard;
