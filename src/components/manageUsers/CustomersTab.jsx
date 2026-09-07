import React from "react";
import { View, FlatList } from "react-native";
import { Card, Avatar, Text, Button } from "react-native-paper";
import { MaterialDesignIcons } from "@react-native-vector-icons/material-design-icons";

export default function CustomersTab({
    customers,
    onBlockUser,
    onUnblockUser,
    onLodgeComplaint,
    onViewUser,
}) {
    const getStatusBadge = (status) => {
        const s = (status || "active").toLowerCase();
        switch (s) {
            case "blocked":
                return {
                    bg: "bg-rose-100",
                    text: "text-rose-800",
                    label: "Blocked",
                    icon: "lock-outline",
                    iconColor: "#e11d48",
                };
            case "suspended":
                return {
                    bg: "bg-amber-100",
                    text: "text-amber-800",
                    label: "Suspended",
                    icon: "pause-circle-outline",
                    iconColor: "#d97706",
                };
            default:
                return {
                    bg: "bg-emerald-100",
                    text: "text-emerald-800",
                    label: "Active",
                    icon: "check-circle-outline",
                    iconColor: "#059669",
                };
        }
    };

    return (
        <FlatList
            data={customers}
            keyExtractor={(item) => String(item.id || item.user_id)}
            contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
            renderItem={({ item }) => {
                const statusInfo = getStatusBadge(item.status);
                const isBlocked = (item.status || "").toLowerCase() === "blocked";
                const vehicleCount = Array.isArray(item.vehicleNumbers)
                    ? item.vehicleNumbers.length
                    : 0;

                return (
                    <Card className="mb-3.5 bg-white border border-slate-100 rounded-2xl elevation-1 overflow-hidden">
                        <Card.Content className="p-4">
                            {/* Top row: Avatar + Name + Status Badge */}
                            <View className="flex-row items-center justify-between mb-2.5">
                                <View className="flex-row items-center flex-1 mr-2">
                                    <View
                                        className={`w-11 h-11 rounded-2xl items-center justify-center mr-3 ${
                                            isBlocked ? "bg-rose-100" : "bg-indigo-100"
                                        }`}
                                    >
                                        <MaterialDesignIcons
                                            name={isBlocked ? "account-cancel" : "account"}
                                            size={24}
                                            color={isBlocked ? "#e11d48" : "#4f46e5"}
                                        />
                                    </View>
                                    <View className="flex-1">
                                        <Text
                                            className="text-base font-bold text-slate-800"
                                            numberOfLines={1}
                                        >
                                            {item.name || item.full_name || "Customer"}
                                        </Text>
                                        <Text
                                            className="text-xs text-slate-500 font-medium"
                                            numberOfLines={1}
                                        >
                                            @{item.username || "user"} • {item.phoneNumber || "No phone"}
                                        </Text>
                                    </View>
                                </View>

                                {/* Status Badge */}
                                <View
                                    className={`flex-row items-center px-2.5 py-1 rounded-full ${statusInfo.bg}`}
                                >
                                    <MaterialDesignIcons
                                        name={statusInfo.icon}
                                        size={13}
                                        color={statusInfo.iconColor}
                                        style={{ marginRight: 3 }}
                                    />
                                    <Text
                                        className={`text-[11px] font-bold ${statusInfo.text}`}
                                    >
                                        {statusInfo.label}
                                    </Text>
                                </View>
                            </View>

                            {/* Middle row: Email & Stats */}
                            <View className="bg-slate-50 rounded-xl p-2.5 mb-3 flex-row justify-between items-center border border-slate-100">
                                <View className="flex-1 mr-2">
                                    <Text className="text-[11px] text-slate-400 font-semibold uppercase">
                                        Email
                                    </Text>
                                    <Text
                                        className="text-xs text-slate-700 font-medium"
                                        numberOfLines={1}
                                    >
                                        {item.email || "No email"}
                                    </Text>
                                </View>

                                <View className="items-center px-3 border-x border-slate-200">
                                    <Text className="text-[11px] text-slate-400 font-semibold uppercase">
                                        Vehicles
                                    </Text>
                                    <Text className="text-xs font-bold text-slate-800">
                                        {vehicleCount}
                                    </Text>
                                </View>

                                <View className="items-end pl-2">
                                    <Text className="text-[11px] text-slate-400 font-semibold uppercase">
                                        Wallet
                                    </Text>
                                    <Text className="text-xs font-bold text-emerald-700">
                                        ₹{parseFloat(item.walletBalance || 0).toFixed(2)}
                                    </Text>
                                </View>
                            </View>

                            {/* Bottom row: Action Buttons */}
                            <View className="flex-row items-center justify-between pt-1 border-t border-slate-100">
                                <View className="flex-row items-center">
                                    {Boolean(onLodgeComplaint) && (
                                        <Button
                                            mode="text"
                                            textColor="#dc2626"
                                            icon="alert-decagram-outline"
                                            compact
                                            onPress={() => onLodgeComplaint(item)}
                                            labelStyle={{ fontSize: 11, fontWeight: "600" }}
                                        >
                                            Complaint
                                        </Button>
                                    )}
                                </View>

                                <View className="flex-row items-center gap-2">
                                    {isBlocked ? (
                                        <Button
                                            mode="contained"
                                            buttonColor="#059669"
                                            textColor="#ffffff"
                                            icon="lock-open-outline"
                                            compact
                                            onPress={() => onUnblockUser(item)}
                                            className="rounded-xl"
                                            labelStyle={{
                                                fontSize: 11,
                                                fontWeight: "700",
                                                marginVertical: 4,
                                            }}
                                        >
                                            Unblock
                                        </Button>
                                    ) : (
                                        <Button
                                            mode="outlined"
                                            textColor="#e11d48"
                                            icon="shield-alert-outline"
                                            compact
                                            onPress={() => onBlockUser(item)}
                                            className="rounded-xl border-rose-200 bg-rose-50/50"
                                            labelStyle={{
                                                fontSize: 11,
                                                fontWeight: "700",
                                                marginVertical: 4,
                                            }}
                                        >
                                            Block User
                                        </Button>
                                    )}
                                </View>
                            </View>
                        </Card.Content>
                    </Card>
                );
            }}
            ListEmptyComponent={
                <View className="items-center justify-center pt-20">
                    <Avatar.Icon
                        size={64}
                        icon="account-off-outline"
                        style={{ backgroundColor: "#f8fafc" }}
                        color="#64748b"
                    />
                    <Text className="text-lg font-bold text-slate-700 mt-4">
                        No Customers Found
                    </Text>
                    <Text className="text-sm text-slate-400 text-center mt-1 px-8">
                        No registered customer accounts match your search query.
                    </Text>
                </View>
            }
        />
    );
}
