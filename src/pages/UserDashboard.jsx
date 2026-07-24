import React, { useState, useEffect, useCallback } from "react";
import {
    View,
    ScrollView,
    RefreshControl,
    TouchableOpacity,
    ActivityIndicator,
    StyleSheet,
} from "react-native";
import { Text, Surface, Avatar, Card, Button } from "react-native-paper";
import { useSelector } from "react-redux";
import { MaterialDesignIcons } from "@react-native-vector-icons/material-design-icons";
import apiService from "../utils/apiService";

const UserDashboard = ({ navigation, onOpenMap }) => {
    const user = useSelector((state) => state.user.user);
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
            style={styles.container}
            contentContainerStyle={styles.scrollContent}
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#4338ca"]} />
            }
        >
            {loading && !refreshing ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#4338ca" />
                    <Text style={styles.loadingText}>Loading Dashboard...</Text>
                </View>
            ) : (
                <View style={styles.body}>
                    {/* Wallet Balance Hero Card */}
                    <Surface style={styles.walletCard} elevation={3}>
                        <View style={styles.walletRow}>
                            <View>
                                <Text style={styles.walletLabel}>WALLET BALANCE</Text>
                                <Text style={styles.walletAmount}>
                                    {formatCurrency(stats.walletBalance)}
                                </Text>
                            </View>
                            <TouchableOpacity
                                style={styles.topupBtn}
                                onPress={() => navigation.navigate("Wallet")}
                            >
                                <MaterialDesignIcons name="plus-circle" size={18} color="#ffffff" />
                                <Text style={styles.topupBtnText}>Top Up</Text>
                            </TouchableOpacity>
                        </View>
                    </Surface>

                    {/* Stats Grid */}
                    <View style={styles.statsRow}>
                        <Surface style={styles.statCard} elevation={1}>
                            <View style={[styles.iconCircle, { backgroundColor: "#e0e7ff" }]}>
                                <MaterialDesignIcons name="car-parking" size={22} color="#4338ca" />
                            </View>
                            <Text style={styles.statLabel}>Active</Text>
                            <Text style={styles.statValue}>{stats.activeBookings}</Text>
                        </Surface>

                        <Surface style={styles.statCard} elevation={1}>
                            <View style={[styles.iconCircle, { backgroundColor: "#d1fae5" }]}>
                                <MaterialDesignIcons name="format-list-bulleted" size={22} color="#059669" />
                            </View>
                            <Text style={styles.statLabel}>Total Bookings</Text>
                            <Text style={styles.statValue}>{stats.totalBookings}</Text>
                        </Surface>

                        <Surface style={styles.statCard} elevation={1}>
                            <View style={[styles.iconCircle, { backgroundColor: "#fef3c7" }]}>
                                <MaterialDesignIcons name="cash-multiple" size={22} color="#d97706" />
                            </View>
                            <Text style={styles.statLabel}>Total Spent</Text>
                            <Text style={styles.statValue}>{formatCurrency(stats.totalSpent)}</Text>
                        </Surface>
                    </View>

                    {/* Active Booking Banner */}
                    {stats.activeBooking && (
                        <Surface style={styles.activeBookingCard} elevation={2}>
                            <View style={styles.activeHeader}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.agencyTitle}>
                                        {stats.activeBooking.agency_name}
                                    </Text>
                                    <Text style={styles.bookingDetailsText}>
                                        Code: {stats.activeBooking.booking_code} • {stats.activeBooking.vehicle_type} ({stats.activeBooking.vehicle_number})
                                    </Text>
                                </View>
                                <View
                                    style={[
                                        styles.statusBadge,
                                        {
                                            backgroundColor: getStatusStyle(stats.activeBooking.status).bg,
                                            borderColor: getStatusStyle(stats.activeBooking.status).border,
                                        },
                                    ]}
                                >
                                    <Text
                                        style={[
                                            styles.statusBadgeText,
                                            { color: getStatusStyle(stats.activeBooking.status).text },
                                        ]}
                                    >
                                        {stats.activeBooking.status.toUpperCase()}
                                    </Text>
                                </View>
                            </View>

                            {stats.activeBooking.otp && (
                                <View style={styles.otpContainer}>
                                    <Text style={styles.otpLabel}>Check-In OTP Code:</Text>
                                    <Text style={styles.otpValue}>{stats.activeBooking.otp}</Text>
                                </View>
                            )}
                        </Surface>
                    )}

                    {/* Quick Actions Grid */}
                    <Text style={styles.sectionHeader}>Quick Actions</Text>
                    <View style={styles.actionGrid}>
                        <TouchableOpacity
                            style={[styles.actionCard, { backgroundColor: "#4338ca" }]}
                            onPress={onOpenMap}
                        >
                            <View style={[styles.actionIconBox, { backgroundColor: "rgba(255,255,255,0.2)" }]}>
                                <MaterialDesignIcons name="map-marker-radius" size={24} color="#ffffff" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.actionCardTitleWhite}>Find Parking</Text>
                                <Text style={styles.actionCardSubWhite}>Open Map View</Text>
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.actionCard, styles.actionCardWhite]}
                            onPress={() => navigation.navigate("MyBookings")}
                        >
                            <View style={[styles.actionIconBox, { backgroundColor: "#d1fae5" }]}>
                                <MaterialDesignIcons name="calendar-clock" size={24} color="#059669" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.actionCardTitleDark}>My Bookings</Text>
                                <Text style={styles.actionCardSubDark}>History & Status</Text>
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.actionCard, styles.actionCardWhite]}
                            onPress={() => navigation.navigate("Wallet")}
                        >
                            <View style={[styles.actionIconBox, { backgroundColor: "#fef3c7" }]}>
                                <MaterialDesignIcons name="wallet-outline" size={24} color="#d97706" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.actionCardTitleDark}>My Wallet</Text>
                                <Text style={styles.actionCardSubDark}>Balance & Payments</Text>
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.actionCard, styles.actionCardWhite]}
                            onPress={() => navigation.navigate("Profile")}
                        >
                            <View style={[styles.actionIconBox, { backgroundColor: "#f3e8ff" }]}>
                                <MaterialDesignIcons name="account-cog-outline" size={24} color="#7c3aed" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.actionCardTitleDark}>My Profile</Text>
                                <Text style={styles.actionCardSubDark}>Account Info</Text>
                            </View>
                        </TouchableOpacity>
                    </View>

                    {/* Recent Bookings */}
                    <View style={styles.sectionTitleRow}>
                        <Text style={styles.sectionHeader}>Recent Bookings</Text>
                        <TouchableOpacity onPress={() => navigation.navigate("MyBookings")}>
                            <Text style={styles.seeAllText}>View All</Text>
                        </TouchableOpacity>
                    </View>

                    {stats.recentBookings && stats.recentBookings.length > 0 ? (
                        stats.recentBookings.map((b) => {
                            const statusSt = getStatusStyle(b.status);
                            return (
                                <Surface key={b.booking_id || b.booking_code} style={styles.listItem} elevation={1}>
                                    <View style={styles.listIconBox}>
                                        <MaterialDesignIcons name="car" size={22} color="#475569" />
                                    </View>
                                    <View style={{ flex: 1, marginRight: 8 }}>
                                        <Text style={styles.listItemTitle} numberOfLines={1}>
                                            {b.agency_name}
                                        </Text>
                                        <Text style={styles.listItemSub}>
                                            {b.vehicle_type} ({b.vehicle_number}) • {formatCurrency(b.total_bill)}
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
                            <MaterialDesignIcons name="car-off" size={36} color="#cbd5e1" />
                            <Text style={styles.emptyText}>No bookings found yet</Text>
                            <Button
                                mode="contained"
                                onPress={onOpenMap}
                                style={styles.emptyBtn}
                                labelStyle={{ fontWeight: "bold", fontSize: 12 }}
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

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#f8fafc",
    },
    scrollContent: {
        paddingBottom: 40,
    },
    headerBanner: {
        backgroundColor: "#4338ca",
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
    welcomeSubtitle: {
        color: "#c7d2fe",
        fontSize: 11,
        fontWeight: "700",
        letterSpacing: 1,
    },
    welcomeTitle: {
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
    walletCard: {
        backgroundColor: "#3730a3",
        borderRadius: 20,
        padding: 20,
        marginBottom: 16,
    },
    walletRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    walletLabel: {
        color: "#c7d2fe",
        fontSize: 11,
        fontWeight: "700",
        letterSpacing: 1,
    },
    walletAmount: {
        color: "#ffffff",
        fontSize: 28,
        fontWeight: "800",
        marginTop: 4,
    },
    topupBtn: {
        backgroundColor: "rgba(255, 255, 255, 0.2)",
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 12,
        flexDirection: "row",
        alignItems: "center",
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.3)",
    },
    topupBtnText: {
        color: "#ffffff",
        fontWeight: "700",
        marginLeft: 6,
        fontSize: 13,
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
    activeBookingCard: {
        backgroundColor: "#ffffff",
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        borderLeftWidth: 4,
        borderLeftColor: "#4338ca",
        borderWidth: 1,
        borderColor: "#f1f5f9",
    },
    activeHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
    },
    agencyTitle: {
        color: "#0f172a",
        fontSize: 16,
        fontWeight: "bold",
    },
    bookingDetailsText: {
        color: "#64748b",
        fontSize: 12,
        marginTop: 4,
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
    otpContainer: {
        backgroundColor: "#e0e7ff",
        padding: 10,
        borderRadius: 12,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginTop: 12,
    },
    otpLabel: {
        color: "#3730a3",
        fontSize: 12,
        fontWeight: "600",
    },
    otpValue: {
        color: "#312e81",
        fontSize: 16,
        fontWeight: "800",
        letterSpacing: 2,
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
        color: "#c7d2fe",
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
    emptyBtn: {
        marginTop: 12,
        backgroundColor: "#4338ca",
        borderRadius: 12,
    },
});

export default UserDashboard;
