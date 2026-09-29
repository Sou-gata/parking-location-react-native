import React, { useState, useEffect, useMemo } from "react";
import {
    View,
    ScrollView,
    StyleSheet,
    Image,
    ActivityIndicator,
    Linking,
    TouchableOpacity,
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
    RadioButton,
} from "react-native-paper";
import { useSelector, useDispatch } from "react-redux";
import ImageCropPicker from "react-native-image-crop-picker";
import {
    Image as ImageCompressor,
    Video as VideoCompressor,
} from "react-native-compressor";
import { MaterialDesignIcons } from "@react-native-vector-icons/material-design-icons";
import { pick, isCancel } from "@react-native-documents/picker";

import { logoutAndClearToken, updateUser } from "../store/slices/userSlice";
import apiService from "../utils/apiService";
import { imageBaseURL } from "../utils/baseURL";
import { ROLES, PERMISSIONS, ROLE_DISPLAY_NAMES } from "../utils/rbacConfig";
import useRolePermissions from "../hooks/useRolePermissions";
import useToast from "../hooks/useToast";
import { fileToBase64 } from "../utils/helperFunctions";
import MediaViewerModal from "../components/MediaViewerModal";
import SignupMap from "../components/SignupMap";
import {
    validateCapacityFitsSpace,
    BLOCK_ON_CAPACITY_EXCEEDED,
} from "../utils/capacityValidator";

