import React, { useState, useEffect } from "react";
import { View, FlatList, Pressable } from "react-native";
import {
    Text,
    Card,
    Button,
    TextInput,
    Avatar,
    Divider,
    SegmentedButtons,
    Portal,
    Modal,
} from "react-native-paper";
import Chip from "../components/Chip";
import { useSelector, useDispatch } from "react-redux";
import {
    checkInBooking,
    checkOutBooking,
    addBooking,
    setBookings,
    setAgencies,
} from "../store/slices/parkingSlice";
import useToast from "../hooks/useToast";
import apiService from "../utils/apiService";

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

const mapAgencyFromApi = (a) => {
    if (!a) return null;
    return {
        ...a,
        id: a.org_id || a.id,
        name: a.org_name || a.name,
        address: a.org_address || a.address,
        twoWheeler_capacity:
            a.two_wheeler_capacity !== undefined
                ? a.two_wheeler_capacity
                : a.twoWheeler_capacity,
        threeWheeler_capacity:
            a.three_wheeler_capacity !== undefined
                ? a.three_wheeler_capacity
                : a.threeWheeler_capacity,
        twoWheeler_rate:
            a.two_wheeler_rate !== undefined
                ? parseFloat(a.two_wheeler_rate)
                : a.twoWheeler_rate,
        threeWheeler_rate:
            a.three_wheeler_rate !== undefined
                ? parseFloat(a.three_wheeler_rate)
                : a.threeWheeler_rate,
        car_rate:
            a.car_rate !== undefined ? parseFloat(a.car_rate) : a.car_rate,
        suv_rate:
            a.suv_rate !== undefined ? parseFloat(a.suv_rate) : a.suv_rate,
        van_rate:
            a.van_rate !== undefined ? parseFloat(a.van_rate) : a.van_rate,
        pickup_rate:
            a.pickup_rate !== undefined
                ? parseFloat(a.pickup_rate)
                : a.pickup_rate,
        ev_rate:
            a.ev_rate !== undefined ? parseFloat(a.ev_rate) : a.ev_rate,
    };
};

