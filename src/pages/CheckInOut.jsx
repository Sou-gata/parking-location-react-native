import React, { useState } from "react";
import { View, ScrollView, FlatList, StyleSheet, Pressable, Dimensions } from "react-native";
import {
    Text,
    Card,
    Button,
    TextInput,
    Avatar,
    Chip,
    Divider,
    SegmentedButtons,
    Portal,
    Modal,
    IconButton,
} from "react-native-paper";
import { useSelector, useDispatch } from "react-redux";
import { checkInBooking, checkOutBooking, addBooking } from "../store/parkingSlice";
import useToast from "../hooks/useToast";

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

export default function CheckInOut() {
    const dispatch = useDispatch();
    const toast = useToast();
    const currentUser = useSelector((state) => state.user.user);
    const bookings = useSelector((state) => state.parking.bookings);
    const agencies = useSelector((state) => state.parking.agencies);

    // Get staff's agency
    const myAgency = agencies.find(
        (a) => a.id === currentUser?.agencyId || a.owner === currentUser?.name
    ) || agencies[0]; // fallback to first agency for super admin testing

    // Filter bookings belonging to this agency
    const myAgencyBookings = bookings.filter((b) => b.agencyId === myAgency?.id);

    // Search and tab states
    const [searchQuery, setSearchQuery] = useState("");
    const [tab, setTab] = useState("checked_in"); // checked_in (Parked), booked (Reserved), completed

    // Modals
    const [checkoutModalVisible, setCheckoutModalVisible] = useState(false);
    const [walkinModalVisible, setWalkinModalVisible] = useState(false);
    const [selectedBooking, setSelectedBooking] = useState(null);

    // Walk-in form states
    const [walkinName, setWalkinName] = useState("");
    const [walkinPhone, setWalkinPhone] = useState("");
    const [walkinVehicleNum, setWalkinVehicleNum] = useState("");
    const [walkinVehicleType, setWalkinVehicleType] = useState("car");

    // Checkout calculated variables
    const [actualDuration, setActualDuration] = useState(0);
    const [calculatedBill, setCalculatedBill] = useState(0);

    // Income calculations
    const completedBookings = myAgencyBookings.filter((b) => b.status === "completed");
    const activeBookings = myAgencyBookings.filter((b) => b.status === "checked_in");
    const totalIncome = completedBookings.reduce((sum, b) => sum + (b.totalBill || 0), 0);

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

    const handleCheckIn = (code) => {
        dispatch(checkInBooking(code));
        toast.success(`Check-in successful for ${code}!`, "Checked In", true);
    };

    const openCheckoutModal = (booking) => {
        const start = new Date(booking.startTime);
        const end = new Date();
        const diffMs = end - start;
        // Minimum 1 hour, rounded up to nearest half hour
        const diffHrs = Math.max(1, Math.ceil((diffMs / (1000 * 60 * 60)) * 2) / 2);

        setActualDuration(diffHrs);
        setCalculatedBill(diffHrs * booking.hourlyRate);
        setSelectedBooking(booking);
        setCheckoutModalVisible(true);
    };

    const handleConfirmCheckout = () => {
        if (!selectedBooking) return;
        dispatch(
            checkOutBooking({
                bookingCode: selectedBooking.bookingCode,
                totalBill: calculatedBill,
                actualEndTime: new Date().toISOString(),
            })
        );
        toast.success(`Checked out successfully! Bill: ₹${calculatedBill}`, "Checkout Complete", true);
        setCheckoutModalVisible(false);
        setSelectedBooking(null);
    };

    const handleRegisterWalkin = () => {
        if (!walkinVehicleNum) {
            toast.error("Please enter the vehicle number.", "Error", true);
            return;
        }

        const bookingCode = `WK-${Math.floor(1000 + Math.random() * 9000)}`;
        const hourlyRate = VEHICLE_TYPE_RATES[walkinVehicleType] || 40;

        const newBooking = {
            id: `book_${Date.now()}`,
            bookingCode,
            userId: null,
            userName: walkinName || "Walk-In Customer",
            userPhone: walkinPhone || "N/A",
            agencyId: myAgency?.id,
            agencyName: myAgency?.name,
            vehicleType: walkinVehicleType,
            vehicleNumber: walkinVehicleNum.toUpperCase(),
            status: "checked_in", // Checked in immediately
            startTime: new Date().toISOString(),
            endTime: null,
            bookedDuration: 0,
            hourlyRate,
            totalBill: 0,
            paymentStatus: "pending",
        };

        dispatch(addBooking(newBooking));
        toast.success(`Registered Walk-in check-in: ${bookingCode}`, "Success", true);

        // Reset fields
        setWalkinName("");
        setWalkinPhone("");
        setWalkinVehicleNum("");
        setWalkinVehicleType("car");
        setWalkinModalVisible(false);
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

    return (
        <View className="flex-1 bg-slate-50">
            {/* Dashboard Headers */}
            <View className="flex-row px-4 pt-4 gap-3">
                <Card className="flex-1 bg-indigo-600 rounded-xl" elevation={2}>
                    <Card.Content className="items-center py-3">
                        <Text className="text-white text-xs font-semibold opacity-80 uppercase">Total Income</Text>
                        <Text className="text-white text-2xl font-bold mt-1">₹{totalIncome}</Text>
                    </Card.Content>
                </Card>
                <Card className="flex-1 bg-emerald-600 rounded-xl" elevation={2}>
                    <Card.Content className="items-center py-3">
                        <Text className="text-white text-xs font-semibold opacity-80 uppercase">Parked</Text>
                        <Text className="text-white text-2xl font-bold mt-1">{activeBookings.length} Cars</Text>
                    </Card.Content>
                </Card>
                <Card className="flex-1 bg-amber-600 rounded-xl" elevation={2}>
                    <Card.Content className="items-center py-3">
                        <Text className="text-white text-xs font-semibold opacity-80 uppercase">Reservations</Text>
                        <Text className="text-white text-2xl font-bold mt-1">
                            {myAgencyBookings.filter((b) => b.status === "booked").length}
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
                    onPress={() => setWalkinModalVisible(true)}
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
                        { value: "checked_in", label: `Parked (${activeBookings.length})` },
                        { value: "booked", label: `Reserved (${myAgencyBookings.filter(b => b.status === "booked").length})` },
                        { value: "completed", label: `Completed (${completedBookings.length})` },
                    ]}
                    theme={{ colors: { primary: "#4338ca" } }}
                />
            </View>

            {/* Bookings List */}
            <FlatList
                data={filteredBookings}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
                renderItem={({ item }) => (
                    <Card className="mb-4 bg-white border border-slate-100 rounded-xl elevation-1">
                        <Card.Content className="pb-3">
                            <View className="flex-row items-center justify-between">
                                <View className="flex-row items-center flex-1 pr-2">
                                    <Avatar.Icon
                                        size={40}
                                        icon={VEHICLE_TYPE_ICONS[item.vehicleType] || "car"}
                                        style={{ backgroundColor: "#f1f5f9" }}
                                        color="#4338ca"
                                    />
                                    <View className="ml-3 flex-1">
                                        <Text className="text-base font-bold text-slate-800" numberOfLines={1}>
                                            {item.vehicleNumber}
                                        </Text>
                                        <Text className="text-xs text-slate-400">
                                            Code: <Text className="font-mono font-bold text-slate-600">{item.bookingCode}</Text>
                                        </Text>
                                    </View>
                                </View>
                                <Chip compact textStyle={{ fontSize: 10, fontWeight: "bold" }}>
                                    {VEHICLE_TYPE_LABELS[item.vehicleType]}
                                </Chip>
                            </View>

                            <Divider className="my-3 bg-slate-100" />

                            <View className="gap-1.5">
                                <Text className="text-sm text-slate-600">
                                    <Text className="font-semibold">Customer:</Text> {item.userName}
                                </Text>
                                <Text className="text-sm text-slate-600">
                                    <Text className="font-semibold">Phone:</Text> {item.userPhone}
                                </Text>
                                <Text className="text-sm text-slate-600">
                                    <Text className="font-semibold">Rate:</Text> ₹{item.hourlyRate}/hr
                                </Text>
                                <Text className="text-sm text-slate-600">
                                    <Text className="font-semibold">
                                        {item.status === "booked" ? "Reserved For:" : "Checked In At:"}
                                    </Text>{" "}
                                    {formatDateTime(item.startTime)}
                                </Text>

                                {item.status === "completed" && (
                                    <>
                                        <Text className="text-sm text-slate-600">
                                            <Text className="font-semibold">Checked Out At:</Text> {formatDateTime(item.endTime)}
                                        </Text>
                                        <View className="flex-row justify-between mt-1 p-2 bg-emerald-50 rounded-lg border border-emerald-100">
                                            <Text className="text-sm font-bold text-emerald-800">Income Collected:</Text>
                                            <Text className="text-sm font-bold text-emerald-800">₹{item.totalBill}</Text>
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
                                        onPress={() => handleCheckIn(item.bookingCode)}
                                        buttonColor="#16a34a"
                                        className="flex-1 rounded-lg"
                                        labelStyle={{ color: "white", fontWeight: "700" }}
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
                                        labelStyle={{ color: "white", fontWeight: "700" }}
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
                    visible={walkinModalVisible}
                    onDismiss={() => setWalkinModalVisible(false)}
                    className="bg-white p-6 m-5 rounded-2xl max-w-[500px] self-center w-[90%]"
                >
                    <Text className="text-lg font-bold text-slate-800 mb-4">Register Walk-In Customer</Text>

                    <TextInput
                        label="Vehicle Registration Number *"
                        value={walkinVehicleNum}
                        onChangeText={setWalkinVehicleNum}
                        mode="outlined"
                        dense
                        autoCapitalize="characters"
                        className="bg-white mb-3"
                        outlineColor="#e2e8f0"
                        activeOutlineColor="#4338ca"
                    />

                    <TextInput
                        label="Customer Name (Optional)"
                        value={walkinName}
                        onChangeText={setWalkinName}
                        mode="outlined"
                        dense
                        className="bg-white mb-3"
                        outlineColor="#e2e8f0"
                        activeOutlineColor="#4338ca"
                    />

                    <TextInput
                        label="Phone Number (Optional)"
                        value={walkinPhone}
                        onChangeText={setWalkinPhone}
                        mode="outlined"
                        dense
                        keyboardType="phone-pad"
                        className="bg-white mb-4"
                        outlineColor="#e2e8f0"
                        activeOutlineColor="#4338ca"
                    />

                    <Text className="text-sm font-semibold text-slate-700 mb-2">Select Vehicle Type</Text>
                    <View className="flex-row flex-wrap gap-2 mb-4">
                        {Object.keys(VEHICLE_TYPE_LABELS).map((key) => (
                            <Pressable
                                key={key}
                                onPress={() => setWalkinVehicleType(key)}
                                className={`flex-row items-center px-3 py-1.5 rounded-full border ${
                                    walkinVehicleType === key
                                        ? "bg-indigo-50 border-indigo-600"
                                        : "bg-white border-slate-200"
                                }`}
                            >
                                <Avatar.Icon
                                    size={18}
                                    icon={VEHICLE_TYPE_ICONS[key]}
                                    style={{ backgroundColor: "transparent" }}
                                    color={walkinVehicleType === key ? "#4338ca" : "#64748b"}
                                />
                                <Text
                                    className={`text-xs ml-1.5 font-bold ${
                                        walkinVehicleType === key ? "text-indigo-800" : "text-slate-600"
                                    }`}
                                >
                                    {VEHICLE_TYPE_LABELS[key]}
                                </Text>
                            </Pressable>
                        ))}
                    </View>

                    <Divider className="my-2 bg-slate-100" />

                    <View className="flex-row justify-end gap-2 mt-2">
                        <Button mode="outlined" onPress={() => setWalkinModalVisible(false)} textColor="#64748b">
                            Cancel
                        </Button>
                        <Button mode="contained" onPress={handleRegisterWalkin} buttonColor="#4338ca" labelStyle={{ color: "white" }}>
                            Register & Check In
                        </Button>
                    </View>
                </Modal>

                {/* 2. Checkout Billing Modal */}
                <Modal
                    visible={checkoutModalVisible}
                    onDismiss={() => setCheckoutModalVisible(false)}
                    className="bg-white p-6 m-5 rounded-2xl max-w-[450px] self-center w-[90%]"
                >
                    <Text className="text-lg font-bold text-slate-800 mb-2">Calculate Invoice Bill</Text>
                    <Text className="text-xs text-slate-400 mb-4">Booking code: {selectedBooking?.bookingCode}</Text>

                    <Card className="bg-slate-50 border border-slate-100 rounded-xl mb-4" elevation={0}>
                        <Card.Content className="py-3 gap-2">
                            <View className="flex-row justify-between">
                                <Text className="text-slate-500 text-sm">Vehicle Number:</Text>
                                <Text className="font-bold text-slate-800 text-sm">{selectedBooking?.vehicleNumber}</Text>
                            </View>
                            <View className="flex-row justify-between">
                                <Text className="text-slate-500 text-sm">Hourly Rate:</Text>
                                <Text className="font-semibold text-slate-800 text-sm">₹{selectedBooking?.hourlyRate}/hr</Text>
                            </View>
                            <View className="flex-row justify-between">
                                <Text className="text-slate-500 text-sm">Time Checked-In:</Text>
                                <Text className="font-medium text-slate-800 text-sm">{formatDateTime(selectedBooking?.startTime)}</Text>
                            </View>
                            <View className="flex-row justify-between">
                                <Text className="text-slate-500 text-sm">Time Checked-Out:</Text>
                                <Text className="font-medium text-slate-800 text-sm">{formatDateTime(new Date().toISOString())}</Text>
                            </View>
                        </Card.Content>
                    </Card>

                    <View className="flex-row justify-between items-center py-2 px-1">
                        <Text className="font-semibold text-slate-600">Actual Duration Paid:</Text>
                        <Text className="font-bold text-slate-800 text-base">{actualDuration} Hrs</Text>
                    </View>

                    <Divider className="my-2 bg-slate-100" />

                    <View className="flex-row justify-between items-center py-2 px-1 mb-4">
                        <Text className="font-bold text-slate-800 text-lg">Total Bill Amount:</Text>
                        <Text className="font-bold text-indigo-700 text-2xl">₹{calculatedBill}</Text>
                    </View>

                    <Button
                        mode="contained"
                        onPress={handleConfirmCheckout}
                        buttonColor="#16a34a"
                        contentStyle={{ height: 48 }}
                        className="rounded-xl justify-center"
                        labelStyle={{ color: "white", fontSize: 16, fontWeight: "bold" }}
                    >
                        Collect Payment & Print Invoice
                    </Button>

                    <Button mode="text" onPress={() => setCheckoutModalVisible(false)} textColor="#ef4444" className="mt-2">
                        Cancel Checkout
                    </Button>
                </Modal>
            </Portal>
        </View>
    );
}

const styles = StyleSheet.create({});
