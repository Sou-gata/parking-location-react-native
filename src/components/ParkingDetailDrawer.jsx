import React, { useEffect, useState } from "react";
import {
    View,
    TouchableOpacity,
    Image,
    ScrollView,
    FlatList,
    ActivityIndicator,
    Text,
    StyleSheet,
    Linking,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
} from "react-native-reanimated";
import { MaterialDesignIcons } from "@react-native-vector-icons/material-design-icons";

import apiService from "../utils/apiService";
import { imageBaseURL } from "../utils/baseURL";
import MediaViewerModal from "./MediaViewerModal";

const formatTime12h = (time24) => {
    if (!time24) return "";
    const [hStr, mStr] = time24.split(":");
    let h = parseInt(hStr, 10);
    const m = mStr || "00";
    if (isNaN(h)) return time24;
    const ampm = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;
    const hFormatted = String(h).padStart(2, "0");
    return `${hFormatted}:${m} ${ampm}`;
};

const ParkingDetailDrawer = ({
    visible,
    location,
    onClose,
    onStartNavigation,
    vehicleTypesSummary = [],
    currentVehicleType,
    onSelectVehicleType,
}) => {
    const insets = useSafeAreaInsets();
    const translateY = useSharedValue(1200);
    const [activeTab, setActiveTab] = useState("general");
    const [approvedMedia, setApprovedMedia] = useState([]);
    const [viewerState, setViewerState] = useState({
        visible: false,
        media: null,
    });

    const [reviewsState, setReviewsState] = useState({
        list: [],
        ratingInfo: null,
        page: 1,
        hasMore: true,
        loading: false,
        loadingMore: false,
    });

    const {
        list: reviewsList,
        ratingInfo,
        page: reviewsPage,
        hasMore: hasMoreReviews,
        loading: loadingReviews,
        loadingMore: loadingMoreReviews,
    } = reviewsState;

    useEffect(() => {
        if (visible) {
            translateY.value = withTiming(0, { duration: 400 });
        } else {
            translateY.value = withTiming(1200, { duration: 300 });
        }
    }, [visible, translateY]);

    const [workingHours, setWorkingHours] = useState(null);

    useEffect(() => {
        if (location?.id) {
            setApprovedMedia([]);
            setWorkingHours(null);
            setActiveTab("general");
            setReviewsState({
                list: [],
                ratingInfo: null,
                page: 1,
                hasMore: true,
                loading: true,
                loadingMore: false,
            });

            apiService
                .get(`working-hours/agency/${location.id}`)
                .then((res) => {
                    if (res && res.success && res.data) {
                        setWorkingHours(res.data);
                    }
                })
                .catch((e) =>
                    console.error("Error fetching working hours:", e)
                );

            apiService
                .get(`ratings/agency/${location.id}?page=1&limit=10`)
                .then((res) => {
                    if (res && res.success && res.data) {
                        setReviewsState((prev) => ({
                            ...prev,
                            ratingInfo: res.data.stats || null,
                            list: res.data.ratings || [],
                            hasMore: res.data.pagination
                                ? 1 < res.data.pagination.totalPages
                                : false,
                        }));
                    }
                })
                .catch((e) =>
                    console.error("Error fetching location rating:", e)
                )
                .finally(() =>
                    setReviewsState((prev) => ({ ...prev, loading: false }))
                );

            apiService
                .get(`agencies/${location.id}/media`)
                .then((res) => {
                    if (res && res.success) {
                        setApprovedMedia(res.data || []);
                    }
                })
                .catch((e) =>
                    console.error("Error fetching location media:", e)
                );
        }
    }, [location?.id]);

    const fetchMoreReviews = () => {
        if (
            !hasMoreReviews ||
            loadingMoreReviews ||
            loadingReviews ||
            !location?.id
        ) {
            return;
        }
        setReviewsState((prev) => ({ ...prev, loadingMore: true }));
        const nextPage = reviewsPage + 1;
        apiService
            .get(`ratings/agency/${location.id}?page=${nextPage}&limit=10`)
            .then((res) => {
                if (res && res.success && res.data) {
                    const newRatings = res.data.ratings || [];
                    setReviewsState((prev) => ({
                        ...prev,
                        list: [...prev.list, ...newRatings],
                        page: nextPage,
                        hasMore: res.data.pagination
                            ? nextPage < res.data.pagination.totalPages
                            : false,
                        loadingMore: false,
                    }));
                } else {
                    setReviewsState((prev) => ({
                        ...prev,
                        loadingMore: false,
                    }));
                }
            })
            .catch((e) => {
                console.error("Error fetching more reviews:", e);
                setReviewsState((prev) => ({ ...prev, loadingMore: false }));
            });
    };

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: translateY.value }],
    }));

    if (!location && !visible) return null;

    const handleOpenInMap = () => {
        if (!location) return;
        const lat = Number(location.latitude);
        const lng = Number(location.longitude);
        let url = "";

        if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
            url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
        } else if (location.address || location.name) {
            const query = encodeURIComponent(
                `${location.name || ""} ${location.address || ""}`.trim()
            );
            url = `https://www.google.com/maps/search/?api=1&query=${query}`;
        }

        if (url) {
            Linking.openURL(url).catch((err) =>
                console.error("Error opening Google Maps:", err)
            );
        }
    };

    const getImageUrl = (path) => {
        if (!path) return null;
        const cleanPath = path.startsWith("uploads/")
            ? path.substring(8)
            : path;
        return `${imageBaseURL}${cleanPath}`;
    };

    const isCctvAvailable = Boolean(
        location?.cctv_available === true ||
            location?.cctv_available === 1 ||
            location?.cctv_available === "1" ||
            location?.cctv_available === "yes" ||
            location?.cctv_available === "true"
    );

    return (
        <Animated.View
            style={[styles.drawerContainer, animatedStyle]}
            pointerEvents={visible ? "auto" : "none"}
        >
            <View
                style={[
                    styles.drawerCard,
                    { paddingBottom: Math.max(insets.bottom + 20, 36) },
                ]}
            >
                {/* Handle Bar */}
                <View style={styles.handleContainer}>
                    <View style={styles.handleBar} />
                </View>

                {/* Header */}
                <View style={styles.headerRow}>
                    <View style={styles.headerLeft}>
                        <View style={styles.titleRow}>
                            <Text style={styles.titleText}>
                                {location?.name || "Premium Parking"}
                            </Text>
                            {isCctvAvailable && (
                                <View style={styles.cctvBadge}>
                                    <MaterialDesignIcons
                                        name="cctv"
                                        size={13}
                                        color="#059669"
                                    />
                                    <Text style={styles.cctvBadgeText}>
                                        CCTV Available
                                    </Text>
                                </View>
                            )}
                        </View>
                        <View style={styles.ratingRow}>
                            <MaterialDesignIcons
                                name="star"
                                size={18}
                                color="#fbbf24"
                            />
                            <Text style={styles.ratingText}>
                                {ratingInfo?.totalCount > 0
                                    ? `${ratingInfo.averageRating} ★ (${
                                          ratingInfo.totalCount
                                      } ${
                                          ratingInfo.totalCount === 1
                                              ? "review"
                                              : "reviews"
                                      })`
                                    : location?.averageRating ||
                                      (location?.rating &&
                                          location.rating !== "4.8" &&
                                          parseFloat(location.rating) > 0)
                                    ? `${
                                          location.averageRating ||
                                          location.rating
                                      } ★ (${
                                          location.ratingCount || 0
                                      } reviews)`
                                    : "No ratings yet"}
                            </Text>
                        </View>
                    </View>
                    <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                        <MaterialDesignIcons
                            name="close"
                            size={24}
                            color="#4b5563"
                        />
                    </TouchableOpacity>
                </View>

                {/* 3 Tabs Header: General, Reviews, Gallery */}
                <View style={styles.tabsHeaderContainer}>
                    <TouchableOpacity
                        activeOpacity={0.8}
                        style={[
                            styles.tabItem,
                            activeTab === "general" && styles.activeTabItem,
                        ]}
                        onPress={() => setActiveTab("general")}
                    >
                        <Text
                            style={[
                                styles.tabText,
                                activeTab === "general" && styles.activeTabText,
                            ]}
                        >
                            General
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        activeOpacity={0.8}
                        style={[
                            styles.tabItem,
                            activeTab === "reviews" && styles.activeTabItem,
                        ]}
                        onPress={() => setActiveTab("reviews")}
                    >
                        <Text
                            style={[
                                styles.tabText,
                                activeTab === "reviews" && styles.activeTabText,
                            ]}
                        >
                            Reviews ({ratingInfo?.totalCount ?? 0})
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        activeOpacity={0.8}
                        style={[
                            styles.tabItem,
                            activeTab === "gallery" && styles.activeTabItem,
                        ]}
                        onPress={() => setActiveTab("gallery")}
                    >
                        <Text
                            style={[
                                styles.tabText,
                                activeTab === "gallery" && styles.activeTabText,
                            ]}
                        >
                            Gallery ({approvedMedia.length})
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Tab 1: General */}
                {activeTab === "general" && (
                    <View style={styles.tabContentContainer}>
                        {vehicleTypesSummary.length > 0 && (
                            <View style={styles.vehicleSelectorContainer}>
                                <Text style={styles.vehicleSelectorTitle}>
                                    Select Vehicle Type:
                                </Text>
                                <ScrollView
                                    horizontal
                                    showsHorizontalScrollIndicator={false}
                                    contentContainerStyle={{
                                        paddingVertical: 2,
                                    }}
                                >
                                    {vehicleTypesSummary.map((item) => {
                                        const isActive =
                                            item.type === currentVehicleType;
                                        return (
                                            <TouchableOpacity
                                                key={item.type}
                                                activeOpacity={0.8}
                                                onPress={() =>
                                                    onSelectVehicleType &&
                                                    onSelectVehicleType(
                                                        item.type
                                                    )
                                                }
                                                style={[
                                                    styles.vehicleChip,
                                                    isActive &&
                                                        styles.activeVehicleChip,
                                                ]}
                                            >
                                                <MaterialDesignIcons
                                                    name={item.icon || "car"}
                                                    size={16}
                                                    color={
                                                        isActive
                                                            ? "#4338ca"
                                                            : "#64748b"
                                                    }
                                                />
                                                <Text
                                                    style={[
                                                        styles.vehicleChipText,
                                                        isActive &&
                                                            styles.activeVehicleChipText,
                                                    ]}
                                                >
                                                    {item.label}:{" "}
                                                    {item.availableSpots} spots
                                                    (₹{item.rate}/h)
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </ScrollView>
                            </View>
                        )}

                        <View style={styles.statsCard}>
                            <View style={styles.statBoxLeft}>
                                <MaterialDesignIcons
                                    name="car-multiple"
                                    size={28}
                                    color="#4338ca"
                                />
                                <Text style={styles.statVal}>
                                    {location?.availableSpots !== undefined &&
                                    location?.availableSpots !== null
                                        ? location.availableSpots
                                        : 0}
                                </Text>
                                <Text style={styles.statLbl}>
                                    Available Spots
                                    {location?.vehicleTypeLabel
                                        ? ` (${location.vehicleTypeLabel})`
                                        : ""}
                                </Text>
                            </View>

                            <View style={styles.statBoxRight}>
                                <MaterialDesignIcons
                                    name="map-marker-distance"
                                    size={28}
                                    color="#4338ca"
                                />
                                <Text style={styles.statVal}>
                                    {location?.distance
                                        ? `${location.distance} km`
                                        : "N/A"}
                                </Text>
                                <Text style={styles.statLbl}>
                                    Distance Away
                                </Text>
                            </View>
                        </View>

                        {Boolean(location?.address) && (
                            <View style={styles.addressBox}>
                                <MaterialDesignIcons
                                    name="map-marker-outline"
                                    size={20}
                                    color="#4b5563"
                                />
                                <Text style={styles.addressText}>
                                    {location.address}
                                </Text>
                            </View>
                        )}

                        {Boolean(workingHours) && (
                            <View
                                style={[
                                    styles.addressBox,
                                    {
                                        marginTop: 8,
                                        backgroundColor: "#f0f9ff",
                                        borderColor: "#bae6fd",
                                        flexDirection: "column",
                                        alignItems: "stretch",
                                    },
                                ]}
                            >
                                <View
                                    style={{
                                        flexDirection: "row",
                                        alignItems: "center",
                                        marginBottom: 4,
                                    }}
                                >
                                    <MaterialDesignIcons
                                        name="clock-outline"
                                        size={20}
                                        color="#0284c7"
                                    />
                                    <Text
                                        style={{
                                            fontSize: 12,
                                            fontWeight: "bold",
                                            color: "#0369a1",
                                            marginLeft: 8,
                                        }}
                                    >
                                        Operating Hours Schedule
                                    </Text>
                                </View>
                                {workingHours.dailySchedules ? (
                                    <View style={{ marginTop: 2 }}>
                                        {[
                                            "Monday",
                                            "Tuesday",
                                            "Wednesday",
                                            "Thursday",
                                            "Friday",
                                            "Saturday",
                                            "Sunday",
                                        ].map((day) => {
                                            const s =
                                                workingHours.dailySchedules[
                                                    day
                                                ];
                                            if (!s) return null;
                                            return (
                                                <View
                                                    key={day}
                                                    style={{
                                                        flexDirection: "row",
                                                        justifyContent:
                                                            "space-between",
                                                        paddingVertical: 1.5,
                                                    }}
                                                >
                                                    <Text
                                                        style={{
                                                            fontSize: 10,
                                                            fontWeight: "600",
                                                            color: "#0369a1",
                                                        }}
                                                    >
                                                        {day}
                                                    </Text>
                                                    <Text
                                                        style={{
                                                            fontSize: 10,
                                                            color: s.isOpen
                                                                ? "#0c4a6e"
                                                                : "#e11d48",
                                                            fontWeight: "bold",
                                                        }}
                                                    >
                                                        {!s.isOpen
                                                            ? "Closed"
                                                            : s.is247
                                                            ? "24 Hours"
                                                            : `${formatTime12h(
                                                                  s.openTime
                                                              )} - ${formatTime12h(
                                                                  s.closeTime
                                                              )}`}
                                                    </Text>
                                                </View>
                                            );
                                        })}
                                    </View>
                                ) : (
                                    <View>
                                        <Text
                                            style={{
                                                fontSize: 11,
                                                color: "#0c4a6e",
                                                marginTop: 2,
                                            }}
                                        >
                                            {workingHours.is247
                                                ? "Open 24 Hours / 7 Days"
                                                : `${workingHours.openTime} - ${workingHours.closeTime}`}
                                        </Text>
                                        {Boolean(workingHours.workingDays) && (
                                            <Text
                                                style={{
                                                    fontSize: 10,
                                                    color: "#0284c7",
                                                    marginTop: 1,
                                                }}
                                            >
                                                Open:{" "}
                                                {workingHours.workingDays.join(
                                                    ", "
                                                )}
                                            </Text>
                                        )}
                                    </View>
                                )}
                            </View>
                        )}
                    </View>
                )}

                {/* Tab 2: Reviews */}
                {activeTab === "reviews" && (
                    <FlatList
                        data={reviewsList}
                        keyExtractor={(item, index) =>
                            (item.id || item.rating_id || index).toString()
                        }
                        renderItem={({ item: rev, index }) => {
                            const revText = rev.review || rev.comment;
                            const revDate = rev.createdAt || rev.created_at;
                            const dateStr = revDate
                                ? new Date(revDate).toLocaleDateString()
                                : "";
                            const userName = rev.userName || "User";
                            const userPhotoUrl = getImageUrl(rev.userPhoto);

                            return (
                                <View
                                    key={rev.id || rev.rating_id || index}
                                    style={styles.reviewCard}
                                >
                                    <View style={styles.reviewHeaderRow}>
                                        <View style={styles.userInfoRow}>
                                            {userPhotoUrl ? (
                                                <Image
                                                    source={{
                                                        uri: userPhotoUrl,
                                                    }}
                                                    style={styles.userAvatar}
                                                />
                                            ) : (
                                                <View
                                                    style={
                                                        styles.userAvatarPlaceholder
                                                    }
                                                >
                                                    <MaterialDesignIcons
                                                        name="account"
                                                        size={14}
                                                        color="#64748b"
                                                    />
                                                </View>
                                            )}
                                            <Text style={styles.userNameText}>
                                                {userName}
                                            </Text>
                                        </View>
                                        <Text style={styles.reviewDateText}>
                                            {dateStr}
                                        </Text>
                                    </View>
                                    <View style={styles.ratingStarsRow}>
                                        <View style={styles.starsRow}>
                                            {[1, 2, 3, 4, 5].map((s) => (
                                                <MaterialDesignIcons
                                                    key={s}
                                                    name="star"
                                                    size={12}
                                                    color={
                                                        s <= rev.rating
                                                            ? "#fbbf24"
                                                            : "#cbd5e1"
                                                    }
                                                />
                                            ))}
                                            <Text
                                                style={styles.reviewScoreText}
                                            >
                                                {rev.rating} / 5
                                            </Text>
                                        </View>
                                    </View>
                                    {revText ? (
                                        <Text style={styles.commentText}>
                                            "{revText}"
                                        </Text>
                                    ) : (
                                        <Text style={styles.noCommentText}>
                                            No written review
                                        </Text>
                                    )}
                                </View>
                            );
                        }}
                        style={styles.reviewsScroll}
                        contentContainerStyle={{ paddingBottom: 8 }}
                        showsVerticalScrollIndicator={false}
                        onEndReached={fetchMoreReviews}
                        onEndReachedThreshold={0.4}
                        ListHeaderComponent={
                            <View style={styles.overallRatingBanner}>
                                <View style={styles.overallRatingLeft}>
                                    <Text style={styles.overallRatingVal}>
                                        {ratingInfo?.averageRating || "0.0"}
                                    </Text>
                                    <View>
                                        <Text style={styles.overallRatingTitle}>
                                            Overall Rating
                                        </Text>
                                        <Text style={styles.overallRatingSub}>
                                            Based on{" "}
                                            {ratingInfo?.totalCount || 0} user
                                            reviews
                                        </Text>
                                    </View>
                                </View>
                                <View style={styles.starsRow}>
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <MaterialDesignIcons
                                            key={star}
                                            name="star"
                                            size={16}
                                            color={
                                                star <=
                                                Math.round(
                                                    ratingInfo?.averageRating ||
                                                        0
                                                )
                                                    ? "#fbbf24"
                                                    : "#cbd5e1"
                                            }
                                        />
                                    ))}
                                </View>
                            </View>
                        }
                        ListFooterComponent={
                            loadingMoreReviews ? (
                                <View style={styles.loadingMoreBox}>
                                    <ActivityIndicator
                                        size="small"
                                        color="#4338ca"
                                    />
                                    <Text style={styles.loadingMoreText}>
                                        Loading more reviews...
                                    </Text>
                                </View>
                            ) : null
                        }
                        ListEmptyComponent={
                            loadingReviews ? (
                                <View style={styles.emptyContainer}>
                                    <ActivityIndicator
                                        size="small"
                                        color="#4338ca"
                                    />
                                    <Text
                                        style={[
                                            styles.emptyText,
                                            { marginTop: 8 },
                                        ]}
                                    >
                                        Loading reviews...
                                    </Text>
                                </View>
                            ) : (
                                <View style={styles.emptyContainer}>
                                    <Text style={styles.emptyText}>
                                        No reviews written yet for this
                                        location.
                                    </Text>
                                </View>
                            )
                        }
                    />
                )}

                {/* Tab 3: Gallery */}
                {activeTab === "gallery" && (
                    <View style={styles.tabContentContainer}>
                        {approvedMedia.length > 0 ? (
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                style={styles.galleryScroll}
                            >
                                {approvedMedia.map((m) => {
                                    const mediaUrl = getImageUrl(m.file_path);
                                    return (
                                        <TouchableOpacity
                                            key={m.media_id}
                                            activeOpacity={0.85}
                                            onPress={() =>
                                                setViewerState({
                                                    visible: true,
                                                    media: {
                                                        uri: mediaUrl,
                                                        type: m.file_type,
                                                        title:
                                                            location?.name ||
                                                            "Organization Gallery",
                                                    },
                                                })
                                            }
                                            style={styles.mediaItemCard}
                                        >
                                            {m.file_type === "photo" ? (
                                                <Image
                                                    source={{ uri: mediaUrl }}
                                                    style={styles.mediaImg}
                                                    resizeMode="cover"
                                                />
                                            ) : (
                                                <View
                                                    style={
                                                        styles.videoThumbnailBox
                                                    }
                                                >
                                                    <MaterialDesignIcons
                                                        name="play-circle"
                                                        color="#ffffff"
                                                        size={36}
                                                    />
                                                    <Text
                                                        style={
                                                            styles.videoLabel
                                                        }
                                                    >
                                                        Video
                                                    </Text>
                                                </View>
                                            )}
                                        </TouchableOpacity>
                                    );
                                })}
                            </ScrollView>
                        ) : (
                            <View style={styles.emptyGalleryBox}>
                                <MaterialDesignIcons
                                    name="image-off-outline"
                                    size={36}
                                    color="#94a3b8"
                                />
                                <Text style={styles.emptyText}>
                                    No photos or videos in gallery yet
                                </Text>
                            </View>
                        )}
                    </View>
                )}

                {/* Action Buttons */}
                <View style={styles.actionButtonsRow}>
                    <TouchableOpacity
                        onPress={onStartNavigation}
                        activeOpacity={0.85}
                        style={styles.bookBtn}
                    >
                        <Text style={styles.bookBtnText}>Book Now</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <MediaViewerModal
                visible={viewerState.visible}
                onDismiss={() =>
                    setViewerState({ visible: false, media: null })
                }
                media={viewerState.media}
            />
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    drawerContainer: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        backgroundColor: "#ffffff",
    },
    drawerCard: {
        backgroundColor: "#ffffff",
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        elevation: 8,
        borderTopWidth: 1,
        borderColor: "#f1f5f9",
    },
    handleContainer: {
        alignItems: "center",
        marginBottom: 12,
    },
    handleBar: {
        width: 48,
        height: 6,
        backgroundColor: "#e2e8f0",
        borderRadius: 3,
    },
    headerRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: 12,
    },
    headerLeft: {
        flex: 1,
        marginRight: 16,
    },
    titleRow: {
        flexDirection: "row",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 6,
    },
    titleText: {
        fontSize: 22,
        fontWeight: "bold",
        color: "#1e293b",
    },
    cctvBadge: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#ecfdf5",
        borderColor: "#a7f3d0",
        borderWidth: 1,
        paddingHorizontal: 7,
        paddingVertical: 2.5,
        borderRadius: 8,
    },
    cctvBadgeText: {
        color: "#047857",
        fontSize: 11,
        fontWeight: "700",
        marginLeft: 4,
    },
    ratingRow: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 4,
    },
    ratingText: {
        color: "#475569",
        marginLeft: 4,
        fontWeight: "500",
    },
    cctvCard: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#f0fdf4",
        borderColor: "#bbf7d0",
        borderWidth: 1,
        borderRadius: 12,
        padding: 12,
        marginTop: 8,
    },
    cctvIconBox: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: "#dcfce7",
        alignItems: "center",
        justifyContent: "center",
    },
    cctvCardTitle: {
        fontSize: 12,
        fontWeight: "bold",
        color: "#166534",
    },
    cctvCardSubtitle: {
        fontSize: 10,
        color: "#15803d",
        marginTop: 1,
    },
    cctvLivePill: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#dcfce7",
        paddingHorizontal: 6,
        paddingVertical: 1.5,
        borderRadius: 6,
        marginLeft: 6,
    },
    cctvLiveDot: {
        width: 5,
        height: 5,
        borderRadius: 2.5,
        backgroundColor: "#16a34a",
        marginRight: 3,
    },
    cctvLiveText: {
        fontSize: 9,
        fontWeight: "800",
        color: "#166534",
    },
    closeBtn: {
        backgroundColor: "#f1f5f9",
        padding: 8,
        borderRadius: 20,
    },
    tabsHeaderContainer: {
        flexDirection: "row",
        backgroundColor: "#f1f5f9",
        borderRadius: 12,
        padding: 4,
        marginBottom: 16,
    },
    tabItem: {
        flex: 1,
        paddingVertical: 8,
        alignItems: "center",
        borderRadius: 8,
        backgroundColor: "transparent",
    },
    activeTabItem: {
        backgroundColor: "#ffffff",
    },
    tabText: {
        fontSize: 12,
        fontWeight: "bold",
        color: "#64748b",
    },
    activeTabText: {
        color: "#4f46e5",
    },
    tabContentContainer: {
        marginBottom: 16,
    },
    vehicleSelectorContainer: {
        marginBottom: 12,
    },
    vehicleSelectorTitle: {
        fontSize: 12,
        fontWeight: "600",
        color: "#64748b",
        marginBottom: 6,
    },
    vehicleChip: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        backgroundColor: "#f8fafc",
        borderWidth: 1,
        borderColor: "#cbd5e1",
        marginRight: 8,
    },
    activeVehicleChip: {
        backgroundColor: "#e0e7ff",
        borderColor: "#4338ca",
    },
    vehicleChipText: {
        fontSize: 12,
        fontWeight: "600",
        color: "#475569",
        marginLeft: 6,
    },
    activeVehicleChipText: {
        color: "#3730a3",
        fontWeight: "bold",
    },
    statsCard: {
        flexDirection: "row",
        justifyContent: "space-between",
        padding: 16,
        backgroundColor: "#f8fafc",
        borderRadius: 16,
        borderWidth: 1,
        borderColor: "#f1f5f9",
        marginBottom: 12,
    },
    statBoxLeft: {
        alignItems: "center",
        flex: 1,
        borderRightWidth: 1,
        borderColor: "#e2e8f0",
        paddingRight: 8,
    },
    statBoxRight: {
        alignItems: "center",
        flex: 1,
        paddingLeft: 8,
    },
    statVal: {
        marginTop: 4,
        fontWeight: "bold",
        color: "#1e293b",
        fontSize: 18,
    },
    statLbl: {
        color: "#64748b",
        fontSize: 12,
        textAlign: "center",
    },
    addressBox: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#f8fafc",
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#f1f5f9",
    },
    addressText: {
        color: "#334155",
        fontSize: 12,
        fontWeight: "500",
        marginLeft: 8,
        flex: 1,
    },
    reviewsScroll: {
        maxHeight: 220,
        marginBottom: 16,
    },
    overallRatingBanner: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: "#eef2ff",
        padding: 12,
        borderRadius: 12,
        marginBottom: 12,
    },
    overallRatingLeft: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    overallRatingVal: {
        fontSize: 24,
        fontWeight: "900",
        color: "#4338ca",
    },
    overallRatingTitle: {
        fontSize: 12,
        fontWeight: "bold",
        color: "#312e81",
    },
    overallRatingSub: {
        fontSize: 10,
        color: "#4f46e5",
    },
    starsRow: {
        flexDirection: "row",
        alignItems: "center",
    },
    reviewCard: {
        padding: 12,
        backgroundColor: "#f8fafc",
        borderRadius: 12,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: "#f1f5f9",
    },
    reviewHeaderRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 4,
    },
    userInfoRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    userAvatar: {
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: "#e2e8f0",
    },
    userAvatarPlaceholder: {
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: "#e2e8f0",
        alignItems: "center",
        justifyContent: "center",
    },
    userNameText: {
        fontSize: 12,
        fontWeight: "bold",
        color: "#1e293b",
    },
    ratingStarsRow: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 2,
        marginBottom: 4,
    },
    reviewScoreText: {
        fontSize: 12,
        fontWeight: "bold",
        color: "#334155",
        marginLeft: 4,
    },
    reviewDateText: {
        fontSize: 10,
        color: "#94a3b8",
    },
    commentText: {
        color: "#475569",
        fontSize: 12,
        fontStyle: "italic",
        marginTop: 2,
    },
    noCommentText: {
        color: "#94a3b8",
        fontSize: 12,
        fontStyle: "italic",
        marginTop: 2,
    },
    emptyContainer: {
        paddingVertical: 24,
        alignItems: "center",
        justifyContent: "center",
    },
    emptyText: {
        color: "#94a3b8",
        fontSize: 12,
        fontWeight: "500",
    },
    loadingMoreBox: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 10,
        gap: 8,
    },
    loadingMoreText: {
        fontSize: 11,
        color: "#64748b",
        fontWeight: "500",
    },
    galleryScroll: {
        paddingVertical: 4,
    },
    mediaItemCard: {
        marginRight: 12,
        width: 128,
        height: 96,
        borderRadius: 12,
        overflow: "hidden",
        backgroundColor: "#f1f5f9",
        borderWidth: 1,
        borderColor: "#e2e8f0",
        justifyContent: "center",
        alignItems: "center",
    },
    mediaImg: {
        width: "100%",
        height: "100%",
    },
    videoThumbnailBox: {
        width: "100%",
        height: "100%",
        backgroundColor: "#0f172a",
        justifyContent: "center",
        alignItems: "center",
    },
    videoLabel: {
        color: "#ffffff",
        fontSize: 10,
        fontWeight: "bold",
    },
    emptyGalleryBox: {
        paddingVertical: 32,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#f8fafc",
        borderRadius: 16,
        borderWidth: 1,
        borderStyle: "dashed",
        borderColor: "#e2e8f0",
    },
    actionButtonsRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        marginTop: 12,
    },
    openMapBtn: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        borderRadius: 12,
        paddingVertical: 14,
        backgroundColor: "#f0f9ff",
        borderWidth: 1,
        borderColor: "#bae6fd",
    },
    openMapBtnText: {
        color: "#0284c7",
        fontSize: 15,
        fontWeight: "bold",
    },
    bookBtn: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 12,
        paddingVertical: 14,
        backgroundColor: "#4338ca",
    },
    bookBtnText: {
        color: "#ffffff",
        fontSize: 16,
        fontWeight: "bold",
    },
});

export default ParkingDetailDrawer;
