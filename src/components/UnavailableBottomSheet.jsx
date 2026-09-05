import React, { useCallback } from "react";
import {
    View,
    Text,
    Modal,
    StyleSheet,
    Pressable,
    TouchableOpacity,
    ScrollView,
} from "react-native";
import { Button, Surface, IconButton, Divider } from "react-native-paper";
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

/**
 * Format an ISO date-time string into a human-friendly string.
 * e.g. "5 Sep, 2:30 PM"
 */
const formatDateTime = (iso) => {
    if (!iso) return "—";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "—";
    const months = [
        "Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ];
    let h = d.getHours();
    const m = String(d.getMinutes()).padStart(2, "0");
    const ampm = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;
    return `${d.getDate()} ${months[d.getMonth()]}, ${h}:${m} ${ampm}`;
};

/**
 * Format duration between two ISO strings as "Xh Ym"
 */
const formatDuration = (startISO, endISO) => {
    if (!startISO || !endISO) return "";
    const ms = new Date(endISO) - new Date(startISO);
    if (ms <= 0) return "";
    const mins = Math.round(ms / 60000);
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h > 0 ? h + "h " : ""}${m > 0 ? m + "m" : ""}`.trim();
};

/**
 * UnavailableBottomSheet
 *
 * Shown when the user taps a grayed-out (fully booked) parking marker.
 * Displays:
 *   - Why it's unavailable
 *   - When the next slot opens (nextAvailableFrom)
 *   - Next full booking window (nextAvailableWindow)
 *   - Smart suggestion: if parking 15 min less makes it available, show chip
 *
 * Props:
 *   visible          {boolean}
 *   agency           {object}  the parking location object
 *   data             {object}  availability data from /agencies/availability-bulk
 *                              { isAvailable, nextAvailableFrom, nextAvailableWindow, suggestion, vehicleType }
 *   vehicleType      {string}  the vehicle type the user selected
 *   onClose          {() => void}
 *   onBookWithShortenedTime  {(agency, reducedEndTime) => void}
 *   onViewNextSlot   {(agency, nextWindow) => void}
 */
const UnavailableBottomSheet = ({
    visible,
    agency,
    data,
    vehicleType,
    onClose,
    onBookWithShortenedTime,
    onViewNextSlot,
}) => {
    const vehicleLabel =
        VEHICLE_TYPE_LABELS[vehicleType] || vehicleType || "Vehicle";

    const nextFrom = data?.nextAvailableFrom;
    const nextWindow = data?.nextAvailableWindow;
    const suggestion = data?.suggestion;

    const handleShortenStay = useCallback(() => {
        if (suggestion?.reducedEndTime && agency) {
            onBookWithShortenedTime?.(agency, suggestion.reducedEndTime);
        }
    }, [suggestion, agency, onBookWithShortenedTime]);

    const handleViewNextSlot = useCallback(() => {
        if (agency) {
            onViewNextSlot?.(agency, nextWindow);
        }
    }, [agency, nextWindow, onViewNextSlot]);

    if (!visible) return null;

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <Pressable style={styles.backdrop} onPress={onClose} />
            <View style={styles.sheetWrap} pointerEvents="box-none">
                <Surface elevation={6} style={styles.sheet}>
                    {/* Drag pill */}
                    <View style={styles.header}>
                        <View style={styles.pill} />
                    </View>

                    {/* Header row */}
                    <View style={styles.titleRow}>
                        <View style={styles.unavailBadge}>
                            <MaterialDesignIcons
                                name="parking"
                                size={18}
                                color="#ef4444"
                            />
                            <Text style={styles.unavailBadgeText}>
                                Not Available
                            </Text>
                        </View>
                        <IconButton
                            icon="close"
                            size={20}
                            iconColor="#6b7280"
                            onPress={onClose}
                            style={{ margin: 0 }}
                        />
                    </View>

                    {/* Parking name */}
                    {Boolean(agency?.name) && (
                        <Text style={styles.parkingName} numberOfLines={2}>
                            {agency.name}
                        </Text>
                    )}
                    <Text style={styles.parkingSubtitle}>
                        No {vehicleLabel} spots for your selected time window
                    </Text>

                    <Divider style={styles.divider} />

                    <ScrollView showsVerticalScrollIndicator={false}>
                        {/* Next available from */}
                        {Boolean(nextFrom) && (
                            <View style={styles.infoCard}>
                                <View style={styles.infoCardIcon}>
                                    <MaterialDesignIcons
                                        name="clock-fast"
                                        size={22}
                                        color="#f59e0b"
                                    />
                                </View>
                                <View style={styles.infoCardBody}>
                                    <Text style={styles.infoCardLabel}>
                                        First spot opens at
                                    </Text>
                                    <Text style={styles.infoCardValue}>
                                        {formatDateTime(nextFrom)}
                                    </Text>
                                </View>
                            </View>
                        )}

                        {/* Next full window */}
                        {Boolean(nextWindow?.startTime) && (
                            <View style={styles.infoCard}>
                                <View style={styles.infoCardIcon}>
                                    <MaterialDesignIcons
                                        name="calendar-clock"
                                        size={22}
                                        color="#3b82f6"
                                    />
                                </View>
                                <View style={styles.infoCardBody}>
                                    <Text style={styles.infoCardLabel}>
                                        Next available slot
                                    </Text>
                                    <Text style={styles.infoCardValue}>
                                        {formatDateTime(nextWindow.startTime)}
                                        {" → "}
                                        {formatDateTime(nextWindow.endTime)}
                                    </Text>
                                    {Boolean(nextWindow.startTime && nextWindow.endTime) && (
                                        <Text style={styles.infoCardDuration}>
                                            Duration:{" "}
                                            {formatDuration(
                                                nextWindow.startTime,
                                                nextWindow.endTime
                                            )}
                                        </Text>
                                    )}
                                </View>
                            </View>
                        )}

                        {/* Suggestion: shorten stay */}
                        {Boolean(suggestion?.type === "shorten_stay") && (
                            <TouchableOpacity
                                style={styles.suggestionCard}
                                onPress={handleShortenStay}
                                activeOpacity={0.75}
                            >
                                <View style={styles.suggestionIconWrap}>
                                    <MaterialDesignIcons
                                        name="lightbulb-on-outline"
                                        size={24}
                                        color="#ff9933"
                                    />
                                </View>
                                <View style={styles.suggestionBody}>
                                    <Text style={styles.suggestionTitle}>
                                        💡 Book now with shorter stay!
                                    </Text>
                                    <Text style={styles.suggestionDesc}>
                                        Park{" "}
                                        <Text style={styles.suggestionHighlight}>
                                            {suggestion.shortenByMinutes} min less
                                        </Text>{" "}
                                        and this spot is available now.
                                    </Text>
                                    <Text style={styles.suggestionNewEnd}>
                                        New end:{" "}
                                        {formatDateTime(suggestion.reducedEndTime)}
                                    </Text>
                                </View>
                                <MaterialDesignIcons
                                    name="chevron-right"
                                    size={20}
                                    color="#ff9933"
                                />
                            </TouchableOpacity>
                        )}

                        {/* View next slot button */}
                        {Boolean(nextWindow?.startTime) && (
                            <Button
                                mode="outlined"
                                onPress={handleViewNextSlot}
                                textColor="#ff9933"
                                style={styles.nextSlotBtn}
                                contentStyle={styles.nextSlotBtnContent}
                                icon="calendar-arrow-right"
                            >
                                Book Next Available Slot
                            </Button>
                        )}

                        {/* If no availability data at all */}
                        {!nextFrom && !nextWindow && !suggestion && (
                            <View style={styles.noDataWrap}>
                                <MaterialDesignIcons
                                    name="calendar-remove"
                                    size={40}
                                    color="#d1d5db"
                                />
                                <Text style={styles.noDataText}>
                                    No upcoming slot information available.
                                </Text>
                            </View>
                        )}

                        <Button
                            mode="text"
                            onPress={onClose}
                            textColor="#6b7280"
                            style={styles.dismissBtn}
                        >
                            Dismiss
                        </Button>
                    </ScrollView>
                </Surface>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: "rgba(0,0,0,0.4)",
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
        maxHeight: "80%",
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
        marginTop: 4,
    },
    unavailBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        backgroundColor: "#fef2f2",
        borderRadius: 20,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderWidth: 1,
        borderColor: "#fecaca",
    },
    unavailBadgeText: {
        fontSize: 13,
        fontWeight: "600",
        color: "#ef4444",
    },
    parkingName: {
        fontSize: 18,
        fontWeight: "700",
        color: "#111827",
        marginTop: 12,
    },
    parkingSubtitle: {
        fontSize: 13,
        color: "#6b7280",
        marginTop: 4,
        marginBottom: 8,
    },
    divider: {
        marginVertical: 12,
        backgroundColor: "#f3f4f6",
    },
    infoCard: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 12,
        backgroundColor: "#f9fafb",
        borderRadius: 14,
        padding: 14,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: "#e5e7eb",
    },
    infoCardIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: "#fff",
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        borderColor: "#e5e7eb",
    },
    infoCardBody: {
        flex: 1,
    },
    infoCardLabel: {
        fontSize: 12,
        color: "#6b7280",
        fontWeight: "500",
        textTransform: "uppercase",
        letterSpacing: 0.5,
        marginBottom: 2,
    },
    infoCardValue: {
        fontSize: 15,
        fontWeight: "600",
        color: "#111827",
    },
    infoCardDuration: {
        fontSize: 12,
        color: "#6b7280",
        marginTop: 2,
    },
    suggestionCard: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        backgroundColor: "#fff7ed",
        borderRadius: 14,
        padding: 14,
        marginBottom: 10,
        borderWidth: 1.5,
        borderColor: "#fed7aa",
    },
    suggestionIconWrap: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "#fff",
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        borderColor: "#fed7aa",
    },
    suggestionBody: {
        flex: 1,
    },
    suggestionTitle: {
        fontSize: 14,
        fontWeight: "700",
        color: "#92400e",
        marginBottom: 2,
    },
    suggestionDesc: {
        fontSize: 13,
        color: "#78350f",
        lineHeight: 18,
    },
    suggestionHighlight: {
        fontWeight: "700",
        color: "#c2410c",
    },
    suggestionNewEnd: {
        fontSize: 12,
        color: "#92400e",
        marginTop: 4,
        fontWeight: "500",
    },
    nextSlotBtn: {
        marginTop: 4,
        marginBottom: 8,
        borderRadius: 12,
        borderColor: "#ff9933",
    },
    nextSlotBtnContent: {
        paddingVertical: 4,
    },
    noDataWrap: {
        alignItems: "center",
        paddingVertical: 24,
        gap: 10,
    },
    noDataText: {
        fontSize: 14,
        color: "#9ca3af",
        textAlign: "center",
    },
    dismissBtn: {
        marginTop: 4,
    },
});

export default UnavailableBottomSheet;
