import React from "react";
import { FlatList, View } from "react-native";
import { Card, Avatar, Badge, Text, Divider, Button } from "react-native-paper";

export default function AgencySettlementsTab({
    settlements,
    onApprove,
    onReject,
}) {
    const formatDateTime = (isoString) => {
        if (!isoString) return "-";
        const date = new Date(isoString);
        return date.toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    return (
        <FlatList
            data={settlements}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
            renderItem={({ item }) => {
                const totalAmount = parseFloat(item.totalAmount || 0);
                const estimatedAgencyShare = parseFloat(item.estimatedAgencyShare || 0);
                const estimatedAdminShare = parseFloat(item.estimatedAdminShare || 0);
                const commissionRate = parseFloat(item.commissionRate || 0);

                return (
                    <Card className="mb-4 bg-white border border-slate-100 rounded-xl elevation-1">
                        <Card.Content className="pb-3">
                            <View className="flex-row items-center justify-between">
                                <View className="flex-row items-center flex-1 pr-2">
                                    <Avatar.Icon
                                        size={44}
                                        icon="cash-clock"
                                        style={{ backgroundColor: "#e0e7ff" }}
                                        color="#ff9933"
                                    />
                                    <View className="ml-3 flex-1">
                                        <Text
                                            className="text-base font-bold text-slate-800"
                                            numberOfLines={1}
                                        >
                                            {item.agencyName}
                                        </Text>
                                        <Text className="text-xs text-slate-500" numberOfLines={1}>
                                            Booking: #{item.bookingCode} • {formatDateTime(item.createdAt)}
                                        </Text>
                                    </View>
                                </View>
                                <View className="bg-amber-100 px-2 py-0.5 rounded"><Text className="text-amber-900 font-bold text-xs">{String("                                     Pending Settlement                                 ").trim()}</Text></View>
                            </View>

                            <Divider className="my-3 bg-slate-100" />

                            <View className="bg-slate-50 p-3 rounded-lg mb-2 flex-row justify-between items-center border border-slate-100">
                                <View>
                                    <Text className="text-xs text-slate-500 font-semibold uppercase">Customer</Text>
                                    <Text className="text-sm font-bold text-slate-700">{item.customerName || "Customer"}</Text>
                                </View>
                                <View className="items-end">
                                    <Text className="text-xs text-slate-500 font-semibold uppercase">Total Deducted</Text>
                                    <Text className="text-base font-extrabold text-carrot-700">₹{totalAmount.toFixed(2)}</Text>
                                </View>
                            </View>

                            <View className="flex-row justify-between items-center px-1">
                                <Text className="text-xs text-slate-500">
                                    Commission Rate: <Text className="font-bold text-slate-700">{commissionRate}%</Text>
                                </Text>
                                <Text className="text-xs text-slate-500">
                                    Agency Share: <Text className="font-bold text-emerald-600">₹{estimatedAgencyShare.toFixed(2)}</Text> (Admin: ₹{estimatedAdminShare.toFixed(2)})
                                </Text>
                            </View>
                        </Card.Content>

                        <Card.Actions className="border-t border-slate-50 px-4 py-2 flex-row gap-2 bg-slate-50/50 rounded-b-xl">
                            <Button
                                mode="outlined"
                                onPress={() => onReject && onReject(item)}
                                textColor="#dc2626"
                                className="flex-1 rounded-lg border-red-200"
                                labelStyle={{ fontWeight: "700" }}
                            >
                                Reject
                            </Button>
                            <Button
                                mode="contained"
                                onPress={() => onApprove && onApprove(item)}
                                buttonColor="#16a34a"
                                className="flex-1 rounded-lg"
                                labelStyle={{
                                    color: "white",
                                    fontWeight: "700",
                                }}
                            >
                                Approve & Transfer
                            </Button>
                        </Card.Actions>
                    </Card>
                );
            }}
            ListEmptyComponent={
                <View className="items-center justify-center pt-20">
                    <Avatar.Icon
                        size={64}
                        icon="check-decagram"
                        style={{ backgroundColor: "#f0fdf4" }}
                        color="#16a34a"
                    />
                    <Text className="text-lg font-bold text-slate-700 mt-4">
                        No Pending Settlements
                    </Text>
                    <Text className="text-sm text-slate-400 text-center mt-1 px-8">
                        All agency revenue settlements have been approved and processed.
                    </Text>
                </View>
            }
        />
    );
}
