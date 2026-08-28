import React, { useState, useEffect, useCallback } from "react";
import {
    View,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    ScrollView,
    RefreshControl,
} from "react-native";
import {
    Text,
    Button,
    TextInput,
    Divider,
    Surface,
    Portal,
    Modal,
} from "react-native-paper";
import { MaterialDesignIcons } from "@react-native-vector-icons/material-design-icons";
import apiService from "../utils/apiService";
import useToast from "../hooks/useToast";
import useRolePermissions from "../hooks/useRolePermissions";
import { PERMISSIONS } from "../utils/rbacConfig";
import RefundBookingModal from "../components/RefundBookingModal";
import ComplaintTimelineModal from "../components/ComplaintTimelineModal";
import SuperAdminRegisterComplaintModal from "../components/SuperAdminRegisterComplaintModal";

const STATUS_COLOR_MAP = {
    pending: { bg: "#fef3c7", text: "#92400e", border: "#fde68a" },
    under_review: { bg: "#dbeafe", text: "#1e40af", border: "#bfdbfe" },
    resolved: { bg: "#d1fae5", text: "#065f46", border: "#a7f3d0" },
    dismissed: { bg: "#f1f5f9", text: "#475569", border: "#e2e8f0" },
};

export default function ManageComplaints({ navigation, route }) {
    const toast = useToast();
    const { hasPermission } = useRolePermissions();
    const isSuperAdmin = hasPermission(PERMISSIONS.MANAGE_AGENCIES);

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [complaints, setComplaints] = useState([]);
    const [filterStatus, setFilterStatus] = useState("all");
    const [searchQuery, setSearchQuery] = useState("");

    // Register Complaint Modal state
    const [registerModalVisible, setRegisterModalVisible] = useState(false);
    const [registerTargetType, setRegisterTargetType] = useState("user");
    const [registerTargetId, setRegisterTargetId] = useState(null);
    const [registerTargetName, setRegisterTargetName] = useState("");

    // Refund Modal State
    const [refundModalVisible, setRefundModalVisible] = useState(false);
    const [selectedBookingForRefund, setSelectedBookingForRefund] =
        useState(null);

    // Status update modal state
    const [resolveModalVisible, setResolveModalVisible] = useState(false);
    const [selectedComplaint, setSelectedComplaint] = useState(null);
    const [targetStatus, setTargetStatus] = useState("resolved");
    const [resolutionNotes, setResolutionNotes] = useState("");
    const [updating, setUpdating] = useState(false);

    // Complaint Timeline Modal state
    const [timelineModalVisible, setTimelineModalVisible] = useState(false);
    const [activeComplaintForTimeline, setActiveComplaintForTimeline] =
        useState(null);

    const handleOpenTimeline = (complaint) => {
        setActiveComplaintForTimeline(complaint);
        setTimelineModalVisible(true);
    };

    const handleComplaintUpdatedInTimeline = (updated) => {
        setComplaints((prev) =>
            prev.map((c) =>
                c.complaint_id === updated.complaint_id ? updated : c
            )
        );
    };

    const fetchComplaints = useCallback(async () => {
        try {
            const endpoint = isSuperAdmin
                ? "complaints/admin"
                : "complaints/agency";
            const res = await apiService.get(endpoint);
            if (res && res.success && Array.isArray(res.data)) {
                setComplaints(res.data);
            }
        } catch (error) {
            console.error("Error fetching complaints:", error);
            toast.error("Failed to load complaints list", "Error", true);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [isSuperAdmin]);

    useEffect(() => {
        fetchComplaints();
    }, [fetchComplaints]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchComplaints();
    };

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
                            ? {
                                  ...c,
                                  status: targetStatus,
                                  resolution_notes: resolutionNotes,
                              }
                            : c
                    )
                );
                setResolveModalVisible(false);
            } else {
                toast.error(
                    res?.message || "Failed to update status",
                    "Error",
                    true
                );
            }
        } catch (error) {
            console.error("Error updating complaint status:", error);
            const msg =
                error.response?.data?.message ||
                "Failed to update complaint status";
            toast.error(msg, "Error", true);
        } finally {
            setUpdating(false);
        }
    };

    const filteredComplaints = complaints.filter((c) => {
        const matchesStatus =
            filterStatus === "all" ? true : c.status === filterStatus;
        if (!matchesStatus) return false;

        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase().trim();
        const code = c.booking?.booking_code?.toLowerCase() || "";
        const uName =
            c.user?.full_name?.toLowerCase() ||
            c.booking?.user_name?.toLowerCase() ||
            "";
        const aName =
            c.agency?.org_name?.toLowerCase() ||
            c.booking?.agency_name?.toLowerCase() ||
            "";
        const subj = c.subject?.toLowerCase() || "";
        const desc = c.description?.toLowerCase() || "";

        return (
            code.includes(q) ||
            uName.includes(q) ||
            aName.includes(q) ||
            subj.includes(q) ||
            desc.includes(q)
        );
    });

    const renderComplaintCard = ({ item }) => {
        const statusStyle =
            STATUS_COLOR_MAP[item.status] || STATUS_COLOR_MAP.pending;
        
        let typeBadgeConfig = {
            label: "User Complaint",
            bg: "bg-rose-100",
            text: "text-rose-800",
        };
        if (item.complainant_type === "agency_to_user") {
            typeBadgeConfig = {
                label: "Agency Complaint",
                bg: "bg-indigo-100",
                text: "text-indigo-800",
            };
        } else if (item.complainant_type === "admin_to_user") {
            typeBadgeConfig = {
                label: "Admin → User",
                bg: "bg-amber-100",
                text: "text-amber-800",
            };
        } else if (item.complainant_type === "admin_to_agency") {
            typeBadgeConfig = {
                label: "Admin → Agency",
                bg: "bg-purple-100",
                text: "text-purple-800",
            };
        }

        const dateStr = item.created_at
            ? new Date(item.created_at).toLocaleString("en-IN", {
                  dateStyle: "medium",
                  timeStyle: "short",
              })
            : "N/A";

        const bookingLabel = item.booking?.booking_code
            ? `#${item.booking.booking_code}`
            : item.booking_id
            ? `Booking #${item.booking_id}`
            : "Direct Complaint";

        return (
            <Surface
                className="mb-4 bg-white rounded-2xl p-4 border border-slate-100"
                elevation={1}
            >
                {/* Header: Complaint ID & Type Badge */}
                <View className="flex-row justify-between items-center mb-2.5">
                    <View className="flex-row items-center gap-2">
                        <View
                            className={`px-2.5 py-1 rounded-lg ${typeBadgeConfig.bg}`}
                        >
                            <Text
                                className={`text-[11px] font-extrabold ${typeBadgeConfig.text}`}
                            >
                                {typeBadgeConfig.label}
                            </Text>
                        </View>
                        <Text className="text-xs font-mono font-bold text-slate-700">
                            {bookingLabel}
                        </Text>
                    </View>

                    <View
                        className="px-2.5 py-1 rounded-lg border"
                        style={{
                            backgroundColor: statusStyle.bg,
                            borderColor: statusStyle.border,
                        }}
                    >
                        <Text
                            className="text-[10px] font-extrabold"
                            style={{ color: statusStyle.text }}
                        >
                            {item.status?.replace("_", " ").toUpperCase()}
                        </Text>
                    </View>
                </View>

                {/* Details Meta Box */}
                <View className="bg-slate-50 p-3 rounded-xl mb-3 gap-1">
                    <Text className="text-xs text-slate-600">
                        <Text className="font-bold text-slate-800">
                            Customer:{" "}
                        </Text>
                        {item.user?.full_name ||
                            item.booking?.user_name ||
                            "N/A"}{" "}
                        {item.user?.phone_number
                            ? `(${item.user.phone_number})`
                            : ""}
                    </Text>
                    <Text className="text-xs text-slate-600">
                        <Text className="font-bold text-slate-800">
                            Agency:{" "}
                        </Text>
                        {item.agency?.org_name ||
                            item.booking?.agency_name ||
                            "N/A"}
                    </Text>
                    <Text className="text-xs text-slate-600">
                        <Text className="font-bold text-slate-800">
                            Submitted At:{" "}
                        </Text>
                        {dateStr}
                    </Text>
                </View>

                {/* Subject & Description */}
                {Boolean(item.subject) && (
                    <Text className="text-sm font-bold text-slate-900 mb-1">
                        {item.subject}
                    </Text>
                )}
                <Text className="text-xs text-slate-700 leading-5 mb-2">
                    {item.description}
                </Text>

                {/* Resolution Notes if present */}
                {Boolean(item.resolution_notes) && (
                    <View className="mt-2 bg-emerald-50 p-3 rounded-xl border border-emerald-200 mb-2">
                        <Text className="text-xs font-bold text-emerald-800">
                            Resolution Notes:
                        </Text>
                        <Text className="text-xs text-emerald-700 mt-0.5 leading-4">
                            {item.resolution_notes}
                        </Text>
                    </View>
                )}

                <Divider className="my-3 bg-slate-100" />

                {/* Action buttons for admin */}
                <View className="flex-row gap-2 justify-end items-center flex-wrap">
                    {Boolean(item.booking) &&
                        (() => {
                            const b = item.booking;
                            const isRefunded =
                                b.paymentStatus === "refunded" ||
                                parseFloat(b.refundAmount || 0) > 0;
                            const hasDeduction =
                                parseFloat(b.totalBill || b.total_bill || 0) >
                                    0 || b.paymentStatus === "paid";

                            if (isRefunded) {
                                return (
                                    <View className="px-2.5 py-1 rounded-lg bg-emerald-100 border border-emerald-200">
                                        <Text className="text-[11px] font-extrabold text-emerald-800">
                                            ✓ Refunded (₹
                                            {parseFloat(
                                                b.refundAmount ||
                                                    b.totalBill ||
                                                    0
                                            ).toFixed(2)}
                                            )
                                        </Text>
                                    </View>
                                );
                            }

                            if (hasDeduction) {
                                return (
                                    <Button
                                        mode="contained-tonal"
                                        compact
                                        className="rounded-lg bg-rose-100"
                                        textColor="#991b1b"
                                        icon="cash-refund"
                                        onPress={() => {
                                            setSelectedBookingForRefund(b);
                                            setRefundModalVisible(true);
                                        }}
                                    >
                                        Refund Money
                                    </Button>
                                );
                            }

                            return null;
                        })()}

                    <Button
                        mode="contained-tonal"
                        compact
                        icon="timeline-text-outline"
                        className="rounded-lg bg-indigo-50"
                        textColor="#4338ca"
                        onPress={() => handleOpenTimeline(item)}
                    >{String("                         Timeline (" + (item.steps?.length || 1) + ")                     ")}</Button>
                    {item.status !== "under_review" && (
                        <Button
                            mode="outlined"
                            compact
                            className="rounded-lg border-indigo-200"
                            textColor="#1e40af"
                            onPress={() =>
                                handleOpenStatusModal(item, "under_review")
                            }
                        >
                            Review
                        </Button>
                    )}
                    {item.status !== "resolved" && (
                        <Button
                            mode="contained"
                            compact
                            className="rounded-lg bg-emerald-600"
                            onPress={() =>
                                handleOpenStatusModal(item, "resolved")
                            }
                        >
                            Resolve
                        </Button>
                    )}
                    {item.status !== "dismissed" && (
                        <Button
                            mode="outlined"
                            compact
                            className="rounded-lg border-slate-300"
                            textColor="#475569"
                            onPress={() =>
                                handleOpenStatusModal(item, "dismissed")
                            }
                        >
                            Dismiss
                        </Button>
                    )}
                </View>
            </Surface>
        );
    };

    return (
        <View className="flex-1 bg-slate-50 p-4">
            {Boolean(isSuperAdmin) && (
                <View className="mb-3 flex-row justify-between items-center bg-white p-3 rounded-2xl border border-slate-200">
                    <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 14, fontWeight: "700", color: "#1e293b" }}>
                            Complaints Management
                        </Text>
                        <Text style={{ fontSize: 12, color: "#64748b" }}>
                            Lodge complaints against users or agency owners
                        </Text>
                    </View>
                    <Button
                        mode="contained"
                        buttonColor="#dc2626"
                        icon={() => (
                            <MaterialDesignIcons
                                name="plus-circle"
                                size={18}
                                color="#ffffff"
                            />
                        )}
                        onPress={() => {
                            setRegisterTargetType("user");
                            setRegisterTargetId(null);
                            setRegisterTargetName("");
                            setRegisterModalVisible(true);
                        }}
                    >
                        Register Complaint
                    </Button>
                </View>
            )}

            {/* Search Input */}
            <TextInput
                label="Search Complaints (Code, Customer, Subject...)"
                value={searchQuery}
                onChangeText={setSearchQuery}
                mode="outlined"
                dense
                outlineColor="#e2e8f0"
                activeOutlineColor="#4338ca"
                className="bg-white mb-3"
                right={
                    searchQuery ? (
                        <TextInput.Icon
                            icon="close-circle"
                            onPress={() => setSearchQuery("")}
                        />
                    ) : (
                        <TextInput.Icon icon="magnify" />
                    )
                }
            />

            {/* Filter Tabs */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                className="mb-3 max-h-10"
            >
                {[
                    "all",
                    "pending",
                    "under_review",
                    "resolved",
                    "dismissed",
                ].map((st) => (
                    <TouchableOpacity
                        key={st}
                        onPress={() => setFilterStatus(st)}
                        className={`px-4 py-2 rounded-full mr-2 justify-center ${
                            filterStatus === st
                                ? "bg-indigo-700"
                                : "bg-white border border-slate-200"
                        }`}
                    >
                        <Text
                            className={`text-xs font-bold ${
                                filterStatus === st
                                    ? "text-white"
                                    : "text-slate-600"
                            }`}
                        >
                            {(st.replace("_", " ") || "").toUpperCase()}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            {/* Content List */}
            {loading && !refreshing ? (
                <View className="py-20 items-center">
                    <ActivityIndicator size="large" color="#4338ca" />
                    <Text className="mt-3 text-slate-500 font-semibold text-xs">
                        Loading complaints...
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={filteredComplaints}
                    keyExtractor={(item) => String(item.complaint_id)}
                    renderItem={renderComplaintCard}
                    contentContainerStyle={{ paddingBottom: 40 }}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            colors={["#4338ca"]}
                        />
                    }
                    ListEmptyComponent={
                        <View className="py-20 items-center">
                            <MaterialDesignIcons
                                name="alert-circle-check-outline"
                                size={48}
                                color="#cbd5e1"
                            />
                            <Text className="text-base font-bold text-slate-600 mt-3">
                                No Complaints Found
                            </Text>
                            <Text className="text-xs text-slate-400 text-center mt-1 px-8">
                                There are no complaints matching your search
                                query or selected status filter.
                            </Text>
                        </View>
                    }
                />
            )}

            {/* Resolution Status Sub-Modal */}
            {Boolean(resolveModalVisible) && (
                <Portal>
                    <Modal
                        visible={resolveModalVisible}
                        onDismiss={() => setResolveModalVisible(false)}
                        contentContainerStyle={{
                            backgroundColor: "white",
                            marginHorizontal: 20,
                            borderRadius: 24,
                            padding: 20,
                            elevation: 6,
                        }}
                    >
                        <Text className="text-base font-bold text-slate-800 mb-3">
                            Update Status to{" "}
                            {(targetStatus.replace("_", " ") || "").toUpperCase()}
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
                    </Modal>
                </Portal>
            )}

            {/* Refund Confirmation Modal */}
            <RefundBookingModal
                visible={refundModalVisible}
                onClose={() => setRefundModalVisible(false)}
                booking={selectedBookingForRefund}
                onRefundSuccess={() => fetchComplaints()}
            />

            {/* Complaint Timeline Modal */}
            <ComplaintTimelineModal
                visible={timelineModalVisible}
                onClose={() => setTimelineModalVisible(false)}
                complaint={activeComplaintForTimeline}
                onComplaintUpdated={handleComplaintUpdatedInTimeline}
                currentUserRole={isSuperAdmin ? "super_admin" : "agency_admin"}
            />

            {/* Super Admin Register Complaint Modal */}
            <SuperAdminRegisterComplaintModal
                visible={registerModalVisible}
                onClose={() => setRegisterModalVisible(false)}
                onSuccess={() => fetchComplaints()}
                initialTargetType={registerTargetType}
                initialTargetId={registerTargetId}
                initialTargetName={registerTargetName}
            />
        </View>
    );
}
