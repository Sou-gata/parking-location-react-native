import { useEffect, useState } from "react";
import {
    Text,
    TextInput,
    Button,
    Card,
    Surface,
    Checkbox,
} from "react-native-paper";
import {
    BackHandler,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View,
    Modal,
    TouchableWithoutFeedback,
} from "react-native";
import { setConnected } from "@maplibre/maplibre-react-native";
import { MaterialDesignIcons } from "@react-native-vector-icons/material-design-icons";
import { useDispatch } from "react-redux";
import { registerAgencyRequest } from "../store/slices/parkingSlice";

import SignupMap from "../components/SignupMap";
import apiService from "../utils/apiService";
import useToast from "../hooks/useToast";
import {
    validateCapacityFitsSpace,
    BLOCK_ON_CAPACITY_EXCEEDED,
} from "../utils/capacityValidator";

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

    // Parking Dimensions & Capacities
    const [dimensions, setDimensions] = useState({
        length: "",
        width: "",
        height: "",
        unit: "meters", // "meters" | "feet" | "yards"
    });

    const [capacities, setCapacities] = useState({
        twoWheeler: "",
        threeWheeler: "",
        car: "",
        suv: "",
        van: "",
        pickup: "",
        ev: "",
    });

    const [capacityValidation, setCapacityValidation] = useState(null);

    // Live capacity validation when dimensions or capacities change
    useEffect(() => {
        if (dimensions.length && dimensions.width) {
            const res = validateCapacityFitsSpace({
                length: dimensions.length,
                width: dimensions.width,
                unit: dimensions.unit,
                capacities,
            });
            setCapacityValidation(res);
        } else {
            setCapacityValidation(null);
        }
    }, [dimensions.length, dimensions.width, dimensions.unit, capacities]);

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
                account_type: "org",
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

        // Capacity validation check (blocking mode only)
        if (
            BLOCK_ON_CAPACITY_EXCEEDED &&
            capacityValidation?.checked &&
            !capacityValidation?.valid
        ) {
            toast.error(
                capacityValidation.message,
                "Capacity Exceeded",
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

            // Parking Space Dimensions
            if (dimensions.length.trim())
                formData.append("parking_length", dimensions.length.trim());
            if (dimensions.width.trim())
                formData.append("parking_width", dimensions.width.trim());
            if (dimensions.height.trim())
                formData.append("parking_height", dimensions.height.trim());
            formData.append("dimension_unit", dimensions.unit);

            // Vehicle Capacities
            formData.append(
                "two_wheeler_capacity",
                String(parseInt(capacities.twoWheeler, 10) || 0)
            );
            formData.append(
                "three_wheeler_capacity",
                String(parseInt(capacities.threeWheeler, 10) || 0)
            );
            formData.append(
                "car_capacity",
                String(parseInt(capacities.car, 10) || 0)
            );
            formData.append(
                "suv_capacity",
                String(parseInt(capacities.suv, 10) || 0)
            );
            formData.append(
                "van_capacity",
                String(parseInt(capacities.van, 10) || 0)
            );
            formData.append(
                "pickup_capacity",
                String(parseInt(capacities.pickup, 10) || 0)
            );
            formData.append(
                "ev_capacity",
                String(parseInt(capacities.ev, 10) || 0)
            );

            const regRes = await apiService.post("users/orgregister", formData);

            if (regRes?.data?.capacity_warning) {
                toast.warning(
                    regRes.data.capacity_warning,
                    "Capacity Notice",
                    true
                );
            }

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
                                activeOutlineColor="#ff9933"
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
                                activeOutlineColor="#ff9933"
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
                                            activeOutlineColor="#ff9933"
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
                                                activeOutlineColor="#ff9933"
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
                                activeOutlineColor="#ff9933"
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
                                activeOutlineColor="#ff9933"
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
                                activeOutlineColor="#ff9933"
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
                                activeOutlineColor="#ff9933"
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
                                activeOutlineColor="#ff9933"
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

                    {/* Parking Space Dimensions & Vehicle Capacity Section */}
                    <Card style={styles.card}>
                        <Card.Content className="gap-4">
                            <View>
                                <View className="flex-row items-center gap-2">
                                    <MaterialDesignIcons
                                        name="ruler-square"
                                        size={22}
                                        color="#ff9933"
                                    />
                                    <Text
                                        style={{ fontWeight: "bold" }}
                                        className="text-lg text-gray-800"
                                    >
                                        Parking Space & Capacity
                                    </Text>
                                </View>
                                <Text className="text-slate-500 text-xs mt-1">
                                    Specify your parking area dimensions and vehicle slots. Multi-layer parking is not supported.
                                </Text>
                            </View>

                            {/* Dimension Unit Selector */}
                            <View className="flex-row items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                                <Text className="text-xs font-semibold text-slate-700">
                                    Measurement Unit:
                                </Text>
                                <View className="flex-row gap-1">
                                    {["meters", "feet", "yards"].map((u) => (
                                        <TouchableOpacity
                                            key={u}
                                            onPress={() =>
                                                setDimensions((prev) => ({
                                                    ...prev,
                                                    unit: u,
                                                }))
                                            }
                                            style={{
                                                backgroundColor:
                                                    dimensions.unit === u
                                                        ? "#ff9933"
                                                        : "#e2e8f0",
                                                paddingVertical: 5,
                                                paddingHorizontal: 10,
                                                borderRadius: 8,
                                            }}
                                        >
                                            <Text
                                                style={{
                                                    color:
                                                        dimensions.unit === u
                                                            ? "#ffffff"
                                                            : "#475569",
                                                    fontSize: 11,
                                                    fontWeight: "bold",
                                                    textTransform: "capitalize",
                                                }}
                                            >
                                                {u}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>

                            {/* Dimensions Inputs */}
                            <View className="flex-row gap-2">
                                <View className="flex-1">
                                    <TextInput
                                        label={`Length (${dimensions.unit})`}
                                        value={dimensions.length}
                                        onChangeText={(t) =>
                                            setDimensions((prev) => ({
                                                ...prev,
                                                length: t,
                                            }))
                                        }
                                        keyboardType="numeric"
                                        mode="outlined"
                                        outlineColor="#e2e8f0"
                                        activeOutlineColor="#ff9933"
                                        left={<TextInput.Icon icon="arrow-expand-horizontal" />}
                                    />
                                </View>
                                <View className="flex-1">
                                    <TextInput
                                        label={`Width (${dimensions.unit})`}
                                        value={dimensions.width}
                                        onChangeText={(t) =>
                                            setDimensions((prev) => ({
                                                ...prev,
                                                width: t,
                                            }))
                                        }
                                        keyboardType="numeric"
                                        mode="outlined"
                                        outlineColor="#e2e8f0"
                                        activeOutlineColor="#ff9933"
                                        left={<TextInput.Icon icon="arrow-expand-vertical" />}
                                    />
                                </View>
                                <View className="flex-1">
                                    <TextInput
                                        label="Height (Opt)"
                                        value={dimensions.height}
                                        onChangeText={(t) =>
                                            setDimensions((prev) => ({
                                                ...prev,
                                                height: t,
                                            }))
                                        }
                                        keyboardType="numeric"
                                        mode="outlined"
                                        outlineColor="#e2e8f0"
                                        activeOutlineColor="#ff9933"
                                        left={<TextInput.Icon icon="arrow-up-down" />}
                                    />
                                </View>
                            </View>

                            {/* Vehicle Capacities */}
                            <Text className="text-sm font-bold text-slate-700 mt-1">
                                Declared Vehicle Capacities
                            </Text>

                            <View className="flex-row gap-2">
                                <View className="flex-1">
                                    <TextInput
                                        label="Two-Wheeler"
                                        value={capacities.twoWheeler}
                                        onChangeText={(t) =>
                                            setCapacities((prev) => ({
                                                ...prev,
                                                twoWheeler: t,
                                            }))
                                        }
                                        keyboardType="numeric"
                                        mode="outlined"
                                        outlineColor="#e2e8f0"
                                        activeOutlineColor="#ff9933"
                                        left={<TextInput.Icon icon="motorbike" />}
                                    />
                                </View>
                                <View className="flex-1">
                                    <TextInput
                                        label="Three-Wheeler"
                                        value={capacities.threeWheeler}
                                        onChangeText={(t) =>
                                            setCapacities((prev) => ({
                                                ...prev,
                                                threeWheeler: t,
                                            }))
                                        }
                                        keyboardType="numeric"
                                        mode="outlined"
                                        outlineColor="#e2e8f0"
                                        activeOutlineColor="#ff9933"
                                        left={<TextInput.Icon icon="rickshaw" />}
                                    />
                                </View>
                            </View>

                            <View className="flex-row gap-2">
                                <View className="flex-1">
                                    <TextInput
                                        label="Car / Sedan"
                                        value={capacities.car}
                                        onChangeText={(t) =>
                                            setCapacities((prev) => ({
                                                ...prev,
                                                car: t,
                                            }))
                                        }
                                        keyboardType="numeric"
                                        mode="outlined"
                                        outlineColor="#e2e8f0"
                                        activeOutlineColor="#ff9933"
                                        left={<TextInput.Icon icon="car-side" />}
                                    />
                                </View>
                                <View className="flex-1">
                                    <TextInput
                                        label="SUV"
                                        value={capacities.suv}
                                        onChangeText={(t) =>
                                            setCapacities((prev) => ({
                                                ...prev,
                                                suv: t,
                                            }))
                                        }
                                        keyboardType="numeric"
                                        mode="outlined"
                                        outlineColor="#e2e8f0"
                                        activeOutlineColor="#ff9933"
                                        left={<TextInput.Icon icon="car-estate" />}
                                    />
                                </View>
                            </View>

                            <View className="flex-row gap-2">
                                <View className="flex-1">
                                    <TextInput
                                        label="Van / Minibus"
                                        value={capacities.van}
                                        onChangeText={(t) =>
                                            setCapacities((prev) => ({
                                                ...prev,
                                                van: t,
                                            }))
                                        }
                                        keyboardType="numeric"
                                        mode="outlined"
                                        outlineColor="#e2e8f0"
                                        activeOutlineColor="#ff9933"
                                        left={<TextInput.Icon icon="van-utility" />}
                                    />
                                </View>
                                <View className="flex-1">
                                    <TextInput
                                        label="Pickup Truck"
                                        value={capacities.pickup}
                                        onChangeText={(t) =>
                                            setCapacities((prev) => ({
                                                ...prev,
                                                pickup: t,
                                            }))
                                        }
                                        keyboardType="numeric"
                                        mode="outlined"
                                        outlineColor="#e2e8f0"
                                        activeOutlineColor="#ff9933"
                                        left={<TextInput.Icon icon="truck-pickup" />}
                                    />
                                </View>
                            </View>

                            <TextInput
                                label="EV Charging Spots"
                                value={capacities.ev}
                                onChangeText={(t) =>
                                    setCapacities((prev) => ({
                                        ...prev,
                                        ev: t,
                                    }))
                                }
                                keyboardType="numeric"
                                mode="outlined"
                                outlineColor="#e2e8f0"
                                activeOutlineColor="#ff9933"
                                left={<TextInput.Icon icon="ev-station" />}
                            />

                            {/* Live Area Fit & Capacity Validation Indicator */}
                            {capacityValidation && capacityValidation.checked && (
                                <View
                                    style={{
                                        backgroundColor: capacityValidation.valid
                                            ? "#f0fdf4"
                                            : "#fef2f2",
                                        borderColor: capacityValidation.valid
                                            ? "#86efac"
                                            : "#fca5a5",
                                    }}
                                    className="p-3.5 rounded-2xl border mt-2"
                                >
                                    <View className="flex-row items-center justify-between mb-2">
                                        <View className="flex-row items-center gap-1.5">
                                            <MaterialDesignIcons
                                                name={
                                                    capacityValidation.valid
                                                        ? "check-circle"
                                                        : "alert-circle"
                                                }
                                                size={18}
                                                color={
                                                    capacityValidation.valid
                                                        ? "#16a34a"
                                                        : "#dc2626"
                                                }
                                            />
                                            <Text
                                                style={{
                                                    color: capacityValidation.valid
                                                        ? "#15803d"
                                                        : "#b91c1c",
                                                    fontWeight: "bold",
                                                    fontSize: 13,
                                                }}
                                            >
                                                {capacityValidation.valid
                                                    ? "Capacity Fits Space"
                                                    : "Capacity Exceeds Floor Space"}
                                            </Text>
                                        </View>
                                        <Text
                                            style={{
                                                color: capacityValidation.valid
                                                    ? "#15803d"
                                                    : "#b91c1c",
                                                fontWeight: "bold",
                                                fontSize: 12,
                                            }}
                                        >
                                            {capacityValidation.occupancyPercentage}% Space Used
                                        </Text>
                                    </View>

                                    {/* Utilization Meter Bar */}
                                    <View className="w-full bg-slate-200 h-2 rounded-full overflow-hidden mb-2.5">
                                        <View
                                            style={{
                                                width: `${Math.min(
                                                    capacityValidation.occupancyPercentage,
                                                    100
                                                )}%`,
                                                backgroundColor:
                                                    capacityValidation.occupancyPercentage <= 80
                                                        ? "#16a34a"
                                                        : capacityValidation.occupancyPercentage <= 100
                                                        ? "#f59e0b"
                                                        : "#dc2626",
                                                height: "100%",
                                                borderRadius: 999,
                                            }}
                                        />
                                    </View>

                                    {/* Area Details Breakdown */}
                                    <View className="flex-row justify-between pt-1 border-t border-slate-200/60">
                                        <View>
                                            <Text className="text-[11px] text-slate-500">
                                                Usable Slot Area
                                            </Text>
                                            <Text className="text-xs font-bold text-slate-800">
                                                {capacityValidation.usableAreaM2} m²
                                            </Text>
                                            <Text className="text-[10px] text-slate-400">
                                                (65% of {capacityValidation.totalAreaM2} m²)
                                            </Text>
                                        </View>
                                        <View className="items-end">
                                            <Text className="text-[11px] text-slate-500">
                                                Required Slot Area
                                            </Text>
                                            <Text
                                                style={{
                                                    color: capacityValidation.valid
                                                        ? "#15803d"
                                                        : "#dc2626",
                                                }}
                                                className="text-xs font-bold"
                                            >
                                                {capacityValidation.requiredAreaM2} m²
                                            </Text>
                                            <Text className="text-[10px] text-slate-400">
                                                ({capacityValidation.totalVehicleCount} vehicles)
                                            </Text>
                                        </View>
                                    </View>

                                    {!capacityValidation.valid && (
                                        <Text className="text-red-700 text-xs leading-4 mt-2 font-medium">
                                            {capacityValidation.message}
                                        </Text>
                                    )}
                                </View>
                            )}
                        </Card.Content>
                    </Card>

                    {/* Terms & Conditions Checkbox Row */}
                    <View className="flex-row items-center bg-white p-3 rounded-2xl border border-slate-200">
                        <Checkbox
                            status={acceptedTerms ? "checked" : "unchecked"}
                            onPress={() => setAcceptedTerms(!acceptedTerms)}
                            color="#ff9933"
                        />
                        <View className="flex-1 ml-1 flex-row flex-wrap items-center">
                            <Text className="text-slate-700 text-xs font-semibold">
                                I agree to the{" "}
                            </Text>
                            <TouchableOpacity
                                onPress={() => setTermsModalVisible(true)}
                            >
                                <Text className="text-carrot-700 font-bold text-xs underline">
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
            <Modal
                visible={Boolean(termsModalVisible)}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setTermsModalVisible(false)}
            >
                <TouchableWithoutFeedback onPress={() => setTermsModalVisible(false)}>
                    <View className="flex-1 bg-black/50 justify-center items-center p-4">
                        <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
                            <View className="bg-white rounded-3xl p-5 w-[92%] max-w-[500px] max-h-[80%] shadow-2xl">
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
                                        buttonColor="#ff9933"
                                        className="rounded-xl"
                                    >
                                        I Accept Terms
                                    </Button>
                                </View>
                            </View>
                        </TouchableWithoutFeedback>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    header: {
        backgroundColor: "#ff9933",
    },
    card: {
        backgroundColor: "white",
        borderRadius: 16,
        paddingBottom: 4,
    },
    submitButton: {
        backgroundColor: "#ff9933",
        borderRadius: 12,
        marginTop: 8,
        elevation: 4,
    },
});

export default Signup;
