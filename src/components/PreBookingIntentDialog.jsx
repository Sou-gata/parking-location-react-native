import React, { useState, useCallback } from "react";
import {
    View,
    Text,
    Modal,
    ScrollView,
    TouchableOpacity,
    Platform,
    StyleSheet,
    Pressable,
} from "react-native";
import { Button, Surface, IconButton } from "react-native-paper";
import DateTimePicker from "@react-native-community/datetimepicker";
import { MaterialDesignIcons } from "@react-native-vector-icons/material-design-icons";

const VEHICLE_TYPE_LABELS = {
    twoWheeler: "Two-Wheeler",
    threeWheeler: "Three-Wheeler",
    car: "Car",
    suv: "SUV / MUV",
    van: "Van",
    pickup: "Pickup Truck",
    ev: "EV",
};

const VEHICLE_TYPE_ICONS = {
    twoWheeler: "motorbike",
    threeWheeler: "rickshaw",
    car: "car",
    suv: "car-estate",
    van: "van-passenger",
    pickup: "car-pickup",
    ev: "ev-station",
};

const formatDisplayDate = (d) => {
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
};

const formatDisplayTime = (d) => {
    let h = d.getHours();
    const m = String(d.getMinutes()).padStart(2, "0");
    const ampm = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;
    return `${h}:${m} ${ampm}`;
};

/**
 * PreBookingIntentDialog
 *
 * Modal that collects vehicle type + start/end time before the user
 * searches parking on the map.
 *
 * Props:
 *  visible            {boolean}
 *  initialVehicleType {string}  default "car"
 *  onConfirm          {(vehicleType, startTimeISO, endTimeISO) => void}
 *  onDismiss          {() => void}
 */
