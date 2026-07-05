import { useEffect, useState } from "react";
import {
    Text,
    Avatar,
    TextInput,
    Button,
    Card,
    Surface,
    List,
    Checkbox,
    Switch,
} from "react-native-paper";
import { BackHandler, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { launchImageLibrary } from "react-native-image-picker";
import { setConnected } from "@maplibre/maplibre-react-native";
import { MaterialDesignIcons } from "@react-native-vector-icons/material-design-icons";
import { pick, isCancel } from "@react-native-documents/picker";
import { useDispatch } from "react-redux";
import { registerAgencyRequest } from "../store/parkingSlice";

import SignupMap from "../components/SignupMap";
import apiService from "../utils/apiService";
import useToast from "../hooks/useToast";
import { fileToBase64 } from "../utils/helperFunctions";

const VEHICLE_TYPES = [
    { id: "twoWheeler", label: "Two-Wheeler (Bike/Scooter)", icon: "motorbike" },
    { id: "threeWheeler", label: "Three-Wheeler (Auto Rickshaw)", icon: "rickshaw" },
    { id: "car", label: "Car (Hatchback/Sedan)", icon: "car" },
    { id: "suv", label: "SUV / MUV", icon: "car-estate" },
    { id: "van", label: "Van", icon: "van-passenger" },
    { id: "pickup", label: "Pickup Truck", icon: "car-pickup" },
    { id: "ev", label: "EV", icon: "ev-station" },
];

setConnected(true);

const Signup = ({ navigation }) => {
    const toast = useToast();
    const dispatch = useDispatch();
    useEffect(() => {
        const backAction = () => {
            navigation.goBack();
            return true;
        };
        const backHandler = BackHandler.addEventListener("hardwareBackPress", backAction);
        return () => backHandler.remove();
    }, [navigation]);

    const [inputs, setInputs] = useState({
        name: "",
        username: "",
        email: "",
        phoneNumber: "",
        password: "",
        confirmPassword: "",
        address: "",
        landmark: "",
        photo: null,
        document: null,
        latitude: null,
        longitude: null,
        loading: false,
        vehicles: VEHICLE_TYPES.reduce((acc, type) => {
            acc[type.id] = {
                selected: false,
                capacity: "",
                ...(type.id === "ev" ? { chargingSupport: false } : {}),
            };
            return acc;
        }, {}),
    });

    const handleSelectImage = async () => {
        const result = await launchImageLibrary({
            mediaType: "photo",
            quality: 0.8,
        });
        if (!result.didCancel && !result.errorCode) {
            setInputs({ ...inputs, photo: result.assets[0] });
        }
    };

    const handleDocumentPick = async () => {
        try {
            const [pickerResult] = await pick({
                type: ["image/*", "application/pdf"],
            });
            setInputs({ ...inputs, document: pickerResult });
        } catch (err) {
            if (isCancel(err)) {
                console.log("User cancelled document picker");
            } else {
                console.error("DocumentPicker Error:", err);
            }
        }
    };

    const handleSignup = async () => {
        if (!inputs.name || !inputs.username || !inputs.email || !inputs.password) {
            toast.error("Please fill in all required fields.", "Error", true);
            return;
        }

        if (inputs.password !== inputs.confirmPassword) {
            toast.error("Passwords do not match.", "Error", true);
            return;
        }

        setInputs((prev) => ({ ...prev, loading: true }));

        try {
            let photoBase64 = null;
            let documentBase64 = null;

            if (inputs.photo && inputs.photo.uri) {
                photoBase64 = await fileToBase64(inputs.photo.uri);
            }

            if (inputs.document && inputs.document.uri) {
                documentBase64 = await fileToBase64(inputs.document.uri);
            }

            const registrationData = {
                org_name: inputs.name,
                username: inputs.username,
                email: inputs.email,
                phone_number: inputs.phoneNumber,
                password: inputs.password,
                org_address: inputs.address || "",
                landmark: inputs.landmark || "",
                latitude: Number(inputs.latitude || 0),
                longitude: Number(inputs.longitude || 0),
                profile_photo: photoBase64,
                verification_document: documentBase64,
            };

            // Add vehicle capacities
            VEHICLE_TYPES.forEach((type) => {
                const v = inputs.vehicles[type.id];
                const snakeId = type.id.replace(/[A-Z]/g, (l) => `_${l.toLowerCase()}`);
                registrationData[`${snakeId}_capacity`] = Number(v.capacity || 0);
                if (type.id === "ev") {
                    registrationData.ev_charging_support = v.chargingSupport ? true : false;
                }
            });

            try {
                await apiService.post("users/orgregister", registrationData);
            } catch (apiError) {
                console.log("API org register failed, falling back to local Redux store");
            }

            dispatch(registerAgencyRequest(registrationData));

            toast.success("Registration Successful!", "Success", true);
            navigation.replace("Login");
        } catch (error) {
            console.error("Signup Action Error:", error.message);
            const errorMessage =
                error.message || "Registration Failed. Check your network.";
            toast.error(errorMessage, "Error", true);
        } finally {
            setInputs((prev) => ({ ...prev, loading: false }));
        }
    };

    return (
        <View className="flex-1 bg-gray-100">
            {/* Header Section */}
            <Surface
                elevation={4}
                style={styles.header}
                className="pt-12 pb-8 px-6 bg-primary rounded-b-3xl"
            >
                <Text
                    className="text-3xl mb-5 font-bold text-white"
                    style={{ color: "white", fontWeight: "bold" }}
                >
                    Create Account
                </Text>
            </Surface>

            <View className="items-center z-10 -mt-12 mb-4">
                <View className="relative">
                    <Surface elevation={5} style={{ borderRadius: 64 }}>
                        {inputs.photo ? (
                            <Avatar.Image source={{ uri: inputs.photo.uri }} size={96} />
                        ) : (
                            <Avatar.Icon
                                icon="account"
                                size={96}
                                style={{ backgroundColor: "#e2e8f0" }}
                                color="#64748b"
                            />
                        )}
                    </Surface>
                    <TouchableOpacity
                        onPress={handleSelectImage}
                        activeOpacity={0.8}
                        className="absolute bottom-0 right-0 bg-primary rounded-full border-4 border-white p-2"
                    >
                        <MaterialDesignIcons name="camera" size={24} color="white" />
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
                <View className="px-5 gap-6 mb-10">
                    {/* Personal Information Section */}
                    <Card style={styles.card}>
                        <Card.Content className="gap-4">
                            <Text style={{ fontWeight: "bold" }} className="text-lg text-gray-800">
                                Personal Information
                            </Text>
                            <TextInput
                                label="Full Name"
                                value={inputs.name}
                                onChangeText={(text) => setInputs({ ...inputs, name: text })}
                                mode="outlined"
                                outlineColor="#e2e8f0"
                                activeOutlineColor="#4338ca"
                                left={<TextInput.Icon icon="account" />}
                            />
                            <TextInput
                                label="Email Address"
                                value={inputs.email}
                                onChangeText={(text) => setInputs({ ...inputs, email: text })}
                                mode="outlined"
                                outlineColor="#e2e8f0"
                                activeOutlineColor="#4338ca"
                                keyboardType="email-address"
                                left={<TextInput.Icon icon="email" />}
                            />
                            <TextInput
                                label="Phone Number"
                                value={inputs.phoneNumber}
                                onChangeText={(text) => setInputs({ ...inputs, phoneNumber: text })}
                                mode="outlined"
                                outlineColor="#e2e8f0"
                                activeOutlineColor="#4338ca"
                                keyboardType="phone-pad"
                                left={<TextInput.Icon icon="phone" />}
                            />
                        </Card.Content>
                    </Card>

                    <Card style={styles.card}>
                        <Card.Content className="gap-4">
                            <Text style={{ fontWeight: "bold" }} className="text-lg text-gray-800">
                                Account Security
                            </Text>
                            <TextInput
                                label="Username"
                                value={inputs.username}
                                onChangeText={(text) => setInputs({ ...inputs, username: text })}
                                mode="outlined"
                                outlineColor="#e2e8f0"
                                activeOutlineColor="#4338ca"
                                left={<TextInput.Icon icon="account-circle" />}
                            />
                            <TextInput
                                label="Password"
                                value={inputs.password}
                                onChangeText={(text) => setInputs({ ...inputs, password: text })}
                                mode="outlined"
                                outlineColor="#e2e8f0"
                                activeOutlineColor="#4338ca"
                                secureTextEntry
                                left={<TextInput.Icon icon="lock" />}
                            />
                            <TextInput
                                label="Confirm Password"
                                value={inputs.confirmPassword}
                                onChangeText={(text) =>
                                    setInputs({ ...inputs, confirmPassword: text })
                                }
                                mode="outlined"
                                outlineColor="#e2e8f0"
                                activeOutlineColor="#4338ca"
                                secureTextEntry
                                left={<TextInput.Icon icon="lock-check" />}
                            />
                        </Card.Content>
                    </Card>

                    {/* Location Section */}
                    <Card style={styles.card}>
                        <Card.Content className="gap-4">
                            <Text style={{ fontWeight: "bold" }} className="text-lg text-gray-800">
                                Your Location
                            </Text>
                            <TextInput
                                label="Organization Address"
                                value={inputs.address}
                                onChangeText={(text) => setInputs({ ...inputs, address: text })}
                                mode="outlined"
                                outlineColor="#e2e8f0"
                                activeOutlineColor="#4338ca"
                                multiline
                                left={<TextInput.Icon icon="map-marker" />}
                            />
                            <TextInput
                                label="Landmark"
                                value={inputs.landmark}
                                onChangeText={(text) => setInputs({ ...inputs, landmark: text })}
                                mode="outlined"
                                outlineColor="#e2e8f0"
                                activeOutlineColor="#4338ca"
                                left={<TextInput.Icon icon="map-marker" />}
                            />
                            {/* <TextInput
                                label="House No"
                                value={inputs.houseNo}
                                onChangeText={(text) => setInputs({ ...inputs, houseNo: text })}
                                mode="outlined"
                                outlineColor="#e2e8f0"
                                activeOutlineColor="#4338ca"
                                left={<TextInput.Icon icon="map-marker" />}
                            />
                            <TextInput
                                label="Street Name"
                                value={inputs.streetName}
                                onChangeText={(text) => setInputs({ ...inputs, streetName: text })}
                                mode="outlined"
                                outlineColor="#e2e8f0"
                                activeOutlineColor="#4338ca"
                                left={<TextInput.Icon icon="map-marker" />}
                            />
                            <TextInput
                                label="City"
                                value={inputs.city}
                                onChangeText={(text) => setInputs({ ...inputs, city: text })}
                                mode="outlined"
                                outlineColor="#e2e8f0"
                                activeOutlineColor="#4338ca"
                                left={<TextInput.Icon icon="map-marker" />}
                            />
                            <TextInput
                                label="Pin Code"
                                value={inputs.pincode}
                                onChangeText={(text) => setInputs({ ...inputs, pincode: text })}
                                mode="outlined"
                                outlineColor="#e2e8f0"
                                activeOutlineColor="#4338ca"
                                left={<TextInput.Icon icon="map-marker" />}
                            /> */}

                            <View className="w-full overflow-hidden">
                                <SignupMap
                                    onLocationSelect={(coords) => {
                                        setInputs({
                                            ...inputs,
                                            longitude: coords[0],
                                            latitude: coords[1],
                                        });
                                    }}
                                />
                            </View>
                        </Card.Content>
                    </Card>
                    {/* Verification Documents Section */}
                    <Card style={styles.card}>
                        <Card.Content className="gap-4">
                            <Text style={{ fontWeight: "bold" }} className="text-lg text-gray-800">
                                Verification Documents
                            </Text>
                            <Text className="text-gray-500 text-xs mt-0">
                                Upload a trade license, ID proof, or other relevant document (Image
                                or PDF)
                            </Text>

                            <TouchableOpacity
                                onPress={handleDocumentPick}
                                activeOpacity={0.7}
                                style={styles.uploadArea}
                                className="items-center justify-center py-8 bg-gray-50/50 rounded-xl"
                            >
                                {inputs.document ? (
                                    <View className="items-center gap-2 px-4">
                                        <MaterialDesignIcons
                                            name={
                                                inputs.document.type === "application/pdf"
                                                    ? "file-pdf-box"
                                                    : "file-image"
                                            }
                                            size={48}
                                            color="#4338ca"
                                        />
                                        <Text
                                            className="text-primary font-bold text-center"
                                            numberOfLines={1}
                                        >
                                            {inputs.document.name}
                                        </Text>
                                        <Text className="text-gray-500 text-xs">
                                            {(inputs.document.size / 1024 / 1024).toFixed(2)} MB •{" "}
                                            {inputs.document.type.split("/")[1].toUpperCase()}
                                        </Text>
                                        <Button
                                            mode="text"
                                            onPress={() => setInputs({ ...inputs, document: null })}
                                            textColor="#ef4444"
                                            className="mt-2"
                                            compact
                                        >
                                            Remove File
                                        </Button>
                                    </View>
                                ) : (
                                    <View className="items-center gap-3">
                                        <View className="p-3 bg-indigo-50 rounded-full">
                                            <MaterialDesignIcons
                                                name="cloud-upload"
                                                size={32}
                                                color="#4338ca"
                                            />
                                        </View>
                                        <View className="items-center">
                                            <Text className="text-gray-700 font-bold">
                                                Tap to upload document
                                            </Text>
                                            <Text className="text-gray-400 text-xs mt-1">
                                                Supports PDF, JPEG, or PNG
                                            </Text>
                                        </View>
                                    </View>
                                )}
                            </TouchableOpacity>
                        </Card.Content>
                    </Card>

                    <Card style={styles.card}>
                        <Card.Content className="p-0">
                            <View className="px-4 pt-4 pb-2">
                                <Text
                                    style={{ fontWeight: "bold" }}
                                    className="text-lg text-gray-800"
                                >
                                    Parking Vehicles
                                </Text>
                                <Text className="text-gray-500 text-xs mt-1">
                                    Select vehicle types and specify capacity
                                </Text>
                            </View>

                            <List.AccordionGroup>
                                {VEHICLE_TYPES.map((vehicle) => (
                                    <List.Accordion
                                        key={vehicle.id}
                                        id={vehicle.id}
                                        title={vehicle.label}
                                        left={(props) => (
                                            <List.Icon
                                                {...props}
                                                icon={vehicle.icon}
                                                color={
                                                    inputs.vehicles[vehicle.id].selected
                                                        ? "#4338ca"
                                                        : "#64748b"
                                                }
                                            />
                                        )}
                                        style={styles.accordion}
                                        titleStyle={{
                                            color: inputs.vehicles[vehicle.id].selected
                                                ? "#4338ca"
                                                : "#1e293b",
                                            fontWeight: inputs.vehicles[vehicle.id].selected
                                                ? "700"
                                                : "400",
                                        }}
                                    >
                                        <View
                                            className="pb-4 pt-2 gap-4 bg-gray-50/50"
                                            style={{ paddingHorizontal: 16, overflow: "visible" }}
                                        >
                                            <Checkbox.Item
                                                label="Enable this category"
                                                status={
                                                    inputs.vehicles[vehicle.id].selected
                                                        ? "checked"
                                                        : "unchecked"
                                                }
                                                onPress={() => {
                                                    const currentV = inputs.vehicles[vehicle.id];
                                                    setInputs({
                                                        ...inputs,
                                                        vehicles: {
                                                            ...inputs.vehicles,
                                                            [vehicle.id]: {
                                                                ...currentV,
                                                                selected: !currentV.selected,
                                                            },
                                                        },
                                                    });
                                                }}
                                                color="#4338ca"
                                                mode="android"
                                            />

                                            {inputs.vehicles[vehicle.id].selected && (
                                                <View
                                                    className="gap-4"
                                                    style={{ padding: 4, overflow: "visible" }}
                                                >
                                                    <TextInput
                                                        label="Total Vehicle Capacity"
                                                        value={inputs.vehicles[vehicle.id].capacity}
                                                        onChangeText={(text) =>
                                                            setInputs({
                                                                ...inputs,
                                                                vehicles: {
                                                                    ...inputs.vehicles,
                                                                    [vehicle.id]: {
                                                                        ...inputs.vehicles[
                                                                            vehicle.id
                                                                        ],
                                                                        capacity: text,
                                                                    },
                                                                },
                                                            })
                                                        }
                                                        mode="outlined"
                                                        keyboardType="numeric"
                                                        outlineColor="#e2e8f0"
                                                        activeOutlineColor="#4338ca"
                                                        style={{
                                                            backgroundColor: "white",
                                                            marginHorizontal: 6,
                                                        }}
                                                        outlineStyle={{
                                                            backgroundColor: "white",
                                                            borderColor: "#e2e8f0",
                                                        }}
                                                    />

                                                    {vehicle.id === "ev" && (
                                                        <View className="flex-row items-center justify-between px-2 bg-indigo-50/50 p-3 rounded-lg border border-indigo-100">
                                                            <View>
                                                                <Text className="font-semibold text-indigo-900">
                                                                    Charging Support
                                                                </Text>
                                                                <Text className="text-xs text-indigo-600">
                                                                    Availability of charging ports
                                                                </Text>
                                                            </View>
                                                            <Switch
                                                                value={
                                                                    inputs.vehicles.ev
                                                                        .chargingSupport
                                                                }
                                                                onValueChange={(val) =>
                                                                    setInputs({
                                                                        ...inputs,
                                                                        vehicles: {
                                                                            ...inputs.vehicles,
                                                                            ev: {
                                                                                ...inputs.vehicles
                                                                                    .ev,
                                                                                chargingSupport:
                                                                                    val,
                                                                            },
                                                                        },
                                                                    })
                                                                }
                                                                color="#4338ca"
                                                            />
                                                        </View>
                                                    )}
                                                </View>
                                            )}
                                        </View>
                                    </List.Accordion>
                                ))}
                            </List.AccordionGroup>
                        </Card.Content>
                    </Card>
                    <Button
                        mode="contained"
                        onPress={handleSignup}
                        loading={inputs.loading}
                        disabled={inputs.loading}
                        style={styles.submitButton}
                        contentStyle={{ paddingVertical: 8 }}
                        labelStyle={{ fontSize: 18, fontWeight: "700" }}
                    >
                        Create Account
                    </Button>

                    <View className="flex-row justify-center items-center mt-2 mb-8">
                        <Text className="text-gray-600">Already have an account? </Text>
                        <TouchableOpacity onPress={() => navigation.replace("Login")}>
                            <Text className="text-primary font-bold">Log In</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    header: {
        backgroundColor: "#4338ca",
    },
    card: {
        backgroundColor: "white",
        borderRadius: 16,
        paddingBottom: 4,
    },
    submitButton: {
        backgroundColor: "#4338ca",
        borderRadius: 12,
        marginTop: 8,
        elevation: 4,
    },
    accordion: {
        backgroundColor: "white",
        borderRadius: 8,
    },
    uploadArea: {
        borderWidth: 2,
        borderColor: "#e2e8f0",
        borderStyle: "dashed",
        borderRadius: 16,
    },
});

export default Signup;
