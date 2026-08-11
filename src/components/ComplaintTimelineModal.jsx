import React, { useState, useEffect, useCallback } from "react";
import {
    View,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
} from "react-native";
import {
    Modal,
    Portal,
    Text,
    TextInput,
    Button,
    Surface,
    Divider,
    IconButton,
} from "react-native-paper";
import { MaterialDesignIcons } from "@react-native-vector-icons/material-design-icons";
import Chip from "./Chip";
import apiService from "../utils/apiService";
import useToast from "../hooks/useToast";

const STATUS_MAP = {
    pending: {
        label: "Pending",
        bg: "#fef3c7",
        text: "#92400e",
        headerBg: "#d97706",
        icon: "clock-outline",
    },
    under_review: {
        label: "Under Review",
        bg: "#dbeafe",
        text: "#1e40af",
        headerBg: "#2563eb",
        icon: "file-search-outline",
    },
    waiting_for_user: {
        label: "Waiting for User",
        bg: "#ffedd5",
        text: "#c2410c",
        headerBg: "#ea580c",
        icon: "account-clock-outline",
    },
    waiting_for_agency: {
        label: "Waiting for Agency",
        bg: "#fefe9e",
        text: "#854d0e",
        headerBg: "#7c3aed",
        icon: "domain",
    },
    resolved: {
        label: "Resolved",
        bg: "#d1fae5",
        text: "#065f46",
        headerBg: "#059669",
        icon: "check-circle-outline",
    },
    dismissed: {
        label: "Dismissed",
        bg: "#f1f5f9",
        text: "#475569",
        headerBg: "#475569",
        icon: "close-circle-outline",
    },
};

const ROLE_LABEL_MAP = {
    user: { label: "User", bg: "#e0f2fe", text: "#0369a1" },
    agency_admin: { label: "Agency Admin", bg: "#f3e8ff", text: "#6b21a8" },
    agency_user: { label: "Agency Staff", bg: "#f3e8ff", text: "#6b21a8" },
    org: { label: "Agency", bg: "#f3e8ff", text: "#6b21a8" },
    super_admin: { label: "Super Admin", bg: "#fee2e2", text: "#991b1b" },
};

