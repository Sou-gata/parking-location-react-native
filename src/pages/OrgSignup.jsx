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
    Divider,
    Badge,
    Portal,
    Modal,
    RadioButton,
} from "react-native-paper";
import {
    BackHandler,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View,
    Image,
} from "react-native";
import ImageCropPicker from "react-native-image-crop-picker";
import {
    Image as ImageCompressor,
    Video as VideoCompressor,
} from "react-native-compressor";
import { setConnected } from "@maplibre/maplibre-react-native";
import { MaterialDesignIcons } from "@react-native-vector-icons/material-design-icons";
import { pick, isCancel } from "@react-native-documents/picker";
import { useDispatch } from "react-redux";
import { registerAgencyRequest } from "../store/slices/parkingSlice";

import SignupMap from "../components/SignupMap";
import apiService from "../utils/apiService";
import { fileToBase64 } from "../utils/helperFunctions";
import MediaViewerModal from "../components/MediaViewerModal";
import useToast from "../hooks/useToast";

const VEHICLE_TYPES = [
    {
        id: "twoWheeler",
        label: "Two-Wheeler (Bike/Scooter)",
        icon: "motorbike",
    },
    {
        id: "threeWheeler",
        label: "Three-Wheeler (Auto Rickshaw)",
        icon: "rickshaw",
    },
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
        photo: null,
        document: null, // Address Proof Document
        aadhaarCard: null, // Aadhaar Card Document
        orgMedia: [], // Optional up to 10 photos/videos
        cctvAvailable: "no",
        tradeLicense: "no",
        zoningClearance: "no",
        shopsEstablishmentLicense: "no",
        gstRegistration: "no",
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

    const [viewerState, setViewerState] = useState({
        visible: false,
        media: null,
    });

    const handleSelectImage = async () => {
        try {
            const croppedImage = await ImageCropPicker.openPicker({
                width: 500,
                height: 500,
                cropping: true,
                cropperCircleOverlay: false,
                mediaType: "photo",
                compressImageQuality: 0.9,
            });

            if (croppedImage && croppedImage.path) {
                const compressedUri = await ImageCompressor.compress(
                    croppedImage.path,
                    {
                        compressionMethod: "auto",
                        quality: 0.8,
                    }
                );

                setInputs((prev) => ({
                    ...prev,
                    photo: {
                        uri: compressedUri,
                        mime: croppedImage.mime,
                        width: croppedImage.width,
                        height: croppedImage.height,
                    },
                }));
            }
        } catch (error) {
            if (error?.code !== "E_PICKER_CANCELLED") {
                console.error("Image Picker Error:", error);
                toast.error("Failed to select/crop image.", "Error", true);
            }
        }
    };

    const handleSelectOrgMedia = async () => {
        if (inputs.orgMedia.length >= 10) {
            toast.error(
                "Maximum limit of 10 photos/videos reached.",
                "Limit Reached",
                true
            );
            return;
        }

        try {
            const mediaResult = await ImageCropPicker.openPicker({
                mediaType: "any",
                compressImageQuality: 0.9,
            });

            if (mediaResult && mediaResult.path) {
                const isVideo =
                    mediaResult.mime?.startsWith("video") ||
                    /\.(mp4|mov|avi|mkv|webm)$/i.test(mediaResult.path);

                if (isVideo) {
                    let durationSec = 0;
                    if (mediaResult.duration) {
                        durationSec = mediaResult.duration / 1000;
                    } else {
                        try {
                            const meta = await VideoCompressor.getVideoMetaData(
                                mediaResult.path
                            );
                            durationSec = meta.duration;
                        } catch (e) {}
                    }

                    if (durationSec > 45) {
                        toast.error(
                            "Video duration must not exceed 45 seconds.",
                            "Video Too Long",
                            true
                        );
                        return;
                    }

                    toast.info("Compressing video...", "Please Wait", true);
                    const compressedUri = await VideoCompressor.compress(
                        mediaResult.path,
                        { compressionMethod: "auto" }
                    );

                    setInputs((prev) => ({
                        ...prev,
                        orgMedia: [
                            ...prev.orgMedia,
                            {
                                uri: compressedUri,
                                type: "video",
                                mime: mediaResult.mime || "video/mp4",
                                name: `org_video_${Date.now()}.mp4`,
                            },
                        ],
                    }));
                } else {
                    const compressedUri = await ImageCompressor.compress(
                        mediaResult.path,
                        {
                            compressionMethod: "auto",
                            quality: 0.8,
                        }
                    );

                    setInputs((prev) => ({
                        ...prev,
                        orgMedia: [
                            ...prev.orgMedia,
                            {
                                uri: compressedUri,
                                type: "photo",
                                mime: mediaResult.mime || "image/jpeg",
                                name: `org_photo_${Date.now()}.jpg`,
                            },
                        ],
                    }));
                }
            }
        } catch (error) {
            if (error?.code !== "E_PICKER_CANCELLED") {
                console.error("Media Picker Error:", error);
                toast.error("Failed to pick/compress media.", "Error", true);
            }
        }
    };

    const handleRemoveOrgMedia = (index) => {
        setInputs((prev) => ({
            ...prev,
            orgMedia: prev.orgMedia.filter((_, i) => i !== index),
        }));
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

    const handleAadhaarPick = async () => {
        try {
            const [pickerResult] = await pick({
                type: ["image/*", "application/pdf"],
            });
            setInputs({ ...inputs, aadhaarCard: pickerResult });
        } catch (err) {
            if (isCancel(err)) {
                console.log("User cancelled Aadhaar picker");
            } else {
                console.error("AadhaarPicker Error:", err);
            }
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

        if (!inputs.aadhaarCard) {
            toast.error("Please upload your Aadhaar Card.", "Error", true);
            return;
        }

        if (!inputs.document) {
            toast.error(
                "Please upload your Address Proof Document.",
                "Error",
                true
            );
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
            /* Standard JSON + Base64 Upload Process (Commented Out)
            let photoBase64 = null;
            let documentBase64 = null;
            let aadhaarBase64 = null;

            if (inputs.photo && inputs.photo.uri) {
                photoBase64 = await fileToBase64(inputs.photo.uri);
            }

            if (inputs.document && inputs.document.uri) {
                documentBase64 = await fileToBase64(inputs.document.uri);
            }

            if (inputs.aadhaarCard && inputs.aadhaarCard.uri) {
                aadhaarBase64 = await fileToBase64(inputs.aadhaarCard.uri);
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
                aadhaar_card: aadhaarBase64,
            };

            // Add vehicle capacities
            VEHICLE_TYPES.forEach((type) => {
                const v = inputs.vehicles[type.id];
                const snakeId = type.id.replace(
                    /[A-Z]/g,
                    (l) => `_${l.toLowerCase()}`
                );
                registrationData[`${snakeId}_capacity`] = Number(
                    v.capacity || 0
                );
                if (type.id === "ev") {
                    registrationData.ev_charging_support = v.chargingSupport
                        ? true
                        : false;
                }
            });

            await apiService.post("users/orgregister", registrationData);

            dispatch(registerAgencyRequest(registrationData));
            */

            // FormData Upload Process
            const formData = new FormData();
            formData.append("org_name", inputs.name);
            formData.append("username", inputs.username);
            formData.append("email", inputs.email);
            formData.append("phone_number", inputs.phoneNumber);
            formData.append("password", inputs.password);
            formData.append("org_address", inputs.address || "");
            formData.append("landmark", inputs.landmark || "");
            formData.append("latitude", String(Number(inputs.latitude || 0)));
            formData.append("longitude", String(Number(inputs.longitude || 0)));

            if (inputs.photo && inputs.photo.uri) {
                const photoBase64 = await fileToBase64(inputs.photo.uri);
                if (photoBase64) {
                    formData.append("profile_photo", photoBase64);
                } else {
                    formData.append("profile_photo", {
                        uri: inputs.photo.uri,
                        name: "profile_photo.jpg",
                        type: inputs.photo.mime || "image/jpeg",
                    });
                }
            }

            if (inputs.document && inputs.document.uri) {
                const docBase64 = await fileToBase64(inputs.document.uri);
                if (docBase64) {
                    formData.append("verification_document", docBase64);
                } else {
                    formData.append("verification_document", {
                        uri: inputs.document.uri,
                        name: inputs.document.name || "document.pdf",
                        type: inputs.document.type || "application/pdf",
                    });
                }
            }

            if (inputs.aadhaarCard && inputs.aadhaarCard.uri) {
                const aadhaarBase64 = await fileToBase64(
                    inputs.aadhaarCard.uri
                );
                if (aadhaarBase64) {
                    formData.append("aadhaar_card", aadhaarBase64);
                } else {
                    formData.append("aadhaar_card", {
                        uri: inputs.aadhaarCard.uri,
                        name: inputs.aadhaarCard.name || "aadhaar.pdf",
                        type: inputs.aadhaarCard.type || "application/pdf",
                    });
                }
            }

            // Append optional orgMedia items (photos & videos up to 10)
            if (inputs.orgMedia && inputs.orgMedia.length > 0) {
                for (let i = 0; i < inputs.orgMedia.length; i++) {
                    const item = inputs.orgMedia[i];
                    const b64 = await fileToBase64(item.uri);
                    if (b64) {
                        formData.append("org_media", b64);
                    } else {
                        formData.append("org_media", {
                            uri: item.uri,
                            name:
                                item.name ||
                                `media_${i}.${
                                    item.type === "video" ? "mp4" : "jpg"
                                }`,
                            type:
                                item.mime ||
                                (item.type === "video"
                                    ? "video/mp4"
                                    : "image/jpeg"),
                        });
                    }
                }
            }

            // Add vehicle capacities
            VEHICLE_TYPES.forEach((type) => {
                const v = inputs.vehicles[type.id];
                const snakeId = type.id.replace(
                    /[A-Z]/g,
                    (l) => `_${l.toLowerCase()}`
                );
                formData.append(
                    `${snakeId}_capacity`,
                    String(Number(v.capacity || 0))
                );
                if (type.id === "ev") {
                    formData.append(
                        "ev_charging_support",
                        v.chargingSupport ? "true" : "false"
                    );
                }
            });

            // Append compliance & clearance details
            formData.append(
                "cctv_available",
                inputs.cctvAvailable === "yes" ? "true" : "false"
            );
            formData.append(
                "trade_license",
                inputs.tradeLicense === "yes" ? "true" : "false"
            );
            formData.append(
                "zoning_clearance",
                inputs.zoningClearance === "yes" ? "true" : "false"
            );
            formData.append(
                "shops_establishment_license",
                inputs.shopsEstablishmentLicense === "yes" ? "true" : "false"
            );
            formData.append(
                "gst_registration",
                inputs.gstRegistration === "yes" ? "true" : "false"
            );

            await apiService.post("users/orgregister", formData);

            dispatch(
                registerAgencyRequest({
                    org_name: inputs.name,
                    username: inputs.username,
                    email: inputs.email,
                    phone_number: inputs.phoneNumber,
                    password: inputs.password,
                    org_address: inputs.address || "",
                    landmark: inputs.landmark || "",
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
                                label="Organization Address"
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
                    {/* Verification Documents Section */}
                    <Card style={styles.card}>
                        <Card.Content className="gap-4">
                            <Text
                                style={{ fontWeight: "bold" }}
                                className="text-lg text-gray-800"
                            >
                                Verification Documents
                            </Text>

                            {/* Aadhaar Card Upload */}
                            <Text
                                style={{ fontWeight: "bold" }}
                                className="text-sm text-slate-700 mt-2"
                            >
                                Aadhaar Card *
                            </Text>
                            <Text className="text-gray-500 text-xs mt-0">
                                Upload a clear copy of your Aadhaar Card (Image
                                or PDF)
                            </Text>
                            <TouchableOpacity
                                onPress={handleAadhaarPick}
                                activeOpacity={0.7}
                                style={styles.uploadArea}
                                className="items-center justify-center py-6 bg-gray-50/50 rounded-xl"
                            >
                                {inputs.aadhaarCard ? (
                                    <View className="items-center gap-2 px-4">
                                        <MaterialDesignIcons
                                            name={
                                                inputs.aadhaarCard.type ===
                                                "application/pdf"
                                                    ? "file-pdf-box"
                                                    : "file-image"
                                            }
                                            size={36}
                                            color="#4338ca"
                                        />
                                        <Text
                                            className="text-primary font-bold text-center text-xs"
                                            numberOfLines={1}
                                        >
                                            {inputs.aadhaarCard.name}
                                        </Text>
                                        <Button
                                            mode="text"
                                            onPress={() =>
                                                setInputs({
                                                    ...inputs,
                                                    aadhaarCard: null,
                                                })
                                            }
                                            textColor="#ef4444"
                                            className="mt-1"
                                            compact
                                        >
                                            Remove File
                                        </Button>
                                    </View>
                                ) : (
                                    <View className="items-center gap-2">
                                        <MaterialDesignIcons
                                            name="cloud-upload"
                                            size={24}
                                            color="#4338ca"
                                        />
                                        <Text className="text-gray-700 font-bold text-xs text-center">
                                            Tap to upload Aadhaar Card
                                        </Text>
                                    </View>
                                )}
                            </TouchableOpacity>

                            <Divider className="my-2 bg-slate-100" />

                            {/* Address Proof Document Upload */}
                            <Text
                                style={{ fontWeight: "bold" }}
                                className="text-sm text-slate-700"
                            >
                                Address Proof Document *
                            </Text>
                            <Text className="text-gray-500 text-xs mt-0">
                                Upload trade license, utility bill, or rent
                                agreement (Image or PDF)
                            </Text>
                            <TouchableOpacity
                                onPress={handleDocumentPick}
                                activeOpacity={0.7}
                                style={styles.uploadArea}
                                className="items-center justify-center py-6 bg-gray-50/50 rounded-xl"
                            >
                                {inputs.document ? (
                                    <View className="items-center gap-2 px-4">
                                        <MaterialDesignIcons
                                            name={
                                                inputs.document.type ===
                                                "application/pdf"
                                                    ? "file-pdf-box"
                                                    : "file-image"
                                            }
                                            size={36}
                                            color="#4338ca"
                                        />
                                        <Text
                                            className="text-primary font-bold text-center text-xs"
                                            numberOfLines={1}
                                        >
                                            {inputs.document.name}
                                        </Text>
                                        <Button
                                            mode="text"
                                            onPress={() =>
                                                setInputs({
                                                    ...inputs,
                                                    document: null,
                                                })
                                            }
                                            textColor="#ef4444"
                                            className="mt-1"
                                            compact
                                        >
                                            Remove File
                                        </Button>
                                    </View>
                                ) : (
                                    <View className="items-center gap-2">
                                        <MaterialDesignIcons
                                            name="cloud-upload"
                                            size={24}
                                            color="#4338ca"
                                        />
                                        <Text className="text-gray-700 font-bold text-xs text-center">
                                            Tap to upload Address Proof
                                        </Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        </Card.Content>
                    </Card>

                    {/* Organization Media Photos & Videos (Optional) */}
                    <Card style={styles.card}>
                        <Card.Content className="gap-4">
                            <View className="flex-row justify-between items-center">
                                <View>
                                    <Text
                                        style={{ fontWeight: "bold" }}
                                        className="text-lg text-gray-800"
                                    >
                                        Organization Photos & Videos
                                    </Text>
                                    <Text className="text-gray-500 text-xs">
                                        Optional (Up to 10 items, videos max
                                        45s)
                                    </Text>
                                </View>
                                <Badge className="bg-indigo-100 text-indigo-800 font-bold px-2">
                                    {inputs.orgMedia.length}/10
                                </Badge>
                            </View>

                            <TouchableOpacity
                                onPress={handleSelectOrgMedia}
                                activeOpacity={0.7}
                                style={styles.uploadArea}
                                className="items-center justify-center py-5 bg-indigo-50/50 border-dashed border-2 border-indigo-200 rounded-xl"
                            >
                                <View className="items-center gap-2">
                                    <MaterialDesignIcons
                                        name="file-video-outline"
                                        size={28}
                                        color="#4338ca"
                                    />
                                    <Text className="text-indigo-900 font-bold text-xs text-center">
                                        + Add Photo or Video
                                    </Text>
                                    <Text className="text-gray-400 text-[10px]">
                                        Images & Videos will be compressed
                                        automatically
                                    </Text>
                                </View>
                            </TouchableOpacity>

                            {inputs.orgMedia.length > 0 && (
                                <View className="flex-row flex-wrap gap-2 mt-2">
                                    {inputs.orgMedia.map((m, idx) => (
                                        <View
                                            key={idx}
                                            className="relative w-24 h-24 rounded-lg overflow-hidden bg-slate-100 border border-slate-200 items-center justify-center"
                                        >
                                            <TouchableOpacity
                                                activeOpacity={0.8}
                                                className="w-full h-full justify-center items-center"
                                                onPress={() =>
                                                    setViewerState({
                                                        visible: true,
                                                        media: {
                                                            uri: m.uri,
                                                            type: m.type,
                                                            title: `Media ${
                                                                idx + 1
                                                            } (${m.type})`,
                                                        },
                                                    })
                                                }
                                            >
                                                {m.type === "photo" ? (
                                                    <Image
                                                        source={{ uri: m.uri }}
                                                        className="w-full h-full"
                                                        resizeMode="cover"
                                                    />
                                                ) : (
                                                    <View className="items-center justify-center p-2 bg-slate-900/80 w-full h-full">
                                                        <MaterialDesignIcons
                                                            name="play-circle-outline"
                                                            size={32}
                                                            color="#ffffff"
                                                        />
                                                        <Text className="text-white text-[10px] font-bold mt-1">
                                                            Video
                                                        </Text>
                                                    </View>
                                                )}
                                            </TouchableOpacity>

                                            <TouchableOpacity
                                                onPress={() =>
                                                    handleRemoveOrgMedia(idx)
                                                }
                                                className="absolute top-1 right-1 bg-red-600/90 rounded-full p-1 z-10"
                                            >
                                                <MaterialDesignIcons
                                                    name="close"
                                                    size={14}
                                                    color="#ffffff"
                                                />
                                            </TouchableOpacity>
                                        </View>
                                    ))}
                                </View>
                            )}
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
                                                    inputs.vehicles[vehicle.id]
                                                        .selected
                                                        ? "#4338ca"
                                                        : "#64748b"
                                                }
                                            />
                                        )}
                                        style={styles.accordion}
                                        titleStyle={{
                                            color: inputs.vehicles[vehicle.id]
                                                .selected
                                                ? "#4338ca"
                                                : "#1e293b",
                                            fontWeight: inputs.vehicles[
                                                vehicle.id
                                            ].selected
                                                ? "700"
                                                : "400",
                                        }}
                                    >
                                        <View
                                            className="pb-4 pt-2 gap-4 bg-gray-50/50"
                                            style={{
                                                paddingHorizontal: 16,
                                                overflow: "visible",
                                            }}
                                        >
                                            <Checkbox.Item
                                                label="Enable this category"
                                                status={
                                                    inputs.vehicles[vehicle.id]
                                                        .selected
                                                        ? "checked"
                                                        : "unchecked"
                                                }
                                                onPress={() => {
                                                    const currentV =
                                                        inputs.vehicles[
                                                            vehicle.id
                                                        ];
                                                    setInputs({
                                                        ...inputs,
                                                        vehicles: {
                                                            ...inputs.vehicles,
                                                            [vehicle.id]: {
                                                                ...currentV,
                                                                selected:
                                                                    !currentV.selected,
                                                            },
                                                        },
                                                    });
                                                }}
                                                color="#4338ca"
                                                mode="android"
                                            />

                                            {inputs.vehicles[vehicle.id]
                                                .selected && (
                                                <View
                                                    className="gap-4"
                                                    style={{
                                                        padding: 4,
                                                        overflow: "visible",
                                                    }}
                                                >
                                                    <TextInput
                                                        label="Total Vehicle Capacity"
                                                        value={
                                                            inputs.vehicles[
                                                                vehicle.id
                                                            ].capacity
                                                        }
                                                        onChangeText={(text) =>
                                                            setInputs({
                                                                ...inputs,
                                                                vehicles: {
                                                                    ...inputs.vehicles,
                                                                    [vehicle.id]:
                                                                        {
                                                                            ...inputs
                                                                                .vehicles[
                                                                                vehicle
                                                                                    .id
                                                                            ],
                                                                            capacity:
                                                                                text,
                                                                        },
                                                                },
                                                            })
                                                        }
                                                        mode="outlined"
                                                        keyboardType="numeric"
                                                        outlineColor="#e2e8f0"
                                                        activeOutlineColor="#4338ca"
                                                        style={{
                                                            backgroundColor:
                                                                "white",
                                                            marginHorizontal: 6,
                                                        }}
                                                        outlineStyle={{
                                                            backgroundColor:
                                                                "white",
                                                            borderColor:
                                                                "#e2e8f0",
                                                        }}
                                                    />

                                                    {vehicle.id === "ev" && (
                                                        <View className="flex-row items-center justify-between px-2 bg-indigo-50/50 p-3 rounded-lg border border-indigo-100">
                                                            <View>
                                                                <Text className="font-semibold text-indigo-900">
                                                                    Charging
                                                                    Support
                                                                </Text>
                                                                <Text className="text-xs text-indigo-600">
                                                                    Availability
                                                                    of charging
                                                                    ports
                                                                </Text>
                                                            </View>
                                                            <Switch
                                                                value={
                                                                    inputs
                                                                        .vehicles
                                                                        .ev
                                                                        .chargingSupport
                                                                }
                                                                onValueChange={(
                                                                    val
                                                                ) =>
                                                                    setInputs({
                                                                        ...inputs,
                                                                        vehicles:
                                                                            {
                                                                                ...inputs.vehicles,
                                                                                ev: {
                                                                                    ...inputs
                                                                                        .vehicles
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

                    {/* Compliance & Clearances Card */}
                    <Card className="mb-4 bg-white rounded-2xl shadow-sm border border-slate-200">
                        <Card.Title
                            title="Compliance & Clearances"
                            subtitle="Mandatory facility details & license declarations"
                            titleStyle={{ fontWeight: "bold", fontSize: 18 }}
                            left={(props) => (
                                <Avatar.Icon
                                    {...props}
                                    icon="file-certificate-outline"
                                    style={{ backgroundColor: "#e0e7ff" }}
                                    color="#4338ca"
                                />
                            )}
                        />
                        <Card.Content className="gap-4">
                            {[
                                {
                                    key: "cctvAvailable",
                                    label: "CCTV Available",
                                    subtitle: "Is CCTV surveillance active at facility?",
                                    icon: "cctv",
                                },
                                {
                                    key: "tradeLicense",
                                    label: "Trade License",
                                    subtitle: "Valid Trade License issued by local authority",
                                    icon: "text-box-check-outline",
                                },
                                {
                                    key: "zoningClearance",
                                    label: "Zoning & Land Use Clearance",
                                    subtitle: "Commercial / Parking zoning clearance approved",
                                    icon: "map-check-outline",
                                },
                                {
                                    key: "shopsEstablishmentLicense",
                                    label: "Shops & Establishments License",
                                    subtitle: "Registered under Shops & Establishments Act",
                                    icon: "store-check-outline",
                                },
                                {
                                    key: "gstRegistration",
                                    label: "GST Registration",
                                    subtitle: "Valid Goods and Services Tax identification",
                                    icon: "cash-check",
                                },
                            ].map((item, idx, arr) => (
                                <View key={item.key}>
                                    <View className="flex-row items-center justify-between py-1">
                                        <View className="flex-1 mr-2">
                                            <Text className="font-semibold text-slate-800 text-sm">
                                                {item.label}
                                            </Text>
                                            <Text className="text-xs text-slate-500 mt-0.5">
                                                {item.subtitle}
                                            </Text>
                                        </View>
                                        <RadioButton.Group
                                            onValueChange={(val) =>
                                                setInputs((prev) => ({
                                                    ...prev,
                                                    [item.key]: val,
                                                }))
                                            }
                                            value={inputs[item.key]}
                                        >
                                            <View className="flex-row items-center gap-2">
                                                <TouchableOpacity
                                                    className="flex-row items-center"
                                                    onPress={() =>
                                                        setInputs((prev) => ({
                                                            ...prev,
                                                            [item.key]: "yes",
                                                        }))
                                                    }
                                                    activeOpacity={0.7}
                                                >
                                                    <RadioButton
                                                        value="yes"
                                                        color="#4338ca"
                                                        uncheckedColor="#cbd5e1"
                                                    />
                                                    <Text className="text-xs font-bold text-slate-700">
                                                        Yes
                                                    </Text>
                                                </TouchableOpacity>

                                                <TouchableOpacity
                                                    className="flex-row items-center"
                                                    onPress={() =>
                                                        setInputs((prev) => ({
                                                            ...prev,
                                                            [item.key]: "no",
                                                        }))
                                                    }
                                                    activeOpacity={0.7}
                                                >
                                                    <RadioButton
                                                        value="no"
                                                        color="#4338ca"
                                                        uncheckedColor="#cbd5e1"
                                                    />
                                                    <Text className="text-xs font-bold text-slate-700">
                                                        No
                                                    </Text>
                                                </TouchableOpacity>
                                            </View>
                                        </RadioButton.Group>
                                    </View>
                                    {idx < arr.length - 1 && (
                                        <Divider className="my-2 bg-slate-100" />
                                    )}
                                </View>
                            ))}
                        </Card.Content>
                    </Card>
                    {/* Terms & Conditions Checkbox Row */}
                    <View className="flex-row items-center bg-white p-3 rounded-2xl border border-slate-200 mt-2 mb-1">
                        <Checkbox
                            status={acceptedTerms ? "checked" : "unchecked"}
                            onPress={() => setAcceptedTerms(!acceptedTerms)}
                            color="#b45309"
                        />
                        <View className="flex-1 ml-1 flex-row flex-wrap items-center">
                            <Text className="text-slate-700 text-xs font-semibold">
                                I agree to the{" "}
                            </Text>
                            <TouchableOpacity
                                onPress={() => setTermsModalVisible(true)}
                            >
                                <Text className="text-amber-800 font-bold text-xs underline">
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
                            buttonColor="#b45309"
                            className="rounded-xl"
                        >
                            I Accept Terms
                        </Button>
                    </View>
                </Modal>
            </Portal>

            <MediaViewerModal
                visible={viewerState.visible}
                onDismiss={() =>
                    setViewerState({ visible: false, media: null })
                }
                media={viewerState.media}
            />
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
