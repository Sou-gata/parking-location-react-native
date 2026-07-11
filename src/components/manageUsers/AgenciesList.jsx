import React from "react";
import { View, FlatList, Pressable } from "react-native";
import { Card, Avatar, Text, Badge, IconButton } from "react-native-paper";

export default function AgenciesList({ agencies, onPressAgency }) {
    return (
        <FlatList
            data={agencies}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
            renderItem={({ item }) => (
                <Pressable onPress={() => onPressAgency(item)}>
                    <Card className="mb-4 bg-white border border-slate-100 rounded-xl elevation-1">
                        <Card.Content className="pb-3 flex-row items-center justify-between">
                            <View className="flex-row items-center flex-1 pr-4">
                                <Avatar.Icon
                                    size={48}
                                    icon="office-building"
                                    style={{
                                        backgroundColor: "#e0e7ff",
                                    }}
                                    color="#4338ca"
                                />
                                <View className="ml-3 flex-1">
                                    <Text
                                        className="text-base font-bold text-slate-800"
                                        numberOfLines={1}
                                    >
                                        {item.name}
                                    </Text>
                                    <Text
                                        className="text-xs text-slate-500"
                                        numberOfLines={1}
                                    >
                                        Admin: {item.owner} • {item.phone_number || "No Phone"}
                                    </Text>
                                    <Text
                                        className="text-xs text-slate-400 mt-0.5"
                                        numberOfLines={1}
                                    >
                                        {item.address || "No Address"}
                                    </Text>
                                </View>
                            </View>
                            <View className="items-end">
                                <Badge className="bg-indigo-100 text-indigo-800 font-bold px-2 py-0.5 rounded text-xs mb-1">
                                    {item.users?.length || 0} Users
                                </Badge>
                                <IconButton
                                    icon="chevron-right"
                                    iconColor="#4338ca"
                                    size={24}
                                    style={{
                                        margin: 0,
                                        marginRight: -8,
                                    }}
                                />
                            </View>
                        </Card.Content>
                    </Card>
                </Pressable>
            )}
            ListEmptyComponent={
                <View className="items-center justify-center pt-20">
                    <Avatar.Icon
                        size={64}
                        icon="office-building-off"
                        style={{ backgroundColor: "#f8fafc" }}
                        color="#64748b"
                    />
                    <Text className="text-lg font-bold text-slate-700 mt-4">
                        No Agencies Found
                    </Text>
                    <Text className="text-sm text-slate-400 text-center mt-1 px-8">
                        No active agencies match your search query.
                    </Text>
                </View>
            }
        />
    );
}
