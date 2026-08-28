import React from "react";
import { FlatList, View, TouchableOpacity, Linking } from "react-native";
import { Card, Avatar, Text, Divider, Button } from "react-native-paper";
import { MaterialDesignIcons } from "@react-native-vector-icons/material-design-icons";
import { imageBaseURL } from "../../utils/baseURL";

export default function VehicleRequestsTab({
    data,
    onApprove,
    onReject,
}) {
    const getImageUrl = (path) => {
        if (!path) return null;
        const cleanPath = path.startsWith("uploads/")
            ? path.substring(8)
            : path;
        return `${imageBaseURL}${cleanPath}`;
    };

    return (
        <FlatList
            data={data}
            keyExtractor={(item) => String(item.requestId || `${item.userId}_${item.vehicleNumber}`)}
            contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
            renderItem={({ item }) => {
                const docs = Array.isArray(item.documents) ? item.documents : [];
                return (
                    <Card className="mb-4 bg-white border border-slate-100 rounded-xl elevation-1">
                        <Card.Content className="pb-3">
                            <View className="flex-row items-center justify-between">
                                <View className="flex-row items-center flex-1 pr-2">
                                    <Avatar.Icon
                                        size={46}
                                        icon="car"
                                        style={{
                                            backgroundColor: "#e0e7ff",
                                        }}
                                        color="#4338ca"
                                    />
                                    <View className="ml-3 flex-1">
                                        <Text
                                            className="text-base font-extrabold text-slate-800 tracking-wider"
                                            numberOfLines={1}
                                        >
                                            {item.vehicleNumber}
                                        </Text>
                                        <Text
                                            className="text-xs text-slate-500"
                                            numberOfLines={1}
                                        >
                                            User: {item.userName || item.userUsername} • {item.userPhone || "No Phone"}
                                        </Text>
                                    </View>
                                </View>
                                <View className="bg-amber-100 px-2 py-0.5 rounded">
                                    <Text className="text-amber-800 font-bold text-xs">
                                        Pending Vehicle
                                    </Text>
                                </View>
                            </View>

                            <Divider className="my-3 bg-slate-100" />

                            <View className="gap-1 mb-2">
                                <Text className="text-xs text-slate-600" numberOfLines={1}>
                                    <Text className="font-semibold">Email:</Text> {item.userEmail || "N/A"}
                                </Text>
                                {Boolean(item.createdAt) && (
                                    <Text className="text-xs text-slate-500">
                                        <Text className="font-semibold">Submitted:</Text>{" "}
                                        {new Date(item.createdAt).toLocaleString()}
                                    </Text>
                                )}
                            </View>

                            {/* Verification Documents */}
                            <View className="mt-1 pt-2 border-t border-slate-100">
                                <Text className="text-xs font-bold text-slate-700 mb-1.5 flex-row items-center">
                                    Uploaded Documents ({docs.length}):
                                </Text>
                                {docs.length === 0 ? (
                                    <Text className="text-xs text-slate-400 italic">
                                        No documents attached.
                                    </Text>
                                ) : (
                                    <View className="flex-row flex-wrap gap-1.5">
                                        {docs.map((doc, dIdx) => (
                                            <TouchableOpacity
                                                key={dIdx}
                                                onPress={() => {
                                                    if (doc.url) {
                                                        Linking.openURL(getImageUrl(doc.url));
                                                    }
                                                }}
                                                className="flex-row items-center bg-indigo-50 border border-indigo-200 px-2.5 py-1.5 rounded-lg mr-1 mb-1"
                                            >
                                                <MaterialDesignIcons
                                                    name="file-document-outline"
                                                    size={15}
                                                    color="#4338ca"
                                                />
                                                <Text
                                                    className="text-indigo-800 text-xs font-semibold ml-1.5 mr-1 max-w-[170px]"
                                                    numberOfLines={1}
                                                >
                                                    {doc.name || `Document ${dIdx + 1}`}
                                                </Text>
                                                <MaterialDesignIcons
                                                    name="open-in-new"
                                                    size={13}
                                                    color="#4338ca"
                                                />
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                )}
                            </View>
                        </Card.Content>

                        <Card.Actions className="border-t border-slate-50 px-4 py-2 flex-row gap-2 bg-slate-50/50 rounded-b-xl">
                            <Button
                                mode="outlined"
                                onPress={() => onReject(item)}
                                textColor="#dc2626"
                                className="flex-1 rounded-lg border-red-200"
                                labelStyle={{ fontWeight: "700" }}
                            >
                                Reject
                            </Button>
                            <Button
                                mode="contained"
                                onPress={() => onApprove(item)}
                                buttonColor="#16a34a"
                                className="flex-1 rounded-lg"
                                labelStyle={{
                                    color: "white",
                                    fontWeight: "700",
                                }}
                            >
                                Approve
                            </Button>
                        </Card.Actions>
                    </Card>
                );
            }}
            ListEmptyComponent={
                <View className="items-center justify-center pt-20">
                    <Avatar.Icon
                        size={64}
                        icon="check-decagram"
                        style={{ backgroundColor: "#f0fdf4" }}
                        color="#16a34a"
                    />
                    <Text className="text-lg font-bold text-slate-700 mt-4">
                        All Clear!
                    </Text>
                    <Text className="text-sm text-slate-400 text-center mt-1 px-8">
                        There are no pending vehicle registration requests.
                    </Text>
                </View>
            }
        />
    );
}
