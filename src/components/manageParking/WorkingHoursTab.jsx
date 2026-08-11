import React, { useState, useEffect } from "react";
import {
    View,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Platform,
} from "react-native";
import { Text, Surface, Switch, TextInput, Button, Portal, Modal } from "react-native-paper";
import { MaterialDesignIcons } from "@react-native-vector-icons/material-design-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import apiService from "../../utils/apiService";
import useToast from "../../hooks/useToast";

const DAYS_OF_WEEK = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
];

const createInitialDailySchedules = () => {
    const obj = {};
    DAYS_OF_WEEK.forEach((day) => {
        obj[day] = {
            isOpen: true,
            is247: false,
            openTime: "08:00",
            closeTime: "20:00",
        };
    });
    return obj;
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

const WorkingHoursTab = ({ agencyId, onRefresh }) => {
    const toast = useToast();

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [workingHoursData, setWorkingHoursData] = useState(null);

    // Form state - Per Weekday Schedule
    const [dailySchedules, setDailySchedules] = useState(createInitialDailySchedules());
    const [specialVacations, setSpecialVacations] = useState([]);

    // Vacation modal state
    const [vacationModalVisible, setVacationModalVisible] = useState(false);
    const [vacationTitle, setVacationTitle] = useState("");
    const [vacationStartDate, setVacationStartDate] = useState(
        new Date().toISOString().split("T")[0]
    );
    const [vacationEndDate, setVacationEndDate] = useState(
        new Date().toISOString().split("T")[0]
    );

    // Time & Date picker helper state
    const [timePickerState, setTimePickerState] = useState({
        visible: false,
        day: null, // Weekday name if setting daily schedule time
        field: "openTime", // "openTime", "closeTime", "vacStart", "vacEnd"
        value: new Date(),
        mode: "time", // "time" or "date"
    });

    const populateDailySchedulesFromData = (data, isPending = false) => {
        const rawDaily = isPending ? data.pendingDailySchedules : data.dailySchedules;
        if (rawDaily && typeof rawDaily === "object" && Object.keys(rawDaily).length > 0) {
            const compiled = {};
            DAYS_OF_WEEK.forEach((day) => {
                compiled[day] = {
                    isOpen: rawDaily[day]?.isOpen !== false,
                    is247: Boolean(rawDaily[day]?.is247),
                    openTime: rawDaily[day]?.openTime || "08:00",
                    closeTime: rawDaily[day]?.closeTime || "20:00",
                };
            });
            return compiled;
        }

        // Fallback mapping from legacy fields
        const activeDays = isPending ? data.pendingWorkingDays : data.workingDays;
        const openT = (isPending ? data.pendingOpenTime : data.openTime) || "08:00";
        const closeT = (isPending ? data.pendingCloseTime : data.closeTime) || "20:00";
        const globalIs247 = isPending ? Boolean(data.pendingIs247) : Boolean(data.is247);

        const compiled = {};
        DAYS_OF_WEEK.forEach((day) => {
            const isOpen = Array.isArray(activeDays) ? activeDays.includes(day) : true;
            compiled[day] = {
                isOpen,
                is247: globalIs247,
                openTime: openT,
                closeTime: closeT,
            };
        });
        return compiled;
    };

    const fetchWorkingHours = async () => {
        if (!agencyId) return;
        setLoading(true);
        try {
            const res = await apiService.get(`working-hours/agency/${agencyId}`);
            if (res && res.success && res.data) {
                const data = res.data;
                setWorkingHoursData(data);

                const isPending = data.status === "pending";
                setDailySchedules(populateDailySchedulesFromData(data, isPending));
                setSpecialVacations(
                    (isPending ? data.pendingSpecialVacations : data.specialVacations) || []
                );
            }
        } catch (error) {
            console.error("Error fetching working hours:", error);
            toast.error("Failed to load working hours schedule", "Error", true);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchWorkingHours();
    }, [agencyId]);

    const toggleDayOpen = (day) => {
        const activeCount = Object.values(dailySchedules).filter((s) => s.isOpen).length;
        if (dailySchedules[day].isOpen && activeCount === 1) {
            toast.error("At least one working day must remain open.", "Error", true);
            return;
        }

        setDailySchedules((prev) => ({
            ...prev,
            [day]: {
                ...prev[day],
                isOpen: !prev[day].isOpen,
            },
        }));
    };

    const toggleDay247 = (day) => {
        setDailySchedules((prev) => ({
            ...prev,
            [day]: {
                ...prev[day],
                is247: !prev[day].is247,
            },
        }));
    };

    const copyMondayToAll = () => {
        const mondaySched = dailySchedules["Monday"];
        if (!mondaySched) return;

        setDailySchedules((prev) => {
            const next = { ...prev };
            DAYS_OF_WEEK.forEach((d) => {
                if (d !== "Monday") {
                    next[d] = {
                        ...next[d],
                        is247: mondaySched.is247,
                        openTime: mondaySched.openTime,
                        closeTime: mondaySched.closeTime,
                    };
                }
            });
            return next;
        });

        toast.success("Copied Monday's working hours to all days!", "Success", true);
    };

    const setAllDays247 = (is247Val) => {
        setDailySchedules((prev) => {
            const next = { ...prev };
            DAYS_OF_WEEK.forEach((d) => {
                next[d] = {
                    ...next[d],
                    is247: is247Val,
                };
            });
            return next;
        });
    };

    const handleAddVacation = () => {
        if (!vacationTitle.trim()) {
            toast.error("Please enter a holiday/vacation name.", "Validation Error", true);
            return;
        }
        if (new Date(vacationEndDate) < new Date(vacationStartDate)) {
            toast.error("End date cannot be earlier than start date.", "Validation Error", true);
            return;
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const vStart = new Date(`${vacationStartDate}T00:00:00`);
        const diffTime = vStart.getTime() - today.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 7) {
            toast.error(
                "Special holidays and vacations must be declared at least 7 days in advance.",
                "7 Days Advance Notice Required",
                true
            );
            return;
        }

        const newVacation = {
            id: `vac_${Date.now()}`,
            title: vacationTitle.trim(),
            startDate: vacationStartDate,
            endDate: vacationEndDate,
        };

        setSpecialVacations([...specialVacations, newVacation]);
        setVacationTitle("");
        setVacationModalVisible(false);
        toast.success("Special vacation added to schedule draft.", "Success", true);
    };

    const handleRemoveVacation = (vacId) => {
        setSpecialVacations(specialVacations.filter((v) => v.id !== vacId));
    };

    const handleSubmitForApproval = async () => {
        if (!agencyId) return;

        const openDays = DAYS_OF_WEEK.filter((day) => dailySchedules[day]?.isOpen);
        if (openDays.length === 0) {
            toast.error("Please ensure at least one working day is open.", "Validation Error", true);
            return;
        }

        const parseTimeVal = (tStr) => {
            if (!tStr) return 0;
            const [h, m] = tStr.split(":").map(Number);
            return (h || 0) + (m || 0) / 60;
        };

        for (const day of openDays) {
            const sched = dailySchedules[day];
            if (!sched.is247) {
                if (!sched.openTime || !sched.closeTime) {
                    toast.error(`Please set valid opening and closing times for ${day}.`, "Validation Error", true);
                    return;
                }
                const openVal = parseTimeVal(sched.openTime);
                const closeVal = parseTimeVal(sched.closeTime);

                if (openVal >= closeVal) {
                    toast.error(`Opening time must be earlier than closing time on ${day}.`, "Validation Error", true);
                    return;
                }

                if (closeVal - openVal < 2) {
                    toast.error(`Operating hours duration on ${day} must be at least 2 hours (e.g. 08:00 to 10:00).`, "Validation Error", true);
                    return;
                }
            }
        }

        setSubmitting(true);
        try {
            const firstOpen = dailySchedules[openDays[0]];
            const fallbackOpenTime = firstOpen?.openTime || "08:00";
            const fallbackCloseTime = firstOpen?.closeTime || "20:00";
            const fallbackIs247 = openDays.every((d) => dailySchedules[d]?.is247);

            const payload = {
                workingDays: openDays,
                openTime: fallbackOpenTime,
                closeTime: fallbackCloseTime,
                is247: fallbackIs247,
                dailySchedules,
                specialVacations,
            };

            const res = await apiService.put(
                `working-hours/agency/${agencyId}`,
                payload
            );

            if (res && res.success) {
                toast.success(
                    res.message || "Working hours submitted for Super Admin approval!",
                    "Submitted",
                    true
                );
                fetchWorkingHours();
                if (onRefresh) onRefresh();
            } else {
                toast.error(res?.message || "Failed to save working hours", "Error", true);
            }
        } catch (error) {
            console.error("Error saving working hours:", error);
            const msg =
                error.response?.data?.message || "Failed to submit working hours update";
            toast.error(msg, "Error", true);
        } finally {
            setSubmitting(false);
        }
    };

    const openTimePickerForDay = (day, field) => {
        const timeStr = dailySchedules[day]?.[field] || (field === "openTime" ? "08:00" : "20:00");
        const initialVal = new Date();
        const [h, m] = timeStr.split(":").map(Number);
        initialVal.setHours(h || 8, m || 0, 0, 0);

        setTimePickerState({
            visible: true,
            day,
            field,
            value: initialVal,
            mode: "time",
        });
    };

    const openDatePickerForVacation = (field) => {
        const dStr = field === "vacStart" ? vacationStartDate : vacationEndDate;
        let initialVal = new Date();
        if (dStr) {
            const parsed = new Date(dStr);
            if (!isNaN(parsed.getTime())) initialVal = parsed;
        }
        setTimePickerState({
            visible: true,
            day: null,
            field,
            value: initialVal,
            mode: "date",
        });
    };

    const handlePickerChange = (event, selectedDate) => {
        if (Platform.OS === "android") {
            setTimePickerState((prev) => ({ ...prev, visible: false }));
        }

        if (selectedDate && event.type !== "dismissed") {
            const { day, field, mode } = timePickerState;

            if (mode === "time" && day) {
                const hours = String(selectedDate.getHours()).padStart(2, "0");
                const minutes = String(selectedDate.getMinutes()).padStart(2, "0");
                const formattedTime = `${hours}:${minutes}`;

                setDailySchedules((prev) => ({
                    ...prev,
                    [day]: {
                        ...prev[day],
                        [field]: formattedTime,
                    },
                }));
            } else if (mode === "date") {
                const year = selectedDate.getFullYear();
                const month = String(selectedDate.getMonth() + 1).padStart(2, "0");
                const dayNum = String(selectedDate.getDate()).padStart(2, "0");
                const formattedDate = `${year}-${month}-${dayNum}`;

                if (field === "vacStart") setVacationStartDate(formattedDate);
                else if (field === "vacEnd") setVacationEndDate(formattedDate);
            }
        } else {
            setTimePickerState((prev) => ({ ...prev, visible: false }));
        }
    };

    if (loading) {
        return (
            <View className="py-12 items-center justify-center flex-1 bg-slate-50">
                <ActivityIndicator size="large" color="#4338ca" />
                <Text className="text-slate-500 mt-3 font-semibold text-xs">
                    Loading Working Hours Policy...
                </Text>
            </View>
        );
    }

    const status = workingHoursData?.status || "approved";

    return (
        <ScrollView className="flex-1 bg-slate-50 p-4" contentContainerStyle={{ paddingBottom: 40 }}>
            {/* Status Banner */}
            {status === "pending" && (
                <Surface elevation={1} className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-4 flex-row items-center">
                    <View className="w-10 h-10 rounded-xl bg-amber-100 items-center justify-center mr-3">
                        <MaterialDesignIcons name="clock-fast" size={22} color="#b45309" />
                    </View>
                    <View className="flex-1">
                        <Text className="font-bold text-sm text-amber-900">
                            Changes Pending Approval
                        </Text>
                        <Text className="text-xs text-amber-800 mt-0.5">
                            Your updated working schedule has been submitted and is awaiting review from the Super Admin. Current active hours will remain operational until approved.
                        </Text>
                    </View>
                </Surface>
            )}

            {status === "rejected" && (
                <Surface elevation={1} className="bg-rose-50 border border-rose-200 rounded-2xl p-4 mb-4 flex-row items-center">
                    <View className="w-10 h-10 rounded-xl bg-rose-100 items-center justify-center mr-3">
                        <MaterialDesignIcons name="alert-circle-outline" size={22} color="#be123c" />
                    </View>
                    <View className="flex-1">
                        <Text className="font-bold text-sm text-rose-900">
                            Working Hours Update Rejected
                        </Text>
                        <Text className="text-xs text-rose-800 mt-0.5">
                            Reason: {workingHoursData?.rejectionReason || "No reason provided."}
                        </Text>
                    </View>
                </Surface>
            )}

            {/* Header & Presets Card */}
            <Surface elevation={1} className="bg-white rounded-2xl p-4 mb-4 border border-slate-100">
                <View className="flex-row items-center justify-between mb-2">
                    <View className="flex-row items-center">
                        <MaterialDesignIcons name="calendar-clock" size={24} color="#4338ca" />
                        <Text className="text-slate-800 text-base font-bold ml-2">
                            Daily Schedule & Hours
                        </Text>
                    </View>
                </View>
                <Text className="text-slate-500 text-xs mb-3">
                    Configure open status and custom operating hours for each day of the week individually.
                </Text>

                {/* Quick Action Presets */}
                <View className="flex-row flex-wrap gap-2 pt-1 border-t border-slate-100">
                    <TouchableOpacity
                        onPress={copyMondayToAll}
                        className="bg-indigo-50 px-3 py-1.5 rounded-xl border border-indigo-200 flex-row items-center mr-2 mb-1"
                    >
                        <MaterialDesignIcons name="content-copy" size={14} color="#4338ca" />
                        <Text className="text-indigo-700 font-bold text-xs ml-1">
                            Copy Monday to All
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={() => setAllDays247(true)}
                        className="bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 flex-row items-center mb-1"
                    >
                        <MaterialDesignIcons name="clock-fast" size={14} color="#047857" />
                        <Text className="text-emerald-700 font-bold text-xs ml-1">
                            Set All 24/7
                        </Text>
                    </TouchableOpacity>
                </View>
            </Surface>

            {/* Weekday Editors */}
            {DAYS_OF_WEEK.map((day) => {
                const sched = dailySchedules[day] || {
                    isOpen: true,
                    is247: false,
                    openTime: "08:00",
                    closeTime: "20:00",
                };

                return (
                    <Surface
                        key={day}
                        elevation={1}
                        className={`rounded-2xl p-4 mb-3 border ${
                            sched.isOpen
                                ? "bg-white border-slate-200"
                                : "bg-slate-100 border-slate-200"
                        }`}
                    >
                        {/* Day Header Row */}
                        <View className="flex-row items-center justify-between">
                            <View className="flex-row items-center">
                                <View
                                    className={`w-3 h-3 rounded-full mr-2.5 ${
                                        sched.isOpen ? "bg-emerald-500" : "bg-slate-300"
                                    }`}
                                />
                                <Text className="font-extrabold text-slate-800 text-base">
                                    {day}
                                </Text>
                            </View>

                            <View className="flex-row items-center">
                                <Text className="text-xs font-semibold text-slate-500 mr-2">
                                    {sched.isOpen ? "Open" : "Closed"}
                                </Text>
                                <Switch
                                    value={sched.isOpen}
                                    onValueChange={() => toggleDayOpen(day)}
                                    color="#4338ca"
                                />
                            </View>
                        </View>

                        {/* Day Hours Controls (If Open) */}
                        {sched.isOpen ? (
                            <View className="mt-3 pt-3 border-t border-slate-100">
                                <View className="flex-row items-center justify-between mb-2">
                                    <Text className="text-xs font-bold text-slate-600">
                                        Operating Hours Policy
                                    </Text>
                                    <View className="flex-row items-center">
                                        <Text className="text-[11px] font-semibold text-slate-500 mr-1.5">
                                            24 Hours
                                        </Text>
                                        <Switch
                                            value={sched.is247}
                                            onValueChange={() => toggleDay247(day)}
                                            color="#059669"
                                        />
                                    </View>
                                </View>

                                {!sched.is247 ? (
                                    <View className="flex-row justify-between mt-1">
                                        <TouchableOpacity
                                            className="flex-1 mr-2 p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex-row items-center justify-between"
                                            onPress={() => openTimePickerForDay(day, "openTime")}
                                        >
                                            <View>
                                                <Text className="text-[9px] font-bold text-slate-400">
                                                    OPEN TIME
                                                </Text>
                                                <Text className="text-slate-800 font-extrabold text-sm mt-0.5">
                                                    {formatTime12h(sched.openTime)}
                                                </Text>
                                            </View>
                                            <MaterialDesignIcons name="weather-sunny" size={18} color="#d97706" />
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            className="flex-1 ml-2 p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex-row items-center justify-between"
                                            onPress={() => openTimePickerForDay(day, "closeTime")}
                                        >
                                            <View>
                                                <Text className="text-[9px] font-bold text-slate-400">
                                                    CLOSE TIME
                                                </Text>
                                                <Text className="text-slate-800 font-extrabold text-sm mt-0.5">
                                                    {formatTime12h(sched.closeTime)}
                                                </Text>
                                            </View>
                                            <MaterialDesignIcons name="weather-night" size={18} color="#4338ca" />
                                        </TouchableOpacity>
                                    </View>
                                ) : (
                                    <View className="bg-emerald-50 px-3 py-2 rounded-xl border border-emerald-200 flex-row items-center">
                                        <MaterialDesignIcons name="check-circle" size={16} color="#059669" />
                                        <Text className="text-emerald-800 text-xs font-semibold ml-2">
                                            Open 24 Hours continuous operation
                                        </Text>
                                    </View>
                                )}
                            </View>
                        ) : (
                            <View className="mt-2 pt-2 border-t border-slate-200">
                                <Text className="text-slate-400 text-xs italic">
                                    Parking is completely closed on {day}s.
                                </Text>
                            </View>
                        )}
                    </Surface>
                );
            })}

            {/* Special Vacations / Holidays Section */}
            <Surface elevation={1} className="bg-white rounded-2xl p-4 mb-5 border border-slate-100">
                <View className="flex-row items-center justify-between mb-2">
                    <View className="flex-row items-center">
                        <MaterialDesignIcons name="beach" size={22} color="#4338ca" />
                        <Text className="text-slate-800 text-base font-bold ml-2">
                            Special Vacations & Holidays
                        </Text>
                    </View>
                    <TouchableOpacity
                        className="bg-indigo-50 px-3 py-1.5 rounded-xl border border-indigo-200 flex-row items-center"
                        onPress={() => setVacationModalVisible(true)}
                    >
                        <MaterialDesignIcons name="plus" size={16} color="#4338ca" />
                        <Text className="text-indigo-700 font-bold text-xs ml-1">Add Holiday</Text>
                    </TouchableOpacity>
                </View>
                <Text className="text-slate-500 text-xs mb-3">
                    Add upcoming holiday ranges when your parking lot will be completely closed. (Must be declared at least 7 days in advance).
                </Text>

                {specialVacations.length > 0 ? (
                    specialVacations.map((v) => (
                        <View
                            key={v.id}
                            className="bg-slate-50 p-3 rounded-xl border border-slate-200 mb-2 flex-row items-center justify-between"
                        >
                            <View className="flex-1 mr-2">
                                <Text className="font-bold text-slate-800 text-xs">
                                    {v.title}
                                </Text>
                                <Text className="text-slate-500 text-[11px] mt-0.5">
                                    {v.startDate} to {v.endDate}
                                </Text>
                            </View>
                            <TouchableOpacity
                                onPress={() => handleRemoveVacation(v.id)}
                                className="p-1 bg-rose-100 rounded-lg"
                            >
                                <MaterialDesignIcons name="trash-can-outline" size={18} color="#e11d48" />
                            </TouchableOpacity>
                        </View>
                    ))
                ) : (
                    <View className="bg-slate-50 p-4 rounded-xl items-center border border-dashed border-slate-200">
                        <Text className="text-slate-400 text-xs">No special vacations configured</Text>
                    </View>
                )}
            </Surface>

            {/* Submit Button */}
            <TouchableOpacity
                className={`py-3.5 rounded-2xl flex-row items-center justify-center ${
                    submitting ? "bg-indigo-400" : "bg-indigo-700"
                }`}
                onPress={handleSubmitForApproval}
                disabled={submitting}
            >
                {submitting ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                    <>
                        <MaterialDesignIcons name="send-check" size={20} color="#ffffff" />
                        <Text className="text-white font-bold text-sm ml-2">
                            Submit for Super Admin Approval
                        </Text>
                    </>
                )}
            </TouchableOpacity>

            {/* Vacation Creation Modal */}
            <Portal>
                <Modal
                    visible={vacationModalVisible}
                    onDismiss={() => setVacationModalVisible(false)}
                    contentContainerStyle={{
                        backgroundColor: "white",
                        padding: 20,
                        margin: 20,
                        borderRadius: 20,
                    }}
                >
                    <Text className="text-slate-800 text-lg font-bold mb-3">
                        Add Special Vacation / Holiday
                    </Text>

                    <TextInput
                        label="Holiday Title / Reason"
                        value={vacationTitle}
                        onChangeText={setVacationTitle}
                        mode="outlined"
                        placeholder="e.g. Diwali Break / Maintenance"
                        outlineColor="#e2e8f0"
                        activeOutlineColor="#4338ca"
                        className="mb-3 bg-white"
                    />

                    <View className="flex-row justify-between mb-4">
                        <TouchableOpacity
                            className="flex-1 mr-2 p-3 bg-slate-50 rounded-xl border border-slate-200"
                            onPress={() => openDatePickerForVacation("vacStart")}
                        >
                            <Text className="text-[10px] font-bold text-slate-400">
                                START DATE
                            </Text>
                            <Text className="text-slate-800 font-bold text-sm mt-0.5">
                                {vacationStartDate}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            className="flex-1 ml-2 p-3 bg-slate-50 rounded-xl border border-slate-200"
                            onPress={() => openDatePickerForVacation("vacEnd")}
                        >
                            <Text className="text-[10px] font-bold text-slate-400">
                                END DATE
                            </Text>
                            <Text className="text-slate-800 font-bold text-sm mt-0.5">
                                {vacationEndDate}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    <View className="flex-row justify-end">
                        <Button
                            mode="text"
                            onPress={() => setVacationModalVisible(false)}
                            textColor="#64748b"
                        >
                            Cancel
                        </Button>
                        <Button
                            mode="contained"
                            onPress={handleAddVacation}
                            buttonColor="#4338ca"
                            className="ml-2 rounded-xl"
                        >
                            Add Vacation
                        </Button>
                    </View>
                </Modal>
            </Portal>

            {/* Time / Date Picker Modal */}
            {timePickerState.visible && (
                <DateTimePicker
                    value={timePickerState.value}
                    mode={timePickerState.mode}
                    is24Hour={false}
                    display="default"
                    onChange={handlePickerChange}
                />
            )}
        </ScrollView>
    );
};

export default WorkingHoursTab;
