import React, { useState } from "react";
import { View, FlatList } from "react-native";
import {
    Text,
    Card,
    Button,
    Avatar,
    IconButton,
    ProgressBar,
    Badge,
} from "react-native-paper";
import { STANDARD_VEHICLES, getVehicleLabel, getVehicleIcon } from "./utils";
import EditCapacityModal from "./EditCapacityModal";

export default function CapacitiesTab({
    currentAgency,
    activeBookings,
    onRefresh,
    useApi,
}) {
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [selectedCapacityItem, setSelectedCapacityItem] = useState(null);

    // Calculate capacities list dynamically
    const getCapacitiesList = () => {
        if (!currentAgency) return [];

        // 1. Map standard vehicles
        const list = Object.keys(STANDARD_VEHICLES).map((type) => {
            const key = `${type}_capacity`;
            const total = currentAgency[key] || 0;
            const parkedCount = activeBookings.filter(
                (b) =>
                    String(b.agencyId) === String(currentAgency.id) &&
                    b.status === "checked_in" &&
                    b.vehicleType === type
            ).length;

            return {
                key,
                type,
                total,
                parked: parkedCount,
            };
        });

        // 2. Map any custom vehicles ending with _capacity
        const allCapacityKeys = Object.keys(currentAgency).filter((k) =>
            k.endsWith("_capacity")
        );
        const standardKeys = Object.keys(STANDARD_VEHICLES).map(
            (type) => `${type}_capacity`
        );

        allCapacityKeys.forEach((key) => {
            if (standardKeys.includes(key)) return;
            if (
                key === "two_wheeler_capacity" ||
                key === "three_wheeler_capacity"
            )
                return;

            const type = key.replace("_capacity", "");
            const total = currentAgency[key] || 0;
            const parkedCount = activeBookings.filter(
                (b) =>
                    String(b.agencyId) === String(currentAgency.id) &&
                    b.status === "checked_in" &&
                    b.vehicleType === type
            ).length;

            list.push({
                key,
                type,
                total,
                parked: parkedCount,
            });
        });

        return list;
    };

    const capacitiesList = getCapacitiesList();

    const openEditCapacity = (cap) => {
        setSelectedCapacityItem(cap);
        setEditModalVisible(true);
    };

    const openAddCapacity = () => {
        setSelectedCapacityItem(null);
        setEditModalVisible(true);
    };

    return (
        <View className="flex-1">
            <FlatList
                data={capacitiesList}
                keyExtractor={(item) => item.key}
                contentContainerStyle={{
                    padding: 16,
                    paddingBottom: 80,
                }}
                showsVerticalScrollIndicator={false}
                ListHeaderComponent={
                    <View className="flex-row justify-between items-center mb-4">
                        <Text className="text-sm font-bold text-slate-500 uppercase tracking-wider">
                            Capacity Matrix
                        </Text>
                        <Button
                            mode="outlined"
                            onPress={openAddCapacity}
                            icon="plus"
                            compact
                            textColor="#ff9933"
                            style={{ borderColor: "#a5b4fc" }}
                            labelStyle={{ fontWeight: "700" }}
                        >
                            Add Capacity
                        </Button>
                    </View>
                }
                renderItem={({ item }) => {
                    const ratio =
                        item.total > 0 ? item.parked / item.total : 0;
                    let barColor = "#22c55e"; // green
                    if (ratio >= 0.9) {
                        barColor = "#ef4444"; // red
                    } else if (ratio >= 0.7) {
                        barColor = "#f59e0b"; // amber
                    }

                    return (
                        <Card
                            className="bg-white mb-3 border border-slate-100"
                            elevation={1}
                        >
                            <Card.Content className="flex-row items-center py-4 px-4">
                                <Avatar.Icon
                                    size={44}
                                    icon={getVehicleIcon(item.type)}
                                    style={{
                                        backgroundColor:
                                            item.total === 0
                                                ? "#f1f5f9"
                                                : "#e0e7ff",
                                    }}
                                    color={
                                        item.total === 0
                                            ? "#94a3b8"
                                            : "#ff9933"
                                    }
                                />
                                <View className="ml-4 flex-1">
                                    <View className="flex-row justify-between items-center mb-1">
                                        <Text className="text-base font-bold text-slate-800">
                                            {getVehicleLabel(item.type)}
                                        </Text>
                                        <View className={`${
                                                item.total === 0
                                                    ? "bg-slate-100 text-slate-500"
                                                    : "bg-carrot-50 text-carrot-700"
                                            } font-bold`}><Text className="font-bold text-xs">{String("                                             " + (item.total === 0
                                                ? "Disabled"
                                                : `${item.parked} / ${item.total}`) + "                                         ").trim()}</Text></View>
                                    </View>
                                    <Text className="text-xs text-slate-500 font-medium mb-1">
                                        Rate: ₹
                                        {currentAgency[
                                            `${item.type}_rate`
                                        ] !== undefined
                                            ? currentAgency[
                                                  `${item.type}_rate`
                                              ]
                                            : 0}
                                        /hr
                                    </Text>
                                    {item.total > 0 ? (
                                        <View className="w-full mt-1">
                                            <ProgressBar
                                                progress={ratio}
                                                color={barColor}
                                                style={{
                                                    height: 6,
                                                    borderRadius: 3,
                                                }}
                                            />
                                            <Text className="text-xs text-slate-400 mt-1">
                                                {item.total - item.parked} spots available
                                            </Text>
                                        </View>
                                    ) : (
                                        <Text className="text-xs text-slate-400">
                                            No capacity configured
                                        </Text>
                                    )}
                                </View>
                                <IconButton
                                    icon="pencil-outline"
                                    size={20}
                                    iconColor="#64748b"
                                    onPress={() => openEditCapacity(item)}
                                />
                            </Card.Content>
                        </Card>
                    );
                }}
            />

            <EditCapacityModal
                visible={editModalVisible}
                onDismiss={() => setEditModalVisible(false)}
                currentAgency={currentAgency}
                capacityItem={selectedCapacityItem}
                onSaveSuccess={onRefresh}
                useApi={useApi}
                capacitiesList={capacitiesList}
            />
        </View>
    );
}
