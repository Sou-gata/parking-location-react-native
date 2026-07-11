import React, { useState, useEffect, useRef } from "react";
import { Image, View, Platform, PermissionsAndroid } from "react-native";
import {
    MapView,
    Camera,
    MarkerView,
    UserLocation,
    LocationManager,
} from "@maplibre/maplibre-react-native";
import { Text, IconButton, Surface } from "react-native-paper";

const STYLE_URL =
    "https://api.maptiler.com/maps/base-v4/style.json?key=SHvSqRiAB4DI5Xuokw5W";
const INITIAL_CENTER = [88.3698, 22.568];

const SignupMap = ({ onLocationSelect }) => {
    const [markerCoords, setMarkerCoords] = useState(null);
    const [hasLocationPermission, setHasLocationPermission] = useState(false);
    const [userLocation, setUserLocation] = useState(null);
    const cameraRef = useRef(null);
    const hasCenteredOnUser = useRef(false);

    const requestLocationPermission = async () => {
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
    };

    useEffect(() => {
        const initLocation = async () => {
            const granted = await requestLocationPermission();
            setHasLocationPermission(granted);
            if (granted) {
                try {
                    const lastLoc =
                        await LocationManager.getLastKnownLocation();
                    if (lastLoc && lastLoc.coords) {
                        const coords = [
                            lastLoc.coords.longitude,
                            lastLoc.coords.latitude,
                        ];
                        setUserLocation(coords);
                        hasCenteredOnUser.current = true;
                        cameraRef.current?.setCamera({
                            centerCoordinate: coords,
                            zoomLevel: 14,
                            animationDuration: 0,
                        });
                    }
                } catch (e) {
                    console.log(
                        "Error getting initial last known location:",
                        e
                    );
                }
            }
        };
        initLocation();
    }, []);

    const handleLocateMe = async () => {
        const granted = await requestLocationPermission();
        setHasLocationPermission(granted);
        if (granted) {
            if (userLocation) {
                cameraRef.current?.flyTo(userLocation, 1000);
            } else {
                try {
                    const lastLoc =
                        await LocationManager.getLastKnownLocation();
                    if (lastLoc && lastLoc.coords) {
                        const coords = [
                            lastLoc.coords.longitude,
                            lastLoc.coords.latitude,
                        ];
                        setUserLocation(coords);
                        cameraRef.current?.flyTo(coords, 1000);
                    }
                } catch (e) {
                    console.log("Could not get location:", e);
                }
            }
        }
    };

    const handleMapPress = (event) => {
        const { coordinates } = event.geometry;
        setMarkerCoords(coordinates);
        if (onLocationSelect) {
            onLocationSelect(coordinates);
        }
    };

    return (
        <View>
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
                            zoomLevel: 12,
                            centerCoordinate: INITIAL_CENTER,
                        }}
                    />
                    {hasLocationPermission && (
                        <UserLocation
                            renderMode="native"
                            visible={true}
                            showsUserHeadingIndicator={true}
                            onUpdate={(location) => {
                                if (location && location.coords) {
                                    const coords = [
                                        location.coords.longitude,
                                        location.coords.latitude,
                                    ];
                                    setUserLocation(coords);
                                    if (!hasCenteredOnUser.current) {
                                        hasCenteredOnUser.current = true;
                                        cameraRef.current?.flyTo(coords, 1000);
                                    }
                                }
                            }}
                        />
                    )}
                    {markerCoords && (
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
                            icon="crosshairs-gps"
                            iconColor="#4338ca"
                            size={20}
                            onPress={handleLocateMe}
                        />
                    </Surface>
                </View>
            </View>
            {markerCoords && (
                <Text
                    className="text-md mt-2"
                    style={{ textAlign: "center", width: "100%" }}
                >
                    Lat: {markerCoords && markerCoords[0].toFixed(4)}, Long:{" "}
                    {markerCoords && markerCoords[1].toFixed(4)}
                </Text>
            )}
        </View>
    );
};

export default SignupMap;
