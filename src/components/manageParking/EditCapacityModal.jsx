import React, { useState, useEffect } from "react";
import { View, ScrollView, Modal, TouchableWithoutFeedback } from "react-native";
import {
    Text,
    Button,
    TextInput,
    Avatar,
} from "react-native-paper";
import Chip from "../Chip";
import { useDispatch } from "react-redux";
import useToast from "../../hooks/useToast";
import { updateAgencyCapacities } from "../../store/slices/parkingSlice";
import apiService from "../../utils/apiService";
import { STANDARD_VEHICLES, getVehicleLabel, getVehicleIcon } from "./utils";

export default function EditCapacityModal({
    visible,
    onDismiss,
    currentAgency,
    capacityItem, // { type, total, key, parked } or null if adding new
    onSaveSuccess,
    useApi,
    capacitiesList, // to check for already configured types when adding
}) {
    const dispatch = useDispatch();
    const toast = useToast();
    const isAddingNew = !capacityItem;

    const [form, setForm] = useState({
        selectedVehicleType: "",
        customVehicleName: "",
        capacityVal: "",
        rateVal: "",
    });

    useEffect(() => {
        if (visible) {
            if (capacityItem) {
                const rateKey = `${capacityItem.type}_rate`;
                const currentRate =
                    currentAgency[rateKey] !== undefined ? currentAgency[rateKey] : 0;
                setForm({
                    selectedVehicleType: capacityItem.type,
                    customVehicleName: "",
                    capacityVal: capacityItem.total.toString(),
                    rateVal: currentRate.toString(),
                });
            } else {
                setForm({
                    selectedVehicleType: "",
                    customVehicleName: "",
                    capacityVal: "",
                    rateVal: "",
                });
            }
        }
    }, [visible, capacityItem, currentAgency]);

    const updateForm = (key, value) => {
        setForm((prev) => ({ ...prev, [key]: value }));
    };

    const handleSave = async () => {
        let vehicleType = form.selectedVehicleType;
        if (isAddingNew) {
            if (form.selectedVehicleType === "custom") {
                const cleanedName = form.customVehicleName
                    .trim()
                    .replace(/\s+/g, "_")
                    .toLowerCase();
                if (!cleanedName) {
                    toast.error(
                        "Please enter a custom vehicle type name.",
                        "Error",
                        true
                    );
                    return;
                }
                vehicleType = cleanedName;
            } else if (!form.selectedVehicleType) {
                toast.error("Please select a vehicle type.", "Error", true);
                return;
            }
        }

        const capNum = parseInt(form.capacityVal, 10);
        if (isNaN(capNum) || capNum < 0) {
            toast.error(
                "Capacity must be a non-negative number.",
                "Error",
                true
            );
            return;
        }

        const rateNum = parseFloat(form.rateVal);
        if (isNaN(rateNum) || rateNum < 0) {
            toast.error(
                "Hourly rate must be a non-negative number.",
                "Error",
                true
            );
            return;
        }

        if (useApi) {
            try {
                // Real capacity update via API
                const capRes = await apiService.put(
                    `agencies/${currentAgency.id}/capacities`,
                    {
                        capacities: {
                            [vehicleType]: capNum,
                        },
                    }
                );

                // Real rate update via API
                const rateRes = await apiService.put(
                    `agencies/${currentAgency.id}/rates`,
                    {
                        rates: {
                            [vehicleType]: rateNum,
                        },
                    }
                );

                if (capRes && capRes.success && rateRes && rateRes.success) {
                    toast.success(
                        `Details for ${getVehicleLabel(
                            vehicleType
                        )} updated successfully!`,
                        "Success",
                        true
                    );
                    onDismiss();
                    onSaveSuccess();
                } else {
                    toast.error(
                        "Failed to update capacities or rates",
                        "Error",
                        true
                    );
                }
            } catch (error) {
                console.error(
                    "Error updating capacities/rates via API:",
                    error
                );
                const msg =
                    error.response?.data?.message ||
                    "Failed to update capacities or rates via API";
                toast.error(msg, "Error", true);
            }
        } else {
            // Fallback to Redux
            const capacityKey = `${vehicleType}_capacity`;
            const rateKey = `${vehicleType}_rate`;
            dispatch(
                updateAgencyCapacities({
                    agencyId: currentAgency.id,
                    capacities: {
                        [capacityKey]: capNum,
                        [rateKey]: rateNum,
                    },
                })
            );

            toast.success(
                `Details for ${getVehicleLabel(vehicleType)} updated locally!`,
                "Success",
                true
            );
            onDismiss();
            onSaveSuccess();
        }
    };

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
                        <View className="bg-white rounded-3xl p-5 w-[92%] max-w-[500px] shadow-2xl">
            <Text className="text-lg font-bold text-slate-800 mb-4">
                {isAddingNew ? "Add Vehicle Capacity" : "Modify Capacity"}
            </Text>

            {isAddingNew ? (
                <View className="mb-4">
                    <Text className="text-sm font-semibold text-slate-600 mb-2">
                        Select Vehicle Type
                    </Text>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        className="flex-row mb-3 py-1"
                    >
                        {Object.keys(STANDARD_VEHICLES).map((type) => {
                            // Check if capacity is already configured to show it differently or skip it
                            const alreadyConfigured =
                                capacitiesList &&
                                capacitiesList.some(
                                    (c) => c.type === type && c.total > 0
                                );
                            if (alreadyConfigured) return null;

                            return (
                                <Chip
                                    key={type}
                                    selected={form.selectedVehicleType === type}
                                    onPress={() => {
                                        updateForm("selectedVehicleType", type);
                                        updateForm("customVehicleName", "");
                                    }}
                                    className="mr-2"
                                    selectedColor="#4338ca"
                                    showSelectedOverlay
                                >
                                    {STANDARD_VEHICLES[type].label}
                                </Chip>
                            );
                        })}
                        <Chip
                            key="custom"
                            selected={form.selectedVehicleType === "custom"}
                            onPress={() => updateForm("selectedVehicleType", "custom")}
                            className="mr-2"
                            selectedColor="#4338ca"
                            showSelectedOverlay
                        >
                            Custom...
                        </Chip>
                    </ScrollView>

                    {form.selectedVehicleType === "custom" && (
                        <TextInput
                            label="Custom Vehicle Type (e.g. truck, bicycle)"
                            value={form.customVehicleName}
                            onChangeText={(val) => updateForm("customVehicleName", val)}
                            mode="outlined"
                            dense
                            outlineColor="#e2e8f0"
                            activeOutlineColor="#4338ca"
                            className="bg-white mb-2"
                        />
                    )}
                </View>
            ) : (
                <View className="flex-row items-center mb-4 bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <Avatar.Icon
                        size={40}
                        icon={getVehicleIcon(form.selectedVehicleType)}
                        style={{ backgroundColor: "#e0e7ff" }}
                        color="#4338ca"
                    />
                    <Text className="text-base font-bold text-slate-700 ml-3">
                        {getVehicleLabel(form.selectedVehicleType)}
                    </Text>
                </View>
            )}

            <TextInput
                label="Total Parking Capacity"
                value={form.capacityVal}
                onChangeText={(val) => updateForm("capacityVal", val)}
                keyboardType="numeric"
                mode="outlined"
                outlineColor="#e2e8f0"
                activeOutlineColor="#4338ca"
                className="bg-white mb-4"
                left={<TextInput.Icon icon="counter" />}
            />

            <TextInput
                label="Hourly Rate (₹/hr)"
                value={form.rateVal}
                onChangeText={(val) => updateForm("rateVal", val)}
                keyboardType="numeric"
                mode="outlined"
                outlineColor="#e2e8f0"
                activeOutlineColor="#4338ca"
                className="bg-white mb-6"
                left={<TextInput.Icon icon="currency-inr" />}
            />

            <View className="flex-row justify-end gap-3">
                <Button
                    mode="outlined"
                    onPress={onDismiss}
                    textColor="#64748b"
                    style={{ borderColor: "#cbd5e1" }}
                >
                    Cancel
                </Button>
                <Button
                    mode="contained"
                    onPress={handleSave}
                    buttonColor="#4338ca"
                    labelStyle={{ fontWeight: "700" }}
                >
                    Save
                </Button>
            </View>
                        </View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
}
