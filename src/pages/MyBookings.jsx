import React from "react";
import { View, ScrollView, FlatList, StyleSheet } from "react-native";
import { Text, Card, Button, Avatar, Chip, Divider } from "react-native-paper";
import { useSelector, useDispatch } from "react-redux";
import { cancelBooking } from "../store/parkingSlice";
import useToast from "../hooks/useToast";

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

    // Filter bookings to only show current user's bookings
    const myBookings = bookings.filter(
        (b) => b.userId === currentUser?.id || b.userPhone === currentUser?.phone_number
    );

    const handleCancel = (bookingCode) => {
        dispatch(cancelBooking(bookingCode));
        toast.success(`Booking ${bookingCode} cancelled successfully!`, "Success", true);
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
                                            icon={VEHICLE_TYPE_ICONS[item.vehicleType] || "car"}
                                            style={{ backgroundColor: `${statusColor}20` }}
                                            color={statusColor}
                                        />
                                        <View className="ml-3 flex-1">
                                            <Text className="text-base font-bold text-slate-800" numberOfLines={1}>
                                                {item.agencyName}
                                            </Text>
                                            <Text className="text-xs text-slate-400">
                                                Code: <Text className="font-mono font-bold text-slate-600">{item.bookingCode}</Text>
                                            </Text>
                                        </View>
                                    </View>
                                    <Chip
                                        textStyle={{ color: "white", fontSize: 11, fontWeight: "bold" }}
                                        style={{ backgroundColor: statusColor, height: 26, justifyContent: "center" }}
                                        compact
                                    >
                                        {getStatusLabel(item.status)}
                                    </Chip>
                                </View>

                                <Divider className="my-3 bg-slate-100" />

                                <View className="gap-2">
                                    <View className="flex-row justify-between">
                                        <Text className="text-sm text-slate-500">Vehicle Number:</Text>
                                        <Text className="text-sm font-bold text-slate-700">{item.vehicleNumber}</Text>
                                    </View>
                                    <View className="flex-row justify-between">
                                        <Text className="text-sm text-slate-500">Vehicle Type:</Text>
                                        <Text className="text-sm font-semibold text-slate-700">{VEHICLE_TYPE_LABELS[item.vehicleType] || item.vehicleType}</Text>
                                    </View>
                                    <View className="flex-row justify-between">
                                        <Text className="text-sm text-slate-500">Booked Duration:</Text>
                                        <Text className="text-sm font-semibold text-slate-700">{item.bookedDuration} Hrs</Text>
                                    </View>
                                    <View className="flex-row justify-between">
                                        <Text className="text-sm text-slate-500">Rate:</Text>
                                        <Text className="text-sm font-semibold text-slate-700">₹{item.hourlyRate}/hr</Text>
                                    </View>

                                    <Divider className="my-1.5 bg-slate-50" />

                                    <View className="flex-row justify-between">
                                        <Text className="text-sm text-slate-500">Booked For:</Text>
                                        <Text className="text-sm font-medium text-slate-700">{formatDateTime(item.startTime)}</Text>
                                    </View>

                                    {item.status === "completed" && (
                                        <View className="flex-row justify-between mt-1 p-2 bg-emerald-50 rounded-lg border border-emerald-100">
                                            <Text className="text-sm font-bold text-emerald-800">Amount Paid:</Text>
                                            <Text className="text-sm font-bold text-emerald-800">₹{item.totalBill}</Text>
                                        </View>
                                    )}
                                </View>
                            </Card.Content>

                            {item.status === "booked" && (
                                <Card.Actions className="border-t border-slate-50 px-4 py-2 bg-slate-50/50 rounded-b-xl">
                                    <Button
                                        mode="outlined"
                                        onPress={() => handleCancel(item.bookingCode)}
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
                            Any parking slots you reserve will appear here. Find nearby parking locations on the map to get started.
                        </Text>
                    </View>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({});
