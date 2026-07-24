import React, { useEffect } from "react";
import { View, TouchableOpacity, Image } from "react-native";
import { Text, Surface, Button, Divider } from "react-native-paper";
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
} from "react-native-reanimated";
import { MaterialDesignIcons } from "@react-native-vector-icons/material-design-icons";

const ParkingDetailDrawer = ({
    visible,
    location,
    onClose,
    onStartNavigation,
}) => {
    const translateY = useSharedValue(500);

    useEffect(() => {
        if (visible) {
            translateY.value = withTiming(0, { duration: 400 });
        } else {
            translateY.value = withTiming(500, { duration: 300 });
        }
    }, [visible]);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: translateY.value }],
    }));

    if (!location && !visible) return null;

    return (
        <Animated.View
            className="absolute bottom-0 left-0 right-0 z-50"
            style={[animatedStyle]}
        >
            <Surface elevation={5} className="bg-white rounded-t-3xl p-6 pb-12">
                {/* Handle Bar */}
                <View className="items-center mb-4">
                    <View className="w-12 h-1.5 bg-gray-200 rounded-full" />
                </View>

                {/* Header */}
                <View className="flex-row justify-between items-start mb-4">
                    <View className="flex-1 mr-4">
                        <Text
                            className="text-2xl font-bold text-gray-800"
                            variant="headlineSmall"
                        >
                            {location?.name || "Premium Parking"}
                        </Text>
                        <View className="flex-row items-center mt-1">
                            <MaterialDesignIcons
                                name="star"
                                size={18}
                                color="#fbbf24"
                            />
                            <Text className="text-gray-600 ml-1 font-medium">
                                {location?.rating || "4.5"} (120+ reviews)
                            </Text>
                        </View>
                    </View>
                    <TouchableOpacity
                        onPress={onClose}
                        className="bg-gray-100 p-2 rounded-full"
                    >
                        <MaterialDesignIcons
                            name="close"
                            size={24}
                            color="#4b5563"
                        />
                    </TouchableOpacity>
                </View>

                <Divider className="mb-4" />

                {/* Details Grid */}
                <View className="flex-row justify-between mb-6">
                    <View className="items-center flex-1 border-r border-gray-100">
                        <MaterialDesignIcons
                            name="car-multiple"
                            size={28}
                            color="#4338ca"
                        />
                        <Text className="mt-1 font-bold text-gray-800">
                            {location?.availableSpots || "12"}
                        </Text>
                        <Text className="text-gray-500 text-xs">Available</Text>
                    </View>
                    <View className="items-center flex-1">
                        <MaterialDesignIcons
                            name="map-marker-distance"
                            size={28}
                            color="#4338ca"
                        />
                        <Text className="mt-1 font-bold text-gray-800">
                            {location?.distance || "0.8"} km
                        </Text>
                        <Text className="text-gray-500 text-xs">Distance</Text>
                    </View>
                </View>

                {/* Action Button */}
                <Button
                    mode="contained"
                    onPress={onStartNavigation}
                    className="rounded-xl py-2 bg-primary"
                    contentStyle={{ height: 52 }}
                    labelStyle={{ fontSize: 16, fontWeight: "bold" }}
                >
                    Book Now
                </Button>
            </Surface>
        </Animated.View>
    );
};

export default ParkingDetailDrawer;
