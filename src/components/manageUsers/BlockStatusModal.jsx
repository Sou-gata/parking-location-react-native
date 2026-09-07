import React, { useState, useEffect } from "react";
import { View, ScrollView, Modal, TouchableWithoutFeedback } from "react-native";
import { Text, TextInput, Button, IconButton, Surface } from "react-native-paper";
import { MaterialDesignIcons } from "@react-native-vector-icons/material-design-icons";
import useToast from "../../hooks/useToast";

export default function BlockStatusModal({
    visible,
    onDismiss,
    targetItem,
    targetType = "user", // "user" or "agency"
    action = "block", // "block" or "unblock"
    onConfirm,
}) {
    const toast = useToast();
    const [reason, setReason] = useState("");
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (visible) {
            setReason("");
            setSubmitting(false);
        }
    }, [visible]);

    if (!targetItem) return null;

    const isBlock = action === "block";
    const entityName =
        targetItem.name ||
        targetItem.full_name ||
        targetItem.org_name ||
        targetItem.username ||
        "Account";
    const entityLabel = targetType === "agency" ? "Agency" : "User";

    const handleConfirm = async () => {
        if (isBlock && (!reason || reason.trim() === "")) {
            toast.error(
                `A reason is required to block this ${entityLabel.toLowerCase()}.`,
                "Validation Error",
                true
            );
            return;
        }

        setSubmitting(true);
        try {
            await onConfirm({
                targetItem,
                targetType,
                newStatus: isBlock ? "blocked" : "active",
                reason: reason.trim() || (isBlock ? "Administrative block" : "Administrative unblock"),
            });
            onDismiss();
        } catch (error) {
            console.error(`Error updating ${entityLabel} status:`, error);
            toast.error(
                error?.message || `Failed to ${action} ${entityLabel.toLowerCase()}`,
                "Error",
                true
            );
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal
            visible={Boolean(visible)}
            transparent={true}
            animationType="fade"
            onRequestClose={onDismiss}
        >
            <TouchableWithoutFeedback onPress={onDismiss}>
                <View className="flex-1 bg-black/60 justify-center items-center p-4">
                    <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
                        <View className="bg-white rounded-3xl p-5 w-[92%] max-w-[480px] max-h-[85%] shadow-2xl">
                            <ScrollView showsVerticalScrollIndicator={false}>
                                {/* Header */}
                                <View className="flex-row items-center justify-between mb-3">
                                    <View className="flex-row items-center flex-1 mr-2">
                                        <View
                                            className={`w-10 h-10 rounded-2xl items-center justify-center mr-3 ${
                                                isBlock ? "bg-rose-100" : "bg-emerald-100"
                                            }`}
                                        >
                                            <MaterialDesignIcons
                                                name={isBlock ? "shield-alert" : "shield-check"}
                                                size={22}
                                                color={isBlock ? "#e11d48" : "#059669"}
                                            />
                                        </View>
                                        <View className="flex-1">
                                            <Text className="text-lg font-bold text-slate-800">
                                                {isBlock ? `Block ${entityLabel}` : `Unblock ${entityLabel}`}
                                            </Text>
                                            <Text className="text-xs text-slate-500" numberOfLines={1}>
                                                {entityName}
                                            </Text>
                                        </View>
                                    </View>
                                    <IconButton
                                        icon="close"
                                        size={20}
                                        iconColor="#94a3b8"
                                        style={{ margin: 0 }}
                                        onPress={onDismiss}
                                    />
                                </View>

                                {/* Notice card */}
                                <Surface
                                    elevation={0}
                                    className={`p-3.5 rounded-2xl mb-4 border ${
                                        isBlock
                                            ? "bg-rose-50/80 border-rose-200"
                                            : "bg-emerald-50/80 border-emerald-200"
                                    }`}
                                >
                                    <Text
                                        className={`text-xs font-semibold ${
                                            isBlock ? "text-rose-900" : "text-emerald-900"
                                        }`}
                                    >
                                        {isBlock
                                            ? targetType === "agency"
                                                ? "Blocking this agency will hide all its parking venues from maps and search, reject new bookings, and restrict agency staff logins."
                                                : "Blocking this user will prevent them from logging in, reserving parking slots, or making wallet transactions."
                                            : targetType === "agency"
                                                ? "Unblocking this agency will restore its venues to public search, allow customers to book spots, and restore staff access."
                                                : "Unblocking this user will restore full account privileges and allow normal parking reservations."}
                                    </Text>
                                </Surface>

                                {/* Reason Input */}
                                <Text className="text-xs font-bold text-slate-700 mb-1.5">
                                    {isBlock ? "Reason for Blocking *" : "Reason for Unblocking (Optional)"}
                                </Text>
                                <TextInput
                                    mode="outlined"
                                    placeholder={
                                        isBlock
                                            ? "e.g., Violation of platform terms, fraudulent bookings..."
                                            : "e.g., Issue resolved, verification completed..."
                                    }
                                    value={reason}
                                    onChangeText={setReason}
                                    multiline
                                    numberOfLines={3}
                                    activeOutlineColor={isBlock ? "#e11d48" : "#059669"}
                                    outlineColor="#cbd5e1"
                                    className="bg-white mb-4"
                                />

                                {/* Action Buttons */}
                                <View className="flex-row justify-end gap-2.5 mt-2">
                                    <Button
                                        mode="outlined"
                                        onPress={onDismiss}
                                        textColor="#64748b"
                                        className="rounded-xl border-slate-300"
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        mode="contained"
                                        onPress={handleConfirm}
                                        loading={submitting}
                                        disabled={submitting}
                                        buttonColor={isBlock ? "#e11d48" : "#059669"}
                                        className="rounded-xl"
                                        labelStyle={{ fontWeight: "700" }}
                                    >
                                        {isBlock ? "Confirm Block" : "Confirm Unblock"}
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
