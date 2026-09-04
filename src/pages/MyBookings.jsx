import React, { useEffect, useState } from "react";
import {
    View,
    FlatList,
    StyleSheet,
    ActivityIndicator,
    Linking,
    Platform,
    PermissionsAndroid,
} from "react-native";
import Geolocation from "react-native-geolocation-service";
import {
    Text,
    Card,
    Button,
    Avatar,
    Divider,
    Portal,
    Modal,
    IconButton,
} from "react-native-paper";
import Chip from "../components/Chip";
import RatingModal from "../components/RatingModal";
import ComplaintModal from "../components/ComplaintModal";
import ComplaintTimelineModal from "../components/ComplaintTimelineModal";
import { useSelector, useDispatch } from "react-redux";
import { cancelBooking, setBookings } from "../store/slices/parkingSlice";
import useToast from "../hooks/useToast";
import apiService from "../utils/apiService";

const VEHICLE_TYPE_LABELS = {
    twoWheeler: "Two-Wheeler",
    threeWheeler: "Three-Wheeler",
    car: "Car",
    suv: "SUV / MUV",
    van: "Van",
    pickup: "Pickup Truck",
    ev: "EV",
};

const VEHICLE_TYPE_ICONS = {
    twoWheeler: "motorbike",
    threeWheeler: "rickshaw",
    car: "car",
    suv: "car-estate",
    van: "van-passenger",
    pickup: "car-pickup",
    ev: "ev-station",
};

