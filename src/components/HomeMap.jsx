import React, { useState } from "react";
import { View, FlatList, Keyboard, Image, TouchableOpacity } from "react-native";
import { Searchbar, List, Surface, Portal, Modal, Text, TextInput, Button, SegmentedButtons, Divider } from "react-native-paper";
import {
    MapView,
    Camera,
    MarkerView,
    ShapeSource,
    LineLayer,
} from "@maplibre/maplibre-react-native";
import { cssInterop } from "nativewind";
import axios from "axios";
import { useSelector, useDispatch } from "react-redux";
import ParkingDetailDrawer from "./ParkingDetailDrawer";
import { addBooking } from "../store/parkingSlice";
import useToast from "../hooks/useToast";

cssInterop(MapView, { className: "style" });
cssInterop(MarkerView, { className: "style" });

const STYLE_URL = "https://api.maptiler.com/maps/base-v4/style.json?key=SHvSqRiAB4DI5Xuokw5W";
const INITIAL_CENTER = [88.3639, 22.5726]; // Kolkata coordinates

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

const HomeMap = () => {
    const dispatch = useDispatch();
    const toast = useToast();
    const currentUser = useSelector((state) => state.user.user);
    const approvedAgencies = useSelector((state) => state.parking.agencies);

    // Consolidated States
    const [searchState, setSearchState] = useState({
        query: "",
        suggestions: [],
        isLoading: false,
    });

    const [mapState, setMapState] = useState({
        center: INITIAL_CENTER,
        zoom: 12,
    });

    const [routingState, setRoutingState] = useState({
        origin: null,
        destination: null,
        route: null,
    });

    const [parkingState, setParkingState] = useState({
        selectedLocation: null,
        isDrawerVisible: false,
    });

    // Booking Modal States
    const [bookingModalVisible, setBookingModalVisible] = useState(false);
    const [bookingVehicleNum, setBookingVehicleNum] = useState("");
    const [bookingVehicleType, setBookingVehicleType] = useState("car");
    const [bookingDuration, setBookingDuration] = useState("2");

    // Debounce timer
    const [debounceTimer, setDebounceTimer] = useState(null);

    const fetchSuggestions = async (query) => {
        if (!query || query.length < 3) {
            setSearchState((prev) => ({ ...prev, suggestions: [] }));
            return;
        }

        setSearchState((prev) => ({ ...prev, isLoading: true }));

        // Geoapify Search API
        const API_KEY = "4bf404b3ef3448c082d72492b6237b64";
        const url = `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(
            query
        )}&filter=rect:88.25,22.45,88.50,22.65&apiKey=${API_KEY}`;

        try {
            const response = await axios.get(url);
            setSearchState((prev) => ({ ...prev, suggestions: response.data.features || [] }));
        } catch (error) {
            console.error("Error fetching suggestions (Geoapify):", error);
        } finally {
            setSearchState((prev) => ({ ...prev, isLoading: false }));
        }
    };

    const handleSearchChange = (query) => {
        setSearchState((prev) => ({ ...prev, query }));
        if (debounceTimer) clearTimeout(debounceTimer);
        const timer = setTimeout(() => {
            fetchSuggestions(query);
        }, 500);
        setDebounceTimer(timer);
    };

    const handleSelectLocation = (feature) => {
        const coords = feature.geometry.coordinates; // [long, lat]
        setMapState({ center: coords, zoom: 15 });
        setSearchState((prev) => ({
            ...prev,
            suggestions: [],
            query: feature.properties.name || feature.properties.city || "",
        }));
        setRoutingState({ origin: coords, destination: null, route: null });
        setParkingState((prev) => ({
            ...prev,
            selectedLocation: null,
            isDrawerVisible: false,
        }));
        Keyboard.dismiss();
    };

    const fetchRoute = async (start, end) => {
        const url = `https://router.project-osrm.org/route/v1/driving/${start[0]},${start[1]};${end[0]},${end[1]}?overview=full&geometries=geojson`;

        try {
            const response = await axios.get(url);
            if (
                response.data.code === "Ok" &&
                response.data.routes &&
                response.data.routes.length > 0
            ) {
                const routeData = response.data.routes[0];
                const realDistance = (routeData.distance / 1000).toFixed(1); // Convert meters to km

                setRoutingState((prev) => ({ ...prev, route: routeData.geometry }));

                // Update the selected location with the real distance from the route
                setParkingState((prev) => ({
                    ...prev,
                    selectedLocation: {
                        ...prev.selectedLocation,
                        distance: realDistance,
                    },
                }));
            }
        } catch (error) {
            console.error("Error fetching route:", error);
        }
    };

    const handleNearbyPress = (location) => {
        const coords = [location.longitude, location.latitude];

        setRoutingState((prev) => ({ ...prev, destination: coords }));
        setParkingState((prev) => ({
            ...prev,
            selectedLocation: {
                ...location,
                coordinate: coords,
                price: VEHICLE_TYPE_RATES[bookingVehicleType] || 40,
                availableSpots: (location.car_capacity || 10) + Math.floor(Math.random() * 5),
                rating: "4.8",
                distance: "1.2",
            },
            isDrawerVisible: true,
        }));

        if (routingState.origin) {
            fetchRoute(routingState.origin, coords);
        }
    };

    const openBookingModal = () => {
        setBookingVehicleNum("");
        // Set default vehicle type that the agency supports
        const agency = parkingState.selectedLocation;
        const supportedTypes = Object.keys(VEHICLE_TYPE_LABELS).filter(
            (key) => agency[`${key}_capacity`] > 0 || agency[`${key}_capacity`] === undefined
        );
        setBookingVehicleType(supportedTypes[0] || "car");
        setBookingModalVisible(true);
    };

    const handleConfirmBooking = () => {
        if (!bookingVehicleNum) {
            toast.error("Please enter your vehicle registration number.", "Error", true);
            return;
        }

        const agency = parkingState.selectedLocation;
        const bookingCode = `PK-${Math.floor(1000 + Math.random() * 9000)}`;
        const hourlyRate = VEHICLE_TYPE_RATES[bookingVehicleType] || 40;

        const newBooking = {
            id: `book_${Date.now()}`,
            bookingCode,
            userId: currentUser?.id || "user_customer",
            userName: currentUser?.name || "Customer",
            userPhone: currentUser?.phone_number || "+91 7000000000",
            agencyId: agency.id,
            agencyName: agency.name,
            vehicleType: bookingVehicleType,
            vehicleNumber: bookingVehicleNum.toUpperCase(),
            status: "booked", // reserved
            startTime: new Date().toISOString(),
            endTime: null,
            bookedDuration: Number(bookingDuration),
            hourlyRate,
            totalBill: 0,
            paymentStatus: "pending",
        };

        dispatch(addBooking(newBooking));
        toast.success(`Reserved successfully! Booking Code: ${bookingCode}`, "Reservation Complete", true);

        setBookingModalVisible(false);
        setParkingState((prev) => ({ ...prev, isDrawerVisible: false }));
    };

    const currentHourlyRate = VEHICLE_TYPE_RATES[bookingVehicleType] || 40;
    const estimatedCost = currentHourlyRate * Number(bookingDuration);

    return (
        <View className="flex-1 w-full">
            {/* Map Background */}
            <MapView className="flex-1" mapStyle={STYLE_URL}>
                <Camera
                    zoomLevel={mapState.zoom}
                    centerCoordinate={mapState.center}
                    animationDuration={1000}
                    animationMode="flyTo"
                />

                {routingState.route && (
                    <ShapeSource id="route-source" shape={routingState.route}>
                        <LineLayer
                            id="route-layer"
                            style={{
                                lineColor: "#4338ca",
                                lineWidth: 5,
                                lineCap: "round",
                                lineJoin: "round",
                            }}
                        />
                    </ShapeSource>
                )}

                {routingState.origin && (
                    <MarkerView id="selected-marker" coordinate={routingState.origin}>
                        <View className="items-center justify-center w-11 h-11">
                            <Surface
                                elevation={4}
                                className="bg-white rounded-full p-1.5 border-2 border-primary"
                            >
                                <Image
                                    source={require("../assets/ic_location.png")}
                                    className="w-7 h-7"
                                    resizeMode="contain"
                                />
                            </Surface>
                        </View>
                    </MarkerView>
                )}

                {approvedAgencies.map((loc) => (
                    <MarkerView
                        key={`agency-${loc.id}`}
                        id={`agency-${loc.id}`}
                        coordinate={[loc.longitude, loc.latitude]}
                    >
                        <TouchableOpacity
                            onPress={() => handleNearbyPress(loc)}
                            activeOpacity={0.7}
                            className="items-center justify-center w-11 h-11"
                        >
                            <Surface
                                elevation={4}
                                className={`bg-white rounded-full p-1.5 border-2 ${
                                    parkingState.selectedLocation?.id === loc.id
                                        ? "border-primary"
                                        : "border-indigo-400"
                                }`}
                            >
                                <Image
                                    source={require("../assets/ic_location.png")}
                                    className={`w-7 h-7 ${
                                        parkingState.selectedLocation?.id === loc.id
                                            ? ""
                                            : "opacity-80"
                                    }`}
                                    style={
                                        parkingState.selectedLocation?.id === loc.id
                                            ? {}
                                            : { tintColor: "#4338ca" }
                                    }
                                    resizeMode="contain"
                                />
                            </Surface>
                        </TouchableOpacity>
                    </MarkerView>
                ))}
            </MapView>

            <ParkingDetailDrawer
                visible={parkingState.isDrawerVisible}
                location={parkingState.selectedLocation}
                onClose={() => setParkingState((prev) => ({ ...prev, isDrawerVisible: false }))}
                onStartNavigation={openBookingModal}
            />

            {/* Floating Search Bar */}
            <View className="absolute top-5 left-4 right-4 z-10">
                <Searchbar
                    placeholder="Search parking locations..."
                    onChangeText={handleSearchChange}
                    value={searchState.query}
                    loading={searchState.isLoading}
                    elevation={3}
                    className="bg-white rounded-xl"
                />

                {searchState.suggestions.length > 0 && (
                    <Surface
                        elevation={4}
                        className="bg-white mt-1 rounded-xl max-h-[300px] overflow-hidden"
                    >
                        <FlatList
                            data={searchState.suggestions}
                            keyExtractor={(item, index) => index.toString()}
                            renderItem={({ item }) => (
                                <List.Item
                                    title={item.properties.name || "Unknown Location"}
                                    description={`${item.properties.city || ""}${
                                        item.properties.city ? ", " : ""
                                    }${item.properties.country || ""}`}
                                    left={(props) => (
                                        <List.Icon {...props} icon="map-marker-outline" />
                                    )}
                                    onPress={() => handleSelectLocation(item)}
                                />
                            )}
                            ItemSeparatorComponent={() => <View className="h-[1px] bg-gray-100" />}
                        />
                    </Surface>
                )}
            </View>

            {/* Portal Booking Modal */}
            <Portal>
                <Modal
                    visible={bookingModalVisible}
                    onDismiss={() => setBookingModalVisible(false)}
                    className="bg-white p-6 m-5 rounded-2xl max-w-[450px] self-center w-[90%]"
                >
                    <Text className="text-lg font-bold text-slate-800 mb-1">Reserve Parking Slot</Text>
                    <Text className="text-xs text-slate-400 mb-4">{parkingState.selectedLocation?.name}</Text>

                    <TextInput
                        label="Vehicle Registration Number *"
                        value={bookingVehicleNum}
                        onChangeText={setBookingVehicleNum}
                        mode="outlined"
                        dense
                        autoCapitalize="characters"
                        className="bg-white mb-4"
                        outlineColor="#e2e8f0"
                        activeOutlineColor="#4338ca"
                        left={<TextInput.Icon icon="car-info" />}
                    />

                    <Text className="text-sm font-semibold text-slate-700 mb-2">Select Vehicle Type</Text>
                    <View className="flex-row flex-wrap gap-2 mb-4">
                        {Object.keys(VEHICLE_TYPE_LABELS)
                            .filter(
                                (key) =>
                                    parkingState.selectedLocation &&
                                    (parkingState.selectedLocation[`${key}_capacity`] > 0 ||
                                        parkingState.selectedLocation[`${key}_capacity`] === undefined)
                            )
                            .map((key) => (
                                <TouchableOpacity
                                    key={key}
                                    onPress={() => setBookingVehicleType(key)}
                                    className={`flex-row items-center px-3 py-1.5 rounded-full border ${
                                        bookingVehicleType === key
                                            ? "bg-indigo-50 border-indigo-600"
                                            : "bg-white border-slate-200"
                                    }`}
                                >
                                    <Avatar.Icon
                                        size={18}
                                        icon={VEHICLE_TYPE_ICONS[key]}
                                        style={{ backgroundColor: "transparent" }}
                                        color={bookingVehicleType === key ? "#4338ca" : "#64748b"}
                                    />
                                    <Text
                                        className={`text-xs ml-1 font-bold ${
                                            bookingVehicleType === key ? "text-indigo-800" : "text-slate-600"
                                        }`}
                                    >
                                        {VEHICLE_TYPE_LABELS[key]} (₹{VEHICLE_TYPE_RATES[key]}/h)
                                    </Text>
                                </TouchableOpacity>
                            ))}
                    </View>

                    <Text className="text-sm font-semibold text-slate-700 mb-2">Estimated Duration</Text>
                    <SegmentedButtons
                        value={bookingDuration}
                        onValueChange={setBookingDuration}
                        buttons={[
                            { value: "1", label: "1 Hr" },
                            { value: "2", label: "2 Hrs" },
                            { value: "4", label: "4 Hrs" },
                            { value: "8", label: "8 Hrs" },
                        ]}
                        theme={{ colors: { primary: "#4338ca" } }}
                        style={{ marginBottom: 16 }}
                    />

                    <Divider className="my-2 bg-slate-100" />

                    <View className="flex-row justify-between items-center py-2 px-1 mb-4">
                        <Text className="font-bold text-slate-700 text-sm">Estimated Cost:</Text>
                        <Text className="font-bold text-indigo-700 text-xl">₹{estimatedCost}</Text>
                    </View>

                    <View className="flex-row justify-end gap-2">
                        <Button mode="outlined" onPress={() => setBookingModalVisible(false)} textColor="#64748b">
                            Cancel
                        </Button>
                        <Button
                            mode="contained"
                            onPress={handleConfirmBooking}
                            buttonColor="#4338ca"
                            labelStyle={{ color: "white" }}
                        >
                            Confirm Reservation
                        </Button>
                    </View>
                </Modal>
            </Portal>
        </View>
    );
};

export default HomeMap;
