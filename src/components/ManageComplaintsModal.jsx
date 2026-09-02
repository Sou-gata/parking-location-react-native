import React, { useState, useEffect, useCallback } from "react";
import {
    View,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    ScrollView,
    Modal,
    TouchableWithoutFeedback,
} from "react-native";
import {
    Text,
    Card,
    Button,
    TextInput,
    IconButton,
    Divider,
    Surface,
} from "react-native-paper";
import apiService from "../utils/apiService";
import useToast from "../hooks/useToast";

const STATUS_COLOR_MAP = {
    pending: { bg: "#fef3c7", text: "#92400e", border: "#fde68a" },
    under_review: { bg: "#dbeafe", text: "#1e40af", border: "#bfdbfe" },
    resolved: { bg: "#d1fae5", text: "#065f46", border: "#a7f3d0" },
    dismissed: { bg: "#f1f5f9", text: "#475569", border: "#e2e8f0" },
};

export default function ManageComplaintsModal({
    visible,
    onClose,
    isSuperAdmin = false,
}) {
    const toast = useToast();
    const [loading, setLoading] = useState(false);
    const [complaints, setComplaints] = useState([]);
    const [filterStatus, setFilterStatus] = useState("all");

    // Resolution modal state inside manager
    const [resolveModalVisible, setResolveModalVisible] = useState(false);
    const [selectedComplaint, setSelectedComplaint] = useState(null);
    const [targetStatus, setTargetStatus] = useState("resolved");
    const [resolutionNotes, setResolutionNotes] = useState("");
    const [updating, setUpdating] = useState(false);

    const fetchComplaints = useCallback(async () => {
        setLoading(true);
        try {
            const endpoint = isSuperAdmin ? "complaints/admin" : "complaints/agency";
            const res = await apiService.get(endpoint);
            if (res && res.success && Array.isArray(res.data)) {
                setComplaints(res.data);
            }
        } catch (error) {
            console.error("Error fetching complaints:", error);
            toast.error("Failed to load complaints list", "Error", true);
        } finally {
            setLoading(false);
        }
    }, [isSuperAdmin]);

    useEffect(() => {
        if (visible) {
            fetchComplaints();
        }
    }, [visible, fetchComplaints]);

    const handleOpenStatusModal = (complaint, newStatus) => {
        setSelectedComplaint(complaint);
        setTargetStatus(newStatus);
        setResolutionNotes(complaint.resolution_notes || "");
        setResolveModalVisible(true);
    };

    const handleUpdateStatus = async () => {
        if (!selectedComplaint) return;
        setUpdating(true);
        try {
            const res = await apiService.put(
                `complaints/${selectedComplaint.complaint_id}/status`,
                {
                    status: targetStatus,
                    resolutionNotes,
                }
            );
            if (res && res.success) {
                toast.success(
                    `Complaint marked as ${targetStatus.replace("_", " ")}`,
                    "Status Updated",
                    true
                );
                setComplaints((prev) =>
                    prev.map((c) =>
                        c.complaint_id === selectedComplaint.complaint_id
                            ? { ...c, status: targetStatus, resolution_notes: resolutionNotes }
                            : c
                    )
                );
                setResolveModalVisible(false);
            } else {
                toast.error(res?.message || "Failed to update status", "Error", true);
            }
        } catch (error) {
            console.error("Error updating complaint status:", error);
            const msg = error.response?.data?.message || "Failed to update complaint status";
            toast.error(msg, "Error", true);
        } finally {
            setUpdating(false);
        }
    };

    const filteredComplaints = complaints.filter((c) => {
        if (filterStatus === "all") return true;
        return c.status === filterStatus;
    });

    const renderComplaintItem = ({ item }) => {
        const statusStyle = STATUS_COLOR_MAP[item.status] || STATUS_COLOR_MAP.pending;
        const isUserComplaint = item.complainant_type === "user_to_agency";
        const dateStr = item.created_at
            ? new Date(item.created_at).toLocaleString("en-IN", {
                  dateStyle: "medium",
                  timeStyle: "short",
              })
            : "N/A";

        return (
            <Card className="mb-3 bg-white rounded-2xl border border-slate-200">
                <Card.Content className="p-3.5">
                    {/* Header: Complaint ID & Type Badge */}
                    <View className="flex-row justify-between items-center mb-2">
                        <View className="flex-row items-center gap-1.5">
                            <Surface
                                className={`px-2 py-0.5 rounded-md ${
                                    isUserComplaint ? "bg-rose-100" : "bg-indigo-100"
                                }`}
                                elevation={0}
                            >
                                <Text
                                    className={`text-[11px] font-extrabold ${
                                        isUserComplaint ? "text-rose-800" : "text-indigo-800"
                                    }`}
                                >
                                    {isUserComplaint ? "User Complaint" : "Agency Complaint"}
                                </Text>
                            </Surface>
                            <Text className="text-xs font-bold text-slate-600">
                                Booking #{item.booking?.booking_code || item.booking_id}
                            </Text>
                        </View>

                        <Surface
                            className="px-2 py-0.5 rounded-md border"
                            style={{
                                backgroundColor: statusStyle.bg,
                                borderColor: statusStyle.border,
                            }}
                            elevation={0}
                        >
                            <Text
                                className="text-[10px] font-extrabold"
                                style={{ color: statusStyle.text }}
                            >
                                {item.status?.replace("_", " ").toUpperCase()}
                            </Text>
                        </Surface>
                    </View>

                    {/* Parties info */}
                    <View className="my-1">
                        <Text className="text-xs text-slate-600 mb-0.5">
                            <Text className="font-bold text-slate-800">User: </Text>
                            {item.user?.full_name || item.booking?.user_name || "N/A"}{" "}
                            {item.user?.phone_number ? `(${item.user.phone_number})` : ""}
                        </Text>
                        <Text className="text-xs text-slate-600 mb-0.5">
                            <Text className="font-bold text-slate-800">Agency: </Text>
                            {item.agency?.org_name || item.booking?.agency_name || "N/A"}
                        </Text>
                        <Text className="text-xs text-slate-600 mb-0.5">
                            <Text className="font-bold text-slate-800">Date: </Text>
                            {dateStr}
                        </Text>
                    </View>

                    <Divider className="my-2 bg-slate-100" />

                    {/* Subject & Description */}
                    {Boolean(item.subject) && (
                        <Text className="text-sm font-bold text-slate-900 mb-1">
                            {item.subject}
                        </Text>
                    )}
                    <Text className="text-xs text-slate-700 leading-4">
                        {item.description}
                    </Text>

                    {/* Resolution Notes if present */}
                    {Boolean(item.resolution_notes) && (
                        <View className="mt-2.5 bg-emerald-50 p-2 rounded-lg border border-emerald-200">
                            <Text className="text-[11px] font-bold text-emerald-800">
                                Resolution Notes:
                            </Text>
                            <Text className="text-xs text-emerald-700 mt-0.5">
                                {item.resolution_notes}
                            </Text>
                        </View>
                    )}

                    {/* Action buttons for admin */}
                    <View className="flex-row gap-2 mt-3 justify-end">
                        {item.status !== "under_review" && (
                            <Button
                                mode="outlined"
                                compact
                                className="rounded-lg"
                                textColor="#1e40af"
                                onPress={() => handleOpenStatusModal(item, "under_review")}
                            >
                                Review
                            </Button>
                        )}
                        {item.status !== "resolved" && (
                            <Button
                                mode="contained"
                                compact
                                className="rounded-lg bg-emerald-600"
                                onPress={() => handleOpenStatusModal(item, "resolved")}
                            >
                                Resolve
                            </Button>
                        )}
                        {item.status !== "dismissed" && (
                            <Button
                                mode="outlined"
                                compact
                                className="rounded-lg"
                                textColor="#475569"
                                onPress={() => handleOpenStatusModal(item, "dismissed")}
                            >
                                Dismiss
                            </Button>
                        )}
                    </View>
                </Card.Content>
            </Card>
        );
    };

    return (
        <Modal
            visible={Boolean(visible)}
            transparent={true}
            animationType="fade"
            onRequestClose={onClose}
        >
            <TouchableWithoutFeedback onPress={onClose}>
                <View className="flex-1 bg-black/50 justify-center items-center p-4">
                    <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
                        <View className="bg-white rounded-3xl p-5 w-[92%] max-w-[550px] max-h-[85%] shadow-2xl">
                {/* Header Row - Fixes title & close button overlap */}
                <View className="flex-row items-start justify-between mb-2">
                    <View className="flex-1 pr-2">
                        <Text className="text-xl font-bold text-slate-800">
                            {isSuperAdmin ? "All Complaints" : "Agency Complaints"}
                        </Text>
                        <Text className="text-xs text-slate-500 mt-0.5">
                            Manage user and agency filed complaints
                        </Text>
                    </View>
                    <IconButton
                        icon="close"
                        size={22}
                        onPress={onClose}
                        style={{ margin: 0 }}
                    />
                </View>

                {/* Filter Tabs */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    className="my-2.5 max-h-10"
                >
                    {["all", "pending", "under_review", "resolved", "dismissed"].map(
                        (st) => (
                            <TouchableOpacity
                                key={st}
                                onPress={() => setFilterStatus(st)}
                                className={`px-3.5 py-1.5 rounded-full mr-2 justify-center ${
                                    filterStatus === st ? "bg-indigo-700" : "bg-slate-100"
                                }`}
                            >
                                <Text
                                    className={`text-xs font-bold ${
                                        filterStatus === st ? "text-white" : "text-slate-600"
                                    }`}
                                >
                                    {(st.replace("_", " ") || "").toUpperCase()}
                                </Text>
                            </TouchableOpacity>
                        )
                    )}
                </ScrollView>

                {/* Content List */}
                {loading ? (
                    <View className="py-10 items-center">
                        <ActivityIndicator size="large" color="#4338ca" />
                        <Text className="mt-3 color-slate-500 font-semibold text-xs">
                            Loading complaints...
                        </Text>
                    </View>
                ) : (
                    <FlatList
                        data={filteredComplaints}
                        keyExtractor={(item) => String(item.complaint_id)}
                        renderItem={renderComplaintItem}
                        contentContainerStyle={{ paddingBottom: 20 }}
                        ListEmptyComponent={
                            <View className="py-10 items-center">
                                <Text className="text-base font-bold text-slate-600">
                                    No Complaints Found
                                </Text>
                                <Text className="text-xs text-slate-400 text-center mt-1">
                                    There are no complaints matching the selected filter.
                                </Text>
                            </View>
                        }
                    />
                )}

                {/* Resolution Status Sub-Modal */}
                {Boolean(resolveModalVisible) && (
                    <Modal
                        visible={Boolean(resolveModalVisible)}
                        transparent={true}
                        animationType="fade"
                        onRequestClose={() => setResolveModalVisible(false)}
                    >
                        <TouchableWithoutFeedback onPress={() => setResolveModalVisible(false)}>
                            <View className="flex-1 bg-black/50 justify-center items-center p-4">
                                <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
                                    <View className="bg-white rounded-3xl p-5 w-[92%] max-w-[450px] shadow-2xl">
                                        <Text className="text-base font-bold text-slate-800 mb-3">
                                            Update Status to {(targetStatus.replace("_", " ") || "").toUpperCase()}
                                        </Text>

                                        <TextInput
                                            label="Resolution Notes / Remarks"
                                            value={resolutionNotes}
                                            onChangeText={setResolutionNotes}
                                            mode="outlined"
                                            multiline
                                            numberOfLines={3}
                                            outlineColor="#cbd5e1"
                                            activeOutlineColor="#4338ca"
                                            className="mb-4 bg-slate-50"
                                            placeholder="Enter details regarding status update or resolution..."
                                        />

                                        <View className="flex-row gap-2">
                                            <Button
                                                mode="outlined"
                                                onPress={() => setResolveModalVisible(false)}
                                                className="flex-1 rounded-xl"
                                                disabled={updating}
                                            >
                                                Cancel
                                            </Button>
                                            <Button
                                                mode="contained"
                                                onPress={handleUpdateStatus}
                                                className="flex-1 rounded-xl bg-indigo-700"
                                                loading={updating}
                                                disabled={updating}
                                            >
                                                Confirm
                                            </Button>
                                        </View>
                                    </View>
                                </TouchableWithoutFeedback>
                            </View>
                        </TouchableWithoutFeedback>
                    </Modal>
                )}
                        </View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
}
