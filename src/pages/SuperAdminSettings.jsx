import React, { useState, useEffect } from "react";
import { View, ScrollView, ActivityIndicator } from "react-native";
import { Text, Card, TextInput, Button, Avatar } from "react-native-paper";
import apiService from "../utils/apiService";
import useToast from "../hooks/useToast";

export default function SuperAdminSettings() {
    const toast = useToast();
    const [upiId, setUpiId] = useState("");
    const [userTerms, setUserTerms] = useState("");
    const [agencyTerms, setAgencyTerms] = useState("");

    const [loading, setLoading] = useState(false);
    const [savingUpi, setSavingUpi] = useState(false);
    const [savingUserTerms, setSavingUserTerms] = useState(false);
    const [savingAgencyTerms, setSavingAgencyTerms] = useState(false);

    const fetchConfig = async () => {
        setLoading(true);
        try {
            const [upiRes, userTermsRes, agencyTermsRes] =
                await Promise.allSettled([
                    apiService.get("wallets/config"),
                    apiService.get("config/user"),
                    apiService.get("config/agency"),
                ]);

            if (upiRes.status === "fulfilled" && upiRes.value?.success) {
                setUpiId(upiRes.value.data.upiId);
            }
            if (
                userTermsRes.status === "fulfilled" &&
                userTermsRes.value?.success
            ) {
                setUserTerms(userTermsRes.value.data.content || "");
            }
            if (
                agencyTermsRes.status === "fulfilled" &&
                agencyTermsRes.value?.success
            ) {
                setAgencyTerms(agencyTermsRes.value.data.content || "");
            }
        } catch (error) {
            console.error("Error loading config:", error);
            toast.error("Network request failed", "Error", true);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchConfig();
    }, []);

    const handleSaveUpi = async () => {
        if (!upiId || upiId.trim() === "") {
            toast.error("UPI ID cannot be empty", "Validation Error", true);
            return;
        }

        const upiPattern = /^[\w\.\-_]+@[\w\-]+$/;
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

    if (loading) {
        return (
            <View className="flex-1 justify-center items-center bg-slate-50">
                <ActivityIndicator size="large" color="#4338ca" />
            </View>
        );
    }

    return (
        <ScrollView
            className="flex-1 bg-slate-50"
            contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        >
            {/* Header */}
            <Card className="bg-white border border-slate-100 rounded-3xl elevation-1 overflow-hidden mb-6">
                <View className="bg-indigo-700 p-6 flex-row items-center justify-between">
                    <View>
                        <Text className="text-white text-xl font-bold">
                            System Configuration
                        </Text>
                        <Text className="text-indigo-200 text-xs mt-1">
                            Declare & manage global settings & policy terms
                        </Text>
                    </View>
                    <Avatar.Icon
                        size={46}
                        icon="cog"
                        style={{ backgroundColor: "#4f46e5" }}
                        color="#fff"
                    />
                </View>

                <Card.Content className="p-6 gap-6">
                    {/* Merchant UPI Section */}
                    <View>
                        <Text className="text-sm font-bold text-slate-800 mb-2">
                            Merchant UPI Details
                        </Text>
                        <Text className="text-xs text-slate-400 mb-4">
                            This UPI ID will be used to dynamically generate QR
                            codes for users to add money to their wallets. Make
                            sure it is active and linked to the business
                            account.
                        </Text>

                        <TextInput
                            mode="outlined"
                            label="Business UPI ID"
                            placeholder="e.g. merchant@ybl"
                            value={upiId}
                            onChangeText={setUpiId}
                            activeOutlineColor="#4338ca"
                            outlineColor="#cbd5e1"
                            left={<TextInput.Icon icon="qrcode" />}
                            className="bg-white mb-3"
                        />

                        <Button
                            mode="contained"
                            onPress={handleSaveUpi}
                            loading={savingUpi}
                            disabled={savingUpi}
                            className="bg-indigo-600 rounded-xl py-0.5"
                            labelStyle={{ fontWeight: "bold", fontSize: 14 }}
                        >
                            Save UPI Configuration
                        </Button>
                    </View>
                </Card.Content>
            </Card>

            {/* Customer Signup Terms & Conditions Card */}
            <Card className="bg-white border border-slate-100 rounded-3xl elevation-1 overflow-hidden mb-6">
                <Card.Content className="p-6">
                    <View className="flex-row items-center mb-2">
                        <Avatar.Icon
                            size={34}
                            icon="file-document-outline"
                            style={{ backgroundColor: "#e0e7ff" }}
                            color="#4338ca"
                        />
                        <View className="ml-3 flex-1">
                            <Text className="text-base font-bold text-slate-800">
                                Customer Signup Terms & Conditions
                            </Text>
                            <Text className="text-xs text-slate-400">
                                Terms shown to regular users during registration
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
                        numberOfLines={8}
                        activeOutlineColor="#4338ca"
                        outlineColor="#cbd5e1"
                        className="bg-white mb-4 mt-2"
                    />

                    <Button
                        mode="contained"
                        onPress={handleSaveUserTerms}
                        loading={savingUserTerms}
                        disabled={savingUserTerms}
                        className="bg-indigo-700 rounded-xl py-0.5"
                        labelStyle={{ fontWeight: "bold", fontSize: 14 }}
                    >
                        Save Customer Terms
                    </Button>
                </Card.Content>
            </Card>

            {/* Partner Agency Signup Terms & Conditions Card */}
            <Card className="bg-white border border-slate-100 rounded-3xl elevation-1 overflow-hidden mb-6">
                <Card.Content className="p-6">
                    <View className="flex-row items-center mb-2">
                        <Avatar.Icon
                            size={34}
                            icon="domain"
                            style={{ backgroundColor: "#fef3c7" }}
                            color="#b45309"
                        />
                        <View className="ml-3 flex-1">
                            <Text className="text-base font-bold text-slate-800">
                                Partner Agency Terms & Conditions
                            </Text>
                            <Text className="text-xs text-slate-400">
                                Terms shown to parking facility owners during
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
                        numberOfLines={8}
                        activeOutlineColor="#b45309"
                        outlineColor="#cbd5e1"
                        className="bg-white mb-4 mt-2"
                    />

                    <Button
                        mode="contained"
                        onPress={handleSaveAgencyTerms}
                        loading={savingAgencyTerms}
                        disabled={savingAgencyTerms}
                        buttonColor="#b45309"
                        className="rounded-xl py-0.5"
                        labelStyle={{ fontWeight: "bold", fontSize: 14 }}
                    >
                        Save Agency Terms
                    </Button>
                </Card.Content>
            </Card>
        </ScrollView>
    );
}