const PreBookingIntentDialog = ({
    visible,
    initialVehicleType = "car",
    onConfirm,
    onDismiss,
}) => {
    const now = new Date();
    const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000);

    const [vehicleType, setVehicleType] = useState(initialVehicleType);
    const [startDate, setStartDate] = useState(now);
    const [endDate, setEndDate] = useState(twoHoursLater);

    // Picker visibility states
    const [showStartDate, setShowStartDate] = useState(false);
    const [showStartTime, setShowStartTime] = useState(false);
    const [showEndDate, setShowEndDate] = useState(false);
    const [showEndTime, setShowEndTime] = useState(false);
    const [error, setError] = useState("");

    const handleConfirm = useCallback(() => {
        if (endDate <= startDate) {
            setError("End time must be after start time.");
            return;
        }
        const durationMs = endDate.getTime() - startDate.getTime();
        if (durationMs < 15 * 60 * 1000) {
            setError("Minimum booking duration is 15 minutes.");
            return;
        }
        setError("");
        onConfirm(vehicleType, startDate.toISOString(), endDate.toISOString());
    }, [vehicleType, startDate, endDate, onConfirm]);

    const onChangeStartDate = (_, selected) => {
        setShowStartDate(false);
        if (selected) {
            const merged = new Date(selected);
            merged.setHours(startDate.getHours(), startDate.getMinutes(), 0, 0);
            setStartDate(merged);
        }
    };
    const onChangeStartTime = (_, selected) => {
        setShowStartTime(false);
        if (selected) {
            const merged = new Date(startDate);
            merged.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
            setStartDate(merged);
        }
    };
    const onChangeEndDate = (_, selected) => {
        setShowEndDate(false);
        if (selected) {
            const merged = new Date(selected);
            merged.setHours(endDate.getHours(), endDate.getMinutes(), 0, 0);
            setEndDate(merged);
        }
    };
    const onChangeEndTime = (_, selected) => {
        setShowEndTime(false);
        if (selected) {
            const merged = new Date(endDate);
            merged.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
            setEndDate(merged);
        }
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onDismiss}
        >
            <Pressable style={styles.backdrop} onPress={onDismiss} />
            <View style={styles.sheetWrap} pointerEvents="box-none">
                <Surface elevation={6} style={styles.sheet}>
                    {/* Drag pill */}
                    <View style={styles.header}>
                        <View style={styles.pill} />
                    </View>

                    {/* Title row */}
                    <View style={styles.titleRow}>
                        <View>
                            <Text style={styles.title}>Find Parking</Text>
                            <Text style={styles.subtitle}>
                                Set your vehicle &amp; booking time
                            </Text>
                        </View>
                        <IconButton
                            icon="close"
                            size={22}
                            iconColor="#6b7280"
                            onPress={onDismiss}
                            style={{ margin: 0 }}
                        />
                    </View>

                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                    >
                        {/* Vehicle type */}
                        <Text style={styles.sectionLabel}>Vehicle Type</Text>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.vehicleRow}
                        >
                            {Object.keys(VEHICLE_TYPE_LABELS).map((key) => {
                                const selected = vehicleType === key;
                                return (
                                    <TouchableOpacity
                                        key={key}
                                        style={[
                                            styles.vehicleChip,
                                            selected && styles.vehicleChipSelected,
                                        ]}
                                        onPress={() => setVehicleType(key)}
                                        activeOpacity={0.7}
                                    >
                                        <MaterialDesignIcons
                                            name={VEHICLE_TYPE_ICONS[key]}
                                            size={20}
                                            color={selected ? "#fff" : "#6b7280"}
                                        />
                                        <Text
                                            style={[
                                                styles.vehicleChipLabel,
                                                selected &&
                                                    styles.vehicleChipLabelSelected,
                                            ]}
                                        >
                                            {VEHICLE_TYPE_LABELS[key]}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>

                        {/* Start time */}
                        <Text style={styles.sectionLabel}>Start Time</Text>
                        <View style={styles.timeRow}>
                            <TouchableOpacity
                                style={styles.timeBtn}
                                onPress={() => setShowStartDate(true)}
                            >
                                <MaterialDesignIcons
                                    name="calendar"
                                    size={16}
                                    color="#ff9933"
                                />
                                <Text style={styles.timeBtnText}>
                                    {formatDisplayDate(startDate)}
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.timeBtn}
                                onPress={() => setShowStartTime(true)}
                            >
                                <MaterialDesignIcons
                                    name="clock-outline"
                                    size={16}
                                    color="#ff9933"
                                />
                                <Text style={styles.timeBtnText}>
                                    {formatDisplayTime(startDate)}
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* End time */}
                        <Text style={styles.sectionLabel}>End Time</Text>
                        <View style={styles.timeRow}>
                            <TouchableOpacity
                                style={styles.timeBtn}
                                onPress={() => setShowEndDate(true)}
                            >
                                <MaterialDesignIcons
                                    name="calendar"
                                    size={16}
                                    color="#ff9933"
                                />
                                <Text style={styles.timeBtnText}>
                                    {formatDisplayDate(endDate)}
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.timeBtn}
                                onPress={() => setShowEndTime(true)}
                            >
                                <MaterialDesignIcons
                                    name="clock-outline"
                                    size={16}
                                    color="#ff9933"
                                />
                                <Text style={styles.timeBtnText}>
                                    {formatDisplayTime(endDate)}
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* Duration hint */}
                        {endDate > startDate && (
                            <View style={styles.durationHint}>
                                <MaterialDesignIcons
                                    name="timer-outline"
                                    size={14}
                                    color="#6b7280"
                                />
                                <Text style={styles.durationHintText}>
                                    {(() => {
                                        const mins = Math.round(
                                            (endDate - startDate) / 60000
                                        );
                                        const h = Math.floor(mins / 60);
                                        const m = mins % 60;
                                        return `Duration: ${h > 0 ? h + "h " : ""}${m > 0 ? m + "m" : ""}`;
                                    })()}
                                </Text>
                            </View>
                        )}

                        {/* Validation error */}
                        {Boolean(error) && (
                            <Text style={styles.errorText}>{error}</Text>
                        )}

                        {/* Confirm button */}
                        <Button
                            mode="contained"
                            onPress={handleConfirm}
                            buttonColor="#ff9933"
                            textColor="#fff"
                            style={styles.confirmBtn}
                            contentStyle={styles.confirmBtnContent}
                            labelStyle={styles.confirmBtnLabel}
                            icon="magnify"
                        >
                            Search Parking
                        </Button>
                    </ScrollView>
                </Surface>
            </View>

            {/* Native date/time pickers */}
            {showStartDate && (
                <DateTimePicker
                    value={startDate}
                    mode="date"
                    minimumDate={new Date()}
                    display={Platform.OS === "ios" ? "spinner" : "default"}
                    onChange={onChangeStartDate}
                />
            )}
            {showStartTime && (
                <DateTimePicker
                    value={startDate}
                    mode="time"
                    display={Platform.OS === "ios" ? "spinner" : "default"}
                    onChange={onChangeStartTime}
                />
            )}
            {showEndDate && (
                <DateTimePicker
                    value={endDate}
                    mode="date"
                    minimumDate={startDate}
                    display={Platform.OS === "ios" ? "spinner" : "default"}
                    onChange={onChangeEndDate}
                />
            )}
            {showEndTime && (
                <DateTimePicker
                    value={endDate}
                    mode="time"
                    display={Platform.OS === "ios" ? "spinner" : "default"}
                    onChange={onChangeEndTime}
                />
            )}
        </Modal>
    );
};

