import React from "react";
import { View, FlatList, Pressable } from "react-native";
import { Card, Avatar, Text, Badge, IconButton } from "react-native-paper";

export default function AgenciesList({ agencies, onPressAgency, onEditAgency, onLodgeComplaint }) {
    return (
        <FlatList
            data={agencies}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
            renderItem={({ item }) => (
                <Pressable onPress={() => onPressAgency(item)}>
                    <Card className="mb-4 bg-white border border-slate-100 rounded-xl elevation-1">
                        <Card.Content className="pb-3 flex-row items-center justify-between">
                            <View className="flex-row items-center flex-1 pr-2">
                                <Avatar.Icon
                                    size={48}
                                    icon="office-building"
                                    style={{
                                        backgroundColor: "#e0e7ff",
                                    }}
                                    color="#ff9933"
                                />
                                <View className="ml-3 flex-1">
                                    <Text
                                        className="text-base font-bold text-slate-800"
                                        numberOfLines={1}
                                    >
                                        {item.name}
                                    </Text>
                                    <Text
                                        className="text-xs text-slate-500"
                                        numberOfLines={1}
                                    >
                                        Admin: {item.owner} • {item.phone_number || "No Phone"}
                                    </Text>
                                    <Text
                                        className="text-xs text-slate-400 mt-0.5"
                                        numberOfLines={1}
                                    >
                                        {item.address || "No Address"}
                                    </Text>
                                </View>
                            </View>
                            <View className="flex-row items-center">
                                <View className="items-end gap-1">
                                    <View className="bg-carrot-100 px-2 py-0.5 rounded"><Text className="text-carrot-800 font-bold text-xs">{String("                                         " + (item.users?.length || 0) + " Users                                     ").trim()}</Text></View>
                                    <View className="bg-emerald-100 px-2 py-0.5 rounded"><Text className="text-emerald-800 font-bold text-xs">{String("                                         " + (parseFloat(item.commission_percentage || 0).toFixed(1)) + "% Comm.                                     ").trim()}</Text></View>
                                    <View className={Boolean(
                                                item.require_booking_approval !== undefined
                                                    ? item.require_booking_approval
                                                    : item.requireBookingApproval
                                            )
                                                ? "bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded text-xs"
                                                : "bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded text-xs"}><Text className="font-bold text-xs">{String("                                         " + (Boolean(
                                            item.require_booking_approval !== undefined
                                                ? item.require_booking_approval
                                                : item.requireBookingApproval
                                        )
                                            ? "Approval Req."
                                            : "Auto Approved") + "                                     ").trim()}</Text></View>
                                    {item.wallet_balance !== undefined && (
                                        <Text className="text-[11px] font-bold text-slate-600 mt-0.5">
                                            ₹{parseFloat(item.wallet_balance || 0).toFixed(2)}
                                        </Text>
                                    )}
                                </View>
                                {Boolean(onLodgeComplaint) && (
                                    <IconButton
                                        icon="alert-decagram-outline"
                                        iconColor="#dc2626"
                                        size={20}
                                        style={{ margin: 0, marginLeft: 4 }}
                                        onPress={() => onLodgeComplaint(item)}
                                    />
                                )}
                                {Boolean(onEditAgency) && (
                                    <IconButton
                                        icon="pencil-outline"
                                        iconColor="#ff9933"
                                        size={20}
                                        style={{ margin: 0, marginLeft: 2 }}
                                        onPress={() => onEditAgency(item)}
                                    />
                                )}
                            </View>
                        </Card.Content>
                    </Card>
                </Pressable>
            )}
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
                        No active agencies match your search query.
                    </Text>
                </View>
            }
        />
    );
}
