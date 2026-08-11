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
    IconButton,
    Badge,
    TextInput,
} from "react-native-paper";
import { useSelector, useDispatch } from "react-redux";
import { logoutAndClearToken, updateUser } from "../store/slices/userSlice";
import apiService from "../utils/apiService";
import { imageBaseURL } from "../utils/baseURL";
import { ROLES, PERMISSIONS, ROLE_DISPLAY_NAMES } from "../utils/rbacConfig";
import useRolePermissions from "../hooks/useRolePermissions";
import useToast from "../hooks/useToast";

export default function Profile({ navigation }) {
    const dispatch = useDispatch();
    const toast = useToast();
    const { role, hasPermission } = useRolePermissions();
    const reduxUser = useSelector((state) => state.user.user);

    const [profile, setProfile] = useState(reduxUser);
    const [loading, setLoading] = useState(false);
    const [ratingStats, setRatingStats] = useState(null);
    const [userReviewsList, setUserReviewsList] = useState([]);

    const [drivingLicence, setDrivingLicence] = useState("");
    const [vehiclesList, setVehiclesList] = useState([]);
    const [newVehicleInput, setNewVehicleInput] = useState("");
    const [saving, setSaving] = useState(false);

    const fetchRatingData = async (userObj) => {
        try {
            if (!userObj) return;
            const role = userObj.role || ROLES.USER;
            let endpoint = "";
            if (role === ROLES.AGENCY_ADMIN && userObj.agency_id) {
                endpoint = `ratings/agency/${userObj.agency_id}`;
            } else if (userObj.id || userObj.user_id) {
                endpoint = `ratings/user/${userObj.id || userObj.user_id}`;
            }

            if (endpoint) {
                const res = await apiService.get(endpoint);
                if (res && res.success && res.data) {
                    if (res.data.stats) setRatingStats(res.data.stats);
                    if (res.data.ratings) setUserReviewsList(res.data.ratings);
                }
            }
        } catch (error) {
            console.error("Error fetching ratings in profile:", error);
        }
    };

    useEffect(() => {
        if (profile) {
            setDrivingLicence(profile.driving_licence || "");

            let parsedVehicles = [];
            try {
                if (profile.vehicle_numbers) {
                    if (profile.vehicle_numbers.startsWith("[")) {
                        parsedVehicles = JSON.parse(profile.vehicle_numbers);
                    } else {
                        parsedVehicles = profile.vehicle_numbers
                            .split(",")
                            .map((v) => v.trim())
                            .filter(Boolean);
                    }
                }
            } catch (e) {
                console.error("Error parsing vehicle numbers in profile:", e);
            }
            setVehiclesList(parsedVehicles);
        }
    }, [profile]);

    const handleAddVehicle = () => {
        const cleaned = newVehicleInput.trim().toUpperCase();
        if (!cleaned) {
            toast.error(
                "Please enter a valid vehicle number",
                "Validation Error",
                true
            );
            return;
        }
        if (vehiclesList.includes(cleaned)) {
            toast.error(
                "This vehicle number is already added",
                "Validation Error",
                true
            );
            return;
        }
        setVehiclesList([...vehiclesList, cleaned]);
        setNewVehicleInput("");
    };

    const handleRemoveVehicle = (indexToRemove) => {
        setVehiclesList(vehiclesList.filter((_, idx) => idx !== indexToRemove));
    };

    const handleSaveChanges = async () => {
        setSaving(true);
        try {
            const res = await apiService.put("users/profile", {
                driving_licence: drivingLicence.trim(),
                vehicle_numbers: JSON.stringify(vehiclesList),
            });
            if (res && res.success) {
                toast.success(
                    "Profile details updated successfully",
                    "Success",
                    true
                );
                setProfile(res.data);
                dispatch(updateUser(res.data));
            } else {
                toast.error(
                    res?.message || "Failed to update profile details",
                    "Error",
                    true
                );
            }
        } catch (error) {
            console.error("Error updating profile:", error);
            toast.error(
                "Failed to reach server. Please try again later.",
                "Error",
                true
            );
        } finally {
            setSaving(false);
        }
    };

    const fetchProfile = async () => {
        setLoading(true);
        try {
            const res = await apiService.get("users/profile");
            if (res && res.success) {
                setProfile(res.data);
                dispatch(updateUser(res.data));
                fetchRatingData(res.data);
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
            if (profile) fetchRatingData(profile);
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
    const roleName = role || "user";
    const isAgencyAdmin = hasPermission(PERMISSIONS.MANAGE_LOCATIONS);

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

                {/* 2.5 Ratings & Feedback Card */}
                <Card className="bg-white border border-slate-100 rounded-2xl elevation-1">
                    <Card.Content className="p-4">
                        <View className="flex-row items-center justify-between mb-3">
                            <Text className="text-sm font-bold text-indigo-700 uppercase tracking-wider">
                                {hasPermission(PERMISSIONS.BOOK_PARKING)
                                    ? "Customer Rating Score"
                                    : "Agency Ratings & Reviews"}
                            </Text>
                            {ratingStats?.averageRating > 0 && (
                                <View className="flex-row items-center bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                                    <IconButton
                                        icon="star"
                                        iconColor="#d97706"
                                        size={16}
                                        style={{ margin: 0 }}
                                    />
                                    <Text className="text-amber-800 font-bold text-sm ml-1">
                                        {ratingStats.averageRating} / 5
                                    </Text>
                                </View>
                            )}
                        </View>

                        <View className="flex-row items-center justify-around py-3 bg-indigo-50/50 rounded-xl border border-indigo-100 mb-3">
                            <View className="items-center">
                                <Text className="text-2xl font-bold text-indigo-900">
                                    {ratingStats?.averageRating
                                        ? `${ratingStats.averageRating} ★`
                                        : "New"}
                                </Text>
                                <Text className="text-xs text-indigo-600 font-semibold mt-0.5">
                                    Average Score
                                </Text>
                            </View>
                            <View className="h-8 w-[1px] bg-indigo-200" />
                            <View className="items-center">
                                <Text className="text-2xl font-bold text-indigo-900">
                                    {ratingStats?.totalCount || 0}
                                </Text>
                                <Text className="text-xs text-indigo-600 font-semibold mt-0.5">
                                    Total Reviews
                                </Text>
                            </View>
                        </View>

                        {userReviewsList && userReviewsList.length > 0 ? (
                            <View className="mt-2 gap-2">
                                <Text className="text-xs font-bold text-slate-500 mb-1 uppercase">
                                    Recent Reviews
                                </Text>
                                {userReviewsList.slice(0, 3).map((r, idx) => (
                                    <View
                                        key={r.id || idx}
                                        className="p-3 bg-slate-50 rounded-xl border border-slate-100"
                                    >
                                        <View className="flex-row items-center justify-between">
                                            <Text className="text-xs font-bold text-slate-700">
                                                {r.agencyName ||
                                                    r.userName ||
                                                    "Rating"}
                                            </Text>
                                            <Text className="text-xs font-bold text-amber-600">
                                                {"★".repeat(r.rating)} (
                                                {r.rating}/5)
                                            </Text>
                                        </View>
                                        {Boolean(r.review) && (
                                            <Text className="text-xs text-slate-600 italic mt-1">
                                                "{r.review}"
                                            </Text>
                                        )}
                                    </View>
                                ))}
                            </View>
                        ) : (
                            <Text className="text-xs text-slate-400 text-center italic py-2">
                                No ratings received yet. Ratings are submitted
                                after completing checkouts!
                            </Text>
                        )}
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

                {/* 3.5 Vehicles & License Details (Only for Customer role) */}
                {hasPermission(PERMISSIONS.BOOK_PARKING) && (
                    <Card className="bg-white border border-slate-100 rounded-2xl elevation-1">
                        <Card.Content className="p-4">
                            <Text className="text-sm font-bold text-indigo-700 uppercase tracking-wider mb-4">
                                Vehicles & License Details
                            </Text>

                            {/* Driving License */}
                            <TextInput
                                label="Driving License Number"
                                value={drivingLicence}
                                onChangeText={setDrivingLicence}
                                mode="outlined"
                                dense
                                autoCapitalize="characters"
                                className="bg-white mb-4"
                                outlineColor="#e2e8f0"
                                activeOutlineColor="#4338ca"
                                left={
                                    <TextInput.Icon icon="card-account-details-outline" />
                                }
                            />

                            <Divider className="bg-slate-100 mb-4" />

                            <Text className="text-xs font-semibold text-slate-400 mb-2">
                                Registered Vehicle Numbers
                            </Text>

                            {/* Vehicles List */}
                            {vehiclesList.length === 0 ? (
                                <Text className="text-sm text-slate-400 italic mb-4">
                                    No vehicle numbers added yet.
                                </Text>
                            ) : (
                                <View className="mb-4">
                                    {vehiclesList.map((vehicle, idx) => (
                                        <View
                                            key={idx}
                                            className="flex-row justify-between items-center bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-xl mb-1.5"
                                        >
                                            <View className="flex-row items-center">
                                                <IconButton
                                                    icon="car"
                                                    iconColor="#64748b"
                                                    size={18}
                                                    className="m-0 mr-1"
                                                />
                                                <Text className="text-sm text-slate-700 font-bold">
                                                    {vehicle}
                                                </Text>
                                            </View>
                                            <IconButton
                                                icon="trash-can-outline"
                                                iconColor="#ef4444"
                                                size={18}
                                                className="m-0"
                                                onPress={() =>
                                                    handleRemoveVehicle(idx)
                                                }
                                            />
                                        </View>
                                    ))}
                                </View>
                            )}

                            {/* Add Vehicle Input */}
                            <View className="flex-row items-center gap-2 mb-4">
                                <TextInput
                                    label="Add Vehicle Number"
                                    value={newVehicleInput}
                                    onChangeText={setNewVehicleInput}
                                    mode="outlined"
                                    dense
                                    placeholder="e.g. WB-02-1234"
                                    autoCapitalize="characters"
                                    className="flex-1 bg-white"
                                    outlineColor="#e2e8f0"
                                    activeOutlineColor="#4338ca"
                                />
                                <Button
                                    mode="contained"
                                    onPress={handleAddVehicle}
                                    buttonColor="#4338ca"
                                    className="rounded-lg h-[40px] justify-center"
                                >
                                    Add
                                </Button>
                            </View>

                            <Button
                                mode="contained"
                                onPress={handleSaveChanges}
                                loading={saving}
                                disabled={saving}
                                buttonColor="#4338ca"
                                className="rounded-xl py-1"
                                labelStyle={{ fontWeight: "bold" }}
                            >
                                Save Changes
                            </Button>
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
