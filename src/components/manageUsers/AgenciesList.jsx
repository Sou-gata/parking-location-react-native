import React from "react";
import { View, FlatList, Pressable } from "react-native";
import { Card, Avatar, Text, Button } from "react-native-paper";
import { MaterialDesignIcons } from "@react-native-vector-icons/material-design-icons";

export default function AgenciesList({
    agencies,
    onPressAgency,
    onEditAgency,
    onLodgeComplaint,
    onBlockAgency,
    onUnblockAgency,
}) {
    const getStatusStyle = (status) => {
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
            case "pending":
                return {
                    bg: "bg-orange-100",
                    text: "text-orange-800",
                    label: "Pending",
                    icon: "clock-outline",
                    iconColor: "#ea580c",
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
            data={agencies}
            keyExtractor={(item) => String(item.id || item.org_id)}
            contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
            renderItem={({ item }) => {
                const statusInfo = getStatusStyle(item.status);
                const isBlocked = (item.status || "").toLowerCase() === "blocked";

                return (
                    <Pressable onPress={() => onPressAgency(item)}>
                        <Card className="mb-4 bg-white border border-slate-100 rounded-2xl elevation-1 overflow-hidden">
                            <Card.Content className="p-4">
                                <View className="flex-row items-center justify-between">
                                    <View className="flex-row items-center flex-1 pr-2">
                                        <Avatar.Icon
                                            size={46}
                                            icon="office-building"
                                            style={{
                                                backgroundColor: isBlocked ? "#ffe4e6" : "#e0e7ff",
                                            }}
                                            color={isBlocked ? "#e11d48" : "#ff9933"}
                                        />
                                        <View className="ml-3 flex-1">
                                            <View className="flex-row items-center gap-2">
                                                <Text
                                                    className="text-base font-bold text-slate-800 flex-1"
                                                    numberOfLines={1}
                                                >
                                                    {item.name || item.org_name}
                                                </Text>
                                                {/* Status badge */}
                                                <View
                                                    className={`flex-row items-center px-2 py-0.5 rounded-full ${statusInfo.bg}`}
                                                >
                                                    <MaterialDesignIcons
                                                        name={statusInfo.icon}
                                                        size={11}
                                                        color={statusInfo.iconColor}
                                                        style={{ marginRight: 2 }}
                                                    />
                                                    <Text
                                                        className={`text-[10px] font-bold ${statusInfo.text}`}
                                                    >
                                                        {statusInfo.label}
                                                    </Text>
                                                </View>
                                            </View>

                                            <Text
                                                className="text-xs text-slate-500 mt-0.5"
                                                numberOfLines={1}
                                            >
                                                Admin: {item.owner || item.username || "Owner"} •{" "}
                                                {item.phone_number || "No Phone"}
                                            </Text>
                                            <Text
                                                className="text-xs text-slate-400 mt-0.5"
                                                numberOfLines={1}
                                            >
                                                {item.address || item.org_address || "No Address"}
                                            </Text>
                                        </View>
                                    </View>

                                    <View className="items-end gap-1">
                                        <View className="bg-carrot-100 px-2 py-0.5 rounded">
                                            <Text className="text-carrot-800 font-bold text-[11px]">
                                                {item.users?.length || 0} Users
                                            </Text>
                                        </View>
                                        <View className="bg-emerald-100 px-2 py-0.5 rounded">
                                            <Text className="text-emerald-800 font-bold text-[11px]">
                                                {parseFloat(item.commission_percentage || 0).toFixed(1)}% Comm.
                                            </Text>
                                        </View>
                                        {item.wallet_balance !== undefined && (
                                            <Text className="text-[11px] font-bold text-slate-600 mt-0.5">
                                                ₹{parseFloat(item.wallet_balance || 0).toFixed(2)}
                                            </Text>
                                        )}
                                    </View>
                                </View>

                                {/* Action Buttons Footer */}
                                <View className="flex-row items-center justify-between pt-3 mt-3 border-t border-slate-100">
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
                                        {Boolean(onEditAgency) && (
                                            <Button
                                                mode="text"
                                                textColor="#ff9933"
                                                icon="pencil-outline"
                                                compact
                                                onPress={() => onEditAgency(item)}
                                                labelStyle={{ fontSize: 11, fontWeight: "600" }}
                                            >
                                                Edit
                                            </Button>
                                        )}
                                    </View>

                                    <View className="flex-row items-center gap-2">
                                        {isBlocked ? (
                                            Boolean(onUnblockAgency) && (
                                                <Button
                                                    mode="contained"
                                                    buttonColor="#059669"
                                                    textColor="#ffffff"
                                                    icon="lock-open-outline"
                                                    compact
                                                    onPress={() => onUnblockAgency(item)}
                                                    className="rounded-xl"
                                                    labelStyle={{
                                                        fontSize: 11,
                                                        fontWeight: "700",
                                                        marginVertical: 4,
                                                    }}
                                                >
                                                    Unblock Agency
                                                </Button>
                                            )
                                        ) : (
                                            Boolean(onBlockAgency) && (
                                                <Button
                                                    mode="outlined"
                                                    textColor="#e11d48"
                                                    icon="shield-alert-outline"
                                                    compact
                                                    onPress={() => onBlockAgency(item)}
                                                    className="rounded-xl border-rose-200 bg-rose-50/50"
                                                    labelStyle={{
                                                        fontSize: 11,
                                                        fontWeight: "700",
                                                        marginVertical: 4,
                                                    }}
                                                >
                                                    Block Agency
                                                </Button>
                                            )
                                        )}
                                    </View>
                                </View>
                            </Card.Content>
                        </Card>
                    </Pressable>
                );
            }}
            ListEmptyComponent={
                <View className="items-center justify-center pt-20">
                    <Avatar.Icon
                        size={64}
                        icon="office-building-off"
                        style={{ backgroundColor: "#f8fafc" }}
                        color="#64748b"
                    />
                    <Text className="text-lg font-bold text-slate-700 mt-4">
                        No Agencies Found
                    </Text>
                    <Text className="text-sm text-slate-400 text-center mt-1 px-8">
                        No agencies match your search query.
                    </Text>
                </View>
            }
        />
    );
}
