import React, { useState, useEffect } from "react";
import {
    View,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    StyleSheet,
} from "react-native";
import {
    Text,
    Modal,
    Portal,
    Button,
    TextInput,
    Surface,
    Chip,
} from "react-native-paper";
import { MaterialDesignIcons } from "@react-native-vector-icons/material-design-icons";
import apiService from "../utils/apiService";
import useToast from "../hooks/useToast";

export default function SuperAdminRegisterComplaintModal({
    visible,
    onClose,
    onSuccess,
    initialTargetType = "user", // "user" or "agency"
    initialTargetId = null,
    initialTargetName = "",
}) {
    const toast = useToast();

    const [targetType, setTargetType] = useState(initialTargetType); // "user" | "agency"
    const [searchQuery, setSearchQuery] = useState("");
    const [loadingTargets, setLoadingTargets] = useState(false);
    const [userOptions, setUserOptions] = useState([]);
    const [agencyOptions, setAgencyOptions] = useState([]);
    const [selectedTarget, setSelectedTarget] = useState(null);

    const [bookingId, setBookingId] = useState("");
    const [subject, setSubject] = useState("");
    const [description, setDescription] = useState("");
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (visible) {
            setTargetType(initialTargetType || "user");
            setBookingId("");
            setSubject("");
            setDescription("");
            setSearchQuery("");
            setSelectedTarget(
                initialTargetId
                    ? {
                          id: initialTargetId,
                          name: initialTargetName || `ID: #${initialTargetId}`,
                      }
                    : null
            );
            fetchOptions(initialTargetType || "user");
        }
    }, [visible, initialTargetType, initialTargetId, initialTargetName]);

    const fetchOptions = async (type) => {
        setLoadingTargets(true);
        try {
            if (type === "user") {
                const res = await apiService.get("users/directory");
                if (res && res.success && Array.isArray(res.data)) {
                    const formatted = res.data.map((u) => ({
                        id: u.user_id,
                        name: u.full_name || u.username || `User #${u.user_id}`,
                        email: u.email,
                        phone: u.phone_number,
                    }));
                    setUserOptions(formatted);
                }
            } else {
                const res = await apiService.get("agencies");
                if (res && res.data) {
                    const agencyList = Array.isArray(res.data)
                        ? res.data
                        : res.data.agencies || [];
                    const formatted = agencyList.map((a) => ({
                        id: a.org_id,
                        name: a.org_name || `Agency #${a.org_id}`,
                        email: a.email,
                        phone: a.phone_number,
                    }));
                    setAgencyOptions(formatted);
                }
            }
        } catch (error) {
            console.error("Error fetching complaint targets:", error);
        } finally {
            setLoadingTargets(false);
        }
    };

    const handleTargetTypeChange = (type) => {
        setTargetType(type);
        setSelectedTarget(null);
        setSearchQuery("");
        fetchOptions(type);
    };

    const currentOptions = targetType === "user" ? userOptions : agencyOptions;
    const filteredOptions = currentOptions.filter((item) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
            item.name.toLowerCase().includes(q) ||
            (item.email && item.email.toLowerCase().includes(q)) ||
            (item.phone && item.phone.includes(q)) ||
            String(item.id).includes(q)
        );
    });

    const handleSubmit = async () => {
        if (!selectedTarget) {
            toast.error(
                `Please select a target ${targetType === "user" ? "user" : "agency owner"}`,
                "Target Required",
                true
            );
            return;
        }

        if (!description || !description.trim()) {
            toast.error("Please enter a complaint description", "Description Required", true);
            return;
        }

        setSubmitting(true);
        try {
            const complainantType =
                targetType === "user" ? "admin_to_user" : "admin_to_agency";

            const payload = {
                complainantType,
                description: description.trim(),
                subject: subject.trim() || undefined,
                bookingId: bookingId.trim() || undefined,
            };

            if (targetType === "user") {
                payload.targetUserId = selectedTarget.id;
            } else {
                payload.targetAgencyId = selectedTarget.id;
            }

            const res = await apiService.post("complaints", payload);

            if (res && res.success) {
                toast.success(
                    `Complaint filed successfully against ${selectedTarget.name}`,
                    "Complaint Registered",
                    true
                );
                if (onSuccess) onSuccess(res.data);
                onClose();
            } else {
                toast.error(res?.message || "Failed to register complaint", "Error", true);
            }
        } catch (error) {
            console.error("Error lodging complaint:", error);
            const msg =
                error.response?.data?.message || "Failed to submit complaint";
            toast.error(msg, "Submission Error", true);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Portal>
            <Modal
                visible={visible}
                onDismiss={onClose}
                contentContainerStyle={styles.modalContainer}
            >
                <Surface style={styles.surface}>
                    <View style={styles.header}>
                        <View style={{ flexDirection: "row", alignItems: "center" }}>
                            <MaterialDesignIcons
                                name="alert-decagram"
                                size={26}
                                color="#dc2626"
                                style={{ marginRight: 8 }}
                            />
                            <Text style={styles.headerTitle}>
                                Register Admin Complaint
                            </Text>
                        </View>
                        <TouchableOpacity onPress={onClose}>
                            <MaterialDesignIcons name="close" size={24} color="#64748b" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.scrollBody} keyboardShouldPersistTaps="handled">
                        {/* Select Target Type */}
                        <Text style={styles.label}>Complaint Against</Text>
                        <View style={styles.typeSelectorRow}>
                            <TouchableOpacity
                                style={[
                                    styles.typeButton,
                                    targetType === "user" && styles.typeButtonActive,
                                ]}
                                onPress={() => handleTargetTypeChange("user")}
                            >
                                <MaterialDesignIcons
                                    name="account"
                                    size={18}
                                    color={targetType === "user" ? "#ffffff" : "#475569"}
                                />
                                <Text
                                    style={[
                                        styles.typeButtonText,
                                        targetType === "user" && styles.typeButtonTextActive,
                                    ]}
                                >
                                    User
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[
                                    styles.typeButton,
                                    targetType === "agency" && styles.typeButtonActive,
                                ]}
                                onPress={() => handleTargetTypeChange("agency")}
                            >
                                <MaterialDesignIcons
                                    name="domain"
                                    size={18}
                                    color={targetType === "agency" ? "#ffffff" : "#475569"}
                                />
                                <Text
                                    style={[
                                        styles.typeButtonText,
                                        targetType === "agency" && styles.typeButtonTextActive,
                                    ]}
                                >
                                    Agency Owner
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* Selected Target Display */}
                        {selectedTarget ? (
                            <View style={styles.selectedTargetCard}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.selectedTargetName}>
                                        {selectedTarget.name}
                                    </Text>
                                    {selectedTarget.email ? (
                                        <Text style={styles.selectedTargetSub}>
                                            {selectedTarget.email}
                                        </Text>
                                    ) : null}
                                </View>
                                <TouchableOpacity onPress={() => setSelectedTarget(null)}>
                                    <Chip icon="close" style={{ backgroundColor: "#fee2e2" }}>
                                        Change
                                    </Chip>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <View style={{ marginBottom: 14 }}>
                                <Text style={styles.label}>
                                    Select Target {targetType === "user" ? "User" : "Agency"}
                                </Text>
                                <TextInput
                                    mode="outlined"
                                    placeholder={`Search ${targetType === "user" ? "user name/email..." : "agency name..."}`}
                                    value={searchQuery}
                                    onChangeText={setSearchQuery}
                                    dense
                                    left={
                                        <TextInput.Icon
                                            icon={() => (
                                                <MaterialDesignIcons
                                                    name="magnify"
                                                    size={20}
                                                    color="#94a3b8"
                                                />
                                            )}
                                        />
                                    }
                                />

                                {loadingTargets ? (
                                    <ActivityIndicator
                                        style={{ marginVertical: 12 }}
                                        color="#3b82f6"
                                    />
                                ) : (
                                    <View style={styles.dropdownList}>
                                        {filteredOptions.slice(0, 5).map((item) => (
                                            <TouchableOpacity
                                                key={item.id}
                                                style={styles.dropdownItem}
                                                onPress={() => setSelectedTarget(item)}
                                            >
                                                <MaterialDesignIcons
                                                    name={
                                                        targetType === "user"
                                                            ? "account-circle"
                                                            : "office-building"
                                                    }
                                                    size={20}
                                                    color="#64748b"
                                                    style={{ marginRight: 10 }}
                                                />
                                                <View style={{ flex: 1 }}>
                                                    <Text style={styles.dropdownItemTitle}>
                                                        {item.name}
                                                    </Text>
                                                    {item.email ? (
                                                        <Text style={styles.dropdownItemSub}>
                                                            {item.email}
                                                        </Text>
                                                    ) : null}
                                                </View>
                                                <Text style={styles.dropdownItemId}>
                                                    #{item.id}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                        {filteredOptions.length === 0 && (
                                            <Text style={styles.noResultsText}>
                                                No {targetType}s found matching query
                                            </Text>
                                        )}
                                    </View>
                                )}
                            </View>
                        )}

                        {/* Booking ID (Optional) */}
                        <Text style={styles.label}>Booking ID (Optional)</Text>
                        <TextInput
                            mode="outlined"
                            placeholder="e.g. 1042 (Leave empty if direct complaint)"
                            value={bookingId}
                            onChangeText={setBookingId}
                            keyboardType="numeric"
                            style={styles.input}
                        />

                        {/* Subject */}
                        <Text style={styles.label}>Subject (Optional)</Text>
                        <TextInput
                            mode="outlined"
                            placeholder="Brief title for the complaint..."
                            value={subject}
                            onChangeText={setSubject}
                            style={styles.input}
                        />

                        {/* Description */}
                        <Text style={styles.label}>Description *</Text>
                        <TextInput
                            mode="outlined"
                            placeholder="Detailed explanation of the issue or complaint..."
                            value={description}
                            onChangeText={setDescription}
                            multiline
                            numberOfLines={4}
                            style={styles.input}
                        />
                    </ScrollView>

                    {/* Actions */}
                    <View style={styles.footer}>
                        <Button
                            mode="outlined"
                            onPress={onClose}
                            style={{ marginRight: 10 }}
                            disabled={submitting}
                        >
                            Cancel
                        </Button>
                        <Button
                            mode="contained"
                            onPress={handleSubmit}
                            loading={submitting}
                            disabled={submitting}
                            buttonColor="#dc2626"
                        >
                            Submit Complaint
                        </Button>
                    </View>
                </Surface>
            </Modal>
        </Portal>
    );
}