export default function MyBookings() {
    const dispatch = useDispatch();
    const toast = useToast();
    const currentUser = useSelector((state) => state.user.user);
    const bookings = useSelector((state) => state.parking.bookings);
    const agencies = useSelector((state) => state.parking.agencies);

    // Modal state for cancellation
    const [cancelModalVisible, setCancelModalVisible] = useState(false);
    const [selectedBookingCode, setSelectedBookingCode] = useState("");
    const [previewData, setPreviewData] = useState(null);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [cancelling, setCancelling] = useState(false);

    // Rating modal state
    const [ratingModalVisible, setRatingModalVisible] = useState(false);
    const [targetBookingForRating, setTargetBookingForRating] = useState(null);
    const [existingRating, setExistingRating] = useState(null);
    const [ratingsMap, setRatingsMap] = useState({});
    const [submittingRating, setSubmittingRating] = useState(false);

    // Complaint modal state
    const [complaintModalVisible, setComplaintModalVisible] = useState(false);
    const [targetBookingForComplaint, setTargetBookingForComplaint] =
        useState(null);
    const [complainedBookingIds, setComplainedBookingIds] = useState([]);
    const [userComplainedBookingIds, setUserComplainedBookingIds] = useState(
        []
    );
    const [userComplaintsMap, setUserComplaintsMap] = useState({});
    const [agencyComplaintsMap, setAgencyComplaintsMap] = useState({});
    const [submittingComplaint, setSubmittingComplaint] = useState(false);

    // Timeline modal state
    const [timelineModalVisible, setTimelineModalVisible] = useState(false);
    const [activeComplaintForTimeline, setActiveComplaintForTimeline] =
        useState(null);

    const handleOpenComplaintTimeline = (booking, specificComplaint = null) => {
        const bookingId = booking.id || booking.booking_id;
        const comp = specificComplaint ||
            userComplaintsMap[bookingId] ||
            agencyComplaintsMap[bookingId] || {
                booking_id: bookingId,
                booking,
            };
        setActiveComplaintForTimeline(comp);
        setTimelineModalVisible(true);
    };

    // Filter bookings to only show current user's bookings
    const myBookings = bookings.filter(
        (b) =>
            String(b.userId) === String(currentUser?.id) ||
            b.userPhone === currentUser?.phone_number
    );

    useEffect(() => {
        if (currentUser?.id) {
            const fetchBookings = async () => {
                try {
                    const res = await apiService.get(
                        `bookings/user/${currentUser.id}`
                    );
                    if (res && res.success) {
                        dispatch(setBookings(res.data));
                    }
                } catch (error) {
                    console.error("Error fetching user bookings:", error);
                }
            };
            fetchBookings();

            const fetchUserRatings = async () => {
                try {
                    const res = await apiService.get(
                        `ratings/user/${currentUser.id}`
                    );
                    if (res && res.success && res.data?.givenRatings) {
                        const map = {};
                        res.data.givenRatings.forEach((r) => {
                            if (r.bookingId) {
                                map[r.bookingId] = r;
                            }
                        });
                        setRatingsMap(map);
                    }
                } catch (e) {
                    console.error("Error fetching user ratings list:", e);
                }
            };
            fetchUserRatings();

            const fetchUserComplaints = async () => {
                try {
                    const res = await apiService.get("complaints/user");
                    if (res && res.success && Array.isArray(res.data)) {
                        const uMap = {};
                        const aMap = {};
                        const uIds = [];
                        res.data.forEach((c) => {
                            if (c.complainant_type === "agency_to_user") {
                                aMap[c.booking_id] = c;
                            } else {
                                uMap[c.booking_id] = c;
                                uIds.push(c.booking_id);
                            }
                        });
                        setUserComplaintsMap(uMap);
                        setAgencyComplaintsMap(aMap);
                        setUserComplainedBookingIds(uIds);
                        setComplainedBookingIds(uIds);
                    } else {
                        const resStatus = await apiService.get(
                            "complaints/user-status"
                        );
                        if (
                            resStatus &&
                            resStatus.success &&
                            resStatus.data?.userComplainedBookingIds
                        ) {
                            setUserComplainedBookingIds(
                                resStatus.data.userComplainedBookingIds
                            );
                            setComplainedBookingIds(
                                resStatus.data.userComplainedBookingIds
                            );
                        }
                    }
                } catch (e) {
                    console.error("Error fetching user complaints:", e);
                }
            };
            fetchUserComplaints();
        }
    }, [currentUser, dispatch]);

    const getComplaintEligibility = (item) => {
        const bookingId = item.id || item.booking_id;
        if (
            userComplainedBookingIds.includes(bookingId) ||
            complainedBookingIds.includes(bookingId)
        ) {
            return { eligible: false, alreadyFiled: true };
        }

        const now = Date.now();
        const SIX_HOURS_MS = 6 * 60 * 60 * 1000;

        const checkoutTime = item.checkoutTime || item.checkout_time;

        // Calculate booking end time with fallbacks
        const bookedDurationHours = parseFloat(
            item.bookedDuration || item.booked_duration || 1
        );
        const durationMs = bookedDurationHours * 60 * 60 * 1000;

        let startTimeRaw =
            item.bookingStartTime ||
            item.booking_start_time ||
            item.startTime ||
            item.start_time ||
            item.createdAt ||
            item.created_at;
        let startMs = startTimeRaw ? new Date(startTimeRaw).getTime() : null;

        let bookingEndTimeRaw =
            item.bookingEndTime ||
            item.booking_end_time ||
            item.endTime ||
            item.end_time;
        let endMs = bookingEndTimeRaw
            ? new Date(bookingEndTimeRaw).getTime()
            : startMs
            ? startMs + durationMs
            : null;

        let deadlineMs = null;
        if (checkoutTime) {
            deadlineMs = new Date(checkoutTime).getTime() + SIX_HOURS_MS;
        } else if (endMs) {
            deadlineMs = endMs + SIX_HOURS_MS;
        }

        if (deadlineMs) {
            if (now <= deadlineMs) {
                return { eligible: true, alreadyFiled: false };
            } else {
                return { eligible: false, alreadyFiled: false, expired: true };
            }
        }

        return { eligible: true, alreadyFiled: false };
    };

    const handleOpenComplaint = (booking) => {
        setTargetBookingForComplaint(booking);
        setComplaintModalVisible(true);
    };

    const handleSubmitComplaint = async ({ subject, description }) => {
        if (!targetBookingForComplaint) return;
        const bookingId =
            targetBookingForComplaint.id ||
            targetBookingForComplaint.booking_id;
        setSubmittingComplaint(true);
        try {
            const res = await apiService.post("complaints", {
                bookingId,
                subject,
                description,
                complainantType: "user_to_agency",
            });
            if (res && res.success) {
                toast.success(
                    "Complaint submitted successfully",
                    "Complaint Submitted",
                    true
                );
                setUserComplainedBookingIds((prev) => [...prev, bookingId]);
                setComplainedBookingIds((prev) => [...prev, bookingId]);
                if (res.data) {
                    setUserComplaintsMap((prev) => ({
                        ...prev,
                        [bookingId]: res.data,
                    }));
                }
                setComplaintModalVisible(false);
            } else {
                toast.error(
                    res?.message || "Failed to submit complaint",
                    "Error",
                    true
                );
            }
        } catch (error) {
            console.error("Error submitting complaint:", error);
            const msg =
                error.response?.data?.message || "Failed to submit complaint";
            toast.error(msg, "Error", true);
        } finally {
            setSubmittingComplaint(false);
        }
    };

    const handleOpenRating = async (booking) => {
        setTargetBookingForRating(booking);
        setExistingRating(ratingsMap[booking.id] || null);
        setRatingModalVisible(true);
        try {
            const res = await apiService.get(`ratings/booking/${booking.id}`);
            if (res && res.success && res.data?.userToAgencyRating) {
                setExistingRating(res.data.userToAgencyRating);
                setRatingsMap((prev) => ({
                    ...prev,
                    [booking.id]: res.data.userToAgencyRating,
                }));
            }
        } catch (e) {
            console.error("Error fetching booking rating:", e);
        }
    };

    const handleSubmitRating = async ({ rating, review }) => {
        if (!targetBookingForRating) return;
        setSubmittingRating(true);
        try {
            const res = await apiService.post("ratings", {
                bookingId: targetBookingForRating.id,
                agencyId: targetBookingForRating.agencyId,
                rating,
                review,
                ratingType: "user_to_agency",
            });
            if (res && res.success) {
                toast.success(
                    "Thank you for your rating!",
                    "Rating Submitted",
                    true
                );
                setRatingsMap((prev) => ({
                    ...prev,
                    [targetBookingForRating.id]: res.data,
                }));
                setRatingModalVisible(false);
            } else {
                toast.error(
                    res?.message || "Failed to submit rating",
                    "Error",
                    true
                );
            }
        } catch (error) {
            console.error("Error submitting rating:", error);
            const msg =
                error.response?.data?.message || "Failed to submit rating";
            toast.error(msg, "Error", true);
        } finally {
            setSubmittingRating(false);
        }
    };

    const handleCancelPress = async (bookingCode) => {
        setSelectedBookingCode(bookingCode);
        setPreviewData(null);
        setPreviewLoading(true);
        setCancelModalVisible(true);
        try {
            const res = await apiService.get(
                `bookings/cancel-preview/${bookingCode}`
            );
            if (res && res.success) {
                setPreviewData(res.data);
            } else {
                toast.error(
                    "Failed to load cancellation details.",
                    "Error",
                    true
                );
                setCancelModalVisible(false);
            }
        } catch (error) {
            console.error("Error fetching cancel preview:", error);
            const msg =
                error.response?.data?.message ||
                "Failed to load cancellation details.";
            toast.error(msg, "Error", true);
            setCancelModalVisible(false);
        } finally {
            setPreviewLoading(false);
        }
    };

    const executeCancel = async () => {
        if (!selectedBookingCode) return;
        setCancelling(true);
        try {
            const res = await apiService.post("bookings/cancel", {
                bookingCode: selectedBookingCode,
            });
            if (res && res.success) {
                dispatch(cancelBooking(selectedBookingCode));
                // Show success toast with fee details if any
                const fee = previewData?.cancellationFee || 0;
                toast.success(
                    fee > 0
                        ? `Booking cancelled. Fee of ₹${fee} was charged.`
                        : `Booking ${selectedBookingCode} cancelled successfully!`,
                    "Success",
                    true
                );

                // Refetch user bookings and wallet to update UI
                if (currentUser?.id) {
                    const fetchRes = await apiService.get(
                        `bookings/user/${currentUser.id}`
                    );
                    if (fetchRes && fetchRes.success) {
                        dispatch(setBookings(fetchRes.data));
                    }
                }
            } else {
                toast.error("Failed to cancel booking", "Error", true);
            }
        } catch (error) {
            console.error("Error executing cancellation:", error);
            const msg =
                error.response?.data?.message || "Failed to cancel booking";
            toast.error(msg, "Error", true);
        } finally {
            setCancelling(false);
            setCancelModalVisible(false);
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case "pending_approval":
                return "#d97706"; // amber
            case "booked":
                return "#ff9933"; // blue
            case "checked_in":
                return "#10b981"; // green (active)
            case "completed":
                return "#6b7280"; // gray
            case "cancelled":
            case "rejected":
                return "#ef4444"; // red
            default:
                return "#6b7280";
        }
    };

    const getStatusLabel = (status) => {
        switch (status) {
            case "pending_approval":
                return "Pending Approval";
            case "booked":
                return "Reserved";
            case "checked_in":
                return "Checked In (Active)";
            case "completed":
                return "Completed";
            case "cancelled":
                return "Cancelled";
            case "rejected":
                return "Rejected";
            default:
                return status;
        }
    };

    const formatDateTime = (isoString) => {
        if (!isoString) return "-";
        const date = new Date(isoString);
        if (isNaN(date.getTime())) return "-";
        return date.toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const getBookingCheckInTime = (item) => {
        const val =
            item.checkinTime ||
            item.checkin_time ||
            item.check_in_time ||
            item.actualStartTime ||
            item.actual_start_time ||
            item.checkInTime ||
            item.checkinAt ||
            item.checkin_at;
        if (val) return val;

        if (item.status === "completed" || item.status === "checked_in") {
            return item.startTime || item.start_time || null;
        }
        return null;
    };

    const getBookingCheckOutTime = (item) => {
        const val =
            item.checkoutTime ||
            item.checkout_time ||
            item.check_out_time ||
            item.actualEndTime ||
            item.actual_end_time ||
            item.checkOutTime ||
            item.checkoutAt ||
            item.checkout_at;
        if (val) return val;

        if (item.status === "completed") {
            return item.endTime || item.end_time || null;
        }
        return null;
    };

    const requestLocationPermission = async () => {
        if (Platform.OS === "android") {
            try {
                const granted = await PermissionsAndroid.requestMultiple([
                    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
                    PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
                ]);
                return (
                    granted["android.permission.ACCESS_FINE_LOCATION"] ===
                        PermissionsAndroid.RESULTS.GRANTED ||
                    granted["android.permission.ACCESS_COARSE_LOCATION"] ===
                        PermissionsAndroid.RESULTS.GRANTED
                );
            } catch (err) {
                console.warn("Permission request error:", err);
                return false;
            }
        }
        return true;
    };

    const getCurrentLocation = () => {
        return new Promise(async (resolve) => {
            try {
                const hasPermission = await requestLocationPermission();
                if (!hasPermission) {
                    return resolve(null);
                }

                Geolocation.getCurrentPosition(
                    (pos) => {
                        if (pos?.coords) {
                            const lat = Number(pos.coords.latitude);
                            const lng = Number(pos.coords.longitude);
                            if (!isNaN(lat) && !isNaN(lng)) {
                                return resolve({ lat, lng });
                            }
                        }
                        resolve(null);
                    },
                    (err) => {
                        console.log(
                            "Could not get current location for directions:",
                            err?.message || err
                        );
                        resolve(null);
                    },
                    {
                        enableHighAccuracy: true,
                        timeout: 5000,
                        maximumAge: 10000,
                        forceRequestLocation: false,
                    }
                );
            } catch (error) {
                console.log("getCurrentLocation error:", error);
                resolve(null);
            }
        });
    };

    const handleOpenGoogleMaps = async (booking) => {
        let destLat = Number(booking.latitude);
        let destLng = Number(booking.longitude);

        if (
            (isNaN(destLat) ||
                isNaN(destLng) ||
                destLat === 0 ||
                destLng === 0) &&
            agencies?.length > 0
        ) {
            const matched = agencies.find(
                (a) => String(a.id || a.org_id) === String(booking.agencyId)
            );
            if (matched) {
                destLat = Number(matched.latitude);
                destLng = Number(matched.longitude);
            }
        }

        const hasDestCoords =
            !isNaN(destLat) &&
            !isNaN(destLng) &&
            destLat !== 0 &&
            destLng !== 0;

        const destAddress = [
            booking.agencyName,
            booking.address || booking.agencyAddress,
            booking.landmark,
        ]
            .filter(Boolean)
            .join(" ")
            .trim();

        if (!hasDestCoords && !destAddress) {
            toast.error(
                "Parking location coordinates or address not available",
                "Error",
                true
            );
            return;
        }

        // Check if current location is turned on / accessible
        const userLoc = await getCurrentLocation();

        let url = "";
        const destParam = hasDestCoords
            ? `${destLat},${destLng}`
            : encodeURIComponent(destAddress);

        if (userLoc?.lat && userLoc?.lng) {
            url = `http://maps.google.com/maps?saddr=${userLoc.lat},${userLoc.lng}&daddr=${destParam}`;
        } else {
            if (hasDestCoords) {
                url = `https://www.google.com/maps/search/?api=1&query=${destLat},${destLng}`;
            } else {
                url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                    destAddress
                )}`;
            }
        }

        if (url) {
            Linking.openURL(url).catch((err) => {
                console.error("Error opening Google Maps:", err);
                toast.error("Could not open Google Maps", "Error", true);
            });
        }
    };

    return (
        <View className="flex-1 bg-slate-50">
            <FlatList
                data={myBookings}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
                renderItem={({ item }) => {
                    const statusColor = getStatusColor(item.status);
                    const startTimeRaw =
                        item.bookingStartTime || item.startTime;
                    const durationHours = parseFloat(item.bookedDuration || 1);
                    const endTimeCalculated =
                        item.bookingEndTime ||
                        (startTimeRaw
                            ? new Date(
                                  new Date(startTimeRaw).getTime() +
                                      durationHours * 60 * 60 * 1000
                              ).toISOString()
                            : item.endTime);
                    const totalCost = parseFloat(
                        item.totalBill && parseFloat(item.totalBill) > 0
                            ? item.totalBill
                            : parseFloat(item.hourlyRate || 0) *
                                  parseFloat(item.bookedDuration || 0)
                    ).toFixed(2);

                    const checkInTimeRaw = getBookingCheckInTime(item);
                    const checkInTimeFormatted = checkInTimeRaw
                        ? formatDateTime(checkInTimeRaw)
                        : null;
                    const isCheckInAvailable =
                        checkInTimeFormatted && checkInTimeFormatted !== "-";

                    const checkOutTimeRaw = getBookingCheckOutTime(item);
                    const checkOutTimeFormatted = checkOutTimeRaw
                        ? formatDateTime(checkOutTimeRaw)
                        : null;
                    const isCheckOutAvailable =
                        checkOutTimeFormatted && checkOutTimeFormatted !== "-";

                    return (
                        <Card className="mb-4 bg-white border border-slate-100 rounded-xl elevation-1">
                            <Card.Content className="pb-3">
                                <View className="flex-row items-center justify-between">
                                    <View className="flex-row items-center flex-1 pr-2">
                                        <Avatar.Icon
                                            size={40}
                                            icon={
                                                VEHICLE_TYPE_ICONS[
                                                    item.vehicleType
                                                ] || "car"
                                            }
                                            style={{
                                                backgroundColor: `${statusColor}20`,
                                            }}
                                            color={statusColor}
                                        />
                                        <View className="ml-3 flex-1">
                                            <Text
                                                className="text-base font-bold text-slate-800"
                                                numberOfLines={1}
                                            >
                                                {item.agencyName}
                                            </Text>
                                            <Text className="text-xs text-slate-400">
                                                Code:{" "}
                                                <Text className="font-mono font-bold text-slate-600">
                                                    {item.bookingCode}
                                                </Text>
                                            </Text>
                                        </View>
                                    </View>
                                    <Chip
                                        textStyle={{
                                            color: "white",
                                            fontSize: 10,
                                            fontWeight: "bold",
                                        }}
                                        style={{
                                            backgroundColor: statusColor,
                                        }}
                                        isCompact={true}
                                    >
                                        {getStatusLabel(item.status)}
                                    </Chip>
                                </View>

                                <Divider className="my-3 bg-slate-100" />

                                <View className="gap-2">
                                    <View className="flex-row justify-between">
                                        <Text className="text-sm text-slate-500">
                                            Vehicle Number:
                                        </Text>
                                        <Text className="text-sm font-bold text-slate-700">
                                            {item.vehicleNumber}
                                        </Text>
                                    </View>
                                    <View className="flex-row justify-between">
                                        <Text className="text-sm text-slate-500">
                                            Vehicle Type:
                                        </Text>
                                        <Text className="text-sm font-semibold text-slate-700">
                                            {VEHICLE_TYPE_LABELS[
                                                item.vehicleType
                                            ] || item.vehicleType}
                                        </Text>
                                    </View>

                                    <Divider className="my-1.5 bg-slate-50" />

                                    {/* Booking Schedule: From / To Time */}
                                    <View className="flex-row justify-between">
                                        <Text className="text-sm text-slate-500">
                                            Booking From:
                                        </Text>
                                        <Text className="text-sm font-medium text-slate-700">
                                            {formatDateTime(startTimeRaw)}
                                        </Text>
                                    </View>
                                    <View className="flex-row justify-between">
                                        <Text className="text-sm text-slate-500">
                                            Booking To:
                                        </Text>
                                        <Text className="text-sm font-medium text-slate-700">
                                            {formatDateTime(endTimeCalculated)}
                                        </Text>
                                    </View>

                                    {/* Actual Check-in & Checkout Times (if available) */}
                                    {Boolean(isCheckInAvailable) && (
                                        <View className="flex-row justify-between">
                                            <Text className="text-sm text-slate-500">
                                                Check-in Time:
                                            </Text>
                                            <Text className="text-sm font-medium text-slate-700">
                                                {checkInTimeFormatted}
                                            </Text>
                                        </View>
                                    )}
                                    {Boolean(isCheckOutAvailable) && (
                                        <View className="flex-row justify-between">
                                            <Text className="text-sm text-slate-500">
                                                Checkout Time:
                                            </Text>
                                            <Text className="text-sm font-medium text-slate-700">
                                                {checkOutTimeFormatted}
                                            </Text>
                                        </View>
                                    )}

                                    {/* Total Duration */}
                                    <View className="flex-row justify-between">
                                        <Text className="text-sm text-slate-500">
                                            Total Duration:
                                        </Text>
                                        <Text className="text-sm font-semibold text-slate-700">
                                            {item.bookedDuration}{" "}
                                            {parseFloat(item.bookedDuration) ===
                                            1
                                                ? "Hr"
                                                : "Hrs"}
                                        </Text>
                                    </View>

                                    {/* Rate */}
                                    <View className="flex-row justify-between">
                                        <Text className="text-sm text-slate-500">
                                            Rate:
                                        </Text>
                                        <Text className="text-sm font-semibold text-slate-700">
                                            ₹{item.hourlyRate}/hr
                                        </Text>
                                    </View>

                                    {/* Overtime Cost (if applicable) */}
                                    {(() => {
                                        const bookedDur = parseFloat(item.bookedDuration || 0);
                                        const hRate = parseFloat(item.hourlyRate || 0);
                                        const baseFee = parseFloat((bookedDur * hRate).toFixed(2));
                                        let otCost = 0;

                                        if (item.overtimeCost !== undefined && item.overtimeCost !== null) {
                                            otCost = parseFloat(item.overtimeCost || 0);
                                        } else if (item.status === "completed") {
                                            const bill = parseFloat(item.totalBill || 0);
                                            otCost = Math.max(0, parseFloat((bill - baseFee).toFixed(2)));
                                        } else if (item.status === "checked_in" && (item.checkinTime || item.checkin_time || item.startTime)) {
                                            const start = new Date(item.checkinTime || item.checkin_time || item.startTime);
                                            const end = new Date();
                                            const diffMs = end - start;
                                            const durHours = Math.max(1, Math.ceil((diffMs / (1000 * 60 * 60)) * 2) / 2);
                                            const estBill = parseFloat((durHours * hRate).toFixed(2));
                                            otCost = Math.max(0, parseFloat((estBill - baseFee).toFixed(2)));
                                        }

                                        if (otCost > 0) {
                                            return (
                                                <View className="flex-row justify-between items-center bg-amber-50 p-2.5 rounded-lg mt-1 border border-amber-200">
                                                    <Text className="text-sm font-bold text-amber-900">
                                                        Overtime Charge:
                                                    </Text>
                                                    <Text className="text-base font-bold text-amber-700">
                                                        +₹{otCost}
                                                    </Text>
                                                </View>
                                            );
                                        }
                                        return null;
                                    })()}

                                    {/* Total Cost */}
                                    <View className="flex-row justify-between items-center bg-carrot-50/70 p-2.5 rounded-lg mt-1 border border-carrot-100/60">
                                        <Text className="text-sm font-bold text-carrot-950">
                                            Total Cost:
                                        </Text>
                                        <Text className="text-base font-bold text-carrot-700">
                                            ₹{totalCost}
                                        </Text>
                                    </View>

                                    {Boolean(
                                        item.otp &&
                                            (item.status === "booked" ||
                                                item.status === "checked_in")
                                    ) && (
                                        <View className="flex-row justify-between mt-2 p-2.5 bg-carrot-50 rounded-lg border border-carrot-100 items-center">
                                            <Text className="text-sm font-bold text-carrot-800">
                                                Entry OTP:
                                            </Text>
                                            <Text className="text-base font-mono font-bold text-carrot-900 tracking-widest">
                                                {item.otp}
                                            </Text>
                                        </View>
                                    )}

                                    {item.status === "pending_approval" && (
                                        <View className="mt-2 p-3 bg-amber-50 rounded-lg border border-amber-100">
                                            <Text className="text-xs font-bold text-amber-800">
                                                Awaiting Agency Approval
                                            </Text>
                                            <Text className="text-xs text-amber-700 mt-0.5">
                                                Your booking is currently
                                                pending approval by the agency
                                                admin.
                                            </Text>
                                        </View>
                                    )}

                                    {item.status === "rejected" && (
                                        <View className="mt-2 p-3 bg-rose-50 rounded-lg border border-rose-100">
                                            <Text className="text-xs font-bold text-rose-800">
                                                Booking Rejected
                                            </Text>
                                            {item.rejectionReason ? (
                                                <Text className="text-xs text-rose-700 mt-0.5 font-medium">
                                                    Reason:{" "}
                                                    {item.rejectionReason}
                                                </Text>
                                            ) : null}
                                            <Text className="text-[11px] text-rose-500 mt-1 italic">
                                                Reserved funds have been
                                                released to your usable balance.
                                            </Text>
                                        </View>
                                    )}

                                    {item.status === "completed" && (
                                        <View className="flex-row justify-between mt-1 p-2 bg-emerald-50 rounded-lg border border-emerald-100">
                                            <Text className="text-sm font-bold text-emerald-800">
                                                Amount Paid:
                                            </Text>
                                            <Text className="text-sm font-bold text-emerald-800">
                                                ₹{item.totalBill}
                                            </Text>
                                        </View>
                                    )}
                                </View>
                            </Card.Content>

                            {(() => {
                                const eligibility =
                                    getComplaintEligibility(item);
                                const isCompleted = item.status === "completed";
                                const isBooked = item.status === "booked";
                                const isFutureBooking =
                                    item.status === "booked" ||
                                    item.status === "pending_approval";
                                const showActions =
                                    isFutureBooking ||
                                    isBooked ||
                                    isCompleted ||
                                    eligibility.eligible ||
                                    eligibility.alreadyFiled;

                                if (!showActions) return null;

                                const isCancellable =
                                    item.status === "booked" ||
                                    item.status === "pending_approval";

                                return (
                                    <Card.Actions className="border-t border-slate-50 px-4 py-2 bg-slate-50/50 rounded-b-xl flex-col gap-2">
                                        {Boolean(isFutureBooking) && (
                                            <Button
                                                mode="outlined"
                                                icon="google-maps"
                                                textColor="#0284c7"
                                                buttonColor="#f0f9ff"
                                                style={{
                                                    borderColor: "#bae6fd",
                                                    width: "100%",
                                                }}
                                                onPress={() =>
                                                    handleOpenGoogleMaps(item)
                                                }
                                                className="rounded-lg"
                                                labelStyle={{
                                                    fontWeight: "700",
                                                }}
                                            >
                                                View in Google Maps
                                            </Button>
                                        )}

                                        {Boolean(isCancellable) && (
                                            <Button
                                                mode="outlined"
                                                onPress={() =>
                                                    handleCancelPress(
                                                        item.bookingCode
                                                    )
                                                }
                                                textColor="#ef4444"
                                                style={{
                                                    borderColor: "#fee2e2",
                                                    width: "100%",
                                                }}
                                                className="rounded-lg"
                                                labelStyle={{
                                                    fontWeight: "700",
                                                }}
                                            >
                                                Cancel Reservation
                                            </Button>
                                        )}

                                        {Boolean(isCompleted) &&
                                            (ratingsMap[item.id] ? (
                                                <Button
                                                    mode="contained-tonal"
                                                    icon="star"
                                                    textColor="#d97706"
                                                    buttonColor="#fef3c7"
                                                    onPress={() =>
                                                        handleOpenRating(item)
                                                    }
                                                    style={{ width: "100%" }}
                                                    className="rounded-lg"
                                                    labelStyle={{
                                                        fontWeight: "700",
                                                    }}
                                                >
                                                    {`Rated ${
                                                        ratingsMap[item.id]
                                                            .rating
                                                    }/5 ★`}
                                                </Button>
                                            ) : (
                                                <Button
                                                    mode="contained"
                                                    icon="star-outline"
                                                    buttonColor="#ff9933"
                                                    onPress={() =>
                                                        handleOpenRating(item)
                                                    }
                                                    style={{ width: "100%" }}
                                                    className="rounded-lg"
                                                    labelStyle={{
                                                        fontWeight: "700",
                                                    }}
                                                >
                                                    Rate & Review Parking
                                                </Button>
                                            ))}

                                        {item.paymentStatus === "refunded" ||
                                        parseFloat(
                                            item.refundAmount ||
                                                item.refund_amount ||
                                                0
                                        ) > 0 ? (
                                            <Button
                                                mode="contained-tonal"
                                                icon="cash-refund"
                                                textColor="#047857"
                                                buttonColor="#d1fae5"
                                                disabled
                                                style={{ width: "100%" }}
                                                className="rounded-lg"
                                                labelStyle={{
                                                    fontWeight: "700",
                                                }}
                                            >
                                                {`✓ Refunded ₹${parseFloat(
                                                    item.refundAmount ||
                                                        item.refund_amount ||
                                                        item.totalBill ||
                                                        0
                                                ).toFixed(2)} to Wallet`}
                                            </Button>
                                        ) : (
                                            <View className="w-full flex-col gap-2">
                                                {/* Parking Owner complaint notification banner for this booking */}
                                                {Boolean(
                                                    agencyComplaintsMap[
                                                        item.id ||
                                                            item.booking_id
                                                    ]
                                                ) && (
                                                    <View className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 flex-row items-center justify-between">
                                                        <View className="flex-row items-center flex-1 pr-2">
                                                            <IconButton
                                                                icon="alert-circle"
                                                                iconColor="#d97706"
                                                                size={18}
                                                                style={{
                                                                    margin: 0,
                                                                    marginRight: 4,
                                                                }}
                                                            />
                                                            <Text className="text-xs font-semibold text-amber-900 flex-1">
                                                                Parking Owner
                                                                filed a
                                                                complaint
                                                                against you
                                                            </Text>
                                                        </View>
                                                        <Button
                                                            mode="contained-tonal"
                                                            compact
                                                            buttonColor="#fef3c7"
                                                            textColor="#92400e"
                                                            onPress={() =>
                                                                handleOpenComplaintTimeline(
                                                                    item,
                                                                    agencyComplaintsMap[
                                                                        item.id ||
                                                                            item.booking_id
                                                                    ]
                                                                )
                                                            }
                                                            labelStyle={{
                                                                fontSize: 11,
                                                                fontWeight:
                                                                    "700",
                                                            }}
                                                        >
                                                            View Notice
                                                        </Button>
                                                    </View>
                                                )}

                                                {Boolean(
                                                    eligibility.alreadyFiled
                                                ) && (
                                                    <Button
                                                        mode="contained-tonal"
                                                        icon="timeline-text-outline"
                                                        textColor="#ff9933"
                                                        buttonColor="#e0e7ff"
                                                        style={{
                                                            width: "100%",
                                                        }}
                                                        onPress={() =>
                                                            handleOpenComplaintTimeline(
                                                                item,
                                                                userComplaintsMap[
                                                                    item.id ||
                                                                        item.booking_id
                                                                ]
                                                            )
                                                        }
                                                        className="rounded-lg"
                                                        labelStyle={{
                                                            fontWeight: "700",
                                                        }}
                                                    >
                                                        View My Complaint
                                                        Timeline
                                                    </Button>
                                                )}

                                                {Boolean(
                                                    eligibility.eligible
                                                ) && (
                                                    <Button
                                                        mode="outlined"
                                                        icon="alert-circle-outline"
                                                        textColor="#ef4444"
                                                        style={{
                                                            borderColor:
                                                                "#fca5a5",
                                                            width: "100%",
                                                        }}
                                                        onPress={() =>
                                                            handleOpenComplaint(
                                                                item
                                                            )
                                                        }
                                                        className="rounded-lg"
                                                        labelStyle={{
                                                            fontWeight: "700",
                                                        }}
                                                    >
                                                        File Complaint against
                                                        Agency
                                                    </Button>
                                                )}
                                            </View>
                                        )}
                                    </Card.Actions>
                                );
                            })()}
                        </Card>
                    );
                }}
                ListEmptyComponent={
                    <View className="items-center justify-center pt-20">
                        <Avatar.Icon
                            size={64}
                            icon="calendar-blank"
                            style={{ backgroundColor: "#f1f5f9" }}
                            color="#64748b"
                        />
                        <Text className="text-lg font-bold text-slate-700 mt-4">
                            No Bookings Yet
                        </Text>
                        <Text className="text-sm text-slate-400 text-center mt-1 px-8">
                            Any parking slots you reserve will appear here. Find
                            nearby parking locations on the map to get started.
                        </Text>
                    </View>
                }
            />

            {/* Custom confirmation modal using React Native Paper Portal & Modal */}
            <Portal>
                <Modal
                    visible={cancelModalVisible}
                    onDismiss={() =>
                        !cancelling && setCancelModalVisible(false)
                    }
                    contentContainerStyle={{
                        backgroundColor: "white",
                        padding: 24,
                        margin: 20,
                        borderRadius: 16,
                    }}
                >
                    {previewLoading ? (
                        <View className="items-center py-6">
                            <ActivityIndicator size="large" color="#ff9933" />
                            <Text className="text-sm font-semibold text-slate-500 mt-4">
                                Calculating cancellation charges...
                            </Text>
                        </View>
                    ) : previewData ? (
                        <View>
                            {!previewData.allowCancellation ? (
                                <View className="items-center">
                                    <Avatar.Icon
                                        size={48}
                                        icon="alert-circle"
                                        style={{ backgroundColor: "#fee2e2" }}
                                        color="#ef4444"
                                    />
                                    <Text className="text-lg font-bold text-slate-800 mt-4 text-center">
                                        Cancellation Blocked
                                    </Text>
                                    <Text className="text-sm text-slate-500 mt-2 text-center">
                                        According to the agency's policy,
                                        cancellation is blocked within{" "}
                                        {previewData.policyApplied
                                            ?.ruleMinutes || 30}{" "}
                                        minutes of the booking start time.
                                    </Text>
                                    <Button
                                        mode="contained"
                                        onPress={() =>
                                            setCancelModalVisible(false)
                                        }
                                        buttonColor="#ff9933"
                                        className="mt-6 w-full rounded-lg"
                                        labelStyle={{ fontWeight: "700" }}
                                    >
                                        Close
                                    </Button>
                                </View>
                            ) : (
                                <View>
                                    <Text className="text-lg font-bold text-slate-800 mb-2">
                                        Confirm Cancellation
                                    </Text>
                                    <Text className="text-sm text-slate-500 mb-4">
                                        Are you sure you want to cancel booking{" "}
                                        <Text className="font-bold text-slate-700">
                                            {selectedBookingCode}
                                        </Text>
                                        ?
                                    </Text>

                                    {previewData.cancellationFee > 0 ? (
                                        <View className="p-4 bg-amber-50 rounded-xl border border-amber-100 mb-5">
                                            <View className="flex-row items-center mb-1.5">
                                                <Avatar.Icon
                                                    size={20}
                                                    icon="alert-decagram"
                                                    style={{
                                                        backgroundColor:
                                                            "transparent",
                                                    }}
                                                    color="#d97706"
                                                />
                                                <Text className="text-sm font-bold text-amber-800 ml-1">
                                                    Cancellation Policy Applied
                                                </Text>
                                            </View>
                                            <Text className="text-xs text-amber-700">
                                                Deduction:{" "}
                                                <Text className="font-bold">
                                                    {previewData.policyApplied
                                                        ?.chargeType ===
                                                    "percentage"
                                                        ? `${previewData.policyApplied?.chargeValue}%`
                                                        : `₹${previewData.policyApplied?.chargeValue}`}
                                                </Text>{" "}
                                                of total scheduled booking
                                                charge.
                                            </Text>
                                            <Divider className="my-2 bg-amber-200" />
                                            <View className="flex-row justify-between items-center">
                                                <Text className="text-sm font-bold text-amber-900">
                                                    Deduction Fee:
                                                </Text>
                                                <Text className="text-base font-bold text-amber-900">
                                                    ₹
                                                    {previewData.cancellationFee.toFixed(
                                                        2
                                                    )}
                                                </Text>
                                            </View>
                                        </View>
                                    ) : (
                                        <View className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 mb-5 flex-row items-center">
                                            <Avatar.Icon
                                                size={20}
                                                icon="check-circle"
                                                style={{
                                                    backgroundColor:
                                                        "transparent",
                                                }}
                                                color="#059669"
                                            />
                                            <Text className="text-sm font-medium text-emerald-800 ml-1">
                                                Free cancellation. No fee will
                                                be charged.
                                            </Text>
                                        </View>
                                    )}

                                    <View className="flex-row gap-3 justify-end mt-2">
                                        <Button
                                            mode="outlined"
                                            onPress={() =>
                                                setCancelModalVisible(false)
                                            }
                                            textColor="#64748b"
                                            style={{ borderColor: "#cbd5e1" }}
                                            disabled={cancelling}
                                            className="flex-1 rounded-lg"
                                        >
                                            Keep Reservation
                                        </Button>
                                        <Button
                                            mode="contained"
                                            onPress={executeCancel}
                                            buttonColor="#ef4444"
                                            loading={cancelling}
                                            disabled={cancelling}
                                            className="flex-1 rounded-lg"
                                            labelStyle={{ fontWeight: "700" }}
                                        >
                                            Cancel
                                        </Button>
                                    </View>
                                </View>
                            )}
                        </View>
                    ) : (
                        <View className="items-center py-6">
                            <Text className="text-sm text-slate-500">
                                Failed to load preview details.
                            </Text>
                            <Button
                                mode="outlined"
                                onPress={() => setCancelModalVisible(false)}
                                className="mt-4"
                            >
                                Close
                            </Button>
                        </View>
                    )}
                </Modal>
            </Portal>

            <RatingModal
                visible={ratingModalVisible}
                onClose={() => setRatingModalVisible(false)}
                onSubmit={handleSubmitRating}
                title="Rate Parking Agency"
                subtitle={
                    targetBookingForRating?.agencyName || "Parking Location"
                }
                existingRating={existingRating}
                loading={submittingRating}
            />

            <ComplaintModal
                visible={complaintModalVisible}
                onClose={() => setComplaintModalVisible(false)}
                onSubmit={handleSubmitComplaint}
                title="File Complaint against Agency"
                subtitle={
                    targetBookingForComplaint?.agencyName || "Parking Location"
                }
                loading={submittingComplaint}
            />

            <ComplaintTimelineModal
                visible={timelineModalVisible}
                onClose={() => setTimelineModalVisible(false)}
                complaint={activeComplaintForTimeline}
                onComplaintUpdated={(updated) => {
                    if (updated && updated.booking_id) {
                        if (updated.complainant_type === "agency_to_user") {
                            setAgencyComplaintsMap((prev) => ({
                                ...prev,
                                [updated.booking_id]: updated,
                            }));
                        } else {
                            setUserComplaintsMap((prev) => ({
                                ...prev,
                                [updated.booking_id]: updated,
                            }));
                        }
                    }
                }}
                currentUserRole="user"
            />
        </View>
    );
}

const styles = StyleSheet.create({});