export default function CheckInOut() {
    const dispatch = useDispatch();
    const toast = useToast();
    const currentUser = useSelector((state) => state.user.user);
    const bookings = useSelector((state) => state.parking.bookings);
    const agencies = useSelector((state) => state.parking.agencies);
    const [loading, setLoading] = useState(false);

    // Get staff's agency
    const myAgency =
        agencies.find(
            (a) =>
                a.id === currentUser?.agencyId || a.owner === currentUser?.name
        ) || agencies[0]; // fallback to first agency for super admin testing

    // Filter bookings belonging to this agency
    const myAgencyBookings = bookings.filter(
        (b) => b.agencyId === myAgency?.id
    );

    // Search and tab states
    const [searchQuery, setSearchQuery] = useState("");
    const [tab, setTab] = useState("checked_in"); // checked_in (Parked), booked (Reserved), completed

    // Checkout state (selectedBooking serves as the open/close state for checkout modal)
    const [selectedBooking, setSelectedBooking] = useState(null);

    // Walk-in form state (null means modal is closed, object means modal is open)
    const [walkinForm, setWalkinForm] = useState(null);

    // OTP verification state
    const [otpState, setOtpState] = useState({
        targetBooking: null,
        input: "",
    });

    const fetchAgenciesAndBookings = async () => {
        setLoading(true);
        try {
            let resolvedAgencyId = currentUser?.agencyId;
            let loadedAgencies = [];

            if (currentUser?.role === "super_admin") {
                const agenciesRes = await apiService.get("agencies");
                if (agenciesRes && agenciesRes.success) {
                    loadedAgencies = agenciesRes.data.map(mapAgencyFromApi);
                    dispatch(setAgencies(loadedAgencies));
                    resolvedAgencyId = resolvedAgencyId || loadedAgencies[0]?.id;
                }
            } else if (currentUser?.agencyId) {
                const agencyRes = await apiService.get(`agencies/${currentUser.agencyId}`);
                if (agencyRes && agencyRes.success) {
                    loadedAgencies = [mapAgencyFromApi(agencyRes.data)];
                    dispatch(setAgencies(loadedAgencies));
                }
            }

            if (resolvedAgencyId) {
                const bookingsRes = await apiService.get(`bookings/agency/${resolvedAgencyId}`);
                if (bookingsRes && bookingsRes.success) {
                    dispatch(setBookings(bookingsRes.data));
                }
            }
        } catch (error) {
            console.error("Error fetching checkin/checkout data:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAgenciesAndBookings();
    }, [currentUser?.agencyId, currentUser?.role]);

    // Checkout calculated variables (derived dynamically)
    let actualDuration = 0;
    let calculatedBill = 0;
    if (selectedBooking) {
        const start = new Date(selectedBooking.startTime);
        const end = new Date();
        const diffMs = end - start;
        // Minimum 1 hour, rounded up to nearest half hour
        actualDuration = Math.max(
            1,
            Math.ceil((diffMs / (1000 * 60 * 60)) * 2) / 2
        );
        calculatedBill = actualDuration * selectedBooking.hourlyRate;
    }

    const updateWalkinForm = (key, value) => {
        setWalkinForm((prev) => (prev ? { ...prev, [key]: value } : null));
    };

    // Income calculations
    const completedBookings = myAgencyBookings.filter(
        (b) => b.status === "completed"
    );
    const activeBookings = myAgencyBookings.filter(
        (b) => b.status === "checked_in"
    );
    const totalIncome = completedBookings.reduce(
        (sum, b) => sum + (b.totalBill || 0),
        0
    );

    const handleSearch = (booking) => {
        const query = searchQuery.toLowerCase().trim();
        if (!query) return true;
        return (
            booking.bookingCode.toLowerCase().includes(query) ||
            booking.vehicleNumber.toLowerCase().includes(query) ||
            booking.userName.toLowerCase().includes(query)
        );
    };

    const filteredBookings = myAgencyBookings
        .filter((b) => b.status === tab)
        .filter(handleSearch);

    const handleCheckIn = async (code, otp = null) => {
        try {
            const res = await apiService.post("bookings/checkin", {
                bookingCode: code,
                otp: otp ? otp.trim() : undefined,
            });
            if (res && res.success) {
                dispatch(checkInBooking(code));
                toast.success(res.message || `Check-in successful for ${code}!`, "Checked In", true);
                return true;
            } else {
                toast.error(res?.message || "Check-in failed.", "Error", true);
                return false;
            }
        } catch (error) {
            console.error("Check-in Error:", error);
            const errMsg = error.response?.data?.message || error.message || "Failed to check in. Network error.";
            toast.error(errMsg, "Error", true);
            return false;
        }
    };

    const triggerCheckIn = (booking) => {
        if (booking.otp) {
            setOtpState({
                targetBooking: booking,
                input: "",
            });
        } else {
            handleCheckIn(booking.bookingCode);
        }
    };

    const handleVerifyOtpAndCheckIn = async () => {
        if (!otpState.targetBooking) return;
        if (!otpState.input.trim()) {
            toast.error("Please enter the 6-digit OTP.", "Error", true);
            return;
        }

        const success = await handleCheckIn(otpState.targetBooking.bookingCode, otpState.input);
        if (success) {
            setOtpState({
                targetBooking: null,
                input: "",
            });
        }
    };

    const openCheckoutModal = (booking) => {
        setSelectedBooking(booking);
    };

    const handleConfirmCheckout = async () => {
        if (!selectedBooking) return;
        try {
            const res = await apiService.post("bookings/checkout", {
                bookingCode: selectedBooking.bookingCode,
            });

            if (res && res.success) {
                const finalBill = res.data?.totalBill ?? calculatedBill;
                const endTimeStr =
                    res.data?.endTime ||
                    res.data?.checkoutTime ||
                    new Date().toISOString();

                dispatch(
                    checkOutBooking({
                        bookingCode: selectedBooking.bookingCode,
                        totalBill: finalBill,
                        actualEndTime: endTimeStr,
                    })
                );
                toast.success(
                    res.message ||
                        `Checked out successfully! Bill: ₹${finalBill.toFixed(2)}`,
                    "Checkout Complete",
                    true
                );
                setSelectedBooking(null);
                fetchAgenciesAndBookings();
            } else {
                toast.error(res?.message || "Checkout failed.", "Error", true);
            }
        } catch (error) {
            console.error("Checkout Error:", error);
            const errMsg =
                error.response?.data?.message ||
                error.message ||
                "Failed to check out vehicle. Network error.";
            toast.error(errMsg, "Error", true);
        }
    };

    const handleRegisterWalkin = () => {
        if (!walkinForm?.vehicleNum) {
            toast.error("Please enter the vehicle number.", "Error", true);
            return;
        }

        const vehicleType = walkinForm.vehicleType || "car";
        const bookingCode = `WK-${Math.floor(1000 + Math.random() * 9000)}`;
        const hourlyRate =
            myAgency?.[`${vehicleType}_rate`] ||
            VEHICLE_TYPE_RATES[vehicleType] ||
            40;

        const newBooking = {
            id: `book_${Date.now()}`,
            bookingCode,
            userId: null,
            userName: walkinForm.name || "Walk-In Customer",
            userPhone: walkinForm.phone || "N/A",
            agencyId: myAgency?.id,
            agencyName: myAgency?.name,
            vehicleType: vehicleType,
            vehicleNumber: walkinForm.vehicleNum.toUpperCase(),
            status: "checked_in", // Checked in immediately
            startTime: new Date().toISOString(),
            endTime: null,
            bookedDuration: 0,
            hourlyRate,
            totalBill: 0,
            paymentStatus: "pending",
        };

        dispatch(addBooking(newBooking));
        toast.success(
            `Registered Walk-in check-in: ${bookingCode}`,
            "Success",
            true
        );

        // Reset fields and close modal
        setWalkinForm(null);
        setTab("checked_in");
    };

    const formatDateTime = (isoString) => {
        if (!isoString) return "-";
        const date = new Date(isoString);
        return date.toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const formatTime = (isoString) => {
        if (!isoString) return "-";
        const date = new Date(isoString);
        return date.toLocaleTimeString("en-IN", {
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    return (
        <View className="flex-1 bg-slate-50">
            {/* Dashboard Headers */}
            <View className="flex-row px-4 pt-4 gap-3">
                <Card className="flex-1 bg-indigo-600 rounded-xl" elevation={2}>
                    <Card.Content className="items-center py-3">
                        <Text className="text-white text-xs font-semibold opacity-80 uppercase">
                            Total Income
                        </Text>
                        <Text className="text-white text-2xl font-bold mt-1">
                            ₹{totalIncome}
                        </Text>
                    </Card.Content>
                </Card>
                <Card
                    className="flex-1 bg-emerald-600 rounded-xl"
                    elevation={2}
                >
                    <Card.Content className="items-center py-3">
                        <Text className="text-white text-xs font-semibold opacity-80 uppercase">
                            Parked
                        </Text>
                        <Text className="text-white text-2xl font-bold mt-1">
                            {activeBookings.length} Cars
                        </Text>
                    </Card.Content>
                </Card>
                <Card className="flex-1 bg-amber-600 rounded-xl" elevation={2}>
                    <Card.Content className="items-center py-3">
                        <Text className="text-white text-xs font-semibold opacity-80 uppercase">
                            Reservations
                        </Text>
                        <Text className="text-white text-2xl font-bold mt-1">
                            {
                                myAgencyBookings.filter(
                                    (b) => b.status === "booked"
                                ).length
                            }
                        </Text>
                    </Card.Content>
                </Card>
            </View>

            {/* Search and Walk-in Register row */}
            <View className="flex-row items-center px-4 pt-4 gap-2">
                <TextInput
                    placeholder="Code, Vehicle, Name..."
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    mode="outlined"
                    dense
                    outlineColor="#e2e8f0"
                    activeOutlineColor="#4338ca"
                    left={<TextInput.Icon icon="magnify" />}
                    style={{ flex: 1, backgroundColor: "white", height: 42 }}
                />
                <Button
                    mode="contained"
                    onPress={() => setWalkinForm({
                        name: "",
                        phone: "",
                        vehicleNum: "",
                        vehicleType: "car",
                    })}
                    buttonColor="#4338ca"
                    className="h-10 justify-center rounded-lg"
                    icon="plus"
                    labelStyle={{ color: "white", fontWeight: "700" }}
                >
                    Walk-In
                </Button>
            </View>

            {/* Tab Selector */}
            <View className="px-4 py-3">
                <SegmentedButtons
                    value={tab}
                    onValueChange={setTab}
                    buttons={[
                        {
                            value: "checked_in",
                            label: `Parked (${activeBookings.length})`,
                        },
                        {
                            value: "booked",
                            label: `Reserved (${
                                myAgencyBookings.filter(
                                    (b) => b.status === "booked"
                                ).length
                            })`,
                        },
                        {
                            value: "completed",
                            label: `Completed (${completedBookings.length})`,
                        },
                    ]}
                    theme={{ colors: { primary: "#4338ca" } }}
                />
            </View>

            {/* Bookings List */}
            <FlatList
                data={filteredBookings}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{
                    paddingHorizontal: 16,
                    paddingBottom: 40,
                }}
                refreshing={loading}
                onRefresh={fetchAgenciesAndBookings}
                renderItem={({ item }) => (
                    <Card className="mb-4 bg-white border border-slate-100 rounded-xl elevation-1">
                        <Card.Content className="pb-3">
                            <View className="flex-row items-center justify-between">
                                <View className="flex-row items-center flex-1 pr-2">
                                    <Avatar.Icon
                                        size={40}
                                        icon={
                                            VEHICLE_TYPE_ICONS[
                                                item.vehicleType
                                            ] || "car"
                                        }
                                        style={{ backgroundColor: "#f1f5f9" }}
                                        color="#4338ca"
                                    />
                                    <View className="ml-3 flex-1">
                                        <Text
                                            className="text-base font-bold text-slate-800"
                                            numberOfLines={1}
                                        >
                                            {item.vehicleNumber}
                                        </Text>
                                        <Text className="text-xs text-slate-400">
                                            Code:{" "}
                                            <Text className="font-mono font-bold text-slate-600">
                                                {item.bookingCode}
                                            </Text>
                                        </Text>
                                    </View>
                                </View>
                                <Chip
                                    compact
                                    textStyle={{
                                        fontSize: 10,
                                        fontWeight: "bold",
                                    }}
                                >
                                    {VEHICLE_TYPE_LABELS[item.vehicleType]}
                                </Chip>
                            </View>

                            <Divider className="my-3 bg-slate-100" />

                            <View className="gap-1.5">
                                <Text className="text-sm text-slate-600">
                                    <Text className="font-semibold">
                                        Customer:
                                    </Text>{" "}
                                    {item.userName}
                                </Text>
                                <Text className="text-sm text-slate-600">
                                    <Text className="font-semibold">
                                        Phone:
                                    </Text>{" "}
                                    {item.userPhone}
                                </Text>
                                <Text className="text-sm text-slate-600">
                                    <Text className="font-semibold">Rate:</Text>{" "}
                                    ₹{item.hourlyRate}/hr
                                </Text>
                                {item.status === "booked" ? (
                                    <>
                                        <Text className="text-sm text-slate-600">
                                            <Text className="font-semibold">
                                                Reserved For:
                                            </Text>{" "}
                                            {formatDateTime(item.bookingStartTime)}
                                        </Text>
                                        <Text className="text-sm text-slate-600">
                                            <Text className="font-semibold">
                                                Booking Time:
                                            </Text>{" "}
                                            {formatTime(item.bookingStartTime)} - {formatTime(item.bookingEndTime)} ({item.bookedDuration} Hrs)
                                        </Text>
                                    </>
                                ) : (
                                    <Text className="text-sm text-slate-600">
                                        <Text className="font-semibold">
                                            Checked In At:
                                        </Text>{" "}
                                        {formatDateTime(item.startTime)}
                                    </Text>
                                )}

                                {item.status === "completed" && (
                                    <>
                                        <Text className="text-sm text-slate-600">
                                            <Text className="font-semibold">
                                                Checked Out At:
                                            </Text>{" "}
                                            {formatDateTime(item.endTime)}
                                        </Text>
                                        <View className="flex-row justify-between mt-1 p-2 bg-emerald-50 rounded-lg border border-emerald-100">
                                            <Text className="text-sm font-bold text-emerald-800">
                                                Income Collected:
                                            </Text>
                                            <Text className="text-sm font-bold text-emerald-800">
                                                ₹{item.totalBill}
                                            </Text>
                                        </View>
                                    </>
                                )}
                            </View>
                        </Card.Content>

                        {item.status !== "completed" && (
                            <Card.Actions className="border-t border-slate-50 px-4 py-2 bg-slate-50/50 rounded-b-xl flex-row gap-2">
                                {item.status === "booked" && (
                                    <Button
                                        mode="contained"
                                        onPress={() =>
                                            triggerCheckIn(item)
                                        }
                                        buttonColor="#16a34a"
                                        className="flex-1 rounded-lg"
                                        labelStyle={{
                                            color: "white",
                                            fontWeight: "700",
                                        }}
                                    >
                                        Check In
                                    </Button>
                                )}
                                {item.status === "checked_in" && (
                                    <Button
                                        mode="contained"
                                        onPress={() => openCheckoutModal(item)}
                                        buttonColor="#dc2626"
                                        className="flex-1 rounded-lg"
                                        labelStyle={{
                                            color: "white",
                                            fontWeight: "700",
                                        }}
                                    >
                                        Checkout & Collect Bill
                                    </Button>
                                )}
                            </Card.Actions>
                        )}
                    </Card>
                )}
                ListEmptyComponent={
                    <View className="items-center justify-center pt-20">
                        <Avatar.Icon
                            size={64}
                            icon="format-list-bulleted"
                            style={{ backgroundColor: "#f1f5f9" }}
                            color="#64748b"
                        />
                        <Text className="text-lg font-bold text-slate-700 mt-4">
                            No Vehicles Listed
                        </Text>
                        <Text className="text-sm text-slate-400 text-center mt-1 px-8">
                            {tab === "checked_in"
                                ? "There are currently no parked vehicles. Click walk-in or search a booking to check-in."
                                : tab === "booked"
                                ? "No upcoming reservations scheduled for today."
                                : "No completed transactions recorded today."}
                        </Text>
                    </View>
                }
            />

            {/* Portal Modals */}
            <Portal>
                {/* 1. Walk-In Registration Modal */}
                <Modal
                    visible={!!walkinForm}
                    onDismiss={() => setWalkinForm(null)}
                    className="bg-white p-6 m-5 rounded-2xl max-w-[500px] self-center w-[90%]"
                >
                    <Text className="text-lg font-bold text-slate-800 mb-4">
                        Register Walk-In Customer
                    </Text>

                    <TextInput
                        label="Vehicle Registration Number *"
                        value={walkinForm?.vehicleNum || ""}
                        onChangeText={(val) => updateWalkinForm("vehicleNum", val)}
                        mode="outlined"
                        dense
                        autoCapitalize="characters"
                        className="bg-white mb-3"
                        outlineColor="#e2e8f0"
                        activeOutlineColor="#4338ca"
                    />

                    <TextInput
                        label="Customer Name (Optional)"
                        value={walkinForm?.name || ""}
                        onChangeText={(val) => updateWalkinForm("name", val)}
                        mode="outlined"
                        dense
                        className="bg-white mb-3"
                        outlineColor="#e2e8f0"
                        activeOutlineColor="#4338ca"
                    />

                    <TextInput
                        label="Phone Number (Optional)"
                        value={walkinForm?.phone || ""}
                        onChangeText={(val) => updateWalkinForm("phone", val)}
                        mode="outlined"
                        dense
                        keyboardType="phone-pad"
                        className="bg-white mb-4"
                        outlineColor="#e2e8f0"
                        activeOutlineColor="#4338ca"
                    />

                    <Text className="text-sm font-semibold text-slate-700 mb-2">
                        Select Vehicle Type
                    </Text>
                    <View className="flex-row flex-wrap gap-2 mb-4">
                        {Object.keys(VEHICLE_TYPE_LABELS).map((key) => (
                            <Pressable
                                key={key}
                                onPress={() => updateWalkinForm("vehicleType", key)}
                                className={`flex-row items-center px-3 py-1.5 rounded-full border ${
                                    walkinForm?.vehicleType === key
                                        ? "bg-indigo-50 border-indigo-600"
                                        : "bg-white border-slate-200"
                                }`}
                            >
                                <Avatar.Icon
                                    size={18}
                                    icon={VEHICLE_TYPE_ICONS[key]}
                                    style={{ backgroundColor: "transparent" }}
                                    color={
                                        walkinForm?.vehicleType === key
                                            ? "#4338ca"
                                            : "#64748b"
                                    }
                                />
                                <Text
                                    className={`text-xs ml-1.5 font-bold ${
                                        walkinForm?.vehicleType === key
                                            ? "text-indigo-800"
                                            : "text-slate-600"
                                    }`}
                                >
                                    {VEHICLE_TYPE_LABELS[key]}
                                </Text>
                            </Pressable>
                        ))}
                    </View>

                    <Divider className="my-2 bg-slate-100" />

                    <View className="flex-row justify-end gap-2 mt-2">
                        <Button
                            mode="outlined"
                            onPress={() => setWalkinForm(null)}
                            textColor="#64748b"
                        >
                            Cancel
                        </Button>
                        <Button
                            mode="contained"
                            onPress={handleRegisterWalkin}
                            buttonColor="#4338ca"
                            labelStyle={{ color: "white" }}
                        >
                            Register & Check In
                        </Button>
                    </View>
                </Modal>

                {/* 2. Checkout Billing Modal */}
                <Modal
                    visible={!!selectedBooking}
                    onDismiss={() => setSelectedBooking(null)}
                    className="bg-white p-6 m-5 rounded-2xl max-w-[450px] self-center w-[90%]"
                >
                    <Text className="text-lg font-bold text-slate-800 mb-2">
                        Calculate Invoice Bill
                    </Text>
                    <Text className="text-xs text-slate-400 mb-4">
                        Booking code: {selectedBooking?.bookingCode}
                    </Text>

                    <Card
                        className="bg-slate-50 border border-slate-100 rounded-xl mb-4"
                        elevation={0}
                    >
                        <Card.Content className="py-3 gap-2">
                            <View className="flex-row justify-between">
                                <Text className="text-slate-500 text-sm">
                                    Vehicle Number:
                                </Text>
                                <Text className="font-bold text-slate-800 text-sm">
                                    {selectedBooking?.vehicleNumber}
                                </Text>
                            </View>
                            <View className="flex-row justify-between">
                                <Text className="text-slate-500 text-sm">
                                    Hourly Rate:
                                </Text>
                                <Text className="font-semibold text-slate-800 text-sm">
                                    ₹{selectedBooking?.hourlyRate}/hr
                                </Text>
                            </View>
                            <View className="flex-row justify-between">
                                <Text className="text-slate-500 text-sm">
                                    Time Checked-In:
                                </Text>
                                <Text className="font-medium text-slate-800 text-sm">
                                    {formatDateTime(selectedBooking?.startTime)}
                                </Text>
                            </View>
                            <View className="flex-row justify-between">
                                <Text className="text-slate-500 text-sm">
                                    Time Checked-Out:
                                </Text>
                                <Text className="font-medium text-slate-800 text-sm">
                                    {formatDateTime(new Date().toISOString())}
                                </Text>
                            </View>
                        </Card.Content>
                    </Card>

                    <View className="flex-row justify-between items-center py-2 px-1">
                        <Text className="font-semibold text-slate-600">
                            Actual Duration Paid:
                        </Text>
                        <Text className="font-bold text-slate-800 text-base">
                            {actualDuration} Hrs
                        </Text>
                    </View>

                    <Divider className="my-2 bg-slate-100" />

                    <View className="flex-row justify-between items-center py-2 px-1 mb-4">
                        <Text className="font-bold text-slate-800 text-lg">
                            Total Bill Amount:
                        </Text>
                        <Text className="font-bold text-indigo-700 text-2xl">
                            ₹{calculatedBill}
                        </Text>
                    </View>

                    <Button
                        mode="contained"
                        onPress={handleConfirmCheckout}
                        buttonColor="#16a34a"
                        contentStyle={{ height: 48 }}
                        className="rounded-xl justify-center"
                        labelStyle={{
                            color: "white",
                            fontSize: 16,
                            fontWeight: "bold",
                        }}
                    >
                        Collect Payment & Print Invoice
                    </Button>

                    <Button
                        mode="text"
                        onPress={() => setSelectedBooking(null)}
                        textColor="#ef4444"
                        className="mt-2"
                    >
                        Cancel Checkout
                    </Button>
                </Modal>

                {/* 3. OTP Verification Modal */}
                <Modal
                    visible={!!otpState.targetBooking}
                    onDismiss={() => {
                        setOtpState({
                            targetBooking: null,
                            input: "",
                        });
                    }}
                    className="bg-white p-6 m-5 rounded-2xl max-w-[400px] self-center w-[85%]"
                >
                    <Text className="text-lg font-bold text-slate-800 mb-2">
                        Verify Entry OTP
                    </Text>
                    <Text className="text-sm text-slate-500 mb-4">
                        Please ask the customer for the 6-digit verification OTP visible on their booking details.
                    </Text>

                    <TextInput
                        label="Enter 6-Digit OTP *"
                        value={otpState.input}
                        onChangeText={(val) => setOtpState(prev => ({ ...prev, input: val }))}
                        mode="outlined"
                        dense
                        keyboardType="numeric"
                        maxLength={6}
                        className="bg-white mb-4 text-center text-lg tracking-widest font-mono"
                        outlineColor="#e2e8f0"
                        activeOutlineColor="#4338ca"
                    />

                    <View className="flex-row gap-2 mt-2">
                        <Button
                            mode="outlined"
                            onPress={() => {
                                setOtpState({
                                    targetBooking: null,
                                    input: "",
                                });
                            }}
                            className="flex-1 rounded-lg"
                            textColor="#64748b"
                            style={{ borderColor: "#cbd5e1" }}
                        >
                            Cancel
                        </Button>
                        <Button
                            mode="contained"
                            onPress={handleVerifyOtpAndCheckIn}
                            className="flex-1 rounded-lg"
                            buttonColor="#4338ca"
                            textColor="white"
                        >
                            Verify & Check-In
                        </Button>
                    </View>
                </Modal>
            </Portal>
        </View>
    );
}


