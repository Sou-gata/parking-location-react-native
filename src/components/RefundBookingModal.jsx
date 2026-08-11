import React, { useState, useEffect } from "react";
import { View } from "react-native";
import {
    Text,
    Modal,
    Portal,
    TextInput,
    Button,
    IconButton,
    Surface,
} from "react-native-paper";
import apiService from "../utils/apiService";
import useToast from "../hooks/useToast";

export default function RefundBookingModal({
    visible,
    onClose,
    booking,
    onRefundSuccess,
}) {
    const toast = useToast();
    const [refundAmount, setRefundAmount] = useState("");
    const [reason, setReason] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const totalBillAmt = booking ? parseFloat(booking.totalBill || booking.total_bill || 0) : 0;
    const isPaidBooking = booking ? (booking.paymentStatus === "paid" || booking.payment_status === "paid") : false;
    const hasDeductedMoney = totalBillAmt > 0 || isPaidBooking;

    useEffect(() => {
        if (visible && booking) {
            const defaultAmt = totalBillAmt > 0 ? totalBillAmt : 0;
            setRefundAmount(defaultAmt > 0 ? String(defaultAmt.toFixed(2)) : "0.00");
            setReason("");
            setError("");
        }
    }, [visible, booking, totalBillAmt]);

    if (!booking) return null;

    const bookingCode = booking.bookingCode || booking.booking_code || booking.id;
    const userName = booking.userName || booking.user_name || booking.user?.full_name || "Customer";
    const userPhone = booking.userPhone || booking.user_phone || booking.user?.phone_number || "";
    const vehicleNo = booking.vehicleNumber || booking.vehicle_number || "N/A";
    const statusStr = (booking.status || "booked").toUpperCase();

    const handleConfirmRefund = async () => {
        if (!hasDeductedMoney) {
            setError("Refund cannot be issued because no money was deducted from the user for this booking.");
            return;
        }

        const amt = parseFloat(refundAmount);
        if (isNaN(amt) || amt <= 0) {
            setError("Please enter a valid refund amount greater than 0.");
            return;
        }

        setError("");
        setLoading(true);

        try {
            const res = await apiService.post("bookings/refund", {
                bookingId: booking.id || booking.booking_id,
                bookingCode,
                refundAmount: amt,
                refundReason: reason.trim() || `Refund issued for booking #${bookingCode}`,
            });

            if (res && res.success) {
                toast.success(
                    `Successfully refunded ₹${amt.toFixed(2)} to customer's wallet`,
                    "Refund Processed",
                    true
                );
                if (onRefundSuccess) {
                    onRefundSuccess(res.data);
                }
                onClose();
            } else {
                toast.error(res?.message || "Failed to process refund", "Error", true);
            }
        } catch (err) {
            console.error("Error issuing refund:", err);
            const msg = err.response?.data?.message || "Failed to process refund";
            toast.error(msg, "Error", true);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Portal>
            <Modal
                visible={visible}
                onDismiss={onClose}
                contentContainerStyle={{
                    backgroundColor: "white",
                    marginHorizontal: 16,
                    borderRadius: 24,
                    padding: 20,
                    elevation: 6,
                }}
            >
                {/* Header */}
                <View className="flex-row items-start justify-between mb-3">
                    <View className="flex-1 pr-2">
                        <View className="flex-row items-center gap-1.5">
                            <IconButton
                                icon="cash-refund"
                                iconColor="#059669"
                                size={24}
                                style={{ margin: 0 }}
                            />
                            <Text className="text-lg font-bold text-slate-800">
                                Refund Customer
                            </Text>
                        </View>
                        <Text className="text-xs text-slate-500 mt-0.5 ml-1">
                            Credit money back to customer's app wallet
                        </Text>
                    </View>
                    <IconButton
                        icon="close"
                        size={22}
                        onPress={onClose}
                        style={{ margin: 0 }}
                    />
                </View>

                {/* Booking Summary Box */}
                <Surface className="bg-slate-50 p-3 rounded-2xl border border-slate-100 mb-3 gap-1" elevation={0}>
                    <View className="flex-row justify-between items-center">
                        <Text className="text-xs font-mono font-bold text-indigo-700">
                            Booking #{bookingCode}
                        </Text>
                        <View className="px-2 py-0.5 rounded bg-slate-200">
                            <Text className="text-[10px] font-extrabold text-slate-700">
                                {statusStr}
                            </Text>
                        </View>
                    </View>

                    <Text className="text-xs text-slate-700">
                        <Text className="font-bold text-slate-900">Customer: </Text>
                        {userName} {userPhone ? `(${userPhone})` : ""}
                    </Text>

                    <Text className="text-xs text-slate-700">
                        <Text className="font-bold text-slate-900">Vehicle: </Text>
                        {vehicleNo}
                    </Text>

                    <Text className="text-xs text-slate-700">
                        <Text className="font-bold text-slate-900">Deducted Amount: </Text>
                        ₹{totalBillAmt.toFixed(2)}
                    </Text>
                </Surface>

                {!hasDeductedMoney ? (
                    <View className="bg-amber-50 p-3 rounded-xl border border-amber-200 mb-4">
                        <Text className="text-xs font-semibold text-amber-900 leading-4">
                            ⚠️ Refund cannot be issued because no money was deducted from the customer's account for this booking.
                        </Text>
                    </View>
                ) : (
                    <>
                        {/* Refund Amount Input */}
                        <TextInput
                            label="Refund Amount (₹) *"
                            value={refundAmount}
                            onChangeText={(val) => {
                                setRefundAmount(val);
                                if (error) setError("");
                            }}
                            keyboardType="numeric"
                            mode="outlined"
                            outlineColor={error ? "#ef4444" : "#cbd5e1"}
                            activeOutlineColor="#059669"
                            className="bg-slate-50 mb-3"
                            placeholder="Enter amount to refund"
                        />

                        {/* Refund Reason Input */}
                        <TextInput
                            label="Reason for Refund (Optional)"
                            value={reason}
                            onChangeText={setReason}
                            mode="outlined"
                            multiline
                            numberOfLines={2}
                            maxLength={300}
                            outlineColor="#cbd5e1"
                            activeOutlineColor="#059669"
                            className="bg-slate-50 mb-2"
                            placeholder="e.g. Service disruption, cancellation refund"
                        />

                        {Boolean(error) && (
                            <Text className="text-xs font-semibold text-rose-500 mb-2">
                                {error}
                            </Text>
                        )}

                        {/* Info Note */}
                        <View className="bg-emerald-50 p-2.5 rounded-xl border border-emerald-100 mb-4">
                            <Text className="text-xs text-emerald-800 leading-4">
                                ℹ Money will be credited to the customer's wallet and non-checked-in bookings will be cancelled.
                            </Text>
                        </View>
                    </>
                )}

                {/* Action Buttons */}
                <View className="flex-row gap-3">
                    <Button
                        mode="outlined"
                        onPress={onClose}
                        textColor="#64748b"
                        style={{ borderColor: "#cbd5e1" }}
                        className="flex-1 rounded-xl"
                        disabled={loading}
                    >
                        Cancel
                    </Button>
                    <Button
                        mode="contained"
                        onPress={handleConfirmRefund}
                        buttonColor="#059669"
                        className="flex-1 rounded-xl"
                        loading={loading}
                        disabled={loading || !hasDeductedMoney}
                        labelStyle={{ fontWeight: "700" }}
                    >
                        Issue Refund
                    </Button>
                </View>
            </Modal>
        </Portal>
    );
}
