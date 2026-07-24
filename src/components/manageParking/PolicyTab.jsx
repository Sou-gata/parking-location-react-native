import React, { useState, useEffect } from "react";
import { View, FlatList } from "react-native";
import {
    Text,
    Card,
    Button,
    Avatar,
    IconButton,
    Surface,
} from "react-native-paper";
import Chip from "../Chip";
import useToast from "../../hooks/useToast";
import apiService from "../../utils/apiService";
import AddRuleModal from "./AddRuleModal";
import useRolePermissions from "../../hooks/useRolePermissions";
import { ROLES } from "../../utils/rbacConfig";

export default function PolicyTab({ currentAgency, onRefresh }) {
    const toast = useToast();
    const { role } = useRolePermissions();
    const isSuperAdmin = role === ROLES.SUPER_ADMIN;

    const [localRules, setLocalRules] = useState([]);
    const [policyModalVisible, setPolicyModalVisible] = useState(false);
    const [savingPolicy, setSavingPolicy] = useState(false);

    useEffect(() => {
        if (currentAgency) {
            setLocalRules(currentAgency.cancellationPolicy || []);
        }
    }, [currentAgency]);

    const isPolicyModified = () => {
        const original = currentAgency?.cancellationPolicy || [];
        if (original.length !== localRules.length) return true;

        const sortedOrig = [...original].sort(
            (a, b) => a.timeBeforeStartMinutes - b.timeBeforeStartMinutes
        );
        const sortedLocal = [...localRules].sort(
            (a, b) => a.timeBeforeStartMinutes - b.timeBeforeStartMinutes
        );

        for (let i = 0; i < sortedOrig.length; i++) {
            const o = sortedOrig[i];
            const l = sortedLocal[i];
            if (
                o.timeBeforeStartMinutes !== l.timeBeforeStartMinutes ||
                o.allowCancellation !== l.allowCancellation ||
                o.chargeType !== l.chargeType ||
                o.chargeValue !== l.chargeValue
            ) {
                return true;
            }
        }
        return false;
    };

    const handleSavePolicy = async () => {
        if (!currentAgency) return;
        setSavingPolicy(true);
        try {
            const res = await apiService.put(
                `agencies/${currentAgency.id}/cancellation-policy`,
                { policy: localRules }
            );
            if (res && res.success) {
                toast.success(
                    "Cancellation policy saved successfully!",
                    "Success",
                    true
                );
                onRefresh();
            } else {
                toast.error(
                    "Failed to save cancellation policy",
                    "Error",
                    true
                );
            }
        } catch (error) {
            console.error("Error saving policy:", error);
            const msg =
                error.response?.data?.message ||
                "Failed to save cancellation policy";
            toast.error(msg, "Error", true);
        } finally {
            setSavingPolicy(false);
        }
    };

    const handleDeleteRule = (ruleIndex) => {
        const updated = localRules.filter((_, idx) => idx !== ruleIndex);
        setLocalRules(updated);
    };

    const handleAddRule = (newRule) => {
        const updated = [...localRules, newRule].sort(
            (a, b) => a.timeBeforeStartMinutes - b.timeBeforeStartMinutes
        );
        setLocalRules(updated);
    };

    return (
        <View className="flex-1 px-4 pt-4">
            <FlatList
                data={localRules}
                keyExtractor={(item) => item.timeBeforeStartMinutes.toString()}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 150 }}
                ListHeaderComponent={
                    <View className="flex-row justify-between items-center mb-4">
                        <View className="flex-1 pr-2">
                            <Text className="text-sm font-bold text-slate-500 uppercase tracking-wider">
                                Cancellation Rules
                            </Text>
                            <Text className="text-xs text-slate-400 mt-0.5">
                                Rules are evaluated in order of time before booking start.
                            </Text>
                        </View>
                        {isSuperAdmin && (
                            <Button
                                mode="outlined"
                                onPress={() => setPolicyModalVisible(true)}
                                icon="plus"
                                compact
                                textColor="#4338ca"
                                style={{ borderColor: "#a5b4fc" }}
                                labelStyle={{ fontWeight: "700" }}
                            >
                                Add Rule
                            </Button>
                        )}
                    </View>
                }
                ListEmptyComponent={
                    <View className="items-center justify-center py-10 px-4 bg-white rounded-xl border border-slate-100">
                        <Avatar.Icon
                            size={64}
                            icon="cancel"
                            style={{ backgroundColor: "#f1f5f9" }}
                            color="#94a3b8"
                        />
                        <Text className="text-base font-bold text-slate-700 mt-4">
                            No policy configured
                        </Text>
                        <Text className="text-sm text-slate-400 text-center mt-1">
                            {isSuperAdmin
                                ? 'Customers can cancel their bookings for free at any time. Click "Add Rule" to configure cancellation constraints.'
                                : 'Customers can cancel their bookings for free at any time. There is no cancellation policy configured.'}
                        </Text>
                    </View>
                }
                renderItem={({ item, index }) => {
                    const timeLabel =
                        item.timeBeforeStartMinutes < 60
                            ? `${item.timeBeforeStartMinutes} mins`
                            : `${(item.timeBeforeStartMinutes / 60)
                                  .toFixed(1)
                                  .replace(".0", "")} hrs`;

                    return (
                        <Card
                            className="bg-white mb-3 border border-slate-100"
                            elevation={1}
                        >
                            <Card.Content className="flex-row justify-between items-center py-3.5 px-4">
                                <View className="flex-1 pr-2">
                                    <Text className="text-sm font-bold text-slate-700">
                                        Within {timeLabel} of booking start:
                                    </Text>
                                    <View className="flex-row items-center mt-1.5 gap-2">
                                        <Chip
                                            textStyle={{
                                                fontSize: 10,
                                                color: "white",
                                                fontWeight: "bold",
                                            }}
                                            style={{
                                                backgroundColor: item.allowCancellation
                                                    ? "#22c55e"
                                                    : "#ef4444",
                                            }}
                                            compact
                                        >
                                            {item.allowCancellation ? "Allowed" : "Blocked"}
                                        </Chip>
                                        {item.allowCancellation && (
                                            <Text className="text-xs font-semibold text-slate-500">
                                                Fee:{" "}
                                                {item.chargeType === "percentage"
                                                    ? `${item.chargeValue}%`
                                                    : `₹${item.chargeValue}`}
                                            </Text>
                                        )}
                                    </View>
                                </View>
                                {isSuperAdmin && (
                                    <IconButton
                                        icon="trash-can-outline"
                                        size={20}
                                        iconColor="#ef4444"
                                        onPress={() => handleDeleteRule(index)}
                                    />
                                )}
                            </Card.Content>
                        </Card>
                    );
                }}
            />

            {/* Bottom Save/Discard Bar */}
            {isSuperAdmin && isPolicyModified() && (
                <Surface
                    elevation={4}
                    className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-100 flex-row gap-3"
                >
                    <Button
                        mode="outlined"
                        onPress={() =>
                            setLocalRules(currentAgency.cancellationPolicy || [])
                        }
                        style={{ flex: 1, borderColor: "#cbd5e1" }}
                        textColor="#64748b"
                    >
                        Discard
                    </Button>
                    <Button
                        mode="contained"
                        onPress={handleSavePolicy}
                        style={{ flex: 2 }}
                        buttonColor="#4338ca"
                        loading={savingPolicy}
                        disabled={savingPolicy}
                        labelStyle={{ fontWeight: "700" }}
                    >
                        Save Policy
                    </Button>
                </Surface>
            )}

            <AddRuleModal
                visible={policyModalVisible}
                onDismiss={() => setPolicyModalVisible(false)}
                onAddRule={handleAddRule}
                localRules={localRules}
            />
        </View>
    );
}
