import React from "react";
import { View, ScrollView, Image, Text } from "react-native";
import { Modal, Divider, Button, Card, Badge, Avatar, IconButton } from "react-native-paper";
import { imageBaseURL } from "../../utils/baseURL";

export default function AgencyDetailsModal({
    visible,
    onDismiss,
    agency,
}) {
    if (!agency) return null;

    // Helper to clean path and construct full URL
    const getImageUrl = (path) => {
        if (!path) return null;
        const cleanPath = path.startsWith("uploads/") ? path.substring(8) : path;
        return `${imageBaseURL}${cleanPath}`;
    };

    const profilePhotoUrl = getImageUrl(agency.profile_photo_path);
    const docPhotoUrl = getImageUrl(agency.verification_document_path);
    const aadhaarPhotoUrl = getImageUrl(agency.aadhaar_card_path);

    return (
        <Modal
            visible={visible}
            onDismiss={onDismiss}
            className="bg-white p-6 m-4 rounded-2xl max-w-[600px] self-center w-[92%] max-h-[85%]"
        >
            <View className="flex-row justify-between items-center mb-3">
                <Text className="text-xl font-bold text-slate-800 flex-1 mr-2" numberOfLines={1}>
                    {agency.name}
                </Text>
                <Badge className="bg-indigo-100 text-indigo-800 font-bold px-2 py-0.5 rounded text-xs uppercase">
                    {agency.status || "Active"}
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
                            style={{ backgroundColor: "#e0e7ff" }}
                            color="#4338ca"
                        />
                    )}
                    <View className="ml-4 flex-1">
                        <Text className="text-sm font-semibold text-slate-500">
                            <Text className="font-semibold text-slate-500">Owner: </Text>
                            <Text className="text-slate-800 font-bold">{agency.owner}</Text>
                        </Text>
                        <Text className="text-sm font-semibold text-slate-500 mt-0.5">
                            <Text className="font-semibold text-slate-500">Username: </Text>
                            <Text className="text-slate-700 font-medium">@{agency.username}</Text>
                        </Text>
                        <Text className="text-sm font-semibold text-slate-500 mt-0.5">
                            <Text className="font-semibold text-slate-500">Phone: </Text>
                            <Text className="text-slate-700">{agency.phone_number || "N/A"}</Text>
                        </Text>
                    </View>
                </View>

                {/* Email, Address, Landmark, Coordinates */}
                <Card className="mb-4 bg-slate-50 border border-slate-100 rounded-xl" elevation={0}>
                    <Card.Content className="p-3 gap-2">
                        <Text className="text-sm text-slate-600">
                            <Text className="font-semibold text-slate-700">Email: </Text>
                            {agency.email}
                        </Text>
                        <Text className="text-sm text-slate-600">
                            <Text className="font-semibold text-slate-700">Address: </Text>
                            {agency.address || "N/A"}
                        </Text>
                        <Text className="text-sm text-slate-600">
                            <Text className="font-semibold text-slate-700">Landmark: </Text>
                            {agency.landmark || "N/A"}
                        </Text>
                        <Text className="text-sm text-slate-600">
                            <Text className="font-semibold text-slate-700">Coordinates: </Text>
                            {`${agency.latitude || 0}, ${agency.longitude || 0}`}
                        </Text>
                    </Card.Content>
                </Card>

                {/* 2. Capacities Grid */}
                <Text className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-2">
                    Parking Capacities
                </Text>
                <View className="flex-row flex-wrap justify-between mb-4">
                    {[
                        { label: "2 Wheeler", val: agency.two_wheeler_capacity },
                        { label: "3 Wheeler", val: agency.three_wheeler_capacity },
                        { label: "Car", val: agency.car_capacity },
                        { label: "SUV", val: agency.suv_capacity },
                        { label: "Van", val: agency.van_capacity },
                        { label: "Pickup", val: agency.pickup_capacity },
                        { label: "EV Spots", val: agency.ev_capacity },
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
                            {agency.ev_charging_support ? "YES" : "NO"}
                        </Text>
                    </View>
                </View>

                {/* 3. Rates Grid */}
                <Text className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-2">
                    Hourly Rates (₹)
                </Text>
                <View className="flex-row flex-wrap justify-between mb-4">
                    {[
                        { label: "2 Wheeler", rate: agency.two_wheeler_rate },
                        { label: "3 Wheeler", rate: agency.three_wheeler_rate },
                        { label: "Car", rate: agency.car_rate },
                        { label: "SUV", rate: agency.suv_rate },
                        { label: "Van", rate: agency.van_rate },
                        { label: "Pickup", rate: agency.pickup_rate },
                        { label: "EV", rate: agency.ev_rate },
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
            <View className="flex-row justify-center mt-1 pb-4">
                <Button
                    mode="contained"
                    onPress={onDismiss}
                    buttonColor="#4338ca"
                    textColor="white"
                    className="w-full rounded-xl py-0.5"
                    labelStyle={{ fontWeight: "700" }}
                >
                    Close
                </Button>
            </View>
        </Modal>
    );
}
