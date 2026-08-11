import React, { useState, useEffect } from "react";
import { View } from "react-native";
import {
    Text,
    Modal,
    Portal,
    TextInput,
    Button,
    IconButton,
} from "react-native-paper";

export default function ComplaintModal({
    visible,
    onClose,
    onSubmit,
    title = "Lodge a Complaint",
    subtitle = "",
    loading = false,
}) {
    const [subject, setSubject] = useState("");
    const [description, setDescription] = useState("");
    const [error, setError] = useState("");

    useEffect(() => {
        if (visible) {
            setSubject("");
            setDescription("");
            setError("");
        }
    }, [visible]);

    const handleSubmit = () => {
        if (!description.trim()) {
            setError("Please enter details describing your complaint.");
            return;
        }
        if (description.trim().length > 500) {
            setError("Complaint description cannot exceed 500 characters.");
            return;
        }
        setError("");
        if (onSubmit) {
            onSubmit({
                subject: subject.trim() || "Complaint",
                description: description.trim(),
            });
        }
    };

    return (
        <Portal>
            <Modal
                visible={visible}
                onDismiss={onClose}
                contentContainerStyle={{
                    backgroundColor: "white",
                    marginHorizontal: 20,
                    borderRadius: 24,
                    padding: 20,
                    elevation: 5,
                }}
            >
                {/* Header Row - Fixed non-overlapping title & close button layout */}
                <View className="flex-row items-start justify-between mb-3">
                    <View className="flex-1 pr-2">
                        <View className="flex-row items-center">
                            <IconButton
                                icon="alert-circle-outline"
                                iconColor="#ef4444"
                                size={24}
                                style={{ margin: 0, marginRight: 4 }}
                            />
                            <Text className="text-lg font-bold text-slate-800 flex-1">
                                {title}
                            </Text>
                        </View>
                        {Boolean(subtitle) && (
                            <Text className="text-xs text-slate-500 mt-0.5 ml-1">
                                {subtitle}
                            </Text>
                        )}
                    </View>
                    <IconButton
                        icon="close"
                        size={22}
                        onPress={onClose}
                        style={{ margin: 0 }}
                    />
                </View>

                <TextInput
                    label="Subject / Concern Title (Optional)"
                    value={subject}
                    onChangeText={setSubject}
                    mode="outlined"
                    outlineColor="#cbd5e1"
                    activeOutlineColor="#ef4444"
                    className="bg-slate-50 mb-3"
                    placeholder="e.g. Overcharging, Slot issue, behavior"
                />

                <TextInput
                    label="Complaint Description *"
                    value={description}
                    onChangeText={(val) => {
                        setDescription(val);
                        if (error) setError("");
                    }}
                    mode="outlined"
                    multiline
                    numberOfLines={4}
                    maxLength={500}
                    outlineColor={error ? "#ef4444" : "#cbd5e1"}
                    activeOutlineColor="#ef4444"
                    className="bg-slate-50 mb-1"
                    placeholder="Please explain the problem or issue in detail..."
                />
                <Text className="text-[11px] text-slate-400 text-right mb-2">
                    {description.length}/500
                </Text>

                {Boolean(error) && (
                    <Text className="text-xs font-semibold text-rose-500 mb-2">
                        {error}
                    </Text>
                )}

                <View className="bg-rose-50 p-2.5 rounded-xl border border-rose-100 mb-4">
                    <Text className="text-xs text-rose-800 leading-4">
                        ℹ Note: Once submitted, complaints are routed to Admin for review.
                    </Text>
                </View>

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
                        onPress={handleSubmit}
                        buttonColor="#ef4444"
                        className="flex-1 rounded-xl"
                        loading={loading}
                        disabled={loading}
                        labelStyle={{ fontWeight: "700" }}
                    >
                        Submit Complaint
                    </Button>
                </View>
            </Modal>
        </Portal>
    );
}
