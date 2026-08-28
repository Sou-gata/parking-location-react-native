import { useEffect, useState } from "react";
import {
    Text,
    TextInput,
    Button,
    Card,
    Surface,
    Checkbox,
    Portal,
    Modal,
} from "react-native-paper";
import {
    BackHandler,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View,
} from "react-native";
import { setConnected } from "@maplibre/maplibre-react-native";
import { MaterialDesignIcons } from "@react-native-vector-icons/material-design-icons";
import { useDispatch } from "react-redux";
import { registerAgencyRequest } from "../store/slices/parkingSlice";

import SignupMap from "../components/SignupMap";
import apiService from "../utils/apiService";
import useToast from "../hooks/useToast";

setConnected(true);

const Signup = ({ navigation }) => {
    const toast = useToast();
    const dispatch = useDispatch();

    const [acceptedTerms, setAcceptedTerms] = useState(false);
    const [termsModalVisible, setTermsModalVisible] = useState(false);
    const [termsContent, setTermsContent] = useState("");

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

    useEffect(() => {
        const fetchTerms = async () => {
            try {
                const res = await apiService.get("config/agency");
                if (res && res.success && res.data) {
                    setTermsContent(res.data.content);
                }
            } catch (err) {
                console.error("Error loading agency terms:", err);
            }
        };
        fetchTerms();
    }, []);

    const [inputs, setInputs] = useState({
        name: "",
        username: "",
        email: "",
        phoneNumber: "",
        password: "",
        confirmPassword: "",
        address: "",
        landmark: "",
        latitude: null,
        longitude: null,
        loading: false,
    });

    // OTP States
    const [otp, setOtp] = useState("");
    const [otpSent, setOtpSent] = useState(false);
    const [otpVerified, setOtpVerified] = useState(false);
    const [verificationToken, setVerificationToken] = useState("");
    const [cooldownSeconds, setCooldownSeconds] = useState(0);
    const [otpSending, setOtpSending] = useState(false);
    const [otpVerifying, setOtpVerifying] = useState(false);

    // 1-minute countdown timer effect
    useEffect(() => {
        let timer;
        if (cooldownSeconds > 0) {
            timer = setInterval(() => {
                setCooldownSeconds((prev) => prev - 1);
            }, 1000);
        }
        return () => {
            if (timer) clearInterval(timer);
        };
    }, [cooldownSeconds]);

    const handleSendOtp = async () => {
        if (!inputs.phoneNumber || inputs.phoneNumber.trim().length < 8) {
            toast.error(
                "Please enter a valid Phone Number first.",
                "Validation Error",
                true
            );
            return;
        }
        setOtpSending(true);
        try {
            const res = await apiService.post("otp/send", {
                phone_number: inputs.phoneNumber,
            });
            if (res && res.success) {
                setOtpSent(true);
                setCooldownSeconds(60);
                toast.success(
                    res.message || "OTP sent successfully!",
                    "Success",
                    true
                );
            } else {
                toast.error(
                    res?.message || "Failed to send OTP.",
                    "Error",
                    true
                );
            }
        } catch (err) {
            const errorMsg =
                err.response?.data?.message ||
                err.message ||
                "Failed to send OTP.";
            toast.error(errorMsg, "Error", true);
        } finally {
            setOtpSending(false);
        }
    };

    const handleVerifyOtp = async () => {
        if (!otp || otp.trim().length < 4) {
            toast.error(
                "Please enter the OTP digits sent to your phone.",
                "Validation Error",
                true
            );
            return;
        }
        setOtpVerifying(true);
        try {
            const res = await apiService.post("otp/verify", {
                phone_number: inputs.phoneNumber,
                otp: otp.trim(),
            });
            if (res && res.success && res.data?.verification_token) {
                setVerificationToken(res.data.verification_token);
                setOtpVerified(true);
                toast.success(
                    "Phone number verified successfully!",
                    "Success",
                    true
                );
            } else {
                toast.error(
                    res?.message || "OTP verification failed.",
                    "Error",
                    true
                );
            }
        } catch (err) {
            const errorMsg =
                err.response?.data?.message ||
                err.message ||
                "OTP verification failed.";
            toast.error(errorMsg, "Error", true);
        } finally {
            setOtpVerifying(false);
        }
    };

    const handleSignup = async () => {
        if (
            !inputs.name ||
            !inputs.username ||
            !inputs.email ||
            !inputs.phoneNumber ||
            !inputs.password ||
            !inputs.address
        ) {
            toast.error(
                "Please fill in all required fields including Address.",
                "Error",
                true
            );
            return;
        }

        if (!otpVerified || !verificationToken) {
            toast.error(
                "Please send and verify the OTP for your phone number before creating an account.",
                "OTP Required",
                true
            );
            return;
        }

        if (inputs.password !== inputs.confirmPassword) {
            toast.error("Passwords do not match.", "Error", true);
            return;
        }

        if (!acceptedTerms) {
            toast.error(
                "Please read and accept the Partner Agency Terms & Conditions before submitting registration.",
                "Validation Error",
                true
            );
            return;
        }

        setInputs((prev) => ({ ...prev, loading: true }));

        try {
            const formData = new FormData();
            formData.append("org_name", inputs.name.trim());
            formData.append("username", inputs.username.trim());
            formData.append("email", inputs.email.trim());
            formData.append("phone_number", inputs.phoneNumber.trim());
            formData.append("otp_verification_token", verificationToken);
            formData.append("password", inputs.password);
            formData.append("org_address", inputs.address.trim());
            formData.append("landmark", inputs.landmark.trim());
            formData.append("latitude", String(Number(inputs.latitude || 0)));
            formData.append("longitude", String(Number(inputs.longitude || 0)));

            await apiService.post("users/orgregister", formData);

            dispatch(
                registerAgencyRequest({
                    org_name: inputs.name.trim(),
                    username: inputs.username.trim(),
                    email: inputs.email.trim(),
                    phone_number: inputs.phoneNumber.trim(),
                    password: inputs.password,
                    org_address: inputs.address.trim(),
                    landmark: inputs.landmark.trim(),
                    latitude: Number(inputs.latitude || 0),
                    longitude: Number(inputs.longitude || 0),
                })
            );

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
                    className="text-3xl font-bold text-white text-center"
                    style={{ color: "white", fontWeight: "bold" }}
                >
                    Parking Owner Registration
                </Text>
                <Text className="text-white/80 text-xs text-center mt-1">
                    Sign up your parking facility in a few easy steps
                </Text>
            </Surface>

            <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
                <View className="px-5 gap-5 mt-6 mb-10">
                    {/* Personal / Organization Information Section */}
                    <Card style={styles.card}>
                        <Card.Content className="gap-4">
                            <Text
                                style={{ fontWeight: "bold" }}
                                className="text-lg text-gray-800"
                            >
                                Basic Information
                            </Text>
                            <TextInput
                                label={
                                    <Text>
                                        Full Name / Organization Name{" "}
                                        <Text style={{ color: "#ef4444" }}>*</Text>
                                    </Text>
                                }
                                value={inputs.name}
                                onChangeText={(text) =>
                                    setInputs({ ...inputs, name: text })
                                }
                                mode="outlined"
                                outlineColor="#e2e8f0"
                                activeOutlineColor="#4338ca"
                                left={<TextInput.Icon icon="domain" />}
                            />
                            <TextInput
                                label={
                                    <Text>
                                        Email Address{" "}
                                        <Text style={{ color: "#ef4444" }}>*</Text>
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
                            <View className="gap-2">
                                <View className="flex-row items-center gap-2">
                                    <View className="flex-1">
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
                                            onChangeText={(text) => {
                                                setInputs({
                                                    ...inputs,
                                                    phoneNumber: text,
                                                });
                                                if (otpVerified) {
                                                    setOtpVerified(false);
                                                    setVerificationToken("");
                                                    setOtpSent(false);
                                                }
                                            }}
                                            disabled={otpVerified}
                                            mode="outlined"
                                            outlineColor="#e2e8f0"
                                            activeOutlineColor="#4338ca"
                                            keyboardType="phone-pad"
                                            left={<TextInput.Icon icon="phone" />}
                                        />
                                    </View>
                                    <Button
                                        mode={
                                            otpVerified
                                                ? "contained-tonal"
                                                : "contained"
                                        }
                                        onPress={handleSendOtp}
                                        disabled={
                                            cooldownSeconds > 0 ||
                                            otpSending ||
                                            otpVerified
                                        }
                                        loading={otpSending}
                                        style={{ marginTop: 6 }}
                                    >
                                        {otpVerified
                                            ? "Verified ✓"
                                            : cooldownSeconds > 0
                                            ? `${cooldownSeconds}s`
                                            : otpSent
                                            ? "Resend"
                                            : "Send OTP"}
                                    </Button>
                                </View>

                                {otpSent && !otpVerified && (
                                    <View className="flex-row items-center gap-2 mt-1">
                                        <View className="flex-1">
                                            <TextInput
                                                label="Enter OTP"
                                                value={otp}
                                                onChangeText={setOtp}
                                                mode="outlined"
                                                outlineColor="#e2e8f0"
                                                activeOutlineColor="#4338ca"
                                                keyboardType="number-pad"
                                                maxLength={6}
                                                left={
                                                    <TextInput.Icon icon="shield-check" />
                                                }
                                            />
                                        </View>
                                        <Button
                                            mode="contained"
                                            onPress={handleVerifyOtp}
                                            loading={otpVerifying}
                                            disabled={otpVerifying || !otp}
                                            style={{
                                                marginTop: 6,
                                                backgroundColor: "#16a34a",
                                            }}
                                        >
                                            Verify
                                        </Button>
                                    </View>
                                )}

                                {otpVerified && (
                                    <View className="flex-row items-center bg-green-50 p-2.5 rounded-lg border border-green-200 mt-1">
                                        <MaterialDesignIcons
                                            name="check-circle"
                                            size={20}
                                            color="#16a34a"
                                        />
                                        <Text className="text-green-700 font-semibold ml-2 text-xs">
                                            Phone Number Verified Successfully
                                        </Text>
                                    </View>
                                )}
                            </View>
                        </Card.Content>
                    </Card>

                    {/* Account Security Section */}
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
                                        <Text style={{ color: "#ef4444" }}>*</Text>
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
                                        <Text style={{ color: "#ef4444" }}>*</Text>
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
                                        <Text style={{ color: "#ef4444" }}>*</Text>
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

                    {/* Address & Location Section */}
                    <Card style={styles.card}>
                        <Card.Content className="gap-4">
                            <Text
                                style={{ fontWeight: "bold" }}
                                className="text-lg text-gray-800"
                            >
                                Address Details
                            </Text>
                            <TextInput
                                label={
                                    <Text>
                                        Facility / Parking Address{" "}
                                        <Text style={{ color: "#ef4444" }}>*</Text>
                                    </Text>
                                }
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
                                label="Landmark (Optional)"
                                value={inputs.landmark}
                                onChangeText={(text) =>
                                    setInputs({ ...inputs, landmark: text })
                                }
                                mode="outlined"
                                outlineColor="#e2e8f0"
                                activeOutlineColor="#4338ca"
                                left={<TextInput.Icon icon="office-building-marker-outline" />}
                            />

                            <View className="w-full overflow-hidden rounded-xl border border-slate-200">
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

                    {/* Terms & Conditions Checkbox Row */}
                    <View className="flex-row items-center bg-white p-3 rounded-2xl border border-slate-200">
                        <Checkbox
                            status={acceptedTerms ? "checked" : "unchecked"}
                            onPress={() => setAcceptedTerms(!acceptedTerms)}
                            color="#4338ca"
                        />
                        <View className="flex-1 ml-1 flex-row flex-wrap items-center">
                            <Text className="text-slate-700 text-xs font-semibold">
                                I agree to the{" "}
                            </Text>
                            <TouchableOpacity
                                onPress={() => setTermsModalVisible(true)}
                            >
                                <Text className="text-indigo-700 font-bold text-xs underline">
                                    Partner Terms & Conditions
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>

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

            {/* Terms and Conditions Dialog Modal */}
            <Portal>
                <Modal
                    visible={termsModalVisible}
                    onDismiss={() => setTermsModalVisible(false)}
                    contentContainerStyle={{
                        backgroundColor: "white",
                        padding: 22,
                        margin: 20,
                        borderRadius: 24,
                        maxHeight: "80%",
                    }}
                >
                    <View className="flex-row justify-between items-center mb-3 pb-2 border-b border-slate-200">
                        <Text className="text-slate-800 text-lg font-bold">
                            Partner Agency Terms & Conditions
                        </Text>
                        <TouchableOpacity
                            onPress={() => setTermsModalVisible(false)}
                            className="p-1 rounded-full bg-slate-100"
                        >
                            <MaterialDesignIcons
                                name="close"
                                size={20}
                                color="#475569"
                            />
                        </TouchableOpacity>
                    </View>

                    <ScrollView className="mb-4">
                        <Text className="text-slate-700 text-xs leading-5">
                            {termsContent ||
                                "Loading Partner Terms and Conditions..."}
                        </Text>
                    </ScrollView>

                    <View className="flex-row justify-end">
                        <Button
                            mode="contained"
                            onPress={() => {
                                setAcceptedTerms(true);
                                setTermsModalVisible(false);
                            }}
                            buttonColor="#4338ca"
                            className="rounded-xl"
                        >
                            I Accept Terms
                        </Button>
                    </View>
                </Modal>
            </Portal>
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

export default Signup;
