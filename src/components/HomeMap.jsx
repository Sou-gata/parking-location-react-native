import React, { useState, useEffect, useRef, useCallback } from "react";
import {
    View,
    FlatList,
    Keyboard,
    Image,
    Platform,
    PermissionsAndroid,
    BackHandler,
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
    const hasInitializedRef = useRef(false);

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

                    const activeCount = (bookings || []).filter((b) => {
                        const bAgencyId = String(
                            b.agencyId || b.agency_id || b.org_id || ""
                        );
                        const bVehicleType = b.vehicleType || b.vehicle_type;
                        return (
                            bAgencyId === targetAgencyId &&
                            bVehicleType === key &&
                            (b.status === "booked" || b.status === "checked_in")
                        );
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
                }
            } catch (err) {
                console.log("Error fetching nearby agencies:", err);
            }
        },
        [dispatch]
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

        const now = new Date();
        const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000);

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
            fromDate: formatDate(now),
            fromTime: formatTime(now),
            toDate: formatDate(twoHoursLater),
            toTime: formatTime(twoHoursLater),
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
                            <View className="w-6 h-6 rounded-full bg-indigo-500/30 items-center justify-center border border-indigo-400">
                                <View className="w-3.5 h-3.5 rounded-full bg-indigo-600 border-2 border-white" />
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
                                lineColor: "#4338ca",
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
                    .map((loc) => (
                        <PointAnnotation
                            key={`agency-${loc.id}`}
                            id={`agency-${loc.id}`}
                            coordinate={[
                                Number(loc.longitude),
                                Number(loc.latitude),
                            ]}
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
            <BookingModal
                visible={bookingState.visible}
                onClose={() => setBooking({ visible: false })}
                agency={parkingState.selectedLocation}
                bookingState={bookingState}
                setBooking={setBooking}
                currentUser={currentUser}
                bookings={bookings}
            />
        </View>
    );
};

export default HomeMap;
