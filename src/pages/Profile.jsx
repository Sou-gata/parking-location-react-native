import React, { useState, useEffect } from "react";
import {
    View,
    ScrollView,
    StyleSheet,
    Image,
    ActivityIndicator,
} from "react-native";
import {
    Text,
    Card,
    Avatar,
    Divider,
    Button,
    List,
    IconButton,
    Badge,
} from "react-native-paper";
import { useSelector, useDispatch } from "react-redux";
import { logoutAndClearToken, updateUser } from "../store/slices/userSlice";
import apiService from "../utils/apiService";
import { imageBaseURL } from "../utils/baseURL";
import { ROLES, ROLE_DISPLAY_NAMES } from "../utils/rbacConfig";
import useToast from "../hooks/useToast";

export default function Profile({ navigation }) {
    const dispatch = useDispatch();
    const toast = useToast();
    const reduxUser = useSelector((state) => state.user.user);

    const [profile, setProfile] = useState(reduxUser);
    const [loading, setLoading] = useState(false);

    const fetchProfile = async () => {
        setLoading(true);
        try {
            const res = await apiService.get("users/profile");
            if (res && res.success) {
                setProfile(res.data);
                dispatch(updateUser(res.data));
            } else {
                toast.error(
                    res?.message || "Failed to fetch profile details",
                    "Error",
                    true
                );
            }
        } catch (error) {
            console.error("Error fetching profile:", error);
            // Non-blocking fallback: use redux data
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProfile();
    }, []);

    const handleSignOut = () => {
        dispatch(logoutAndClearToken());
        toast.success("Signed out successfully", "Logged Out", true);
    };

    // Helper to format image paths properly
    const getImageUrl = (path) => {
        if (!path) return null;
        const cleanPath = path.startsWith("uploads/")
            ? path.substring(8)
            : path;
        return `${imageBaseURL}${cleanPath}`;
    };

    const photoUrl = getImageUrl(profile?.profile_photo_path);
    const roleName = profile?.role || ROLES.USER;
    const isAgencyAdmin = roleName === ROLES.AGENCY_ADMIN;

    if (loading && !profile) {
        return (
            <View className="flex-1 justify-center items-center bg-slate-50">
                <ActivityIndicator size="large" color="#4338ca" />
            </View>
        );
    }

    return (
        <ScrollView
            className="flex-1 bg-slate-50"
            showsVerticalScrollIndicator={false}
        >
            {/* 1. Header Hero section */}
            <View className="bg-indigo-700 pt-10 pb-8 px-6 items-center rounded-b-[32px] shadow-md">
                <View className="relative">
                    {photoUrl ? (
                        <Image
                            source={{ uri: photoUrl }}
                            className="w-24 h-24 rounded-full border-4 border-indigo-400 bg-white"
                            resizeMode="cover"
                        />
                    ) : (
                        <Avatar.Text
                            size={96}
                            label={
                                profile?.name?.substring(0, 2).toUpperCase() ||
                                "US"
                            }
                            style={{ backgroundColor: "#818cf8" }}
                            labelStyle={{ color: "white", fontWeight: "bold" }}
                        />
                    )}
                </View>

                <Text className="text-white text-xl font-bold mt-3">
                    {profile?.name || "User Profile"}
                </Text>

                <Badge className="bg-indigo-900 text-indigo-200 font-bold px-3 py-0.5 rounded-full text-xs mt-2 self-center border border-indigo-500/30">
                    {ROLE_DISPLAY_NAMES[roleName] || "Customer"}
                </Badge>
            </View>

            <View className="px-5 py-6 gap-4">
                {/* 2. Basic Contact Information */}
                <Card className="bg-white border border-slate-100 rounded-2xl elevation-1">
                    <Card.Content className="p-4">
                        <Text className="text-sm font-bold text-indigo-700 uppercase tracking-wider mb-3">
                            Account Information
                        </Text>

                        <View className="flex-row items-center py-2.5">
                            <IconButton
                                icon="account-circle-outline"
                                iconColor="#64748b"
                                className="m-0"
                                size={22}
                            />
                            <View className="ml-3 flex-1">
                                <Text className="text-xs text-slate-400 font-semibold">
                                    Username
                                </Text>
                                <Text className="text-sm text-slate-700 font-bold mt-0.5">
                                    @{profile?.username || "N/A"}
                                </Text>
                            </View>
                        </View>

                        <Divider className="bg-slate-100 ml-10" />

                        <View className="flex-row items-center py-2.5">
                            <IconButton
                                icon="email-outline"
                                iconColor="#64748b"
                                className="m-0"
                                size={22}
                            />
                            <View className="ml-3 flex-1">
                                <Text className="text-xs text-slate-400 font-semibold">
                                    Email Address
                                </Text>
                                <Text className="text-sm text-slate-700 font-bold mt-0.5">
                                    {profile?.email || "N/A"}
                                </Text>
                            </View>
                        </View>

                        <Divider className="bg-slate-100 ml-10" />

                        <View className="flex-row items-center py-2.5">
                            <IconButton
                                icon="phone-outline"
                                iconColor="#64748b"
                                className="m-0"
                                size={22}
                            />
                            <View className="ml-3 flex-1">
                                <Text className="text-xs text-slate-400 font-semibold">
                                    Phone Number
                                </Text>
                                <Text className="text-sm text-slate-700 font-bold mt-0.5">
                                    {profile?.phone_number || "N/A"}
                                </Text>
                            </View>
                        </View>
                    </Card.Content>
                </Card>

                {/* 3. Address & Location Details (if user has address fields) */}
                {(profile?.user_address ||
                    profile?.org_address ||
                    profile?.landmark) && (
                    <Card className="bg-white border border-slate-100 rounded-2xl elevation-1">
                        <Card.Content className="p-4">
                            <Text className="text-sm font-bold text-indigo-700 uppercase tracking-wider mb-3">
                                Location Details
                            </Text>

                            <View className="flex-row items-center py-2.5">
                                <IconButton
                                    icon="map-marker-outline"
                                    iconColor="#64748b"
                                    className="m-0"
                                    size={22}
                                />
                                <View className="ml-3 flex-1">
                                    <Text className="text-xs text-slate-400 font-semibold">
                                        Address
                                    </Text>
                                    <Text className="text-sm text-slate-700 font-bold mt-0.5">
                                        {profile?.user_address ||
                                            profile?.org_address ||
                                            "N/A"}
                                    </Text>
                                </View>
                            </View>

                            {profile?.landmark && (
                                <>
                                    <Divider className="bg-slate-100 ml-10" />
                                    <View className="flex-row items-center py-2.5">
                                        <IconButton
                                            icon="office-building-marker-outline"
                                            iconColor="#64748b"
                                            className="m-0"
                                            size={22}
                                        />
                                        <View className="ml-3 flex-1">
                                            <Text className="text-xs text-slate-400 font-semibold">
                                                Landmark
                                            </Text>
                                            <Text className="text-sm text-slate-700 font-bold mt-0.5">
                                                {profile?.landmark}
                                            </Text>
                                        </View>
                                    </View>
                                </>
                            )}
                        </Card.Content>
                    </Card>
                )}

                {/* 4. Rates & Capacities (Only for Agency Admin) */}
                {isAgencyAdmin && (
                    <>
                        <Card className="bg-white border border-slate-100 rounded-2xl elevation-1">
                            <Card.Content className="p-4">
                                <View className="flex-row justify-between items-center mb-3">
                                    <Text className="text-sm font-bold text-indigo-700 uppercase tracking-wider">
                                        Parking Capacities
                                    </Text>
                                    <Badge className="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded text-[10px]">
                                        EV Charging:{" "}
                                        {profile?.ev_charging_support
                                            ? "YES"
                                            : "NO"}
                                    </Badge>
                                </View>

                                <View className="flex-row flex-wrap justify-between">
                                    {[
                                        {
                                            label: "2 Wheeler",
                                            val: profile?.two_wheeler_capacity,
                                        },
                                        {
                                            label: "3 Wheeler",
                                            val: profile?.three_wheeler_capacity,
                                        },
                                        {
                                            label: "Car",
                                            val: profile?.car_capacity,
                                        },
                                        {
                                            label: "SUV",
                                            val: profile?.suv_capacity,
                                        },
                                        {
                                            label: "Van",
                                            val: profile?.van_capacity,
                                        },
                                        {
                                            label: "Pickup",
                                            val: profile?.pickup_capacity,
                                        },
                                        {
                                            label: "EV Slots",
                                            val: profile?.ev_capacity,
                                        },
                                    ].map((cap, i) => (
                                        <View
                                            key={i}
                                            className="w-[30%] bg-slate-50 p-2 rounded-lg items-center mb-2 border border-slate-100"
                                        >
                                            <Text className="text-[10px] text-slate-500 font-semibold text-center">
                                                {cap.label}
                                            </Text>
                                            <Text className="text-sm font-bold text-slate-800 mt-0.5">
                                                {cap.val || 0}
                                            </Text>
                                        </View>
                                    ))}
                                    <View className="w-[30%]" /> {/* spacer */}
                                </View>
                            </Card.Content>
                        </Card>

                        <Card className="bg-white border border-slate-100 rounded-2xl elevation-1">
                            <Card.Content className="p-4">
                                <Text className="text-sm font-bold text-indigo-700 uppercase tracking-wider mb-3">
                                    Hourly Rates (₹)
                                </Text>

                                <View className="flex-row flex-wrap justify-between">
                                    {[
                                        {
                                            label: "2 Wheeler",
                                            val: profile?.two_wheeler_rate,
                                        },
                                        {
                                            label: "3 Wheeler",
                                            val: profile?.three_wheeler_rate,
                                        },
                                        {
                                            label: "Car",
                                            val: profile?.car_rate,
                                        },
                                        {
                                            label: "SUV",
                                            val: profile?.suv_rate,
                                        },
                                        {
                                            label: "Van",
                                            val: profile?.van_rate,
                                        },
                                        {
                                            label: "Pickup",
                                            val: profile?.pickup_rate,
                                        },
                                        { label: "EV", val: profile?.ev_rate },
                                    ].map((rt, i) => (
                                        <View
                                            key={i}
                                            className="w-[30%] bg-emerald-50/40 p-2 rounded-lg items-center mb-2 border border-emerald-100/50"
                                        >
                                            <Text className="text-[10px] text-slate-500 font-semibold text-center">
                                                {rt.label}
                                            </Text>
                                            <Text className="text-sm font-bold text-emerald-800 mt-0.5">
                                                ₹{rt.val || 0}
                                            </Text>
                                        </View>
                                    ))}
                                    <View className="w-[30%]" /> {/* spacer */}
                                </View>
                            </Card.Content>
                        </Card>
                    </>
                )}

                {/* 5. Sign Out Action Button */}
                <Button
                    mode="contained"
                    onPress={handleSignOut}
                    buttonColor="#dc2626"
                    className="rounded-xl py-1.5 mt-2"
                    labelStyle={{
                        color: "white",
                        fontSize: 15,
                        fontWeight: "bold",
                    }}
                >
                    Sign Out
                </Button>
            </View>
        </ScrollView>
    );
}