export default function ComplaintTimelineModal({
    visible,
    onClose,
    complaint,
    onComplaintUpdated,
    currentUserRole = "user",
}) {
    const toast = useToast();
    const [loading, setLoading] = useState(false);
    const [complaintData, setComplaintData] = useState(null);

    // Reply / Step Form State
    const [commentText, setCommentText] = useState("");
    const [selectedStatus, setSelectedStatus] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    const fetchDetails = useCallback(async () => {
        if (!complaint?.complaint_id) return;
        setLoading(true);
        try {
            const res = await apiService.get(
                `complaints/${complaint.complaint_id}`
            );
            if (res && res.success && res.data) {
                setComplaintData(res.data);
                setSelectedStatus(res.data.status);
            } else {
                setComplaintData(complaint);
                setSelectedStatus(complaint.status);
            }
        } catch (err) {
            console.error("Error fetching complaint timeline:", err);
            setComplaintData(complaint);
            setSelectedStatus(complaint?.status || "pending");
        } finally {
            setLoading(false);
        }
    }, [complaint]);

    useEffect(() => {
        if (visible && complaint) {
            fetchDetails();
            setCommentText("");
        }
    }, [visible, complaint, fetchDetails]);

    const handleAddStep = async () => {
        if (!commentText.trim()) {
            toast.error(
                "Please enter a comment for this step",
                "Validation",
                true
            );
            return;
        }

        setSubmitting(true);
        try {
            const payload = {
                comment: commentText.trim(),
                newStatus: selectedStatus || complaintData?.status,
            };

            const res = await apiService.post(
                `complaints/${complaintData.complaint_id}/steps`,
                payload
            );

            if (res && res.success && res.data) {
                toast.success("Step added successfully", "Success", true);
                setComplaintData(res.data);
                setCommentText("");
                if (onComplaintUpdated) {
                    onComplaintUpdated(res.data);
                }
            } else {
                toast.error(
                    res?.message || "Failed to add step",
                    "Error",
                    true
                );
            }
        } catch (error) {
            console.error("Error adding step:", error);
            const msg =
                error.response?.data?.message ||
                "Failed to submit comment step";
            toast.error(msg, "Error", true);
        } finally {
            setSubmitting(false);
        }
    };

    const activeComplaint = complaintData || complaint;
    const currentStatusConfig =
        STATUS_MAP[activeComplaint?.status] || STATUS_MAP.pending;
    const stepsList = activeComplaint?.steps || [];

    const isUserRole = currentUserRole === "user";
    const isWaitingForUser = activeComplaint?.status === "waiting_for_user";

    return (
        <Portal>
            <Modal
                visible={visible}
                onDismiss={onClose}
                contentContainerStyle={{
                    backgroundColor: "white",
                    margin: 16,
                    borderRadius: 16,
                    maxHeight: "90%",
                    overflow: "hidden",
                }}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                >
                    {/* Dynamic Status Header */}
                    <View
                        style={{
                            backgroundColor:
                                currentStatusConfig?.headerBg || "#4338ca",
                        }}
                        className="flex-row items-center justify-between p-4"
                    >
                        <View className="flex-1 pr-2">
                            <Text
                                className="text-white font-bold text-lg"
                                numberOfLines={1}
                            >
                                {activeComplaint?.subject ||
                                    "Complaint Details"}
                            </Text>
                            <Text className="text-white text-xs mt-0.5">
                                Complaint ID: #{activeComplaint?.complaint_id} •
                                Booking #
                                {activeComplaint?.booking?.booking_code ||
                                    activeComplaint?.booking_id}
                            </Text>
                        </View>
                        <IconButton
                            icon="close"
                            iconColor="#ffffff"
                            size={24}
                            onPress={onClose}
                        />
                    </View>

                    <ScrollView
                        className="max-h-[500px]"
                        contentContainerStyle={{ padding: 16 }}
                    >
                        {loading ? (
                            <View className="py-12 items-center">
                                <ActivityIndicator
                                    size="large"
                                    color="#3b82f6"
                                />
                                <Text className="text-slate-500 text-sm mt-3">
                                    Loading timeline history...
                                </Text>
                            </View>
                        ) : (
                            <>
                                {/* Status Overview Card */}
                                <Surface
                                    elevation={1}
                                    style={{
                                        backgroundColor: currentStatusConfig.bg,
                                    }}
                                    className="p-3.5 rounded-xl mb-4 flex-row items-center justify-between"
                                >
                                    <View className="flex-row items-center space-x-2">
                                        <MaterialDesignIcons
                                            name={currentStatusConfig.icon}
                                            size={22}
                                            color={currentStatusConfig.text}
                                        />
                                        <View className="ml-2">
                                            <Text className="text-xs text-slate-600 font-medium">
                                                Current Status
                                            </Text>
                                            <Text
                                                style={{
                                                    color: currentStatusConfig.text,
                                                }}
                                                className="font-bold text-base"
                                            >
                                                {currentStatusConfig.label}
                                            </Text>
                                        </View>
                                    </View>

                                    {activeComplaint?.agency?.org_name && (
                                        <View className="items-end">
                                            <Text className="text-xs text-slate-500">
                                                Agency
                                            </Text>
                                            <Text className="text-xs font-semibold text-slate-800">
                                                {
                                                    activeComplaint.agency
                                                        .org_name
                                                }
                                            </Text>
                                        </View>
                                    )}
                                </Surface>

                                {/* Steps Timeline */}
                                <Text className="font-bold text-slate-800 text-base mb-3">
                                    Timeline ({stepsList.length} Step
                                    {stepsList.length !== 1 ? "s" : ""})
                                </Text>

                                {stepsList.length === 0 ? (
                                    <Surface
                                        elevation={0}
                                        className="p-4 bg-slate-50 rounded-xl mb-4"
                                    >
                                        <Text className="font-semibold text-slate-800">
                                            Step 1: Complaint Lodged
                                        </Text>
                                        <Text className="text-slate-600 text-sm mt-1">
                                            {activeComplaint?.description}
                                        </Text>
                                        <Text className="text-slate-400 text-xs mt-2">
                                            {activeComplaint?.created_at
                                                ? new Date(
                                                      activeComplaint.created_at
                                                  ).toLocaleString()
                                                : ""}
                                        </Text>
                                    </Surface>
                                ) : (
                                    stepsList.map((step, idx) => {
                                        const roleConfig =
                                            ROLE_LABEL_MAP[
                                                step.action_by_role
                                            ] || ROLE_LABEL_MAP.user;
                                        const stepStatusConfig =
                                            STATUS_MAP[step.new_status] ||
                                            STATUS_MAP.pending;

                                        return (
                                            <View
                                                key={step.step_id || idx}
                                                className="mb-4 flex-row"
                                            >
                                                {/* Timeline bar indicator */}
                                                <View className="items-center mr-3">
                                                    <View className="w-8 h-8 rounded-full bg-blue-600 items-center justify-center">
                                                        <Text className="text-white font-bold text-xs">
                                                            {step.step_number ||
                                                                idx + 1}
                                                        </Text>
                                                    </View>
                                                    {idx <
                                                        stepsList.length -
                                                            1 && (
                                                        <View className="w-0.5 flex-1 bg-slate-200 my-1" />
                                                    )}
                                                </View>

                                                {/* Content card */}
                                                <Surface
                                                    elevation={1}
                                                    className="flex-1 p-3.5 bg-white rounded-xl border border-slate-100"
                                                >
                                                    <View className="flex-row items-center justify-between mb-1.5">
                                                        <View className="flex-row items-center space-x-2">
                                                            <Chip
                                                                isCompact={true}
                                                                style={{
                                                                    backgroundColor:
                                                                        roleConfig.bg,
                                                                }}
                                                                textStyle={{
                                                                    color: roleConfig.text,
                                                                    fontSize: 10,
                                                                    fontWeight:
                                                                        "700",
                                                                }}
                                                            >
                                                                {
                                                                    roleConfig.label
                                                                }
                                                            </Chip>
                                                        </View>

                                                        <Text className="text-xs text-slate-400">
                                                            {step.created_at
                                                                ? new Date(
                                                                      step.created_at
                                                                  ).toLocaleString()
                                                                : ""}
                                                        </Text>
                                                    </View>

                                                    <Text className="text-slate-800 text-sm leading-5 mb-2">
                                                        {step.comment}
                                                    </Text>

                                                    {step.new_status && (
                                                        <View className="flex-row items-center pt-1 border-t border-slate-100">
                                                            <Text className="text-xs text-slate-400 mr-1.5">
                                                                Stage:
                                                            </Text>
                                                            <View
                                                                style={{
                                                                    backgroundColor:
                                                                        stepStatusConfig.bg,
                                                                }}
                                                                className="px-2 py-0.5 rounded-full"
                                                            >
                                                                <Text
                                                                    style={{
                                                                        color: stepStatusConfig.text,
                                                                    }}
                                                                    className="text-xs font-semibold"
                                                                >
                                                                    {
                                                                        stepStatusConfig.label
                                                                    }
                                                                </Text>
                                                            </View>
                                                        </View>
                                                    )}
                                                </Surface>
                                            </View>
                                        );
                                    })
                                )}

                                {!isUserRole || isWaitingForUser ? (
                                    <>
                                        <Divider className="my-3" />

                                        {/* Add Next Step / Comment Section */}
                                        <Text className="font-bold text-slate-800 text-base mb-2">
                                            {isUserRole
                                                ? "Reply to Agency Request"
                                                : "Add Step / Response Comment"}
                                        </Text>

                                        <TextInput
                                            mode="outlined"
                                            placeholder={
                                                isUserRole
                                                    ? "Enter your response or requested information..."
                                                    : "Enter your comment or update for this step..."
                                            }
                                            value={commentText}
                                            onChangeText={setCommentText}
                                            multiline
                                            numberOfLines={3}
                                            outlineColor="#cbd5e1"
                                            activeOutlineColor="#3b82f6"
                                            style={{
                                                backgroundColor: "#f8fafc",
                                                marginBottom: 12,
                                            }}
                                        />

                                        {!isUserRole && (
                                            <>
                                                {/* Status Transition Selection */}
                                                <Text className="text-xs font-semibold text-slate-600 mb-2">
                                                    Select Stage Transition
                                                    (Optional):
                                                </Text>
                                                <ScrollView
                                                    horizontal
                                                    showsHorizontalScrollIndicator={
                                                        false
                                                    }
                                                    className="mb-4"
                                                >
                                                    {Object.keys(
                                                        STATUS_MAP
                                                    ).map((key) => {
                                                        const cfg =
                                                            STATUS_MAP[key];
                                                        const isSelected =
                                                            selectedStatus ===
                                                            key;
                                                        return (
                                                            <TouchableOpacity
                                                                key={key}
                                                                onPress={() =>
                                                                    setSelectedStatus(
                                                                        key
                                                                    )
                                                                }
                                                                style={{
                                                                    backgroundColor:
                                                                        isSelected
                                                                            ? cfg.bg
                                                                            : "#f1f5f9",
                                                                    borderColor:
                                                                        isSelected
                                                                            ? cfg.text
                                                                            : "#e2e8f0",
                                                                    borderWidth: 1.5,
                                                                    paddingHorizontal: 12,
                                                                    paddingVertical: 6,
                                                                    borderRadius: 20,
                                                                    marginRight: 8,
                                                                }}
                                                            >
                                                                <Text
                                                                    style={{
                                                                        color: isSelected
                                                                            ? cfg.text
                                                                            : "#475569",
                                                                        fontWeight:
                                                                            isSelected
                                                                                ? "bold"
                                                                                : "500",
                                                                        fontSize: 12,
                                                                    }}
                                                                >
                                                                    {cfg.label}
                                                                </Text>
                                                            </TouchableOpacity>
                                                        );
                                                    })}
                                                </ScrollView>
                                            </>
                                        )}

                                        <Button
                                            mode="contained"
                                            onPress={handleAddStep}
                                            loading={submitting}
                                            disabled={
                                                submitting ||
                                                !commentText.trim()
                                            }
                                            buttonColor="#2563eb"
                                            style={{
                                                borderRadius: 10,
                                                paddingVertical: 4,
                                            }}
                                            labelStyle={{ fontWeight: "700" }}
                                        >
                                            {isUserRole
                                                ? "Submit Reply"
                                                : "Submit Step Comment"}
                                        </Button>
                                    </>
                                ) : null}
                            </>
                        )}
                    </ScrollView>
                </KeyboardAvoidingView>
            </Modal>
        </Portal>
    );
}
