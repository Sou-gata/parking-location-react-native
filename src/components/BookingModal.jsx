import React, { useState, useCallback, useEffect } from "react";
import {
    View,
    ScrollView,
    TouchableOpacity,
    Platform,
    Modal,
    Text,
} from "react-native";
import {
    TextInput,
    Button,
    Divider,
    Avatar,
    Menu,
    Provider,
    Surface,
} from "react-native-paper";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useDispatch } from "react-redux";
import { useNavigation } from "@react-navigation/native";
import useToast from "../hooks/useToast";
import apiService from "../utils/apiService";
import { addBooking } from "../store/slices/parkingSlice";
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

const VEHICLE_TYPE_RATES = {
    twoWheeler: 20,
    threeWheeler: 30,
    car: 40,
    suv: 50,
    van: 50,
    pickup: 50,
    ev: 60,
};

const formatDate = (d) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
};

const formatTime = (d) => {
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    return `${hours}:${minutes}`;
};

const formatTime12h = (time24) => {
    if (!time24) return "";
    const [hStr, mStr] = time24.split(":");
    let h = parseInt(hStr, 10);
    const m = mStr || "00";
    if (isNaN(h)) return time24;
    const ampm = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;
    const hFormatted = String(h).padStart(2, "0");
    return `${hFormatted}:${m} ${ampm}`;
};

const formatNextAvailableTime = (isoString) => {
    if (!isoString) return "";
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return "";

    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const isToday = date.toDateString() === today.toDateString();
    const isTomorrow = date.toDateString() === tomorrow.toDateString();

    const h = date.getHours();
    const m = String(date.getMinutes()).padStart(2, "0");
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = String(h % 12 || 12).padStart(2, "0");
    const timeFormatted = `${h12}:${m} ${ampm}`;

    if (isToday) {
        return `Today at ${timeFormatted}`;
    } else if (isTomorrow) {
        return `Tomorrow at ${timeFormatted}`;
    } else {
        const months = [
            "Jan", "Feb", "Mar", "Apr", "May", "Jun",
            "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
        ];
        return `${months[date.getMonth()]} ${date.getDate()} at ${timeFormatted}`;
    }
};

