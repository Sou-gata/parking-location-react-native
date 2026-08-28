import React, { useState } from "react";
import { View, FlatList, Image } from "react-native";
import { Card, Avatar, Badge, Text, Divider, IconButton } from "react-native-paper";
import Chip from "../Chip";
import { imageBaseURL } from "../../utils/baseURL";

export default function AdminTransactionHistoryTab({
    transactions,
    agencies,
    selectedAgencyId,
    onSelectAgencyId,
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

    const getImageUrl = (path) => {
        if (!path) return null;
        const cleanPath = path.startsWith("uploads/") ? path.substring(8) : path;
        return `${imageBaseURL}${cleanPath}`;
    };

    const filteredTransactions = transactions.filter((t) => {
        if (!selectedAgencyId || selectedAgencyId === "all") return true;
        return String(t.agencyId) === String(selectedAgencyId);
    });

    return (
        <View className="flex-1">
            {/* Agency Selector Bar */}
            <View className="bg-white py-2 border-b border-slate-100">
                <Text className="text-xs font-bold text-slate-500 uppercase tracking-wider px-4 mb-2">
                    Filter History by Agency:
                </Text>
                <FlatList
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ paddingHorizontal: 16 }}
                    data={[{ id: "all", name: "All System Txs" }, ...agencies]}
                    keyExtractor={(item) => String(item.id)}
                    renderItem={({ item }) => {
                        const isSelected =
                            (!selectedAgencyId && item.id === "all") ||
                            String(selectedAgencyId) === String(item.id);
                        return (
                            <Chip
                                selected={isSelected}
                                onPress={() => onSelectAgencyId(item.id)}
                                className="mr-2 h-9"
                                style={{
                                    backgroundColor: isSelected ? "#4338ca" : "#f1f5f9",
                                    borderColor: isSelected ? "#4338ca" : "#cbd5e1",
                                }}
                                textStyle={{
                                    color: isSelected ? "#ffffff" : "#334155",
                                    fontWeight: isSelected ? "700" : "600",
                                }}
                            >
                                {item.name}
                            </Chip>
                        );
                    }}
                />
            </View>

            {/* Transactions List */}
            <FlatList
                data={filteredTransactions}
                keyExtractor={(item) => String(item.id)}
                contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
                renderItem={({ item }) => {
                    const isRevenueSplit = item.category === "revenue_split";
                    const isAgencyWithdrawal = item.category === "agency_withdrawal";
                    const isApproved = item.status === "approved";
                    const isRejected = item.status === "rejected";

                    let iconName = "bank-transfer";
                    let iconBg = "#e0e7ff";
                    let iconColor = "#4338ca";

                    if (isRevenueSplit) {
                        iconName = "chart-pie";
                        iconBg = "#dcfce7";
                        iconColor = "#16a34a";
                    } else if (isAgencyWithdrawal) {
                        iconName = "cash-minus";
                        iconBg = "#fee2e2";
                        iconColor = "#dc2626";
                    }

                    const proofUrl = getImageUrl(item.screenshotPath);

                    return (
                        <Card className="mb-4 bg-white border border-slate-100 rounded-xl elevation-1">
                            <Card.Content className="pb-3">
                                <View className="flex-row items-center justify-between">
                                    <View className="flex-row items-center flex-1 pr-2">
                                        <Avatar.Icon
                                            size={44}
                                            icon={iconName}
                                            style={{ backgroundColor: iconBg }}
                                            color={iconColor}
                                        />
                                        <View className="ml-3 flex-1">
                                            <Text className="text-base font-bold text-slate-800" numberOfLines={1}>
                                                {isRevenueSplit ? `${item.agencyName} (Parking Revenue)` : item.entityName || "Transaction"}
                                            </Text>
                                            <Text className="text-xs text-slate-500" numberOfLines={1}>
                                                {formatDateTime(item.date)}
                                            </Text>
                                        </View>
                                    </View>
                                    <View className={isApproved
                                                ? "bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded text-xs"
                                                : isRejected
                                                ? "bg-red-100 text-red-800 font-bold px-2 py-0.5 rounded text-xs"
                                                : "bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded text-xs"}><Text className="font-bold text-xs">{String("                                         " + (isApproved ? "Approved" : isRejected ? "Rejected" : "Pending") + "                                     ").trim()}</Text></View>
                                </View>

                                <Divider className="my-3 bg-slate-100" />

                                {isRevenueSplit ? (
                                    /* Revenue Split Details */
                                    <View className="bg-slate-50 p-3 rounded-xl border border-slate-100 gap-1.5">
                                        <View className="flex-row justify-between">
                                            <Text className="text-xs text-slate-500 font-semibold">Total Bill ({item.bookingCode}):</Text>
                                            <Text className="text-xs font-bold text-slate-800">₹{item.totalAmount.toFixed(2)}</Text>
                                        </View>
                                        <View className="flex-row justify-between">
                                            <Text className="text-xs text-slate-500 font-semibold">Commission ({item.commissionRate}%):</Text>
                                            <Text className="text-xs font-bold text-emerald-700">+₹{item.adminShare.toFixed(2)} (Super Admin)</Text>
                                        </View>
                                        <View className="flex-row justify-between">
                                            <Text className="text-xs text-slate-500 font-semibold">Agency Share:</Text>
                                            <Text className="text-xs font-bold text-indigo-700">+₹{item.agencyShare.toFixed(2)} ({item.agencyName})</Text>
                                        </View>
                                    </View>
                                ) : (
                                    /* Wallet / Withdrawal Details */
                                    <View className="gap-1">
                                        <View className="flex-row justify-between items-center">
                                            <Text className="text-xs font-semibold text-slate-500">
                                                {isAgencyWithdrawal ? "Cash Withdrawal Amount:" : "Deposit Amount:"}
                                            </Text>
                                            <Text className={`text-lg font-extrabold ${isAgencyWithdrawal ? "text-red-600" : "text-emerald-700"}`}>
                                                {isAgencyWithdrawal ? "-" : "+"}₹{parseFloat(item.amount || 0).toFixed(2)}
                                            </Text>
                                        </View>

                                        {item.previousBalance !== null && item.previousBalance !== undefined && (
                                            <View className="flex-row justify-between items-center">
                                                <Text className="text-xs font-semibold text-slate-500">Previous Account Balance:</Text>
                                                <Text className="text-xs font-bold text-slate-700">₹{parseFloat(item.previousBalance).toFixed(2)}</Text>
                                            </View>
                                        )}

                                        {item.newBalance !== null && item.newBalance !== undefined && (
                                            <View className="flex-row justify-between items-center">
                                                <Text className="text-xs font-semibold text-slate-500">Updated Account Balance:</Text>
                                                <Text className="text-xs font-extrabold text-indigo-700">₹{parseFloat(item.newBalance).toFixed(2)}</Text>
                                            </View>
                                        )}

                                        {Boolean(item.transactionNumber) && (
                                            <Text className="text-xs text-slate-600">
                                                <Text className="font-semibold">Tx ID / Ref:</Text> {item.transactionNumber}
                                            </Text>
                                        )}

                                        {Boolean(isRejected && item.rejectionReason) && (
                                            <View className="mt-1 p-2 bg-red-50 rounded-lg border border-red-100">
                                                <Text className="text-xs font-bold text-red-800">Rejection Reason:</Text>
                                                <Text className="text-xs text-red-700 mt-0.5">{item.rejectionReason}</Text>
                                            </View>
                                        )}

                                        {Boolean(proofUrl) && (
                                            <View className="mt-2 border border-slate-100 rounded-lg overflow-hidden bg-slate-50 p-1">
                                                <Text className="text-[10px] font-bold text-slate-500 mb-1">Payment Proof:</Text>
                                                <Image source={{ uri: proofUrl }} style={{ width: "100%", height: 120 }} resizeMode="contain" />
                                            </View>
                                        )}
                                    </View>
                                )}
                            </Card.Content>
                        </Card>
                    );
                }}
                ListEmptyComponent={
                    <View className="items-center justify-center pt-20">
                        <Avatar.Icon size={64} icon="receipt-text-off" style={{ backgroundColor: "#f8fafc" }} color="#94a3b8" />
                        <Text className="text-lg font-bold text-slate-700 mt-4">No Transactions Found</Text>
                        <Text className="text-sm text-slate-400 text-center mt-1 px-8">
                            No history records match the selected filter.
                        </Text>
                    </View>
                }
            />
        </View>
    );
}
