import React from "react";
import { FlatList, View, Pressable } from "react-native";
import { Card, Avatar, Badge, Text, Divider, Button } from "react-native-paper";

export default function WalletRequestsTab({
    requests,
    onApprove,
    onReject,
    onPressItem,
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
            data={requests}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
            renderItem={({ item }) => {
                const isAgencyWithdrawal = item.type === "agency_withdrawal" || !!item.agencyId;
                const titleName = isAgencyWithdrawal ? item.agencyName || item.userName : item.userName;
                const iconName = isAgencyWithdrawal ? "cash-minus" : "wallet";
                const iconBg = isAgencyWithdrawal ? "#fee2e2" : "#e0e7ff";
                const iconColor = isAgencyWithdrawal ? "#dc2626" : "#4338ca";
                const badgeLabel = isAgencyWithdrawal ? "Agency Withdrawal" : "Pending Deposit";
                const badgeClass = isAgencyWithdrawal ? "bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded text-xs" : "bg-indigo-100 text-indigo-800 font-bold px-2 py-0.5 rounded text-xs";

                return (
                    <Pressable onPress={() => onPressItem && onPressItem(item)}>
                        <Card className="mb-4 bg-white border border-slate-100 rounded-xl elevation-1">
                            <Card.Content className="pb-3">
                                <View className="flex-row items-center justify-between">
                                    <View className="flex-row items-center flex-1 pr-2">
                                        <Avatar.Icon
                                            size={46}
                                            icon={iconName}
                                            style={{ backgroundColor: iconBg }}
                                            color={iconColor}
                                        />
                                        <View className="ml-3 flex-1">
                                            <Text
                                                className="text-base font-bold text-slate-800"
                                                numberOfLines={1}
                                            >
                                                {titleName}
                                            </Text>
                                            <Text className="text-xs text-slate-500" numberOfLines={1}>
                                                Username: @{item.username} • {formatDateTime(item.createdAt)}
                                            </Text>
                                        </View>
                                    </View>
                                    <View className={badgeClass}><Text className="font-bold text-xs">{String("                                         " + (badgeLabel) + "                                     ").trim()}</Text></View>
                                </View>

                                <Divider className="my-3 bg-slate-100" />

                                <View className="flex-row justify-between items-center">
                                    <View className="gap-1 flex-1 pr-2">
                                        <Text className="text-sm text-slate-600" numberOfLines={1}>
                                            <Text className="font-semibold">Email:</Text> {item.email}
                                        </Text>
                                        <Text className="text-sm text-slate-600" numberOfLines={1}>
                                            <Text className="font-semibold">{isAgencyWithdrawal ? "Phone:" : "Tx ID:"}</Text> {isAgencyWithdrawal ? item.phoneNumber || "N/A" : item.transactionNumber || "N/A"}
                                        </Text>
                                    </View>
                                    <Text className={`text-xl font-extrabold ${isAgencyWithdrawal ? "text-red-600" : "text-indigo-700"}`}>
                                        ₹{parseFloat(item.amount || 0).toFixed(2)}
                                    </Text>
                                </View>
                            </Card.Content>

                            <Card.Actions className="border-t border-slate-50 px-4 py-2 flex-row gap-2 bg-slate-50/50 rounded-b-xl">
                                <Button
                                    mode="outlined"
                                    onPress={() => onReject(item)}
                                    textColor="#dc2626"
                                    className="flex-1 rounded-lg border-red-200"
                                    labelStyle={{ fontWeight: "700" }}
                                >
                                    Reject
                                </Button>
                                <Button
                                    mode="contained"
                                    onPress={() => onApprove(item)}
                                    buttonColor="#16a34a"
                                    className="flex-1 rounded-lg"
                                    labelStyle={{
                                        color: "white",
                                        fontWeight: "700",
                                    }}
                                >
                                    Approve
                                </Button>
                            </Card.Actions>
                        </Card>
                    </Pressable>
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
                        All Clear!
                    </Text>
                    <Text className="text-sm text-slate-400 text-center mt-1 px-8">
                        There are no pending wallet requests.
                    </Text>
                </View>
            }
        />
    );
}
