import React, { useEffect, useState } from "react";
import { View, FlatList, StyleSheet, ActivityIndicator } from "react-native";
import { Text, Card, Button, Avatar, Divider, Portal, Modal } from "react-native-paper";
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
    const [targetBookingForComplaint, setTargetBookingForComplaint] = useState(null);
    const [complainedBookingIds, setComplainedBookingIds] = useState([]);
    const [userComplaintsMap, setUserComplaintsMap] = useState({});
    const [submittingComplaint, setSubmittingComplaint] = useState(false);

    // Timeline modal state
    const [timelineModalVisible, setTimelineModalVisible] = useState(false);
    const [activeComplaintForTimeline, setActiveComplaintForTimeline] = useState(null);

    const handleOpenComplaintTimeline = (booking) => {
        const bookingId = booking.id || booking.booking_id;
        const comp = userComplaintsMap[bookingId] || { booking_id: bookingId, booking };
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
                    const res = await apiService.get(`ratings/user/${currentUser.id}`);
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
                        const map = {};
                        const ids = [];
                        res.data.forEach((c) => {
                            map[c.booking_id] = c;
                            ids.push(c.booking_id);
                        });
                        setUserComplaintsMap(map);
                        setComplainedBookingIds(ids);
                    } else {
                        const resStatus = await apiService.get("complaints/user-status");
                        if (resStatus && resStatus.success && resStatus.data?.userComplainedBookingIds) {
                            setComplainedBookingIds(resStatus.data.userComplainedBookingIds);
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
        if (complainedBookingIds.includes(bookingId)) {
            return { eligible: false, alreadyFiled: true };
        }

        const now = Date.now();
        const SIX_HOURS_MS = 6 * 60 * 60 * 1000;

        const checkoutTime = item.checkoutTime || item.checkout_time;

        // Calculate booking end time with fallbacks
        const bookedDurationHours = parseFloat(item.bookedDuration || item.booked_duration || 1);
        const durationMs = bookedDurationHours * 60 * 60 * 1000;

        let startTimeRaw = item.bookingStartTime || item.booking_start_time || item.startTime || item.start_time || item.createdAt || item.created_at;
        let startMs = startTimeRaw ? new Date(startTimeRaw).getTime() : null;

        let bookingEndTimeRaw = item.bookingEndTime || item.booking_end_time || item.endTime || item.end_time;
        let endMs = bookingEndTimeRaw ? new Date(bookingEndTimeRaw).getTime() : (startMs ? startMs + durationMs : null);

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
        const bookingId = targetBookingForComplaint.id || targetBookingForComplaint.booking_id;
        setSubmittingComplaint(true);
        try {
            const res = await apiService.post("complaints", {
                bookingId,
                subject,
                description,
                complainantType: "user_to_agency",
            });
            if (res && res.success) {
                toast.success("Complaint submitted successfully", "Complaint Submitted", true);
                setComplainedBookingIds((prev) => [...prev, bookingId]);
                setComplaintModalVisible(false);
            } else {
                toast.error(res?.message || "Failed to submit complaint", "Error", true);
            }
        } catch (error) {
            console.error("Error submitting complaint:", error);
            const msg = error.response?.data?.message || "Failed to submit complaint";
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
                toast.success("Thank you for your rating!", "Rating Submitted", true);
                setRatingsMap((prev) => ({
                    ...prev,
                    [targetBookingForRating.id]: res.data,
                }));
                setRatingModalVisible(false);
            } else {
                toast.error(res?.message || "Failed to submit rating", "Error", true);
            }
        } catch (error) {
            console.error("Error submitting rating:", error);
            const msg = error.response?.data?.message || "Failed to submit rating";
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
            const res = await apiService.get(`bookings/cancel-preview/${bookingCode}`);
            if (res && res.success) {
                setPreviewData(res.data);
            } else {
                toast.error("Failed to load cancellation details.", "Error", true);
                setCancelModalVisible(false);
            }
        } catch (error) {
            console.error("Error fetching cancel preview:", error);
            const msg = error.response?.data?.message || "Failed to load cancellation details.";
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
            const res = await apiService.post("bookings/cancel", { bookingCode: selectedBookingCode });
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
                    const fetchRes = await apiService.get(`bookings/user/${currentUser.id}`);
                    if (fetchRes && fetchRes.success) {
                        dispatch(setBookings(fetchRes.data));
                    }
                }
            } else {
                toast.error("Failed to cancel booking", "Error", true);
            }
        } catch (error) {
            console.error("Error executing cancellation:", error);
            const msg = error.response?.data?.message || "Failed to cancel booking";
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
                return "#3b82f6"; // blue
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
        return date.toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    return (
        <View className="flex-1 bg-slate-50">
            <FlatList
                data={myBookings}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
                renderItem={({ item }) => {
                    const statusColor = getStatusColor(item.status);
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
                                    <View className="flex-row justify-between">
                                        <Text className="text-sm text-slate-500">
                                            Booked Duration:
                                        </Text>
                                        <Text className="text-sm font-semibold text-slate-700">
                                            {item.bookedDuration} Hrs
                                        </Text>
                                    </View>
                                    <View className="flex-row justify-between">
                                        <Text className="text-sm text-slate-500">
                                            Rate:
                                        </Text>
                                        <Text className="text-sm font-semibold text-slate-700">
                                            ₹{item.hourlyRate}/hr
                                        </Text>
                                    </View>

                                    <Divider className="my-1.5 bg-slate-50" />

                                    <View className="flex-row justify-between">
                                        <Text className="text-sm text-slate-500">
                                            Booked For:
                                        </Text>
                                        <Text className="text-sm font-medium text-slate-700">
                                            {formatDateTime(
                                                item.bookingStartTime ||
                                                    item.startTime
                                            )}
                                        </Text>
                                    </View>

                                    {item.otp &&
                                        (item.status === "booked" ||
                                            item.status === "checked_in") && (
                                            <View className="flex-row justify-between mt-2 p-2.5 bg-indigo-50 rounded-lg border border-indigo-100 items-center">
                                                <Text className="text-sm font-bold text-indigo-800">
                                                    Entry OTP:
                                                </Text>
                                                <Text className="text-base font-mono font-bold text-indigo-900 tracking-widest">
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
                                                 Your booking is currently pending approval by the agency admin.
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
                                                     Reason: {item.rejectionReason}
                                                 </Text>
                                             ) : null}
                                             <Text className="text-[11px] text-rose-500 mt-1 italic">
                                                 Reserved funds have been released to your usable balance.
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
                                const eligibility = getComplaintEligibility(item);
                                const isCompleted = item.status === "completed";
                                const isBooked = item.status === "booked";
                                const showActions = isBooked || isCompleted || eligibility.eligible || eligibility.alreadyFiled;

                                if (!showActions) return null;

                                return (
                                    <Card.Actions className="border-t border-slate-50 px-4 py-2 bg-slate-50/50 rounded-b-xl flex-col gap-2">
                                        {isBooked && (
                                            <Button
                                                mode="outlined"
                                                onPress={() =>
                                                    handleCancelPress(item.bookingCode)
                                                }
                                                textColor="#ef4444"
                                                style={{ borderColor: "#fee2e2", width: "100%" }}
                                                className="rounded-lg"
                                                labelStyle={{ fontWeight: "700" }}
                                            >
                                                Cancel Reservation
                                            </Button>
                                        )}

                                        {isCompleted && (
                                            ratingsMap[item.id] ? (
                                                <Button
                                                    mode="contained-tonal"
                                                    icon="star"
                                                    textColor="#d97706"
                                                    buttonColor="#fef3c7"
                                                    onPress={() => handleOpenRating(item)}
                                                    style={{ width: "100%" }}
                                                    className="rounded-lg"
                                                    labelStyle={{ fontWeight: "700" }}
                                                >
                                                    {`Rated ${ratingsMap[item.id].rating}/5 ★`}
                                                </Button>
                                            ) : (
                                                <Button
                                                    mode="contained"
                                                    icon="star-outline"
                                                    buttonColor="#4338ca"
                                                    onPress={() => handleOpenRating(item)}
                                                    style={{ width: "100%" }}
                                                    className="rounded-lg"
                                                    labelStyle={{ fontWeight: "700" }}
                                                >
                                                    Rate & Review Parking
                                                </Button>
                                            )
                                        )}

                                        {item.paymentStatus === "refunded" || parseFloat(item.refundAmount || item.refund_amount || 0) > 0 ? (
                                            <Button
                                                mode="contained-tonal"
                                                icon="cash-refund"
                                                textColor="#047857"
                                                buttonColor="#d1fae5"
                                                disabled
                                                style={{ width: "100%" }}
                                                className="rounded-lg"
                                                labelStyle={{ fontWeight: "700" }}
                                            >
                                                {`✓ Refunded ₹${parseFloat(item.refundAmount || item.refund_amount || item.totalBill || 0).toFixed(2)} to Wallet`}
                                            </Button>
                                        ) : (
                                            <View className="w-full flex-col gap-2">
                                                {eligibility.alreadyFiled && (
                                                    <Button
                                                        mode="contained-tonal"
                                                        icon="timeline-text-outline"
                                                        textColor="#4338ca"
                                                        buttonColor="#e0e7ff"
                                                        style={{ width: "100%" }}
                                                        onPress={() => handleOpenComplaintTimeline(item)}
                                                        className="rounded-lg"
                                                        labelStyle={{ fontWeight: "700" }}
                                                    >
                                                        View Complaint Timeline
                                                    </Button>
                                                )}

                                                {eligibility.eligible && (
                                                    <Button
                                                        mode="outlined"
                                                        icon="alert-circle-outline"
                                                        textColor="#ef4444"
                                                        style={{ borderColor: "#fca5a5", width: "100%" }}
                                                        onPress={() => handleOpenComplaint(item)}
                                                        className="rounded-lg"
                                                        labelStyle={{ fontWeight: "700" }}
                                                    >
                                                        File Complaint
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
                    onDismiss={() => !cancelling && setCancelModalVisible(false)}
                    contentContainerStyle={{
                        backgroundColor: "white",
                        padding: 24,
                        margin: 20,
                        borderRadius: 16,
                    }}
                >
                    {previewLoading ? (
                        <View className="items-center py-6">
                            <ActivityIndicator size="large" color="#4338ca" />
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
                                        According to the agency's policy, cancellation is blocked within{" "}
                                        {previewData.policyApplied?.ruleMinutes || 30} minutes of the booking start time.
                                    </Text>
                                    <Button
                                        mode="contained"
                                        onPress={() => setCancelModalVisible(false)}
                                        buttonColor="#4338ca"
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
                                        <Text className="font-bold text-slate-700">{selectedBookingCode}</Text>?
                                    </Text>

                                    {previewData.cancellationFee > 0 ? (
                                        <View className="p-4 bg-amber-50 rounded-xl border border-amber-100 mb-5">
                                            <View className="flex-row items-center mb-1.5">
                                                <Avatar.Icon
                                                    size={20}
                                                    icon="alert-decagram"
                                                    style={{ backgroundColor: "transparent" }}
                                                    color="#d97706"
                                                />
                                                <Text className="text-sm font-bold text-amber-800 ml-1">
                                                    Cancellation Policy Applied
                                                </Text>
                                            </View>
                                            <Text className="text-xs text-amber-700">
                                                Deduction:{" "}
                                                <Text className="font-bold">
                                                    {previewData.policyApplied?.chargeType === "percentage"
                                                        ? `${previewData.policyApplied?.chargeValue}%`
                                                        : `₹${previewData.policyApplied?.chargeValue}`}
                                                </Text>{" "}
                                                of total scheduled booking charge.
                                            </Text>
                                            <Divider className="my-2 bg-amber-200" />
                                            <View className="flex-row justify-between items-center">
                                                <Text className="text-sm font-bold text-amber-900">
                                                    Deduction Fee:
                                                </Text>
                                                <Text className="text-base font-bold text-amber-900">
                                                    ₹{previewData.cancellationFee.toFixed(2)}
                                                </Text>
                                            </View>
                                        </View>
                                    ) : (
                                        <View className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 mb-5 flex-row items-center">
                                            <Avatar.Icon
                                                size={20}
                                                icon="check-circle"
                                                style={{ backgroundColor: "transparent" }}
                                                color="#059669"
                                            />
                                            <Text className="text-sm font-medium text-emerald-800 ml-1">
                                                Free cancellation. No fee will be charged.
                                            </Text>
                                        </View>
                                    )}

                                    <View className="flex-row gap-3 justify-end mt-2">
                                        <Button
                                            mode="outlined"
                                            onPress={() => setCancelModalVisible(false)}
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
                            <Text className="text-sm text-slate-500">Failed to load preview details.</Text>
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
                subtitle={targetBookingForRating?.agencyName || "Parking Location"}
                existingRating={existingRating}
                loading={submittingRating}
            />

            <ComplaintModal
                visible={complaintModalVisible}
                onClose={() => setComplaintModalVisible(false)}
                onSubmit={handleSubmitComplaint}
                title="File Complaint against Agency"
                subtitle={targetBookingForComplaint?.agencyName || "Parking Location"}
                loading={submittingComplaint}
            />

            <ComplaintTimelineModal
                visible={timelineModalVisible}
                onClose={() => setTimelineModalVisible(false)}
                complaint={activeComplaintForTimeline}
                onComplaintUpdated={(updated) => {
                    if (updated && updated.booking_id) {
                        setUserComplaintsMap((prev) => ({
                            ...prev,
                            [updated.booking_id]: updated,
                        }));
                    }
                }}
                currentUserRole="user"
            />
        </View>
    );
}

const styles = StyleSheet.create({});
