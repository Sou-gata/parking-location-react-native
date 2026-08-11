import React, { useState, useEffect, useCallback } from "react";
import {
    View,
    ScrollView,
    RefreshControl,
    TouchableOpacity,
    ActivityIndicator,
} from "react-native";
import { Text, Surface, Button } from "react-native-paper";
import { useSelector } from "react-redux";
import { MaterialDesignIcons } from "@react-native-vector-icons/material-design-icons";
import apiService from "../utils/apiService";

const UserDashboard = ({ navigation, onOpenMap }) => {
    const reduxWalletBalance = useSelector((state) => state.user.walletBalance);

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [stats, setStats] = useState({
        walletBalance: reduxWalletBalance || 0,
        totalBookings: 0,
        activeBookings: 0,
        completedBookings: 0,
        totalSpent: 0,
        activeBooking: null,
        recentBookings: [],
    });

    const fetchDashboardStats = useCallback(async () => {
        try {
            const response = await apiService.get("users/dashboard-stats");
            if (response?.data) {
                setStats(response.data);
            }
        } catch (error) {
            console.error("Error fetching user dashboard stats:", error);
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
                        Loading Dashboard...
                    </Text>
                </View>
            ) : (
                <View className="px-4 mt-4">
                    {/* Wallet Balance Hero Card */}
                    <Surface
                        className="bg-indigo-900 rounded-2xl p-5 mb-4"
                        elevation={3}
                    >
                        <View className="flex-row items-center justify-between">
                            <View>
                                <Text className="text-indigo-200 text-[11px] font-bold tracking-wider">
                                    WALLET BALANCE
                                </Text>
                                <Text className="text-white text-3xl font-extrabold mt-1">
                                    {formatCurrency(stats.walletBalance)}
                                </Text>
                            </View>
                            <TouchableOpacity
                                className="bg-white/20 px-3.5 py-2 rounded-xl flex-row items-center border border-white/30"
                                onPress={() => navigation.navigate("Wallet")}
                            >
                                <MaterialDesignIcons
                                    name="plus-circle"
                                    size={18}
                                    color="#ffffff"
                                />
                                <Text className="text-white font-bold ml-1.5 text-xs">
                                    Top Up
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </Surface>

                    {/* Stats Grid */}
                    <View className="flex-row justify-between mb-4">
                        <Surface
                            className="flex-1 bg-white p-3.5 rounded-2xl items-center mx-1 border border-slate-100"
                            elevation={1}
                        >
                            <View className="w-10 h-10 rounded-full justify-center items-center mb-2 bg-indigo-100">
                                <MaterialDesignIcons
                                    name="car-back"
                                    size={22}
                                    color="#4338ca"
                                />
                            </View>
                            <Text className="text-slate-500 text-[11px] font-semibold">
                                Active
                            </Text>
                            <Text className="text-slate-800 text-lg font-bold mt-0.5">
                                {stats.activeBookings}
                            </Text>
                        </Surface>

                        <Surface
                            className="flex-1 bg-white p-3.5 rounded-2xl items-center mx-1 border border-slate-100"
                            elevation={1}
                        >
                            <View className="w-10 h-10 rounded-full justify-center items-center mb-2 bg-emerald-100">
                                <MaterialDesignIcons
                                    name="format-list-bulleted"
                                    size={22}
                                    color="#059669"
                                />
                            </View>
                            <Text className="text-slate-500 text-[11px] font-semibold">
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
                            <View className="w-10 h-10 rounded-full justify-center items-center mb-2 bg-amber-100">
                                <MaterialDesignIcons
                                    name="cash-multiple"
                                    size={22}
                                    color="#d97706"
                                />
                            </View>
                            <Text className="text-slate-500 text-[11px] font-semibold">
                                Total Spent
                            </Text>
                            <Text className="text-slate-800 text-lg font-bold mt-0.5">
                                {formatCurrency(stats.totalSpent)}
                            </Text>
                        </Surface>
                    </View>

                    {/* Active Booking Banner */}
                    {stats.activeBooking && (
                        <Surface
                            className="bg-white rounded-2xl p-4 mb-4 border-l-4 border-l-indigo-700 border border-slate-100"
                            elevation={2}
                        >
                            <View className="flex-row justify-between items-start">
                                <View className="flex-1">
                                    <Text className="text-slate-900 text-base font-bold">
                                        {stats.activeBooking.agency_name}
                                    </Text>
                                    <Text className="text-slate-500 text-xs mt-1">
                                        Code: {stats.activeBooking.booking_code}{" "}
                                        • {stats.activeBooking.vehicle_type} (
                                        {stats.activeBooking.vehicle_number})
                                    </Text>
                                </View>
                                <View
                                    className="px-2.5 py-1 rounded-xl border"
                                    style={{
                                        backgroundColor: getStatusStyle(
                                            stats.activeBooking.status
                                        ).bg,
                                        borderColor: getStatusStyle(
                                            stats.activeBooking.status
                                        ).border,
                                    }}
                                >
                                    <Text
                                        className="text-[10px] font-bold"
                                        style={{
                                            color: getStatusStyle(
                                                stats.activeBooking.status
                                            ).text,
                                        }}
                                    >
                                        {stats.activeBooking.status.toUpperCase()}
                                    </Text>
                                </View>
                            </View>

                            {stats.activeBooking.otp && (
                                <View className="bg-indigo-100 p-2.5 rounded-xl flex-row justify-between items-center mt-3">
                                    <Text className="text-indigo-900 text-xs font-semibold">
                                        Check-In OTP Code:
                                    </Text>
                                    <Text className="text-indigo-950 text-base font-extrabold tracking-widest">
                                        {stats.activeBooking.otp}
                                    </Text>
                                </View>
                            )}
                        </Surface>
                    )}

                    {/* Quick Actions Grid */}
                    <Text className="text-slate-700 text-base font-bold mb-3">
                        Quick Actions
                    </Text>
                    <View className="flex-row flex-wrap justify-between mb-2">
                        <TouchableOpacity
                            className="w-[48%] p-3.5 rounded-2xl mb-3 flex-row items-center bg-indigo-700"
                            onPress={onOpenMap}
                        >
                            <View className="w-10 h-10 rounded-xl justify-center items-center mr-2.5 bg-white/20">
                                <MaterialDesignIcons
                                    name="map-marker-radius"
                                    size={24}
                                    color="#ffffff"
                                />
                            </View>
                            <View className="flex-1">
                                <Text className="text-white font-bold text-xs">
                                    Find Parking
                                </Text>
                                <Text className="text-indigo-200 text-[11px]">
                                    Open Map View
                                </Text>
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity
                            className="w-[48%] p-3.5 rounded-2xl mb-3 flex-row items-center bg-white border border-slate-200"
                            onPress={() => navigation.navigate("MyBookings")}
                        >
                            <View className="w-10 h-10 rounded-xl justify-center items-center mr-2.5 bg-emerald-100">
                                <MaterialDesignIcons
                                    name="calendar-clock"
                                    size={24}
                                    color="#059669"
                                />
                            </View>
                            <View className="flex-1">
                                <Text className="text-slate-800 font-bold text-xs">
                                    My Bookings
                                </Text>
                                <Text className="text-slate-500 text-[11px]">
                                    History & Status
                                </Text>
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity
                            className="w-[48%] p-3.5 rounded-2xl mb-3 flex-row items-center bg-white border border-slate-200"
                            onPress={() => navigation.navigate("Wallet")}
                        >
                            <View className="w-10 h-10 rounded-xl justify-center items-center mr-2.5 bg-amber-100">
                                <MaterialDesignIcons
                                    name="wallet-outline"
                                    size={24}
                                    color="#d97706"
                                />
                            </View>
                            <View className="flex-1">
                                <Text className="text-slate-800 font-bold text-xs">
                                    My Wallet
                                </Text>
                                <Text className="text-slate-500 text-[11px]">
                                    Balance & Payments
                                </Text>
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity
                            className="w-[48%] p-3.5 rounded-2xl mb-3 flex-row items-center bg-white border border-slate-200"
                            onPress={() => navigation.navigate("Profile")}
                        >
                            <View className="w-10 h-10 rounded-xl justify-center items-center mr-2.5 bg-purple-100">
                                <MaterialDesignIcons
                                    name="account-cog-outline"
                                    size={24}
                                    color="#7c3aed"
                                />
                            </View>
                            <View className="flex-1">
                                <Text className="text-slate-800 font-bold text-xs">
                                    My Profile
                                </Text>
                                <Text className="text-slate-500 text-[11px]">
                                    Account Info
                                </Text>
                            </View>
                        </TouchableOpacity>
                    </View>

                    {/* Recent Bookings */}
                    <View className="flex-row justify-between items-center mt-2 mb-3">
                        <Text className="text-slate-700 text-base font-bold">
                            Recent Bookings
                        </Text>
                        <TouchableOpacity
                            onPress={() => navigation.navigate("MyBookings")}
                        >
                            <Text className="text-indigo-700 font-semibold text-xs">
                                View All
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
                                            name="car"
                                            size={22}
                                            color="#475569"
                                        />
                                    </View>
                                    <View className="flex-1 mr-2">
                                        <Text
                                            className="text-slate-800 font-bold text-sm"
                                            numberOfLines={1}
                                        >
                                            {b.agency_name}
                                        </Text>
                                        <Text className="text-slate-500 text-xs mt-0.5">
                                            {b.vehicle_type} ({b.vehicle_number}
                                            ) • {formatCurrency(b.total_bill)}
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
                                            {b.status.toUpperCase()}
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
                                name="car-off"
                                size={36}
                                color="#cbd5e1"
                            />
                            <Text className="text-slate-400 text-xs font-medium mt-2">
                                No bookings found yet
                            </Text>
                            <Button
                                mode="contained"
                                onPress={onOpenMap}
                                className="mt-3 bg-indigo-700 rounded-xl"
                                labelStyle={{
                                    fontWeight: "bold",
                                    fontSize: 12,
                                }}
                            >
                                Find Nearby Parking
                            </Button>
                        </Surface>
                    )}
                </View>
            )}
        </ScrollView>
    );
};

export default UserDashboard;
