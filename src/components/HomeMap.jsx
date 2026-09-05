import React, { useState, useEffect, useRef, useCallback } from "react";
import {
    View,
    FlatList,
    Keyboard,
    Image,
    Platform,
    PermissionsAndroid,
    BackHandler,
    Text,
    TouchableOpacity,
    ActivityIndicator,
} from "react-native";
import { Searchbar, List, Surface, IconButton } from "react-native-paper";
import {
    MapView,
    Camera,
    MarkerView,
    ShapeSource,
    LineLayer,
    PointAnnotation,
} from "@maplibre/maplibre-react-native";
import { cssInterop } from "nativewind";
import axios from "axios";
import { useSelector, useDispatch } from "react-redux";
import ParkingDetailDrawer from "./ParkingDetailDrawer";
import BookingModal from "./BookingModal";
import PreBookingIntentDialog from "./PreBookingIntentDialog";
import UnavailableBottomSheet from "./UnavailableBottomSheet";
import { setAgencies } from "../store/slices/parkingSlice";
import useToast from "../hooks/useToast";
import apiService from "../utils/apiService";
import { MaterialDesignIcons } from "@react-native-vector-icons/material-design-icons";
import Geolocation from "react-native-geolocation-service";

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
        rating: a.averageRating !== undefined ? a.averageRating : (a.rating !== undefined ? a.rating : 0),
        ratingCount: a.ratingCount !== undefined ? a.ratingCount : (a.totalCount || 0),
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
        cctv_available:
            a.cctv_available === true ||
            a.cctv_available === 1 ||
            a.cctv_available === "1" ||
            a.cctv_available === "yes" ||
            a.cctv_available === "true",
        cancellationPolicy: (() => {
            const raw = a.cancellationPolicy ?? a.cancellation_policy;
            if (Array.isArray(raw)) return raw;
            if (typeof raw === "string") {
                try {
                    return JSON.parse(raw);
                } catch {
                    return [];
                }
            }
            return [];
        })(),
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
const INITIAL_PRE_BOOKING_INTENT = {
    dialogVisible: false,
    vehicleType: "car",
    startTime: null,   // ISO string
    endTime: null,     // ISO string
    isSet: false,
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

const HomeMap = ({ shouldOpenIntentOnMount = false }) => {
    const dispatch = useDispatch();
    const toast = useToast();
    const toastRef = useRef(toast);
    const cameraRef = useRef(null);
    const hasCenteredOnUser = useRef(false);
    const debounceTimerRef = useRef(null); // useRef no re-render on change
    const hasInitializedRef = useRef(false);

    useEffect(() => {
        toastRef.current = toast;
    }, [toast]);

    // Open pre-booking intent dialog once when map view becomes active
    useEffect(() => {
        if (shouldOpenIntentOnMount) {
            // Small delay to let the map render first
            const t = setTimeout(() => {
                setPreBookingIntent((prev) => ({ ...prev, dialogVisible: true }));
            }, 400);
            return () => clearTimeout(t);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // intentionally run once on mount only

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

    // Pre-booking intent state (vehicle type + time filter for map search)
    const [preBookingIntent, setPreBookingIntent] = useState(INITIAL_PRE_BOOKING_INTENT);
    // Map of agencyId -> availability data from /agencies/availability-bulk
    const [availabilityMap, setAvailabilityMap] = useState({});
    const [availabilityLoading, setAvailabilityLoading] = useState(false);
    // Grayed-out marker tap state
    const [unavailableSheet, setUnavailableSheet] = useState({
        visible: false,
        data: null,
        agency: null,
    });

    // Keep a ref to the intent so async callbacks always see latest value
    const preBookingIntentRef = useRef(preBookingIntent);
    useEffect(() => {
        preBookingIntentRef.current = preBookingIntent;
    }, [preBookingIntent]);

    const setBooking = useCallback(
        (patch) => setBookingState((prev) => ({ ...prev, ...patch })),
        []
    );

    useEffect(() => {
        if (!parkingState.isDrawerVisible) return;

        const onBackPress = () => {
            setParkingState((prev) => ({
                ...prev,
                isDrawerVisible: false,
            }));
            return true;
        };

        const subscription = BackHandler.addEventListener(
            "hardwareBackPress",
            onBackPress
        );
        return () => subscription.remove();
    }, [parkingState.isDrawerVisible]);


    const getVehicleTypesSummary = useCallback(
        (agency) => {
            if (!agency) return [];
            const targetAgencyId = String(agency.id || agency.org_id || "");

            return Object.keys(VEHICLE_TYPE_LABELS)
                .map((key) => {
                    const capacityKeys = [
                        `${key}_capacity`,
                        `${key}Capacity`,
                        key === "twoWheeler" ? "two_wheeler_capacity" : null,
                        key === "threeWheeler" ? "three_wheeler_capacity" : null,
                    ].filter(Boolean);

                    let cap;
                    for (const k of capacityKeys) {
                        if (
                            agency[k] !== undefined &&
                            agency[k] !== null &&
                            agency[k] !== ""
                        ) {
                            cap = Number(agency[k]);
                            break;
                        }
                    }

                    if (cap === undefined || isNaN(cap) || cap <= 0) {
                        return null;
                    }

                    const now = new Date();
                    const activeCount = (bookings || []).filter((b) => {
                        const bAgencyId = String(
                            b.agencyId || b.agency_id || b.org_id || ""
                        );
                        if (bAgencyId !== targetAgencyId) return false;

                        const bVehicleType = b.vehicleType || b.vehicle_type;
                        const normKey = key.toLowerCase().replace(/[-_\s]/g, "");
                        const normBType = (bVehicleType || "")
                            .toLowerCase()
                            .replace(/[-_\s]/g, "");
                        const isTypeMatch =
                            normKey === normBType ||
                            ((normKey.includes("twowheeler") ||
                                normKey === "bike") &&
                                (normBType.includes("twowheeler") ||
                                    normBType === "bike")) ||
                            ((normKey.includes("threewheeler") ||
                                normKey === "auto") &&
                                (normBType.includes("threewheeler") ||
                                    normBType === "auto"));

                        if (!isTypeMatch) return false;

                        if (b.status === "checked_in") return true;

                        if (
                            b.status === "booked" ||
                            b.status === "pending_approval"
                        ) {
                            const bStartRaw =
                                b.bookingStartTime ||
                                b.booking_start_time ||
                                b.startTime ||
                                b.start_time;
                            const bEndRaw =
                                b.bookingEndTime ||
                                b.booking_end_time ||
                                b.endTime ||
                                b.end_time;
                            if (!bStartRaw) return false;

                            const bStart = new Date(bStartRaw);
                            if (isNaN(bStart.getTime())) return false;

                            let bEnd;
                            if (bEndRaw) {
                                bEnd = new Date(bEndRaw);
                            } else {
                                const durHours =
                                    parseFloat(
                                        b.bookedDuration || b.booked_duration
                                    ) || 1;
                                bEnd = new Date(
                                    bStart.getTime() + durHours * 3600000
                                );
                            }

                            // Active right now if bStart <= now and bEnd > now
                            return bStart <= now && bEnd > now;
                        }

                        return false;
                    }).length;

                    const availableSpots = Math.max(0, cap - activeCount);
                    const rate =
                        agency[`${key}_rate`] !== undefined &&
                        agency[`${key}_rate`] !== null
                            ? parseFloat(agency[`${key}_rate`])
                            : VEHICLE_TYPE_RATES[key] || 40;

                    return {
                        type: key,
                        label: VEHICLE_TYPE_LABELS[key],
                        icon: VEHICLE_TYPE_ICONS[key],
                        capacity: cap,
                        booked: activeCount,
                        availableSpots,
                        rate,
                    };
                })
                .filter(Boolean);
        },
        [bookings]
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
                    // If pre-booking intent is active, fetch availability for these agencies
                    const intent = preBookingIntentRef.current;
                    if (intent.isSet && intent.startTime && intent.endTime) {
                        fetchAvailabilityBulk(
                            lat,
                            lon,
                            intent.vehicleType,
                            intent.startTime,
                            intent.endTime
                        );
                    }
                }
            } catch (err) {
                console.log("Error fetching nearby agencies:", err);
            }
        },
        [dispatch] // fetchAvailabilityBulk added via ref pattern to avoid circular dep
    );

    const fetchRoute = useCallback(async (start, end) => {
        try {
            if (!start || !end || !Array.isArray(start) || !Array.isArray(end)) return;
            if (isNaN(start[0]) || isNaN(start[1]) || isNaN(end[0]) || isNaN(end[1])) return;

            const res = await apiService.get("agencies/route", {
                params: {
                    startLat: start[1],
                    startLon: start[0],
                    endLat: end[1],
                    endLon: end[0],
                },
            });
            if (res?.success && res.data?.route?.coordinates) {
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
                    selectedLocation: prev.selectedLocation
                        ? { ...prev.selectedLocation, distance }
                        : null,
                }));

                const minLng = Math.min(start[0], end[0]);
                const minLat = Math.min(start[1], end[1]);
                const maxLng = Math.max(start[0], end[0]);
                const maxLat = Math.max(start[1], end[1]);

                if (Math.abs(maxLng - minLng) > 0.0001 || Math.abs(maxLat - minLat) > 0.0001) {
                    try {
                        cameraRef.current?.fitBounds(
                            [maxLng, maxLat],
                            [minLng, minLat],
                            [60, 60, 160, 60],
                            1000
                        );
                    } catch (fitErr) {
                        console.warn("fitBounds error safely caught:", fitErr);
                    }
                }
            }
        } catch (error) {
            console.error("Error fetching route from backend:", error);
        }
    }, []);

    // Fetch bulk availability data for all agencies in the current radius
    const fetchAvailabilityBulk = useCallback(
        async (lat, lon, vehicleType, startTime, endTime) => {
            if (!vehicleType || !startTime || !endTime) return;
            setAvailabilityLoading(true);
            try {
                const params = {
                    vehicleType,
                    startTime,
                    endTime,
                    radius: 5.0,
                };
                if (lat !== undefined && lon !== undefined) {
                    params.latitude = lat;
                    params.longitude = lon;
                }
                const res = await apiService.get("agencies/availability-bulk", {
                    params,
                });
                if (res?.success && Array.isArray(res.data)) {
                    const map = {};
                    res.data.forEach((item) => {
                        map[item.agencyId] = item;
                    });
                    setAvailabilityMap(map);
                }
            } catch (err) {
                console.log("Error fetching bulk availability:", err);
            } finally {
                setAvailabilityLoading(false);
            }
        },
        []
    );

    const fetchUserLocation = useCallback(
        async (isLocateButtonPress = false) => {
            try {
                Geolocation.getCurrentPosition(
                    (pos) => {
                        if (pos?.coords) {
                            const lat = Number(pos.coords.latitude);
                            const lon = Number(pos.coords.longitude);
                            if (!isNaN(lat) && !isNaN(lon)) {
                                const newCoords = [lon, lat];
                                setLocationState((prev) => ({
                                    ...prev,
                                    coords: newCoords,
                                }));
                                hasCenteredOnUser.current = true;
                                cameraRef.current?.setCamera({
                                    centerCoordinate: newCoords,
                                    zoomLevel: 14,
                                    animationDuration: 1000,
                                });
                                fetchNearbyAgencies(lat, lon);
                                if (isLocateButtonPress) {
                                    toast.success(
                                        "Location updated successfully.",
                                        "Location Found",
                                        true
                                    );
                                }
                                return;
                            }
                        }
                        if (isLocateButtonPress) {
                            toast.error(
                                "Could not determine location. Please ensure GPS/Location is enabled in device settings.",
                                "Location Unavailable",
                                true
                            );
                        }
                    },
                    (err) => {
                        console.log("Geolocation error:", err.code, err.message);
                        if (isLocateButtonPress) {
                            let errorMsg = "Failed to get position. Please turn on GPS/Location in settings.";
                            if (err.code === 1) {
                                errorMsg = "Location permission denied. Please enable it in device settings.";
                            } else if (err.code === 2) {
                                errorMsg = "Location services are turned off. Please enable GPS in device settings.";
                            } else if (err.code === 3) {
                                errorMsg = "Location request timed out. Please try again.";
                            }
                            toast.error(errorMsg, "Location Disabled", true);
                        }
                    },
                    {
                        enableHighAccuracy: true,
                        timeout: 15000,
                        maximumAge: 0,
                        forceRequestLocation: true,
                        forceLocationManager: false,
                        showLocationDialog: true,
                    }
                );
            } catch (err) {
                console.error("fetchUserLocation error:", err);
                if (isLocateButtonPress) {
                    toast.error(
                        "Failed to get position. Please turn on GPS/Location in settings.",
                        "Location Error",
                        true
                    );
                }
            }
        },
        [fetchNearbyAgencies, toast]
    );

    // Effects

    useEffect(() => {
        if (hasInitializedRef.current) return;
        hasInitializedRef.current = true;

        const initLocation = async () => {
            const granted = await requestLocationPermission();
            setLocationState((prev) => ({ ...prev, hasPermission: granted }));
            if (granted) {
                fetchUserLocation(false);
            } else {
                fetchNearbyAgencies();
            }
        };
        initLocation();
    }, [fetchNearbyAgencies, fetchUserLocation, requestLocationPermission]);

    // Handlers
    const handleLocateMe = useCallback(async () => {
        try {
            const granted = await requestLocationPermission();
            setLocationState((prev) => ({ ...prev, hasPermission: granted }));

            if (!granted) {
                toast.error(
                    "Location permission denied. Please enable permission in App Info.",
                    "Permission Error",
                    true
                );
                return;
            }

            toast.info("Detecting your location...", "Locating", true);
            fetchUserLocation(true);
        } catch (err) {
            console.error("handleLocateMe error:", err);
            toast.error(
                "Please turn on GPS/Location in your device settings.",
                "Location Off",
                true
            );
        }
    }, [requestLocationPermission, fetchUserLocation, toast]);

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
            cameraRef.current?.setCamera({
                centerCoordinate: coords,
                zoomLevel: 15,
                animationDuration: 1000,
            });
            setSearchState((prev) => ({
                ...prev,
                suggestions: [],
                query: feature.properties.name || feature.properties.city || "",
            }));
            setRoutingState({ origin: coords, destination: null, route: null });
            setParkingState(INITIAL_PARKING_STATE);
            fetchNearbyAgencies(coords[1], coords[0]);
            // If intent is active, also fetch availability for this new location
            const intent = preBookingIntentRef.current;
            if (intent.isSet && intent.startTime && intent.endTime) {
                fetchAvailabilityBulk(
                    coords[1],
                    coords[0],
                    intent.vehicleType,
                    intent.startTime,
                    intent.endTime
                );
            }
            Keyboard.dismiss();
        },
        [fetchNearbyAgencies, fetchAvailabilityBulk]
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
                const vehicleSummaries = getVehicleTypesSummary(freshLocation);
                const isCurrentTypeAvailable = vehicleSummaries.some(
                    (s) => s.type === bookingState.vehicleType
                );
                let selectedType = bookingState.vehicleType;

                if (!isCurrentTypeAvailable && vehicleSummaries.length > 0) {
                    selectedType = vehicleSummaries[0].type;
                    setBooking({ vehicleType: selectedType });
                }

                setParkingState({
                    isDrawerVisible: true,
                    selectedLocation: {
                        ...freshLocation,
                        coordinate: coords,
                        price:
                            freshLocation[`${selectedType}_rate`] ||
                            VEHICLE_TYPE_RATES[selectedType] ||
                            40,
                        rating: freshLocation.averageRating ?? freshLocation.rating ?? 0,
                        ratingCount: freshLocation.ratingCount ?? 0,
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
            getVehicleTypesSummary,
            setBooking,
        ]
    );

    const openBookingModal = useCallback(() => {
        const agency = parkingState.selectedLocation;
        const summaries = getVehicleTypesSummary(agency);
        const supportedTypes = summaries.map((s) => s.type);

        const currentType = bookingState.vehicleType;
        const effectiveType =
            currentType && supportedTypes.includes(currentType)
                ? currentType
                : supportedTypes[0] || currentType || "car";

        const intent = preBookingIntentRef.current;
        let fromDateVal, fromTimeVal, toDateVal, toTimeVal;

        if (intent.isSet && intent.startTime && intent.endTime) {
            // Pre-fill from pre-booking intent
            const startD = new Date(intent.startTime);
            const endD = new Date(intent.endTime);
            fromDateVal = formatDate(startD);
            fromTimeVal = formatTime(startD);
            toDateVal = formatDate(endD);
            toTimeVal = formatTime(endD);
        } else {
            // Default: now + 2 hours
            const now = new Date();
            const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000);
            fromDateVal = formatDate(now);
            fromTimeVal = formatTime(now);
            toDateVal = formatDate(twoHoursLater);
            toTimeVal = formatTime(twoHoursLater);
        }

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
                              if (typeof v === "string") return true;
                              return v.status === "approved";
                          });
                      }
                      return [];
                  } catch (e) {
                      return [];
                  }
              })()
            : [];

        const defaultVehicle =
            savedVehicles.length > 0
                ? typeof savedVehicles[0] === "string"
                    ? savedVehicles[0]
                    : savedVehicles[0].number || ""
                : "";

        setBooking({
            visible: true,
            vehicleNum: defaultVehicle,
            vehicleType: effectiveType,
            fromDate: fromDateVal,
            fromTime: fromTimeVal,
            toDate: toDateVal,
            toTime: toTimeVal,
        });
    }, [
        parkingState.selectedLocation,
        bookingState.vehicleType,
        currentUser,
        getVehicleTypesSummary,
        setBooking,
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

                {Boolean(locationState.coords && locationState.coords.length === 2) && (
                    <MarkerView
                        id="user-current-location-marker"
                        coordinate={locationState.coords}
                    >
                        <View className="items-center justify-center w-8 h-8">
                            <View className="w-6 h-6 rounded-full bg-carrot-500/30 items-center justify-center border border-carrot-400">
                                <View className="w-3.5 h-3.5 rounded-full bg-carrot-600 border-2 border-white" />
                            </View>
                        </View>
                    </MarkerView>
                )}

                {Boolean(routingState.route && routeCoordCount > 0) && (
                    <ShapeSource
                        id={`route-source-${routeCoordCount}`}
                        key={`route-${routeCoordCount}`}
                        shape={routingState.route}
                    >
                        <LineLayer
                            id={`route-layer-${routeCoordCount}`}
                            style={{
                                lineColor: "#ff9933",
                                lineWidth: 6,
                                lineCap: "round",
                                lineJoin: "round",
                            }}
                        />
                    </ShapeSource>
                )}

                {Boolean(routingState.origin) && (
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

                {approvedAgencies
                    .filter(
                        (loc) =>
                            loc &&
                            loc.longitude !== undefined &&
                            loc.latitude !== undefined &&
                            !isNaN(Number(loc.longitude)) &&
                            !isNaN(Number(loc.latitude))
                    )
                    .map((loc) => {
                        // Determine availability state when intent is active
                        const avail = availabilityMap[loc.id];
                        const isUnavailable =
                            preBookingIntent.isSet &&
                            avail !== undefined &&
                            !avail.isAvailable;

                        return (
                            <PointAnnotation
                                key={`agency-${loc.id}-${isUnavailable ? "u" : "a"}`}
                                id={`agency-${loc.id}`}
                                coordinate={[
                                    Number(loc.longitude),
                                    Number(loc.latitude),
                                ]}
                                onSelected={() => {
                                    if (isUnavailable) {
                                        // Open UnavailableBottomSheet
                                        setUnavailableSheet({
                                            visible: true,
                                            data: avail,
                                            agency: loc,
                                        });
                                    } else {
                                        handleNearbyPress(loc);
                                    }
                                }}
                            >
                                <View className="items-center justify-center w-11 h-11">
                                    <Surface
                                        elevation={isUnavailable ? 2 : 4}
                                        style={{
                                            width: 40,
                                            height: 40,
                                            borderRadius: 20,
                                            alignItems: "center",
                                            justifyContent: "center",
                                            borderWidth: 2,
                                            backgroundColor: isUnavailable
                                                ? "#e5e7eb"
                                                : "#ffffff",
                                            borderColor: isUnavailable
                                                ? "#9ca3af"
                                                : parkingState.selectedLocation?.id === loc.id
                                                ? "#ff9933"
                                                : "#ff9933",
                                            opacity: isUnavailable ? 0.7 : 1,
                                        }}
                                    >
                                        <MaterialDesignIcons
                                            name="car"
                                            size={24}
                                            color={isUnavailable ? "#9ca3af" : "#ff9933"}
                                        />
                                    </Surface>
                                </View>
                            </PointAnnotation>
                        );
                    })}
            </MapView>


            <ParkingDetailDrawer
                visible={parkingState.isDrawerVisible}
                location={
                    parkingState.selectedLocation
                        ? {
                              ...parkingState.selectedLocation,
                              availableSpots: (() => {
                                  const summary = getVehicleTypesSummary(
                                      parkingState.selectedLocation
                                  );
                                  const sel = summary.find(
                                      (s) => s.type === bookingState.vehicleType
                                  );
                                  return sel
                                      ? sel.availableSpots
                                      : parkingState.selectedLocation.availableSpots ?? 0;
                              })(),
                              vehicleTypeLabel:
                                  VEHICLE_TYPE_LABELS[bookingState.vehicleType] ||
                                  "Car",
                          }
                        : null
                }
                vehicleTypesSummary={getVehicleTypesSummary(
                    parkingState.selectedLocation
                )}
                currentVehicleType={bookingState.vehicleType}
                onSelectVehicleType={(type) => setBooking({ vehicleType: type })}
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
                        iconColor="#ff9933"
                        size={24}
                        onPress={handleLocateMe}
                    />
                </Surface>
            </View>

            {/* Floating Search Bar + Pre-booking filter chip */}
            <View className="absolute top-5 left-4 right-4 z-10">
                {/* Active filter chip row */}
                {preBookingIntent.isSet && (
                    <View
                        style={{
                            flexDirection: "row",
                            alignItems: "center",
                            marginBottom: 6,
                        }}
                    >
                        <View
                            style={{
                                flexDirection: "row",
                                alignItems: "center",
                                backgroundColor: "#ff9933",
                                borderRadius: 20,
                                paddingHorizontal: 12,
                                paddingVertical: 6,
                                gap: 6,
                                flex: 1,
                                flexShrink: 1,
                            }}
                        >
                            <MaterialDesignIcons
                                name="filter-check"
                                size={14}
                                color="#fff"
                            />
                            {availabilityLoading && (
                                <ActivityIndicator
                                    size={12}
                                    color="#fff"
                                    style={{ marginRight: 2 }}
                                />
                            )}
                            <Text
                                style={{
                                    color: "#fff",
                                    fontSize: 12,
                                    fontWeight: "600",
                                    flex: 1,
                                }}
                                numberOfLines={1}
                            >
                                {VEHICLE_TYPE_LABELS[preBookingIntent.vehicleType] || preBookingIntent.vehicleType}
                                {" · "}
                                {preBookingIntent.startTime
                                    ? new Date(preBookingIntent.startTime).toLocaleTimeString([], {
                                          hour: "2-digit",
                                          minute: "2-digit",
                                      })
                                    : ""}
                                {" → "}
                                {preBookingIntent.endTime
                                    ? new Date(preBookingIntent.endTime).toLocaleTimeString([], {
                                          hour: "2-digit",
                                          minute: "2-digit",
                                      })
                                    : ""}
                            </Text>
                        </View>
                        {/* Clear filter */}
                        <TouchableOpacity
                            onPress={() => {
                                setPreBookingIntent(INITIAL_PRE_BOOKING_INTENT);
                                setAvailabilityMap({});
                            }}
                            style={{
                                marginLeft: 6,
                                backgroundColor: "#fff",
                                borderRadius: 16,
                                width: 32,
                                height: 32,
                                alignItems: "center",
                                justifyContent: "center",
                                elevation: 3,
                                shadowColor: "#000",
                                shadowOpacity: 0.1,
                                shadowRadius: 4,
                            }}
                        >
                            <MaterialDesignIcons
                                name="close"
                                size={16}
                                color="#6b7280"
                            />
                        </TouchableOpacity>
                    </View>
                )}

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
            <BookingModal
                visible={bookingState.visible}
                onClose={() => setBooking({ visible: false })}
                agency={parkingState.selectedLocation}
                bookingState={bookingState}
                setBooking={setBooking}
                currentUser={currentUser}
                bookings={bookings}
            />

            {/* Pre-Booking Intent Dialog (opens when map view becomes active) */}
            <PreBookingIntentDialog
                visible={preBookingIntent.dialogVisible}
                initialVehicleType={preBookingIntent.vehicleType}
                onConfirm={(vehicleType, startTime, endTime) => {
                    const coords = locationState.coords;
                    setPreBookingIntent({
                        dialogVisible: false,
                        vehicleType,
                        startTime,
                        endTime,
                        isSet: true,
                    });
                    // Immediately fetch availability for current location
                    fetchAvailabilityBulk(
                        coords ? coords[1] : undefined,
                        coords ? coords[0] : undefined,
                        vehicleType,
                        startTime,
                        endTime
                    );
                    // Also update the vehicle type in booking state
                    setBooking({ vehicleType });
                }}
                onDismiss={() =>
                    setPreBookingIntent((prev) => ({
                        ...prev,
                        dialogVisible: false,
                    }))
                }
            />

            {/* Unavailable Parking Bottom Sheet */}
            <UnavailableBottomSheet
                visible={unavailableSheet.visible}
                agency={unavailableSheet.agency}
                data={unavailableSheet.data}
                vehicleType={preBookingIntent.vehicleType}
                onClose={() =>
                    setUnavailableSheet({ visible: false, data: null, agency: null })
                }
                onBookWithShortenedTime={(agency, reducedEndTime) => {
                    // Update intent end time to the reduced time
                    setPreBookingIntent((prev) => ({
                        ...prev,
                        endTime: reducedEndTime,
                    }));
                    setUnavailableSheet({ visible: false, data: null, agency: null });
                    // Open the parking drawer then booking modal
                    handleNearbyPress(agency).then(() => {
                        setTimeout(() => openBookingModal(), 400);
                    }).catch(() => {
                        // handleNearbyPress may not return a promise — fallback
                        setTimeout(() => openBookingModal(), 700);
                    });
                }}
                onViewNextSlot={(agency, nextWindow) => {
                    // Pre-fill intent with the next available window
                    if (nextWindow?.startTime && nextWindow?.endTime) {
                        setPreBookingIntent((prev) => ({
                            ...prev,
                            startTime: nextWindow.startTime,
                            endTime: nextWindow.endTime,
                        }));
                    }
                    setUnavailableSheet({ visible: false, data: null, agency: null });
                    handleNearbyPress(agency);
                }}
            />
        </View>
    );
};

export default HomeMap;
