import React, { useState, useEffect, useCallback } from "react";
import {
    View,
    ScrollView,
    ActivityIndicator,
    RefreshControl,
} from "react-native";
import {
    Text,
    Card,
    TextInput,
    Button,
    Avatar,
    Switch,
    Chip,
    IconButton,
} from "react-native-paper";
import apiService from "../utils/apiService";
import useToast from "../hooks/useToast";

const DEFAULT_ZONING_LIST = [
    "Residential",
    "Commercial",
    "Industrial",
    "Mixed-Use",
    "Agricultural",
    "Institutional",
];

export default function SuperAdminSettings() {
    const toast = useToast();

    // Core Config States
    const [upiId, setUpiId] = useState("");
    const [userTerms, setUserTerms] = useState("");
    const [agencyTerms, setAgencyTerms] = useState("");

    // Overtime States
    const [firstReminderMins, setFirstReminderMins] = useState("60");
    const [secondReminderMins, setSecondReminderMins] = useState("15");
    const [overdueIntervalMins, setOverdueIntervalMins] = useState("15");
    const [gracePeriodMins, setGracePeriodMins] = useState("5");
    const [overtimeRatePerHour, setOvertimeRatePerHour] = useState("10");
    const [notificationsEnabled, setNotificationsEnabled] = useState(true);

    // Zoning States
    const [zoningTypes, setZoningTypes] = useState(DEFAULT_ZONING_LIST);
    const [newZoningInput, setNewZoningInput] = useState("");
    const [savingZoning, setSavingZoning] = useState(false);

    // Loading / Saving states
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [savingUpi, setSavingUpi] = useState(false);
    const [savingUserTerms, setSavingUserTerms] = useState(false);
    const [savingAgencyTerms, setSavingAgencyTerms] = useState(false);
    const [savingOvertime, setSavingOvertime] = useState(false);

    const fetchConfig = useCallback(
        async (isSilent = false) => {
            if (!isSilent) {
                setLoading(true);
            }
            try {
                const [
                    upiRes,
                    userTermsRes,
                    agencyTermsRes,
                    overtimeRes,
                    zoningRes,
                ] = await Promise.allSettled([
                    apiService.get("wallets/config"),
                    apiService.get("config/user"),
                    apiService.get("config/agency"),
                    apiService.get("config/overtime-settings"),
                    apiService.get("config/zoning-types"),
                ]);

                if (
                    upiRes.status === "fulfilled" &&
                    upiRes.value?.success &&
                    upiRes.value?.data
                ) {
                    setUpiId(upiRes.value.data.upiId || "");
                }
                if (
                    userTermsRes.status === "fulfilled" &&
                    userTermsRes.value?.success &&
                    userTermsRes.value?.data
                ) {
                    setUserTerms(userTermsRes.value.data.content || "");
                }
                if (
                    agencyTermsRes.status === "fulfilled" &&
                    agencyTermsRes.value?.success &&
                    agencyTermsRes.value?.data
                ) {
                    setAgencyTerms(agencyTermsRes.value.data.content || "");
                }
                if (
                    overtimeRes.status === "fulfilled" &&
                    overtimeRes.value?.success &&
                    overtimeRes.value?.data
                ) {
                    const data = overtimeRes.value.data;
                    setFirstReminderMins(
                        String(data.first_reminder_mins ?? 60)
                    );
                    setSecondReminderMins(
                        String(data.second_reminder_mins ?? 15)
                    );
                    setOverdueIntervalMins(
                        String(data.overdue_reminder_interval_mins ?? 15)
                    );
                    setGracePeriodMins(String(data.grace_period_mins ?? 5));
                    setOvertimeRatePerHour(
                        String(data.overtime_rate_per_hour ?? 10)
                    );
                    setNotificationsEnabled(data.enabled ?? true);
                }
                if (
                    zoningRes.status === "fulfilled" &&
                    zoningRes.value?.success &&
                    zoningRes.value?.data
                ) {
                    setZoningTypes(
                        zoningRes.value.data.zoningTypes || DEFAULT_ZONING_LIST
                    );
                }
            } catch (error) {
                console.error("Error loading config:", error);
                toast.error("Network request failed", "Error", true);
            } finally {
                if (!isSilent) {
                    setLoading(false);
                }
            }
        },
        [toast]
    );

    useEffect(() => {
        fetchConfig();
    }, [fetchConfig]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await fetchConfig(true);
        setRefreshing(false);
    }, [fetchConfig]);

    // 1. Save UPI
    const handleSaveUpi = async () => {
        if (!upiId || upiId.trim() === "") {
            toast.error("UPI ID cannot be empty", "Validation Error", true);
            return;
        }

        const upiPattern = /^[\w.-]+@[\w-]+$/;
        if (!upiPattern.test(upiId.trim())) {
            toast.error(
                "Please enter a valid UPI ID (e.g., merchant@bank)",
                "Validation Error",
                true
            );
            return;
        }

        setSavingUpi(true);
        try {
            const res = await apiService.post("wallets/config", {
                upiId: upiId.trim(),
            });
            if (res && res.success) {
                toast.success(
                    "UPI ID configuration updated successfully!",
                    "Success",
                    true
                );
                fetchConfig(true);
            } else {
                toast.error(
                    res?.message || "Failed to save configuration",
                    "Error",
                    true
                );
            }
        } catch (error) {
            console.error("Error saving config:", error);
            toast.error("Failed to save settings", "Error", true);
        } finally {
            setSavingUpi(false);
        }
    };

    // 2. Save Overtime Settings
    const handleSaveOvertimeSettings = async () => {
        const first = parseInt(firstReminderMins, 10);
        const second = parseInt(secondReminderMins, 10);
        const interval = parseInt(overdueIntervalMins, 10);
        const grace = parseInt(gracePeriodMins, 10);
        const rate = parseFloat(overtimeRatePerHour);

        if (isNaN(first) || first <= 0) {
            toast.error(
                "First reminder minutes must be a positive number",
                "Validation Error",
                true
            );
            return;
        }
        if (isNaN(second) || second <= 0) {
            toast.error(
                "Second reminder minutes must be a positive number",
                "Validation Error",
                true
            );
            return;
        }
        if (isNaN(interval) || interval <= 0) {
            toast.error(
                "Overdue interval minutes must be a positive number",
                "Validation Error",
                true
            );
            return;
        }
        if (first <= second) {
            toast.error(
                "First reminder minutes must be greater than second reminder minutes",
                "Validation Error",
                true
            );
            return;
        }
        if (isNaN(grace) || grace < 0 || grace > 60) {
            toast.error(
                "Grace period must be between 0 and 60 minutes",
                "Validation Error",
                true
            );
            return;
        }
        if (isNaN(rate) || rate < 0) {
            toast.error(
                "Overtime rate per hour must be a valid number >= 0",
                "Validation Error",
                true
            );
            return;
        }

        setSavingOvertime(true);
        try {
            const res = await apiService.put("config/overtime-settings", {
                first_reminder_mins: first,
                second_reminder_mins: second,
                overdue_reminder_interval_mins: interval,
                grace_period_mins: grace,
                overtime_rate_per_hour: rate,
                enabled: notificationsEnabled,
            });

            if (res && res.success) {
                toast.success(
                    "Overtime notification & billing settings updated successfully!",
                    "Success",
                    true
                );
                fetchConfig(true);
            } else {
                toast.error(
                    res?.message || "Failed to update overtime settings",
                    "Error",
                    true
                );
            }
        } catch (error) {
            console.error("Error saving overtime settings:", error);
            toast.error("Failed to save overtime settings", "Error", true);
        } finally {
            setSavingOvertime(false);
        }
    };

    // 3. Save User Terms
    const handleSaveUserTerms = async () => {
        if (!userTerms || !userTerms.trim()) {
            toast.error(
                "User Terms and Conditions cannot be empty",
                "Validation Error",
                true
            );
            return;
        }

        setSavingUserTerms(true);
        try {
            const res = await apiService.put("config/user", {
                content: userTerms.trim(),
            });
            if (res && res.success) {
                toast.success(
                    "User Signup Terms & Conditions updated!",
                    "Success",
                    true
                );
                fetchConfig(true);
            } else {
                toast.error(
                    res?.message || "Failed to update User terms",
                    "Error",
                    true
                );
            }
        } catch (error) {
            console.error("Error updating User terms:", error);
            toast.error("Failed to save User terms", "Error", true);
        } finally {
            setSavingUserTerms(false);
        }
    };

    // 4. Save Agency Terms
    const handleSaveAgencyTerms = async () => {
        if (!agencyTerms || !agencyTerms.trim()) {
            toast.error(
                "Agency Terms and Conditions cannot be empty",
                "Validation Error",
                true
            );
            return;
        }

        setSavingAgencyTerms(true);
        try {
            const res = await apiService.put("config/agency", {
                content: agencyTerms.trim(),
            });
            if (res && res.success) {
                toast.success(
                    "Partner Agency Terms & Conditions updated!",
                    "Success",
                    true
                );
                fetchConfig(true);
            } else {
                toast.error(
                    res?.message || "Failed to update Agency terms",
                    "Error",
                    true
                );
            }
        } catch (error) {
            console.error("Error updating Agency terms:", error);
            toast.error("Failed to save Agency terms", "Error", true);
        } finally {
            setSavingAgencyTerms(false);
        }
    };

    // 5. Add Zoning Type
    const handleAddZoning = async () => {
        const trimmed = (newZoningInput || "").trim();
        if (!trimmed) {
            toast.error(
                "Zoning name cannot be empty",
                "Validation Error",
                true
            );
            return;
        }

        setSavingZoning(true);
        try {
            const res = await apiService.post("config/zoning-types", {
                zoning: trimmed,
            });
            if (res && res.success) {
                toast.success(
                    `Zoning '${trimmed}' added successfully!`,
                    "Success",
                    true
                );
                setNewZoningInput("");
                if (res.data?.zoningTypes) {
                    setZoningTypes(res.data.zoningTypes);
                } else {
                    fetchConfig(true);
                }
            } else {
                toast.error(
                    res?.message || "Failed to add zoning type",
                    "Error",
                    true
                );
            }
        } catch (error) {
            console.error("Error adding zoning type:", error);
            toast.error(
                error?.message || "Failed to add zoning classification",
                "Error",
                true
            );
        } finally {
            setSavingZoning(false);
        }
    };

    // 6. Delete Zoning Type
    const handleDeleteZoning = async (name) => {
        try {
            const res = await apiService.delete(
                `config/zoning-types/${encodeURIComponent(name)}`
            );
            if (res && res.success) {
                toast.success(`Zoning '${name}' deleted!`, "Success", true);
                if (res.data?.zoningTypes) {
                    setZoningTypes(res.data.zoningTypes);
                } else {
                    fetchConfig(true);
                }
            } else {
                toast.error(
                    res?.message || "Failed to delete zoning classification",
                    "Error",
                    true
                );
            }
        } catch (error) {
            console.error("Error deleting zoning type:", error);
            toast.error(
                error?.message || "Failed to delete zoning type",
                "Error",
                true
            );
        }
    };

    if (loading) {
        return (
            <View className="flex-1 justify-center items-center bg-slate-50">
                <ActivityIndicator size="large" color="#ff9933" />
                <Text className="text-slate-500 font-semibold text-xs mt-3">
                    Loading System Configurations...
                </Text>
            </View>
        );
    }

    return (
        <ScrollView
            className="flex-1 bg-slate-50"
            contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
            showsVerticalScrollIndicator={false}
            refreshControl={
                <RefreshControl
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    colors={["#ff9933"]}
                />
            }
        >
            {/* Header Card */}
            <Card className="bg-white border border-slate-100 rounded-3xl elevation-1 overflow-hidden mb-5">
                <View className="bg-carrot-950 p-6 flex-row items-center justify-between">
                    <View className="flex-1 pr-3">
                        <Text className="text-white text-xl font-bold">
                            System Configurations
                        </Text>
                        <Text className="text-carrot-200 text-xs mt-1">
                            Declare & manage platform parameters, pricing rules,
                            terms, and global variables
                        </Text>
                    </View>
                    <Avatar.Icon
                        size={46}
                        icon="cog"
                        style={{ backgroundColor: "#ff9933" }}
                        color="#fff"
                    />
                </View>
            </Card>

            {/* Merchant UPI Section */}
            <Card className="bg-white border border-slate-100 rounded-3xl elevation-1 overflow-hidden mb-5">
                <Card.Content className="p-5">
                    <View className="flex-row items-center mb-2">
                        <Avatar.Icon
                            size={36}
                            icon="qrcode"
                            style={{ backgroundColor: "#e0e7ff" }}
                            color="#4f46e5"
                        />
                        <View className="ml-3 flex-1">
                            <Text className="text-base font-bold text-slate-800">
                                Merchant Payment UPI
                            </Text>
                            <Text className="text-xs text-slate-400">
                                Global UPI ID for customer wallet recharge QR
                                codes
                            </Text>
                        </View>
                    </View>

                    <TextInput
                        mode="outlined"
                        label="Business UPI ID"
                        placeholder="e.g. merchant@ybl"
                        value={upiId}
                        onChangeText={setUpiId}
                        activeOutlineColor="#4f46e5"
                        outlineColor="#cbd5e1"
                        left={<TextInput.Icon icon="at" />}
                        className="bg-white mb-3 mt-2"
                    />

                    <Button
                        mode="contained"
                        onPress={handleSaveUpi}
                        loading={savingUpi}
                        disabled={savingUpi}
                        className="bg-indigo-600 rounded-xl py-0.5"
                        labelStyle={{ fontWeight: "bold", fontSize: 13 }}
                    >
                        Save UPI Configuration
                    </Button>
                </Card.Content>
            </Card>

            {/* Overtime, Grace Period & Expiry Settings Card */}
            <Card className="bg-white border border-slate-100 rounded-3xl elevation-1 overflow-hidden mb-5">
                <Card.Content className="p-5">
                    <View className="flex-row items-center mb-2">
                        <Avatar.Icon
                            size={36}
                            icon="bell-ring-outline"
                            style={{ backgroundColor: "#e0f2fe" }}
                            color="#0284c7"
                        />
                        <View className="ml-3 flex-1">
                            <Text className="text-base font-bold text-slate-800">
                                Overtime & Billing Policies
                            </Text>
                            <Text className="text-xs text-slate-400">
                                Set notification windows, grace period, and
                                hourly overtime rate
                            </Text>
                        </View>
                    </View>

                    <View className="flex-row items-center justify-between py-2.5 my-1 border-b border-slate-100">
                        <View className="flex-1 pr-4">
                            <Text className="text-sm font-semibold text-slate-700">
                                Enable Overtime Notifications
                            </Text>
                            <Text className="text-xs text-slate-400">
                                Push notification warnings before and during
                                overtime
                            </Text>
                        </View>
                        <Switch
                            value={notificationsEnabled}
                            onValueChange={setNotificationsEnabled}
                            color="#0284c7"
                        />
                    </View>

                    <View className="gap-3 mt-2">
                        <View className="flex-row gap-3">
                            <View className="flex-1">
                                <Text className="text-xs font-semibold text-slate-600 mb-1">
                                    1st Warning (mins before)
                                </Text>
                                <TextInput
                                    mode="outlined"
                                    keyboardType="numeric"
                                    placeholder="60"
                                    value={firstReminderMins}
                                    onChangeText={setFirstReminderMins}
                                    activeOutlineColor="#0284c7"
                                    outlineColor="#cbd5e1"
                                    className="bg-white"
                                    left={
                                        <TextInput.Icon icon="clock-outline" />
                                    }
                                />
                            </View>

                            <View className="flex-1">
                                <Text className="text-xs font-semibold text-slate-600 mb-1">
                                    2nd Warning (mins before)
                                </Text>
                                <TextInput
                                    mode="outlined"
                                    keyboardType="numeric"
                                    placeholder="15"
                                    value={secondReminderMins}
                                    onChangeText={setSecondReminderMins}
                                    activeOutlineColor="#0284c7"
                                    outlineColor="#cbd5e1"
                                    className="bg-white"
                                    left={
                                        <TextInput.Icon icon="clock-alert-outline" />
                                    }
                                />
                            </View>
                        </View>

                        <View className="flex-row gap-3">
                            <View className="flex-1">
                                <Text className="text-xs font-semibold text-slate-600 mb-1">
                                    Overdue Reminder Interval
                                </Text>
                                <TextInput
                                    mode="outlined"
                                    keyboardType="numeric"
                                    placeholder="15"
                                    value={overdueIntervalMins}
                                    onChangeText={setOverdueIntervalMins}
                                    activeOutlineColor="#0284c7"
                                    outlineColor="#cbd5e1"
                                    className="bg-white"
                                    left={
                                        <TextInput.Icon icon="timer-sync-outline" />
                                    }
                                />
                            </View>

                            <View className="flex-1">
                                <Text className="text-xs font-semibold text-slate-600 mb-1">
                                    Grace Period (mins)
                                </Text>
                                <TextInput
                                    mode="outlined"
                                    keyboardType="numeric"
                                    placeholder="5"
                                    value={gracePeriodMins}
                                    onChangeText={setGracePeriodMins}
                                    activeOutlineColor="#0284c7"
                                    outlineColor="#cbd5e1"
                                    className="bg-white"
                                    left={
                                        <TextInput.Icon icon="shield-outline" />
                                    }
                                />
                            </View>
                        </View>

                        <View>
                            <Text className="text-xs font-semibold text-slate-600 mb-1">
                                Overtime Rate per Hour (₹ flat, 0 to use parking
                                slot rate)
                            </Text>
                            <TextInput
                                mode="outlined"
                                keyboardType="numeric"
                                placeholder="10"
                                value={overtimeRatePerHour}
                                onChangeText={setOvertimeRatePerHour}
                                activeOutlineColor="#0284c7"
                                outlineColor="#cbd5e1"
                                className="bg-white"
                                left={<TextInput.Icon icon="cash" />}
                            />
                        </View>
                    </View>

                    <Button
                        mode="contained"
                        onPress={handleSaveOvertimeSettings}
                        loading={savingOvertime}
                        disabled={savingOvertime}
                        buttonColor="#0284c7"
                        className="rounded-xl py-0.5 mt-4"
                        labelStyle={{ fontWeight: "bold", fontSize: 13 }}
                    >
                        Save Overtime Policies
                    </Button>
                </Card.Content>
            </Card>

            {/* Zoning Classifications Card */}
            <Card className="bg-white border border-slate-100 rounded-3xl elevation-1 overflow-hidden mb-5">
                <Card.Content className="p-5">
                    <View className="flex-row items-center mb-3">
                        <Avatar.Icon
                            size={36}
                            icon="map-marker-radius"
                            style={{ backgroundColor: "#fef3c7" }}
                            color="#b45309"
                        />
                        <View className="ml-3 flex-1">
                            <Text className="text-base font-bold text-slate-800">
                                Zoning Classifications
                            </Text>
                            <Text className="text-xs text-slate-400">
                                Categories available when approving partner
                                agencies
                            </Text>
                        </View>
                    </View>

                    {/* Active Zoning Chips */}
                    <View className="flex-row flex-wrap gap-2 mb-3">
                        {zoningTypes.map((type) => {
                            const isDefault =
                                DEFAULT_ZONING_LIST.includes(type);
                            return (
                                <Chip
                                    key={type}
                                    className="mb-1 bg-slate-100 border border-slate-200"
                                    onClose={
                                        !isDefault
                                            ? () => handleDeleteZoning(type)
                                            : undefined
                                    }
                                    textStyle={{
                                        fontSize: 11,
                                        fontWeight: "600",
                                        color: "#334155",
                                    }}
                                >
                                    {type} {isDefault ? "(Default)" : ""}
                                </Chip>
                            );
                        })}
                    </View>

                    {/* Add Zoning Type Input */}
                    <View className="flex-row items-center gap-2 mt-1">
                        <TextInput
                            mode="outlined"
                            placeholder="Add custom zoning classification..."
                            value={newZoningInput}
                            onChangeText={setNewZoningInput}
                            activeOutlineColor="#b45309"
                            outlineColor="#cbd5e1"
                            className="bg-white flex-1 h-11"
                            dense
                        />
                        <Button
                            mode="contained"
                            onPress={handleAddZoning}
                            loading={savingZoning}
                            disabled={savingZoning || !newZoningInput.trim()}
                            buttonColor="#b45309"
                            className="rounded-xl h-11 justify-center"
                            labelStyle={{ fontWeight: "700", fontSize: 12 }}
                        >
                            Add
                        </Button>
                    </View>
                </Card.Content>
            </Card>

            {/* Terms & Conditions (Customer) */}
            <Card className="bg-white border border-slate-100 rounded-3xl elevation-1 overflow-hidden mb-5">
                <Card.Content className="p-5">
                    <View className="flex-row items-center mb-2">
                        <Avatar.Icon
                            size={36}
                            icon="file-document-outline"
                            style={{ backgroundColor: "#e0e7ff" }}
                            color="#ff9933"
                        />
                        <View className="ml-3 flex-1">
                            <Text className="text-base font-bold text-slate-800">
                                Customer Signup Terms & Conditions
                            </Text>
                            <Text className="text-xs text-slate-400">
                                Terms shown to users during registration
                            </Text>
                        </View>
                    </View>

                    <TextInput
                        mode="outlined"
                        label="Customer Terms & Conditions"
                        placeholder="Enter terms and conditions for normal users..."
                        value={userTerms}
                        onChangeText={setUserTerms}
                        multiline
                        numberOfLines={6}
                        activeOutlineColor="#ff9933"
                        outlineColor="#cbd5e1"
                        className="bg-white mb-3 mt-2"
                    />

                    <Button
                        mode="contained"
                        onPress={handleSaveUserTerms}
                        loading={savingUserTerms}
                        disabled={savingUserTerms}
                        className="bg-indigo-700 rounded-xl py-0.5"
                        labelStyle={{ fontWeight: "bold", fontSize: 13 }}
                    >
                        Save Customer Terms
                    </Button>
                </Card.Content>
            </Card>

            {/* Terms & Conditions (Agency) */}
            <Card className="bg-white border border-slate-100 rounded-3xl elevation-1 overflow-hidden mb-5">
                <Card.Content className="p-5">
                    <View className="flex-row items-center mb-2">
                        <Avatar.Icon
                            size={36}
                            icon="domain"
                            style={{ backgroundColor: "#fef3c7" }}
                            color="#b45309"
                        />
                        <View className="ml-3 flex-1">
                            <Text className="text-base font-bold text-slate-800">
                                Partner Agency Terms & Conditions
                            </Text>
                            <Text className="text-xs text-slate-400">
                                Terms shown to parking owners during
                                registration
                            </Text>
                        </View>
                    </View>

                    <TextInput
                        mode="outlined"
                        label="Agency Terms & Conditions"
                        placeholder="Enter terms and conditions for partner agencies..."
                        value={agencyTerms}
                        onChangeText={setAgencyTerms}
                        multiline
                        numberOfLines={6}
                        activeOutlineColor="#b45309"
                        outlineColor="#cbd5e1"
                        className="bg-white mb-3 mt-2"
                    />

                    <Button
                        mode="contained"
                        onPress={handleSaveAgencyTerms}
                        loading={savingAgencyTerms}
                        disabled={savingAgencyTerms}
                        buttonColor="#b45309"
                        className="rounded-xl py-0.5"
                        labelStyle={{ fontWeight: "bold", fontSize: 13 }}
                    >
                        Save Agency Terms
                    </Button>
                </Card.Content>
            </Card>
        </ScrollView>
    );
}
