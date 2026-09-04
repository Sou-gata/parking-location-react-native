import React, { useState, useEffect } from "react";
import {
    View,
    TouchableOpacity,
    ScrollView,
    StyleSheet,
    Modal,
    Pressable,
    Image,
    ActivityIndicator,
} from "react-native";
import {
    Text,
    TextInput,
    Button,
    Card,
    Surface,
    Avatar,
    IconButton,
} from "react-native-paper";
import { useDispatch } from "react-redux";
import {
    GoogleSignin,
    statusCodes,
} from "@react-native-google-signin/google-signin";
import { loginSuccess } from "../store/slices/userSlice";
import useToast from "../hooks/useToast";
import apiService from "../utils/apiService";
import tokenStorage from "../utils/tokenStorage";
import AnimatedTagline from "../components/AnimatedTagline";

GoogleSignin.configure({
    webClientId:
        "196392862520-nq7una9ib2t866dtf7tgmtr3rkcd6jr7.apps.googleusercontent.com",
    scopes: ["profile", "email"],
    offlineAccess: false,
});

export default function Login({ navigation }) {
    const dispatch = useDispatch();
    const toast = useToast();

    // Consolidated States
    const [inputs, setInputs] = useState({
        username: "",
        password: "",
    });

    const [loading, setLoading] = useState({
        login: false,
        google: false,
    });

    const [signupModalVisible, setSignupModalVisible] = useState(false);

    const [forgotState, setForgotState] = useState({
        visible: false,
        step: 1, // 1: Phone, 2: OTP, 3: New Password
        phone: "",
        otp: "",
        newPassword: "",
        confirmPassword: "",
        verificationToken: "",
        cooldown: 0,
        sendingOtp: false,
        verifyingOtp: false,
        resetting: false,
    });

    const updateForgot = (updates) => {
        setForgotState((prev) => ({ ...prev, ...updates }));
    };

    // 1-minute countdown timer effect for forgot password OTP
    useEffect(() => {
        let timer;
        if (forgotState.cooldown > 0) {
            timer = setInterval(() => {
                setForgotState((prev) => ({
                    ...prev,
                    cooldown: Math.max(0, prev.cooldown - 1),
                }));
            }, 1000);
        }
        return () => {
            if (timer) clearInterval(timer);
        };
    }, [forgotState.cooldown]);

    const openForgotPasswordModal = () => {
        updateForgot({
            visible: true,
            step: 1,
            phone: inputs.username.match(/^[0-9+]+$/) ? inputs.username : "",
            otp: "",
            newPassword: "",
            confirmPassword: "",
            verificationToken: "",
        });
    };

    const handleSendForgotOtp = async () => {
        const phone = forgotState.phone.trim();
        if (!phone || phone.length < 8) {
            toast.error(
                "Please enter a valid registered phone number.",
                "Validation Error",
                true
            );
            return;
        }

        updateForgot({ sendingOtp: true });
        try {
            const res = await apiService.post("otp/send-forgot-password", {
                phone_number: phone,
            });

            if (res && res.success) {
                updateForgot({
                    step: 2,
                    cooldown: 60,
                });
                toast.success(
                    res.message || "OTP sent to your registered mobile number!",
                    "OTP Sent",
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
            updateForgot({ sendingOtp: false });
        }
    };

    const handleVerifyForgotOtp = async () => {
        const phone = forgotState.phone.trim();
        const otp = forgotState.otp.trim();
        if (!otp || otp.length < 4) {
            toast.error(
                "Please enter the OTP digits sent to your phone.",
                "Validation Error",
                true
            );
            return;
        }

        updateForgot({ verifyingOtp: true });
        try {
            const res = await apiService.post("otp/verify", {
                phone_number: phone,
                otp: otp,
            });

            if (res && res.success && res.data?.verification_token) {
                updateForgot({
                    verificationToken: res.data.verification_token,
                    step: 3,
                });
                toast.success(
                    "OTP verified successfully! Please enter your new password.",
                    "Verified",
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
            updateForgot({ verifyingOtp: false });
        }
    };

    const handleResetPassword = async () => {
        const { phone, verificationToken, newPassword, confirmPassword } =
            forgotState;
        if (!newPassword || newPassword.length < 6) {
            toast.error(
                "Password must be at least 6 characters long.",
                "Validation Error",
                true
            );
            return;
        }

        if (newPassword !== confirmPassword) {
            toast.error("Passwords do not match.", "Validation Error", true);
            return;
        }

        updateForgot({ resetting: true });
        try {
            const res = await apiService.post("users/reset-password", {
                phone_number: phone.trim(),
                otp_verification_token: verificationToken,
                new_password: newPassword,
                confirm_password: confirmPassword,
            });

            if (res && res.success) {
                toast.success(
                    "Password reset successfully! You can now login with your new password.",
                    "Success",
                    true
                );
                updateForgot({ visible: false });
                setInputs((prev) => ({
                    ...prev,
                    username: prev.username || phone.trim(),
                    password: "",
                }));
            } else {
                toast.error(
                    res?.message || "Failed to reset password.",
                    "Error",
                    true
                );
            }
        } catch (err) {
            const errorMsg =
                err.response?.data?.message ||
                err.message ||
                "Failed to reset password.";
            toast.error(errorMsg, "Reset Failed", true);
        } finally {
            updateForgot({ resetting: false });
        }
    };

    const handleGoogleSignIn = async () => {
        setLoading((prev) => ({ ...prev, google: true }));
        try {
            await GoogleSignin.hasPlayServices({
                showPlayServicesUpdateDialog: true,
            });

            // Sign out of previous cached session so the account chooser dialog is always shown
            try {
                await GoogleSignin.signOut();
            } catch (err) {
                // Ignore if not previously signed in
            }

            const userInfo = await GoogleSignin.signIn();
            console.log("Google Sign-In response:", userInfo);

            const userObj = userInfo.data?.user || userInfo.user || {};
            const idToken = userInfo.data?.idToken || userInfo.idToken || "";
            const email = userObj.email;
            const name = userObj.name || "";
            const photo = userObj.photo || "";

            if (!email) {
                toast.error(
                    "Could not retrieve email from Google account.",
                    "Error",
                    true
                );
                return;
            }

            const response = await apiService.post("users/google-auth", {
                idToken,
                email,
                name,
                photo,
            });

            if (response && response.success) {
                const { exists, user, token } = response.data;

                if (exists && token && user) {
                    // Account exists -> Log user in
                    await tokenStorage.setToken(token);
                    dispatch(loginSuccess({ user, token }));
                    toast.success(
                        `Welcome back, ${user.name || "User"}!`,
                        "Success",
                        true
                    );
                } else {
                    // Account does not exist -> Navigate to UserSignup with prefilled details
                    toast.info(
                        "No account found with this email. Please complete your registration.",
                        "Almost There",
                        true
                    );
                    navigation.navigate("UserSignup", {
                        googleData: {
                            email: response.data?.email || email,
                            name: response.data?.name || name,
                            photoUrl: response.data?.photoUrl || photo,
                        },
                    });
                }
            } else {
                throw new Error(
                    response?.message || "Google authentication failed."
                );
            }
        } catch (error) {
            if (error.code === statusCodes.SIGN_IN_CANCELLED) {
                console.log("User cancelled Google sign in");
            } else if (error.code === statusCodes.IN_PROGRESS) {
                console.log("Google sign in is already in progress");
            } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
                toast.error(
                    "Google Play Services not available or outdated",
                    "Error",
                    true
                );
            } else {
                console.error("Google Sign-In error:", error);
                const message =
                    error.response?.data?.message ||
                    error.message ||
                    "Google sign in failed";
                toast.error(message, "Google Sign-In Failed", true);
            }
        } finally {
            setLoading((prev) => ({ ...prev, google: false }));
        }
    };

    const handleLogin = async () => {
        if (!inputs.username || !inputs.password) {
            toast.error(
                "Please enter both username and password",
                "Required",
                true
            );
            return;
        }

        setLoading((prev) => ({ ...prev, login: true }));
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

                await tokenStorage.setToken(token);

                dispatch(loginSuccess({ user, token }));

                toast.success(
                    `Welcome back, ${user.name || "User"}!`,
                    "Success",
                    true
                );
            } else {
                throw new Error(
                    response?.message || "Invalid username or password"
                );
            }
        } catch (error) {
            console.error("Login Error:", error);
            const message =
                error.response?.data?.message ||
                error.message ||
                "Invalid username or password";
            toast.error(message, "Login Failed", true);
        } finally {
            setLoading((prev) => ({ ...prev, login: false }));
        }
    };

    return (
        <View style={{ flex: 1 }}>
            <View className="flex-1 bg-gray-50">
                <Surface
                    elevation={4}
                    style={styles.header}
                    className="pt-10 pb-12 px-6 bg-primary rounded-b-3xl"
                >
                    {/* <Text
                        className="text-3xl font-bold text-white mb-2 w-full text-center"
                        style={{
                            color: "white",
                            fontWeight: "bold",
                            textAlign: "center",
                        }}
                    >
                        Welcome Back
                    </Text> */}
                    <AnimatedTagline />
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
                                    label="Username, Email or Mobile"
                                    value={inputs.username}
                                    onChangeText={(text) =>
                                        setInputs({ ...inputs, username: text })
                                    }
                                    mode="outlined"
                                    outlineColor="#e2e8f0"
                                    activeOutlineColor="#ff9933"
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
                                        activeOutlineColor="#ff9933"
                                        secureTextEntry
                                        left={<TextInput.Icon icon="lock" />}
                                    />
                                    <TouchableOpacity
                                        className="mt-2 self-end"
                                        onPress={openForgotPasswordModal}
                                        activeOpacity={0.7}
                                    >
                                        <Text className="text-primary font-semibold text-sm">
                                            Forgot Password?
                                        </Text>
                                    </TouchableOpacity>
                                </View>

                                <Button
                                    mode="contained"
                                    onPress={handleLogin}
                                    disabled={loading.login || loading.google}
                                    style={styles.submitButton}
                                    contentStyle={{ paddingVertical: 8 }}
                                    labelStyle={{
                                        fontSize: 18,
                                        fontWeight: "700",
                                    }}
                                >
                                    {loading.login ? (
                                        <View className="flex-row items-center justify-center gap-2">
                                            <ActivityIndicator
                                                size="small"
                                                color="#ffffff"
                                            />
                                            <Text
                                                className="text-white"
                                                style={{
                                                    fontSize: 18,
                                                    fontWeight: "700",
                                                    includeFontPadding: false,
                                                    textAlignVertical: "center",
                                                }}
                                            >
                                                Signing In
                                            </Text>
                                        </View>
                                    ) : (
                                        "Sign In"
                                    )}
                                </Button>
                                <View className="gap-2">
                                    <View className="flex-row items-center">
                                        <View className="flex-1 h-[1px] bg-slate-200" />
                                        <View className="px-3 py-1 bg-slate-50 border border-slate-100 rounded-full mx-2">
                                            <Text className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                                                Or continue with
                                            </Text>
                                        </View>
                                        <View className="flex-1 h-[1px] bg-slate-200" />
                                    </View>
                                    <TouchableOpacity
                                        activeOpacity={0.8}
                                        onPress={handleGoogleSignIn}
                                        disabled={
                                            loading.google || loading.login
                                        }
                                        style={[
                                            styles.googleButton,
                                            (loading.google ||
                                                loading.login) && {
                                                opacity: 0.7,
                                            },
                                        ]}
                                    >
                                        {loading.google ? (
                                            <ActivityIndicator
                                                size="small"
                                                color="#ff9933"
                                            />
                                        ) : (
                                            <>
                                                <View className="h-7 w-7 rounded-full bg-white items-center justify-center mr-2">
                                                    <Image
                                                        source={require("../assets/google_logo.png")}
                                                        style={
                                                            styles.googleIcon
                                                        }
                                                        resizeMode="contain"
                                                    />
                                                </View>
                                                <Text
                                                    style={
                                                        styles.googleButtonText
                                                    }
                                                >
                                                    Continue with Google
                                                </Text>
                                            </>
                                        )}
                                    </TouchableOpacity>
                                </View>
                            </Card.Content>
                        </Card>

                        <View className="flex-row justify-center items-center mt-4">
                            <Text className="text-gray-600">
                                Don't have an account?{" "}
                            </Text>
                            <Pressable
                                onPress={() => {
                                    setSignupModalVisible(true);
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

            {/* Join / Signup Type Modal */}
            <Modal
                transparent={true}
                visible={signupModalVisible}
                animationType="fade"
                onRequestClose={() => setSignupModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <Surface
                        elevation={5}
                        style={styles.modalCard}
                        className="bg-white p-6 rounded-3xl w-[90%] max-w-[400px] self-center"
                    >
                        <Text className="text-xl font-bold text-slate-800 text-center mb-1">
                            Join Parking Locator
                        </Text>
                        <Text className="text-xs text-slate-400 text-center mb-6 px-4">
                            Select the type of account you want to register
                        </Text>

                        {/* Card 1: Customer */}
                        <Pressable
                            onPress={() => {
                                setSignupModalVisible(false);
                                navigation.replace("UserSignup");
                            }}
                            className="flex-row items-center p-4 mb-3 border border-slate-100 bg-slate-50/50 rounded-2xl active:bg-carrot-50/40 active:border-carrot-200"
                        >
                            <Avatar.Icon
                                size={44}
                                icon="car"
                                style={{ backgroundColor: "#e0e7ff" }}
                                color="#ff9933"
                            />
                            <View className="ml-3 flex-1">
                                <Text className="text-sm font-bold text-slate-800">
                                    Customer / Driver
                                </Text>
                                <Text className="text-[11px] text-slate-500 mt-0.5 font-medium">
                                    Find, book, and navigate to parking spaces
                                </Text>
                            </View>
                            <IconButton
                                icon="chevron-right"
                                iconColor="#ff9933"
                                size={20}
                                className="m-0"
                            />
                        </Pressable>

                        {/* Card 2: Agency */}
                        <Pressable
                            onPress={() => {
                                setSignupModalVisible(false);
                                navigation.replace("OrgSignup");
                            }}
                            className="flex-row items-center p-4 mb-6 border border-slate-100 bg-slate-50/50 rounded-2xl active:bg-carrot-50/40 active:border-carrot-200"
                        >
                            <Avatar.Icon
                                size={44}
                                icon="office-building"
                                style={{ backgroundColor: "#e0e7ff" }}
                                color="#ff9933"
                            />
                            <View className="ml-3 flex-1">
                                <Text className="text-sm font-bold text-slate-800">
                                    Parking Agency Owner
                                </Text>
                                <Text className="text-[11px] text-slate-500 mt-0.5 font-medium">
                                    List locations, manage rates and staff
                                </Text>
                            </View>
                            <IconButton
                                icon="chevron-right"
                                iconColor="#ff9933"
                                size={20}
                                className="m-0"
                            />
                        </Pressable>

                        <Button
                            mode="outlined"
                            onPress={() => setSignupModalVisible(false)}
                            textColor="#64748b"
                            style={{ borderColor: "#cbd5e1", borderRadius: 12 }}
                            className="py-0.5"
                        >
                            Cancel
                        </Button>
                    </Surface>
                </View>
            </Modal>

            {/* Forgot Password Modal */}
            <Modal
                transparent={true}
                visible={forgotState.visible}
                animationType="fade"
                onRequestClose={() => updateForgot({ visible: false })}
            >
                <View style={styles.modalOverlay}>
                    <Surface
                        elevation={5}
                        style={styles.modalCard}
                        className="bg-white p-6 rounded-3xl w-[90%] max-w-[400px] self-center"
                    >
                        <View className="items-center mb-4">
                            <Avatar.Icon
                                size={52}
                                icon="lock-reset"
                                style={{ backgroundColor: "#e0e7ff" }}
                                color="#ff9933"
                            />
                            <Text className="text-xl font-bold text-slate-800 text-center mt-2">
                                Reset Password
                            </Text>
                            <Text className="text-xs text-slate-400 text-center mt-0.5">
                                {forgotState.step === 1 &&
                                    "Enter your registered phone number to receive an OTP"}
                                {forgotState.step === 2 &&
                                    `Enter the verification code sent to ${forgotState.phone}`}
                                {forgotState.step === 3 &&
                                    "Create and confirm your new password"}
                            </Text>
                        </View>

                        {/* Step 1: Enter Phone Number */}
                        {forgotState.step === 1 && (
                            <View className="gap-4">
                                <TextInput
                                    label="Registered Phone Number"
                                    value={forgotState.phone}
                                    onChangeText={(text) =>
                                        updateForgot({ phone: text })
                                    }
                                    mode="outlined"
                                    outlineColor="#e2e8f0"
                                    activeOutlineColor="#ff9933"
                                    keyboardType="phone-pad"
                                    left={<TextInput.Icon icon="phone" />}
                                />
                                <Button
                                    mode="contained"
                                    onPress={handleSendForgotOtp}
                                    disabled={forgotState.sendingOtp}
                                    style={styles.submitButton}
                                    contentStyle={{ paddingVertical: 6 }}
                                    labelStyle={{
                                        fontSize: 16,
                                        fontWeight: "700",
                                    }}
                                >
                                    {forgotState.sendingOtp ? (
                                        <ActivityIndicator
                                            size="small"
                                            color="#ffffff"
                                        />
                                    ) : (
                                        "Send OTP"
                                    )}
                                </Button>
                            </View>
                        )}

                        {/* Step 2: Enter & Verify OTP */}
                        {forgotState.step === 2 && (
                            <View className="gap-4">
                                <TextInput
                                    label="Enter OTP Code"
                                    value={forgotState.otp}
                                    onChangeText={(text) =>
                                        updateForgot({ otp: text })
                                    }
                                    mode="outlined"
                                    outlineColor="#e2e8f0"
                                    activeOutlineColor="#ff9933"
                                    keyboardType="number-pad"
                                    left={<TextInput.Icon icon="shield-key" />}
                                />
                                <Button
                                    mode="contained"
                                    onPress={handleVerifyForgotOtp}
                                    disabled={forgotState.verifyingOtp}
                                    style={styles.submitButton}
                                    contentStyle={{ paddingVertical: 6 }}
                                    labelStyle={{
                                        fontSize: 16,
                                        fontWeight: "700",
                                    }}
                                >
                                    {forgotState.verifyingOtp ? (
                                        <ActivityIndicator
                                            size="small"
                                            color="#ffffff"
                                        />
                                    ) : (
                                        "Verify OTP"
                                    )}
                                </Button>
                                <TouchableOpacity
                                    onPress={handleSendForgotOtp}
                                    disabled={
                                        forgotState.cooldown > 0 ||
                                        forgotState.sendingOtp
                                    }
                                    className="items-center py-1"
                                >
                                    <Text
                                        className={`text-xs font-semibold ${
                                            forgotState.cooldown > 0
                                                ? "text-slate-400"
                                                : "text-primary"
                                        }`}
                                    >
                                        {forgotState.cooldown > 0
                                            ? `Resend OTP in ${forgotState.cooldown}s`
                                            : "Resend OTP"}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        {/* Step 3: Enter New Password */}
                        {forgotState.step === 3 && (
                            <View className="gap-3">
                                <TextInput
                                    label="New Password"
                                    value={forgotState.newPassword}
                                    onChangeText={(text) =>
                                        updateForgot({ newPassword: text })
                                    }
                                    mode="outlined"
                                    outlineColor="#e2e8f0"
                                    activeOutlineColor="#ff9933"
                                    secureTextEntry
                                    left={<TextInput.Icon icon="lock" />}
                                />
                                <TextInput
                                    label="Confirm New Password"
                                    value={forgotState.confirmPassword}
                                    onChangeText={(text) =>
                                        updateForgot({
                                            confirmPassword: text,
                                        })
                                    }
                                    mode="outlined"
                                    outlineColor="#e2e8f0"
                                    activeOutlineColor="#ff9933"
                                    secureTextEntry
                                    left={<TextInput.Icon icon="lock-check" />}
                                />
                                <Button
                                    mode="contained"
                                    onPress={handleResetPassword}
                                    disabled={forgotState.resetting}
                                    style={styles.submitButton}
                                    contentStyle={{ paddingVertical: 6 }}
                                    className="mt-1"
                                    labelStyle={{
                                        fontSize: 16,
                                        fontWeight: "700",
                                    }}
                                >
                                    {forgotState.resetting ? (
                                        <ActivityIndicator
                                            size="small"
                                            color="#ffffff"
                                        />
                                    ) : (
                                        "Set New Password"
                                    )}
                                </Button>
                            </View>
                        )}

                        <Button
                            mode="outlined"
                            onPress={() => updateForgot({ visible: false })}
                            textColor="#64748b"
                            style={{
                                borderColor: "#cbd5e1",
                                borderRadius: 12,
                                marginTop: 12,
                            }}
                            className="py-0.5"
                        >
                            Cancel
                        </Button>
                    </Surface>
                </View>
            </Modal>
        </View>
    );
}

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
        elevation: 4,
    },
    googleButton: {
        backgroundColor: "#5184ec",
        borderWidth: 0,
        borderRadius: 12,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 12,
        paddingHorizontal: 16,
        color: "#ffffff",
        elevation: 1,
    },
    googleIcon: {
        width: 18,
        height: 18,
    },
    googleButtonText: {
        fontSize: 16,
        fontWeight: "600",
        color: "#ffffff",
        letterSpacing: 0.2,
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
