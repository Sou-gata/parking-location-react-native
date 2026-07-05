import React, { useState } from "react";
import {
    View,
    TouchableOpacity,
    ScrollView,
    StyleSheet,
    Modal,
    Pressable,
} from "react-native";
import {
    Text,
    TextInput,
    Button,
    Card,
    Surface,
    RadioButton,
} from "react-native-paper";
import { useDispatch } from "react-redux";
import { loginSuccess } from "../store/userSlice";
import useToast from "../hooks/useToast";
import apiService from "../utils/apiService";
import tokenStorage from "../utils/tokenStorage";

export default function Login({ navigation }) {
    const dispatch = useDispatch();
    const toast = useToast();
    const [inputs, setInputs] = useState({
        username: "",
        password: "",
    });

    const [visible, setVisible] = useState(false);
    const [selectedOption, setSelectedOption] = useState("user");
    const [loading, setLoading] = useState(false);

    const handleLogin = async () => {
        if (!inputs.username || !inputs.password) {
            toast.error(
                "Please enter both username and password",
                "Required",
                true
            );
            return;
        }

        setLoading(true);
        try {
            const usernameClean = inputs.username.trim();
            const passwordClean = inputs.password;

            // Proper login using API
            const response = await apiService.post("users/login", {
                username: usernameClean,
                password: passwordClean,
            });

            if (response && response.success) {
                const { token, user } = response.data;

                // Store token securely
                await tokenStorage.setToken(token);

                // Update Redux state
                dispatch(loginSuccess({ user, token }));

                toast.success(`Welcome back, ${user.name || "User"}!`, "Success", true);

                // Navigate to Home or Dashboard (assuming Home exists)
                navigation.replace("Home");
            } else {
                throw new Error(response?.message || "Invalid username or password");
            }
        } catch (error) {
            console.error("Login Error:", error);
            const message = error.response?.data?.message || error.message || "Invalid username or password";
            toast.error(message, "Login Failed", true);
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={{ flex: 1 }}>
            <View className="flex-1 bg-gray-50">
                <Surface
                    elevation={4}
                    style={styles.header}
                    className="pt-12 pb-12 px-6 bg-primary rounded-b-3xl"
                >
                    <Text
                        className="text-3xl font-bold text-white mb-2 w-full text-center"
                        style={{
                            color: "white",
                            fontWeight: "bold",
                            textAlign: "center",
                        }}
                    >
                        Welcome Back
                    </Text>
                </Surface>

                <ScrollView
                    className="flex-1 mt-6"
                    showsVerticalScrollIndicator={false}
                >
                    <View className="px-5 gap-6 mt-2 mb-10">
                        <Card style={styles.card}>
                            <Card.Content className="gap-5 py-6">
                                <Text
                                    className="text-xl font-bold text-gray-800"
                                    style={{ fontWeight: "bold" }}
                                >
                                    Login Credentials
                                </Text>

                                <TextInput
                                    label="Username or Email"
                                    value={inputs.username}
                                    onChangeText={(text) =>
                                        setInputs({ ...inputs, username: text })
                                    }
                                    mode="outlined"
                                    outlineColor="#e2e8f0"
                                    activeOutlineColor="#4338ca"
                                    left={<TextInput.Icon icon="account" />}
                                />

                                <View>
                                    <TextInput
                                        label="Password"
                                        value={inputs.password}
                                        onChangeText={(text) =>
                                            setInputs({
                                                ...inputs,
                                                password: text,
                                            })
                                        }
                                        mode="outlined"
                                        outlineColor="#e2e8f0"
                                        activeOutlineColor="#4338ca"
                                        secureTextEntry
                                        left={<TextInput.Icon icon="lock" />}
                                    />
                                    <TouchableOpacity className="mt-2 self-end">
                                        <Text className="text-primary font-semibold text-sm">
                                            Forgot Password?
                                        </Text>
                                    </TouchableOpacity>
                                </View>

                                <Button
                                    mode="contained"
                                    onPress={handleLogin}
                                    loading={loading}
                                    disabled={loading}
                                    style={styles.submitButton}
                                    contentStyle={{ paddingVertical: 8 }}
                                    labelStyle={{
                                        fontSize: 18,
                                        fontWeight: "700",
                                    }}
                                >
                                    Sign In
                                </Button>
                            </Card.Content>
                        </Card>

                        <View className="flex-row justify-center items-center mt-4">
                            <Text className="text-gray-600">
                                Don't have an account?{" "}
                            </Text>
                            <Pressable
                                onPress={() => {
                                    console.warn("Sign Up Pressed!");
                                    setVisible(true);
                                }}
                                style={({ pressed }) => ({
                                    opacity: pressed ? 0.5 : 1,
                                    paddingHorizontal: 8,
                                    paddingVertical: 4,
                                })}
                            >
                                <Text className="text-primary font-bold">
                                    Sign Up
                                </Text>
                            </Pressable>
                        </View>
                    </View>
                </ScrollView>
            </View>

            <Modal
                transparent={true}
                visible={visible}
                animationType="fade"
                onRequestClose={() => setVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <Surface elevation={5} style={styles.modalCard}>
                        <Text
                            className="text-xl font-bold text-gray-800 mb-4 text-center"
                            style={{
                                fontWeight: "bold",
                                fontSize: 20,
                                textAlign: "center",
                            }}
                        >
                            Select Registration Type
                        </Text>

                        <RadioButton.Group
                            onValueChange={(value) => setSelectedOption(value)}
                            value={selectedOption}
                        >
                            <RadioButton.Item
                                label="User"
                                value="user"
                                color="#4338ca"
                                labelStyle={{ color: "#1e293b" }}
                            />
                            <RadioButton.Item
                                label="Parking Owner"
                                value="organization"
                                color="#4338ca"
                                labelStyle={{ color: "#1e293b" }}
                            />
                        </RadioButton.Group>

                        <View className="flex-row justify-end mt-4 gap-2">
                            <Button
                                onPress={() => setVisible(false)}
                                textColor="#64748b"
                            >
                                Cancel
                            </Button>
                            <Button
                                mode="contained"
                                onPress={() => {
                                    if (!selectedOption) {
                                        toast.error(
                                            "Please select an option",
                                            "Required",
                                            true
                                        );
                                        return;
                                    }
                                    setVisible(false);
                                    if (selectedOption === "user") {
                                        navigation.replace("UserSignup");
                                    } else {
                                        navigation.replace("OrgSignup");
                                    }
                                }}
                                style={{
                                    borderRadius: 8,
                                    backgroundColor: "#4338ca",
                                }}
                                labelStyle={{ color: "white" }}
                            >
                                Confirm
                            </Button>
                        </View>
                    </Surface>
                </View>
            </Modal>
        </View>
    );
}

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
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
    },
    modalCard: {
        backgroundColor: "white",
        borderRadius: 16,
        width: "100%",
        maxWidth: 400,
        padding: 20,
    },
});
