import React, { useState, useEffect, useRef, useCallback } from "react";
import { Image, View, Platform, PermissionsAndroid } from "react-native";
import {
    MapView,
    Camera,
    MarkerView,
} from "@maplibre/maplibre-react-native";
import { Text, IconButton, Surface } from "react-native-paper";
import Geolocation from "react-native-geolocation-service";
import useToast from "../hooks/useToast";

const STYLE_URL =
    "https://api.maptiler.com/maps/base-v4/style.json?key=SHvSqRiAB4DI5Xuokw5W";
const INITIAL_CENTER = [88.3698, 22.568];

const SignupMap = ({ onLocationSelect, initialLocation }) => {
    const toast = useToast();
    const [markerCoords, setMarkerCoords] = useState(
        initialLocation &&
            Array.isArray(initialLocation) &&
            initialLocation.length === 2 &&
            !isNaN(Number(initialLocation[0])) &&
            !isNaN(Number(initialLocation[1])) &&
            (Number(initialLocation[0]) !== 0 || Number(initialLocation[1]) !== 0)
            ? [Number(initialLocation[0]), Number(initialLocation[1])]
            : null
    );
    const [userLocation, setUserLocation] = useState(null);
    const [loadingLocation, setLoadingLocation] = useState(false);
    const cameraRef = useRef(null);

    useEffect(() => {
        if (
            initialLocation &&
            Array.isArray(initialLocation) &&
            initialLocation.length === 2
        ) {
            const lon = Number(initialLocation[0]);
            const lat = Number(initialLocation[1]);
            if (!isNaN(lon) && !isNaN(lat) && (lon !== 0 || lat !== 0)) {
                const validCoords = [lon, lat];
                setMarkerCoords(validCoords);
                cameraRef.current?.setCamera({
                    centerCoordinate: validCoords,
                    zoomLevel: 14,
                    animationDuration: 800,
                });
            }
        }
    }, [initialLocation?.[0], initialLocation?.[1]]);

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

    const fetchUserLocation = useCallback(async () => {
        setLoadingLocation(true);
        try {
            Geolocation.getCurrentPosition(
                (pos) => {
                    setLoadingLocation(false);
                    if (pos?.coords) {
                        const lat = Number(pos.coords.latitude);
                        const lon = Number(pos.coords.longitude);
                        if (
                            !isNaN(lat) &&
                            !isNaN(lon) &&
                            (lat !== 0 || lon !== 0)
                        ) {
                            const newCoords = [lon, lat];
                            setUserLocation(newCoords);
                            setMarkerCoords(newCoords);
                            if (onLocationSelect) {
                                onLocationSelect(newCoords);
                            }
                            cameraRef.current?.setCamera({
                                centerCoordinate: newCoords,
                                zoomLevel: 14,
                                animationDuration: 1000,
                            });
                            toast.success(
                                "Location updated to your current position.",
                                "Location Found",
                                true
                            );
                            return;
                        }
                    }
                    toast.error(
                        "Could not determine location automatically. You can tap anywhere on the map to set your location pin.",
                        "Location Unavailable",
                        true
                    );
                },
                (err) => {
                    setLoadingLocation(false);
                    console.log("SignupMap geolocation error:", err.code, err.message);
                    let errorMsg = "You can tap anywhere on the map to set your location pin.";
                    if (err.code === 1) {
                        errorMsg = "Location permission denied. Please enable it in device settings.";
                    } else if (err.code === 2) {
                        errorMsg = "Location services are turned off. Please enable GPS in device settings.";
                    } else if (err.code === 3) {
                        errorMsg = "Location request timed out. Please try again.";
                    }
                    toast.error(errorMsg, "Location Unavailable", true);
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
            setLoadingLocation(false);
            console.error("SignupMap fetchUserLocation error:", err);
        }
    }, [onLocationSelect, toast]);

    const handleLocateMe = async () => {
        const granted = await requestLocationPermission();
        if (!granted) {
            toast.error(
                "Location permission denied. Please enable permission in device settings.",
                "Permission Error",
                true
            );
            return;
        }
        toast.info("Detecting your current location...", "Locating", true);
        await fetchUserLocation();
    };

    const handleMapPress = (event) => {
        const { coordinates } = event.geometry;
        setMarkerCoords(coordinates);
        if (onLocationSelect) {
            onLocationSelect(coordinates);
        }
    };

    return (
        <View className="gap-2">
            <View
                className="h-64 border border-gray-300 rounded-lg overflow-hidden"
                style={{ flex: 1 }}
            >
                <MapView
                    style={{ flex: 1 }}
                    mapStyle={STYLE_URL}
                    onPress={handleMapPress}
                >
                    <Camera
                        ref={cameraRef}
                        defaultSettings={{
                            zoomLevel: markerCoords ? 14 : 12,
                            centerCoordinate: markerCoords || INITIAL_CENTER,
                        }}
                    />

                    {Boolean(userLocation && userLocation.length === 2) && (
                        <MarkerView
                            id="user-location-signup-marker"
                            coordinate={userLocation}
                        >
                            <View className="items-center justify-center w-8 h-8">
                                <View className="w-6 h-6 rounded-full bg-indigo-500/30 items-center justify-center border border-indigo-400">
                                    <View className="w-3.5 h-3.5 rounded-full bg-indigo-600 border-2 border-white" />
                                </View>
                            </View>
                        </MarkerView>
                    )}

                    {Boolean(markerCoords) && (
                        <MarkerView
                            id="selectedLocation"
                            coordinate={markerCoords}
                            key={markerCoords.join(",")}
                        >
                            <View
                                style={{
                                    width: 30,
                                    height: 30,
                                    alignItems: "center",
                                    justifyContent: "center",
                                }}
                            >
                                <Image
                                    source={require("../assets/ic_location.png")}
                                    style={{ width: 24, height: 24 }}
                                    resizeMode="contain"
                                />
                            </View>
                        </MarkerView>
                    )}
                </MapView>

                {/* Locate Me Floating Button */}
                <View className="absolute bottom-4 right-4 z-10">
                    <Surface
                        elevation={4}
                        className="bg-white rounded-full p-0.5 border border-slate-100"
                    >
                        <IconButton
                            icon={loadingLocation ? "loading" : "crosshairs-gps"}
                            iconColor="#4338ca"
                            size={20}
                            onPress={handleLocateMe}
                            disabled={loadingLocation}
                            animated={true}
                        />
                    </Surface>
                </View>
            </View>
            {Boolean(markerCoords) && (
                <Text
                    className="text-md mt-1"
                    style={{ textAlign: "center", width: "100%" }}
                >
                    {`Selected: Lat ${markerCoords[1].toFixed(4)}, Long ${markerCoords[0].toFixed(4)}`}
                </Text>
            )}
        </View>
    );
};

export default SignupMap;
