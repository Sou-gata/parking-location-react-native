import React, { useState, useEffect, useCallback } from "react";
import {
    View,
    ScrollView,
    RefreshControl,
    TouchableOpacity,
    ActivityIndicator,
    StyleSheet,
} from "react-native";
import { Text, Surface, Avatar } from "react-native-paper";
import { useSelector } from "react-redux";
import { MaterialDesignIcons } from "@react-native-vector-icons/material-design-icons";
import apiService from "../utils/apiService";

const SuperAdminDashboard = ({ navigation, onOpenMap }) => {
    const user = useSelector((state) => state.user.user);

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [stats, setStats] = useState({
        totalUsers: 0,
        totalAgencies: 0,
        pendingAgenciesCount: 0,
        pendingTopupsCount: 0,
        pendingWithdrawalsCount: 0,
        totalBookings: 0,
        totalAdminRevenue: 0,
        totalVolume: 0,
        recentAgencies: [],
    });

    const fetchDashboardStats = useCallback(async () => {
        try {
            const response = await apiService.get("users/dashboard-stats");
            if (response?.data) {
                setStats(response.data);
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
            style={styles.container}
            contentContainerStyle={styles.scrollContent}
            refreshControl={
                <RefreshControl
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    colors={["#4338ca"]}
                />
            }
        >
            {loading && !refreshing ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#4338ca" />
                    <Text style={styles.loadingText}>
                        Loading Platform Statistics...
                    </Text>
                </View>
            ) : (
                <View style={styles.body}>
                    {/* Revenue Hero Card */}
                    <Surface style={styles.revenueCard} elevation={3}>
                        <View style={styles.revenueRow}>
                            <View>
                                <Text style={styles.revenueLabel}>
                                    PLATFORM COMMISSION REVENUE
                                </Text>
                                <Text style={styles.revenueAmount}>
                                    {formatCurrency(stats.totalAdminRevenue)}
                                </Text>
                                <Text style={styles.volumeText}>
                                    Total Volume:{" "}
                                    {formatCurrency(stats.totalVolume)}
                                </Text>
                            </View>
                            <TouchableOpacity
                                style={styles.reportsBtn}
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
                                <Text style={styles.reportsBtnText}>
                                    Reports
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </Surface>

                    {/* Attention Required Section */}
                    {(stats.pendingAgenciesCount > 0 ||
                        stats.pendingTopupsCount > 0 ||
                        stats.pendingWithdrawalsCount > 0) && (
                        <View style={styles.attentionSection}>
                            <Text style={styles.sectionHeader}>
                                Attention Required
                            </Text>

                            {stats.pendingAgenciesCount > 0 && (
                                <TouchableOpacity
                                    style={[
                                        styles.alertBanner,
                                        {
                                            backgroundColor: "#fffbeb",
                                            borderColor: "#fde68a",
                                        },
                                    ]}
                                    onPress={() =>
                                        navigation.navigate("ManageUsers", {
                                            initialTab: "requests",
                                        })
                                    }
                                >
                                    <View style={styles.alertLeft}>
                                        <View
                                            style={[
                                                styles.alertIconBox,
                                                { backgroundColor: "#fef3c7" },
                                            ]}
                                        >
                                            <MaterialDesignIcons
                                                name="office-building"
                                                size={20}
                                                color="#b45309"
                                            />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text
                                                style={[
                                                    styles.alertTitle,
                                                    { color: "#78350f" },
                                                ]}
                                            >
                                                {stats.pendingAgenciesCount}{" "}
                                                Pending Agency Registration
                                                {stats.pendingAgenciesCount > 1
                                                    ? "s"
                                                    : ""}
                                            </Text>
                                            <Text
                                                style={[
                                                    styles.alertSub,
                                                    { color: "#92400e" },
                                                ]}
                                            >
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
                                    style={[
                                        styles.alertBanner,
                                        {
                                            backgroundColor: "#e0e7ff",
                                            borderColor: "#c7d2fe",
                                        },
                                    ]}
                                    onPress={() =>
                                        navigation.navigate("ManageUsers", {
                                            initialTab: "user_wallets",
                                        })
                                    }
                                >
                                    <View style={styles.alertLeft}>
                                        <View
                                            style={[
                                                styles.alertIconBox,
                                                { backgroundColor: "#c7d2fe" },
                                            ]}
                                        >
                                            <MaterialDesignIcons
                                                name="wallet-plus-outline"
                                                size={20}
                                                color="#4338ca"
                                            />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text
                                                style={[
                                                    styles.alertTitle,
                                                    { color: "#312e81" },
                                                ]}
                                            >
                                                {stats.pendingTopupsCount}{" "}
                                                Pending Wallet Topup
                                                {stats.pendingTopupsCount > 1
                                                    ? "s"
                                                    : ""}
                                            </Text>
                                            <Text
                                                style={[
                                                    styles.alertSub,
                                                    { color: "#3730a3" },
                                                ]}
                                            >
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
                                    style={[
                                        styles.alertBanner,
                                        {
                                            backgroundColor: "#ecfdf5",
                                            borderColor: "#a7f3d0",
                                        },
                                    ]}
                                    onPress={() =>
                                        navigation.navigate("ManageUsers", {
                                            initialTab: "agency_withdrawals",
                                        })
                                    }
                                >
                                    <View style={styles.alertLeft}>
                                        <View
                                            style={[
                                                styles.alertIconBox,
                                                { backgroundColor: "#a7f3d0" },
                                            ]}
                                        >
                                            <MaterialDesignIcons
                                                name="cash-refund"
                                                size={20}
                                                color="#047857"
                                            />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text
                                                style={[
                                                    styles.alertTitle,
                                                    { color: "#064e3b" },
                                                ]}
                                            >
                                                {stats.pendingWithdrawalsCount}{" "}
                                                Pending Agency Withdrawal
                                                {stats.pendingWithdrawalsCount >
                                                1
                                                    ? "s"
                                                    : ""}
                                            </Text>
                                            <Text
                                                style={[
                                                    styles.alertSub,
                                                    { color: "#047857" },
                                                ]}
                                            >
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
                    <Text style={styles.sectionHeader}>Platform Overview</Text>
                    <View style={styles.overviewGrid}>
                        <Surface style={styles.overviewCard} elevation={1}>
                            <View
                                style={[
                                    styles.iconCircle,
                                    { backgroundColor: "#e0e7ff" },
                                ]}
                            >
                                <MaterialDesignIcons
                                    name="account-group"
                                    size={22}
                                    color="#4338ca"
                                />
                            </View>
                            <Text style={styles.overviewLabel}>
                                Total Customers
                            </Text>
                            <Text style={styles.overviewValue}>
                                {stats.totalUsers}
                            </Text>
                        </Surface>

                        <Surface style={styles.overviewCard} elevation={1}>
                            <View
                                style={[
                                    styles.iconCircle,
                                    { backgroundColor: "#d1fae5" },
                                ]}
                            >
                                <MaterialDesignIcons
                                    name="domain"
                                    size={22}
                                    color="#059669"
                                />
                            </View>
                            <Text style={styles.overviewLabel}>
                                Partner Agencies
                            </Text>
                            <Text style={styles.overviewValue}>
                                {stats.totalAgencies}
                            </Text>
                        </Surface>

                        <Surface style={styles.overviewCard} elevation={1}>
                            <View
                                style={[
                                    styles.iconCircle,
                                    { backgroundColor: "#dbeafe" },
                                ]}
                            >
                                <MaterialDesignIcons
                                    name="calendar-check"
                                    size={22}
                                    color="#2563eb"
                                />
                            </View>
                            <Text style={styles.overviewLabel}>
                                Platform Bookings
                            </Text>
                            <Text style={styles.overviewValue}>
                                {stats.totalBookings}
                            </Text>
                        </Surface>

                        <Surface style={styles.overviewCard} elevation={1}>
                            <View
                                style={[
                                    styles.iconCircle,
                                    { backgroundColor: "#f3e8ff" },
                                ]}
                            >
                                <MaterialDesignIcons
                                    name="shield-check-outline"
                                    size={22}
                                    color="#7c3aed"
                                />
                            </View>
                            <Text style={styles.overviewLabel}>
                                System Status
                            </Text>
                            <Text style={styles.statusOkText}>Operational</Text>
                        </Surface>
                    </View>

                    {/* Admin Controls */}
                    <Text style={styles.sectionHeader}>Admin Controls</Text>
                    <View style={styles.actionGrid}>
                        <TouchableOpacity
                            style={[
                                styles.actionCard,
                                { backgroundColor: "#4338ca" },
                            ]}
                            onPress={() =>
                                navigation.navigate("ManageUsers", {
                                    initialTab: "active",
                                })
                            }
                        >
                            <View
                                style={[
                                    styles.actionIconBox,
                                    {
                                        backgroundColor:
                                            "rgba(255,255,255,0.2)",
                                    },
                                ]}
                            >
                                <MaterialDesignIcons
                                    name="account-cog-outline"
                                    size={24}
                                    color="#ffffff"
                                />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.actionCardTitleWhite}>
                                    Manage Users
                                </Text>
                                <Text style={styles.actionCardSubWhite}>
                                    Agencies & Staff
                                </Text>
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                styles.actionCard,
                                { backgroundColor: "#059669" },
                            ]}
                            onPress={() =>
                                navigation.navigate("ManageUsers", {
                                    initialTab: "user_wallets",
                                })
                            }
                        >
                            <View
                                style={[
                                    styles.actionIconBox,
                                    {
                                        backgroundColor:
                                            "rgba(255,255,255,0.2)",
                                    },
                                ]}
                            >
                                <MaterialDesignIcons
                                    name="cash-register"
                                    size={24}
                                    color="#ffffff"
                                />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.actionCardTitleWhite}>
                                    Wallet Requests
                                </Text>
                                <Text style={styles.actionCardSubWhite}>
                                    Topups & Payouts
                                </Text>
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.actionCard, styles.actionCardWhite]}
                            onPress={() =>
                                navigation.navigate("SuperAdminSettings")
                            }
                        >
                            <View
                                style={[
                                    styles.actionIconBox,
                                    { backgroundColor: "#fef3c7" },
                                ]}
                            >
                                <MaterialDesignIcons
                                    name="cog-outline"
                                    size={24}
                                    color="#d97706"
                                />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.actionCardTitleDark}>
                                    System Settings
                                </Text>
                                <Text style={styles.actionCardSubDark}>
                                    UPI & Configs
                                </Text>
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.actionCard, styles.actionCardWhite]}
                            onPress={onOpenMap}
                        >
                            <View
                                style={[
                                    styles.actionIconBox,
                                    { backgroundColor: "#d1fae5" },
                                ]}
                            >
                                <MaterialDesignIcons
                                    name="map-search"
                                    size={24}
                                    color="#059669"
                                />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.actionCardTitleDark}>
                                    Global Map
                                </Text>
                                <Text style={styles.actionCardSubDark}>
                                    All Locations
                                </Text>
                            </View>
                        </TouchableOpacity>
                    </View>

                    {/* Recent Partner Agencies */}
                    <View style={styles.sectionTitleRow}>
                        <Text style={styles.sectionHeader}>
                            Recent Partner Agencies
                        </Text>
                        <TouchableOpacity
                            onPress={() => navigation.navigate("ManageUsers")}
                        >
                            <Text style={styles.seeAllText}>View All</Text>
                        </TouchableOpacity>
                    </View>

                    {stats.recentAgencies && stats.recentAgencies.length > 0 ? (
                        stats.recentAgencies.map((a) => {
                            const statusSt = getAgencyStatusStyle(a.status);
                            return (
                                <Surface
                                    key={a.org_id}
                                    style={styles.listItem}
                                    elevation={1}
                                >
                                    <View style={styles.listIconBox}>
                                        <MaterialDesignIcons
                                            name="office-building"
                                            size={22}
                                            color="#475569"
                                        />
                                    </View>
                                    <View style={{ flex: 1, marginRight: 8 }}>
                                        <Text
                                            style={styles.listItemTitle}
                                            numberOfLines={1}
                                        >
                                            {a.org_name}
                                        </Text>
                                        <Text style={styles.listItemSub}>
                                            {a.email} •{" "}
                                            {a.phone_number || "N/A"}
                                        </Text>
                                    </View>
                                    <View
                                        style={[
                                            styles.statusBadge,
                                            {
                                                backgroundColor: statusSt.bg,
                                                borderColor: statusSt.border,
                                            },
                                        ]}
                                    >
                                        <Text
                                            style={[
                                                styles.statusBadgeText,
                                                { color: statusSt.text },
                                            ]}
                                        >
                                            {a.status.toUpperCase()}
                                        </Text>
                                    </View>
                                </Surface>
                            );
                        })
                    ) : (
                        <Surface style={styles.emptyCard} elevation={1}>
                            <MaterialDesignIcons
                                name="domain-off"
                                size={36}
                                color="#cbd5e1"
                            />
                            <Text style={styles.emptyText}>
                                No registered agencies found
                            </Text>
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
    adminSubtitle: {
        color: "#c7d2fe",
        fontSize: 11,
        fontWeight: "700",
        letterSpacing: 1,
    },
    adminTitle: {
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
        backgroundColor: "#3730a3",
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
        color: "#c7d2fe",
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
    volumeText: {
        color: "#a5b4fc",
        fontSize: 12,
        marginTop: 4,
    },
    reportsBtn: {
        backgroundColor: "rgba(255, 255, 255, 0.2)",
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 12,
        flexDirection: "row",
        alignItems: "center",
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.3)",
    },
    reportsBtnText: {
        color: "#ffffff",
        fontWeight: "700",
        marginLeft: 6,
        fontSize: 13,
    },
    attentionSection: {
        marginBottom: 16,
    },
    alertBanner: {
        borderRadius: 16,
        padding: 14,
        marginBottom: 10,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        borderWidth: 1,
    },
    alertLeft: {
        flexDirection: "row",
        alignItems: "center",
        flex: 1,
        marginRight: 10,
    },
    alertIconBox: {
        width: 38,
        height: 38,
        borderRadius: 12,
        justifyContent: "center",
        alignItems: "center",
        marginRight: 12,
    },
    alertTitle: {
        fontWeight: "bold",
        fontSize: 13,
    },
    alertSub: {
        fontSize: 11,
        marginTop: 2,
    },
    overviewGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "space-between",
        marginBottom: 8,
    },
    overviewCard: {
        width: "48%",
        backgroundColor: "#ffffff",
        padding: 14,
        borderRadius: 16,
        marginBottom: 12,
        alignItems: "center",
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
    overviewLabel: {
        color: "#64748b",
        fontSize: 11,
        fontWeight: "600",
    },
    overviewValue: {
        color: "#0f172a",
        fontSize: 22,
        fontWeight: "800",
        marginTop: 2,
    },
    statusOkText: {
        color: "#059669",
        fontSize: 14,
        fontWeight: "800",
        marginTop: 4,
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

export default SuperAdminDashboard;
