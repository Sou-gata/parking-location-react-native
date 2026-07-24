import React, { useState } from "react";
import { View, FlatList } from "react-native";
import {
    Text,
    Card,
    TextInput,
    Avatar,
    Divider,
    Badge,
} from "react-native-paper";
import Chip from "../Chip";
import { getVehicleLabel, getVehicleIcon, formatElapsed, formatDateTime } from "./utils";

export default function ParkedTab({ currentAgency, activeBookings }) {
    const [searchQuery, setSearchQuery] = useState("");

    // Get currently parked vehicles
    const parkedVehicles = currentAgency
        ? activeBookings.filter(
              (b) =>
                  String(b.agencyId) === String(currentAgency.id) &&
                  b.status === "checked_in"
          )
        : [];

    const filteredParkedVehicles = parkedVehicles.filter((b) => {
        const q = searchQuery.toLowerCase().trim();
        if (!q) return true;
        return (
            b.vehicleNumber.toLowerCase().includes(q) ||
            b.userName.toLowerCase().includes(q) ||
            (b.userPhone && b.userPhone.includes(q)) ||
            getVehicleLabel(b.vehicleType).toLowerCase().includes(q)
        );
    });

    return (
        <View className="flex-1">
            {/* Search and Filters */}
            <View className="px-4 pt-3 pb-2 flex-row gap-2">
                <TextInput
                    placeholder="Search by vehicle number, name..."
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    mode="outlined"
                    dense
                    outlineColor="#e2e8f0"
                    activeOutlineColor="#4338ca"
                    left={<TextInput.Icon icon="magnify" />}
                    style={{
                        flex: 1,
                        backgroundColor: "white",
                        height: 42,
                    }}
                />
            </View>

            <FlatList
                data={filteredParkedVehicles}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{
                    padding: 16,
                    paddingBottom: 80,
                }}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                    <View className="items-center justify-center py-10 px-4 bg-white rounded-xl border border-slate-100">
                        <Avatar.Icon
                            size={64}
                            icon="car-off"
                            style={{ backgroundColor: "#f1f5f9" }}
                            color="#94a3b8"
                        />
                        <Text className="text-base font-bold text-slate-700 mt-4">
                            No vehicles parked
                        </Text>
                        <Text className="text-sm text-slate-400 text-center mt-1">
                            {searchQuery
                                ? "No matching checked-in bookings found."
                                : "There are no currently checked-in vehicles."}
                        </Text>
                    </View>
                }
                renderItem={({ item }) => (
                    <Card
                        className="bg-white mb-3 border border-slate-100"
                        elevation={1}
                    >
                        <Card.Content className="p-4">
                            {/* Top Row: Vehicle Plate and Type Chip */}
                            <View className="flex-row justify-between items-center mb-3">
                                <View className="border-2 border-slate-800 bg-slate-50 px-3 py-1 rounded">
                                    <Text className="text-slate-800 font-bold tracking-wider text-sm">
                                        {item.vehicleNumber}
                                    </Text>
                                </View>
                                <Chip
                                    icon={getVehicleIcon(item.vehicleType)}
                                    style={{
                                        backgroundColor: "#e0e7ff",
                                    }}
                                    textStyle={{
                                        fontSize: 11,
                                        color: "#4338ca",
                                        fontWeight: "bold",
                                    }}
                                    compact
                                >
                                    {getVehicleLabel(item.vehicleType)}
                                </Chip>
                            </View>

                            {/* Middle Section: Customer info & Booking code */}
                            <View className="flex-row justify-between items-center mb-2">
                                <View>
                                    <Text className="text-sm font-bold text-slate-700">
                                        {item.userName}
                                    </Text>
                                    <Text className="text-xs text-slate-400">
                                        {item.userPhone || "No Phone"}
                                    </Text>
                                </View>
                                <Badge
                                    style={{
                                        backgroundColor: "#cbd5e1",
                                        color: "#475569",
                                    }}
                                    className="font-semibold text-xs"
                                >
                                    {item.bookingCode}
                                </Badge>
                            </View>

                            <Divider className="my-2 bg-slate-100" />

                            {/* Bottom Section: Timings */}
                            <View className="flex-row justify-between items-center">
                                <View className="flex-row items-center">
                                    <Avatar.Icon
                                        size={16}
                                        icon="clock-outline"
                                        style={{
                                            backgroundColor: "transparent",
                                        }}
                                        color="#64748b"
                                    />
                                    <Text className="text-xs text-slate-500 ml-1">
                                        In: {formatDateTime(item.startTime)}
                                    </Text>
                                </View>
                                <View className="flex-row items-center bg-emerald-50 px-2 py-0.5 rounded">
                                    <Text className="text-xs text-emerald-800 font-bold">
                                        Duration: {formatElapsed(item.startTime)}
                                    </Text>
                                </View>
                            </View>
                        </Card.Content>
                    </Card>
                )}
            />
        </View>
    );
}
