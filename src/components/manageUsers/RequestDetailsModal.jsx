import React, { useState, useEffect } from "react";
import { View, ScrollView, Image, TouchableOpacity, Modal, TouchableWithoutFeedback } from "react-native";
import { Text, Divider, Button, Card, Avatar, IconButton } from "react-native-paper";
import { imageBaseURL } from "../../utils/baseURL";
import apiService from "../../utils/apiService";
import MediaViewerModal from "../MediaViewerModal";

export default function RequestDetailsModal({
    visible,
    onDismiss,
    request,
    onApprove,
    onReject,
}) {
    if (!request) return null;

    const [mediaItems, setMediaItems] = useState(request.media || []);
    const [viewerState, setViewerState] = useState({
        visible: false,
        media: null,
    });

    useEffect(() => {
        setMediaItems(request.media || []);
    }, [request]);

    const handleMediaStatus = async (mediaId, newStatus) => {
        try {
            await apiService.patch(`agencies/media/${mediaId}/status`, {
                status: newStatus,
            });
            setMediaItems((prev) =>
                prev.map((item) =>
                    item.media_id === mediaId ? { ...item, status: newStatus } : item
                )
            );
        } catch (error) {
            console.error("Error updating media status:", error);
        }
    };

    // Helper to clean path and construct full URL
    const getImageUrl = (path) => {
        if (!path) return null;
        const cleanPath = path.startsWith("uploads/") ? path.substring(8) : path;
        return `${imageBaseURL}${cleanPath}`;
    };

    const profilePhotoUrl = getImageUrl(request.profile_photo_path);
    const docPhotoUrl = getImageUrl(request.verification_document_path);
    const aadhaarPhotoUrl = getImageUrl(request.aadhaar_card_path);
    const tradeLicenseDocUrl = getImageUrl(request.trade_license_document_path);

    return (
        <Modal
            visible={Boolean(visible)}
            transparent={true}
            animationType="fade"
            onRequestClose={onDismiss}
        >
            <TouchableWithoutFeedback onPress={onDismiss}>
                <View className="flex-1 bg-black/50 justify-center items-center p-4">
                    <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
                        <View className="bg-white rounded-3xl p-5 w-[92%] max-w-[600px] max-h-[85%] shadow-2xl">
            <View className="flex-row justify-between items-center mb-3">
                <Text className="text-xl font-bold text-slate-800 flex-1 mr-2" numberOfLines={1}>
                    {request.name}
                </Text>
                <View className="bg-amber-100 px-2 py-0.5 rounded"><Text className="text-amber-800 font-bold text-xs">Pending</Text></View>
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

                {/* Compliance & Clearances Grid */}
                <Text className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-2">
                    Compliance & Clearances
                </Text>
                <View className="flex-row flex-wrap justify-between mb-4 gap-y-2">
                    {[
                        { label: "CCTV Available", val: request.cctv_available },
                        { label: "Trade License", val: request.trade_license },
                        { label: "Zoning Clearance", val: request.zoning_clearance },
                        { label: "Shops & Est. License", val: request.shops_establishment_license },
                        { label: "GST Registration", val: request.gst_registration },
                    ].map((comp, i) => (
                        <View key={i} className="w-[48%] p-2 bg-slate-50 rounded-lg border border-slate-100 flex-row items-center justify-between">
                            <Text className="text-xs text-slate-600 font-semibold flex-1 mr-1">{comp.label}</Text>
                            <View className={comp.val ? "bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded" : "bg-slate-200 text-slate-600 px-2 py-0.5 rounded"}><Text className="font-bold text-xs">{comp.val ? "YES" : "NO"}</Text></View>
                        </View>
                    ))}
                </View>

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
                        { label: "EV", val: request.ev_capacity },
                    ].map((cap, i) => (
                        <View key={i} className="w-[31%] mb-2 p-2 bg-slate-50 rounded-lg border border-slate-100 items-center">
                            <Text className="text-xs text-slate-500 font-medium">{cap.label}</Text>
                            <Text className="text-base font-bold text-slate-800 mt-0.5">{cap.val || 0}</Text>
                        </View>
                    ))}
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
                    Aadhaar Card Document
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

                {/* 5.5. Trade License Document (only if trade_license is true) */}
                {Boolean(request.trade_license) && (
                    <>
                        <Text className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-2">
                            Trade License Document
                        </Text>
                        {tradeLicenseDocUrl ? (
                            <View className="mb-4 border border-amber-200 rounded-xl overflow-hidden bg-amber-50">
                                <Image
                                    source={{ uri: tradeLicenseDocUrl }}
                                    className="w-full h-40"
                                    resizeMode="contain"
                                />
                            </View>
                        ) : (
                            <View className="mb-4 p-4 rounded-xl border border-dashed border-amber-300 bg-amber-50/50 items-center justify-center">
                                <IconButton icon="file-certificate-outline" size={32} iconColor="#d97706" />
                                <Text className="text-xs text-amber-600 text-center font-semibold">
                                    No Trade License document uploaded
                                </Text>
                            </View>
                        )}
                    </>
                )}

                {/* 6. Organization Photos & Videos (Super Admin Approval) */}
                <Text className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-2">
                    Organization Media ({mediaItems.length})
                </Text>
                {mediaItems.length > 0 ? (
                    <View className="mb-6 flex-row flex-wrap justify-between gap-y-3">
                        {mediaItems.map((m) => {
                            const mediaUrl = getImageUrl(m.pending_file_path || m.file_path);
                            const isApproved = m.status === "approved";
                            const isRejected = m.status === "rejected";

                            return (
                                <View
                                    key={m.media_id}
                                    className="w-[48%] border border-slate-200 rounded-xl overflow-hidden bg-slate-50 p-2"
                                >
                                    <TouchableOpacity
                                        activeOpacity={0.85}
                                        onPress={() =>
                                            setViewerState({
                                                visible: true,
                                                media: {
                                                    uri: mediaUrl,
                                                    type: m.file_type,
                                                    title: `Media (${m.status})`,
                                                },
                                            })
                                        }
                                        className="relative w-full h-32 rounded-lg overflow-hidden bg-slate-200 items-center justify-center mb-2"
                                    >
                                        {m.file_type === "photo" ? (
                                            <Image
                                                source={{ uri: mediaUrl }}
                                                className="w-full h-full"
                                                resizeMode="cover"
                                            />
                                        ) : (
                                            <View className="items-center justify-center w-full h-full bg-slate-900/90">
                                                <IconButton icon="play-circle" iconColor="#ffffff" size={36} />
                                                <Text className="text-white text-xs font-bold">Video</Text>
                                            </View>
                                        )}
                                        <View className={`absolute top-2 left-2 px-2 py-0.5 rounded ${
                                                isApproved
                                                    ? "bg-green-600"
                                                    : isRejected
                                                    ? "bg-red-600"
                                                    : "bg-amber-500"
                                            }`}><Text className="font-bold text-xs text-white">{(m.status || "").toUpperCase()}</Text></View>
                                    </TouchableOpacity>

                                    <View className="flex-row justify-between gap-1">
                                        <Button
                                            mode={isApproved ? "contained" : "outlined"}
                                            buttonColor={isApproved ? "#16a34a" : undefined}
                                            textColor={isApproved ? "#ffffff" : "#16a34a"}
                                            className="flex-1 rounded-lg"
                                            compact
                                            onPress={() => handleMediaStatus(m.media_id, "approved")}
                                        >
                                            Approve
                                        </Button>
                                        <Button
                                            mode={isRejected ? "contained" : "outlined"}
                                            buttonColor={isRejected ? "#dc2626" : undefined}
                                            textColor={isRejected ? "#ffffff" : "#dc2626"}
                                            className="flex-1 rounded-lg"
                                            compact
                                            onPress={() => handleMediaStatus(m.media_id, "rejected")}
                                        >
                                            Reject
                                        </Button>
                                    </View>
                                </View>
                            );
                        })}
                    </View>
                ) : (
                    <View className="mb-6 p-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 items-center justify-center">
                        <Text className="text-xs text-slate-400 text-center font-semibold">
                            No photos or videos uploaded
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

            <MediaViewerModal
                visible={viewerState.visible}
                onDismiss={() => setViewerState({ visible: false, media: null })}
                media={viewerState.media}
            />
                        </View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
}