const styles = StyleSheet.create({
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: "rgba(0,0,0,0.45)",
    },
    sheetWrap: {
        flex: 1,
        justifyContent: "flex-end",
    },
    sheet: {
        backgroundColor: "#fff",
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingHorizontal: 20,
        paddingBottom: 32,
        maxHeight: "85%",
    },
    header: {
        alignItems: "center",
        paddingTop: 12,
        paddingBottom: 4,
    },
    pill: {
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: "#d1d5db",
    },
    titleRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 12,
        marginTop: 4,
    },
    title: {
        fontSize: 20,
        fontWeight: "700",
        color: "#111827",
    },
    subtitle: {
        fontSize: 13,
        color: "#6b7280",
        marginTop: 2,
    },
    sectionLabel: {
        fontSize: 12,
        fontWeight: "600",
        color: "#374151",
        marginTop: 16,
        marginBottom: 8,
        textTransform: "uppercase",
        letterSpacing: 0.6,
    },
    vehicleRow: {
        flexDirection: "row",
        gap: 8,
        paddingBottom: 4,
    },
    vehicleChip: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1.5,
        borderColor: "#e5e7eb",
        backgroundColor: "#f9fafb",
    },
    vehicleChipSelected: {
        backgroundColor: "#ff9933",
        borderColor: "#ff9933",
    },
    vehicleChipLabel: {
        fontSize: 13,
        fontWeight: "500",
        color: "#374151",
    },
    vehicleChipLabelSelected: {
        color: "#fff",
    },
    timeRow: {
        flexDirection: "row",
        gap: 10,
    },
    timeBtn: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: "#e5e7eb",
        backgroundColor: "#f9fafb",
    },
    timeBtnText: {
        fontSize: 14,
        fontWeight: "500",
        color: "#111827",
    },
    durationHint: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        marginTop: 10,
        paddingHorizontal: 4,
    },
    durationHintText: {
        fontSize: 13,
        color: "#6b7280",
    },
    errorText: {
        fontSize: 13,
        color: "#ef4444",
        marginTop: 10,
        textAlign: "center",
    },
    confirmBtn: {
        marginTop: 24,
        borderRadius: 14,
    },
    confirmBtnContent: {
        paddingVertical: 6,
    },
    confirmBtnLabel: {
        fontSize: 16,
        fontWeight: "700",
        letterSpacing: 0.3,
    },
});

export default PreBookingIntentDialog;
