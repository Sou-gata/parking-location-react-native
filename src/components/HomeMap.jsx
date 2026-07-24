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
    Divider,
    Avatar,
    IconButton,
    Menu,
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
import DateTimePicker from "@react-native-community/datetimepicker";

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
    fromDate: "",
    fromTime: "",
    toDate: "",
    toTime: "",
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

const HomeMap = () => {
    const dispatch = useDispatch();
    const toast = useToast();
    const toastRef = useRef(toast);
    const cameraRef = useRef(null);
    const hasCenteredOnUser = useRef(false);
    const debounceTimerRef = useRef(null); // useRef no re-render on change

    useEffect(() => {
        toastRef.current = toast;
    }, [toast]);

    const currentUser = useSelector((state) => state.user.user);
    const approvedAgencies = useSelector((state) => state.parking.agencies);
    const bookings = useSelector((state) => state.parking.bookings);

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

    const [pickerState, setPickerState] = useState({
        visible: false,
        mode: "date", // 'date' or 'time'
        target: "from", // 'from' or 'to'
        value: new Date(),
    });

    const [selectedVehicleOption, setSelectedVehicleOption] = useState("");
    const [vehicleMenuVisible, setVehicleMenuVisible] = useState(false);

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
                    if (!isNaN(parsed.getTime())) {
                        defaultDate = parsed;
                    }
                } else if (
                    target === "to" &&
                    bookingState.toDate &&
                    bookingState.toTime
                ) {
                    const parsed = new Date(
                        `${bookingState.toDate}T${bookingState.toTime}`
                    );
                    if (!isNaN(parsed.getTime())) {
                        defaultDate = parsed;
                    }
                }
            } catch (e) {
                console.error("Error parsing default date for picker:", e);
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
                    toastRef.current.error(
                        "Cannot select a start date/time in the past.",
                        "Validation Error",
                        true
                    );
                    if (Platform.OS === "ios") {
                        let originalDate = new Date();
                        const parsed = new Date(
                            `${bookingState.fromDate}T${bookingState.fromTime}`
                        );
                        if (!isNaN(parsed.getTime())) {
                            originalDate = parsed;
                        }
                        setPickerState((prev) => ({
                            ...prev,
                            value: originalDate,
                        }));
                    }
                    return;
                }

                if (proposedEnd.getTime() <= proposedStart.getTime()) {
                    if (target === "to") {
                        toastRef.current.error(
                            "End date/time must be after start date/time.",
                            "Validation Error",
                            true
                        );
                        if (Platform.OS === "ios") {
                            let originalDate = new Date();
                            const parsed = new Date(
                                `${bookingState.toDate}T${bookingState.toTime}`
                            );
                            if (!isNaN(parsed.getTime())) {
                                originalDate = parsed;
                            }
                            setPickerState((prev) => ({
                                ...prev,
                                value: originalDate,
                            }));
                        }
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
        [pickerState, bookingState, setBooking]
    );

    const getMinimumDateForPicker = useCallback(() => {
        if (pickerState.target === "to") {
            try {
                const parsed = new Date(
                    `${bookingState.fromDate}T${bookingState.fromTime}`
                );
                if (!isNaN(parsed.getTime())) {
                    return parsed;
                }
            } catch (e) {
                console.error("Error parsing date for minimum date picker:", e);
            }
        }
        return new Date();
    }, [bookingState.fromDate, bookingState.fromTime, pickerState.target]);

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
                    return prev; // no change skip re-render
                }
                // First live location update fetch nearby
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

        const now = new Date();
        const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000);

        const savedVehicles = currentUser?.vehicle_numbers
            ? (() => {
                  try {
                      if (currentUser.vehicle_numbers.startsWith("[")) {
                          return JSON.parse(currentUser.vehicle_numbers);
                      }
                      return currentUser.vehicle_numbers
                          .split(",")
                          .map((v) => v.trim())
                          .filter(Boolean);
                  } catch (e) {
                      return [];
                  }
              })()
            : [];

        const defaultVehicle = savedVehicles.length > 0 ? savedVehicles[0] : "";
        setSelectedVehicleOption(defaultVehicle || "Other");

        setBooking({
            visible: true,
            vehicleNum: defaultVehicle,
            vehicleType: supportedTypes[0] || "car",
            fromDate: formatDate(now),
            fromTime: formatTime(now),
            toDate: formatDate(twoHoursLater),
            toTime: formatTime(twoHoursLater),
        });
    }, [parkingState.selectedLocation, currentUser, setBooking]);

    // Calculate custom duration based on selected date & time
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

    // Check slot availability for selected vehicle type at the selected agency
    const getAvailabilityInfo = useCallback(() => {
        const agency = parkingState.selectedLocation;
        if (!agency) {
            return {
                isAvailable: false,
                capacity: 0,
                booked: 0,
                availableSpots: 0,
            };
        }

        const selectedType = bookingState.vehicleType;
        const capacityKey = `${selectedType}_capacity`;
        const snakeCapacityKey =
            selectedType === "twoWheeler"
                ? "two_wheeler_capacity"
                : selectedType === "threeWheeler"
                ? "three_wheeler_capacity"
                : `${selectedType}_capacity`;

        const capacity =
            agency[capacityKey] !== undefined
                ? Number(agency[capacityKey])
                : agency[snakeCapacityKey] !== undefined
                ? Number(agency[snakeCapacityKey])
                : 20;

        // Count active/booked bookings for this agency & vehicle type
        const activeCount = (bookings || []).filter(
            (b) =>
                b.agencyId === agency.id &&
                b.vehicleType === selectedType &&
                (b.status === "booked" || b.status === "checked_in")
        ).length;

        return {
            capacity,
            booked: activeCount,
            availableSpots: Math.max(0, capacity - activeCount),
            isAvailable: activeCount < capacity,
        };
    }, [parkingState.selectedLocation, bookingState.vehicleType, bookings]);

    const availability = getAvailabilityInfo();

    const currentHourlyRate =
        (parkingState.selectedLocation?.[`${bookingState.vehicleType}_rate`] ??
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
                "No parking spots are available for this vehicle type.",
                "Unavailable",
                true
            );
            return;
        }

        const agency = parkingState.selectedLocation;
        const hourlyRate =
            agency[`${bookingState.vehicleType}_rate`] ||
            VEHICLE_TYPE_RATES[bookingState.vehicleType] ||
            40;

        const endTimeStr = `${bookingState.toDate}T${bookingState.toTime}`;

        // Prepare request body for backend api
        const bookingData = {
            userId: currentUser?.id || null,
            userName: currentUser?.name || "Customer",
            userPhone: currentUser?.phone_number || "+91 7000000000",
            agencyId: agency.id,
            agencyName: agency.name,
            vehicleType: bookingState.vehicleType,
            vehicleNumber: bookingState.vehicleNum.toUpperCase(),
            bookedDuration: calculatedDuration,
            hourlyRate,
            startTime: startTime.toISOString(),
            endTime: new Date(endTimeStr).toISOString(),
        };

        try {
            // Post to backend API
            const res = await apiService.post("bookings/create", bookingData);

            if (res && res.success) {
                // If api call succeeded, add to local redux store using backend mapped response
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

                toast.success(
                    `Reserved successfully! Booking Code: ${serverBooking.bookingCode}`,
                    "Reservation Complete",
                    true
                );
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
            toast.error(
                "Failed to reach backend server. Booking not saved.",
                "Connection Error",
                true
            );
        }

        setBooking({ visible: false });
        setParkingState((prev) => ({ ...prev, isDrawerVisible: false }));
    }, [
        bookingState,
        parkingState.selectedLocation,
        currentUser,
        dispatch,
        toast,
        setBooking,
        calculatedDuration,
        availability,
        estimatedCost,
    ]);

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

                    {(() => {
                        const savedVehicles = currentUser?.vehicle_numbers
                            ? (() => {
                                  try {
                                      if (currentUser.vehicle_numbers.startsWith("[")) {
                                          return JSON.parse(currentUser.vehicle_numbers);
                                      }
                                      return currentUser.vehicle_numbers
                                          .split(",")
                                          .map((v) => v.trim())
                                          .filter(Boolean);
                                  } catch (e) {
                                      console.error("Error parsing user vehicles:", e);
                                      return [];
                                  }
                              })()
                            : [];

                        if (savedVehicles.length === 0) {
                            return (
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
                            );
                        }

                        return (
                            <View className="mb-4">
                                <Menu
                                    visible={vehicleMenuVisible}
                                    onDismiss={() => setVehicleMenuVisible(false)}
                                    anchor={
                                        <TouchableOpacity
                                            onPress={() => setVehicleMenuVisible(true)}
                                            activeOpacity={0.8}
                                        >
                                            <View pointerEvents="none">
                                                <TextInput
                                                    label="Select Vehicle *"
                                                    value={
                                                        selectedVehicleOption === "Other"
                                                            ? "Other (Enter Manually)"
                                                            : selectedVehicleOption
                                                    }
                                                    mode="outlined"
                                                    dense
                                                    className="bg-white"
                                                    outlineColor="#e2e8f0"
                                                    activeOutlineColor="#4338ca"
                                                    editable={false}
                                                    left={<TextInput.Icon icon="car" />}
                                                    right={<TextInput.Icon icon="chevron-down" />}
                                                />
                                            </View>
                                        </TouchableOpacity>
                                    }
                                    contentStyle={{ backgroundColor: "white" }}
                                >
                                    {savedVehicles.map((vNum) => (
                                        <Menu.Item
                                            key={vNum}
                                            onPress={() => {
                                                setSelectedVehicleOption(vNum);
                                                setBooking({ vehicleNum: vNum });
                                                setVehicleMenuVisible(false);
                                            }}
                                            title={vNum}
                                        />
                                    ))}
                                    <Menu.Item
                                        onPress={() => {
                                            setSelectedVehicleOption("Other");
                                            setBooking({ vehicleNum: "" });
                                            setVehicleMenuVisible(false);
                                        }}
                                        title="Other (Enter Manually)"
                                    />
                                </Menu>

                                {selectedVehicleOption === "Other" && (
                                    <TextInput
                                        label="Vehicle Registration Number *"
                                        value={bookingState.vehicleNum}
                                        onChangeText={(vehicleNum) =>
                                            setBooking({ vehicleNum })
                                        }
                                        mode="outlined"
                                        dense
                                        autoCapitalize="characters"
                                        className="bg-white mt-3"
                                        outlineColor="#e2e8f0"
                                        activeOutlineColor="#4338ca"
                                        left={<TextInput.Icon icon="car-info" />}
                                    />
                                )}
                            </View>
                        );
                    })()}

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
                                        {VEHICLE_TYPE_LABELS[key]} (₹
                                        {parkingState.selectedLocation?.[
                                            `${key}_rate`
                                        ] || VEHICLE_TYPE_RATES[key]}
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
                            onPress={() => openPicker("date", "from")}
                            className="flex-1"
                        >
                            <View pointerEvents="none">
                                <TextInput
                                    label="Date (YYYY-MM-DD)"
                                    value={bookingState.fromDate}
                                    mode="outlined"
                                    dense
                                    className="bg-white"
                                    outlineColor="#e2e8f0"
                                    activeOutlineColor="#4338ca"
                                    placeholder="YYYY-MM-DD"
                                    editable={false}
                                    right={<TextInput.Icon icon="calendar" />}
                                />
                            </View>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => openPicker("time", "from")}
                            className="flex-1"
                        >
                            <View pointerEvents="none">
                                <TextInput
                                    label="Time (HH:MM)"
                                    value={bookingState.fromTime}
                                    mode="outlined"
                                    dense
                                    className="bg-white"
                                    outlineColor="#e2e8f0"
                                    activeOutlineColor="#4338ca"
                                    placeholder="HH:MM"
                                    editable={false}
                                    right={
                                        <TextInput.Icon icon="clock-outline" />
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
                                    outlineColor="#e2e8f0"
                                    activeOutlineColor="#4338ca"
                                    placeholder="YYYY-MM-DD"
                                    editable={false}
                                    right={<TextInput.Icon icon="calendar" />}
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
                                    outlineColor="#e2e8f0"
                                    activeOutlineColor="#4338ca"
                                    placeholder="HH:MM"
                                    editable={false}
                                    right={
                                        <TextInput.Icon icon="clock-outline" />
                                    }
                                />
                            </View>
                        </TouchableOpacity>
                    </View>

                    {/* Native Picker Components */}
                    {pickerState.visible && Platform.OS === "android" && (
                        <DateTimePicker
                            value={pickerState.value}
                            mode={pickerState.mode}
                            display="default"
                            onChange={handlePickerChange}
                            accentColor="#4338ca"
                            minimumDate={getMinimumDateForPicker()}
                        />
                    )}

                    {pickerState.visible && Platform.OS === "ios" && (
                        <Portal>
                            <Modal
                                visible={pickerState.visible}
                                onDismiss={() =>
                                    setPickerState((prev) => ({
                                        ...prev,
                                        visible: false,
                                    }))
                                }
                                className="bg-white p-6 m-5 rounded-2xl max-w-[350px] self-center w-[85%]"
                            >
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
                                        accentColor="#4338ca"
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
                                    buttonColor="#4338ca"
                                    textColor="white"
                                >
                                    Done
                                </Button>
                            </Modal>
                        </Portal>
                    )}

                    <View className="flex-row justify-between mb-3 px-1">
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

                    <Divider className="my-2 bg-slate-100" />

                    <View className="flex-row justify-between items-center py-2 px-1 mb-4">
                        <Text className="font-bold text-slate-700 text-sm">
                            Estimated Cost:
                        </Text>
                        <Text className="font-bold text-indigo-700 text-xl">
                            ₹{estimatedCost}
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
                            disabled={
                                !availability.isAvailable ||
                                calculatedDuration <= 0
                            }
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
