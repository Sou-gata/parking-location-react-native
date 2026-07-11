import React, { useState, useEffect } from "react";
import { View, ScrollView, ActivityIndicator } from "react-native";
import { Text, Card, TextInput, Button, Avatar } from "react-native-paper";
import apiService from "../utils/apiService";
import useToast from "../hooks/useToast";

export default function SuperAdminSettings() {
    const toast = useToast();
    const [upiId, setUpiId] = useState("");
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    const fetchConfig = async () => {
        setLoading(true);
        try {
            const res = await apiService.get("wallets/config");
            if (res && res.success) {
                setUpiId(res.data.upiId);
            } else {
                toast.error(res?.message || "Failed to load configuration", "Error", true);
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

    const handleSave = async () => {
        if (!upiId || upiId.trim() === "") {
            toast.error("UPI ID cannot be empty", "Validation Error", true);
            return;
        }

        // basic upi regex pattern matching
        const upiPattern = /^[\w\.\-_]+@[\w\-]+$/;
        if (!upiPattern.test(upiId.trim())) {
            toast.error("Please enter a valid UPI ID (e.g., merchant@bank)", "Validation Error", true);
            return;
        }

        setSaving(true);
        try {
            const res = await apiService.post("wallets/config", { upiId: upiId.trim() });
            if (res && res.success) {
                toast.success("UPI ID configuration updated successfully!", "Success", true);
            } else {
                toast.error(res?.message || "Failed to save configuration", "Error", true);
            }
        } catch (error) {
            console.error("Error saving config:", error);
            toast.error("Failed to save settings", "Error", true);
        } finally {
            setSaving(false);
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
        <ScrollView className="flex-1 bg-slate-50" contentContainerStyle={{ padding: 20 }}>
            <Card className="bg-white border border-slate-100 rounded-3xl elevation-1 overflow-hidden">
                <View className="bg-indigo-700 p-6 flex-row items-center justify-between">
                    <View>
                        <Text className="text-white text-xl font-bold">System Configuration</Text>
                        <Text className="text-indigo-200 text-xs mt-1">Configure global settings for the app</Text>
                    </View>
                    <Avatar.Icon size={46} icon="cog" style={{ backgroundColor: "#4f46e5" }} color="#fff" />
                </View>

                <Card.Content className="p-6 gap-6">
                    <View>
                        <Text className="text-sm font-bold text-slate-800 mb-2">Merchant UPI Details</Text>
                        <Text className="text-xs text-slate-400 mb-4">
                            This UPI ID will be used to dynamically generate QR codes for users to add money to their wallets. Make sure it is active and linked to the business account.
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
                            className="bg-white"
                        />
                    </View>

                    <Button
                        mode="contained"
                        onPress={handleSave}
                        loading={saving}
                        disabled={saving}
                        className="bg-indigo-600 rounded-xl py-1 mt-2"
                        labelStyle={{ fontWeight: "bold", fontSize: 15 }}
                    >
                        Save Configuration
                    </Button>
                </Card.Content>
            </Card>
        </ScrollView>
    );
}
