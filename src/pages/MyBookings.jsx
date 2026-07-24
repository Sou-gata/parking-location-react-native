import React, { useEffect, useState } from "react";
import { View, FlatList, StyleSheet, ActivityIndicator } from "react-native";
import { Text, Card, Button, Avatar, Divider, Portal, Modal } from "react-native-paper";
import Chip from "../components/Chip";
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
        }
    }, [currentUser, dispatch]);

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
            case "booked":
                return "#3b82f6"; // blue
            case "checked_in":
                return "#10b981"; // green (active)
            case "completed":
                return "#6b7280"; // gray
            case "cancelled":
                return "#ef4444"; // red
            default:
                return "#6b7280";
        }
    };

    const getStatusLabel = (status) => {
        switch (status) {
            case "booked":
                return "Reserved";
            case "checked_in":
                return "Checked In (Active)";
            case "completed":
                return "Completed";
            case "cancelled":
                return "Cancelled";
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
                                        compact
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

                            {item.status === "booked" && (
                                <Card.Actions className="border-t border-slate-50 px-4 py-2 bg-slate-50/50 rounded-b-xl">
                                    <Button
                                        mode="outlined"
                                        onPress={() =>
                                            handleCancelPress(item.bookingCode)
                                        }
                                        textColor="#ef4444"
                                        style={{ borderColor: "#fee2e2" }}
                                        className="flex-1 rounded-lg"
                                        labelStyle={{ fontWeight: "700" }}
                                    >
                                        Cancel Reservation
                                    </Button>
                                </Card.Actions>
                            )}
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
        </View>
    );
}

const styles = StyleSheet.create({});
