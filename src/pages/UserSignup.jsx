import { useEffect, useState } from "react";
import {
    Text,
    Avatar,
    TextInput,
    Button,
    Card,
    Surface,
} from "react-native-paper";
import {
    BackHandler,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View,
} from "react-native";
import { launchImageLibrary } from "react-native-image-picker";
import { setConnected } from "@maplibre/maplibre-react-native";
import { MaterialDesignIcons } from "@react-native-vector-icons/material-design-icons";
import { useDispatch } from "react-redux";
import { registerNormalUser } from "../store/slices/parkingSlice";

import SignupMap from "../components/SignupMap";
import apiService from "../utils/apiService";
import useToast from "../hooks/useToast";
import { fileToBase64 } from "../utils/helperFunctions";

setConnected(true);

const UserSignup = ({ navigation }) => {
    const toast = useToast();
    const dispatch = useDispatch();
    useEffect(() => {
        const backAction = () => {
            navigation.goBack();
            return true;
        };
        const backHandler = BackHandler.addEventListener(
            "hardwareBackPress",
            backAction
        );
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
        latitude: null,
        longitude: null,
        loading: false,
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

    const handleSignup = async () => {
        if (
            !inputs.name ||
            !inputs.username ||
            !inputs.email ||
            !inputs.phoneNumber ||
            !inputs.password
        ) {
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

            if (inputs.photo && inputs.photo.uri) {
                photoBase64 = await fileToBase64(inputs.photo.uri);
            }

            const registrationData = {
                name: inputs.name,
                full_name: inputs.name,
                username: inputs.username,
                email: inputs.email,
                phone_number: inputs.phoneNumber,
                password: inputs.password,
                address: inputs.address || "",
                user_address: inputs.address || "",
                landmark: inputs.landmark || "",
                latitude: Number(inputs.latitude || 0),
                longitude: Number(inputs.longitude || 0),
                profile_photo: photoBase64,
            };

            await apiService.post("users/userregister", registrationData);

            dispatch(registerNormalUser(registrationData));

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
                            <Avatar.Image
                                source={{ uri: inputs.photo.uri }}
                                size={96}
                            />
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
                        <MaterialDesignIcons
                            name="camera"
                            size={24}
                            color="white"
                        />
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
                <View className="px-5 gap-6 mb-10">
                    {/* Personal Information Section */}
                    <Card style={styles.card}>
                        <Card.Content className="gap-4">
                            <Text
                                style={{ fontWeight: "bold" }}
                                className="text-lg text-gray-800"
                            >
                                Personal Information
                            </Text>
                            <TextInput
                                label={
                                    <Text>
                                        Full Name{" "}
                                        <Text style={{ color: "#ef4444" }}>
                                            *
                                        </Text>
                                    </Text>
                                }
                                value={inputs.name}
                                onChangeText={(text) =>
                                    setInputs({ ...inputs, name: text })
                                }
                                mode="outlined"
                                outlineColor="#e2e8f0"
                                activeOutlineColor="#4338ca"
                                left={<TextInput.Icon icon="account" />}
                            />
                            <TextInput
                                label={
                                    <Text>
                                        Email Address{" "}
                                        <Text style={{ color: "#ef4444" }}>
                                            *
                                        </Text>
                                    </Text>
                                }
                                value={inputs.email}
                                onChangeText={(text) =>
                                    setInputs({ ...inputs, email: text })
                                }
                                mode="outlined"
                                outlineColor="#e2e8f0"
                                activeOutlineColor="#4338ca"
                                keyboardType="email-address"
                                left={<TextInput.Icon icon="email" />}
                            />
                            <TextInput
                                label={
                                    <Text>
                                        Phone Number{" "}
                                        <Text style={{ color: "#ef4444" }}>
                                            *
                                        </Text>
                                    </Text>
                                }
                                value={inputs.phoneNumber}
                                onChangeText={(text) =>
                                    setInputs({ ...inputs, phoneNumber: text })
                                }
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
                            <Text
                                style={{ fontWeight: "bold" }}
                                className="text-lg text-gray-800"
                            >
                                Account Security
                            </Text>
                            <TextInput
                                label={
                                    <Text>
                                        Username{" "}
                                        <Text style={{ color: "#ef4444" }}>
                                            *
                                        </Text>
                                    </Text>
                                }
                                value={inputs.username}
                                onChangeText={(text) =>
                                    setInputs({ ...inputs, username: text })
                                }
                                mode="outlined"
                                outlineColor="#e2e8f0"
                                activeOutlineColor="#4338ca"
                                left={<TextInput.Icon icon="account-circle" />}
                            />
                            <TextInput
                                label={
                                    <Text>
                                        Password{" "}
                                        <Text style={{ color: "#ef4444" }}>
                                            *
                                        </Text>
                                    </Text>
                                }
                                value={inputs.password}
                                onChangeText={(text) =>
                                    setInputs({ ...inputs, password: text })
                                }
                                mode="outlined"
                                outlineColor="#e2e8f0"
                                activeOutlineColor="#4338ca"
                                secureTextEntry
                                left={<TextInput.Icon icon="lock" />}
                            />
                            <TextInput
                                label={
                                    <Text>
                                        Confirm Password{" "}
                                        <Text style={{ color: "#ef4444" }}>
                                            *
                                        </Text>
                                    </Text>
                                }
                                value={inputs.confirmPassword}
                                onChangeText={(text) =>
                                    setInputs({
                                        ...inputs,
                                        confirmPassword: text,
                                    })
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
                            <Text
                                style={{ fontWeight: "bold" }}
                                className="text-lg text-gray-800"
                            >
                                Your Location
                            </Text>
                            <TextInput
                                label="Address"
                                value={inputs.address}
                                onChangeText={(text) =>
                                    setInputs({ ...inputs, address: text })
                                }
                                mode="outlined"
                                outlineColor="#e2e8f0"
                                activeOutlineColor="#4338ca"
                                multiline
                                left={<TextInput.Icon icon="map-marker" />}
                            />
                            <TextInput
                                label="Landmark"
                                value={inputs.landmark}
                                onChangeText={(text) =>
                                    setInputs({ ...inputs, landmark: text })
                                }
                                mode="outlined"
                                outlineColor="#e2e8f0"
                                activeOutlineColor="#4338ca"
                                left={<TextInput.Icon icon="map-marker" />}
                            />

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
                        <Text className="text-gray-600">
                            Already have an account?{" "}
                        </Text>
                        <TouchableOpacity
                            onPress={() => navigation.replace("Login")}
                        >
                            <Text className="text-primary font-bold">
                                Log In
                            </Text>
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
});

export default UserSignup;
