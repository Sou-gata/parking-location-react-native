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
import {
    validateCapacityFitsSpace,
    BLOCK_ON_CAPACITY_EXCEEDED,
} from "../../utils/capacityValidator";

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

    // Live validation against agency parking dimensions if configured
    const capacityValidation = React.useMemo(() => {
        const length =
            currentAgency?.parking_length ?? currentAgency?.parkingLength;
        const width =
            currentAgency?.parking_width ?? currentAgency?.parkingWidth;
        const unit =
            currentAgency?.dimension_unit ??
            currentAgency?.dimensionUnit ??
            "meters";

        if (!length || !width) return null;

        const mergedCapacities = {
            two_wheeler_capacity:
                currentAgency.two_wheeler_capacity ??
                currentAgency.twoWheelerCapacity ??
                0,
            three_wheeler_capacity:
                currentAgency.three_wheeler_capacity ??
                currentAgency.threeWheelerCapacity ??
                0,
            car_capacity:
                currentAgency.car_capacity ??
                currentAgency.carCapacity ??
                0,
            suv_capacity:
                currentAgency.suv_capacity ??
                currentAgency.suvCapacity ??
                0,
            van_capacity:
                currentAgency.van_capacity ??
                currentAgency.vanCapacity ??
                0,
            pickup_capacity:
                currentAgency.pickup_capacity ??
                currentAgency.pickupCapacity ??
                0,
            ev_capacity:
                currentAgency.ev_capacity ??
                currentAgency.evCapacity ??
                0,
        };

        const targetVehicleType =
            form.selectedVehicleType || capacityItem?.type;
        if (targetVehicleType) {
            const enteredCap = parseInt(form.capacityVal, 10);
            const num = isNaN(enteredCap) || enteredCap < 0 ? 0 : enteredCap;

            if (
                targetVehicleType === "twoWheeler" ||
                targetVehicleType === "two_wheeler"
            )
                mergedCapacities.two_wheeler_capacity = num;
            else if (
                targetVehicleType === "threeWheeler" ||
                targetVehicleType === "three_wheeler"
            )
                mergedCapacities.three_wheeler_capacity = num;
            else if (targetVehicleType === "car")
                mergedCapacities.car_capacity = num;
            else if (targetVehicleType === "suv")
                mergedCapacities.suv_capacity = num;
            else if (targetVehicleType === "van")
                mergedCapacities.van_capacity = num;
            else if (targetVehicleType === "pickup")
                mergedCapacities.pickup_capacity = num;
            else if (targetVehicleType === "ev")
                mergedCapacities.ev_capacity = num;
        }

        return validateCapacityFitsSpace({
            length,
            width,
            unit,
            capacities: mergedCapacities,
        });
    }, [currentAgency, form.selectedVehicleType, form.capacityVal, capacityItem]);

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

        if (
            BLOCK_ON_CAPACITY_EXCEEDED &&
            capacityValidation?.checked &&
            !capacityValidation?.valid
        ) {
            toast.error(
                capacityValidation.message,
                "Capacity Exceeded",
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
                    if (capRes.data?.capacity_warning) {
                        toast.warning(
                            capRes.data.capacity_warning,
                            "Capacity Notice",
                            true
                        );
                    } else {
                        toast.success(
                            `Details for ${getVehicleLabel(
                                vehicleType
                            )} updated successfully!`,
                            "Success",
                            true
                        );
                    }
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
                                    selectedColor="#ff9933"
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
                            selectedColor="#ff9933"
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
                            activeOutlineColor="#ff9933"
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
                        color="#ff9933"
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
                activeOutlineColor="#ff9933"
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
                activeOutlineColor="#ff9933"
                className="bg-white mb-4"
                left={<TextInput.Icon icon="currency-inr" />}
            />

            {/* Space Fit Capacity Indicator */}
            {capacityValidation && capacityValidation.checked && (
                <View
                    style={{
                        backgroundColor: capacityValidation.valid
                            ? "#f0fdf4"
                            : "#fef2f2",
                        borderColor: capacityValidation.valid
                            ? "#86efac"
                            : "#fca5a5",
                    }}
                    className="p-2.5 rounded-xl border mb-4"
                >
                    <View className="flex-row items-center justify-between">
                        <Text
                            style={{
                                color: capacityValidation.valid
                                    ? "#15803d"
                                    : "#b91c1c",
                                fontWeight: "bold",
                                fontSize: 11,
                            }}
                        >
                            {capacityValidation.valid
                                ? "✓ Space Utilization"
                                : "⚠️ Exceeds Floor Space"}
                        </Text>
                        <Text
                            style={{
                                color: capacityValidation.valid
                                    ? "#15803d"
                                    : "#b91c1c",
                                fontWeight: "bold",
                                fontSize: 11,
                            }}
                        >
                            {capacityValidation.occupancyPercentage}% ({capacityValidation.requiredAreaM2} / {capacityValidation.usableAreaM2} m²)
                        </Text>
                    </View>
                    {!capacityValidation.valid && (
                        <Text className="text-red-600 text-[10px] mt-1 leading-3 font-medium">
                            Exceeded by {capacityValidation.excessAreaM2} m².
                        </Text>
                    )}
                </View>
            )}

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
                    buttonColor="#ff9933"
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
