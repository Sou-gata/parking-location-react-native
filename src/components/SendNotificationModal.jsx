import React, { useState } from "react";
import {
    View,
    Text,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    TouchableWithoutFeedback,
} from "react-native";
import {
    TextInput,
    Button,
    RadioButton,
    Surface,
    IconButton,
    Chip,
} from "react-native-paper";
import notificationService from "../utils/notificationService";
import useToast from "../hooks/useToast";

const NOTIFICATION_TYPES = ["general", "booking", "wallet", "alert", "promo"];

export default function SendNotificationModal({
    visible,
    onClose,
    initialUserId = "",
}) {
    const toast = useToast();
    const [title, setTitle] = useState("");
    const [message, setMessage] = useState("");
    const [recipientType, setRecipientType] = useState("all"); // 'all' or 'specific'
    const [userId, setUserId] = useState(
        initialUserId ? String(initialUserId) : ""
    );
    const [selectedType, setSelectedType] = useState("general");
    const [loading, setLoading] = useState(false);

    const handleSend = async () => {
        if (!title.trim()) {
            toast.error(
                "Please enter a notification title",
                "Validation Error",
                true
            );
            return;
        }
        if (!message.trim()) {
            toast.error(
                "Please enter a notification message",
                "Validation Error",
                true
            );
            return;
        }
        if (recipientType === "specific" && !userId.trim()) {
            toast.error(
                "Please enter a recipient User ID",
                "Validation Error",
                true
            );
            return;
        }

        setLoading(true);
        try {
            const payload = {
                title: title.trim(),
                message: message.trim(),
                type: selectedType,
                broadcast: recipientType === "all",
                ...(recipientType === "specific"
                    ? { recipient_id: Number(userId.trim()) }
                    : {}),
            };

            const response = await notificationService.sendPushNotification(
                payload
            );

            if (response && response.success) {
                toast.success(
                    recipientType === "all"
                        ? "Broadcast notification sent to all registered devices!"
                        : `Notification sent to user #${userId}!`,
                    "Sent Successfully",
                    true
                );
                // Reset form
                setTitle("");
                setMessage("");
                onClose();
            } else {
                throw new Error(
                    response?.message || "Failed to send notification"
                );
            }
        } catch (error) {
            console.error("[SendNotificationModal] Error:", error);
            const errMsg =
                error.response?.data?.message ||
                error.message ||
                "Failed to dispatch notification";
            toast.error(errMsg, "Send Failed", true);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            visible={Boolean(visible)}
            transparent={true}
            animationType="fade"
            onRequestClose={onClose}
        >
            <TouchableWithoutFeedback onPress={onClose}>
                <View style={styles.overlay}>
                    <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
                        <Surface style={styles.container} elevation={5}>
                            <View style={styles.header}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.headerTitle}>
                                        Send Push Notification
                                    </Text>
                                    <Text style={styles.headerSubtitle}>
                                        Dispatch Firebase push notification to devices
                                    </Text>
                                </View>
                                <IconButton
                                    icon="close"
                                    size={22}
                                    iconColor="#64748b"
                                    onPress={onClose}
                                />
                            </View>

                            <ScrollView
                                showsVerticalScrollIndicator={false}
                                contentContainerStyle={styles.scrollContent}
                            >
                                {/* Recipient Selection */}
                                <Text style={styles.label}>Recipient Target</Text>
                                <RadioButton.Group
                                    onValueChange={(val) => setRecipientType(val)}
                                    value={recipientType}
                                >
                                    <View style={styles.radioRow}>
                                        <View style={styles.radioOption}>
                                            <RadioButton.Android
                                                value="all"
                                                color="#4338ca"
                                            />
                                            <Text style={styles.radioLabel}>
                                                All Users (Broadcast)
                                            </Text>
                                        </View>
                                        <View style={styles.radioOption}>
                                            <RadioButton.Android
                                                value="specific"
                                                color="#4338ca"
                                            />
                                            <Text style={styles.radioLabel}>
                                                Specific User ID
                                            </Text>
                                        </View>
                                    </View>
                                </RadioButton.Group>

                                {recipientType === "specific" && (
                                    <View style={{ marginTop: 8 }}>
                                        <TextInput
                                            label="User ID"
                                            value={userId}
                                            onChangeText={setUserId}
                                            keyboardType="numeric"
                                            mode="outlined"
                                            outlineColor="#cbd5e1"
                                            activeOutlineColor="#4338ca"
                                            style={styles.input}
                                            placeholder="Enter User ID (e.g. 1)"
                                        />
                                    </View>
                                )}

                                {/* Notification Type Selector */}
                                <Text style={[styles.label, { marginTop: 14 }]}>
                                    Notification Type
                                </Text>
                                <ScrollView
                                    horizontal
                                    showsHorizontalScrollIndicator={false}
                                    style={styles.chipScroll}
                                >
                                    {NOTIFICATION_TYPES.map((type) => (
                                        <Chip
                                            key={type}
                                            selected={selectedType === type}
                                            onPress={() => setSelectedType(type)}
                                            style={[
                                                styles.chip,
                                                selectedType === type &&
                                                    styles.chipSelected,
                                            ]}
                                            textStyle={[
                                                styles.chipText,
                                                selectedType === type &&
                                                    styles.chipTextSelected,
                                            ]}
                                        >
                                            {type.toUpperCase()}
                                        </Chip>
                                    ))}
                                </ScrollView>

                                {/* Title Input */}
                                <Text style={[styles.label, { marginTop: 14 }]}>
                                    Notification Title
                                </Text>
                                <TextInput
                                    label="Title"
                                    value={title}
                                    onChangeText={setTitle}
                                    mode="outlined"
                                    outlineColor="#cbd5e1"
                                    activeOutlineColor="#4338ca"
                                    style={styles.input}
                                    placeholder="e.g. Booking Confirmed, Special Offer"
                                    maxLength={100}
                                />

                                {/* Message Body Input */}
                                <Text style={[styles.label, { marginTop: 14 }]}>
                                    Message Body
                                </Text>
                                <TextInput
                                    label="Message"
                                    value={message}
                                    onChangeText={setMessage}
                                    mode="outlined"
                                    outlineColor="#cbd5e1"
                                    activeOutlineColor="#4338ca"
                                    multiline
                                    numberOfLines={4}
                                    style={[styles.input, { minHeight: 90 }]}
                                    placeholder="Type notification message here..."
                                    maxLength={300}
                                />

                                {/* Action Buttons */}
                                <View style={styles.buttonRow}>
                                    <Button
                                        mode="outlined"
                                        onPress={onClose}
                                        style={styles.cancelBtn}
                                        textColor="#64748b"
                                        disabled={loading}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        mode="contained"
                                        onPress={handleSend}
                                        style={styles.sendBtn}
                                        buttonColor="#4338ca"
                                        textColor="#ffffff"
                                        loading={loading}
                                        disabled={loading}
                                        icon="send"
                                    >
                                        Send Push
                                    </Button>
                                </View>
                            </ScrollView>
                        </Surface>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "rgba(0,0,0,0.5)",
        padding: 16,
    },
    container: {
        backgroundColor: "#ffffff",
        borderRadius: 24,
        maxHeight: "85%",
        maxWidth: 500,
        width: "92%",
        paddingTop: 16,
        paddingBottom: 16,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 20,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: "#f1f5f9",
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: "bold",
        color: "#0f172a",
    },
    headerSubtitle: {
        fontSize: 12,
        color: "#64748b",
        marginTop: 2,
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingTop: 14,
        paddingBottom: 20,
    },
    label: {
        fontSize: 13,
        fontWeight: "600",
        color: "#334155",
        marginBottom: 6,
    },
    radioRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    radioOption: {
        flexDirection: "row",
        alignItems: "center",
    },
    radioLabel: {
        fontSize: 14,
        color: "#334155",
        marginLeft: 2,
    },
    input: {
        backgroundColor: "#f8fafc",
    },
    chipScroll: {
        flexDirection: "row",
        marginBottom: 4,
    },
    chip: {
        marginRight: 8,
        backgroundColor: "#f1f5f9",
        borderColor: "#e2e8f0",
        borderWidth: 1,
    },
    chipSelected: {
        backgroundColor: "#e0e7ff",
        borderColor: "#4338ca",
    },
    chipText: {
        color: "#475569",
        fontSize: 11,
        fontWeight: "600",
    },
    chipTextSelected: {
        color: "#4338ca",
        fontWeight: "bold",
    },
    buttonRow: {
        flexDirection: "row",
        justifyContent: "flex-end",
        marginTop: 20,
        gap: 12,
    },
    cancelBtn: {
        borderColor: "#cbd5e1",
        borderRadius: 10,
    },
    sendBtn: {
        borderRadius: 10,
        minWidth: 130,
    },
});
