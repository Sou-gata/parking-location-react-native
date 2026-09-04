import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
    View,
    Text,
    SectionList,
    StyleSheet,
    TouchableOpacity,
    RefreshControl,
    ActivityIndicator,
    Modal,
    Pressable,
    ScrollView,
    StatusBar,
} from "react-native";
import { useDispatch, useSelector } from "react-redux";
import { Surface, IconButton, Button, Chip, Divider } from "react-native-paper";
import {
    fetchNotifications,
    markAllAsRead,
    markNotificationAsRead,
    clearNotifications,
} from "../store/slices/notificationSlice";
import useToast from "../hooks/useToast";

// Format relative date (Facebook style)
function formatRelativeTime(dateString) {
    if (!dateString) return "";
    try {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffSec = Math.floor(diffMs / 1000);
        const diffMin = Math.floor(diffSec / 60);
        const diffHours = Math.floor(diffMin / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffSec < 45) return "Just now";
        if (diffMin < 60) return `${diffMin}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays === 1) return "Yesterday";
        if (diffDays < 7) return `${diffDays}d ago`;

        return date.toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
        });
    } catch {
        return "";
    }
}

function formatFullDate(dateString) {
    if (!dateString) return "";
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString(undefined, {
            weekday: "short",
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    } catch {
        return "";
    }
}

// Get icon, color scheme and label based on notification type
function getTypeDetails(type) {
    switch (type?.toLowerCase()) {
        case "booking":
            return {
                icon: "car",
                bgColor: "#e0e7ff",
                iconColor: "#ff9933",
                badgeText: "Booking",
                badgeBg: "#eef2ff",
                badgeColor: "#ff9933",
                actionLabel: "View Booking",
                actionRoute: "MyBookings",
            };
        case "wallet":
            return {
                icon: "wallet",
                bgColor: "#dcfce7",
                iconColor: "#16a34a",
                badgeText: "Wallet",
                badgeBg: "#f0fdf4",
                badgeColor: "#15803d",
                actionLabel: "View Wallet",
                actionRoute: "Wallet",
            };
        case "alert":
            return {
                icon: "alert-circle",
                bgColor: "#fee2e2",
                iconColor: "#dc2626",
                badgeText: "Security Alert",
                badgeBg: "#fef2f2",
                badgeColor: "#b91c1c",
                actionLabel: "View Details",
                actionRoute: null,
            };
        case "complaint":
            return {
                icon: "shield-alert-outline",
                bgColor: "#ffedd5",
                iconColor: "#ea580c",
                badgeText: "Support",
                badgeBg: "#fff7ed",
                badgeColor: "#c2410c",
                actionLabel: "View Complaint",
                actionRoute: "ManageComplaints",
            };
        case "custom":
        case "general":
        default:
            return {
                icon: "bell-ring-outline",
                bgColor: "#ede9fe",
                iconColor: "#7c3aed",
                badgeText: "General",
                badgeBg: "#f5f3ff",
                badgeColor: "#6d28d9",
                actionLabel: null,
                actionRoute: null,
            };
    }
}

// Categorize item into Section: Today, Yesterday, Earlier
function getTimeBucket(dateString) {
    if (!dateString) return "Earlier";
    try {
        const date = new Date(dateString);
        const now = new Date();
        const startOfToday = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate()
        );
        const startOfYesterday = new Date(
            startOfToday.getTime() - 24 * 60 * 60 * 1000
        );
        const startOfWeek = new Date(
            startOfToday.getTime() - 6 * 24 * 60 * 60 * 1000
        );

        if (date >= startOfToday) return "Today";
        if (date >= startOfYesterday) return "Yesterday";
        if (date >= startOfWeek) return "This Week";
        return "Earlier";
    } catch {
        return "Earlier";
    }
}

export default function NotificationScreen({ navigation }) {
    const dispatch = useDispatch();
    const toast = useToast();

    const {
        notifications,
        unreadCount,
        loading,
        loadingMore,
        refreshing,
        pagination,
    } = useSelector((state) => state.notification);

    const [activeFilter, setActiveFilter] = useState("all"); // 'all', 'unread', 'booking', 'wallet', 'alert', 'complaint'
    const [selectedNotification, setSelectedNotification] = useState(null);
    const [detailModalVisible, setDetailModalVisible] = useState(false);
    const [clearDialogVisible, setClearDialogVisible] = useState(false);

    useEffect(() => {
        dispatch(fetchNotifications({ page: 1, limit: 20 }));
    }, [dispatch]);

    const onRefresh = useCallback(() => {
        dispatch(fetchNotifications({ page: 1, limit: 20, isRefresh: true }));
    }, [dispatch]);

    const handleLoadMore = useCallback(() => {
        if (
            !loading &&
            !loadingMore &&
            !refreshing &&
            pagination.page < pagination.totalPages
        ) {
            dispatch(
                fetchNotifications({
                    page: pagination.page + 1,
                    limit: 20,
                })
            );
        }
    }, [dispatch, loading, loadingMore, refreshing, pagination]);

    const handleMarkAllRead = async () => {
        try {
            await dispatch(markAllAsRead()).unwrap();
            toast.success("All notifications marked as read", "Updated", true);
        } catch {
            toast.error("Failed to mark notifications as read", "Error", true);
        }
    };

    const handleClearAll = async () => {
        setClearDialogVisible(false);
        try {
            await dispatch(clearNotifications()).unwrap();
            toast.success("All notifications cleared", "Cleared", true);
        } catch {
            toast.error("Failed to clear notifications", "Error", true);
        }
    };

    const handleItemPress = (item) => {
        if (!item.isRead) {
            dispatch(markNotificationAsRead(item.id));
        }

        // Open details modal
        setSelectedNotification(item);
        setDetailModalVisible(true);
    };

    const handleModalNavigate = (item) => {
        setDetailModalVisible(false);
        const typeInfo = getTypeDetails(item.type);

        if (item.data?.screen && navigation) {
            try {
                navigation.navigate(item.data.screen, item.data.params || {});
                return;
            } catch (e) {
                console.log("[Notification] Route navigation error:", e);
            }
        }

        if (typeInfo.actionRoute && navigation) {
            navigation.navigate(typeInfo.actionRoute);
        }
    };

    // Filter notifications
    const filteredNotifications = useMemo(() => {
        if (activeFilter === "all") return notifications;
        if (activeFilter === "unread")
            return notifications.filter((n) => !n.isRead);
        return notifications.filter(
            (n) => n.type?.toLowerCase() === activeFilter
        );
    }, [notifications, activeFilter]);

    // Group filtered notifications into Sections (Today, Yesterday, This Week, Earlier)
    const sections = useMemo(() => {
        const buckets = {
            Today: [],
            Yesterday: [],
            "This Week": [],
            Earlier: [],
        };

        filteredNotifications.forEach((item) => {
            const bucket = getTimeBucket(item.createdAt);
            buckets[bucket].push(item);
        });

        return Object.entries(buckets)
            .filter(([_, items]) => items.length > 0)
            .map(([title, data]) => ({ title, data }));
    }, [filteredNotifications]);

    // Filter counts for Chip badges
    const filterCounts = useMemo(() => {
        const counts = {
            all: notifications.length,
            unread: unreadCount,
            booking: 0,
            wallet: 0,
            alert: 0,
            complaint: 0,
        };
        notifications.forEach((n) => {
            const t = n.type?.toLowerCase();
            if (counts[t] !== undefined) {
                counts[t] += 1;
            }
        });
        return counts;
    }, [notifications, unreadCount]);

    const renderItem = ({ item }) => {
        const typeInfo = getTypeDetails(item.type);
        const isUnread = !item.isRead;

        return (
            <TouchableOpacity
                activeOpacity={0.75}
                onPress={() => handleItemPress(item)}
                style={[styles.card, isUnread && styles.unreadCard]}
            >
                {/* Left accent bar for unread */}
                {Boolean(isUnread) && <View style={styles.unreadAccentBar} />}

                {/* Type Icon Badge */}
                <View
                    style={[
                        styles.iconBadge,
                        { backgroundColor: typeInfo.bgColor },
                    ]}
                >
                    <IconButton
                        icon={typeInfo.icon}
                        iconColor={typeInfo.iconColor}
                        size={22}
                        style={{ margin: 0 }}
                    />
                </View>

                {/* Content Container */}
                <View style={styles.cardContent}>
                    {/* Top Row: Type Tag + Relative Time */}
                    <View style={styles.cardMetaRow}>
                        <View
                            style={[
                                styles.typeTag,
                                { backgroundColor: typeInfo.badgeBg },
                            ]}
                        >
                            <Text
                                style={[
                                    styles.typeTagText,
                                    { color: typeInfo.badgeColor },
                                ]}
                            >
                                {typeInfo.badgeText}
                            </Text>
                        </View>
                        <Text style={styles.timeText}>
                            {formatRelativeTime(item.createdAt)}
                        </Text>
                    </View>

                    {/* Title */}
                    <Text
                        style={[
                            styles.titleText,
                            isUnread && styles.unreadTitleText,
                        ]}
                        numberOfLines={1}
                    >
                        {item.title || "Notification"}
                    </Text>

                    {/* Message body */}
                    <Text
                        style={[
                            styles.messageText,
                            isUnread && styles.unreadMessageText,
                        ]}
                        numberOfLines={2}
                    >
                        {item.message}
                    </Text>

                    {/* Optional Quick Action Footer */}
                    {Boolean(typeInfo.actionLabel) && (
                        <View style={styles.actionRow}>
                            <Text
                                style={[
                                    styles.actionLabelText,
                                    { color: typeInfo.iconColor },
                                ]}
                            >
                                {typeInfo.actionLabel} →
                            </Text>
                        </View>
                    )}
                </View>

                {/* Unread indicator Dot */}
                {Boolean(isUnread) && <View style={styles.unreadDot} />}
            </TouchableOpacity>
        );
    };

    const renderSectionHeader = ({ section: { title } }) => (
        <View style={styles.sectionHeaderContainer}>
            <Text style={styles.sectionHeaderText}>{title.toUpperCase()}</Text>
            <View style={styles.sectionHeaderLine} />
        </View>
    );

    const renderHeader = () => (
        <View style={styles.headerContainer}>
            {/* Top Action & Summary Bar */}
            <View style={styles.summaryBar}>
                <View style={styles.summaryLeft}>
                    <View style={styles.unreadBadgePill}>
                        <Text style={styles.unreadBadgePillText}>
                            {unreadCount > 0
                                ? `${unreadCount} UNREAD`
                                : "ALL READ"}
                        </Text>
                    </View>
                    <Text style={styles.totalCountText}>
                        {notifications.length} total
                    </Text>
                </View>

                <View style={styles.headerActionsRow}>
                    {unreadCount > 0 && (
                        <TouchableOpacity
                            onPress={handleMarkAllRead}
                            style={styles.actionButton}
                        >
                            <IconButton
                                icon="check-all"
                                size={16}
                                iconColor="#ff9933"
                                style={{
                                    margin: 0,
                                    padding: 0,
                                    width: 16,
                                    height: 16,
                                }}
                            />
                            <Text style={styles.actionButtonText}>
                                Mark read
                            </Text>
                        </TouchableOpacity>
                    )}

                    {notifications.length > 0 && (
                        <TouchableOpacity
                            onPress={() => setClearDialogVisible(true)}
                            style={[
                                styles.actionButton,
                                styles.clearActionButton,
                            ]}
                        >
                            <IconButton
                                icon="trash-can-outline"
                                size={15}
                                iconColor="#94a3b8"
                                style={{
                                    margin: 0,
                                    padding: 0,
                                    width: 16,
                                    height: 16,
                                }}
                            />
                            <Text style={styles.clearActionButtonText}>
                                Clear
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* Horizontal Filter Chips */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filterScrollContent}
            >
                <Chip
                    selected={activeFilter === "all"}
                    selectedColor="#ffffff"
                    onPress={() => setActiveFilter("all")}
                    style={[
                        styles.filterChip,
                        activeFilter === "all" && styles.filterChipActive,
                    ]}
                    textStyle={[
                        styles.filterChipText,
                        activeFilter === "all" && styles.filterChipTextActive,
                    ]}
                >
                    All ({filterCounts.all})
                </Chip>

                <Chip
                    selected={activeFilter === "unread"}
                    selectedColor="#ffffff"
                    onPress={() => setActiveFilter("unread")}
                    style={[
                        styles.filterChip,
                        activeFilter === "unread" && styles.filterChipActive,
                    ]}
                    textStyle={[
                        styles.filterChipText,
                        activeFilter === "unread" &&
                            styles.filterChipTextActive,
                    ]}
                >
                    Unread ({filterCounts.unread})
                </Chip>

                <Chip
                    selected={activeFilter === "booking"}
                    selectedColor="#ffffff"
                    onPress={() => setActiveFilter("booking")}
                    style={[
                        styles.filterChip,
                        activeFilter === "booking" && styles.filterChipActive,
                    ]}
                    textStyle={[
                        styles.filterChipText,
                        activeFilter === "booking" &&
                            styles.filterChipTextActive,
                    ]}
                >
                    Bookings ({filterCounts.booking})
                </Chip>

                <Chip
                    selected={activeFilter === "wallet"}
                    selectedColor="#ffffff"
                    onPress={() => setActiveFilter("wallet")}
                    style={[
                        styles.filterChip,
                        activeFilter === "wallet" && styles.filterChipActive,
                    ]}
                    textStyle={[
                        styles.filterChipText,
                        activeFilter === "wallet" &&
                            styles.filterChipTextActive,
                    ]}
                >
                    Wallet ({filterCounts.wallet})
                </Chip>

                <Chip
                    selected={activeFilter === "alert"}
                    selectedColor="#ffffff"
                    onPress={() => setActiveFilter("alert")}
                    style={[
                        styles.filterChip,
                        activeFilter === "alert" && styles.filterChipActive,
                    ]}
                    textStyle={[
                        styles.filterChipText,
                        activeFilter === "alert" && styles.filterChipTextActive,
                    ]}
                >
                    Alerts ({filterCounts.alert})
                </Chip>

                <Chip
                    selected={activeFilter === "complaint"}
                    selectedColor="#ffffff"
                    onPress={() => setActiveFilter("complaint")}
                    style={[
                        styles.filterChip,
                        activeFilter === "complaint" && styles.filterChipActive,
                    ]}
                    textStyle={[
                        styles.filterChipText,
                        activeFilter === "complaint" &&
                            styles.filterChipTextActive,
                    ]}
                >
                    Support ({filterCounts.complaint})
                </Chip>
            </ScrollView>
        </View>
    );

    const renderFooter = () => {
        if (!loadingMore) return null;

        return (
            <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color="#ff9933" />
                <Text style={styles.footerLoaderText}>
                    Loading more notifications...
                </Text>
            </View>
        );
    };

    const renderEmptyState = () => {
        if (loading && !refreshing) {
            return (
                <View style={styles.emptyContainer}>
                    <ActivityIndicator size="large" color="#ff9933" />
                    <Text style={styles.loadingText}>
                        Loading your notifications...
                    </Text>
                </View>
            );
        }

        const isFiltered = activeFilter !== "all";

        return (
            <View style={styles.emptyContainer}>
                <View style={styles.emptyIconCircle}>
                    <IconButton
                        icon={
                            isFiltered
                                ? "filter-remove-outline"
                                : "bell-check-outline"
                        }
                        size={46}
                        iconColor="#ff9933"
                        style={{ margin: 0 }}
                    />
                </View>
                <Text style={styles.emptyTitle}>
                    {isFiltered
                        ? "No matching notifications"
                        : "All Caught Up!"}
                </Text>
                <Text style={styles.emptySubtitle}>
                    {isFiltered
                        ? `There are no ${activeFilter} notifications right now.`
                        : "When parking status changes, payments occur, or updates arrive, they will appear right here."}
                </Text>

                {isFiltered && (
                    <Button
                        mode="outlined"
                        onPress={() => setActiveFilter("all")}
                        style={styles.resetFilterBtn}
                        textColor="#ff9933"
                    >
                        Show All Notifications
                    </Button>
                )}
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <StatusBar backgroundColor="#ff9933" barStyle="light-content" />

            {/* Top Fixed Header with Filter Chips & Actions */}
            {renderHeader()}

            {/* Notifications SectionList */}
            <SectionList
                sections={sections}
                keyExtractor={(item) => String(item.id)}
                renderItem={renderItem}
                renderSectionHeader={renderSectionHeader}
                ListFooterComponent={renderFooter}
                ListEmptyComponent={renderEmptyState}
                onEndReached={handleLoadMore}
                onEndReachedThreshold={0.4}
                stickySectionHeadersEnabled={false}
                contentContainerStyle={[
                    styles.listContent,
                    filteredNotifications.length === 0 &&
                        styles.emptyListContent,
                ]}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={["#ff9933"]}
                    />
                }
            />

            {/* Notification Detail Bottom Sheet / Modal */}
            <Modal
                visible={detailModalVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setDetailModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <Pressable
                        style={styles.modalBackdrop}
                        onPress={() => setDetailModalVisible(false)}
                    />
                    {selectedNotification && (
                        <Surface style={styles.detailCard} elevation={5}>
                            {/* Modal Header */}
                            <View style={styles.detailHeader}>
                                <View
                                    style={[
                                        styles.detailTypeIcon,
                                        {
                                            backgroundColor: getTypeDetails(
                                                selectedNotification.type
                                            ).bgColor,
                                        },
                                    ]}
                                >
                                    <IconButton
                                        icon={
                                            getTypeDetails(
                                                selectedNotification.type
                                            ).icon
                                        }
                                        iconColor={
                                            getTypeDetails(
                                                selectedNotification.type
                                            ).iconColor
                                        }
                                        size={24}
                                        style={{ margin: 0 }}
                                    />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.detailTypeBadge}>
                                        {
                                            getTypeDetails(
                                                selectedNotification.type
                                            ).badgeText
                                        }
                                    </Text>
                                    <Text style={styles.detailDateText}>
                                        {formatFullDate(
                                            selectedNotification.createdAt
                                        )}
                                    </Text>
                                </View>
                                <IconButton
                                    icon="close"
                                    size={20}
                                    iconColor="#64748b"
                                    onPress={() => setDetailModalVisible(false)}
                                />
                            </View>

                            <Divider style={styles.detailDivider} />

                            {/* Modal Body */}
                            <ScrollView
                                style={styles.detailBodyScroll}
                                showsVerticalScrollIndicator={false}
                            >
                                <Text style={styles.detailTitle}>
                                    {selectedNotification.title}
                                </Text>
                                <Text style={styles.detailMessage}>
                                    {selectedNotification.message}
                                </Text>
                            </ScrollView>

                            {/* Modal Action Buttons */}
                            <View style={styles.detailActionsRow}>
                                <Button
                                    mode="outlined"
                                    onPress={() => setDetailModalVisible(false)}
                                    style={styles.detailDismissBtn}
                                    textColor="#64748b"
                                >
                                    Close
                                </Button>

                                {Boolean(
                                    getTypeDetails(selectedNotification.type)
                                        .actionRoute ||
                                        selectedNotification.data?.screen
                                ) && (
                                    <Button
                                        mode="contained"
                                        onPress={() =>
                                            handleModalNavigate(
                                                selectedNotification
                                            )
                                        }
                                        style={styles.detailActionBtn}
                                        buttonColor="#ff9933"
                                        textColor="#ffffff"
                                        icon="arrow-right"
                                    >
                                        {getTypeDetails(
                                            selectedNotification.type
                                        ).actionLabel || "Open"}
                                    </Button>
                                )}
                            </View>
                        </Surface>
                    )}
                </View>
            </Modal>

            {/* Clear All Confirmation Modal */}
            <Modal
                visible={clearDialogVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setClearDialogVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <Pressable
                        style={styles.modalBackdrop}
                        onPress={() => setClearDialogVisible(false)}
                    />
                    <Surface style={styles.clearCard} elevation={5}>
                        <View style={styles.clearIconContainer}>
                            <IconButton
                                icon="trash-can-outline"
                                iconColor="#e11d48"
                                size={28}
                                style={{ margin: 0 }}
                            />
                        </View>
                        <Text style={styles.clearTitle}>
                            Clear all notifications?
                        </Text>
                        <Text style={styles.clearText}>
                            This action will remove all your saved notifications
                            history. This action cannot be undone.
                        </Text>
                        <View style={styles.clearButtonsRow}>
                            <Button
                                mode="outlined"
                                onPress={() => setClearDialogVisible(false)}
                                style={styles.clearCancelBtn}
                                textColor="#64748b"
                            >
                                Cancel
                            </Button>
                            <Button
                                mode="contained"
                                onPress={handleClearAll}
                                style={styles.clearConfirmBtn}
                                buttonColor="#e11d48"
                                textColor="#ffffff"
                            >
                                Clear All
                            </Button>
                        </View>
                    </Surface>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#f8fafc",
    },
    listContent: {
        paddingBottom: 32,
    },
    emptyListContent: {
        flexGrow: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingBottom: 0,
    },
    headerContainer: {
        backgroundColor: "#ffffff",
        borderBottomWidth: 1,
        borderBottomColor: "#e2e8f0",
        paddingBottom: 10,
    },
    summaryBar: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingTop: 14,
        paddingBottom: 10,
    },
    summaryLeft: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    unreadBadgePill: {
        backgroundColor: "#ff9933",
        paddingHorizontal: 9,
        paddingVertical: 3,
        borderRadius: 12,
    },
    unreadBadgePillText: {
        color: "#ffffff",
        fontSize: 11,
        fontWeight: "800",
        letterSpacing: 0.5,
    },
    totalCountText: {
        color: "#64748b",
        fontSize: 13,
        fontWeight: "600",
    },
    headerActionsRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    actionButton: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#f1f5f9",
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 16,
        gap: 4,
    },
    actionButtonText: {
        color: "#ff9933",
        fontSize: 12,
        fontWeight: "700",
    },
    clearActionButton: {
        backgroundColor: "#f8fafc",
    },
    clearActionButtonText: {
        color: "#64748b",
        fontSize: 12,
        fontWeight: "600",
    },
    filterScrollContent: {
        paddingHorizontal: 16,
        paddingTop: 4,
        gap: 8,
    },
    filterChip: {
        backgroundColor: "#f1f5f9",
        borderColor: "#e2e8f0",
        borderWidth: 1,
        borderRadius: 20,
        height: 32,
    },
    filterChipActive: {
        backgroundColor: "#ff9933",
        borderColor: "#ff9933",
    },
    filterChipText: {
        color: "#475569",
        fontSize: 12,
        fontWeight: "600",
        marginHorizontal: 0,
    },
    filterChipTextActive: {
        color: "#ffffff",
        fontWeight: "700",
    },
    sectionHeaderContainer: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingTop: 20,
        paddingBottom: 8,
        gap: 10,
    },
    sectionHeaderText: {
        fontSize: 11,
        fontWeight: "800",
        color: "#94a3b8",
        letterSpacing: 1,
    },
    sectionHeaderLine: {
        flex: 1,
        height: 1,
        backgroundColor: "#e2e8f0",
    },
    card: {
        flexDirection: "row",
        alignItems: "flex-start",
        marginHorizontal: 14,
        marginVertical: 4,
        padding: 14,
        backgroundColor: "#ffffff",
        borderRadius: 16,
        borderWidth: 1,
        borderColor: "#f1f5f9",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
        position: "relative",
        overflow: "hidden",
    },
    unreadCard: {
        backgroundColor: "#f8faff",
        borderColor: "#e0e7ff",
        shadowOpacity: 0.08,
        elevation: 2,
    },
    unreadAccentBar: {
        position: "absolute",
        left: 0,
        top: 0,
        bottom: 0,
        width: 4,
        backgroundColor: "#ff9933",
        borderTopLeftRadius: 16,
        borderBottomLeftRadius: 16,
    },
    iconBadge: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: "center",
        justifyContent: "center",
        marginRight: 12,
    },
    cardContent: {
        flex: 1,
        marginRight: 6,
    },
    cardMetaRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 4,
    },
    typeTag: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
    },
    typeTagText: {
        fontSize: 10,
        fontWeight: "800",
        textTransform: "uppercase",
        letterSpacing: 0.3,
    },
    timeText: {
        fontSize: 11,
        color: "#94a3b8",
        fontWeight: "600",
    },
    titleText: {
        fontSize: 14,
        fontWeight: "600",
        color: "#334155",
        marginBottom: 2,
    },
    unreadTitleText: {
        fontWeight: "800",
        color: "#0f172a",
    },
    messageText: {
        fontSize: 13,
        color: "#64748b",
        lineHeight: 18,
    },
    unreadMessageText: {
        color: "#334155",
    },
    actionRow: {
        marginTop: 6,
    },
    actionLabelText: {
        fontSize: 12,
        fontWeight: "700",
    },
    unreadDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: "#ff9933",
        alignSelf: "center",
        marginLeft: 4,
    },
    footerLoader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 18,
        gap: 8,
    },
    footerLoaderText: {
        fontSize: 13,
        color: "#64748b",
        fontWeight: "600",
    },
    emptyContainer: {
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 28,
        paddingVertical: 20,
    },
    emptyIconCircle: {
        width: 96,
        height: 96,
        borderRadius: 48,
        backgroundColor: "#e0e7ff",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 18,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: "800",
        color: "#1e293b",
        marginBottom: 8,
    },
    emptySubtitle: {
        fontSize: 13,
        color: "#64748b",
        textAlign: "center",
        lineHeight: 20,
    },
    resetFilterBtn: {
        marginTop: 18,
        borderColor: "#ff9933",
        borderRadius: 12,
    },
    modalOverlay: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "rgba(0,0,0,0.5)",
        padding: 20,
    },
    modalBackdrop: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    detailCard: {
        width: "100%",
        maxWidth: 420,
        backgroundColor: "#ffffff",
        borderRadius: 24,
        padding: 20,
        maxHeight: "80%",
    },
    detailHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    detailTypeIcon: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: "center",
        justifyContent: "center",
    },
    detailTypeBadge: {
        fontSize: 14,
        fontWeight: "800",
        color: "#0f172a",
    },
    detailDateText: {
        fontSize: 11,
        color: "#94a3b8",
        marginTop: 1,
    },
    detailDivider: {
        marginVertical: 14,
        backgroundColor: "#f1f5f9",
    },
    detailBodyScroll: {
        maxHeight: 240,
        marginBottom: 16,
    },
    detailTitle: {
        fontSize: 16,
        fontWeight: "700",
        color: "#0f172a",
        marginBottom: 8,
    },
    detailMessage: {
        fontSize: 14,
        color: "#475569",
        lineHeight: 22,
    },
    detailActionsRow: {
        flexDirection: "row",
        justifyContent: "flex-end",
        gap: 10,
        paddingTop: 8,
    },
    detailDismissBtn: {
        borderColor: "#cbd5e1",
        borderRadius: 10,
    },
    detailActionBtn: {
        borderRadius: 10,
    },
    clearCard: {
        width: "100%",
        maxWidth: 340,
        backgroundColor: "#ffffff",
        borderRadius: 24,
        padding: 24,
        alignItems: "center",
    },
    clearIconContainer: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: "#ffe4e6",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 14,
    },
    clearTitle: {
        fontSize: 17,
        fontWeight: "800",
        color: "#0f172a",
        marginBottom: 6,
        textAlign: "center",
    },
    clearText: {
        fontSize: 13,
        color: "#64748b",
        textAlign: "center",
        marginBottom: 20,
        lineHeight: 18,
    },
    clearButtonsRow: {
        flexDirection: "row",
        gap: 12,
        width: "100%",
    },
    clearCancelBtn: {
        flex: 1,
        borderColor: "#cbd5e1",
        borderRadius: 10,
    },
    clearConfirmBtn: {
        flex: 1,
        borderRadius: 10,
    },
});
