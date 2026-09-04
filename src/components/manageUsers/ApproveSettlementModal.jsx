import React, { useState, useEffect } from "react";
import { View, ScrollView, Modal, TouchableWithoutFeedback } from "react-native";
import { Text, TextInput, Button, Divider, Surface } from "react-native-paper";

export default function ApproveSettlementModal({
    visible,
    onDismiss,
    settlement,
    onConfirmApprove,
    submitting,
}) {
    const [customAmount, setCustomAmount] = useState("");

    useEffect(() => {
        if (settlement) {
            setCustomAmount(String(settlement.totalAmount || ""));
        } else {
            setCustomAmount("");
        }
    }, [settlement, visible]);

    if (!settlement) return null;

    const totalDeducted = parseFloat(settlement.totalAmount || 0);
    const commissionRate = parseFloat(settlement.commissionRate || 0);

    const numericCustom = parseFloat(customAmount);
    const effectiveTotal = !isNaN(numericCustom) && numericCustom > 0 ? numericCustom : totalDeducted;

    const computedAdminShare = parseFloat(((effectiveTotal * commissionRate) / 100).toFixed(2));
    const computedAgencyShare = parseFloat((effectiveTotal - computedAdminShare).toFixed(2));

    const handleConfirm = () => {
        onConfirmApprove(settlement.id, effectiveTotal);
    };

    return (
        <Modal
            visible={Boolean(visible)}
            transparent={true}
            animationType="fade"
            onRequestClose={onDismiss}
        >
            <TouchableWithoutFeedback onPress={onDismiss}>
                <View className="flex-1 bg-black/50 justify-center items-center p-4">
                    <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
                        <View className="bg-white rounded-3xl p-5 w-[92%] max-w-[500px] max-h-[85%] shadow-2xl">
                            <ScrollView showsVerticalScrollIndicator={false}>
                                <Text className="text-xl font-extrabold text-slate-800 mb-1">
                                    Approve Revenue Settlement
                                </Text>
                                <Text className="text-xs text-slate-500 mb-4">
                                    Review and approve the earnings payout to the parking owner. You can override the total amount if needed.
                                </Text>

                                <Surface elevation={0} className="bg-carrot-50/60 p-3.5 rounded-xl mb-4 border border-carrot-100">
                                    <Text className="text-xs font-bold text-carrot-900 uppercase mb-1">
                                        {settlement.agencyName}
                                    </Text>
                                    <Text className="text-xs text-slate-600">
                                        Booking Code: <Text className="font-bold text-slate-800">#{settlement.bookingCode}</Text>
                                    </Text>
                                    <Text className="text-xs text-slate-600 mt-0.5">
                                        Customer: <Text className="font-semibold text-slate-800">{settlement.customerName}</Text>
                                    </Text>
                                </Surface>

                                <View className="mb-4 flex-row justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-200">
                                    <Text className="text-xs font-semibold text-slate-600">Collected from User:</Text>
                                    <Text className="text-base font-extrabold text-slate-800">₹{totalDeducted.toFixed(2)}</Text>
                                </View>

                                <TextInput
                                    mode="outlined"
                                    label="Approved Total Amount (₹)"
                                    placeholder="Enter total amount to settle"
                                    keyboardType="numeric"
                                    value={customAmount}
                                    onChangeText={setCustomAmount}
                                    activeOutlineColor="#16a34a"
                                    outlineColor="#cbd5e1"
                                    className="bg-white mb-4"
                                    left={<TextInput.Affix text="₹" />}
                                />

                                <Divider className="my-2 bg-slate-200" />

                                <Text className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                                    Calculated Payout Preview
                                </Text>

                                <View className="bg-emerald-50/60 p-3.5 rounded-xl mb-5 border border-emerald-200 gap-1.5">
                                    <View className="flex-row justify-between items-center">
                                        <Text className="text-xs text-slate-600 font-medium">Agency Commission Rate:</Text>
                                        <Text className="text-xs font-bold text-slate-800">{commissionRate}%</Text>
                                    </View>
                                    <View className="flex-row justify-between items-center">
                                        <Text className="text-xs text-slate-600 font-medium">Super Admin Share retained:</Text>
                                        <Text className="text-xs font-bold text-carrot-700">₹{computedAdminShare.toFixed(2)}</Text>
                                    </View>
                                    <Divider className="my-1 bg-emerald-200/60" />
                                    <View className="flex-row justify-between items-center">
                                        <Text className="text-sm font-bold text-emerald-900">Agency Wallet Payout:</Text>
                                        <Text className="text-lg font-extrabold text-emerald-700">₹{computedAgencyShare.toFixed(2)}</Text>
                                    </View>
                                </View>

                                <View className="flex-row gap-3">
                                    <Button
                                        mode="outlined"
                                        onPress={onDismiss}
                                        disabled={submitting}
                                        className="flex-1 rounded-xl border-slate-200"
                                        textColor="#64748b"
                                        labelStyle={{ fontWeight: "bold" }}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        mode="contained"
                                        onPress={handleConfirm}
                                        loading={submitting}
                                        disabled={submitting}
                                        buttonColor="#16a34a"
                                        className="flex-1 rounded-xl"
                                        labelStyle={{ fontWeight: "bold", color: "white" }}
                                    >
                                        Confirm & Approve
                                    </Button>
                                </View>
                            </ScrollView>
                        </View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
}
