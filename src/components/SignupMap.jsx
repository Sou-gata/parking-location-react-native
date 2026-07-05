import React, { useState } from "react";
import { Image, View } from "react-native";
import { MapView, Camera, MarkerView } from "@maplibre/maplibre-react-native";
import { Text } from "react-native-paper";

const STYLE_URL = "https://api.maptiler.com/maps/base-v4/style.json?key=SHvSqRiAB4DI5Xuokw5W";
const INITIAL_CENTER = [88.3698, 22.568];

const SignupMap = ({ onLocationSelect }) => {
    const [markerCoords, setMarkerCoords] = useState(null);
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
                <MapView style={{ flex: 1 }} mapStyle={STYLE_URL} onPress={handleMapPress}>
                    <Camera defaultSettings={{ zoomLevel: 12, centerCoordinate: INITIAL_CENTER }} />
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
            </View>
            {markerCoords && (
                <Text className="text-md mt-2" style={{ textAlign: "center", width: "100%" }}>
                    Lat: {markerCoords && markerCoords[0].toFixed(4)}, Long:{" "}
                    {markerCoords && markerCoords[1].toFixed(4)}
                </Text>
            )}
        </View>
    );
};

export default SignupMap;
