import React, { useState, useEffect, useRef, useCallback } from "react";
import {
    View,
    FlatList,
    Keyboard,
    Image,
    TouchableOpacity,
    Platform,
    PermissionsAndroid,
} from "react-native";
import {
    Searchbar,
    List,
    Surface,
    Portal,
    Modal,
    Text,
    TextInput,
    Button,
    SegmentedButtons,
    Divider,
    Avatar,
    IconButton,
} from "react-native-paper";
import {
    MapView,
    Camera,
    MarkerView,
    ShapeSource,
    LineLayer,
    UserLocation,
    LocationManager,
    PointAnnotation,
} from "@maplibre/maplibre-react-native";
import { cssInterop } from "nativewind";
import axios from "axios";
import { useSelector, useDispatch } from "react-redux";
import ParkingDetailDrawer from "./ParkingDetailDrawer";
import { addBooking, setAgencies } from "../store/slices/parkingSlice";
import useToast from "../hooks/useToast";
import apiService from "../utils/apiService";
import { MaterialDesignIcons } from "@react-native-vector-icons/material-design-icons";

cssInterop(MapView, { className: "style" });
cssInterop(MarkerView, { className: "style" });
cssInterop(PointAnnotation, { className: "style" });

const STYLE_URL =
    "https://api.maptiler.com/maps/base-v4/style.json?key=SHvSqRiAB4DI5Xuokw5W";
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

const getDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) *
            Math.cos(lat2 * (Math.PI / 180)) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const mapAgencyFromApi = (a) => {
    if (!a) return null;
    const parseRate = (val) => (val !== undefined ? parseFloat(val) : val);
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
        twoWheeler_rate: parseRate(a.two_wheeler_rate ?? a.twoWheeler_rate),
        threeWheeler_rate: parseRate(
            a.three_wheeler_rate ?? a.threeWheeler_rate
        ),
        car_rate: parseRate(a.car_rate),
        suv_rate: parseRate(a.suv_rate),
        van_rate: parseRate(a.van_rate),
        pickup_rate: parseRate(a.pickup_rate),
        ev_rate: parseRate(a.ev_rate),
    };
};

const INITIAL_LOCATION_STATE = { hasPermission: false, coords: null };
const INITIAL_SEARCH_STATE = { query: "", suggestions: [], isLoading: false };
const INITIAL_ROUTING_STATE = { origin: null, destination: null, route: null };
const INITIAL_PARKING_STATE = {
    selectedLocation: null,
    isDrawerVisible: false,
};
const INITIAL_BOOKING_STATE = {
    visible: false,
    vehicleNum: "",
    vehicleType: "car",
    duration: "2",
};

