import React from "react";
import { View, Image, ScrollView, Dimensions } from "react-native";
import { Modal, Text, Button, Card, Divider, Avatar, IconButton } from "react-native-paper";
import { imageBaseURL } from "../../utils/baseURL";

const { height } = Dimensions.get("window");

export default function WalletDetailsModal({
    visible,
    onDismiss,
    request,
    onApprove,
    onReject,
}) {
    if (!request) return null;

    const getImageUrl = (path) => {
        if (!path) return null;
        // If path starts with uploads/, remove it since index.js serves upload directory under /images
        const cleanPath = path.startsWith("uploads/") ? path.substring(8) : path;
        return `${imageBaseURL}${cleanPath}`;
    };

    const imageUrl = getImageUrl(request.screenshotPath);

    return (
        <Modal
            visible={visible}
            onDismiss={onDismiss}
            contentContainerStyle={{
                backgroundColor: "white",
                padding: 24,
                margin: 20,
                borderRadius: 24,
                maxHeight: "90%",
            }}
        >
            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View className="flex-row items-center justify-between mb-4">
                    <View>
                        <Text className="text-lg font-bold text-slate-800">Wallet Recharge Request</Text>
                        <Text className="text-xs text-slate-400">Review payment details and verify transaction</Text>
                    </View>
                    <IconButton
                        icon="close"
                        size={20}
                        onPress={onDismiss}
                        className="m-0"
                    />
                </View>

                {/* User Info Card */}
                <Card className="mb-4 bg-slate-50 border border-slate-100 rounded-2xl elevation-0">
                    <Card.Content className="p-4 flex-row items-center">
                        <Avatar.Text
                            size={44}
                            label={request.userName?.substring(0, 2).toUpperCase() || "US"}
                            style={{ backgroundColor: "#818cf8" }}
                            labelStyle={{ color: "white", fontWeight: "bold" }}
                        />
                        <View className="ml-3 flex-1">
                            <Text className="text-base font-bold text-slate-800">{request.userName}</Text>
                            <Text className="text-xs text-slate-500">Username: {request.username} • {request.email}</Text>
                        </View>
                    </Card.Content>
                </Card>

                {/* Details Section */}
                <View className="gap-3 mb-5 px-1">
                    <View className="flex-row justify-between items-center">
                        <Text className="text-sm font-semibold text-slate-500">Requested Amount</Text>
                        <Text className="text-2xl font-extrabold text-indigo-600">₹{request.amount.toFixed(2)}</Text>
                    </View>

                    <Divider className="bg-slate-100 my-1" />

                    <View className="flex-row justify-between items-center">
                        <Text className="text-sm font-semibold text-slate-500">Transaction ID / Ref No.</Text>
                        <Text className="text-sm font-bold text-slate-800">{request.transactionNumber || "N/A"}</Text>
                    </View>

                    <Divider className="bg-slate-100 my-1" />

                    <Text className="text-sm font-semibold text-slate-500 mb-1">Payment Receipt / Screenshot</Text>

                    {imageUrl ? (
                        <View className="border border-slate-100 rounded-2xl overflow-hidden bg-slate-50 items-center justify-center p-2 shadow-inner">
                            <Image
                                source={{ uri: imageUrl }}
                                style={{ width: "100%", height: 260 }}
                                resizeMode="contain"
                                className="rounded-xl"
                            />
                        </View>
                    ) : (
                        <View className="py-8 bg-slate-50 border border-dashed border-slate-200 rounded-2xl items-center justify-center">
                            <Avatar.Icon size={44} icon="image-off" style={{ backgroundColor: "transparent" }} color="#94a3b8" />
                            <Text className="text-xs text-slate-400 mt-2">No screenshot uploaded</Text>
                        </View>
                    )}
                </View>

                {/* Action Buttons */}
                <View className="flex-row gap-3 mt-2">
                    <Button
                        mode="outlined"
                        onPress={() => {
                            onReject(request);
                            onDismiss();
                        }}
                        textColor="#dc2626"
                        className="flex-1 rounded-xl border-red-200 py-0.5"
                        labelStyle={{ fontWeight: "700" }}
                    >
                        Reject
                    </Button>
                    <Button
                        mode="contained"
                        onPress={() => {
                            onApprove(request);
                            onDismiss();
                        }}
                        buttonColor="#16a34a"
                        className="flex-1 rounded-xl py-0.5"
                        labelStyle={{ color: "white", fontWeight: "700" }}
                    >
                        Approve
                    </Button>
                </View>
            </ScrollView>
        </Modal>
    );
}
