import React, { useState, useEffect } from "react";
import { View, ScrollView, Image, Text, TouchableOpacity } from "react-native";
import { Modal, Divider, Button, Card, Badge, Avatar, IconButton } from "react-native-paper";
import { imageBaseURL } from "../../utils/baseURL";
import apiService from "../../utils/apiService";
import MediaViewerModal from "../MediaViewerModal";

export default function AgencyDetailsModal({
    visible,
    onDismiss,
    agency,
}) {
    if (!agency) return null;

    const [mediaItems, setMediaItems] = useState([]);
    const [viewerState, setViewerState] = useState({
        visible: false,
        media: null,
    });

    useEffect(() => {
        if (visible && agency?.id) {
            apiService
                .get(`agencies/${agency.id}/media`)
                .then((res) => {
                    if (res && res.success) {
                        setMediaItems(res.data || []);
                    }
                })
                .catch((e) => console.error("Error fetching agency media:", e));
        }
    }, [visible, agency?.id]);

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

    const profilePhotoUrl = getImageUrl(agency.profile_photo_path);
    const docPhotoUrl = getImageUrl(agency.verification_document_path);
    const aadhaarPhotoUrl = getImageUrl(agency.aadhaar_card_path);
    const tradeLicenseDocUrl = getImageUrl(agency.trade_license_document_path);

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
                <View className="bg-indigo-100 px-2 py-0.5 rounded"><Text className="text-indigo-800 font-bold text-xs uppercase">{String("                     " + (agency.status || "Active") + "                 ").trim()}</Text></View>
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

                {/* Commission & Financials */}
                <Card className="mb-4 bg-emerald-50/60 border border-emerald-100 rounded-xl" elevation={0}>
                    <Card.Content className="p-3 flex-row justify-around items-center">
                        <View className="items-center">
                            <Text className="text-xs font-semibold text-slate-500 uppercase">Commission Rate</Text>
                            <Text className="text-lg font-bold text-emerald-800 mt-0.5">
                                {parseFloat(agency.commission_percentage || 0).toFixed(2)}%
                            </Text>
                        </View>
                        <View className="h-8 w-[1px] bg-emerald-200" />
                        <View className="items-center">
                            <Text className="text-xs font-semibold text-slate-500 uppercase">Agency Balance</Text>
                            <Text className="text-lg font-bold text-indigo-900 mt-0.5">
                                ₹{parseFloat(agency.wallet_balance || 0).toFixed(2)}
                            </Text>
                        </View>
                        <View className="h-8 w-[1px] bg-emerald-200" />
                        <View className="items-center">
                            <Text className="text-xs font-semibold text-slate-500 uppercase">Approval Mode</Text>
                            <Text className="text-xs font-bold text-amber-800 mt-1">
                                {Boolean(
                                    agency.require_booking_approval !== undefined
                                        ? agency.require_booking_approval
                                        : agency.requireBookingApproval
                                )
                                    ? "Manual Approval"
                                    : "Auto Approved"}
                            </Text>
                        </View>
                    </Card.Content>
                </Card>

                {/* Compliance & Clearances Grid */}
                <Text className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-2">
                    Compliance & Clearances
                </Text>
                <View className="flex-row flex-wrap justify-between mb-4 gap-y-2">
                    {[
                        { label: "CCTV Available", val: agency.cctv_available },
                        { label: "Trade License", val: agency.trade_license },
                        { label: "Zoning Clearance", val: agency.zoning_clearance },
                        { label: "Shops & Est. License", val: agency.shops_establishment_license },
                        { label: "GST Registration", val: agency.gst_registration },
                    ].map((comp, i) => (
                        <View key={i} className="w-[48%] p-2 bg-slate-50 rounded-lg border border-slate-100 flex-row items-center justify-between">
                            <Text className="text-xs text-slate-600 font-semibold flex-1 mr-1">{comp.label}</Text>
                            <View className={comp.val ? "bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded" : "bg-slate-200 text-slate-600 px-2 py-0.5 rounded"}><Text className="font-bold text-xs">{comp.val ? "YES" : "NO"}</Text></View>
                        </View>
                    ))}
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
                            {agency.latitude || 0}, {agency.longitude || 0}
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
                        { label: "2W", val: agency.two_wheeler_rate },
                        { label: "3W", val: agency.three_wheeler_rate },
                        { label: "Car", val: agency.car_rate },
                        { label: "SUV", val: agency.suv_rate },
                        { label: "Van", val: agency.van_rate },
                        { label: "Pickup", val: agency.pickup_rate },
                        { label: "EV", val: agency.ev_rate },
                    ].map((rate, i) => (
                        <View key={i} className="w-[13%] bg-emerald-50/70 p-1.5 rounded-lg items-center border border-emerald-100">
                            <Text className="text-[10px] text-slate-500 font-semibold">{rate.label}</Text>
                            <Text className="text-xs font-bold text-emerald-800 mt-0.5">₹{rate.val || 0}</Text>
                        </View>
                    ))}
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

                {/* 5.5. Trade License Document (only if trade_license is true) */}
                {Boolean(agency.trade_license) && (
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

                {/* 6. Organization Photos & Videos Gallery (Super Admin Approvals) */}
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

            <MediaViewerModal
                visible={viewerState.visible}
                onDismiss={() => setViewerState({ visible: false, media: null })}
                media={viewerState.media}
            />
        </Modal>
    );
}