const HomeMap = () => {
    const dispatch = useDispatch();
    const toast = useToast();
    const toastRef = useRef(toast);
    const cameraRef = useRef(null);
    const hasCenteredOnUser = useRef(false);
    const debounceTimerRef = useRef(null); // useRef â€” no re-render on change

    useEffect(() => {
        toastRef.current = toast;
    }, [toast]);

    const currentUser = useSelector((state) => state.user.user);
    const approvedAgencies = useSelector((state) => state.parking.agencies);

    const [locationState, setLocationState] = useState(INITIAL_LOCATION_STATE);

    const [searchState, setSearchState] = useState(INITIAL_SEARCH_STATE);
    const [mapState, setMapState] = useState({
        center: INITIAL_CENTER,
        zoom: 12,
    });
    const [routingState, setRoutingState] = useState(INITIAL_ROUTING_STATE);
    const [parkingState, setParkingState] = useState(INITIAL_PARKING_STATE);

    const [bookingState, setBookingState] = useState(INITIAL_BOOKING_STATE);

    // Convenience partial-update setter for bookingState
    const setBooking = useCallback(
        (patch) => setBookingState((prev) => ({ ...prev, ...patch })),
        []
    );

    const requestLocationPermission = useCallback(async () => {
        if (Platform.OS === "android") {
            try {
                const granted = await PermissionsAndroid.requestMultiple([
                    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
                    PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
                ]);
                return (
                    granted["android.permission.ACCESS_FINE_LOCATION"] ===
                        PermissionsAndroid.RESULTS.GRANTED ||
                    granted["android.permission.ACCESS_COARSE_LOCATION"] ===
                        PermissionsAndroid.RESULTS.GRANTED
                );
            } catch (err) {
                console.warn("Permission request error:", err);
                return false;
            }
        }
        return true;
    }, []);

    // API Calls

    const fetchNearbyAgencies = useCallback(
        async (lat, lon) => {
            try {
                const params = {};
                if (lat !== undefined && lon !== undefined) {
                    params.latitude = lat;
                    params.longitude = lon;
                    params.radius = 5.0;
                }
                const res = await apiService.get("agencies", { params });
                if (res?.success) {
                    const mapped = res.data.map(mapAgencyFromApi);
                    dispatch(setAgencies(mapped));
                    if (lat !== undefined && res.data.length === 0) {
                        toastRef.current.info(
                            "No parking lots found within 5 km of this location.",
                            "Search Result",
                            true
                        );
                    } else {
                        toastRef.current.success(
                            `Fetched ${mapped.length} parking spaces nearby.`,
                            "Search Success",
                            true
                        );
                    }
                } else {
                    toastRef.current.error(
                        "Failed to fetch parking spaces from server.",
                        "Fetch Error",
                        true
                    );
                }
            } catch {
                toastRef.current.error(
                    "Network Error: Cannot reach backend server.",
                    "Connection Error",
                    true
                );
            }
        },
        [dispatch]
    );

    const fetchRoute = useCallback(async (start, end) => {
        try {
            const res = await apiService.get("agencies/route", {
                params: {
                    startLat: start[1],
                    startLon: start[0],
                    endLat: end[1],
                    endLon: end[0],
                },
            });
            if (res?.success) {
                const { route, distance } = res.data;
                const routeGeoJSON = {
                    type: "FeatureCollection",
                    features: [
                        { type: "Feature", properties: {}, geometry: route },
                    ],
                };
                setRoutingState((prev) => ({ ...prev, route: routeGeoJSON }));
                setParkingState((prev) => ({
                    ...prev,
                    selectedLocation: { ...prev.selectedLocation, distance },
                }));

                const minLng = Math.min(start[0], end[0]);
                const minLat = Math.min(start[1], end[1]);
                const maxLng = Math.max(start[0], end[0]);
                const maxLat = Math.max(start[1], end[1]);
                cameraRef.current?.fitBounds(
                    [maxLng, maxLat],
                    [minLng, minLat],
                    [60, 60, 380, 60],
                    1000
                );
            }
        } catch (error) {
            console.error("Error fetching route from backend:", error);
        }
    }, []);

    // Location Helpers

    const centerOnCoords = useCallback((coords) => {
        hasCenteredOnUser.current = true;
        setMapState((prev) => ({ ...prev, center: coords }));
    }, []);

    /** Applies a LocationManager location result; returns true if valid coords found. */
    const applyLastKnownLocation = useCallback(
        (lastLoc) => {
            if (!lastLoc?.coords) return false;
            const coords = [lastLoc.coords.longitude, lastLoc.coords.latitude];
            setLocationState((prev) => ({ ...prev, coords }));
            centerOnCoords(coords);
            fetchNearbyAgencies(
                lastLoc.coords.latitude,
                lastLoc.coords.longitude
            );
            return true;
        },
        [centerOnCoords, fetchNearbyAgencies]
    );

    const handleUserLocationUpdate = useCallback(
        (location) => {
            if (!location?.coords) return;
            const coords = [
                location.coords.longitude,
                location.coords.latitude,
            ];

            setLocationState((prev) => {
                if (
                    prev.coords &&
                    prev.coords[0] === coords[0] &&
                    prev.coords[1] === coords[1]
                ) {
                    return prev; // no change â€” skip re-render
                }
                // First live location update â€” fetch nearby
                if (!prev.coords && !routingState.origin) {
                    fetchNearbyAgencies(
                        location.coords.latitude,
                        location.coords.longitude
                    );
                }
                return { ...prev, coords };
            });

            if (!hasCenteredOnUser.current) {
                centerOnCoords(coords);
            }
        },
        [fetchNearbyAgencies, routingState.origin, centerOnCoords]
    );

    // Effects

    useEffect(() => {
        const initLocation = async () => {
            const granted = await requestLocationPermission();
            setLocationState((prev) => ({ ...prev, hasPermission: granted }));
            if (granted) {
                try {
                    const lastLoc =
                        await LocationManager.getLastKnownLocation();
                    if (applyLastKnownLocation(lastLoc)) return;
                } catch {
                    console.log(
                        "Initial last known location not yet available (waiting for GPS lock)"
                    );
                }
            }
            fetchNearbyAgencies();
        };
        initLocation();
    }, []);

    // Handlers
    const handleLocateMe = useCallback(async () => {
        const granted = await requestLocationPermission();
        setLocationState((prev) => ({ ...prev, hasPermission: granted }));

        if (!granted) {
            toast.error(
                "Location permission denied.",
                "Permission Error",
                true
            );
            return;
        }

        if (locationState.coords) {
            hasCenteredOnUser.current = true;
            cameraRef.current?.flyTo(locationState.coords, 1000);
            fetchNearbyAgencies(
                locationState.coords[1],
                locationState.coords[0]
            );
        } else {
            try {
                const lastLoc = await LocationManager.getLastKnownLocation();
                if (applyLastKnownLocation(lastLoc)) {
                    cameraRef.current?.flyTo(
                        [lastLoc.coords.longitude, lastLoc.coords.latitude],
                        1000
                    );
                } else {
                    toast.info(
                        "Locating your position, please wait a moment...",
                        "Locating",
                        true
                    );
                }
            } catch {
                toast.info(
                    "Locating your position, please wait a moment...",
                    "Locating",
                    true
                );
            }
        }
    }, [
        requestLocationPermission,
        locationState.coords,
        fetchNearbyAgencies,
        applyLastKnownLocation,
        toast,
    ]);

    const fetchSuggestions = useCallback(async (query) => {
        if (!query || query.length < 3) {
            setSearchState((prev) => ({ ...prev, suggestions: [] }));
            return;
        }
        setSearchState((prev) => ({ ...prev, isLoading: true }));
        const API_KEY = "4bf404b3ef3448c082d72492b6237b64";
        const url = `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(
            query
        )}&filter=rect:88.25,22.45,88.50,22.65&apiKey=${API_KEY}`;
        try {
            const response = await axios.get(url);
            setSearchState((prev) => ({
                ...prev,
                suggestions: response.data.features || [],
            }));
        } catch (error) {
            console.error("Error fetching suggestions (Geoapify):", error);
        } finally {
            setSearchState((prev) => ({ ...prev, isLoading: false }));
        }
    }, []);

    const handleSearchChange = useCallback(
        (query) => {
            setSearchState((prev) => ({ ...prev, query }));
            if (!query) {
                setSearchState((prev) => ({ ...prev, suggestions: [] }));
                setRoutingState(INITIAL_ROUTING_STATE);
                fetchNearbyAgencies();
                return;
            }
            clearTimeout(debounceTimerRef.current);
            debounceTimerRef.current = setTimeout(
                () => fetchSuggestions(query),
                500
            );
        },
        [fetchNearbyAgencies, fetchSuggestions]
    );

    const handleSelectLocation = useCallback(
        (feature) => {
            const coords = feature.geometry.coordinates;
            hasCenteredOnUser.current = true;
            setMapState({ center: coords, zoom: 15 });
            cameraRef.current?.flyTo(coords, 1000);
            setSearchState((prev) => ({
                ...prev,
                suggestions: [],
                query: feature.properties.name || feature.properties.city || "",
            }));
            setRoutingState({ origin: coords, destination: null, route: null });
            setParkingState(INITIAL_PARKING_STATE);
            fetchNearbyAgencies(coords[1], coords[0]);
            Keyboard.dismiss();
        },
        [fetchNearbyAgencies]
    );

    const handleNearbyPress = useCallback(
        async (location) => {
            try {
                let freshLocation = location;
                try {
                    const res = await apiService.get(`agencies/${location.id}`);
                    if (res?.success)
                        freshLocation = mapAgencyFromApi(res.data);
                } catch (apiError) {
                    console.error(
                        "API error fetching agency details:",
                        apiError
                    );
                }

                const coords = [
                    freshLocation.longitude,
                    freshLocation.latitude,
                ];
                const startCoords = routingState.origin || locationState.coords;
                const initialDistance = startCoords
                    ? getDistance(
                          startCoords[1],
                          startCoords[0],
                          freshLocation.latitude,
                          freshLocation.longitude
                      ).toFixed(1)
                    : "1.2";

                setRoutingState((prev) => ({ ...prev, destination: coords }));
                setParkingState({
                    isDrawerVisible: true,
                    selectedLocation: {
                        ...freshLocation,
                        coordinate: coords,
                        price:
                            freshLocation[`${bookingState.vehicleType}_rate`] ||
                            VEHICLE_TYPE_RATES[bookingState.vehicleType] ||
                            40,
                        availableSpots:
                            (freshLocation.car_capacity || 10) +
                            Math.floor(Math.random() * 5),
                        rating: "4.8",
                        distance: initialDistance,
                    },
                });

                if (startCoords) fetchRoute(startCoords, coords);
            } catch (error) {
                console.error("[CRITICAL] handleNearbyPress crashed:", error);
                toastRef.current.error(
                    `Marker tap error: ${error.message}`,
                    "App Error",
                    true
                );
            }
        },
        [
            routingState.origin,
            locationState.coords,
            bookingState.vehicleType,
            fetchRoute,
        ]
    );

    const openBookingModal = useCallback(() => {
        const agency = parkingState.selectedLocation;
        const supportedTypes = Object.keys(VEHICLE_TYPE_LABELS).filter(
            (key) =>
                agency[`${key}_capacity`] > 0 ||
                agency[`${key}_capacity`] === undefined
        );
        setBooking({
            visible: true,
            vehicleNum: "",
            vehicleType: supportedTypes[0] || "car",
        });
    }, [parkingState.selectedLocation, setBooking]);

    const handleConfirmBooking = useCallback(() => {
        if (!bookingState.vehicleNum) {
            toast.error(
                "Please enter your vehicle registration number.",
                "Error",
                true
            );
            return;
        }

        const agency = parkingState.selectedLocation;
        const bookingCode = `PK-${Math.floor(1000 + Math.random() * 9000)}`;
        const hourlyRate =
            agency[`${bookingState.vehicleType}_rate`] ||
            VEHICLE_TYPE_RATES[bookingState.vehicleType] ||
            40;

        dispatch(
            addBooking({
                id: `book_${Date.now()}`,
                bookingCode,
                userId: currentUser?.id || "user_customer",
                userName: currentUser?.name || "Customer",
                userPhone: currentUser?.phone_number || "+91 7000000000",
                agencyId: agency.id,
                agencyName: agency.name,
                vehicleType: bookingState.vehicleType,
                vehicleNumber: bookingState.vehicleNum.toUpperCase(),
                status: "booked",
                startTime: new Date().toISOString(),
                endTime: null,
                bookedDuration: Number(bookingState.duration),
                hourlyRate,
                totalBill: 0,
                paymentStatus: "pending",
            })
        );

        toast.success(
            `Reserved successfully! Booking Code: ${bookingCode}`,
            "Reservation Complete",
            true
        );
        setBooking({ visible: false });
        setParkingState((prev) => ({ ...prev, isDrawerVisible: false }));
    }, [
        bookingState,
        parkingState.selectedLocation,
        currentUser,
        dispatch,
        toast,
        setBooking,
    ]);

    // Derived Values
    const currentHourlyRate =
        (parkingState.selectedLocation?.[`${bookingState.vehicleType}_rate`] ??
            VEHICLE_TYPE_RATES[bookingState.vehicleType]) ||
        40;
    const estimatedCost = currentHourlyRate * Number(bookingState.duration);

    // Stable key for route ShapeSource (avoids stale layer IDs)
    const routeCoordCount =
        routingState.route?.features?.[0]?.geometry?.coordinates?.length ?? 0;

    // Render
    return (
        <View className="flex-1 w-full">
            {/* Map Background */}
            <MapView className="flex-1" mapStyle={STYLE_URL}>
                <Camera
                    ref={cameraRef}
                    zoomLevel={mapState.zoom}
                    centerCoordinate={mapState.center}
                    animationDuration={1000}
                    animationMode="flyTo"
                />

                {locationState.hasPermission && (
                    <UserLocation
                        renderMode="native"
                        visible={true}
                        showsUserHeadingIndicator={true}
                        onUpdate={handleUserLocationUpdate}
                    />
                )}

                {routingState.route && (
                    <ShapeSource
                        id={`route-source-${routeCoordCount}`}
                        key={`route-${routeCoordCount}`}
                        shape={routingState.route}
                    >
                        <LineLayer
                            id={`route-layer-${routeCoordCount}`}
                            style={{
                                lineColor: "#4338ca",
                                lineWidth: 6,
                                lineCap: "round",
                                lineJoin: "round",
                            }}
                        />
                    </ShapeSource>
                )}

                {routingState.origin && (
                    <MarkerView
                        id="selected-marker"
                        coordinate={routingState.origin}
                    >
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
                    <PointAnnotation
                        key={`agency-${loc.id}`}
                        id={`agency-${loc.id}`}
                        coordinate={[loc.longitude, loc.latitude]}
                        onSelected={() => handleNearbyPress(loc)}
                    >
                        <View className="items-center justify-center w-11 h-11">
                            <Surface
                                elevation={4}
                                className={`bg-white rounded-full w-10 h-10 items-center justify-center border-2 ${
                                    parkingState.selectedLocation?.id === loc.id
                                        ? "border-primary"
                                        : "border-indigo-400"
                                }`}
                            >
                                <MaterialDesignIcons
                                    name="car"
                                    size={24}
                                    color={
                                        parkingState.selectedLocation?.id ===
                                        loc.id
                                            ? "#4338ca"
                                            : "#6366f1"
                                    }
                                />
                            </Surface>
                        </View>
                    </PointAnnotation>
                ))}
            </MapView>

            <ParkingDetailDrawer
                visible={parkingState.isDrawerVisible}
                location={parkingState.selectedLocation}
                onClose={() =>
                    setParkingState((prev) => ({
                        ...prev,
                        isDrawerVisible: false,
                    }))
                }
                onStartNavigation={openBookingModal}
            />

            {/* Locate Me Floating Button */}
            <View
                className={`absolute right-4 z-10 ${
                    parkingState.isDrawerVisible
                        ? "bottom-[330px]"
                        : "bottom-10"
                }`}
            >
                <Surface
                    elevation={4}
                    className="bg-white rounded-full p-0.5 border border-slate-100"
                >
                    <IconButton
                        icon="crosshairs-gps"
                        iconColor="#4338ca"
                        size={24}
                        onPress={handleLocateMe}
                    />
                </Surface>
            </View>

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
                            keyExtractor={(_, index) => index.toString()}
                            renderItem={({ item }) => (
                                <List.Item
                                    title={
                                        item.properties.name ||
                                        "Unknown Location"
                                    }
                                    description={`${
                                        item.properties.city || ""
                                    }${item.properties.city ? ", " : ""}${
                                        item.properties.country || ""
                                    }`}
                                    left={(props) => (
                                        <List.Icon
                                            {...props}
                                            icon="map-marker-outline"
                                        />
                                    )}
                                    onPress={() => handleSelectLocation(item)}
                                />
                            )}
                            ItemSeparatorComponent={() => (
                                <View className="h-[1px] bg-gray-100" />
                            )}
                        />
                    </Surface>
                )}
            </View>

            {/* Booking Modal */}
            <Portal>
                <Modal
                    visible={bookingState.visible}
                    onDismiss={() => setBooking({ visible: false })}
                    className="bg-white p-6 m-5 rounded-2xl max-w-[450px] self-center w-[90%]"
                >
                    <Text className="text-lg font-bold text-slate-800 mb-1">
                        Reserve Parking Slot
                    </Text>
                    <Text className="text-xs text-slate-400 mb-4">
                        {parkingState.selectedLocation?.name}
                    </Text>

                    <TextInput
                        label="Vehicle Registration Number *"
                        value={bookingState.vehicleNum}
                        onChangeText={(vehicleNum) =>
                            setBooking({ vehicleNum })
                        }
                        mode="outlined"
                        dense
                        autoCapitalize="characters"
                        className="bg-white mb-4"
                        outlineColor="#e2e8f0"
                        activeOutlineColor="#4338ca"
                        left={<TextInput.Icon icon="car-info" />}
                    />

                    <Text className="text-sm font-semibold text-slate-700 mb-2">
                        Select Vehicle Type
                    </Text>
                    <View className="flex-row flex-wrap gap-2 mb-4">
                        {Object.keys(VEHICLE_TYPE_LABELS)
                            .filter(
                                (key) =>
                                    parkingState.selectedLocation &&
                                    (parkingState.selectedLocation[
                                        `${key}_capacity`
                                    ] > 0 ||
                                        parkingState.selectedLocation[
                                            `${key}_capacity`
                                        ] === undefined)
                            )
                            .map((key) => (
                                <TouchableOpacity
                                    key={key}
                                    onPress={() =>
                                        setBooking({ vehicleType: key })
                                    }
                                    className={`flex-row items-center px-3 py-1.5 rounded-full border ${
                                        bookingState.vehicleType === key
                                            ? "bg-indigo-50 border-indigo-600"
                                            : "bg-white border-slate-200"
                                    }`}
                                >
                                    <Avatar.Icon
                                        size={18}
                                        icon={VEHICLE_TYPE_ICONS[key]}
                                        style={{
                                            backgroundColor: "transparent",
                                        }}
                                        color={
                                            bookingState.vehicleType === key
                                                ? "#4338ca"
                                                : "#64748b"
                                        }
                                    />
                                    <Text
                                        className={`text-xs ml-1 font-bold ${
                                            bookingState.vehicleType === key
                                                ? "text-indigo-800"
                                                : "text-slate-600"
                                        }`}
                                    >
                                        {VEHICLE_TYPE_LABELS[key]} (â‚¹
                                        {parkingState.selectedLocation?.[
                                            `${key}_rate`
                                        ] || VEHICLE_TYPE_RATES[key]}
                                        /h)
                                    </Text>
                                </TouchableOpacity>
                            ))}
                    </View>

                    <Text className="text-sm font-semibold text-slate-700 mb-2">
                        Estimated Duration
                    </Text>
                    <SegmentedButtons
                        value={bookingState.duration}
                        onValueChange={(duration) => setBooking({ duration })}
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
                        <Text className="font-bold text-slate-700 text-sm">
                            Estimated Cost:
                        </Text>
                        <Text className="font-bold text-indigo-700 text-xl">
                            â‚¹{estimatedCost}
                        </Text>
                    </View>

                    <View className="flex-row justify-end gap-2">
                        <Button
                            mode="outlined"
                            onPress={() => setBooking({ visible: false })}
                            textColor="#64748b"
                        >
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
