import React, { useState, useEffect } from "react";
import { View, ScrollView, Modal, TouchableWithoutFeedback } from "react-native";
import { Text, TextInput, Button, IconButton } from "react-native-paper";
import { MaterialDesignIcons } from "@react-native-vector-icons/material-design-icons";
import useToast from "../../hooks/useToast";

export default function VehicleRejectModal({
    visible,
    onDismiss,
    request,
    onSubmit,
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

    if (!request) return null;

    const handleConfirm = async () => {
        if (!reason || reason.trim() === "") {
            toast.error(
                "A rejection reason is mandatory to reject this vehicle.",
                "Validation Error",
                true
            );
            return;
        }

        setSubmitting(true);
        try {
            await onSubmit({
                userId: request.userId,
                vehicleNumber: request.vehicleNumber,
                rejection_reason: reason.trim(),
            });
            onDismiss();
        } catch (error) {
            console.error("Error rejecting vehicle request:", error);
            toast.error("Failed to reject vehicle request", "Error", true);
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
                <View className="flex-1 bg-black/50 justify-center items-center p-4">
                    <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
                        <View className="bg-white rounded-3xl p-5 w-[92%] max-w-[480px] max-h-[85%] shadow-2xl">
                            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View className="flex-row items-center justify-between mb-3">
                    <View className="flex-1 mr-2">
                        <Text className="text-lg font-bold text-slate-800">
                            Reject Vehicle Number
                        </Text>
                        <Text className="text-xs text-slate-500">
                            User:{" "}
                            <Text className="font-bold text-slate-700">
                                {request.userName || request.userUsername}
                            </Text>
                        </Text>
                    </View>
                    <IconButton
                        icon="close"
                        size={20}
                        onPress={onDismiss}
                        className="m-0"
                    />
                </View>

                {/* Target Vehicle Banner */}
                <View className="p-3.5 rounded-2xl mb-4 bg-red-50 border border-red-100 flex-row items-center">
                    <View className="p-2 bg-red-100 rounded-xl mr-3">
                        <MaterialDesignIcons
                            name="car-off"
                            size={24}
                            color="#dc2626"
                        />
                    </View>
                    <View className="flex-1">
                        <Text className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                            Vehicle Number
                        </Text>
                        <Text className="text-lg font-extrabold text-red-700 mt-0.5">
                            {request.vehicleNumber}
                        </Text>
                    </View>
                </View>

                {/* Rejection Form */}
                <View className="gap-2 mb-4">
                    <Text className="text-xs font-bold text-slate-700">
                        Reason for Rejection *
                    </Text>
                    <TextInput
                        placeholder="e.g. Document image is blurry / Vehicle number does not match RC."
                        value={reason}
                        onChangeText={setReason}
                        mode="outlined"
                        multiline
                        numberOfLines={4}
                        activeOutlineColor="#dc2626"
                        outlineColor="#cbd5e1"
                        className="bg-white text-sm"
                    />
                    <Text className="text-[11px] text-slate-400 italic">
                        This reason will be displayed in the user's profile and sent via notification.
                    </Text>
                </View>

                {/* Actions */}
                <View className="flex-row gap-3 mt-2">
                    <Button
                        mode="outlined"
                        onPress={onDismiss}
                        textColor="#64748b"
                        className="flex-1 rounded-xl py-0.5"
                    >
                        Cancel
                    </Button>
                    <Button
                        mode="contained"
                        onPress={handleConfirm}
                        loading={submitting}
                        disabled={submitting}
                        buttonColor="#dc2626"
                        className="flex-1 rounded-xl py-0.5"
                        labelStyle={{ color: "white", fontWeight: "700" }}
                    >
                        Confirm Rejection
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
