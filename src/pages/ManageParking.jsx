import React, { useState, useEffect } from "react";
import {
    View,
    ScrollView,
    FlatList,
    Pressable,
    ActivityIndicator,
} from "react-native";
import {
    Text,
    Card,
    Button,
    TextInput,
    Avatar,
    Chip,
    Portal,
    Modal,
    IconButton,
    Divider,
    Surface,
    ProgressBar,
    Badge,
} from "react-native-paper";
import { useSelector, useDispatch } from "react-redux";
import useToast from "../hooks/useToast";
import useRolePermissions from "../hooks/useRolePermissions";
import { ROLES } from "../utils/rbacConfig";
import { updateAgencyCapacities } from "../store/slices/parkingSlice";
import apiService from "../utils/apiService";

const STANDARD_VEHICLES = {
    twoWheeler: { label: "Two-Wheeler", icon: "motorbike" },
    threeWheeler: { label: "Three-Wheeler", icon: "rickshaw" },
    car: { label: "Car", icon: "car" },
    suv: { label: "SUV / MUV", icon: "car-estate" },
    van: { label: "Van", icon: "van-passenger" },
    pickup: { label: "Pickup Truck", icon: "car-pickup" },
    ev: { label: "EV", icon: "ev-station" },
};

export default function ManageParking({ navigation }) {
    const dispatch = useDispatch();
    const toast = useToast();
    const { role, user } = useRolePermissions();

    const reduxAgencies = useSelector((state) => state.parking.agencies);
    const reduxBookings = useSelector((state) => state.parking.bookings);

    // If super admin, they can choose which agency's parking to manage.
    const [selectedAgencyId, setSelectedAgencyId] = useState(null);

    // API state variables
    const [apiAgencies, setApiAgencies] = useState([]);
    const [apiBookings, setApiBookings] = useState([]);
    const [apiLoading, setApiLoading] = useState(false);

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

    const fetchAgenciesAndBookings = async () => {
        setApiLoading(true);
        try {
            let loadedAgencies = [];
            if (role === ROLES.SUPER_ADMIN) {
                const agenciesRes = await apiService.get("agencies");
                if (agenciesRes && agenciesRes.success) {
                    loadedAgencies = agenciesRes.data.map(mapAgencyFromApi);
                    setApiAgencies(loadedAgencies);
                }
            } else if (role === ROLES.AGENCY_ADMIN) {
                if (user?.agencyId) {
                    const agencyRes = await apiService.get(
                        `agencies/${user.agencyId}`
                    );
                    if (agencyRes && agencyRes.success) {
                        const mapped = mapAgencyFromApi(agencyRes.data);
                        loadedAgencies = [mapped];
                        setApiAgencies(loadedAgencies);
                    }
                }
            }

            // Resolve the current agency ID to load bookings
            const resolvedAgencyId =
                role === ROLES.AGENCY_ADMIN
                    ? user?.agencyId
                    : selectedAgencyId || loadedAgencies[0]?.id;

            if (resolvedAgencyId && !isNaN(Number(resolvedAgencyId))) {
                const bookingsRes = await apiService.get(
                    `bookings/agency/${resolvedAgencyId}`
                );
                if (bookingsRes && bookingsRes.success) {
                    setApiBookings(bookingsRes.data);
                }
            }
        } catch (error) {
            console.error("Error fetching parking data from API:", error);
        } finally {
            setApiLoading(false);
        }
    };

    useEffect(() => {
        fetchAgenciesAndBookings();
    }, [role, user?.agencyId, selectedAgencyId]);

    const activeAgencies = apiAgencies.length > 0 ? apiAgencies : reduxAgencies;
    const activeBookings = apiAgencies.length > 0 ? apiBookings : reduxBookings;

    // Resolve which agency we are managing
    const currentAgency =
        role === ROLES.AGENCY_ADMIN
            ? activeAgencies.find(
                  (a) =>
                      String(a.id) === String(user?.agencyId) ||
                      a.owner === user?.name ||
                      a.email === user?.email ||
                      a.users?.some((u) => String(u.id) === String(user?.id))
              ) || activeAgencies[0]
            : activeAgencies.find(
                  (a) => String(a.id) === String(selectedAgencyId)
              ) || activeAgencies[0];

    useEffect(() => {
        if (role === ROLES.AGENCY_ADMIN && currentAgency) {
            setSelectedAgencyId(currentAgency.id);
        } else if (role === ROLES.SUPER_ADMIN && activeAgencies.length > 0) {
            const exists = activeAgencies.some(
                (a) => String(a.id) === String(selectedAgencyId)
            );
            if (!selectedAgencyId || !exists) {
                setSelectedAgencyId(activeAgencies[0].id);
            }
        }
    }, [role, currentAgency, activeAgencies, selectedAgencyId]);

    // Tab control: "capacities" or "parked"
    const [activeTab, setActiveTab] = useState("capacities");

    // Search query for parked vehicles
    const [searchQuery, setSearchQuery] = useState("");

    // Modal state for editing/adding capacities
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [isAddingNew, setIsAddingNew] = useState(false);
    const [selectedVehicleType, setSelectedVehicleType] = useState("");
    const [customVehicleName, setCustomVehicleName] = useState("");
    const [capacityVal, setCapacityVal] = useState("");
    const [rateVal, setRateVal] = useState("");

    // Helper functions for labels and icons
    const getVehicleLabel = (type) => {
        if (STANDARD_VEHICLES[type]) {
            return STANDARD_VEHICLES[type].label;
        }
        return type
            .replace(/_/g, " ")
            .replace(/([A-Z])/g, " $1")
            .trim()
            .replace(/^\w/, (c) => c.toUpperCase());
    };

    const getVehicleIcon = (type) => {
        if (STANDARD_VEHICLES[type]) {
            return STANDARD_VEHICLES[type].icon;
        }
        return "car-side";
    };

    // Calculate capacities list dynamically based on the current agency's property keys ending with "_capacity"
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

    // Get currently parked vehicles
    const parkedVehicles = currentAgency
        ? activeBookings.filter(
              (b) =>
                  String(b.agencyId) === String(currentAgency.id) &&
                  b.status === "checked_in"
          )
        : [];

    const filteredParkedVehicles = parkedVehicles.filter((b) => {
        const q = searchQuery.toLowerCase().trim();
        if (!q) return true;
        return (
            b.vehicleNumber.toLowerCase().includes(q) ||
            b.userName.toLowerCase().includes(q) ||
            (b.userPhone && b.userPhone.includes(q)) ||
            getVehicleLabel(b.vehicleType).toLowerCase().includes(q)
        );
    });

    const openEditCapacity = (cap) => {
        setIsAddingNew(false);
        setSelectedVehicleType(cap.type);
        setCapacityVal(cap.total.toString());
        const rateKey = `${cap.type}_rate`;
        const currentRate =
            currentAgency[rateKey] || VEHICLE_TYPE_RATES[cap.type] || 0;
        setRateVal(currentRate.toString());
        setEditModalVisible(true);
    };

    const openAddCapacity = () => {
        setIsAddingNew(true);
        setSelectedVehicleType("");
        setCustomVehicleName("");
        setCapacityVal("");
        setRateVal("");
        setEditModalVisible(true);
    };

    const saveCapacity = async () => {
        let vehicleType = selectedVehicleType;
        if (isAddingNew) {
            if (selectedVehicleType === "custom") {
                const cleanedName = customVehicleName
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
            } else if (!selectedVehicleType) {
                toast.error("Please select a vehicle type.", "Error", true);
                return;
            }
        }

        const capNum = parseInt(capacityVal, 10);
        if (isNaN(capNum) || capNum < 0) {
            toast.error(
                "Capacity must be a non-negative number.",
                "Error",
                true
            );
            return;
        }

        const rateNum = parseFloat(rateVal);
        if (isNaN(rateNum) || rateNum < 0) {
            toast.error(
                "Hourly rate must be a non-negative number.",
                "Error",
                true
            );
            return;
        }

        if (apiAgencies.length > 0) {
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
                    setEditModalVisible(false);
                    // Refresh data
                    fetchAgenciesAndBookings();
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
            setEditModalVisible(false);
        }
    };

    const formatElapsed = (startTime) => {
        if (!startTime) return "-";
        const start = new Date(startTime);
        const now = new Date();
        const diffMs = now - start;
        if (diffMs < 0) return "Just checked in";
        const diffMins = Math.floor(diffMs / (1000 * 60));
        const hrs = Math.floor(diffMins / 60);
        const mins = diffMins % 60;
        if (hrs === 0) return `${mins}m`;
        return `${hrs}h ${mins}m`;
    };

    const formatDateTime = (isoString) => {
        if (!isoString) return "-";
        const date = new Date(isoString);
        return (
            date.toLocaleTimeString("en-IN", {
                hour: "2-digit",
                minute: "2-digit",
            }) +
            " (" +
            date.toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
            }) +
            ")"
        );
    };

    if (!currentAgency) {
        return (
            <View className="flex-1 justify-center items-center bg-slate-50">
                <Text className="text-slate-500">No agency found.</Text>
            </View>
        );
    }

    return (
        <View className="flex-1 bg-slate-50">
            {/* Header info */}
            <Surface
                elevation={2}
                className="bg-indigo-700 px-5 pt-4 pb-5 rounded-b-3xl"
            >
                <Text className="text-white text-2xl font-bold">
                    {currentAgency.name}
                </Text>
                <View className="flex-row items-center mt-1">
                    <Avatar.Icon
                        size={18}
                        icon="map-marker"
                        style={{ backgroundColor: "transparent" }}
                        color="#a5b4fc"
                    />
                    <Text
                        className="text-indigo-200 text-xs ml-1"
                        numberOfLines={1}
                    >
                        {currentAgency.address}
                    </Text>
                </View>
            </Surface>

            {apiLoading && (
                <ActivityIndicator
                    animating={true}
                    color="#4338ca"
                    style={{ marginVertical: 10 }}
                />
            )}

            {/* Super Admin selector */}
            {role === ROLES.SUPER_ADMIN && activeAgencies.length > 1 && (
                <View className="px-4 py-3 bg-white border-b border-slate-200">
                    <Text className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                        Simulating Agency (Super Admin View)
                    </Text>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        className="flex-row"
                    >
                        {activeAgencies.map((agency) => (
                            <Chip
                                key={agency.id}
                                selected={
                                    String(selectedAgencyId) ===
                                    String(agency.id)
                                }
                                onPress={() => setSelectedAgencyId(agency.id)}
                                className="mr-2"
                                selectedColor="#4338ca"
                                showSelectedOverlay
                            >
                                {agency.name}
                            </Chip>
                        ))}
                    </ScrollView>
                </View>
            )}

            {/* Tabs for Capacities and Parked Vehicles */}
            <View className="flex-row bg-white border-b border-slate-200">
                <Pressable
                    className={`flex-1 py-3.5 items-center justify-center border-b-2 ${
                        activeTab === "capacities"
                            ? "border-indigo-600"
                            : "border-transparent"
                    }`}
                    onPress={() => setActiveTab("capacities")}
                >
                    <Text
                        className={`text-sm font-bold ${
                            activeTab === "capacities"
                                ? "text-indigo-600"
                                : "text-slate-500"
                        }`}
                    >
                        Capacities (
                        {capacitiesList.filter((c) => c.total > 0).length})
                    </Text>
                </Pressable>
                <Pressable
                    className={`flex-1 py-3.5 items-center justify-center border-b-2 ${
                        activeTab === "parked"
                            ? "border-indigo-600"
                            : "border-transparent"
                    }`}
                    onPress={() => setActiveTab("parked")}
                >
                    <Text
                        className={`text-sm font-bold ${
                            activeTab === "parked"
                                ? "text-indigo-600"
                                : "text-slate-500"
                        }`}
                    >
                        Parked Vehicles ({parkedVehicles.length})
                    </Text>
                </Pressable>
            </View>

            {/* Tab contents */}
            {activeTab === "capacities" ? (
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
                                    textColor="#4338ca"
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
                                                    : "#4338ca"
                                            }
                                        />
                                        <View className="ml-4 flex-1">
                                            <View className="flex-row justify-between items-center mb-1">
                                                <Text className="text-base font-bold text-slate-800">
                                                    {getVehicleLabel(item.type)}
                                                </Text>
                                                <Badge
                                                    className={`${
                                                        item.total === 0
                                                            ? "bg-slate-100 text-slate-500"
                                                            : "bg-indigo-50 text-indigo-700"
                                                    } font-bold`}
                                                >
                                                    {item.total === 0
                                                        ? "Disabled"
                                                        : `${item.parked} / ${item.total}`}
                                                </Badge>
                                            </View>
                                            <Text className="text-xs text-slate-500 font-medium mb-1">
                                                Rate: ₹
                                                {currentAgency[
                                                    `${item.type}_rate`
                                                ] ||
                                                    VEHICLE_TYPE_RATES[
                                                        item.type
                                                    ] ||
                                                    0}
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
                                                        {item.total -
                                                            item.parked}{" "}
                                                        spots available
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
                                            onPress={() =>
                                                openEditCapacity(item)
                                            }
                                        />
                                    </Card.Content>
                                </Card>
                            );
                        }}
                    />
                </View>
            ) : (
                <View className="flex-1">
                    {/* Search and Filters */}
                    <View className="px-4 pt-3 pb-2 flex-row gap-2">
                        <TextInput
                            placeholder="Search by vehicle number, name..."
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            mode="outlined"
                            dense
                            outlineColor="#e2e8f0"
                            activeOutlineColor="#4338ca"
                            left={<TextInput.Icon icon="magnify" />}
                            style={{
                                flex: 1,
                                backgroundColor: "white",
                                height: 42,
                            }}
                        />
                    </View>

                    <FlatList
                        data={filteredParkedVehicles}
                        keyExtractor={(item) => item.id}
                        contentContainerStyle={{
                            padding: 16,
                            paddingBottom: 80,
                        }}
                        showsVerticalScrollIndicator={false}
                        ListEmptyComponent={
                            <View className="items-center justify-center py-10 px-4 bg-white rounded-xl border border-slate-100">
                                <Avatar.Icon
                                    size={64}
                                    icon="car-off"
                                    style={{ backgroundColor: "#f1f5f9" }}
                                    color="#94a3b8"
                                />
                                <Text className="text-base font-bold text-slate-700 mt-4">
                                    No vehicles parked
                                </Text>
                                <Text className="text-sm text-slate-400 text-center mt-1">
                                    {searchQuery
                                        ? "No matching checked-in bookings found."
                                        : "There are no currently checked-in vehicles."}
                                </Text>
                            </View>
                        }
                        renderItem={({ item }) => (
                            <Card
                                className="bg-white mb-3 border border-slate-100"
                                elevation={1}
                            >
                                <Card.Content className="p-4">
                                    {/* Top Row: Vehicle Plate and Type Chip */}
                                    <View className="flex-row justify-between items-center mb-3">
                                        <View className="border-2 border-slate-800 bg-slate-50 px-3 py-1 rounded">
                                            <Text className="text-slate-800 font-bold tracking-wider text-sm">
                                                {item.vehicleNumber}
                                            </Text>
                                        </View>
                                        <Chip
                                            icon={getVehicleIcon(
                                                item.vehicleType
                                            )}
                                            style={{
                                                backgroundColor: "#e0e7ff",
                                            }}
                                            textStyle={{
                                                fontSize: 11,
                                                color: "#4338ca",
                                                fontWeight: "bold",
                                            }}
                                        >
                                            {getVehicleLabel(item.vehicleType)}
                                        </Chip>
                                    </View>

                                    {/* Middle Section: Customer info & Booking code */}
                                    <View className="flex-row justify-between items-center mb-2">
                                        <View>
                                            <Text className="text-sm font-bold text-slate-700">
                                                {item.userName}
                                            </Text>
                                            <Text className="text-xs text-slate-400">
                                                {item.userPhone || "No Phone"}
                                            </Text>
                                        </View>
                                        <Badge
                                            style={{
                                                backgroundColor: "#cbd5e1",
                                                color: "#475569",
                                            }}
                                            className="font-semibold text-xs"
                                        >
                                            {item.bookingCode}
                                        </Badge>
                                    </View>

                                    <Divider className="my-2 bg-slate-100" />

                                    {/* Bottom Section: Timings */}
                                    <View className="flex-row justify-between items-center">
                                        <View className="flex-row items-center">
                                            <Avatar.Icon
                                                size={16}
                                                icon="clock-outline"
                                                style={{
                                                    backgroundColor:
                                                        "transparent",
                                                }}
                                                color="#64748b"
                                            />
                                            <Text className="text-xs text-slate-500 ml-1">
                                                In:{" "}
                                                {formatDateTime(item.startTime)}
                                            </Text>
                                        </View>
                                        <View className="flex-row items-center bg-emerald-50 px-2 py-0.5 rounded">
                                            <Text className="text-xs text-emerald-800 font-bold">
                                                Duration:{" "}
                                                {formatElapsed(item.startTime)}
                                            </Text>
                                        </View>
                                    </View>
                                </Card.Content>
                            </Card>
                        )}
                    />
                </View>
            )}

            {/* Modal for Edit / Add Capacity */}
            <Portal>
                <Modal
                    visible={editModalVisible}
                    onDismiss={() => setEditModalVisible(false)}
                    contentContainerStyle={{
                        backgroundColor: "white",
                        padding: 24,
                        margin: 20,
                        borderRadius: 16,
                    }}
                >
                    <Text className="text-lg font-bold text-slate-800 mb-4">
                        {isAddingNew
                            ? "Add Vehicle Capacity"
                            : "Modify Capacity"}
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
                                        capacitiesList.some(
                                            (c) =>
                                                c.type === type && c.total > 0
                                        );
                                    if (alreadyConfigured) return null;

                                    return (
                                        <Chip
                                            key={type}
                                            selected={
                                                selectedVehicleType === type
                                            }
                                            onPress={() => {
                                                setSelectedVehicleType(type);
                                                setCustomVehicleName("");
                                            }}
                                            className="mr-2"
                                            selectedColor="#4338ca"
                                        >
                                            {STANDARD_VEHICLES[type].label}
                                        </Chip>
                                    );
                                })}
                                <Chip
                                    key="custom"
                                    selected={selectedVehicleType === "custom"}
                                    onPress={() =>
                                        setSelectedVehicleType("custom")
                                    }
                                    className="mr-2"
                                    selectedColor="#4338ca"
                                >
                                    Custom...
                                </Chip>
                            </ScrollView>

                            {selectedVehicleType === "custom" && (
                                <TextInput
                                    label="Custom Vehicle Type (e.g. truck, bicycle)"
                                    value={customVehicleName}
                                    onChangeText={setCustomVehicleName}
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
                                icon={getVehicleIcon(selectedVehicleType)}
                                style={{ backgroundColor: "#e0e7ff" }}
                                color="#4338ca"
                            />
                            <Text className="text-base font-bold text-slate-700 ml-3">
                                {getVehicleLabel(selectedVehicleType)}
                            </Text>
                        </View>
                    )}

                    <TextInput
                        label="Total Parking Capacity"
                        value={capacityVal}
                        onChangeText={setCapacityVal}
                        keyboardType="numeric"
                        mode="outlined"
                        outlineColor="#e2e8f0"
                        activeOutlineColor="#4338ca"
                        className="bg-white mb-4"
                        left={<TextInput.Icon icon="counter" />}
                    />

                    <TextInput
                        label="Hourly Rate (₹/hr)"
                        value={rateVal}
                        onChangeText={setRateVal}
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
                            onPress={() => setEditModalVisible(false)}
                            textColor="#64748b"
                            style={{ borderColor: "#cbd5e1" }}
                        >
                            Cancel
                        </Button>
                        <Button
                            mode="contained"
                            onPress={saveCapacity}
                            buttonColor="#4338ca"
                            labelStyle={{ fontWeight: "700" }}
                        >
                            Save
                        </Button>
                    </View>
                </Modal>
            </Portal>
        </View>
    );
}