export default function Profile({ navigation }) {
    const dispatch = useDispatch();
    const toast = useToast();
    const { role, hasPermission } = useRolePermissions();
    const reduxUser = useSelector((state) => state.user.user);

    const [profile, setProfile] = useState(reduxUser);
    const [loading, setLoading] = useState(false);
    const [ratingStats, setRatingStats] = useState(null);
    const [userReviewsList, setUserReviewsList] = useState([]);

    // Customer Specific States
    const [drivingLicence, setDrivingLicence] = useState("");
    const [vehiclesList, setVehiclesList] = useState([]);
    const [newVehicleInput, setNewVehicleInput] = useState("");
    const [newVehicleDocs, setNewVehicleDocs] = useState([]);
    const [savingCustomer, setSavingCustomer] = useState(false);

    // Agency Admin Specific States
    const isAgencyAdmin =
        role === ROLES.AGENCY_ADMIN ||
        hasPermission(PERMISSIONS.MANAGE_LOCATIONS);

    // Location / Basic editing state for agency
    const [agencyAddress, setAgencyAddress] = useState("");
    const [agencyLandmark, setAgencyLandmark] = useState("");
    const [agencyPhone, setAgencyPhone] = useState("");
    const [agencyCoords, setAgencyCoords] = useState(null);
    const [savingAddress, setSavingAddress] = useState(false);

    // Parking Dimensions state for agency
    const [parkingLength, setParkingLength] = useState("");
    const [parkingWidth, setParkingWidth] = useState("");
    const [parkingHeight, setParkingHeight] = useState("");
    const [dimensionUnit, setDimensionUnit] = useState("meters");
    const [savingDimensions, setSavingDimensions] = useState(false);

    // Compliance state for agency
    const [compliance, setCompliance] = useState({
        cctv_available: "no",
        trade_license: "no",
        zoning_clearance: "no",
        shops_establishment_license: "no",
        gst_registration: "no",
    });
    const [savingCompliance, setSavingCompliance] = useState(false);

    // Agency Media (photos / videos)
    const [agencyMediaList, setAgencyMediaList] = useState([]);
    const [loadingMedia, setLoadingMedia] = useState(false);
    const [uploadingMedia, setUploadingMedia] = useState(false);
    const [viewerState, setViewerState] = useState({
        visible: false,
        media: null,
    });

    // Verification Documents Upload States (for agency)
    const [uploadingDocType, setUploadingDocType] = useState(null);

    const initialDrivingLicence = profile?.driving_licence || "";
    const initialVehiclesStr = useMemo(() => {
        let parsedVehicles = [];
        if (profile?.vehicle_numbers) {
            try {
                if (profile.vehicle_numbers.startsWith("[")) {
                    parsedVehicles = JSON.parse(profile.vehicle_numbers);
                } else {
                    parsedVehicles = profile.vehicle_numbers
                        .split(",")
                        .map((v) => v.trim())
                        .filter(Boolean);
                }
            } catch (e) {
                console.error("Error parsing initial vehicle numbers:", e);
            }
        }
        return JSON.stringify(parsedVehicles);
    }, [profile]);

    const hasCustomerChanges =
        drivingLicence.trim() !== initialDrivingLicence.trim() ||
        JSON.stringify(vehiclesList) !== initialVehiclesStr;

    // Helper to format image paths properly
    const getImageUrl = (path) => {
        if (!path) return null;
        const cleanPath = path.startsWith("uploads/")
            ? path.substring(8)
            : path;
        return `${imageBaseURL}${cleanPath}`;
    };

    const fetchRatingData = async (userObj) => {
        try {
            if (!userObj) return;
            const currentRole = userObj.role || ROLES.USER;
            let endpoint = "";
            if (
                currentRole === ROLES.AGENCY_ADMIN &&
                (userObj.agency_id || userObj.id || userObj.org_id)
            ) {
                endpoint = `ratings/agency/${
                    userObj.agency_id || userObj.id || userObj.org_id
                }`;
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

    const fetchAgencyMedia = async (agencyId) => {
        if (!agencyId) return;
        setLoadingMedia(true);
        try {
            const res = await apiService.get(`agencies/${agencyId}/all-media`);
            if (res && res.success && Array.isArray(res.data)) {
                setAgencyMediaList(res.data);
            }
        } catch (err) {
            console.error("Error loading agency media:", err);
        } finally {
            setLoadingMedia(false);
        }
    };

    const fetchProfile = async () => {
        setLoading(true);
        try {
            const res = await apiService.get("users/profile");
            if (res && res.success && res.data) {
                setProfile(res.data);
                dispatch(updateUser(res.data));
                fetchRatingData(res.data);

                const agencyId =
                    res.data.agency_id || res.data.id || res.data.org_id;
                if (isAgencyAdmin && agencyId) {
                    fetchAgencyMedia(agencyId);
                }
            } else {
                toast.error(
                    res?.message || "Failed to fetch profile details",
                    "Error",
                    true
                );
            }
        } catch (error) {
            console.error("Error fetching profile:", error);
            if (profile) fetchRatingData(profile);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProfile();
    }, []);

    useEffect(() => {
        if (profile) {
            // Populate customer details
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

            // Populate agency admin details
            setAgencyAddress(profile.org_address || profile.user_address || "");
            setAgencyLandmark(profile.landmark || "");
            setAgencyPhone(profile.phone_number || "");

            if (
                profile.latitude !== undefined &&
                profile.longitude !== undefined &&
                profile.latitude !== null &&
                profile.longitude !== null &&
                (Number(profile.latitude) !== 0 ||
                    Number(profile.longitude) !== 0)
            ) {
                setAgencyCoords([
                    parseFloat(profile.longitude),
                    parseFloat(profile.latitude),
                ]);
            }

            setCompliance({
                cctv_available: profile.cctv_available ? "yes" : "no",
                trade_license: profile.trade_license ? "yes" : "no",
                zoning_clearance: profile.zoning_clearance ? "yes" : "no",
                shops_establishment_license: profile.shops_establishment_license
                    ? "yes"
                    : "no",
                gst_registration: profile.gst_registration ? "yes" : "no",
            });

            // Populate parking dimensions
            setParkingLength(
                profile.parking_length !== undefined &&
                    profile.parking_length !== null
                    ? String(profile.parking_length)
                    : ""
            );
            setParkingWidth(
                profile.parking_width !== undefined &&
                    profile.parking_width !== null
                    ? String(profile.parking_width)
                    : ""
            );
            setParkingHeight(
                profile.parking_height !== undefined &&
                    profile.parking_height !== null
                    ? String(profile.parking_height)
                    : ""
            );
            setDimensionUnit(profile.dimension_unit || "meters");
        }
    }, [profile]);

    // Handle Profile Photo change
    const handleChangeProfilePhoto = async () => {
        try {
            const croppedImage = await ImageCropPicker.openPicker({
                width: 500,
                height: 500,
                cropping: true,
                cropperCircleOverlay: true,
                mediaType: "photo",
                compressImageQuality: 0.85,
            });

            if (croppedImage && croppedImage.path) {
                const compressedUri = await ImageCompressor.compress(
                    croppedImage.path,
                    { compressionMethod: "auto", quality: 0.8 }
                );
                const b64 = await fileToBase64(compressedUri);
                if (b64) {
                    toast.info(
                        "Updating profile photo...",
                        "Please Wait",
                        true
                    );
                    const res = await apiService.put("users/profile", {
                        profile_photo: b64,
                    });
                    if (res && res.success) {
                        toast.success(
                            "Profile photo updated successfully!",
                            "Success",
                            true
                        );
                        setProfile(res.data);
                        dispatch(updateUser(res.data));
                    } else {
                        toast.error(
                            res?.message || "Failed to update profile photo",
                            "Error",
                            true
                        );
                    }
                }
            }
        } catch (err) {
            if (err?.code !== "E_PICKER_CANCELLED") {
                console.error("Profile photo update error:", err);
                toast.error("Could not update profile photo.", "Error", true);
            }
        }
    };

    // Save Location / Contact
    const handleSaveAddress = async () => {
        setSavingAddress(true);
        try {
            const res = await apiService.put("users/profile", {
                user_address: agencyAddress.trim(),
                org_address: agencyAddress.trim(),
                landmark: agencyLandmark.trim(),
                phone_number: agencyPhone.trim(),
                latitude: agencyCoords ? agencyCoords[1] : undefined,
                longitude: agencyCoords ? agencyCoords[0] : undefined,
            });
            if (res && res.success) {
                toast.success(
                    "Contact & Location details saved!",
                    "Success",
                    true
                );
                setProfile(res.data);
                dispatch(updateUser(res.data));
            } else {
                toast.error(
                    res?.message || "Failed to update address",
                    "Error",
                    true
                );
            }
        } catch (err) {
            console.error("Error updating agency address:", err);
            toast.error("Network error while saving address.", "Error", true);
        } finally {
            setSavingAddress(false);
        }
    };

    // Calculate parking area and volume
    const calculatedArea = useMemo(() => {
        const l = parseFloat(parkingLength);
        const w = parseFloat(parkingWidth);
        if (!isNaN(l) && !isNaN(w) && l > 0 && w > 0) {
            return (l * w).toFixed(2);
        }
        return null;
    }, [parkingLength, parkingWidth]);

    const calculatedVolume = useMemo(() => {
        const l = parseFloat(parkingLength);
        const w = parseFloat(parkingWidth);
        const h = parseFloat(parkingHeight);
        if (!isNaN(l) && !isNaN(w) && !isNaN(h) && l > 0 && w > 0 && h > 0) {
            return (l * w * h).toFixed(2);
        }
        return null;
    }, [parkingLength, parkingWidth, parkingHeight]);

    // Validate parking capacity against dimensions and current capacities
    const capacityValidation = useMemo(() => {
        const l = parseFloat(parkingLength);
        const w = parseFloat(parkingWidth);
        if (isNaN(l) || isNaN(w) || l <= 0 || w <= 0 || !profile) {
            return null;
        }
        return validateCapacityFitsSpace({
            length: l,
            width: w,
            unit: dimensionUnit || "meters",
            capacities: {
                two_wheeler_capacity: profile.two_wheeler_capacity,
                three_wheeler_capacity: profile.three_wheeler_capacity,
                car_capacity: profile.car_capacity,
                suv_capacity: profile.suv_capacity,
                van_capacity: profile.van_capacity,
                pickup_capacity: profile.pickup_capacity,
                ev_capacity: profile.ev_capacity,
            },
        });
    }, [parkingLength, parkingWidth, dimensionUnit, profile]);

    // Save Parking Dimensions
    const handleSaveDimensions = async () => {
        if (
            BLOCK_ON_CAPACITY_EXCEEDED &&
            capacityValidation?.checked &&
            !capacityValidation?.valid
        ) {
            toast.error(
                capacityValidation.message,
                "Capacity Exceeded",
                true
            );
            return;
        }

        setSavingDimensions(true);
        try {
            const payload = {
                parking_length:
                    parkingLength.trim() !== ""
                        ? parseFloat(parkingLength)
                        : null,
                parking_width:
                    parkingWidth.trim() !== ""
                        ? parseFloat(parkingWidth)
                        : null,
                parking_height:
                    parkingHeight.trim() !== ""
                        ? parseFloat(parkingHeight)
                        : null,
                dimension_unit: dimensionUnit || "meters",
            };
            const res = await apiService.put("users/profile", payload);
            if (res && res.success) {
                if (res.data?.capacity_warning) {
                    toast.warning(
                        res.data.capacity_warning,
                        "Capacity Notice",
                        true
                    );
                } else {
                    toast.success(
                        "Parking dimensions saved successfully!",
                        "Success",
                        true
                    );
                }
                setProfile(res.data);
                dispatch(updateUser(res.data));
            } else {
                toast.error(
                    res?.message || "Failed to update parking dimensions",
                    "Error",
                    true
                );
            }
        } catch (err) {
            console.error("Error saving parking dimensions:", err);
            toast.error("Failed to save parking dimensions.", "Error", true);
        } finally {
            setSavingDimensions(false);
        }
    };

    // Save Compliance & Clearances
    const handleSaveCompliance = async () => {
        setSavingCompliance(true);
        try {
            const payload = {
                cctv_available: compliance.cctv_available === "yes",
                trade_license: compliance.trade_license === "yes",
                zoning_clearance: compliance.zoning_clearance === "yes",
                shops_establishment_license:
                    compliance.shops_establishment_license === "yes",
                gst_registration: compliance.gst_registration === "yes",
            };
            const res = await apiService.put("users/profile", payload);
            if (res && res.success) {
                toast.success(
                    "Compliance & clearances updated!",
                    "Success",
                    true
                );
                setProfile(res.data);
                dispatch(updateUser(res.data));
            } else {
                toast.error(
                    res?.message || "Failed to update compliance",
                    "Error",
                    true
                );
            }
        } catch (err) {
            console.error("Error saving compliance:", err);
            toast.error("Failed to save compliance.", "Error", true);
        } finally {
            setSavingCompliance(false);
        }
    };

    // Upload / Replace Verification Document (Aadhaar, Address Proof, Trade License)
    const handleUploadDocument = async (docType) => {
        try {
            const [pickerResult] = await pick({
                type: ["image/*", "application/pdf"],
            });
            if (!pickerResult) return;
            if (pickerResult.size && pickerResult.size > 1024 * 1024) {
                toast.error(
                    "File size must be under 1MB.",
                    "File Too Large",
                    true
                );
                return;
            }
            const b64 = await fileToBase64(pickerResult.uri);
            if (!b64) {
                toast.error("Could not read document file.", "Error", true);
                return;
            }

            setUploadingDocType(docType);
            const res = await apiService.put("users/profile", {
                [docType]: b64,
            });
            if (res && res.success) {
                toast.success(
                    "Document uploaded successfully!",
                    "Success",
                    true
                );
                setProfile(res.data);
                dispatch(updateUser(res.data));
            } else {
                toast.error(
                    res?.message || "Failed to upload document",
                    "Error",
                    true
                );
            }
        } catch (err) {
            if (!isCancel(err)) {
                console.error("Document upload error:", err);
                toast.error("Failed to pick document.", "Error", true);
            }
        } finally {
            setUploadingDocType(null);
        }
    };

    // Add Agency Media (Photos / Videos)
    const handleAddAgencyMedia = async () => {
        if (agencyMediaList.length >= 10) {
            toast.error(
                "Maximum limit of 10 photos/videos reached.",
                "Limit Reached",
                true
            );
            return;
        }

        try {
            const mediaResult = await ImageCropPicker.openPicker({
                mediaType: "any",
                compressImageQuality: 0.9,
            });

            if (mediaResult && mediaResult.path) {
                const isVideo =
                    mediaResult.mime?.startsWith("video") ||
                    /\.(mp4|mov|avi|mkv|webm)$/i.test(mediaResult.path);

                let compressedUri = mediaResult.path;
                if (isVideo) {
                    let durationSec = 0;
                    if (mediaResult.duration) {
                        durationSec = mediaResult.duration / 1000;
                    } else {
                        try {
                            const meta = await VideoCompressor.getVideoMetaData(
                                mediaResult.path
                            );
                            durationSec = meta.duration;
                        } catch (e) {}
                    }

                    if (durationSec > 45) {
                        toast.error(
                            "Video duration must not exceed 45 seconds.",
                            "Video Too Long",
                            true
                        );
                        return;
                    }

                    toast.info("Compressing video...", "Please Wait", true);
                    compressedUri = await VideoCompressor.compress(
                        mediaResult.path,
                        {
                            compressionMethod: "auto",
                        }
                    );
                } else {
                    compressedUri = await ImageCompressor.compress(
                        mediaResult.path,
                        {
                            compressionMethod: "auto",
                            quality: 0.8,
                        }
                    );
                }

                const b64 = await fileToBase64(compressedUri);
                if (b64) {
                    setUploadingMedia(true);
                    const agencyId =
                        profile?.agency_id || profile?.id || profile?.org_id;
                    const res = await apiService.post(
                        `agencies/${agencyId}/media`,
                        {
                            media: b64,
                            file_type: isVideo ? "video" : "photo",
                        }
                    );
                    if (res && res.success) {
                        toast.success(
                            res.message || "Media uploaded successfully!",
                            "Success",
                            true
                        );
                        fetchAgencyMedia(agencyId);
                    } else {
                        toast.error(
                            res?.message || "Failed to upload media.",
                            "Error",
                            true
                        );
                    }
                }
            }
        } catch (err) {
            if (err?.code !== "E_PICKER_CANCELLED") {
                console.error("Media upload error:", err);
                toast.error("Failed to select media.", "Error", true);
            }
        } finally {
            setUploadingMedia(false);
        }
    };

    const handleDeleteAgencyMedia = async (mediaId) => {
        try {
            const res = await apiService.delete(`agencies/media/${mediaId}`);
            if (res && res.success) {
                toast.success("Media removed successfully", "Success", true);
                setAgencyMediaList((prev) =>
                    prev.filter((m) => m.media_id !== mediaId)
                );
            } else {
                toast.error(
                    res?.message || "Failed to delete media",
                    "Error",
                    true
                );
            }
        } catch (err) {
            console.error("Delete media error:", err);
            toast.error("Failed to delete media.", "Error", true);
        }
    };

    // Customer Specific handlers
    const handlePickDocument = async () => {
        if (newVehicleDocs.length >= 3) {
            toast.error(
                "You can upload a maximum of 3 documents per vehicle.",
                "Limit Reached",
                true
            );
            return;
        }

        try {
            const result = await pick({
                mode: "open",
                type: ["image/*", "application/pdf"],
                allowMultiSelection: true,
            });
            if (result && result.length > 0) {
                const remainingSlots = 3 - newVehicleDocs.length;
                const newItems = result.slice(0, remainingSlots);
                setNewVehicleDocs((prev) => [...prev, ...newItems]);
                if (result.length > remainingSlots) {
                    toast.info(
                        `Only ${remainingSlots} document(s) added. Maximum 3 allowed per vehicle.`,
                        "Notice",
                        true
                    );
                }
            }
        } catch (err) {
            if (!isCancel(err)) {
                toast.error("Failed to pick document", "Error", true);
            }
        }
    };

    const handleRemovePickedDoc = (indexToRemove) => {
        setNewVehicleDocs((prev) =>
            prev.filter((_, idx) => idx !== indexToRemove)
        );
    };

    const handleAddVehicle = async () => {
        const cleaned = (newVehicleInput.trim() || "").toUpperCase();
        if (!cleaned) {
            toast.error(
                "Please enter a valid vehicle number",
                "Validation Error",
                true
            );
            return;
        }
        if (!newVehicleDocs || newVehicleDocs.length === 0) {
            toast.error(
                "Please attach at least 1 document (up to 3 allowed) for verification.",
                "Validation Error",
                true
            );
            return;
        }
        if (newVehicleDocs.length > 3) {
            toast.error(
                "A maximum of 3 documents can be uploaded.",
                "Validation Error",
                true
            );
            return;
        }

        const isDuplicate = vehiclesList.some(
            (v) => (typeof v === "string" ? v : v.number) === cleaned
        );
        if (isDuplicate) {
            toast.error(
                "This vehicle number is already added",
                "Validation Error",
                true
            );
            return;
        }

        try {
            const processedDocs = [];
            for (let i = 0; i < newVehicleDocs.length; i++) {
                const doc = newVehicleDocs[i];
                const base64 = await fileToBase64(doc.uri);
                if (!base64) {
                    toast.error(
                        `Could not read document: ${doc.name || i + 1}`,
                        "Error",
                        true
                    );
                    return;
                }
                processedDocs.push({
                    name: doc.name || `Document ${i + 1}`,
                    base64: base64,
                });
            }

            setVehiclesList([
                ...vehiclesList,
                {
                    number: cleaned,
                    status: "pending",
                    documents: processedDocs,
                    created_at: new Date().toISOString(),
                },
            ]);
            setNewVehicleInput("");
            setNewVehicleDocs([]);
        } catch (err) {
            console.error("Error preparing vehicle documents:", err);
            toast.error(
                "Failed to process documents. Please try again.",
                "Error",
                true
            );
        }
    };

    const handleRemoveVehicle = (indexToRemove) => {
        setVehiclesList(vehiclesList.filter((_, idx) => idx !== indexToRemove));
    };

    const handleSaveCustomerChanges = async () => {
        setSavingCustomer(true);
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
            setSavingCustomer(false);
        }
    };

    const handleSignOut = () => {
        dispatch(logoutAndClearToken());
        toast.success("Signed out successfully", "Logged Out", true);
    };

    const photoUrl = getImageUrl(profile?.profile_photo_path);

    if (loading && !profile) {
        return (
            <View className="flex-1 justify-center items-center bg-slate-50">
                <ActivityIndicator size="large" color="#ff9933" />
            </View>
        );
    }

    return (
        <ScrollView
            className="flex-1 bg-slate-50"
            showsVerticalScrollIndicator={false}
        >
            {/* Header Hero section with Avatar + Camera Edit */}
            <View className="bg-carrot-400 pt-4 pb-8 px-6 items-center">
                <View className="relative">
                    {photoUrl ? (
                        <Image
                            source={{ uri: photoUrl }}
                            className="w-24 h-24 rounded-full border-4 border-carrot-400 bg-white"
                            resizeMode="cover"
                        />
                    ) : (
                        <Avatar.Text
                            size={96}
                            label={
                                profile?.name?.substring(0, 2).toUpperCase() ||
                                "US"
                            }
                            style={{ backgroundColor: "#c64908" }}
                            labelStyle={{ color: "white", fontWeight: "bold" }}
                        />
                    )}
                    <TouchableOpacity
                        onPress={handleChangeProfilePhoto}
                        activeOpacity={0.8}
                        className="absolute bottom-0 right-0 bg-carrot-900 rounded-full border-2 border-white p-1.5 shadow"
                    >
                        <MaterialDesignIcons
                            name="camera"
                            size={18}
                            color="white"
                        />
                    </TouchableOpacity>
                </View>

                <Text className="text-white text-xl font-bold mt-3">
                    {profile?.name || "User Profile"}
                </Text>

                <View className="bg-carrot-900 px-3 py-0.5 rounded-full mt-2 self-center border border-carrot-500/30">
                    <Text className="text-carrot-200 font-bold text-xs">
                        {String(
                            ROLE_DISPLAY_NAMES[role || profile?.role] ||
                                (isAgencyAdmin ? "Parking Owner" : "Customer")
                        ).trim()}
                    </Text>
                </View>
            </View>

            <View className="px-5 py-6 gap-4">
                {/* 2. Basic Contact / Account Information */}
                <Card className="bg-white border border-slate-100 rounded-2xl elevation-1">
                    <Card.Content className="p-4">
                        <Text className="text-sm font-bold text-carrot-700 uppercase tracking-wider mb-3">
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

                {/* 3. Address & Location Details */}
                <Card className="bg-white border border-slate-100 rounded-2xl elevation-1">
                    <Card.Content className="p-4 gap-3">
                        <Text className="text-sm font-bold text-carrot-700 uppercase tracking-wider">
                            Location & Contact Details
                        </Text>

                        {isAgencyAdmin ? (
                            <>
                                <TextInput
                                    label="Facility / Organization Address"
                                    value={agencyAddress}
                                    onChangeText={setAgencyAddress}
                                    mode="outlined"
                                    dense
                                    multiline
                                    outlineColor="#e2e8f0"
                                    activeOutlineColor="#ff9933"
                                    className="bg-white"
                                />
                                <TextInput
                                    label="Landmark"
                                    value={agencyLandmark}
                                    onChangeText={setAgencyLandmark}
                                    mode="outlined"
                                    dense
                                    outlineColor="#e2e8f0"
                                    activeOutlineColor="#ff9933"
                                    className="bg-white"
                                />
                                <TextInput
                                    label="Contact Phone"
                                    value={agencyPhone}
                                    onChangeText={setAgencyPhone}
                                    mode="outlined"
                                    dense
                                    keyboardType="phone-pad"
                                    outlineColor="#e2e8f0"
                                    activeOutlineColor="#ff9933"
                                    className="bg-white"
                                />
                                <View className="w-full overflow-hidden rounded-xl border border-slate-200 mt-1 mb-1">
                                    <SignupMap
                                        initialLocation={agencyCoords}
                                        onLocationSelect={(coords) => {
                                            setAgencyCoords(coords);
                                        }}
                                    />
                                </View>
                                <Button
                                    mode="contained"
                                    onPress={handleSaveAddress}
                                    loading={savingAddress}
                                    disabled={savingAddress}
                                    buttonColor="#ff9933"
                                    className="rounded-xl mt-1"
                                >
                                    Save Location Details
                                </Button>
                            </>
                        ) : (
                            <>
                                <View className="flex-row items-center py-1.5">
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
                                {Boolean(profile?.landmark) && (
                                    <>
                                        <Divider className="bg-slate-100 ml-10" />
                                        <View className="flex-row items-center py-1.5">
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
                            </>
                        )}
                    </Card.Content>
                </Card>

                {/* 4. AGENCY ADMIN: Parking Dimensions (3 Dimensions) */}
                {Boolean(isAgencyAdmin) && (
                    <Card className="bg-white border border-slate-100 rounded-2xl elevation-1">
                        <Card.Content className="p-4 gap-3.5">
                            <View className="flex-row justify-between items-center">
                                <View className="flex-1 mr-2">
                                    <Text className="text-sm font-bold text-carrot-700 uppercase tracking-wider">
                                        Parking Dimensions
                                    </Text>
                                    <Text className="text-xs text-slate-400 mt-0.5">
                                        Specify 3D space measurements of your
                                        facility
                                    </Text>
                                </View>
                                <Badge
                                    style={{
                                        backgroundColor:
                                            parkingLength &&
                                            parkingWidth &&
                                            parkingHeight
                                                ? "#16a34a"
                                                : "#f59e0b",
                                        fontWeight: "bold",
                                    }}
                                >
                                    {parkingLength &&
                                    parkingWidth &&
                                    parkingHeight
                                        ? "Configured"
                                        : "Incomplete"}
                                </Badge>
                            </View>

                            {/* Dimension Unit Toggle */}
                            <View className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                                <Text className="text-xs font-semibold text-slate-600 mb-1.5">
                                    Measurement Unit
                                </Text>
                                <RadioButton.Group
                                    onValueChange={(val) =>
                                        setDimensionUnit(val)
                                    }
                                    value={dimensionUnit}
                                >
                                    <View className="flex-row items-center justify-around">
                                        <TouchableOpacity
                                            className="flex-row items-center"
                                            onPress={() =>
                                                setDimensionUnit("meters")
                                            }
                                        >
                                            <RadioButton
                                                value="meters"
                                                color="#ff9933"
                                            />
                                            <Text className="text-xs font-bold text-slate-700">
                                                Meters (m)
                                            </Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            className="flex-row items-center"
                                            onPress={() =>
                                                setDimensionUnit("feet")
                                            }
                                        >
                                            <RadioButton
                                                value="feet"
                                                color="#ff9933"
                                            />
                                            <Text className="text-xs font-bold text-slate-700">
                                                Feet (ft)
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                </RadioButton.Group>
                            </View>

                            {/* 3 Dimensions Inputs */}
                            <View className="gap-2.5">
                                <TextInput
                                    label={`Length (${
                                        dimensionUnit === "meters" ? "m" : "ft"
                                    }) *`}
                                    value={parkingLength}
                                    onChangeText={setParkingLength}
                                    mode="outlined"
                                    dense
                                    keyboardType="numeric"
                                    placeholder="e.g. 50.0"
                                    outlineColor="#e2e8f0"
                                    activeOutlineColor="#ff9933"
                                    className="bg-white"
                                    left={<TextInput.Icon icon="ruler" />}
                                />

                                <TextInput
                                    label={`Width / Breadth (${
                                        dimensionUnit === "meters" ? "m" : "ft"
                                    }) *`}
                                    value={parkingWidth}
                                    onChangeText={setParkingWidth}
                                    mode="outlined"
                                    dense
                                    keyboardType="numeric"
                                    placeholder="e.g. 30.0"
                                    outlineColor="#e2e8f0"
                                    activeOutlineColor="#ff9933"
                                    className="bg-white"
                                    left={
                                        <TextInput.Icon icon="arrow-expand-horizontal" />
                                    }
                                />

                                <TextInput
                                    label={`Height / Max Clearance (${
                                        dimensionUnit === "meters" ? "m" : "ft"
                                    }) *`}
                                    value={parkingHeight}
                                    onChangeText={setParkingHeight}
                                    mode="outlined"
                                    dense
                                    keyboardType="numeric"
                                    placeholder="e.g. 4.5"
                                    outlineColor="#e2e8f0"
                                    activeOutlineColor="#ff9933"
                                    className="bg-white"
                                    left={
                                        <TextInput.Icon icon="arrow-expand-vertical" />
                                    }
                                />
                            </View>

                            {/* Calculated Metrics Summary */}
                            {(calculatedArea || calculatedVolume) && (
                                <View className="flex-row items-center justify-around py-2.5 px-3 bg-carrot-50/60 rounded-xl border border-carrot-100 mt-1">
                                    {calculatedArea && (
                                        <View className="items-center">
                                            <Text className="text-xs text-carrot-500 font-semibold">
                                                Total Area
                                            </Text>
                                            <Text className="text-sm font-bold text-carrot-900 mt-0.5">
                                                {calculatedArea}{" "}
                                                {dimensionUnit === "meters"
                                                    ? "m²"
                                                    : "sq ft"}
                                            </Text>
                                        </View>
                                    )}
                                    {calculatedArea && calculatedVolume && (
                                        <View className="h-6 w-[1px] bg-carrot-200" />
                                    )}
                                    {calculatedVolume && (
                                        <View className="items-center">
                                            <Text className="text-xs text-carrot-500 font-semibold">
                                                Total Volume
                                            </Text>
                                            <Text className="text-sm font-bold text-carrot-900 mt-0.5">
                                                {calculatedVolume}{" "}
                                                {dimensionUnit === "meters"
                                                    ? "m³"
                                                    : "cu ft"}
                                            </Text>
                                        </View>
                                    )}
                                </View>
                            )}

                            {/* Capacity Space Utilization Preview */}
                            {capacityValidation && capacityValidation.checked && (
                                <View
                                    style={{
                                        backgroundColor: capacityValidation.valid
                                            ? "#f0fdf4"
                                            : "#fef2f2",
                                        borderColor: capacityValidation.valid
                                            ? "#86efac"
                                            : "#fca5a5",
                                    }}
                                    className="p-3 rounded-xl border mt-1"
                                >
                                    <View className="flex-row items-center justify-between mb-1.5">
                                        <View className="flex-row items-center gap-1.5">
                                            <MaterialDesignIcons
                                                name={
                                                    capacityValidation.valid
                                                        ? "check-circle"
                                                        : "alert-circle"
                                                }
                                                size={16}
                                                color={
                                                    capacityValidation.valid
                                                        ? "#16a34a"
                                                        : "#dc2626"
                                                }
                                            />
                                            <Text
                                                style={{
                                                    color: capacityValidation.valid
                                                        ? "#15803d"
                                                        : "#b91c1c",
                                                    fontWeight: "bold",
                                                    fontSize: 12,
                                                }}
                                            >
                                                {capacityValidation.valid
                                                    ? "Current Capacities Fit"
                                                    : "Current Capacities Exceed Area"}
                                            </Text>
                                        </View>
                                        <Text
                                            style={{
                                                color: capacityValidation.valid
                                                    ? "#15803d"
                                                    : "#b91c1c",
                                                fontWeight: "bold",
                                                fontSize: 11,
                                            }}
                                        >
                                            {capacityValidation.occupancyPercentage}%
                                        </Text>
                                    </View>

                                    {/* Progress Bar */}
                                    <View className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mb-2">
                                        <View
                                            style={{
                                                width: `${Math.min(
                                                    capacityValidation.occupancyPercentage,
                                                    100
                                                )}%`,
                                                backgroundColor:
                                                    capacityValidation.occupancyPercentage <= 80
                                                        ? "#16a34a"
                                                        : capacityValidation.occupancyPercentage <= 100
                                                        ? "#f59e0b"
                                                        : "#dc2626",
                                                height: "100%",
                                                borderRadius: 999,
                                            }}
                                        />
                                    </View>

                                    <View className="flex-row justify-between text-[10px]">
                                        <Text className="text-slate-500 text-[10px]">
                                            Usable: {capacityValidation.usableAreaM2} m²
                                        </Text>
                                        <Text
                                            style={{
                                                color: capacityValidation.valid
                                                    ? "#15803d"
                                                    : "#dc2626",
                                            }}
                                            className="text-[10px] font-bold"
                                        >
                                            Needed: {capacityValidation.requiredAreaM2} m² ({capacityValidation.totalVehicleCount} vehicles)
                                        </Text>
                                    </View>

                                    {!capacityValidation.valid && (
                                        <Text className="text-red-700 text-[11px] leading-3.5 mt-1.5 font-medium">
                                            {capacityValidation.message}
                                        </Text>
                                    )}
                                </View>
                            )}

                            <Button
                                mode="contained"
                                onPress={handleSaveDimensions}
                                loading={savingDimensions}
                                disabled={savingDimensions}
                                buttonColor="#ff9933"
                                className="rounded-xl mt-1"
                            >
                                Save Dimensions
                            </Button>
                        </Card.Content>
                    </Card>
                )}

                {/* 5. AGENCY ADMIN: Compliance & Clearances */}
                {Boolean(isAgencyAdmin) && (
                    <Card className="bg-white border border-slate-100 rounded-2xl elevation-1">
                        <Card.Content className="p-4 gap-3">
                            <Text className="text-sm font-bold text-carrot-700 uppercase tracking-wider">
                                Compliance & Clearances
                            </Text>

                            {[
                                {
                                    key: "cctv_available",
                                    label: "CCTV Surveillance Active",
                                },
                                {
                                    key: "trade_license",
                                    label: "Trade License Registered",
                                },
                                {
                                    key: "zoning_clearance",
                                    label: "Zoning & Land Use Clearance",
                                },
                                {
                                    key: "shops_establishment_license",
                                    label: "Shops & Establishment License",
                                },
                                {
                                    key: "gst_registration",
                                    label: "GST Registration",
                                },
                            ].map((item, idx, arr) => (
                                <View key={item.key}>
                                    <View className="flex-row items-center justify-between py-1">
                                        <Text className="font-semibold text-slate-800 text-xs flex-1 mr-2">
                                            {item.label}
                                        </Text>
                                        <RadioButton.Group
                                            onValueChange={(val) =>
                                                setCompliance((prev) => ({
                                                    ...prev,
                                                    [item.key]: val,
                                                }))
                                            }
                                            value={compliance[item.key]}
                                        >
                                            <View className="flex-row items-center gap-1">
                                                <TouchableOpacity
                                                    className="flex-row items-center"
                                                    onPress={() =>
                                                        setCompliance(
                                                            (prev) => ({
                                                                ...prev,
                                                                [item.key]:
                                                                    "yes",
                                                            })
                                                        )
                                                    }
                                                >
                                                    <RadioButton
                                                        value="yes"
                                                        color="#ff9933"
                                                    />
                                                    <Text className="text-xs font-bold text-slate-700">
                                                        Yes
                                                    </Text>
                                                </TouchableOpacity>
                                                <TouchableOpacity
                                                    className="flex-row items-center ml-2"
                                                    onPress={() =>
                                                        setCompliance(
                                                            (prev) => ({
                                                                ...prev,
                                                                [item.key]:
                                                                    "no",
                                                            })
                                                        )
                                                    }
                                                >
                                                    <RadioButton
                                                        value="no"
                                                        color="#ff9933"
                                                    />
                                                    <Text className="text-xs font-bold text-slate-700">
                                                        No
                                                    </Text>
                                                </TouchableOpacity>
                                            </View>
                                        </RadioButton.Group>
                                    </View>
                                    {idx < arr.length - 1 && (
                                        <Divider className="my-1.5 bg-slate-100" />
                                    )}
                                </View>
                            ))}

                            <Button
                                mode="contained"
                                onPress={handleSaveCompliance}
                                loading={savingCompliance}
                                disabled={savingCompliance}
                                buttonColor="#ff9933"
                                className="rounded-xl mt-1"
                            >
                                Save Compliance
                            </Button>
                        </Card.Content>
                    </Card>
                )}

                {/* 5. AGENCY ADMIN: Verification Documents Section */}
                {Boolean(isAgencyAdmin) && (
                    <Card className="bg-white border border-slate-100 rounded-2xl elevation-1">
                        <Card.Content className="p-4 gap-3">
                            <Text className="text-sm font-bold text-carrot-700 uppercase tracking-wider">
                                Verification Documents
                            </Text>
                            <Text className="text-xs text-slate-500">
                                Upload your Aadhaar, Address Proof, and Trade
                                License documents
                            </Text>

                            {/* Aadhaar Card */}
                            <View className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                                <View className="flex-row justify-between items-center mb-1.5">
                                    <View className="flex-row items-center flex-1 mr-2">
                                        <MaterialDesignIcons
                                            name="card-account-details-outline"
                                            size={22}
                                            color="#ff9933"
                                        />
                                        <Text className="font-bold text-slate-800 text-sm ml-2">
                                            Aadhaar Card
                                        </Text>
                                    </View>
                                    <Badge
                                        style={{
                                            backgroundColor:
                                                profile?.aadhaar_card_path
                                                    ? "#16a34a"
                                                    : "#f59e0b",
                                            fontWeight: "bold",
                                        }}
                                    >
                                        {profile?.aadhaar_card_path
                                            ? "Uploaded"
                                            : "Pending"}
                                    </Badge>
                                </View>

                                <View className="flex-row items-center justify-between mt-1">
                                    {profile?.aadhaar_card_path ? (
                                        <TouchableOpacity
                                            onPress={() =>
                                                Linking.openURL(
                                                    getImageUrl(
                                                        profile.aadhaar_card_path
                                                    )
                                                )
                                            }
                                            className="flex-row items-center"
                                        >
                                            <MaterialDesignIcons
                                                name="open-in-new"
                                                size={16}
                                                color="#ff9933"
                                            />
                                            <Text className="text-carrot-700 font-semibold text-xs ml-1 underline">
                                                View Uploaded File
                                            </Text>
                                        </TouchableOpacity>
                                    ) : (
                                        <Text className="text-xs text-slate-400 italic">
                                            Not uploaded yet
                                        </Text>
                                    )}

                                    <Button
                                        mode="outlined"
                                        compact
                                        loading={
                                            uploadingDocType === "aadhaar_card"
                                        }
                                        disabled={Boolean(uploadingDocType)}
                                        onPress={() =>
                                            handleUploadDocument("aadhaar_card")
                                        }
                                        className="rounded-lg border-carrot-300"
                                        labelStyle={{ fontSize: 11 }}
                                    >
                                        {profile?.aadhaar_card_path
                                            ? "Replace"
                                            : "Upload"}
                                    </Button>
                                </View>
                            </View>

                            {/* Address Proof */}
                            <View className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                                <View className="flex-row justify-between items-center mb-1.5">
                                    <View className="flex-row items-center flex-1 mr-2">
                                        <MaterialDesignIcons
                                            name="file-document-outline"
                                            size={22}
                                            color="#ff9933"
                                        />
                                        <Text className="font-bold text-slate-800 text-sm ml-2">
                                            Address Proof Document
                                        </Text>
                                    </View>
                                    <Badge
                                        style={{
                                            backgroundColor:
                                                profile?.verification_document_path
                                                    ? "#16a34a"
                                                    : "#f59e0b",
                                            fontWeight: "bold",
                                        }}
                                    >
                                        {profile?.verification_document_path
                                            ? "Uploaded"
                                            : "Pending"}
                                    </Badge>
                                </View>

                                <View className="flex-row items-center justify-between mt-1">
                                    {profile?.verification_document_path ? (
                                        <TouchableOpacity
                                            onPress={() =>
                                                Linking.openURL(
                                                    getImageUrl(
                                                        profile.verification_document_path
                                                    )
                                                )
                                            }
                                            className="flex-row items-center"
                                        >
                                            <MaterialDesignIcons
                                                name="open-in-new"
                                                size={16}
                                                color="#ff9933"
                                            />
                                            <Text className="text-carrot-700 font-semibold text-xs ml-1 underline">
                                                View Uploaded File
                                            </Text>
                                        </TouchableOpacity>
                                    ) : (
                                        <Text className="text-xs text-slate-400 italic">
                                            Not uploaded yet
                                        </Text>
                                    )}

                                    <Button
                                        mode="outlined"
                                        compact
                                        loading={
                                            uploadingDocType ===
                                            "verification_document"
                                        }
                                        disabled={Boolean(uploadingDocType)}
                                        onPress={() =>
                                            handleUploadDocument(
                                                "verification_document"
                                            )
                                        }
                                        className="rounded-lg border-carrot-300"
                                        labelStyle={{ fontSize: 11 }}
                                    >
                                        {profile?.verification_document_path
                                            ? "Replace"
                                            : "Upload"}
                                    </Button>
                                </View>
                            </View>

                            {/* Trade License Document (Visible only when Trade License is Yes) */}
                            {compliance.trade_license === "yes" && (
                                <View className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                                    <View className="flex-row justify-between items-center mb-1.5">
                                        <View className="flex-row items-center flex-1 mr-2">
                                            <MaterialDesignIcons
                                                name="certificate-outline"
                                                size={22}
                                                color="#ff9933"
                                            />
                                            <Text className="font-bold text-slate-800 text-sm ml-2">
                                                Trade License Document
                                            </Text>
                                        </View>
                                        <Badge
                                            style={{
                                                backgroundColor:
                                                    profile?.trade_license_document_path
                                                        ? "#16a34a"
                                                        : "#f59e0b",
                                                fontWeight: "bold",
                                            }}
                                        >
                                            {profile?.trade_license_document_path
                                                ? "Uploaded"
                                                : "Pending"}
                                        </Badge>
                                    </View>

                                    <View className="flex-row items-center justify-between mt-1">
                                        {profile?.trade_license_document_path ? (
                                            <TouchableOpacity
                                                onPress={() =>
                                                    Linking.openURL(
                                                        getImageUrl(
                                                            profile.trade_license_document_path
                                                        )
                                                    )
                                                }
                                                className="flex-row items-center"
                                            >
                                                <MaterialDesignIcons
                                                    name="open-in-new"
                                                    size={16}
                                                    color="#ff9933"
                                                />
                                                <Text className="text-carrot-700 font-semibold text-xs ml-1 underline">
                                                    View Uploaded File
                                                </Text>
                                            </TouchableOpacity>
                                        ) : (
                                            <Text className="text-xs text-slate-400 italic">
                                                Not uploaded yet
                                            </Text>
                                        )}

                                        <Button
                                            mode="outlined"
                                            compact
                                            loading={
                                                uploadingDocType ===
                                                "trade_license_document"
                                            }
                                            disabled={Boolean(uploadingDocType)}
                                            onPress={() =>
                                                handleUploadDocument(
                                                    "trade_license_document"
                                                )
                                            }
                                            className="rounded-lg border-carrot-300"
                                            labelStyle={{ fontSize: 11 }}
                                        >
                                            {profile?.trade_license_document_path
                                                ? "Replace"
                                                : "Upload"}
                                        </Button>
                                    </View>
                                </View>
                            )}
                        </Card.Content>
                    </Card>
                )}

                {/* 6. AGENCY ADMIN: Organization Media Gallery */}
                {Boolean(isAgencyAdmin) && (
                    <Card className="bg-white border border-slate-100 rounded-2xl elevation-1">
                        <Card.Content className="p-4">
                            <View className="flex-row justify-between items-center mb-2">
                                <View>
                                    <Text className="text-sm font-bold text-carrot-700 uppercase tracking-wider">
                                        Organization Media
                                    </Text>
                                    <Text className="text-xs text-slate-400">
                                        Photos & Videos of parking lot (up to
                                        10)
                                    </Text>
                                </View>
                                <Badge style={{ backgroundColor: "#ff9933" }}>
                                    {`${agencyMediaList.length}/10`}
                                </Badge>
                            </View>

                            <TouchableOpacity
                                onPress={handleAddAgencyMedia}
                                disabled={
                                    uploadingMedia ||
                                    agencyMediaList.length >= 10
                                }
                                activeOpacity={0.7}
                                className="items-center justify-center py-4 bg-carrot-50/50 border-dashed border-2 border-carrot-200 rounded-xl my-2"
                            >
                                <View className="items-center gap-1">
                                    <MaterialDesignIcons
                                        name="cloud-upload"
                                        size={26}
                                        color="#ff9933"
                                    />
                                    <Text className="text-carrot-900 font-bold text-xs text-center">
                                        + Add Photo or Video (Max 45s)
                                    </Text>
                                </View>
                            </TouchableOpacity>

                            {loadingMedia && (
                                <ActivityIndicator
                                    size="small"
                                    color="#ff9933"
                                    className="my-2"
                                />
                            )}

                            {agencyMediaList.length > 0 && (
                                <View className="flex-row flex-wrap gap-2 mt-2">
                                    {agencyMediaList.map((m, idx) => (
                                        <View
                                            key={m.media_id || idx}
                                            className="relative w-20 h-20 rounded-lg overflow-hidden bg-slate-100 border border-slate-200 items-center justify-center"
                                        >
                                            <TouchableOpacity
                                                activeOpacity={0.8}
                                                className="w-full h-full justify-center items-center"
                                                onPress={() =>
                                                    setViewerState({
                                                        visible: true,
                                                        media: {
                                                            uri: getImageUrl(
                                                                m.file_path
                                                            ),
                                                            type: m.file_type,
                                                            title: `Media ${
                                                                idx + 1
                                                            } (${m.file_type})`,
                                                        },
                                                    })
                                                }
                                            >
                                                {m.file_type === "photo" ? (
                                                    <Image
                                                        source={{
                                                            uri: getImageUrl(
                                                                m.file_path
                                                            ),
                                                        }}
                                                        className="w-full h-full"
                                                        resizeMode="cover"
                                                    />
                                                ) : (
                                                    <View className="items-center justify-center p-1 bg-slate-900/80 w-full h-full">
                                                        <MaterialDesignIcons
                                                            name="play-circle-outline"
                                                            size={24}
                                                            color="#ffffff"
                                                        />
                                                        <Text className="text-white text-[9px] font-bold">
                                                            Video
                                                        </Text>
                                                    </View>
                                                )}
                                            </TouchableOpacity>

                                            <TouchableOpacity
                                                onPress={() =>
                                                    handleDeleteAgencyMedia(
                                                        m.media_id
                                                    )
                                                }
                                                className="absolute top-1 right-1 bg-red-600/90 rounded-full p-0.5 z-10"
                                            >
                                                <MaterialDesignIcons
                                                    name="close"
                                                    size={12}
                                                    color="#ffffff"
                                                />
                                            </TouchableOpacity>
                                        </View>
                                    ))}
                                </View>
                            )}
                        </Card.Content>
                    </Card>
                )}

                {/* 7. Ratings & Feedback Card */}
                <Card className="bg-white border border-slate-100 rounded-2xl elevation-1">
                    <Card.Content className="p-4">
                        <View className="flex-row items-center justify-between mb-3">
                            <Text className="text-sm font-bold text-carrot-700 uppercase tracking-wider">
                                {isAgencyAdmin
                                    ? "Agency Ratings & Reviews"
                                    : "Customer Rating Score"}
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

                        <View className="flex-row items-center justify-around py-3 bg-carrot-50/50 rounded-xl border border-carrot-100 mb-3">
                            <View className="items-center">
                                <Text className="text-2xl font-bold text-carrot-900">
                                    {ratingStats?.averageRating
                                        ? `${ratingStats.averageRating} ★`
                                        : "New"}
                                </Text>
                                <Text className="text-xs text-carrot-600 font-semibold mt-0.5">
                                    Average Score
                                </Text>
                            </View>
                            <View className="h-8 w-[1px] bg-carrot-200" />
                            <View className="items-center">
                                <Text className="text-2xl font-bold text-carrot-900">
                                    {ratingStats?.totalCount || 0}
                                </Text>
                                <Text className="text-xs text-carrot-600 font-semibold mt-0.5">
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
                                                {`${"★".repeat(r.rating)} (${
                                                    r.rating
                                                }/5)`}
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

                {/* 8. CUSTOMER: Vehicles & License Details */}
                {!isAgencyAdmin &&
                    Boolean(hasPermission(PERMISSIONS.BOOK_PARKING)) && (
                        <Card className="bg-white border border-slate-100 rounded-2xl elevation-1">
                            <Card.Content className="p-4">
                                <Text className="text-sm font-bold text-carrot-700 uppercase tracking-wider mb-4">
                                    Vehicles & License Details
                                </Text>

                                <TextInput
                                    label="Driving License Number"
                                    value={drivingLicence}
                                    onChangeText={setDrivingLicence}
                                    mode="outlined"
                                    dense
                                    autoCapitalize="characters"
                                    className="bg-white mb-4"
                                    outlineColor="#e2e8f0"
                                    activeOutlineColor="#ff9933"
                                    left={
                                        <TextInput.Icon icon="card-account-details-outline" />
                                    }
                                />

                                <Divider className="bg-slate-100 mb-4" />

                                <Text className="text-xs font-semibold text-slate-400 mb-2">
                                    Registered Vehicle Numbers
                                </Text>

                                {vehiclesList.length === 0 ? (
                                    <Text className="text-sm text-slate-400 italic mb-4">
                                        No vehicle numbers added yet.
                                    </Text>
                                ) : (
                                    <View className="mb-4">
                                        {vehiclesList.map((vehicle, idx) => {
                                            const vNumber =
                                                typeof vehicle === "string"
                                                    ? vehicle
                                                    : vehicle.number;
                                            const vStatus =
                                                typeof vehicle === "string"
                                                    ? "approved"
                                                    : vehicle.status ||
                                                      "pending";
                                            const isApproved =
                                                vStatus === "approved";
                                            const isRejected =
                                                vStatus === "rejected";
                                            const isPending =
                                                vStatus === "pending";

                                            // Extract documents
                                            let docs = [];
                                            if (typeof vehicle !== "string") {
                                                if (
                                                    Array.isArray(
                                                        vehicle.documents
                                                    )
                                                ) {
                                                    docs = vehicle.documents;
                                                } else if (
                                                    vehicle.documentUrl
                                                ) {
                                                    docs = [
                                                        {
                                                            name:
                                                                vehicle.documentName ||
                                                                "Supporting Document",
                                                            url: vehicle.documentUrl,
                                                        },
                                                    ];
                                                } else if (
                                                    vehicle.documentName
                                                ) {
                                                    docs = [
                                                        {
                                                            name: vehicle.documentName,
                                                        },
                                                    ];
                                                }
                                            }

                                            return (
                                                <View
                                                    key={idx}
                                                    className="bg-slate-50 border border-slate-200 p-3 rounded-xl mb-2.5"
                                                >
                                                    <View className="flex-row justify-between items-center">
                                                        <View className="flex-row items-center flex-1 pr-2">
                                                            <IconButton
                                                                icon="car"
                                                                iconColor="#ff9933"
                                                                size={20}
                                                                className="m-0 mr-1.5 bg-carrot-50"
                                                            />
                                                            <View className="flex-1">
                                                                <Text className="text-sm text-slate-800 font-bold tracking-wide">
                                                                    {vNumber}
                                                                </Text>
                                                            </View>
                                                        </View>
                                                        <View className="flex-row items-center gap-1">
                                                            <Badge
                                                                style={{
                                                                    backgroundColor:
                                                                        isApproved
                                                                            ? "#16a34a"
                                                                            : isRejected
                                                                            ? "#dc2626"
                                                                            : "#f59e0b",
                                                                    color: "#ffffff",
                                                                    fontWeight:
                                                                        "bold",
                                                                    fontSize: 10,
                                                                }}
                                                            >
                                                                {isApproved
                                                                    ? "Approved"
                                                                    : isRejected
                                                                    ? "Rejected"
                                                                    : "Pending Approval"}
                                                            </Badge>
                                                            <IconButton
                                                                icon="trash-can-outline"
                                                                iconColor="#ef4444"
                                                                size={18}
                                                                className="m-0"
                                                                onPress={() =>
                                                                    handleRemoveVehicle(
                                                                        idx
                                                                    )
                                                                }
                                                            />
                                                        </View>
                                                    </View>

                                                    {/* Rejection Reason Alert */}
                                                    {isRejected && (
                                                        <View className="bg-red-50 border border-red-200 rounded-lg p-2.5 mt-2">
                                                            <View className="flex-row items-center">
                                                                <MaterialDesignIcons
                                                                    name="alert-circle-outline"
                                                                    size={15}
                                                                    color="#dc2626"
                                                                />
                                                                <Text className="text-xs font-bold text-red-800 ml-1">
                                                                    Rejection
                                                                    Reason:
                                                                </Text>
                                                            </View>
                                                            <Text className="text-xs text-red-700 mt-0.5 ml-4">
                                                                {vehicle.rejection_reason ||
                                                                    "Vehicle registration rejected. Please attach proper documents and re-add."}
                                                            </Text>
                                                        </View>
                                                    )}

                                                    {/* Documents list */}
                                                    {docs.length > 0 && (
                                                        <View className="mt-2 pt-2 border-t border-slate-200/60">
                                                            <Text className="text-[11px] font-semibold text-slate-500 mb-1">
                                                                Attached
                                                                Documents (
                                                                {docs.length}):
                                                            </Text>
                                                            <View className="flex-row flex-wrap">
                                                                {docs.map(
                                                                    (
                                                                        doc,
                                                                        dIdx
                                                                    ) => (
                                                                        <TouchableOpacity
                                                                            key={
                                                                                dIdx
                                                                            }
                                                                            onPress={() =>
                                                                                doc.url &&
                                                                                Linking.openURL(
                                                                                    getImageUrl(
                                                                                        doc.url
                                                                                    )
                                                                                )
                                                                            }
                                                                            className="flex-row items-center bg-carrot-50 border border-carrot-100 rounded-md px-2 py-1 mr-1.5 mb-1"
                                                                        >
                                                                            <MaterialDesignIcons
                                                                                name="file-document-outline"
                                                                                size={
                                                                                    13
                                                                                }
                                                                                color="#ff9933"
                                                                            />
                                                                            <Text
                                                                                className="text-carrot-700 text-xs font-semibold ml-1 mr-1 max-w-[160px]"
                                                                                numberOfLines={
                                                                                    1
                                                                                }
                                                                            >
                                                                                {doc.name ||
                                                                                    `Document ${
                                                                                        dIdx +
                                                                                        1
                                                                                    }`}
                                                                            </Text>
                                                                            {Boolean(
                                                                                doc.url
                                                                            ) && (
                                                                                <MaterialDesignIcons
                                                                                    name="open-in-new"
                                                                                    size={
                                                                                        11
                                                                                    }
                                                                                    color="#ff9933"
                                                                                />
                                                                            )}
                                                                        </TouchableOpacity>
                                                                    )
                                                                )}
                                                            </View>
                                                        </View>
                                                    )}
                                                </View>
                                            );
                                        })}
                                    </View>
                                )}

                                <View className="p-3 bg-slate-50 rounded-xl border border-slate-200 gap-2.5 mb-4">
                                    <Text className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                                        Add New Vehicle
                                    </Text>
                                    <TextInput
                                        label="Vehicle Registration Number *"
                                        value={newVehicleInput}
                                        onChangeText={setNewVehicleInput}
                                        mode="outlined"
                                        dense
                                        placeholder="e.g. WB-02-1234"
                                        autoCapitalize="characters"
                                        className="bg-white"
                                        outlineColor="#e2e8f0"
                                        activeOutlineColor="#ff9933"
                                    />

                                    <View className="flex-row justify-between items-center mt-0.5">
                                        <View>
                                            <Text className="text-xs font-semibold text-slate-700">
                                                Verification Documents *
                                            </Text>
                                            <Text className="text-[10px] text-slate-400">
                                                Upload 1 to 3 docs (RC,
                                                Insurance, etc.)
                                            </Text>
                                        </View>
                                        <Button
                                            mode="outlined"
                                            compact
                                            onPress={handlePickDocument}
                                            icon="paperclip"
                                            disabled={
                                                newVehicleDocs.length >= 3
                                            }
                                            className="rounded-lg border-carrot-300"
                                            labelStyle={{ fontSize: 11 }}
                                        >
                                            Attach ({newVehicleDocs.length}/3)
                                        </Button>
                                    </View>

                                    {/* List of picked documents before adding */}
                                    {newVehicleDocs.length > 0 && (
                                        <View className="gap-1 bg-white p-2 rounded-lg border border-slate-100">
                                            {newVehicleDocs.map((doc, idx) => (
                                                <View
                                                    key={idx}
                                                    className="flex-row items-center justify-between py-0.5"
                                                >
                                                    <View className="flex-row items-center flex-1 mr-2">
                                                        <MaterialDesignIcons
                                                            name="file-check-outline"
                                                            size={15}
                                                            color="#16a34a"
                                                        />
                                                        <Text
                                                            className="text-xs text-slate-700 ml-1.5 flex-1"
                                                            numberOfLines={1}
                                                        >
                                                            {doc.name ||
                                                                `Document ${
                                                                    idx + 1
                                                                }`}
                                                        </Text>
                                                    </View>
                                                    <TouchableOpacity
                                                        onPress={() =>
                                                            handleRemovePickedDoc(
                                                                idx
                                                            )
                                                        }
                                                        hitSlop={{
                                                            top: 8,
                                                            bottom: 8,
                                                            left: 8,
                                                            right: 8,
                                                        }}
                                                    >
                                                        <MaterialDesignIcons
                                                            name="close-circle"
                                                            size={16}
                                                            color="#ef4444"
                                                        />
                                                    </TouchableOpacity>
                                                </View>
                                            ))}
                                        </View>
                                    )}

                                    <Button
                                        mode="contained"
                                        onPress={handleAddVehicle}
                                        buttonColor="#ff9933"
                                        className="rounded-xl h-[40px] justify-center mt-1"
                                    >
                                        Add Vehicle to List
                                    </Button>
                                </View>

                                <Button
                                    mode="contained"
                                    onPress={handleSaveCustomerChanges}
                                    loading={savingCustomer}
                                    disabled={
                                        savingCustomer || !hasCustomerChanges
                                    }
                                    buttonColor={
                                        savingCustomer || !hasCustomerChanges
                                            ? "#cbd5e1"
                                            : "#ff9933"
                                    }
                                    className="rounded-xl py-1"
                                    labelStyle={{
                                        fontWeight: "bold",
                                        color:
                                            savingCustomer ||
                                            !hasCustomerChanges
                                                ? "#64748b"
                                                : "white",
                                    }}
                                >
                                    Save Changes
                                </Button>
                            </Card.Content>
                        </Card>
                    )}

                {/* 9. About App & Sign Out Action Buttons */}
                <Button
                    mode="outlined"
                    onPress={() => navigation.navigate("About")}
                    style={{
                        borderColor: "#ff9933",
                        borderRadius: 12,
                        marginBottom: 10,
                        marginTop: 8,
                    }}
                    textColor="#ff9933"
                    icon="information-outline"
                >
                    About App & Check Updates
                </Button>

                <Button
                    mode="contained"
                    onPress={handleSignOut}
                    buttonColor="#dc2626"
                    className="rounded-xl py-1.5"
                    labelStyle={{
                        color: "white",
                        fontSize: 15,
                        fontWeight: "bold",
                    }}
                >
                    Sign Out
                </Button>
            </View>

            <MediaViewerModal
                visible={viewerState.visible}
                onDismiss={() =>
                    setViewerState({ visible: false, media: null })
                }
                media={viewerState.media}
            />
        </ScrollView>
    );
}
