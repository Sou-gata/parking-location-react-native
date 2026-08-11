import React, { useState } from "react";
import { View, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { Text, Surface, Portal, Modal, TextInput, Button } from "react-native-paper";
import { MaterialDesignIcons } from "@react-native-vector-icons/material-design-icons";
import useToast from "../../hooks/useToast";
import apiService from "../../utils/apiService";
import Chip from "../Chip";

const formatTime12h = (time24) => {
    if (!time24) return "";
    const [hStr, mStr] = time24.split(":");
    let h = parseInt(hStr, 10);
    const m = mStr || "00";
    if (isNaN(h)) return time24;
    const ampm = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;
    const hFormatted = String(h).padStart(2, "0");
    return `${hFormatted}:${m} ${ampm}`;
};

export default function WorkingHoursApprovalModal({
    visible,
    request,
    onClose,
    onRefresh,
}) {
    const toast = useToast();
    const [submitting, setSubmitting] = useState(false);
    const [rejectionReason, setRejectionReason] = useState("");
    const [showRejectInput, setShowRejectInput] = useState(false);

    if (!request) return null;

    const handleApprove = async () => {
        setSubmitting(true);
        try {
            const res = await apiService.post(
                `working-hours/agency/${request.orgId}/approve`
            );
            if (res && res.success) {
                toast.success(
                    `Approved working hours update for ${request.orgName || "Agency"}!`,
                    "Approved",
                    true
                );
                onClose();
                if (onRefresh) onRefresh();
            } else {
                toast.error(res?.message || "Failed to approve request", "Error", true);
            }
        } catch (error) {
            console.error("Error approving working hours:", error);
            toast.error("Failed to approve working hours via API", "Error", true);
        } finally {
            setSubmitting(false);
        }
    };

    const handleReject = async () => {
        setSubmitting(true);
        try {
            const res = await apiService.post(
                `working-hours/agency/${request.orgId}/reject`,
                { rejectionReason }
            );
            if (res && res.success) {
                toast.success(
                    `Rejected working hours update for ${request.orgName || "Agency"}.`,
                    "Rejected",
                    true
                );
                setShowRejectInput(false);
                setRejectionReason("");
                onClose();
                if (onRefresh) onRefresh();
            } else {
                toast.error(res?.message || "Failed to reject request", "Error", true);
            }
        } catch (error) {
            console.error("Error rejecting working hours:", error);
            toast.error("Failed to reject working hours via API", "Error", true);
        } finally {
            setSubmitting(false);
        }
    };

    const proposedDays = request.pendingWorkingDays || [];
    const currentDays = request.workingDays || [];
    const proposedVacations = request.pendingSpecialVacations || [];
    const currentVacations = request.specialVacations || [];
    const proposedDaily = request.pendingDailySchedules || request.dailySchedules;
    const DAYS_ORDER = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

    return (
        <Portal>
            <Modal
                visible={visible}
                onDismiss={onClose}
                contentContainerStyle={{
                    backgroundColor: "white",
                    padding: 20,
                    margin: 20,
                    borderRadius: 24,
                    maxHeight: "85%",
                }}
            >
                <ScrollView showsVerticalScrollIndicator={false}>
                    {/* Header */}
                    <View className="flex-row justify-between items-center mb-3">
                        <View className="flex-1 mr-2">
                            <Text className="text-slate-800 text-lg font-bold">
                                Working Hours Request
                            </Text>
                            <Text className="text-indigo-700 text-xs font-bold mt-0.5">
                                {request.orgName || "Agency"} ({request.orgOwner || "Owner"})
                            </Text>
                        </View>
                        <TouchableOpacity onPress={onClose} className="p-1 rounded-full bg-slate-100">
                            <MaterialDesignIcons name="close" size={20} color="#475569" />
                        </TouchableOpacity>
                    </View>

                    {/* Proposed Daily Schedule */}
                    <Surface elevation={1} className="bg-slate-50 rounded-2xl p-3.5 mb-3 border border-slate-200">
                        <Text className="text-slate-700 font-bold text-xs uppercase tracking-wider mb-2">
                            Proposed Daily Schedule
                        </Text>
                        {proposedDaily ? (
                            DAYS_ORDER.map((day) => {
                                const s = proposedDaily[day];
                                if (!s) return null;
                                return (
                                    <View key={day} className="flex-row items-center justify-between py-1 border-b border-slate-200/60">
                                        <Text className="text-slate-800 font-bold text-xs w-24">{day}</Text>
                                        <Text className={`text-xs font-semibold ${s.isOpen ? "text-indigo-700" : "text-rose-600"}`}>
                                            {!s.isOpen ? "Closed" : s.is247 ? "Open 24/7" : `${formatTime12h(s.openTime || "08:00")} - ${formatTime12h(s.closeTime || "20:00")}`}
                                        </Text>
                                    </View>
                                );
                            })
                        ) : (
                            <View className="flex-row flex-wrap mb-1">
                                {proposedDays.map((d) => (
                                    <View key={d} className="bg-indigo-100 px-2.5 py-1 rounded-lg mr-1.5 mb-1.5 border border-indigo-200">
                                        <Text className="text-indigo-900 font-bold text-xs">{d}</Text>
                                    </View>
                                ))}
                            </View>
                        )}
                        <Text className="text-slate-400 text-[10px] mt-2">
                            Active Days: {currentDays.join(", ")}
                        </Text>
                    </Surface>

                    {/* Proposed Opening / Closing Hours */}
                    <Surface elevation={1} className="bg-slate-50 rounded-2xl p-3.5 mb-3 border border-slate-200">
                        <Text className="text-slate-700 font-bold text-xs uppercase tracking-wider mb-2">
                            Proposed Hours Policy
                        </Text>

                        {request.pendingIs247 ? (
                            <View className="bg-emerald-100 p-2.5 rounded-xl border border-emerald-200 flex-row items-center">
                                <MaterialDesignIcons name="clock-outline" size={18} color="#047857" />
                                <Text className="text-emerald-900 font-bold text-xs ml-2">
                                    Requesting 24/7 Continuous Operation
                                </Text>
                            </View>
                        ) : (
                            <View className="flex-row justify-between">
                                <View className="flex-1 bg-white p-2.5 rounded-xl border border-slate-200 mr-1.5">
                                    <Text className="text-slate-400 text-[10px] font-bold">PROPOSED OPEN</Text>
                                    <Text className="text-slate-900 font-extrabold text-sm mt-0.5">
                                        {request.pendingOpenTime || "08:00"}
                                    </Text>
                                </View>
                                <View className="flex-1 bg-white p-2.5 rounded-xl border border-slate-200 ml-1.5">
                                    <Text className="text-slate-400 text-[10px] font-bold">PROPOSED CLOSE</Text>
                                    <Text className="text-slate-900 font-extrabold text-sm mt-0.5">
                                        {request.pendingCloseTime || "20:00"}
                                    </Text>
                                </View>
                            </View>
                        )}
                        <Text className="text-slate-400 text-[10px] mt-2">
                            Current Active: {request.is247 ? "24/7" : `${request.openTime || "08:00"} to ${request.closeTime || "20:00"}`}
                        </Text>
                    </Surface>

                    {/* Proposed Special Vacations */}
                    <Surface elevation={1} className="bg-slate-50 rounded-2xl p-3.5 mb-4 border border-slate-200">
                        <Text className="text-slate-700 font-bold text-xs uppercase tracking-wider mb-2">
                            Proposed Special Vacations ({proposedVacations.length})
                        </Text>
                        {proposedVacations.length > 0 ? (
                            proposedVacations.map((v) => (
                                <View key={v.id || v.title} className="bg-white p-2.5 rounded-xl border border-slate-200 mb-1.5 flex-row items-center justify-between">
                                    <View>
                                        <Text className="font-bold text-xs text-slate-800">{v.title}</Text>
                                        <Text className="text-[11px] text-slate-500 mt-0.5">{v.startDate} to {v.endDate}</Text>
                                    </View>
                                    <MaterialDesignIcons name="beach" size={18} color="#d97706" />
                                </View>
                            ))
                        ) : (
                            <Text className="text-slate-400 text-xs italic">No special vacations listed in request.</Text>
                        )}
                    </Surface>

                    {/* Rejection input field */}
                    {showRejectInput && (
                        <TextInput
                            label="Reason for Rejection (Optional)"
                            value={rejectionReason}
                            onChangeText={setRejectionReason}
                            mode="outlined"
                            multiline
                            numberOfLines={2}
                            outlineColor="#cbd5e1"
                            activeOutlineColor="#e11d48"
                            className="mb-3 bg-white"
                        />
                    )}

                    {/* Actions */}
                    <View className="flex-row justify-end items-center mt-2">
                        {!showRejectInput ? (
                            <>
                                <TouchableOpacity
                                    className="bg-rose-100 px-4 py-2.5 rounded-xl border border-rose-200 mr-2"
                                    onPress={() => setShowRejectInput(true)}
                                    disabled={submitting}
                                >
                                    <Text className="text-rose-800 font-bold text-xs">Reject</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    className="bg-emerald-600 px-5 py-2.5 rounded-xl flex-row items-center"
                                    onPress={handleApprove}
                                    disabled={submitting}
                                >
                                    {submitting ? (
                                        <ActivityIndicator size="small" color="#ffffff" />
                                    ) : (
                                        <>
                                            <MaterialDesignIcons name="check-bold" size={16} color="#ffffff" />
                                            <Text className="text-white font-bold text-xs ml-1">Approve</Text>
                                        </>
                                    )}
                                </TouchableOpacity>
                            </>
                        ) : (
                            <>
                                <TouchableOpacity
                                    className="bg-slate-200 px-4 py-2.5 rounded-xl mr-2"
                                    onPress={() => setShowRejectInput(false)}
                                    disabled={submitting}
                                >
                                    <Text className="text-slate-700 font-bold text-xs">Cancel</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    className="bg-rose-600 px-5 py-2.5 rounded-xl flex-row items-center"
                                    onPress={handleReject}
                                    disabled={submitting}
                                >
                                    {submitting ? (
                                        <ActivityIndicator size="small" color="#ffffff" />
                                    ) : (
                                        <Text className="text-white font-bold text-xs">Confirm Rejection</Text>
                                    )}
                                </TouchableOpacity>
                            </>
                        )}
                    </View>
                </ScrollView>
            </Modal>
        </Portal>
    );
}