const styles = StyleSheet.create({
    modalContainer: {
        padding: 16,
        justifyContent: "center",
    },
    surface: {
        borderRadius: 16,
        padding: 20,
        backgroundColor: "#ffffff",
        maxHeight: "88%",
        elevation: 5,
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingBottom: 14,
        borderBottomWidth: 1,
        borderBottomColor: "#f1f5f9",
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: "#1e293b",
    },
    scrollBody: {
        marginVertical: 14,
    },
    label: {
        fontSize: 13,
        fontWeight: "600",
        color: "#475569",
        marginBottom: 6,
        marginTop: 8,
    },
    typeSelectorRow: {
        flexDirection: "row",
        marginBottom: 14,
    },
    typeButton: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 10,
        borderRadius: 8,
        backgroundColor: "#f8fafc",
        borderWidth: 1,
        borderColor: "#e2e8f0",
        marginRight: 8,
    },
    typeButtonActive: {
        backgroundColor: "#2563eb",
        borderColor: "#2563eb",
    },
    typeButtonText: {
        fontSize: 14,
        fontWeight: "600",
        color: "#475569",
        marginLeft: 6,
    },
    typeButtonTextActive: {
        color: "#ffffff",
    },
    selectedTargetCard: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#f0f9ff",
        padding: 12,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: "#bae6fd",
        marginBottom: 12,
    },
    selectedTargetName: {
        fontSize: 15,
        fontWeight: "700",
        color: "#0369a1",
    },
    selectedTargetSub: {
        fontSize: 12,
        color: "#0284c7",
    },
    dropdownList: {
        marginTop: 6,
        backgroundColor: "#fafafa",
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#e2e8f0",
    },
    dropdownItem: {
        flexDirection: "row",
        alignItems: "center",
        padding: 10,
        borderBottomWidth: 1,
        borderBottomColor: "#f1f5f9",
    },
    dropdownItemTitle: {
        fontSize: 14,
        fontWeight: "600",
        color: "#334155",
    },
    dropdownItemSub: {
        fontSize: 12,
        color: "#64748b",
    },
    dropdownItemId: {
        fontSize: 12,
        fontWeight: "700",
        color: "#94a3b8",
    },
    noResultsText: {
        padding: 12,
        fontSize: 13,
        color: "#94a3b8",
        textAlign: "center",
    },
    input: {
        backgroundColor: "#ffffff",
        marginBottom: 8,
    },
    footer: {
        flexDirection: "row",
        justifyContent: "flex-end",
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: "#f1f5f9",
    },
});