const BookingModal = ({
    visible,
    onClose,
    agency,
    bookingState,
    setBooking,
    currentUser,
    bookings,
}) => {
    const dispatch = useDispatch();
    const navigation = useNavigation();
    const toast = useToast();

    const [bookingDialogTab, setBookingDialogTab] = useState("details");
    const [selectedVehicleOption, setSelectedVehicleOption] = useState("");
    const [vehicleMenuVisible, setVehicleMenuVisible] = useState(false);
    const [serverAvailability, setServerAvailability] = useState(null);

    const [pickerState, setPickerState] = useState({
        visible: false,
        mode: "date",
        target: "from",
        value: new Date(),
    });

    const openPicker = useCallback(
        (mode, target) => {
            let defaultDate = new Date();
            try {
                if (
                    target === "from" &&
                    bookingState.fromDate &&
                    bookingState.fromTime
                ) {
                    const parsed = new Date(
                        `${bookingState.fromDate}T${bookingState.fromTime}`
                    );
                    if (!isNaN(parsed.getTime())) defaultDate = parsed;
                } else if (
                    target === "to" &&
                    bookingState.toDate &&
                    bookingState.toTime
                ) {
                    const parsed = new Date(
                        `${bookingState.toDate}T${bookingState.toTime}`
                    );
                    if (!isNaN(parsed.getTime())) defaultDate = parsed;
                }
            } catch (e) {
                console.error("Date parse error for picker:", e);
            }
            setPickerState({
                visible: true,
                mode,
                target,
                value: defaultDate,
            });
        },
        [
            bookingState.fromDate,
            bookingState.fromTime,
            bookingState.toDate,
            bookingState.toTime,
        ]
    );

    const handlePickerChange = useCallback(
        (event, selectedDate) => {
            if (Platform.OS === "android") {
                setPickerState((prev) => ({ ...prev, visible: false }));
            }

            if (selectedDate && event.type !== "dismissed") {
                const { mode, target } = pickerState;

                if (Platform.OS === "ios") {
                    setPickerState((prev) => ({
                        ...prev,
                        value: selectedDate,
                    }));
                }

                let proposedFromDate = bookingState.fromDate;
                let proposedFromTime = bookingState.fromTime;
                let proposedToDate = bookingState.toDate;
                let proposedToTime = bookingState.toTime;

                if (target === "from") {
                    if (mode === "date") {
                        proposedFromDate = formatDate(selectedDate);
                    } else {
                        proposedFromTime = formatTime(selectedDate);
                    }
                } else if (target === "to") {
                    if (mode === "date") {
                        proposedToDate = formatDate(selectedDate);
                    } else {
                        proposedToTime = formatTime(selectedDate);
                    }
                }

                const now = new Date();
                const proposedStart = new Date(
                    `${proposedFromDate}T${proposedFromTime}`
                );
                const proposedEnd = new Date(
                    `${proposedToDate}T${proposedToTime}`
                );

                if (
                    target === "from" &&
                    proposedStart.getTime() < now.getTime() - 60000
                ) {
                    toast.error(
                        "Cannot select a start date/time in the past.",
                        "Validation Error",
                        true
                    );
                    return;
                }

                if (proposedEnd.getTime() <= proposedStart.getTime()) {
                    if (target === "to") {
                        toast.error(
                            "End date/time must be after start date/time.",
                            "Validation Error",
                            true
                        );
                        return;
                    } else {
                        const bumpedTo = new Date(
                            proposedStart.getTime() + 2 * 60 * 60 * 1000
                        );
                        setBooking({
                            fromDate: proposedFromDate,
                            fromTime: proposedFromTime,
                            toDate: formatDate(bumpedTo),
                            toTime: formatTime(bumpedTo),
                        });
                        return;
                    }
                }

                if (target === "from") {
                    setBooking({
                        fromDate: proposedFromDate,
                        fromTime: proposedFromTime,
                    });
                } else if (target === "to") {
                    setBooking({
                        toDate: proposedToDate,
                        toTime: proposedToTime,
                    });
                }
            } else {
                setPickerState((prev) => ({ ...prev, visible: false }));
            }
        },
        [pickerState, bookingState, setBooking, toast]
    );

    const getMinimumDateForPicker = useCallback(() => {
        if (pickerState.target === "to" && bookingState.fromDate) {
            const fromD = new Date(`${bookingState.fromDate}T00:00:00`);
            if (!isNaN(fromD.getTime())) return fromD;
        }
        return new Date();
    }, [pickerState.target, bookingState.fromDate]);

    const getCalculatedDuration = useCallback(() => {
        try {
            if (
                !bookingState.fromDate ||
                !bookingState.fromTime ||
                !bookingState.toDate ||
                !bookingState.toTime
            ) {
                return 0;
            }
            const fromStr = `${bookingState.fromDate}T${bookingState.fromTime}`;
            const toStr = `${bookingState.toDate}T${bookingState.toTime}`;
            const start = new Date(fromStr);
            const end = new Date(toStr);
            if (isNaN(start.getTime()) || isNaN(end.getTime())) {
                return 0;
            }
            const diffMs = end.getTime() - start.getTime();
            const diffHrs = diffMs / (1000 * 60 * 60);
            return parseFloat(diffHrs.toFixed(2));
        } catch {
            return 0;
        }
    }, [
        bookingState.fromDate,
        bookingState.fromTime,
        bookingState.toDate,
        bookingState.toTime,
    ]);

    const calculatedDuration = getCalculatedDuration();

    const getAvailabilityInfo = useCallback(() => {
        if (!agency) {
            return {
                isAvailable: false,
                capacity: 0,
                booked: 0,
                availableSpots: 0,
            };
        }

        const selectedType = bookingState.vehicleType || "car";
        const capacityKeys = [
            `${selectedType}_capacity`,
            `${selectedType}Capacity`,
            selectedType === "twoWheeler" ? "two_wheeler_capacity" : null,
            selectedType === "threeWheeler" ? "three_wheeler_capacity" : null,
        ].filter(Boolean);

        let capacity;
        for (const k of capacityKeys) {
            if (
                agency[k] !== undefined &&
                agency[k] !== null &&
                agency[k] !== ""
            ) {
                capacity = Number(agency[k]);
                break;
            }
        }

        if (capacity === undefined || isNaN(capacity)) {
            capacity = Number(agency.car_capacity ?? agency.carCapacity ?? 20);
        }

        const targetAgencyId = String(agency.id || agency.org_id || "");

        // Determine requested booking interval
        let reqStart = null;
        let reqEnd = null;
        if (bookingState.fromDate && bookingState.fromTime) {
            const s = new Date(`${bookingState.fromDate}T${bookingState.fromTime}`);
            if (!isNaN(s.getTime())) reqStart = s;
        }
        if (bookingState.toDate && bookingState.toTime) {
            const e = new Date(`${bookingState.toDate}T${bookingState.toTime}`);
            if (!isNaN(e.getTime())) reqEnd = e;
        }

        const now = new Date();

        const parsedMatchingBookings = [];
        (bookings || []).forEach((b) => {
            const bAgencyId = String(
                b.agencyId || b.agency_id || b.org_id || ""
            );
            const bVehicleType = b.vehicleType || b.vehicle_type;
            const bStatus = b.status;

            if (bAgencyId !== targetAgencyId) return;

            // Match vehicle type flexibly (e.g. twoWheeler / two_wheeler)
            const normSelected = selectedType.toLowerCase().replace(/[-_\s]/g, "");
            const normBType = (bVehicleType || "").toLowerCase().replace(/[-_\s]/g, "");
            const isTypeMatch =
                normSelected === normBType ||
                ((normSelected.includes("twowheeler") || normSelected === "bike") &&
                    (normBType.includes("twowheeler") || normBType === "bike")) ||
                ((normSelected.includes("threewheeler") || normSelected === "auto") &&
                    (normBType.includes("threewheeler") || normBType === "auto"));

            if (!isTypeMatch) return;

            if (!["booked", "checked_in", "pending_approval"].includes(bStatus)) {
                return;
            }

            const bStartRaw =
                b.bookingStartTime ||
                b.booking_start_time ||
                b.startTime ||
                b.start_time ||
                b.checkinTime;
            if (!bStartRaw) return;

            const bStart = new Date(bStartRaw);
            if (isNaN(bStart.getTime())) return;

            let bEnd;
            const bEndRaw =
                b.bookingEndTime ||
                b.booking_end_time ||
                b.endTime ||
                b.end_time;
            if (bEndRaw) {
                bEnd = new Date(bEndRaw);
            } else {
                const durHours =
                    parseFloat(b.bookedDuration || b.booked_duration) || 1;
                bEnd = new Date(bStart.getTime() + durHours * 3600000);
            }

            if (bStatus === "checked_in" && bEnd < now) {
                bEnd = now;
            }

            parsedMatchingBookings.push({ id: b.id, start: bStart, end: bEnd });
        });

        const overlappingBookings = parsedMatchingBookings.filter(
            (b) => !reqStart || !reqEnd || (b.start < reqEnd && b.end > reqStart)
        );

        const activeCount = overlappingBookings.length;
        const availableSpots = Math.max(0, capacity - activeCount);
        const isAvailable = capacity > 0 && availableSpots > 0;

        let nextAvailableFrom = null;
        let nextAvailableWindow = null;

        if (!isAvailable && capacity > 0 && reqStart && reqEnd) {
            const durationMs = reqEnd.getTime() - reqStart.getTime();

            const getLocalOccupancy = (t) => {
                let count = 0;
                for (const b of parsedMatchingBookings) {
                    if (b.start <= t && b.end > t) count++;
                }
                return count;
            };

            const isWindowFree = (wStart, wEnd) => {
                const points = [wStart, wEnd];
                for (const b of parsedMatchingBookings) {
                    if (b.start > wStart && b.start < wEnd) points.push(b.start);
                    if (b.end > wStart && b.end < wEnd) points.push(b.end);
                }
                points.sort((a, b) => a.getTime() - b.getTime());

                for (let i = 0; i < points.length - 1; i++) {
                    const mid = new Date(
                        (points[i].getTime() + points[i + 1].getTime()) / 2
                    );
                    if (getLocalOccupancy(mid) >= capacity) return false;
                }
                return true;
            };

            const rawCands = [
                new Date(Math.max(reqStart.getTime(), now.getTime())),
            ];
            for (const b of parsedMatchingBookings) {
                if (b.end >= reqStart) {
                    rawCands.push(new Date(b.end.getTime()));
                }
            }
            rawCands.sort((a, b) => a.getTime() - b.getTime());

            const uniqueCands = [];
            for (const cand of rawCands) {
                if (
                    !uniqueCands.some(
                        (u) => Math.abs(u.getTime() - cand.getTime()) < 1000
                    )
                ) {
                    uniqueCands.push(cand);
                }
            }

            for (const cand of uniqueCands) {
                if (getLocalOccupancy(cand) < capacity) {
                    nextAvailableFrom = cand.toISOString();
                    break;
                }
            }

            for (const cand of uniqueCands) {
                const candEnd = new Date(cand.getTime() + durationMs);
                if (isWindowFree(cand, candEnd)) {
                    nextAvailableWindow = {
                        startTime: cand.toISOString(),
                        endTime: candEnd.toISOString(),
                    };
                    if (!nextAvailableFrom) {
                        nextAvailableFrom = cand.toISOString();
                    }
                    break;
                }
            }

            if (!nextAvailableWindow && parsedMatchingBookings.length > 0) {
                const latestEndMs = Math.max(
                    reqStart.getTime(),
                    now.getTime(),
                    ...parsedMatchingBookings.map((b) => b.end.getTime())
                );
                const fallbackStart = new Date(latestEndMs);
                const fallbackEnd = new Date(latestEndMs + durationMs);
                nextAvailableFrom =
                    nextAvailableFrom || fallbackStart.toISOString();
                nextAvailableWindow = {
                    startTime: fallbackStart.toISOString(),
                    endTime: fallbackEnd.toISOString(),
                };
            }
        }

        return {
            capacity,
            booked: activeCount,
            availableSpots,
            isAvailable,
            nextAvailableFrom,
            nextAvailableWindow,
        };
    }, [
        agency,
        bookingState.vehicleType,
        bookingState.fromDate,
        bookingState.fromTime,
        bookingState.toDate,
        bookingState.toTime,
        bookings,
    ]);

    // Query backend real-time availability whenever vehicle or dates change
    useEffect(() => {
        if (
            !visible ||
            !agency ||
            !bookingState.fromDate ||
            !bookingState.fromTime ||
            !bookingState.toDate ||
            !bookingState.toTime
        ) {
            setServerAvailability(null);
            return;
        }

        let isMounted = true;
        const fetchAvailability = async () => {
            try {
                const s = new Date(
                    `${bookingState.fromDate}T${bookingState.fromTime}`
                );
                const e = new Date(
                    `${bookingState.toDate}T${bookingState.toTime}`
                );
                if (isNaN(s.getTime()) || isNaN(e.getTime()) || e <= s) {
                    return;
                }

                const res = await apiService.get("bookings/availability", {
                    params: {
                        agencyId: agency.id || agency.org_id,
                        vehicleType: bookingState.vehicleType || "car",
                        startTime: s.toISOString(),
                        endTime: e.toISOString(),
                    },
                });

                if (isMounted && res && res.success && res.data) {
                    setServerAvailability(res.data);
                }
            } catch (err) {
                // If remote query fails, local calculation serves as fallback
                console.log(
                    "Remote availability query note:",
                    err?.message || err
                );
            }
        };

        const timer = setTimeout(fetchAvailability, 250);
        return () => {
            isMounted = false;
            clearTimeout(timer);
        };
    }, [
        visible,
        agency,
        bookingState.vehicleType,
        bookingState.fromDate,
        bookingState.fromTime,
        bookingState.toDate,
        bookingState.toTime,
    ]);

    const localAvailability = getAvailabilityInfo();
    const availability = serverAvailability || localAvailability;

    const applyNextAvailableTime = () => {
        const targetWindow =
            availability?.nextAvailableWindow ||
            (availability?.nextAvailableFrom
                ? {
                      startTime: availability.nextAvailableFrom,
                      endTime: new Date(
                          new Date(availability.nextAvailableFrom).getTime() +
                              (calculatedDuration > 0
                                  ? calculatedDuration
                                  : 1) *
                                  3600000
                      ).toISOString(),
                  }
                : null);

        if (!targetWindow || !targetWindow.startTime) return;

        const s = new Date(targetWindow.startTime);
        const e = new Date(targetWindow.endTime);

        const pad = (n) => String(n).padStart(2, "0");

        const fromDateStr = `${s.getFullYear()}-${pad(s.getMonth() + 1)}-${pad(
            s.getDate()
        )}`;
        const fromTimeStr = `${pad(s.getHours())}:${pad(s.getMinutes())}`;

        const toDateStr = `${e.getFullYear()}-${pad(e.getMonth() + 1)}-${pad(
            e.getDate()
        )}`;
        const toTimeStr = `${pad(e.getHours())}:${pad(e.getMinutes())}`;

        setBooking({
            fromDate: fromDateStr,
            fromTime: fromTimeStr,
            toDate: toDateStr,
            toTime: toTimeStr,
        });

        toast.info(
            `Adjusted booking time to next available slot (${formatTime12h(
                fromTimeStr
            )} - ${formatTime12h(toTimeStr)})`,
            "Slot Selected",
            true
        );
    };

    const currentHourlyRate =
        (agency?.[`${bookingState.vehicleType}_rate`] ??
            VEHICLE_TYPE_RATES[bookingState.vehicleType]) ||
        40;

    const estimatedCost = Math.max(
        0,
        parseFloat((currentHourlyRate * calculatedDuration).toFixed(2))
    );

    const handleConfirmBooking = useCallback(async () => {
        if (!bookingState.vehicleNum) {
            toast.error(
                "Please enter your vehicle registration number.",
                "Error",
                true
            );
            return;
        }

        if (calculatedDuration <= 0) {
            toast.error(
                "Parking 'To' time must be after 'From' time.",
                "Error",
                true
            );
            return;
        }

        const startTimeStr = `${bookingState.fromDate}T${bookingState.fromTime}`;
        const startTime = new Date(startTimeStr);
        const now = new Date();
        if (startTime.getTime() < now.getTime() - 60000) {
            toast.error(
                "Cannot create a booking starting in the past.",
                "Error",
                true
            );
            return;
        }

        if (!availability.isAvailable) {
            toast.error(
                "No parking spots are available for this vehicle type during the selected time slot.",
                "Unavailable",
                true
            );
            return;
        }

        try {
            const whRes = await apiService.get(
                `working-hours/agency/${agency.id}`
            );
            if (whRes && whRes.success && whRes.data) {
                const wh = whRes.data;
                const bStart = startTime;
                const endTimeStr = `${bookingState.toDate}T${bookingState.toTime}`;
                const bEnd = new Date(endTimeStr);

                if (wh.specialVacations && Array.isArray(wh.specialVacations)) {
                    for (const v of wh.specialVacations) {
                        if (v.startDate && v.endDate) {
                            const vStart = new Date(`${v.startDate}T00:00:00`);
                            const vEnd = new Date(`${v.endDate}T23:59:59`);
                            if (
                                (bStart >= vStart && bStart <= vEnd) ||
                                (bEnd >= vStart && bEnd <= vEnd) ||
                                (bStart <= vStart && bEnd >= vEnd)
                            ) {
                                toast.error(
                                    `Parking location is closed for holiday '${
                                        v.title || "Vacation"
                                    }' (${v.startDate} to ${v.endDate}).`,
                                    "Location Closed",
                                    true
                                );
                                return;
                            }
                        }
                    }
                }

                const daysOfWeek = [
                    "Sunday",
                    "Monday",
                    "Tuesday",
                    "Wednesday",
                    "Thursday",
                    "Friday",
                    "Saturday",
                ];
                const startDay = daysOfWeek[bStart.getDay()];
                const endDay = daysOfWeek[bEnd.getDay()];

                let dailySchedules = wh.dailySchedules;
                if (!dailySchedules || typeof dailySchedules !== "object") {
                    const ALL_DAYS = [
                        "Monday",
                        "Tuesday",
                        "Wednesday",
                        "Thursday",
                        "Friday",
                        "Saturday",
                        "Sunday",
                    ];
                    dailySchedules = {};
                    ALL_DAYS.forEach((day) => {
                        dailySchedules[day] = {
                            isOpen: Array.isArray(wh.workingDays)
                                ? wh.workingDays.includes(day)
                                : true,
                            is247: Boolean(wh.is247),
                            openTime: wh.openTime || "08:00",
                            closeTime: wh.closeTime || "20:00",
                        };
                    });
                }

                const startDaySched = dailySchedules[startDay];
                const endDaySched = dailySchedules[endDay];

                if (!startDaySched || startDaySched.isOpen === false) {
                    toast.error(
                        `Parking location is closed on ${startDay}s.`,
                        "Location Closed",
                        true
                    );
                    return;
                }
                if (!endDaySched || endDaySched.isOpen === false) {
                    toast.error(
                        `Parking location is closed on ${endDay}s.`,
                        "Location Closed",
                        true
                    );
                    return;
                }

                const parseTimeVal = (tStr) => {
                    const [h, m] = (tStr || "00:00").split(":").map(Number);
                    return h + (m || 0) / 60;
                };

                const startVal = bStart.getHours() + bStart.getMinutes() / 60;
                const endVal = bEnd.getHours() + bEnd.getMinutes() / 60;
                const isDifferentDay =
                    bStart.toDateString() !== bEnd.toDateString();

                if (!startDaySched.is247) {
                    const dayOpenVal = parseTimeVal(
                        startDaySched.openTime || "08:00"
                    );
                    const dayCloseVal = parseTimeVal(
                        startDaySched.closeTime || "20:00"
                    );

                    if (dayCloseVal > dayOpenVal) {
                        if (startVal < dayOpenVal || startVal > dayCloseVal) {
                            toast.error(
                                `Parking location is closed at start time on ${startDay}. Operating hours are ${startDaySched.openTime} to ${startDaySched.closeTime}.`,
                                "Location Closed",
                                true
                            );
                            return;
                        }
                        if (!isDifferentDay && endVal > dayCloseVal) {
                            toast.error(
                                `Parking location is closed before end time on ${startDay}. Operating hours are ${startDaySched.openTime} to ${startDaySched.closeTime}.`,
                                "Location Closed",
                                true
                            );
                            return;
                        }
                    } else if (dayCloseVal < dayOpenVal) {
                        const isStartOpen =
                            startVal >= dayOpenVal || startVal <= dayCloseVal;
                        if (!isStartOpen) {
                            toast.error(
                                `Parking location is closed at start time on ${startDay}. Operating hours are ${startDaySched.openTime} to ${startDaySched.closeTime}.`,
                                "Location Closed",
                                true
                            );
                            return;
                        }
                    }
                }
            }
        } catch (checkErr) {
            console.error("Working hours pre-check error:", checkErr);
        }

        const hourlyRate =
            agency[`${bookingState.vehicleType}_rate`] ||
            VEHICLE_TYPE_RATES[bookingState.vehicleType] ||
            40;

        const endTimeStr = `${bookingState.toDate}T${bookingState.toTime}`;

        const bookingData = {
            userId: currentUser?.id || null,
            userName: currentUser?.name || "Customer",
            userPhone: currentUser?.phone_number || "+91 7000000000",
            agencyId: agency.id,
            agencyName: agency.name,
            vehicleType: bookingState.vehicleType,
            vehicleNumber: (bookingState.vehicleNum || "").toUpperCase(),
            bookedDuration: calculatedDuration,
            hourlyRate,
            startTime: startTime.toISOString(),
            endTime: new Date(endTimeStr).toISOString(),
        };

        try {
            const res = await apiService.post("bookings/create", bookingData);

            if (res && res.success) {
                const serverBooking = res.data;
                dispatch(
                    addBooking({
                        id: serverBooking.id
                            ? String(serverBooking.id)
                            : `book_${Date.now()}`,
                        bookingCode: serverBooking.bookingCode,
                        userId: serverBooking.userId
                            ? String(serverBooking.userId)
                            : currentUser?.id || "user_customer",
                        userName: serverBooking.userName,
                        userPhone: serverBooking.userPhone || "+91 7000000000",
                        agencyId: String(serverBooking.agencyId),
                        agencyName: serverBooking.agencyName,
                        vehicleType: serverBooking.vehicleType,
                        vehicleNumber: serverBooking.vehicleNumber,
                        status: serverBooking.status || "booked",
                        startTime: serverBooking.startTime,
                        endTime: serverBooking.endTime,
                        bookingStartTime: serverBooking.bookingStartTime,
                        bookingEndTime: serverBooking.bookingEndTime,
                        bookedDuration: parseFloat(
                            serverBooking.bookedDuration
                        ),
                        hourlyRate: parseFloat(serverBooking.hourlyRate),
                        totalBill: parseFloat(serverBooking.totalBill || 0),
                        paymentStatus: serverBooking.paymentStatus || "pending",
                        otp: serverBooking.otp,
                    })
                );

                const isPendingApproval =
                    serverBooking.status === "pending_approval";
                toast.success(
                    isPendingApproval
                        ? `Booking request submitted! Code: ${serverBooking.bookingCode} (Awaiting Admin Approval)`
                        : `Reserved successfully! Booking Code: ${serverBooking.bookingCode}`,
                    isPendingApproval
                        ? "Request Submitted"
                        : "Reservation Complete",
                    true
                );
                onClose();
            } else {
                toast.error(
                    res?.message ||
                        "Failed to create booking on backend server.",
                    "Booking Error",
                    true
                );
            }
        } catch (error) {
            console.error("Booking API Error:", error);
            const backendMessage =
                error.response?.data?.message ||
                error.response?.data?.error ||
                (typeof error.response?.data === "string"
                    ? error.response.data
                    : null);
            toast.error(
                backendMessage || "Failed to create booking. Please try again.",
                "Booking Error",
                true
            );
        }
    }, [
        agency,
        availability.isAvailable,
        bookingState,
        calculatedDuration,
        currentUser,
        dispatch,
        onClose,
        toast,
    ]);

    const savedVehicles = currentUser?.vehicle_numbers
        ? (() => {
              try {
                  let parsed = [];
                  if (currentUser.vehicle_numbers.startsWith("[")) {
                      parsed = JSON.parse(currentUser.vehicle_numbers);
                  } else {
                      parsed = currentUser.vehicle_numbers
                          .split(",")
                          .map((v) => v.trim())
                          .filter(Boolean);
                  }
                  if (Array.isArray(parsed)) {
                      return parsed.filter((v) => {
                          if (typeof v === "string") return true; // Legacy string
                          return v.status === "approved";
                      });
                  }
                  return [];
              } catch (e) {
                  console.error("Error parsing user vehicles:", e);
                  return [];
              }
          })()
        : [];

    const cancellationRules = (() => {
        try {
            let res = agency?.cancellationPolicy ?? agency?.cancellation_policy;
            if (typeof res === "string") {
                try {
                    res = JSON.parse(res);
                } catch {
                    res = [];
                }
            }
            if (typeof res === "string") {
                try {
                    res = JSON.parse(res);
                } catch {
                    res = [];
                }
            }
            if (Array.isArray(res)) return res;
            if (res && typeof res === "object" && Array.isArray(res.rules)) {
                return res.rules;
            }
            return [];
        } catch {
            return [];
        }
    })();

    const isCctvAvailable = Boolean(
        agency?.cctv_available === true ||
        agency?.cctv_available === 1 ||
        agency?.cctv_available === "1" ||
        agency?.cctv_available === "yes" ||
        agency?.cctv_available === "true"
    );

    if (!visible) return null;

    return (
        <Modal
            visible={visible}
            onRequestClose={onClose}
            transparent={true}
            animationType="fade"
            statusBarTranslucent={true}
        >
            <Provider>
                <View className="flex-1 bg-black/50 justify-center items-center p-4">
                    <View className="bg-white p-6 rounded-2xl max-w-[450px] w-full max-h-[90%] shadow-xl">
                        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 2 }}>
                            <Text className="text-lg font-bold text-slate-800">
                                Reserve Parking Slot
                            </Text>
                            {isCctvAvailable && (
                                <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#ecfdf5", borderColor: "#a7f3d0", borderWidth: 1, paddingHorizontal: 7, paddingVertical: 2.5, borderRadius: 8 }}>
                                    <MaterialDesignIcons name="cctv" size={13} color="#059669" />
                                    <Text style={{ fontSize: 11, fontWeight: "700", color: "#047857", marginLeft: 4 }}>
                                        CCTV Available
                                    </Text>
                                </View>
                            )}
                        </View>
                        <Text className="text-xs text-slate-500 mb-3">
                            {agency?.name}
                        </Text>

                        {/* Modal Tabs Header */}
                        <View
                            style={{
                                flexDirection: "row",
                                backgroundColor: "#f1f5f9",
                                padding: 4,
                                borderRadius: 12,
                                marginBottom: 16,
                            }}
                        >
                            <TouchableOpacity
                                activeOpacity={0.8}
                                onPress={() => setBookingDialogTab("details")}
                                style={{
                                    flex: 1,
                                    paddingVertical: 8,
                                    alignItems: "center",
                                    borderRadius: 8,
                                    backgroundColor:
                                        bookingDialogTab === "details"
                                            ? "#ffffff"
                                            : "transparent",
                                    elevation:
                                        bookingDialogTab === "details" ? 1 : 0,
                                }}
                            >
                                <Text
                                    style={{
                                        fontSize: 12,
                                        fontWeight: "bold",
                                        color:
                                            bookingDialogTab === "details"
                                                ? "#ff9933"
                                                : "#475569",
                                    }}
                                >
                                    Booking Details
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                activeOpacity={0.8}
                                onPress={() =>
                                    setBookingDialogTab("cancellation")
                                }
                                style={{
                                    flex: 1,
                                    paddingVertical: 8,
                                    alignItems: "center",
                                    borderRadius: 8,
                                    backgroundColor:
                                        bookingDialogTab === "cancellation"
                                            ? "#ffffff"
                                            : "transparent",
                                    elevation:
                                        bookingDialogTab === "cancellation"
                                            ? 1
                                            : 0,
                                }}
                            >
                                <Text
                                    style={{
                                        fontSize: 12,
                                        fontWeight: "bold",
                                        color:
                                            bookingDialogTab === "cancellation"
                                                ? "#ff9933"
                                                : "#475569",
                                    }}
                                >
                                    Cancellation Policy
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* Tab 1: Booking Details */}
                        {bookingDialogTab === "details" && (
                            <View>
                                {savedVehicles.length === 0 ? (
                                    <View className="bg-amber-50 p-3 rounded-xl border border-amber-200 mb-4 items-center">
                                        <Text className="text-amber-800 text-xs font-semibold text-center mb-2">
                                            No approved vehicle numbers available. Please register your vehicle in Profile and wait for Super Admin approval.
                                        </Text>
                                        <Button
                                            mode="contained"
                                            buttonColor="#d97706"
                                            className="rounded-lg h-[36px] justify-center"
                                            labelStyle={{
                                                fontSize: 12,
                                                marginVertical: 0,
                                            }}
                                            onPress={() => {
                                                onClose();
                                                navigation.navigate("Profile");
                                            }}
                                        >
                                            Go to Profile
                                        </Button>
                                    </View>
                                ) : (
                                    <View className="mb-4">
                                        <Menu
                                            visible={vehicleMenuVisible}
                                            onDismiss={() =>
                                                setVehicleMenuVisible(false)
                                            }
                                            anchor={
                                                <TouchableOpacity
                                                    onPress={() =>
                                                        setVehicleMenuVisible(
                                                            true
                                                        )
                                                    }
                                                    activeOpacity={0.8}
                                                >
                                                    <View pointerEvents="none">
                                                        <TextInput
                                                            label="Select Vehicle *"
                                                            value={
                                                                selectedVehicleOption ||
                                                                bookingState.vehicleNum
                                                            }
                                                            mode="outlined"
                                                            dense
                                                            className="bg-white"
                                                            outlineColor="#ff9933"
                                                            activeOutlineColor="#ff9933"
                                                            editable={false}
                                                            textColor="#0f172a"
                                                            theme={{
                                                                colors: {
                                                                    onSurfaceVariant:
                                                                        "#ff9933",
                                                                },
                                                            }}
                                                            left={
                                                                <TextInput.Icon
                                                                    color={
                                                                        "#0f172a"
                                                                    }
                                                                    icon="car"
                                                                />
                                                            }
                                                            right={
                                                                <TextInput.Icon
                                                                    color={
                                                                        "#0f172a"
                                                                    }
                                                                    icon="chevron-down"
                                                                />
                                                            }
                                                        />
                                                    </View>
                                                </TouchableOpacity>
                                            }
                                            contentStyle={{
                                                backgroundColor: "white",
                                                width: 280,
                                                borderRadius: 8,
                                            }}
                                        >
                                            {savedVehicles.map((vObj) => {
                                                const vNum =
                                                    typeof vObj === "string"
                                                        ? vObj
                                                        : vObj.number;
                                                return (
                                                    <Menu.Item
                                                        key={vNum}
                                                        onPress={() => {
                                                            setSelectedVehicleOption(
                                                                vNum
                                                            );
                                                            setBooking({
                                                                vehicleNum:
                                                                    vNum,
                                                            });
                                                            setVehicleMenuVisible(
                                                                false
                                                            );
                                                        }}
                                                        title={vNum}
                                                        titleStyle={{
                                                            color: "#0f172a",
                                                            fontSize: 15,
                                                        }}
                                                    />
                                                );
                                            })}
                                        </Menu>
                                    </View>
                                )}

                                <Text className="text-sm font-semibold text-slate-700 mb-2">
                                    Select Vehicle Type
                                </Text>
                                <View className="flex-row flex-wrap gap-2 mb-4">
                                    {Object.keys(VEHICLE_TYPE_LABELS)
                                        .filter(
                                            (key) =>
                                                agency &&
                                                (agency[`${key}_capacity`] >
                                                    0 ||
                                                    agency[`${key}Capacity`] >
                                                        0 ||
                                                    agency[
                                                        `${key}_capacity`
                                                    ] === undefined)
                                        )
                                        .map((key) => (
                                            <TouchableOpacity
                                                key={key}
                                                onPress={() =>
                                                    setBooking({
                                                        vehicleType: key,
                                                    })
                                                }
                                                className={`flex-row items-center px-3 py-1.5 rounded-full border ${
                                                    bookingState.vehicleType ===
                                                    key
                                                        ? "bg-carrot-50 border-carrot-600"
                                                        : "bg-white border-slate-200"
                                                }`}
                                            >
                                                <Avatar.Icon
                                                    size={18}
                                                    icon={
                                                        VEHICLE_TYPE_ICONS[key]
                                                    }
                                                    style={{
                                                        backgroundColor:
                                                            "transparent",
                                                    }}
                                                    color={
                                                        bookingState.vehicleType ===
                                                        key
                                                            ? "#ff9933"
                                                            : "#64748b"
                                                    }
                                                />
                                                <Text
                                                    className={`text-xs ml-1 font-bold ${
                                                        bookingState.vehicleType ===
                                                        key
                                                            ? "text-carrot-800"
                                                            : "text-slate-600"
                                                    }`}
                                                >
                                                    {VEHICLE_TYPE_LABELS[key]}{" "}
                                                    (₹
                                                    {agency?.[`${key}_rate`] ||
                                                        VEHICLE_TYPE_RATES[key]}
                                                    /h)
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                </View>

                                <Text className="text-sm font-semibold text-slate-700 mb-1">
                                    Parking From
                                </Text>
                                <View className="flex-row gap-2 mb-3">
                                    <TouchableOpacity
                                        onPress={() =>
                                            openPicker("date", "from")
                                        }
                                        className="flex-1"
                                    >
                                        <View pointerEvents="none">
                                            <TextInput
                                                label="Date (YYYY-MM-DD)"
                                                value={bookingState.fromDate}
                                                mode="outlined"
                                                dense
                                                className="bg-white"
                                                outlineColor="#ff9933"
                                                activeOutlineColor="#ff9933"
                                                placeholder="YYYY-MM-DD"
                                                editable={false}
                                                textColor="#0f172a"
                                                theme={{
                                                    colors: {
                                                        onSurfaceVariant:
                                                            "#ff9933",
                                                    },
                                                }}
                                                right={
                                                    <TextInput.Icon
                                                        color={"#0f172a"}
                                                        icon="calendar"
                                                    />
                                                }
                                            />
                                        </View>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        onPress={() =>
                                            openPicker("time", "from")
                                        }
                                        className="flex-1"
                                    >
                                        <View pointerEvents="none">
                                            <TextInput
                                                label="Time (HH:MM)"
                                                value={bookingState.fromTime}
                                                mode="outlined"
                                                dense
                                                className="bg-white"
                                                outlineColor="#ff9933"
                                                activeOutlineColor="#ff9933"
                                                placeholder="HH:MM"
                                                editable={false}
                                                textColor="#0f172a"
                                                theme={{
                                                    colors: {
                                                        onSurfaceVariant:
                                                            "#ff9933",
                                                    },
                                                }}
                                                right={
                                                    <TextInput.Icon
                                                        color={"#0f172a"}
                                                        icon="clock-outline"
                                                    />
                                                }
                                            />
                                        </View>
                                    </TouchableOpacity>
                                </View>

                                <Text className="text-sm font-semibold text-slate-700 mb-1">
                                    Parking To
                                </Text>
                                <View className="flex-row gap-2 mb-3">
                                    <TouchableOpacity
                                        onPress={() => openPicker("date", "to")}
                                        className="flex-1"
                                    >
                                        <View pointerEvents="none">
                                            <TextInput
                                                label="Date (YYYY-MM-DD)"
                                                value={bookingState.toDate}
                                                mode="outlined"
                                                dense
                                                className="bg-white"
                                                outlineColor="#ff9933"
                                                activeOutlineColor="#ff9933"
                                                placeholder="YYYY-MM-DD"
                                                editable={false}
                                                textColor="#0f172a"
                                                theme={{
                                                    colors: {
                                                        onSurfaceVariant:
                                                            "#ff9933",
                                                    },
                                                }}
                                                right={
                                                    <TextInput.Icon
                                                        color={"#0f172a"}
                                                        icon="calendar"
                                                    />
                                                }
                                            />
                                        </View>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        onPress={() => openPicker("time", "to")}
                                        className="flex-1"
                                    >
                                        <View pointerEvents="none">
                                            <TextInput
                                                label="Time (HH:MM)"
                                                value={bookingState.toTime}
                                                mode="outlined"
                                                dense
                                                className="bg-white"
                                                outlineColor="#ff9933"
                                                activeOutlineColor="#ff9933"
                                                placeholder="HH:MM"
                                                editable={false}
                                                textColor="#0f172a"
                                                theme={{
                                                    colors: {
                                                        onSurfaceVariant:
                                                            "#ff9933",
                                                    },
                                                }}
                                                right={
                                                    <TextInput.Icon
                                                        color={"#0f172a"}
                                                        icon="clock-outline"
                                                    />
                                                }
                                            />
                                        </View>
                                    </TouchableOpacity>
                                </View>

                                <View className="flex-row justify-between mb-2 px-1">
                                    <Text className="text-xs text-slate-500">
                                        Duration:{" "}
                                        {calculatedDuration > 0
                                            ? `${calculatedDuration} Hrs`
                                            : "--"}
                                    </Text>
                                    <Text
                                        className={`text-xs font-bold ${
                                            availability.isAvailable
                                                ? "text-emerald-600"
                                                : "text-rose-600"
                                        }`}
                                    >
                                        {availability.isAvailable
                                            ? `Available (${availability.availableSpots} spots)`
                                            : "No spots available"}
                                    </Text>
                                </View>

                                {/* Next Slot Available Banner when full */}
                                {!availability.isAvailable && (
                                    <Surface
                                        elevation={1}
                                        className="my-2 p-3.5 rounded-2xl bg-amber-50 border border-amber-200"
                                    >
                                        <View className="flex-row items-center mb-1">
                                            <MaterialDesignIcons
                                                name="clock-alert-outline"
                                                size={18}
                                                color="#b45309"
                                            />
                                            <Text className="text-amber-900 font-bold text-xs ml-1.5">
                                                No spots available at this time
                                            </Text>
                                        </View>
                                        <Text className="text-amber-800 text-[11px] mt-0.5 leading-4">
                                            All {availability.capacity}{" "}
                                            {bookingState.vehicleType || "vehicle"}{" "}
                                            parking{" "}
                                            {availability.capacity === 1
                                                ? "spot is"
                                                : "spots are"}{" "}
                                            booked for your selected time window.
                                        </Text>
                                        {Boolean(
                                            availability.nextAvailableWindow
                                                ?.startTime ||
                                                availability.nextAvailableFrom
                                        ) ? (
                                            <View className="mt-2.5 pt-2.5 border-t border-amber-200/80 flex-row items-center justify-between">
                                                <View className="flex-1 mr-2">
                                                    <Text className="text-[10px] text-amber-700 font-semibold uppercase tracking-wider">
                                                        Slot will be available:
                                                    </Text>
                                                    <Text className="text-amber-950 font-bold text-xs mt-0.5">
                                                        {formatNextAvailableTime(
                                                            availability
                                                                .nextAvailableWindow
                                                                ?.startTime ||
                                                                availability.nextAvailableFrom
                                                        )}
                                                    </Text>
                                                </View>
                                                <TouchableOpacity
                                                    onPress={
                                                        applyNextAvailableTime
                                                    }
                                                    className="bg-carrot-500 active:bg-carrot-600 px-3 py-1.5 rounded-xl flex-row items-center shadow-sm"
                                                >
                                                    <MaterialDesignIcons
                                                        name="calendar-sync"
                                                        size={14}
                                                        color="#ffffff"
                                                    />
                                                    <Text className="text-white text-xs font-bold ml-1">
                                                        Use Slot
                                                    </Text>
                                                </TouchableOpacity>
                                            </View>
                                        ) : (
                                            <Text className="text-amber-700 text-[11px] italic mt-2">
                                                No upcoming slots currently
                                                scheduled to free up.
                                            </Text>
                                        )}
                                    </Surface>
                                )}

                                <Divider className="my-2 bg-slate-100" />

                                {Boolean(availability.isAvailable) && (
                                    <View className="flex-row justify-between items-center py-2 px-1 mb-4">
                                        <Text className="font-bold text-slate-700 text-sm">
                                            Estimated Cost:
                                        </Text>
                                        <Text className="font-bold text-carrot-700 text-xl">
                                            ₹{estimatedCost}
                                        </Text>
                                    </View>
                                )}
                            </View>
                        )}

                        {/* Tab 2: Cancellation Policy */}
                        {bookingDialogTab === "cancellation" && (
                            <View style={{ marginBottom: 16 }}>
                                {!cancellationRules ||
                                cancellationRules.length === 0 ? (
                                    <View
                                        style={{
                                            backgroundColor: "#ecfdf5",
                                            borderColor: "#a7f3d0",
                                            borderWidth: 1,
                                            padding: 16,
                                            borderRadius: 12,
                                            alignItems: "center",
                                            marginVertical: 8,
                                        }}
                                    >
                                        <MaterialDesignIcons
                                            name="check-circle-outline"
                                            size={36}
                                            color="#16a34a"
                                        />
                                        <Text
                                            style={{
                                                fontWeight: "bold",
                                                color: "#065f46",
                                                fontSize: 14,
                                                marginTop: 4,
                                            }}
                                        >
                                            Free Cancellation
                                        </Text>
                                        <Text
                                            style={{
                                                fontSize: 12,
                                                color: "#047857",
                                                textAlign: "center",
                                                marginTop: 4,
                                            }}
                                        >
                                            Customers can cancel their bookings
                                            for free at any time prior to
                                            check-in.
                                        </Text>
                                    </View>
                                ) : (
                                    <View style={{ marginVertical: 4 }}>
                                        <Text
                                            style={{
                                                fontSize: 12,
                                                fontWeight: "bold",
                                                color: "#475569",
                                                marginBottom: 8,
                                            }}
                                        >
                                            Cancellation Rules for this
                                            Location:
                                        </Text>
                                        <ScrollView
                                            nestedScrollEnabled={true}
                                            showsVerticalScrollIndicator={false}
                                            style={{
                                                maxHeight: 240,
                                                width: "100%",
                                            }}
                                        >
                                            {cancellationRules.map(
                                                (rule, idx) => {
                                                    if (
                                                        !rule ||
                                                        typeof rule !== "object"
                                                    ) {
                                                        return null;
                                                    }
                                                    const mins =
                                                        rule.timeBeforeStartMinutes ??
                                                        rule.time_before_start_minutes ??
                                                        (rule.hoursBefore
                                                            ? rule.hoursBefore *
                                                              60
                                                            : 0);
                                                    const timeLabel =
                                                        mins < 60
                                                            ? `${mins} mins`
                                                            : `${(mins / 60)
                                                                  .toFixed(1)
                                                                  .replace(
                                                                      ".0",
                                                                      ""
                                                                  )} hrs`;
                                                    const isAllowed = Boolean(
                                                        rule.allowCancellation ??
                                                            rule.allow_cancellation
                                                    );
                                                    const chargeVal =
                                                        rule.chargeValue ??
                                                        rule.chargeAmount ??
                                                        rule.charge_value ??
                                                        0;
                                                    const feeText =
                                                        rule.chargeType ===
                                                            "percentage" ||
                                                        rule.charge_type ===
                                                            "percentage"
                                                            ? `${chargeVal}% fee`
                                                            : `₹${chargeVal} fee`;

                                                    return (
                                                        <View
                                                            key={`rule-${idx}`}
                                                            style={{
                                                                backgroundColor:
                                                                    "#f8fafc",
                                                                borderColor:
                                                                    "#e2e8f0",
                                                                borderWidth: 1,
                                                                padding: 12,
                                                                borderRadius: 12,
                                                                marginBottom: 8,
                                                                flexDirection:
                                                                    "row",
                                                                justifyContent:
                                                                    "space-between",
                                                                alignItems:
                                                                    "center",
                                                            }}
                                                        >
                                                            <View
                                                                style={{
                                                                    flex: 1,
                                                                    paddingRight: 8,
                                                                }}
                                                            >
                                                                <Text
                                                                    style={{
                                                                        fontSize: 12,
                                                                        fontWeight:
                                                                            "bold",
                                                                        color: "#334155",
                                                                    }}
                                                                >
                                                                    Within{" "}
                                                                    {timeLabel}{" "}
                                                                    of start:
                                                                </Text>
                                                                <Text
                                                                    style={{
                                                                        fontSize: 11,
                                                                        color: "#64748b",
                                                                        marginTop: 2,
                                                                    }}
                                                                >
                                                                    {isAllowed
                                                                        ? `Fee: ${feeText}`
                                                                        : "Cancellation is non-refundable"}
                                                                </Text>
                                                            </View>
                                                            <View
                                                                style={{
                                                                    paddingHorizontal: 8,
                                                                    paddingVertical: 4,
                                                                    borderRadius: 6,
                                                                    backgroundColor:
                                                                        isAllowed
                                                                            ? "#fef3c7"
                                                                            : "#ffe4e6",
                                                                }}
                                                            >
                                                                <Text
                                                                    style={{
                                                                        fontSize: 10,
                                                                        fontWeight:
                                                                            "bold",
                                                                        color: isAllowed
                                                                            ? "#92400e"
                                                                            : "#9f1239",
                                                                    }}
                                                                >
                                                                    {isAllowed
                                                                        ? "Fee Applies"
                                                                        : "No Cancel"}
                                                                </Text>
                                                            </View>
                                                        </View>
                                                    );
                                                }
                                            )}
                                        </ScrollView>
                                    </View>
                                )}
                            </View>
                        )}

                        {/* Bottom Action Buttons */}
                        <View className="flex-row justify-end gap-2">
                            <Button
                                mode="outlined"
                                onPress={onClose}
                                textColor="#64748b"
                            >
                                Cancel
                            </Button>
                            <Button
                                mode="contained"
                                onPress={handleConfirmBooking}
                                buttonColor="#ff9933"
                                labelStyle={{ color: "white" }}
                                disabled={
                                    !availability.isAvailable ||
                                    calculatedDuration <= 0 ||
                                    !bookingState.vehicleNum
                                }
                            >
                                Confirm Reservation
                            </Button>
                        </View>

                        {/* Native Picker Components */}
                        {Boolean(
                            pickerState.visible && Platform.OS === "android"
                        ) && (
                            <DateTimePicker
                                value={pickerState.value}
                                mode={pickerState.mode}
                                display="default"
                                onChange={handlePickerChange}
                                accentColor="#ff9933"
                                minimumDate={getMinimumDateForPicker()}
                            />
                        )}

                        {Boolean(
                            pickerState.visible && Platform.OS === "ios"
                        ) && (
                            <Modal
                                visible={pickerState.visible}
                                onRequestClose={() =>
                                    setPickerState((prev) => ({
                                        ...prev,
                                        visible: false,
                                    }))
                                }
                                transparent={true}
                                animationType="fade"
                            >
                                <View className="flex-1 bg-black/50 justify-center items-center p-4">
                                    <View className="bg-white p-6 rounded-2xl max-w-[350px] w-full">
                                        <Text className="text-center font-bold text-slate-800 mb-4 text-base">
                                            Select{" "}
                                            {pickerState.mode === "date"
                                                ? "Date"
                                                : "Time"}
                                        </Text>
                                        <View className="items-center justify-center mb-4">
                                            <DateTimePicker
                                                value={pickerState.value}
                                                mode={pickerState.mode}
                                                display="spinner"
                                                onChange={handlePickerChange}
                                                accentColor="#ff9933"
                                                minimumDate={getMinimumDateForPicker()}
                                            />
                                        </View>
                                        <Button
                                            mode="contained"
                                            onPress={() =>
                                                setPickerState((prev) => ({
                                                    ...prev,
                                                    visible: false,
                                                }))
                                            }
                                            buttonColor="#ff9933"
                                            textColor="white"
                                        >
                                            Done
                                        </Button>
                                    </View>
                                </View>
                            </Modal>
                        )}
                    </View>
                </View>
            </Provider>
        </Modal>
    );
};

export default BookingModal;
