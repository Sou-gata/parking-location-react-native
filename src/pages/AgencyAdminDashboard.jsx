import React, { useState, useEffect, useCallback } from "react";
import {
    View,
    ScrollView,
    RefreshControl,
    TouchableOpacity,
    ActivityIndicator,
    StyleSheet,
} from "react-native";
import { Text, Surface, Avatar, Button } from "react-native-paper";
import { useSelector } from "react-redux";
import { MaterialDesignIcons } from "@react-native-vector-icons/material-design-icons";
import apiService from "../utils/apiService";

const AgencyAdminDashboard = ({ navigation, onOpenMap }) => {
    const user = useSelector((state) => state.user.user);

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
        staffCount: 0,
        pendingWithdrawalsCount: 0,
        recentBookings: [],
    });

    const fetchDashboardStats = useCallback(async () => {
        try {
            const response = await apiService.get("users/dashboard-stats");
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
        return Math.min(100, Math.round((stats.activeBookings / stats.totalCapacity) * 100));
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
            style={styles.container}
            contentContainerStyle={styles.scrollContent}
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#4338ca"]} />
            }
        >
            {loading && !refreshing ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#4338ca" />
                    <Text style={styles.loadingText}>Loading Agency Statistics...</Text>
                </View>
            ) : (
                <View style={styles.body}>
                    {/* Revenue / Wallet Card */}
                    <Surface style={styles.revenueCard} elevation={3}>
                        <View style={styles.revenueRow}>
                            <View>
                                <Text style={styles.revenueLabel}>AGENCY NET EARNINGS</Text>
                                <Text style={styles.revenueAmount}>
                                    {formatCurrency(stats.walletBalance)}
                                </Text>
                                {stats.commissionPercentage > 0 && (
                                    <Text style={styles.commissionText}>
                                        Commission Rate: {stats.commissionPercentage}%
                                    </Text>
                                )}
                            </View>
                            <TouchableOpacity
                                style={styles.withdrawBtn}
                                onPress={() => navigation.navigate("Wallet")}
                            >
                                <MaterialDesignIcons name="cash-fast" size={18} color="#ffffff" />
                                <Text style={styles.withdrawBtnText}>Withdraw</Text>
                            </TouchableOpacity>
                        </View>
                    </Surface>

                    {/* Occupancy Card */}
                    <Surface style={styles.occupancyCard} elevation={2}>
                        <View style={styles.occupancyHeader}>
                            <Text style={styles.cardHeaderTitle}>Parking Lot Occupancy</Text>
                            <Text style={styles.occupancyCount}>
                                {stats.activeBookings} / {stats.totalCapacity} Spots
                            </Text>
                        </View>

                        {/* Progress Bar Container */}
                        <View style={styles.progressBarTrack}>
                            <View
                                style={[
                                    styles.progressBarFill,
                                    { width: `${calculateOccupancyPercent()}%` },
                                ]}
                            />
                        </View>
                        <View style={styles.occupancySubRow}>
                            <Text style={styles.occupancySubText}>
                                {calculateOccupancyPercent()}% Occupied
                            </Text>
                            <Text style={styles.availableText}>
                                {Math.max(0, stats.totalCapacity - stats.activeBookings)} Spots Available
                            </Text>
                        </View>
                    </Surface>

                    {/* Stats Grid */}
                    <View style={styles.statsRow}>
                        <Surface style={styles.statCard} elevation={1}>
                            <View style={[styles.iconCircle, { backgroundColor: "#dbeafe" }]}>
                                <MaterialDesignIcons name="calendar-today" size={22} color="#2563eb" />
                            </View>
                            <Text style={styles.statLabel}>Today's Bookings</Text>
                            <Text style={styles.statValue}>{stats.todayBookings}</Text>
                        </Surface>

                        <Surface style={styles.statCard} elevation={1}>
                            <View style={[styles.iconCircle, { backgroundColor: "#f3e8ff" }]}>
                                <MaterialDesignIcons name="account-group-outline" size={22} color="#7c3aed" />
                            </View>
                            <Text style={styles.statLabel}>Total Staff</Text>
                            <Text style={styles.statValue}>{stats.staffCount}</Text>
                        </Surface>

                        <Surface style={styles.statCard} elevation={1}>
                            <View style={[styles.iconCircle, { backgroundColor: "#fef3c7" }]}>
                                <MaterialDesignIcons name="history" size={22} color="#d97706" />
                            </View>
                            <Text style={styles.statLabel}>Total Bookings</Text>
                            <Text style={styles.statValue}>{stats.totalBookings}</Text>
                        </Surface>
                    </View>

                    {/* Quick Management Tools */}
                    <Text style={styles.sectionHeader}>Management Tools</Text>
                    <View style={styles.actionGrid}>
                        <TouchableOpacity
                            style={[styles.actionCard, { backgroundColor: "#4338ca" }]}
                            onPress={() => navigation.navigate("ManageParking")}
                        >
                            <View style={[styles.actionIconBox, { backgroundColor: "rgba(255,255,255,0.2)" }]}>
                                <MaterialDesignIcons name="parking" size={24} color="#ffffff" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.actionCardTitleWhite}>Parking Lots</Text>
                                <Text style={styles.actionCardSubWhite}>Rates & Slots</Text>
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.actionCard, { backgroundColor: "#059669" }]}
                            onPress={() => navigation.navigate("CheckInOut")}
                        >
                            <View style={[styles.actionIconBox, { backgroundColor: "rgba(255,255,255,0.2)" }]}>
                                <MaterialDesignIcons name="qrcode-scan" size={24} color="#ffffff" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.actionCardTitleWhite}>Check In / Out</Text>
                                <Text style={styles.actionCardSubWhite}>Verify Code</Text>
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.actionCard, styles.actionCardWhite]}
                            onPress={() => navigation.navigate("ManageUsers")}
                        >
                            <View style={[styles.actionIconBox, { backgroundColor: "#f3e8ff" }]}>
                                <MaterialDesignIcons name="account-supervisor-outline" size={24} color="#7c3aed" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.actionCardTitleDark}>Manage Staff</Text>
                                <Text style={styles.actionCardSubDark}>Guards & Accounts</Text>
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.actionCard, styles.actionCardWhite]}
                            onPress={onOpenMap}
                        >
                            <View style={[styles.actionIconBox, { backgroundColor: "#fef3c7" }]}>
                                <MaterialDesignIcons name="map-marker" size={24} color="#d97706" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.actionCardTitleDark}>Agency Location</Text>
                                <Text style={styles.actionCardSubDark}>View Map</Text>
                            </View>
                        </TouchableOpacity>
                    </View>

                    {/* Spot Capacities Breakdown */}
                    <Text style={styles.sectionHeader}>Vehicle Slot Breakdown</Text>
                    <View style={styles.capacityGrid}>
                        <Surface style={styles.capacityCard} elevation={1}>
                            <MaterialDesignIcons name="motorbike" size={26} color="#4338ca" />
                            <View style={{ marginLeft: 12 }}>
                                <Text style={styles.capacityLabel}>Two Wheeler</Text>
                                <Text style={styles.capacityValue}>{stats.twoWheelerCapacity} Spots</Text>
                            </View>
                        </Surface>

                        <Surface style={styles.capacityCard} elevation={1}>
                            <MaterialDesignIcons name="car-side" size={26} color="#059669" />
                            <View style={{ marginLeft: 12 }}>
                                <Text style={styles.capacityLabel}>Four Wheeler</Text>
                                <Text style={styles.capacityValue}>{stats.carCapacity} Spots</Text>
                            </View>
                        </Surface>

                        <Surface style={styles.capacityCard} elevation={1}>
                            <MaterialDesignIcons name="car-estate" size={26} color="#d97706" />
                            <View style={{ marginLeft: 12 }}>
                                <Text style={styles.capacityLabel}>SUV & Vans</Text>
                                <Text style={styles.capacityValue}>{stats.suvCapacity} Spots</Text>
                            </View>
                        </Surface>

                        <Surface style={styles.capacityCard} elevation={1}>
                            <MaterialDesignIcons name="ev-station" size={26} color="#2563eb" />
                            <View style={{ marginLeft: 12 }}>
                                <Text style={styles.capacityLabel}>EV Charging</Text>
                                <Text style={styles.capacityValue}>{stats.evCapacity} Slots</Text>
                            </View>
                        </Surface>
                    </View>

                    {/* Recent Agency Activity */}
                    <View style={styles.sectionTitleRow}>
                        <Text style={styles.sectionHeader}>Recent Agency Activity</Text>
                        <TouchableOpacity onPress={() => navigation.navigate("CheckInOut")}>
                            <Text style={styles.seeAllText}>Manage All</Text>
                        </TouchableOpacity>
                    </View>

                    {stats.recentBookings && stats.recentBookings.length > 0 ? (
                        stats.recentBookings.map((b) => {
                            const statusSt = getStatusStyle(b.status);
                            return (
                                <Surface key={b.booking_id || b.booking_code} style={styles.listItem} elevation={1}>
                                    <View style={styles.listIconBox}>
                                        <MaterialDesignIcons name="car-key" size={22} color="#475569" />
                                    </View>
                                    <View style={{ flex: 1, marginRight: 8 }}>
                                        <Text style={styles.listItemTitle} numberOfLines={1}>
                                            {b.user_name || "Customer"}
                                        </Text>
                                        <Text style={styles.listItemSub}>
                                            Code: {b.booking_code} • {b.vehicle_type} ({b.vehicle_number})
                                        </Text>
                                    </View>
                                    <View
                                        style={[
                                            styles.statusBadge,
                                            { backgroundColor: statusSt.bg, borderColor: statusSt.border },
                                        ]}
                                    >
                                        <Text style={[styles.statusBadgeText, { color: statusSt.text }]}>
                                            {b.status.toUpperCase()}
                                        </Text>
                                    </View>
                                </Surface>
                            );
                        })
                    ) : (
                        <Surface style={styles.emptyCard} elevation={1}>
                            <MaterialDesignIcons name="calendar-remove" size={36} color="#cbd5e1" />
                            <Text style={styles.emptyText}>No agency bookings found yet</Text>
                        </Surface>
                    )}
                </View>
            )}
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#f8fafc",
    },
    scrollContent: {
        paddingBottom: 40,
    },
    headerBanner: {
        backgroundColor: "#1e1b4b",
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 24,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
    },
    headerRow: {
        flexDirection: "row",
        alignItems: "center",
    },
    headerTextContainer: {
        flex: 1,
        marginLeft: 14,
    },
    agencySubtitle: {
        color: "#a5b4fc",
        fontSize: 11,
        fontWeight: "700",
        letterSpacing: 1,
    },
    agencyTitle: {
        color: "#ffffff",
        fontSize: 20,
        fontWeight: "bold",
    },
    refreshBtn: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: "rgba(255, 255, 255, 0.2)",
        justifyContent: "center",
        alignItems: "center",
    },
    loadingContainer: {
        paddingVertical: 50,
        alignItems: "center",
        justifyContent: "center",
    },
    loadingText: {
        color: "#64748b",
        marginTop: 12,
        fontWeight: "600",
    },
    body: {
        paddingHorizontal: 16,
        marginTop: 16,
    },
    revenueCard: {
        backgroundColor: "#047857",
        borderRadius: 20,
        padding: 20,
        marginBottom: 16,
    },
    revenueRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    revenueLabel: {
        color: "#a7f3d0",
        fontSize: 11,
        fontWeight: "700",
        letterSpacing: 1,
    },
    revenueAmount: {
        color: "#ffffff",
        fontSize: 28,
        fontWeight: "800",
        marginTop: 4,
    },
    commissionText: {
        color: "#6ee7b7",
        fontSize: 12,
        marginTop: 4,
    },
    withdrawBtn: {
        backgroundColor: "rgba(255, 255, 255, 0.2)",
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 12,
        flexDirection: "row",
        alignItems: "center",
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.3)",
    },
    withdrawBtnText: {
        color: "#ffffff",
        fontWeight: "700",
        marginLeft: 6,
        fontSize: 13,
    },
    occupancyCard: {
        backgroundColor: "#ffffff",
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: "#f1f5f9",
    },
    occupancyHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 8,
    },
    cardHeaderTitle: {
        color: "#1e293b",
        fontSize: 14,
        fontWeight: "bold",
    },
    occupancyCount: {
        color: "#4338ca",
        fontSize: 14,
        fontWeight: "800",
    },
    progressBarTrack: {
        width: "100%",
        height: 10,
        backgroundColor: "#f1f5f9",
        borderRadius: 5,
        overflow: "hidden",
        marginBottom: 8,
    },
    progressBarFill: {
        height: "100%",
        backgroundColor: "#4338ca",
        borderRadius: 5,
    },
    occupancySubRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    occupancySubText: {
        color: "#64748b",
        fontSize: 12,
        fontWeight: "500",
    },
    availableText: {
        color: "#059669",
        fontSize: 12,
        fontWeight: "600",
    },
    statsRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 16,
    },
    statCard: {
        flex: 1,
        backgroundColor: "#ffffff",
        padding: 14,
        borderRadius: 16,
        alignItems: "center",
        marginHorizontal: 4,
        borderWidth: 1,
        borderColor: "#f1f5f9",
    },
    iconCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 8,
    },
    statLabel: {
        color: "#64748b",
        fontSize: 11,
        fontWeight: "600",
    },
    statValue: {
        color: "#1e293b",
        fontSize: 18,
        fontWeight: "bold",
        marginTop: 2,
    },
    sectionHeader: {
        color: "#334155",
        fontSize: 16,
        fontWeight: "bold",
        marginBottom: 12,
    },
    sectionTitleRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginTop: 8,
        marginBottom: 12,
    },
    seeAllText: {
        color: "#4338ca",
        fontWeight: "600",
        fontSize: 13,
    },
    actionGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "space-between",
        marginBottom: 8,
    },
    actionCard: {
        width: "48%",
        padding: 14,
        borderRadius: 16,
        marginBottom: 12,
        flexDirection: "row",
        alignItems: "center",
        elevation: 1,
    },
    actionCardWhite: {
        backgroundColor: "#ffffff",
        borderWidth: 1,
        borderColor: "#e2e8f0",
    },
    actionIconBox: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: "center",
        alignItems: "center",
        marginRight: 10,
    },
    actionCardTitleWhite: {
        color: "#ffffff",
        fontWeight: "bold",
        fontSize: 13,
    },
    actionCardSubWhite: {
        color: "#e2e8f0",
        fontSize: 11,
    },
    actionCardTitleDark: {
        color: "#1e293b",
        fontWeight: "bold",
        fontSize: 13,
    },
    actionCardSubDark: {
        color: "#64748b",
        fontSize: 11,
    },
    capacityGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "space-between",
        marginBottom: 12,
    },
    capacityCard: {
        width: "48%",
        backgroundColor: "#ffffff",
        padding: 12,
        borderRadius: 16,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: "#f1f5f9",
        flexDirection: "row",
        alignItems: "center",
    },
    capacityLabel: {
        color: "#64748b",
        fontSize: 11,
        fontWeight: "500",
    },
    capacityValue: {
        color: "#0f172a",
        fontSize: 14,
        fontWeight: "bold",
        marginTop: 2,
    },
    listItem: {
        backgroundColor: "#ffffff",
        borderRadius: 16,
        padding: 12,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: "#f1f5f9",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    listIconBox: {
        width: 38,
        height: 38,
        borderRadius: 12,
        backgroundColor: "#f1f5f9",
        justifyContent: "center",
        alignItems: "center",
        marginRight: 12,
    },
    listItemTitle: {
        color: "#1e293b",
        fontWeight: "bold",
        fontSize: 14,
    },
    listItemSub: {
        color: "#64748b",
        fontSize: 12,
        marginTop: 2,
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        borderWidth: 1,
    },
    statusBadgeText: {
        fontSize: 10,
        fontWeight: "700",
    },
    emptyCard: {
        backgroundColor: "#ffffff",
        borderRadius: 16,
        padding: 24,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        borderColor: "#f1f5f9",
    },
    emptyText: {
        color: "#94a3b8",
        fontSize: 13,
        fontWeight: "500",
        marginTop: 8,
    },
});

export default AgencyAdminDashboard;
