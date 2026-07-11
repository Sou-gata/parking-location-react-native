import React from "react";
import { View, ScrollView, Image } from "react-native";
import { Modal, Text, Divider, Button, Card, Badge, Avatar, IconButton } from "react-native-paper";
import { imageBaseURL } from "../../utils/baseURL";

export default function RequestDetailsModal({
    visible,
    onDismiss,
    request,
    onApprove,
    onReject,
}) {
    if (!request) return null;

    // Helper to clean path and construct full URL
    const getImageUrl = (path) => {
        if (!path) return null;
        const cleanPath = path.startsWith("uploads/") ? path.substring(8) : path;
        return `${imageBaseURL}${cleanPath}`;
    };

    const profilePhotoUrl = getImageUrl(request.profile_photo_path);
    const docPhotoUrl = getImageUrl(request.verification_document_path);
    const aadhaarPhotoUrl = getImageUrl(request.aadhaar_card_path);

    return (
        <Modal
            visible={visible}
            onDismiss={onDismiss}
            className="bg-white p-6 m-4 rounded-2xl max-w-[600px] self-center w-[92%] max-h-[85%]"
        >
            <View className="flex-row justify-between items-center mb-3">
                <Text className="text-xl font-bold text-slate-800 flex-1 mr-2" numberOfLines={1}>
                    {request.name}
                </Text>
                <Badge className="bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded text-xs">
                    Pending
                </Badge>
            </View>

            <Divider className="mb-3 bg-slate-100" />

            <ScrollView showsVerticalScrollIndicator={false} className="pr-1">
                {/* 1. Profile & Basic Details */}
                <View className="flex-row items-center mb-4">
                    {profilePhotoUrl ? (
                        <Image
                            source={{ uri: profilePhotoUrl }}
                            className="w-16 h-16 rounded-full bg-slate-100 border border-slate-200"
                            resizeMode="cover"
                        />
                    ) : (
                        <Avatar.Icon
                            size={64}
                            icon="office-building"
                            style={{ backgroundColor: "#fef3c7" }}
                            color="#d97706"
                        />
                    )}
                    <View className="ml-4 flex-1">
                        <Text className="text-sm font-semibold text-slate-500">
                            Owner: <Text className="text-slate-800 font-bold">{request.owner}</Text>
                        </Text>
                        <Text className="text-sm font-semibold text-slate-500 mt-0.5">
                            Username: <Text className="text-slate-700 font-medium">@{request.username}</Text>
                        </Text>
                        <Text className="text-sm font-semibold text-slate-500 mt-0.5">
                            Phone: <Text className="text-slate-700">{request.phone_number || "N/A"}</Text>
                        </Text>
                    </View>
                </View>

                {/* Email, Address, Landmark, Coordinates */}
                <Card className="mb-4 bg-slate-50 border border-slate-100 rounded-xl" elevation={0}>
                    <Card.Content className="p-3 gap-2">
                        <Text className="text-sm text-slate-600">
                            <Text className="font-semibold text-slate-700">Email:</Text> {request.email}
                        </Text>
                        <Text className="text-sm text-slate-600">
                            <Text className="font-semibold text-slate-700">Address:</Text> {request.address || "N/A"}
                        </Text>
                        <Text className="text-sm text-slate-600">
                            <Text className="font-semibold text-slate-700">Landmark:</Text> {request.landmark || "N/A"}
                        </Text>
                        <Text className="text-sm text-slate-600">
                            <Text className="font-semibold text-slate-700">Coordinates:</Text> {request.latitude || 0}, {request.longitude || 0}
                        </Text>
                    </Card.Content>
                </Card>

                {/* 2. Capacities Grid */}
                <Text className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-2">
                    Parking Capacities
                </Text>
                <View className="flex-row flex-wrap justify-between mb-4">
                    {[
                        { label: "2 Wheeler", val: request.two_wheeler_capacity },
                        { label: "3 Wheeler", val: request.three_wheeler_capacity },
                        { label: "Car", val: request.car_capacity },
                        { label: "SUV", val: request.suv_capacity },
                        { label: "Van", val: request.van_capacity },
                        { label: "Pickup", val: request.pickup_capacity },
                        { label: "EV Spots", val: request.ev_capacity },
                    ].map((cap, i) => (
                        <View
                            key={i}
                            className="w-[30%] bg-slate-100/80 p-2 rounded-lg items-center mb-2 border border-slate-200/50"
                        >
                            <Text className="text-xs text-slate-500 font-semibold text-center">{cap.label}</Text>
                            <Text className="text-base font-bold text-slate-800 mt-0.5">{cap.val || 0}</Text>
                        </View>
                    ))}
                    <View className="w-[30%] bg-indigo-50 p-2 rounded-lg items-center mb-2 border border-indigo-100">
                        <Text className="text-[10px] text-indigo-700 font-bold text-center">EV Charging</Text>
                        <Text className="text-sm font-bold text-indigo-900 mt-1">
                            {request.ev_charging_support ? "YES" : "NO"}
                        </Text>
                    </View>
                </View>

                {/* 3. Rates Grid */}
                <Text className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-2">
                    Hourly Rates (₹)
                </Text>
                <View className="flex-row flex-wrap justify-between mb-4">
                    {[
                        { label: "2 Wheeler", rate: request.two_wheeler_rate },
                        { label: "3 Wheeler", rate: request.three_wheeler_rate },
                        { label: "Car", rate: request.car_rate },
                        { label: "SUV", rate: request.suv_rate },
                        { label: "Van", rate: request.van_rate },
                        { label: "Pickup", rate: request.pickup_rate },
                        { label: "EV", rate: request.ev_rate },
                    ].map((rt, i) => (
                        <View
                            key={i}
                            className="w-[30%] bg-emerald-50/50 p-2 rounded-lg items-center mb-2 border border-emerald-100/50"
                        >
                            <Text className="text-xs text-slate-500 font-semibold text-center">{rt.label}</Text>
                            <Text className="text-base font-bold text-emerald-800 mt-0.5">₹{rt.rate || 0}</Text>
                        </View>
                    ))}
                    <View className="w-[30%]" />
                </View>

                {/* 4. Aadhaar Card Photo */}
                <Text className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-2">
                    Aadhaar Card
                </Text>
                {aadhaarPhotoUrl ? (
                    <View className="mb-4 border border-slate-200 rounded-xl overflow-hidden bg-slate-100">
                        <Image
                            source={{ uri: aadhaarPhotoUrl }}
                            className="w-full h-40"
                            resizeMode="contain"
                        />
                    </View>
                ) : (
                    <View className="mb-4 p-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 items-center justify-center">
                        <IconButton icon="card-account-details-outline" size={32} iconColor="#94a3b8" />
                        <Text className="text-xs text-slate-400 text-center font-semibold">
                            No Aadhaar card uploaded
                        </Text>
                    </View>
                )}

                {/* 5. Address Proof Document Photo */}
                <Text className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-2">
                    Address Proof Document
                </Text>
                {docPhotoUrl ? (
                    <View className="mb-6 border border-slate-200 rounded-xl overflow-hidden bg-slate-100">
                        <Image
                            source={{ uri: docPhotoUrl }}
                            className="w-full h-40"
                            resizeMode="contain"
                        />
                    </View>
                ) : (
                    <View className="mb-6 p-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 items-center justify-center">
                        <IconButton icon="file-document-alert-outline" size={32} iconColor="#94a3b8" />
                        <Text className="text-xs text-slate-400 text-center font-semibold">
                            No Address Proof document uploaded
                        </Text>
                    </View>
                )}
            </ScrollView>

            <Divider className="my-3 bg-slate-100" />

            {/* Actions */}
            <View className="flex-row justify-between gap-3 mt-1 pb-4">
                <Button
                    mode="outlined"
                    onPress={onDismiss}
                    textColor="#64748b"
                    className="flex-1 rounded-xl"
                >
                    Close
                </Button>
                <Button
                    mode="outlined"
                    onPress={() => {
                        onDismiss();
                        onReject(request);
                    }}
                    textColor="#dc2626"
                    className="flex-1 rounded-xl border-red-200"
                    labelStyle={{ fontWeight: "700" }}
                >
                    Reject
                </Button>
                <Button
                    mode="contained"
                    onPress={() => {
                        onDismiss();
                        onApprove(request);
                    }}
                    buttonColor="#16a34a"
                    className="flex-1 rounded-xl"
                    labelStyle={{ color: "white", fontWeight: "700" }}
                >
                    Approve
                </Button>
            </View>
        </Modal>
    );
}
