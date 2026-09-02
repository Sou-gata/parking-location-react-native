import React, { useState, useEffect } from "react";
import {
    View,
    Image,
    ScrollView,
    ActivityIndicator,
    Modal,
    TouchableWithoutFeedback,
} from "react-native";
import { Text, Button, Card, Avatar, IconButton } from "react-native-paper";
import Chip from "../Chip";
import { MaterialDesignIcons } from "@react-native-vector-icons/material-design-icons";
import apiService from "../../utils/apiService";
import { imageBaseURL } from "../../utils/baseURL";

export default function UserProfileModal({
    visible,
    onDismiss,
    userId,
    fallbackName = "",
    fallbackPhone = "",
}) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [data, setData] = useState(null);

    const fetchUserProfileAndRatings = async () => {
        if (!userId) return;
        setLoading(true);
        setError(null);
        try {
            const res = await apiService.get(`ratings/user/${userId}`);
            if (res && res.success) {
                setData(res.data);
            } else {
                setError(res?.message || "Failed to load user profile");
            }
        } catch (err) {
            console.error("Error fetching user profile & ratings:", err);
            setError("Could not load user profile details.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (visible && userId) {
            fetchUserProfileAndRatings();
        } else if (!visible) {
            setData(null);
            setError(null);
        }
    }, [visible, userId]);

    const getImageUrl = (path) => {
        if (!path) return null;
        const cleanPath = path.startsWith("uploads/")
            ? path.substring(8)
            : path;
        return `${imageBaseURL}${cleanPath}`;
    };

    const userProfile = data?.userProfile;
    const stats = data?.stats;
    const receivedRatings = data?.receivedRatings || [];

    const displayName =
        userProfile?.fullName || fallbackName || "Customer Profile";
    const displayPhone = userProfile?.phoneNumber || fallbackPhone || "N/A";
    const displayEmail = userProfile?.email || "N/A";
    const photoUrl = getImageUrl(userProfile?.profilePhoto);
    const avgRating =
        stats?.averageRating !== undefined ? stats.averageRating : 0;
    const totalCount = stats?.totalCount || 0;

    const renderStars = (rating = 0, size = 16) => {
        const stars = [];
        for (let i = 1; i <= 5; i++) {
            let iconName = "star-outline";
            let color = "#cbd5e1"; // slate-300
            if (i <= Math.floor(rating)) {
                iconName = "star";
                color = "#f59e0b"; // amber-500
            } else if (i - rating <= 0.5 && i - rating > 0) {
                iconName = "star-half-full";
                color = "#f59e0b";
            }
            stars.push(
                <MaterialDesignIcons
                    key={i}
                    name={iconName}
                    size={size}
                    color={color}
                    style={{ marginRight: 2 }}
                />
            );
        }
        return <View className="flex-row items-center">{stars}</View>;
    };

    const formatDate = (dateString) => {
        if (!dateString) return "";
        try {
            const d = new Date(dateString);
            return d.toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
            });
        } catch (e) {
            return dateString;
        }
    };

    return (
        <Modal
            visible={Boolean(visible)}
            transparent={true}
            animationType="fade"
            onRequestClose={onDismiss}
        >
            <TouchableWithoutFeedback onPress={onDismiss}>
                <View className="flex-1 bg-black/50 justify-center items-center p-4">
                    <TouchableWithoutFeedback
                        onPress={(e) => e.stopPropagation()}
                    >
                        <View className="bg-white rounded-3xl p-5 w-[92%] max-w-[500px] max-h-[85%] shadow-2xl">
                            <ScrollView showsVerticalScrollIndicator={false}>
                                {/* Header */}
                                <View className="flex-row items-center justify-between mb-3 pb-2 border-b border-slate-100">
                                    <View className="flex-row items-center gap-2 flex-1">
                                        <View className="w-8 h-8 rounded-full bg-indigo-50 items-center justify-center">
                                            <MaterialDesignIcons
                                                name="account-details"
                                                size={20}
                                                color="#4338ca"
                                            />
                                        </View>
                                        <Text
                                            className="text-lg font-bold text-slate-800 flex-1"
                                            numberOfLines={1}
                                        >
                                            User Profile & Reviews
                                        </Text>
                                    </View>
                                    <IconButton
                                        icon="close"
                                        size={22}
                                        onPress={onDismiss}
                                        className="m-0"
                                    />
                                </View>

                                {loading ? (
                                    <View className="py-12 items-center justify-center">
                                        <ActivityIndicator
                                            size="large"
                                            color="#4338ca"
                                        />
                                        <Text className="text-sm font-semibold text-slate-500 mt-3">
                                            Fetching profile & rating details...
                                        </Text>
                                    </View>
                                ) : (
                                    <>
                                        {/* User Profile Card */}
                                        <Card className="mb-4 bg-slate-50 border border-slate-100 rounded-2xl elevation-0">
                                            <Card.Content className="p-4">
                                                <View className="flex-row items-center">
                                                    {photoUrl ? (
                                                        <Image
                                                            source={{
                                                                uri: photoUrl,
                                                            }}
                                                            style={{
                                                                width: 64,
                                                                height: 64,
                                                                borderRadius: 32,
                                                                borderWidth: 2,
                                                                borderColor:
                                                                    "#818cf8",
                                                            }}
                                                            resizeMode="cover"
                                                        />
                                                    ) : (
                                                        <Avatar.Text
                                                            size={64}
                                                            label={
                                                                displayName
                                                                    ? displayName
                                                                          .substring(
                                                                              0,
                                                                              2
                                                                          )
                                                                          .toUpperCase()
                                                                    : "US"
                                                            }
                                                            style={{
                                                                backgroundColor:
                                                                    "#6366f1",
                                                            }}
                                                            labelStyle={{
                                                                color: "white",
                                                                fontWeight:
                                                                    "bold",
                                                                fontSize: 22,
                                                            }}
                                                        />
                                                    )}

                                                    <View className="ml-3.5 flex-1 gap-0.5">
                                                        <View className="flex-row items-center justify-between">
                                                            <Text
                                                                className="text-base font-bold text-slate-900 flex-1 pr-1"
                                                                numberOfLines={
                                                                    1
                                                                }
                                                            >
                                                                {displayName}
                                                            </Text>
                                                        </View>

                                                        <View className="flex-row items-center mt-1">
                                                            <MaterialDesignIcons
                                                                name="phone"
                                                                size={14}
                                                                color="#64748b"
                                                            />
                                                            <Text className="text-xs text-slate-600 ml-1.5 font-medium">
                                                                {displayPhone}
                                                            </Text>
                                                        </View>

                                                        {displayEmail !==
                                                            "N/A" && (
                                                            <View className="flex-row items-center mt-0.5">
                                                                <MaterialDesignIcons
                                                                    name="email-outline"
                                                                    size={14}
                                                                    color="#64748b"
                                                                />
                                                                <Text
                                                                    className="text-xs text-slate-600 ml-1.5 font-medium"
                                                                    numberOfLines={
                                                                        1
                                                                    }
                                                                >
                                                                    {
                                                                        displayEmail
                                                                    }
                                                                </Text>
                                                            </View>
                                                        )}
                                                    </View>
                                                </View>
                                            </Card.Content>
                                        </Card>

                                        {/* Overall Rating Overview Card */}
                                        <Card className="mb-4 bg-indigo-900 rounded-2xl border-0 overflow-hidden">
                                            <Card.Content className="p-4">
                                                <View className="flex-row items-center justify-between">
                                                    <View className="flex-1">
                                                        <Text className="text-xs font-semibold text-indigo-200 uppercase tracking-wider">
                                                            Average Owner Rating
                                                        </Text>
                                                        <View className="flex-row items-baseline mt-1 gap-2">
                                                            <Text className="text-3xl font-extrabold text-white">
                                                                {avgRating > 0
                                                                    ? avgRating.toFixed(
                                                                          1
                                                                      )
                                                                    : "N/A"}
                                                            </Text>
                                                            {avgRating > 0 && (
                                                                <Text className="text-sm font-semibold text-indigo-200">
                                                                    / 5.0
                                                                </Text>
                                                            )}
                                                        </View>
                                                        <View className="mt-1.5">
                                                            {renderStars(
                                                                avgRating,
                                                                18
                                                            )}
                                                        </View>
                                                    </View>

                                                    <View className="items-end bg-indigo-800 px-3 py-2 rounded-xl">
                                                        <Text className="text-lg font-bold text-white w-full text-center">
                                                            {totalCount}
                                                        </Text>
                                                        <Text className="text-[10px] font-medium text-indigo-200 uppercase">
                                                            {totalCount === 1
                                                                ? "Review"
                                                                : "Reviews"}
                                                        </Text>
                                                    </View>
                                                </View>
                                            </Card.Content>
                                        </Card>

                                        {/* Owner Reviews Section */}
                                        <View className="mb-2">
                                            <Text className="text-sm font-bold text-slate-800 mb-2">
                                                Reviews from Parking Owners (
                                                {receivedRatings.length})
                                            </Text>

                                            {receivedRatings.length === 0 ? (
                                                <View className="py-6 px-4 bg-slate-50 rounded-xl items-center justify-center border border-dashed border-slate-200">
                                                    <MaterialDesignIcons
                                                        name="message-draw"
                                                        size={32}
                                                        color="#94a3b8"
                                                    />
                                                    <Text className="text-xs font-semibold text-slate-500 mt-2 text-center">
                                                        No reviews submitted by
                                                        parking owners yet for
                                                        this user.
                                                    </Text>
                                                </View>
                                            ) : (
                                                <View className="gap-2.5">
                                                    {receivedRatings.map(
                                                        (item, index) => (
                                                            <View
                                                                key={
                                                                    item.ratingId ||
                                                                    index
                                                                }
                                                                className="p-3 bg-white border border-slate-100 rounded-xl shadow-xs"
                                                            >
                                                                <View className="flex-row items-center justify-between mb-1.5">
                                                                    <Text
                                                                        className="text-xs font-bold text-slate-800 flex-1 pr-2"
                                                                        numberOfLines={
                                                                            1
                                                                        }
                                                                    >
                                                                        {item.agencyName ||
                                                                            "Parking Owner"}
                                                                    </Text>
                                                                    <Text className="text-[10px] font-medium text-slate-400">
                                                                        {formatDate(
                                                                            item.createdAt
                                                                        )}
                                                                    </Text>
                                                                </View>

                                                                <View className="flex-row items-center mb-1.5">
                                                                    {renderStars(
                                                                        item.rating,
                                                                        14
                                                                    )}
                                                                    <Text className="text-xs font-bold text-amber-600 ml-1.5">
                                                                        {
                                                                            item.rating
                                                                        }
                                                                        .0
                                                                    </Text>
                                                                </View>

                                                                {item.review ? (
                                                                    <Text className="text-xs text-slate-600 italic bg-slate-50 p-2 rounded-lg border border-slate-100">
                                                                        "
                                                                        {
                                                                            item.review
                                                                        }
                                                                        "
                                                                    </Text>
                                                                ) : (
                                                                    <Text className="text-[11px] text-slate-400 italic">
                                                                        No
                                                                        review
                                                                        comment
                                                                        attached.
                                                                    </Text>
                                                                )}
                                                            </View>
                                                        )
                                                    )}
                                                </View>
                                            )}
                                        </View>
                                    </>
                                )}

                                {error && (
                                    <View className="mt-3 p-3 bg-red-50 rounded-xl border border-red-100 items-center">
                                        <Text className="text-xs font-semibold text-red-600 text-center mb-2">
                                            {error}
                                        </Text>
                                        <Button
                                            mode="outlined"
                                            compact={true}
                                            onPress={fetchUserProfileAndRatings}
                                            textColor="#dc2626"
                                            style={{ borderColor: "#fca5a5" }}
                                        >
                                            Retry
                                        </Button>
                                    </View>
                                )}
                            </ScrollView>
                        </View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
}
