import React, { useState, useEffect } from "react";
import {
    View,
    Image,
    ScrollView,
    Modal,
    TouchableWithoutFeedback,
} from "react-native";
import {
    Text,
    TextInput,
    Button,
    Avatar,
    IconButton,
} from "react-native-paper";
import { launchImageLibrary } from "react-native-image-picker";
import { fileToBase64 } from "../../utils/helperFunctions";
import useToast from "../../hooks/useToast";

export default function WithdrawalActionModal({
    visible,
    onDismiss,
    request,
    actionType, // "approve" or "reject"
    onSubmit,
}) {
    const toast = useToast();
    const [txNumber, setTxNumber] = useState("");
    const [reason, setReason] = useState("");
    const [screenshotAsset, setScreenshotAsset] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (visible) {
            setTxNumber("");
            setReason("");
            setScreenshotAsset(null);
            setSubmitting(false);
        }
    }, [visible]);

    if (!request) return null;

    const handlePickScreenshot = async () => {
        const result = await launchImageLibrary({
            mediaType: "photo",
            quality: 0.8,
        });
        if (
            !result.didCancel &&
            !result.errorCode &&
            result.assets &&
            result.assets.length > 0
        ) {
            setScreenshotAsset(result.assets[0]);
        }
    };

    const handleConfirm = async () => {
        if (actionType === "approve") {
            if (!txNumber || txNumber.trim() === "") {
                toast.error(
                    "Transaction ID / Ref Number is required for approval.",
                    "Validation Error",
                    true
                );
                return;
            }

            setSubmitting(true);
            try {
                let base64Image = null;
                if (screenshotAsset && screenshotAsset.uri) {
                    base64Image = await fileToBase64(screenshotAsset.uri);
                }

                await onSubmit({
                    transaction_number: txNumber.trim(),
                    screenshot: base64Image,
                });
                onDismiss();
            } catch (error) {
                console.error(error);
                toast.error(
                    "Failed to approve withdrawal request",
                    "Error",
                    true
                );
            } finally {
                setSubmitting(false);
            }
        } else {
            // Reject action
            if (!reason || reason.trim() === "") {
                toast.error(
                    "A mandatory comment / reason is required to reject.",
                    "Validation Error",
                    true
                );
                return;
            }

            setSubmitting(true);
            try {
                await onSubmit({
                    rejection_reason: reason.trim(),
                });
                onDismiss();
            } catch (error) {
                console.error(error);
                toast.error(
                    "Failed to reject withdrawal request",
                    "Error",
                    true
                );
            } finally {
                setSubmitting(false);
            }
        }
    };

    const isApprove = actionType === "approve";

    return (
        <Modal
            visible={Boolean(visible)}
            transparent={true}
            animationType="fade"
            onRequestClose={onDismiss}
        >
            <TouchableWithoutFeedback onPress={onDismiss}>
                <View className="flex-1 bg-black/50 justify-center items-center p-4">
                    <TouchableWithoutFeedback
                        onPress={(e) => e.stopPropagation()}
                    >
                        <View className="bg-white rounded-3xl p-5 w-[92%] max-w-[500px] max-h-[85%] shadow-2xl">
                            <ScrollView showsVerticalScrollIndicator={false}>
                                {/* Modal Title */}
                                <View className="flex-row items-center justify-between mb-4">
                                    <View className="flex-1 mr-2">
                                        <Text className="text-lg font-bold text-slate-800">
                                            {isApprove
                                                ? "Approve Cash Withdrawal"
                                                : "Reject Cash Withdrawal"}
                                        </Text>
                                        <Text className="text-xs text-slate-500">
                                            Agency:{" "}
                                            <Text className="font-bold text-slate-700">
                                                {request.agencyName}
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

                                {/* Amount Banner */}
                                <View
                                    className={`p-4 rounded-2xl mb-4 items-center ${
                                        isApprove
                                            ? "bg-emerald-50 border border-emerald-100"
                                            : "bg-red-50 border border-red-100"
                                    }`}
                                >
                                    <Text className="text-xs font-semibold text-slate-500 uppercase">
                                        Requested Amount
                                    </Text>
                                    <Text
                                        className={`text-3xl font-extrabold mt-0.5 ${
                                            isApprove
                                                ? "text-emerald-700"
                                                : "text-red-700"
                                        }`}
                                    >
                                        ₹
                                        {parseFloat(
                                            request.amount || 0
                                        ).toFixed(2)}
                                    </Text>
                                </View>

                                {isApprove ? (
                                    /* Approval Form */
                                    <View className="gap-3 mb-4">
                                        <TextInput
                                            label="Transaction ID / Reference No. *"
                                            placeholder="Enter bank/UPI reference ID"
                                            value={txNumber}
                                            onChangeText={setTxNumber}
                                            mode="outlined"
                                            activeOutlineColor="#16a34a"
                                            outlineColor="#cbd5e1"
                                            className="bg-white"
                                        />

                                        <Text className="text-xs font-semibold text-slate-600 mt-1">
                                            Payment Proof / Screenshot
                                            (Optional)
                                        </Text>

                                        {screenshotAsset ? (
                                            <View className="relative border border-slate-200 rounded-xl overflow-hidden bg-slate-100 items-center justify-center p-2">
                                                <Image
                                                    source={{
                                                        uri: screenshotAsset.uri,
                                                    }}
                                                    style={{
                                                        width: "100%",
                                                        height: 160,
                                                    }}
                                                    resizeMode="contain"
                                                    className="rounded-lg"
                                                />
                                                <Button
                                                    mode="text"
                                                    onPress={() =>
                                                        setScreenshotAsset(null)
                                                    }
                                                    textColor="#dc2626"
                                                    compact
                                                    className="mt-1"
                                                >
                                                    Remove Screenshot
                                                </Button>
                                            </View>
                                        ) : (
                                            <Button
                                                mode="outlined"
                                                icon="camera-plus"
                                                onPress={handlePickScreenshot}
                                                textColor="#ff9933"
                                                className="border-carrot-200 rounded-xl py-1"
                                            >
                                                Upload Payment Screenshot
                                            </Button>
                                        )}
                                    </View>
                                ) : (
                                    /* Rejection Form */
                                    <View className="gap-3 mb-4">
                                        <TextInput
                                            label="Rejection Comment / Reason *"
                                            placeholder="Explain why this withdrawal request is being rejected"
                                            value={reason}
                                            onChangeText={setReason}
                                            mode="outlined"
                                            multiline
                                            numberOfLines={4}
                                            activeOutlineColor="#dc2626"
                                            outlineColor="#cbd5e1"
                                            className="bg-white"
                                        />
                                    </View>
                                )}

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
                                        buttonColor={
                                            isApprove ? "#16a34a" : "#dc2626"
                                        }
                                        className="flex-1 rounded-xl py-0.5"
                                        labelStyle={{
                                            color: "white",
                                            fontWeight: "700",
                                        }}
                                    >
                                        {isApprove
                                            ? "Confirm Approval"
                                            : "Confirm Rejection"}
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
