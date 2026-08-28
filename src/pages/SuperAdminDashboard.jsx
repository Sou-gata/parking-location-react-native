import React, { useState, useEffect, useCallback } from "react";
import {
    View,
    ScrollView,
    RefreshControl,
    TouchableOpacity,
    ActivityIndicator,
} from "react-native";
import { Text, Surface } from "react-native-paper";
import { MaterialDesignIcons } from "@react-native-vector-icons/material-design-icons";
import apiService from "../utils/apiService";
import SendNotificationModal from "../components/SendNotificationModal";

const SuperAdminDashboard = ({ navigation, onOpenMap }) => {
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [sendNotificationVisible, setSendNotificationVisible] = useState(false);
    const [stats, setStats] = useState({
        totalUsers: 0,
        totalAgencies: 0,
        pendingAgenciesCount: 0,
        pendingTopupsCount: 0,
        pendingWithdrawalsCount: 0,
        pendingWorkingHoursCount: 0,
        totalBookings: 0,
        forceCancelsCount: 0,
        totalAdminRevenue: 0,
        totalVolume: 0,
        recentAgencies: [],
    });

    const fetchDashboardStats = useCallback(async () => {
        try {
            const response = await apiService.get("dashboard/dashboard-stats");
            let whCount = 0;
            try {
                const whRes = await apiService.get("working-hours/pending");
                if (whRes?.success && Array.isArray(whRes.data)) {
                    whCount = whRes.data.length;
                }
            } catch (whErr) {
                console.error(
                    "Error fetching pending working hours count:",
                    whErr
                );
            }

            if (response?.data) {
                setStats({
                    ...response.data,
                    pendingWorkingHoursCount: whCount,
                });
            }
        } catch (error) {
            console.error("Error fetching super admin dashboard stats:", error);
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

    const getAgencyStatusStyle = (status) => {
        switch (status) {
            case "active":
                return { bg: "#d1fae5", text: "#065f46", border: "#a7f3d0" };
            case "pending":
                return { bg: "#fef3c7", text: "#92400e", border: "#fde68a" };
            case "rejected":
                return { bg: "#ffe4e6", text: "#9f1239", border: "#fecdd3" };
            default:
                return { bg: "#f1f5f9", text: "#334155", border: "#e2e8f0" };
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
                        Loading Platform Statistics...
                    </Text>
                </View>
            ) : (
                <View className="px-4 mt-4">
                    {/* Revenue Hero Card */}
                    <Surface
                        className="bg-indigo-900 rounded-2xl p-5 mb-4"
                        elevation={3}
                    >
                        <View className="flex-row items-center justify-between">
                            <View>
                                <Text className="text-indigo-200 text-[11px] font-bold tracking-wider">
                                    PLATFORM COMMISSION REVENUE
                                </Text>
                                <Text className="text-white text-3xl font-extrabold mt-1">
                                    {formatCurrency(stats.totalAdminRevenue)}
                                </Text>
                                <Text className="text-indigo-300 text-xs mt-1">
                                    Total Volume:{" "}
                                    {formatCurrency(stats.totalVolume)}
                                </Text>
                            </View>
                            <TouchableOpacity
                                className="bg-white/20 px-3.5 py-2 rounded-xl flex-row items-center border border-white/30"
                                onPress={() =>
                                    navigation.navigate("ManageUsers", {
                                        initialTab: "history",
                                    })
                                }
                            >
                                <MaterialDesignIcons
                                    name="chart-box-outline"
                                    size={18}
                                    color="#ffffff"
                                />
                                <Text className="text-white font-bold ml-1.5 text-xs">
                                    Reports
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </Surface>{" "}
                    {/* Attention Required Cards */}
                    {(stats.pendingAgenciesCount > 0 ||
                        stats.pendingTopupsCount > 0 ||
                        stats.pendingWithdrawalsCount > 0 ||
                        stats.pendingSettlementsCount > 0 ||
                        stats.pendingWorkingHoursCount > 0) && (
                        <View className="mb-4">
                            <Text className="text-slate-700 text-base font-bold mb-3">
                                Attention Required
                            </Text>

                            {stats.pendingSettlementsCount > 0 && (
                                <TouchableOpacity
                                    className="rounded-2xl p-3.5 mb-2.5 flex-row items-center justify-between border bg-purple-50 border-purple-200"
                                    onPress={() =>
                                        navigation.navigate("ManageUsers", {
                                            initialTab: "agency_settlements",
                                        })
                                    }
                                >
                                    <View className="flex-row items-center flex-1 mr-2.5">
                                        <View className="w-9.5 h-9.5 rounded-xl justify-center items-center mr-3 bg-purple-200">
                                            <MaterialDesignIcons
                                                name="cash-clock"
                                                size={20}
                                                color="#6b21a8"
                                            />
                                        </View>
                                        <View className="flex-1">
                                            <Text className="font-bold text-xs text-purple-950">
                                                {stats.pendingSettlementsCount}{" "}
                                                Pending Revenue Settlement
                                                {stats.pendingSettlementsCount >
                                                1
                                                    ? "s"
                                                    : ""}
                                            </Text>
                                            <Text className="text-[11px] mt-0.5 text-purple-800">
                                                Approve parking owner earnings &
                                                custom split
                                            </Text>
                                        </View>
                                    </View>
                                    <MaterialDesignIcons
                                        name="chevron-right"
                                        size={20}
                                        color="#6b21a8"
                                    />
                                </TouchableOpacity>
                            )}

                            {stats.pendingWorkingHoursCount > 0 && (
                                <TouchableOpacity
                                    className="rounded-2xl p-3.5 mb-2.5 flex-row items-center justify-between border bg-blue-50 border-blue-200"
                                    onPress={() =>
                                        navigation.navigate("ManageUsers", {
                                            initialTab: "working_hours",
                                        })
                                    }
                                >
                                    <View className="flex-row items-center flex-1 mr-2.5">
                                        <View className="w-9.5 h-9.5 rounded-xl justify-center items-center mr-3 bg-blue-200">
                                            <MaterialDesignIcons
                                                name="clock-alert-outline"
                                                size={20}
                                                color="#1d4ed8"
                                            />
                                        </View>
                                        <View className="flex-1">
                                            <Text className="font-bold text-xs text-blue-950">
                                                {stats.pendingWorkingHoursCount}{" "}
                                                Pending Working Hours Change
                                                {stats.pendingWorkingHoursCount >
                                                1
                                                    ? "s"
                                                    : ""}
                                            </Text>
                                            <Text className="text-[11px] mt-0.5 text-blue-800">
                                                Review operating hours & holiday
                                                schedule updates
                                            </Text>
                                        </View>
                                    </View>
                                    <MaterialDesignIcons
                                        name="chevron-right"
                                        size={20}
                                        color="#1d4ed8"
                                    />
                                </TouchableOpacity>
                            )}

                            {stats.pendingAgenciesCount > 0 && (
                                <TouchableOpacity
                                    className="rounded-2xl p-3.5 mb-2.5 flex-row items-center justify-between border bg-amber-50 border-amber-200"
                                    onPress={() =>
                                        navigation.navigate("ManageUsers", {
                                            initialTab: "requests",
                                        })
                                    }
                                >
                                    <View className="flex-row items-center flex-1 mr-2.5">
                                        <View className="w-9.5 h-9.5 rounded-xl justify-center items-center mr-3 bg-amber-100">
                                            <MaterialDesignIcons
                                                name="office-building"
                                                size={20}
                                                color="#b45309"
                                            />
                                        </View>
                                        <View className="flex-1">
                                            <Text className="font-bold text-xs text-amber-900">
                                                {stats.pendingAgenciesCount}{" "}
                                                Pending Agency Registration
                                                {stats.pendingAgenciesCount > 1
                                                    ? "s"
                                                    : ""}
                                            </Text>
                                            <Text className="text-[11px] mt-0.5 text-amber-800">
                                                Review verification documents &
                                                approve
                                            </Text>
                                        </View>
                                    </View>
                                    <MaterialDesignIcons
                                        name="chevron-right"
                                        size={20}
                                        color="#b45309"
                                    />
                                </TouchableOpacity>
                            )}

                            {stats.pendingTopupsCount > 0 && (
                                <TouchableOpacity
                                    className="rounded-2xl p-3.5 mb-2.5 flex-row items-center justify-between border bg-indigo-50 border-indigo-200"
                                    onPress={() =>
                                        navigation.navigate("ManageUsers", {
                                            initialTab: "user_wallets",
                                        })
                                    }
                                >
                                    <View className="flex-row items-center flex-1 mr-2.5">
                                        <View className="w-9.5 h-9.5 rounded-xl justify-center items-center mr-3 bg-indigo-200">
                                            <MaterialDesignIcons
                                                name="wallet-plus-outline"
                                                size={20}
                                                color="#4338ca"
                                            />
                                        </View>
                                        <View className="flex-1">
                                            <Text className="font-bold text-xs text-indigo-950">
                                                {stats.pendingTopupsCount}{" "}
                                                Pending Wallet Topup
                                                {stats.pendingTopupsCount > 1
                                                    ? "s"
                                                    : ""}
                                            </Text>
                                            <Text className="text-[11px] mt-0.5 text-indigo-900">
                                                Verify payment reference &
                                                approve balance
                                            </Text>
                                        </View>
                                    </View>
                                    <MaterialDesignIcons
                                        name="chevron-right"
                                        size={20}
                                        color="#4338ca"
                                    />
                                </TouchableOpacity>
                            )}

                            {stats.pendingWithdrawalsCount > 0 && (
                                <TouchableOpacity
                                    className="rounded-2xl p-3.5 mb-2.5 flex-row items-center justify-between border bg-emerald-50 border-emerald-200"
                                    onPress={() =>
                                        navigation.navigate("ManageUsers", {
                                            initialTab: "agency_withdrawals",
                                        })
                                    }
                                >
                                    <View className="flex-row items-center flex-1 mr-2.5">
                                        <View className="w-9.5 h-9.5 rounded-xl justify-center items-center mr-3 bg-emerald-200">
                                            <MaterialDesignIcons
                                                name="cash-refund"
                                                size={20}
                                                color="#047857"
                                            />
                                        </View>
                                        <View className="flex-1">
                                            <Text className="font-bold text-xs text-emerald-950">
                                                {stats.pendingWithdrawalsCount}{" "}
                                                Pending Agency Withdrawal
                                                {stats.pendingWithdrawalsCount >
                                                1
                                                    ? "s"
                                                    : ""}
                                            </Text>
                                            <Text className="text-[11px] mt-0.5 text-emerald-700">
                                                Process agency payout requests
                                            </Text>
                                        </View>
                                    </View>
                                    <MaterialDesignIcons
                                        name="chevron-right"
                                        size={20}
                                        color="#047857"
                                    />
                                </TouchableOpacity>
                            )}
                        </View>
                    )}
                    {/* Master Overview Grid */}
                    <Text className="text-slate-700 text-base font-bold mb-3">
                        Platform Overview
                    </Text>
                    <View className="flex-row flex-wrap justify-between mb-2">
                        <Surface
                            className="w-[48%] bg-white p-3.5 rounded-2xl mb-3 items-center border border-slate-100"
                            elevation={1}
                        >
                            <View className="w-10 h-10 rounded-full justify-center items-center mb-2 bg-indigo-100">
                                <MaterialDesignIcons
                                    name="account-group"
                                    size={22}
                                    color="#4338ca"
                                />
                            </View>
                            <Text className="text-slate-500 text-[11px] font-semibold">
                                Total Customers
                            </Text>
                            <Text className="text-slate-900 text-2xl font-extrabold mt-0.5">
                                {stats.totalUsers}
                            </Text>
                        </Surface>

                        <Surface
                            className="w-[48%] bg-white p-3.5 rounded-2xl mb-3 items-center border border-slate-100"
                            elevation={1}
                        >
                            <View className="w-10 h-10 rounded-full justify-center items-center mb-2 bg-emerald-100">
                                <MaterialDesignIcons
                                    name="domain"
                                    size={22}
                                    color="#059669"
                                />
                            </View>
                            <Text className="text-slate-500 text-[11px] font-semibold">
                                Partner Agencies
                            </Text>
                            <Text className="text-slate-900 text-2xl font-extrabold mt-0.5">
                                {stats.totalAgencies}
                            </Text>
                        </Surface>

                        <Surface
                            className="w-[48%] bg-white p-3.5 rounded-2xl mb-3 items-center border border-slate-100"
                            elevation={1}
                        >
                            <View className="w-10 h-10 rounded-full justify-center items-center mb-2 bg-blue-100">
                                <MaterialDesignIcons
                                    name="calendar-check"
                                    size={22}
                                    color="#2563eb"
                                />
                            </View>
                            <Text className="text-slate-500 text-[11px] font-semibold">
                                Platform Bookings
                            </Text>
                            <Text className="text-slate-900 text-2xl font-extrabold mt-0.5">
                                {stats.totalBookings}
                            </Text>
                        </Surface>

                        <Surface
                            className="w-[48%] bg-white p-3.5 rounded-2xl mb-3 items-center border border-slate-100"
                            elevation={1}
                        >
                            <View className="w-10 h-10 rounded-full justify-center items-center mb-2 bg-rose-100">
                                <MaterialDesignIcons
                                    name="cancel"
                                    size={22}
                                    color="#e11d48"
                                />
                            </View>
                            <Text className="text-slate-500 text-[11px] font-semibold">
                                Force Cancels
                            </Text>
                            <Text className="text-rose-600 text-2xl font-extrabold mt-0.5">
                                {stats.forceCancelsCount || 0}
                            </Text>
                        </Surface>

                        <Surface
                            className="w-[48%] bg-white p-3.5 rounded-2xl mb-3 items-center border border-slate-100"
                            elevation={1}
                        >
                            <View className="w-10 h-10 rounded-full justify-center items-center mb-2 bg-purple-100">
                                <MaterialDesignIcons
                                    name="shield-check-outline"
                                    size={22}
                                    color="#7c3aed"
                                />
                            </View>
                            <Text className="text-slate-500 text-[11px] font-semibold">
                                System Status
                            </Text>
                            <Text className="text-emerald-600 text-sm font-extrabold mt-1">
                                Operational
                            </Text>
                        </Surface>
                    </View>
                    {/* Admin Controls */}
                    <Text className="text-slate-700 text-base font-bold mb-3">
                        Admin Controls
                    </Text>
                    <View className="flex-row flex-wrap justify-between mb-2">
                        <TouchableOpacity
                            className="w-[48%] p-3.5 rounded-2xl mb-3 flex-row items-center bg-indigo-700"
                            onPress={() =>
                                navigation.navigate("ManageUsers", {
                                    initialTab: "active",
                                })
                            }
                        >
                            <View className="w-10 h-10 rounded-xl justify-center items-center mr-2.5 bg-white/20">
                                <MaterialDesignIcons
                                    name="account-cog-outline"
                                    size={24}
                                    color="#ffffff"
                                />
                            </View>
                            <View className="flex-1">
                                <Text className="text-white font-bold text-xs">
                                    Manage Users
                                </Text>
                                <Text className="text-indigo-200 text-[11px]">
                                    Agencies & Staff
                                </Text>
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity
                            className="w-[48%] p-3.5 rounded-2xl mb-3 flex-row items-center bg-emerald-600"
                            onPress={() =>
                                navigation.navigate("ManageUsers", {
                                    initialTab: "user_wallets",
                                })
                            }
                        >
                            <View className="w-10 h-10 rounded-xl justify-center items-center mr-2.5 bg-white/20">
                                <MaterialDesignIcons
                                    name="cash-register"
                                    size={24}
                                    color="#ffffff"
                                />
                            </View>
                            <View className="flex-1">
                                <Text className="text-white font-bold text-xs">
                                    Wallet Requests
                                </Text>
                                <Text className="text-slate-200 text-[11px]">
                                    Topups & Payouts
                                </Text>
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity
                            className="w-[48%] p-3.5 rounded-2xl mb-3 flex-row items-center bg-white border border-slate-200"
                            onPress={() =>
                                navigation.navigate("SuperAdminSettings")
                            }
                        >
                            <View className="w-10 h-10 rounded-xl justify-center items-center mr-2.5 bg-amber-100">
                                <MaterialDesignIcons
                                    name="cog-outline"
                                    size={24}
                                    color="#d97706"
                                />
                            </View>
                            <View className="flex-1">
                                <Text className="text-slate-800 font-bold text-xs">
                                    System Settings
                                </Text>
                                <Text className="text-slate-500 text-[11px]">
                                    UPI & Configs
                                </Text>
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity
                            className="w-[48%] p-3.5 rounded-2xl mb-3 flex-row items-center bg-white border border-slate-200"
                            onPress={onOpenMap}
                        >
                            <View className="w-10 h-10 rounded-xl justify-center items-center mr-2.5 bg-emerald-100">
                                <MaterialDesignIcons
                                    name="map-search"
                                    size={24}
                                    color="#059669"
                                />
                            </View>
                            <View className="flex-1">
                                <Text className="text-slate-800 font-bold text-xs">
                                    Global Map
                                </Text>
                                <Text className="text-slate-500 text-[11px]">
                                    All Locations
                                </Text>
                            </View>
                        </TouchableOpacity>

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
                                    All Complaints
                                </Text>
                                <Text className="text-slate-500 text-[11px]">
                                    User & Agency Issues
                                </Text>
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity
                            className="w-[48%] p-3.5 rounded-2xl mb-3 flex-row items-center bg-white border border-slate-200"
                            onPress={() => setSendNotificationVisible(true)}
                        >
                            <View className="w-10 h-10 rounded-xl justify-center items-center mr-2.5 bg-indigo-100">
                                <MaterialDesignIcons
                                    name="bell-ring-outline"
                                    size={24}
                                    color="#4338ca"
                                />
                            </View>
                            <View className="flex-1">
                                <Text className="text-slate-800 font-bold text-xs">
                                    Send Push
                                </Text>
                                <Text className="text-slate-500 text-[11px]">
                                    FCM Notification
                                </Text>
                            </View>
                        </TouchableOpacity>
                    </View>
                    {/* Recent Partner Agencies */}
                    <View className="flex-row justify-between items-center mt-2 mb-3">
                        <Text className="text-slate-700 text-base font-bold">
                            Recent Partner Agencies
                        </Text>
                        <TouchableOpacity
                            onPress={() => navigation.navigate("ManageUsers")}
                        >
                            <Text className="text-indigo-700 font-semibold text-xs">
                                View All
                            </Text>
                        </TouchableOpacity>
                    </View>
                    {stats.recentAgencies && stats.recentAgencies.length > 0 ? (
                        stats.recentAgencies.map((a) => {
                            const statusSt = getAgencyStatusStyle(a.status);
                            return (
                                <Surface
                                    key={a.org_id}
                                    className="bg-white rounded-2xl p-3 mb-2.5 border border-slate-100 flex-row items-center justify-between"
                                    elevation={1}
                                >
                                    <View className="w-9 h-9 rounded-xl bg-slate-100 justify-center items-center mr-3">
                                        <MaterialDesignIcons
                                            name="office-building"
                                            size={22}
                                            color="#475569"
                                        />
                                    </View>
                                    <View className="flex-1 mr-2">
                                        <Text
                                            className="text-slate-800 font-bold text-sm"
                                            numberOfLines={1}
                                        >
                                            {a.org_name}
                                        </Text>
                                        <Text className="text-slate-500 text-xs mt-0.5">
                                            {`${a.email || ""} • ${
                                                a.phone_number || "N/A"
                                            }`}
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
                                            {(a.status || "").toUpperCase()}
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
                                name="domain-off"
                                size={36}
                                color="#cbd5e1"
                            />
                            <Text className="text-slate-400 text-xs font-medium mt-2">
                                No registered agencies found
                            </Text>
                        </Surface>
                    )}
                </View>
            )}

            {/* Send Push Notification Modal */}
            <SendNotificationModal
                visible={sendNotificationVisible}
                onClose={() => setSendNotificationVisible(false)}
            />
        </ScrollView>
    );
};

export default SuperAdminDashboard;
