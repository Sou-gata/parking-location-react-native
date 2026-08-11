import React, { useState, useEffect } from "react";
import { View } from "react-native";
import { Text, Button, TextInput, Modal } from "react-native-paper";
import Chip from "../Chip";
import useToast from "../../hooks/useToast";

export default function AddRuleModal({
    visible,
    onDismiss,
    onAddRule,
    localRules,
}) {
    const toast = useToast();

    const [form, setForm] = useState({
        timeVal: "",
        timeUnit: "minutes",
        allowCancel: true,
        chargeType: "percentage",
        chargeVal: "",
    });

    useEffect(() => {
        if (visible) {
            setForm({
                timeVal: "",
                timeUnit: "minutes",
                allowCancel: true,
                chargeType: "percentage",
                chargeVal: "",
            });
        }
    }, [visible]);

    const updateForm = (key, value) => {
        setForm((prev) => ({ ...prev, [key]: value }));
    };

    const handleAdd = () => {
        const timeNum = parseInt(form.timeVal, 10);
        if (isNaN(timeNum) || timeNum <= 0) {
            toast.error(
                "Time threshold must be a positive integer",
                "Error",
                true
            );
            return;
        }

        const timeMinutes = form.timeUnit === "hours" ? timeNum * 60 : timeNum;

        if (
            localRules &&
            localRules.some((r) => r.timeBeforeStartMinutes === timeMinutes)
        ) {
            toast.error(
                "A rule for this time threshold already exists.",
                "Error",
                true
            );
            return;
        }

        let chargeValNum = 0;
        if (form.allowCancel) {
            chargeValNum = parseFloat(form.chargeVal);
            if (isNaN(chargeValNum) || chargeValNum < 0) {
                toast.error(
                    "Charge value must be a non-negative number",
                    "Error",
                    true
                );
                return;
            }
            if (form.chargeType === "percentage" && chargeValNum > 100) {
                toast.error(
                    "Percentage charge cannot exceed 100%",
                    "Error",
                    true
                );
                return;
            }
        } else {
            chargeValNum = 100;
        }

        const newRule = {
            timeBeforeStartMinutes: timeMinutes,
            allowCancellation: form.allowCancel,
            chargeType: form.allowCancel ? form.chargeType : "percentage",
            chargeValue: chargeValNum,
        };

        onAddRule(newRule);
        onDismiss();
    };

    return (
        <Modal
            visible={visible}
            onDismiss={onDismiss}
            contentContainerStyle={{
                backgroundColor: "white",
                padding: 24,
                margin: 20,
                borderRadius: 16,
            }}
        >
            <Text className="text-lg font-bold text-slate-800 mb-4">
                Add Cancellation Rule
            </Text>

            <Text className="text-sm font-semibold text-slate-600 mb-2">
                Cancellation Time Window
            </Text>
            <View className="flex-row items-center gap-2 mb-4">
                <TextInput
                    label="Time Before Start"
                    value={form.timeVal}
                    onChangeText={(val) => updateForm("timeVal", val)}
                    keyboardType="numeric"
                    mode="outlined"
                    outlineColor="#e2e8f0"
                    activeOutlineColor="#4338ca"
                    className="flex-1 bg-white"
                />
                <View className="flex-row gap-1.5 items-center">
                    <Chip
                        selected={form.timeUnit === "minutes"}
                        onPress={() => updateForm("timeUnit", "minutes")}
                        isCompact={true}
                        showSelectedOverlay
                    >
                        Mins
                    </Chip>
                    <Chip
                        selected={form.timeUnit === "hours"}
                        onPress={() => updateForm("timeUnit", "hours")}
                        isCompact={true}
                        showSelectedOverlay
                    >
                        Hours
                    </Chip>
                </View>
            </View>

            <Text className="text-sm font-semibold text-slate-600 mb-2">
                Is Cancellation Allowed?
            </Text>
            <View className="flex-row gap-2 mb-4">
                <Chip
                    selected={form.allowCancel === true}
                    onPress={() => updateForm("allowCancel", true)}
                    selectedColor="#22c55e"
                    showSelectedOverlay
                >
                    Yes, Allow
                </Chip>
                <Chip
                    selected={form.allowCancel === false}
                    onPress={() => updateForm("allowCancel", false)}
                    selectedColor="#ef4444"
                    showSelectedOverlay
                >
                    No, Block
                </Chip>
            </View>

            {form.allowCancel && (
                <View className="mb-4">
                    <Text className="text-sm font-semibold text-slate-600 mb-2">
                        Cancellation Charge Type
                    </Text>
                    <View className="flex-row gap-2 mb-4">
                        <Chip
                            selected={form.chargeType === "percentage"}
                            onPress={() =>
                                updateForm("chargeType", "percentage")
                            }
                            selectedColor="#4338ca"
                            showSelectedOverlay
                        >
                            Percentage (%)
                        </Chip>
                        <Chip
                            selected={form.chargeType === "fixed"}
                            onPress={() => updateForm("chargeType", "fixed")}
                            selectedColor="#4338ca"
                            showSelectedOverlay
                        >
                            Fixed Amount (₹)
                        </Chip>
                    </View>

                    <TextInput
                        label={
                            form.chargeType === "percentage"
                                ? "Deduction Percentage (%)"
                                : "Fixed Deduction Fee (₹)"
                        }
                        value={form.chargeVal}
                        onChangeText={(val) => updateForm("chargeVal", val)}
                        keyboardType="numeric"
                        mode="outlined"
                        outlineColor="#e2e8f0"
                        activeOutlineColor="#4338ca"
                        className="bg-white"
                        left={
                            <TextInput.Icon
                                size={18}
                                icon={
                                    form.chargeType === "percentage"
                                        ? "percent"
                                        : "currency-inr"
                                }
                            />
                        }
                    />
                </View>
            )}

            <View className="flex-row justify-end gap-3 mt-2">
                <Button
                    mode="outlined"
                    onPress={onDismiss}
                    textColor="#64748b"
                    style={{ borderColor: "#cbd5e1" }}
                >
                    Cancel
                </Button>
                <Button
                    mode="contained"
                    onPress={handleAdd}
                    buttonColor="#4338ca"
                    labelStyle={{ fontWeight: "700" }}
                >
                    Add Rule
                </Button>
            </View>
        </Modal>
    );
}
