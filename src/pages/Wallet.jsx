import React, { useState, useEffect } from "react";
import {
    View,
    FlatList,
    StyleSheet,
    Image,
    ScrollView,
    Linking,
} from "react-native";
import {
    Text,
    Card,
    Button,
    Avatar,
    TextInput,
    Surface,
    Portal,
    Modal,
    ActivityIndicator,
} from "react-native-paper";
import { useSelector, useDispatch } from "react-redux";
import { setWalletData } from "../store/slices/userSlice";
import useToast from "../hooks/useToast";
import apiService from "../utils/apiService";
import { launchImageLibrary } from "react-native-image-picker";
import { fileToBase64 } from "../utils/helperFunctions";

export default function Wallet() {
    const dispatch = useDispatch();
    const toast = useToast();
    const balance = useSelector((state) => state.user.walletBalance ?? 0.0);
    const transactions = useSelector(
        (state) => state.user.walletTransactions ?? []
    );

    const [amount, setAmount] = useState("");
    const [loading, setLoading] = useState(false);
    const [loadingQr, setLoadingQr] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Payment Modal State
    const [paymentModalVisible, setPaymentModalVisible] = useState(false);
    const [qrData, setQrData] = useState(null);
    const [txNumber, setTxNumber] = useState("");
    const [screenshot, setScreenshot] = useState(null);

    const fetchWalletData = async () => {
        try {
            const balanceRes = await apiService.get("wallets/balance");
            const transactionsRes = await apiService.get("wallets/history");
            if (balanceRes.success && transactionsRes.success) {
                dispatch(
                    setWalletData({
                        walletBalance: balanceRes.data.walletBalance,
                        walletTransactions: transactionsRes.data,
                    })
                );
            }
        } catch (error) {
            console.error("Error fetching wallet details:", error);
        }
    };

    useEffect(() => {
        fetchWalletData();
    }, []);

    const handleQuickAdd = (value) => {
        setAmount(value.toString());
    };

    const handleInitiateAddMoney = async () => {
        const numericAmount = parseFloat(amount);
        if (isNaN(numericAmount) || numericAmount <= 0) {
            toast.error("Please enter a valid amount.", "Error", true);
            return;
        }

        setLoadingQr(true);
        try {
            const res = await apiService.get(
                `wallets/qr?amount=${numericAmount}`
            );
            if (res && res.success) {
                setQrData(res.data);
                setTxNumber("");
                setScreenshot(null);
                setPaymentModalVisible(true);
            } else {
                toast.error(
                    res?.message || "Failed to load payment QR code",
                    "Error",
                    true
                );
            }
        } catch (error) {
            console.error("Error loading payment QR:", error);
            toast.error("Failed to connect to payment server", "Error", true);
        } finally {
            setLoadingQr(false);
        }
    };

    const handlePickScreenshot = async () => {
        const result = await launchImageLibrary({
            mediaType: "photo",
            quality: 0.8,
        });
        if (!result.didCancel && !result.errorCode) {
            setScreenshot(result.assets[0]);
        }
    };

    const handleSubmitPayment = async () => {
        if (!txNumber || txNumber.trim() === "") {
            toast.error(
                "Please enter the Transaction Number / Ref ID",
                "Validation Error",
                true
            );
            return;
        }
        if (!screenshot) {
            toast.error(
                "Please upload the payment screenshot",
                "Validation Error",
                true
            );
            return;
        }

        setSubmitting(true);
        try {
            let base64Image = null;
            if (screenshot.uri) {
                base64Image = await fileToBase64(screenshot.uri);
            }

            if (!base64Image) {
                toast.error(
                    "Failed to process payment screenshot",
                    "Error",
                    true
                );
                setSubmitting(false);
                return;
            }

            const res = await apiService.post("wallets/add", {
                amount: parseFloat(amount),
                transaction_number: txNumber.trim(),
                screenshot: base64Image,
            });

            if (res && res.success) {
                toast.success(
                    "Wallet request submitted successfully! Pending admin approval.",
                    "Submitted",
                    true
                );
                setPaymentModalVisible(false);
                setAmount("");
                setTxNumber("");
                setScreenshot(null);
                fetchWalletData(); // Refresh history & balance
            } else {
                toast.error(
                    res?.message || "Failed to submit request",
                    "Error",
                    true
                );
            }
        } catch (error) {
            console.error("Error submitting payment:", error);
            toast.error("Network request failed", "Error", true);
        } finally {
            setSubmitting(false);
        }
    };

    const formatDateTime = (isoString) => {
        if (!isoString) return "-";
        const date = new Date(isoString);
        return date.toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const renderHeader = () => (
        <View className="mb-6">
            {/* Balance Card */}
            <Surface
                elevation={4}
                className="bg-indigo-600 rounded-3xl p-6 overflow-hidden relative"
            >
                <View className="absolute -right-10 -bottom-10 opacity-10">
                    <Avatar.Icon
                        size={180}
                        icon="wallet"
                        style={{ backgroundColor: "transparent" }}
                        color="#fff"
                    />
                </View>
                <Text className="text-white opacity-80 text-sm font-semibold uppercase tracking-wider mb-2">
                    Available Balance
                </Text>
                <Text className="text-white text-4xl font-extrabold mb-4">
                    ₹{(balance ?? 0).toFixed(2)}
                </Text>
                <View className="flex-row items-center bg-indigo-700/50 self-start px-3 py-1 rounded-full">
                    <Avatar.Icon
                        size={16}
                        icon="shield-check"
                        style={{ backgroundColor: "transparent" }}
                        color="#38bdf8"
                    />
                    <Text className="text-sky-300 text-xs font-medium ml-1">
                        Secure 256-bit SSL Payment
                    </Text>
                </View>
            </Surface>

            {/* Quick Actions Card */}
            <Card className="mt-6 bg-white border border-slate-100 rounded-2xl elevation-1">
                <Card.Content className="p-5">
                    <Text className="text-base font-bold text-slate-800 mb-4">
                        Add Money to Wallet
                    </Text>

                    <TextInput
                        mode="outlined"
                        label="Amount (₹)"
                        placeholder="Enter amount"
                        keyboardType="numeric"
                        value={amount}
                        onChangeText={setAmount}
                        activeOutlineColor="#4338ca"
                        outlineColor="#cbd5e1"
                        className="bg-white mb-4"
                        left={<TextInput.Affix text="₹" />}
                    />

                    {/* Quick values buttons */}
                    <View className="flex-row justify-between mb-5">
                        {[100, 200, 500, 1000].map((val) => (
                            <Button
                                key={val}
                                mode="outlined"
                                compact
                                onPress={() => handleQuickAdd(val)}
                                textColor="#4338ca"
                                style={{
                                    borderColor: "#4338ca",
                                    flex: 1,
                                    marginHorizontal: 4,
                                }}
                                labelStyle={{
                                    fontSize: 12,
                                    fontWeight: "bold",
                                }}
                            >
                                +₹{val}
                            </Button>
                        ))}
                    </View>

                    <Button
                        mode="contained"
                        onPress={handleInitiateAddMoney}
                        loading={loadingQr}
                        disabled={loadingQr}
                        className="bg-indigo-600 rounded-xl py-1"
                        labelStyle={{ fontWeight: "bold", fontSize: 15 }}
                    >
                        Proceed to Add Money
                    </Button>
                </Card.Content>
            </Card>

            <Text className="text-lg font-bold text-slate-800 mt-6 mb-3">
                Transaction History
            </Text>
        </View>
    );

    return (
        <View className="flex-1 bg-slate-50">
            <FlatList
                data={transactions}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
                ListHeaderComponent={renderHeader}
                renderItem={({ item }) => {
                    const isCredit = item.type === "credit";
                    return (
                        <View className="flex-row items-center justify-between py-3.5 border-b bg-white px-4 rounded-xl mb-2 border border-slate-50 elevation-0">
                            <View className="flex-row items-center flex-1 pr-3">
                                <Avatar.Icon
                                    size={38}
                                    icon={
                                        isCredit
                                            ? "plus-circle"
                                            : "minus-circle"
                                    }
                                    style={{
                                        backgroundColor: isCredit
                                            ? "#dcfce7"
                                            : "#fee2e2",
                                    }}
                                    color={isCredit ? "#15803d" : "#b91c1c"}
                                />
                                <View className="ml-3 flex-1">
                                    <Text
                                        className="text-sm font-bold text-slate-800"
                                        numberOfLines={1}
                                    >
                                        {item.description}
                                    </Text>
                                    <View className="flex-row items-center mt-1">
                                        <Text className="text-xs text-slate-400">
                                            {formatDateTime(item.date)}
                                        </Text>
                                        <Text
                                            className={`text-[10px] ml-2 font-bold px-2 py-0.5 rounded-full uppercase ${
                                                item.status === "approved"
                                                    ? "bg-green-100 text-green-700"
                                                    : item.status === "rejected"
                                                    ? "bg-red-100 text-red-700"
                                                    : "bg-amber-100 text-amber-700"
                                            }`}
                                        >
                                            {item.status || "approved"}
                                        </Text>
                                    </View>
                                </View>
                            </View>
                            <Text
                                className={`text-sm font-extrabold ${
                                    isCredit ? "text-green-600" : "text-red-600"
                                }`}
                            >
                                {isCredit ? "+" : "-"} ₹{item.amount.toFixed(2)}
                            </Text>
                        </View>
                    );
                }}
                ListEmptyComponent={
                    <View className="items-center justify-center py-8">
                        <Avatar.Icon
                            size={64}
                            icon="history"
                            style={{ backgroundColor: "#f1f5f9" }}
                            color="#94a3b8"
                        />
                        <Text className="text-slate-400 mt-3 text-sm font-medium">
                            No transactions yet.
                        </Text>
                    </View>
                }
                showsVerticalScrollIndicator={false}
            />

            {/* UPI QR Payment Modal */}
            <Portal>
                <Modal
                    visible={paymentModalVisible}
                    onDismiss={() => {
                        if (!submitting) setPaymentModalVisible(false);
                    }}
                    contentContainerStyle={{
                        backgroundColor: "white",
                        padding: 24,
                        margin: 20,
                        borderRadius: 24,
                        maxHeight: "90%",
                    }}
                >
                    <ScrollView showsVerticalScrollIndicator={false}>
                        <Text className="text-lg font-bold text-center text-slate-800 mb-2">
                            Scan & Pay
                        </Text>
                        <Text className="text-xs text-center text-slate-400 mb-4">
                            Scan the QR code below using any UPI app (GPay,
                            PhonePe, Paytm) to transfer ₹
                            {parseFloat(amount || 0).toFixed(2)}
                        </Text>

                        {qrData?.qrCodeUrl && (
                            <View className="items-center justify-center mb-3">
                                <View className="p-3 border border-slate-100 rounded-2xl bg-slate-50 mb-2 self-center shadow-inner">
                                    <Image
                                        source={{ uri: qrData.qrCodeUrl }}
                                        style={{ width: 200, height: 200 }}
                                        resizeMode="contain"
                                    />
                                </View>
                                <Button
                                    mode="text"
                                    icon="download"
                                    onPress={async () => {
                                        if (qrData?.qrDownloadUrl) {
                                            try {
                                                await Linking.openURL(
                                                    qrData.qrDownloadUrl
                                                );
                                            } catch (err) {
                                                console.error(
                                                    "Failed to open QR code download link:",
                                                    err
                                                );
                                                toast.error(
                                                    "Could not open download link",
                                                    "Error",
                                                    true
                                                );
                                            }
                                        }
                                    }}
                                    textColor="#4338ca"
                                    labelStyle={{
                                        fontWeight: "bold",
                                        fontSize: 13,
                                    }}
                                    style={{ marginTop: 4 }}
                                >
                                    Save QR to Device
                                </Button>
                            </View>
                        )}

                        <Text className="text-xs font-semibold text-center text-slate-500 mb-4">
                            UPI ID:{" "}
                            <Text className="text-indigo-600 font-bold">
                                {qrData?.upiId || "gbt@upi"}
                            </Text>
                        </Text>

                        <TextInput
                            mode="outlined"
                            label="Transaction Ref No. / UTR"
                            placeholder="12-digit transaction number"
                            value={txNumber}
                            onChangeText={setTxNumber}
                            keyboardType="numeric"
                            activeOutlineColor="#4338ca"
                            outlineColor="#cbd5e1"
                            className="bg-white mb-4"
                        />

                        {screenshot ? (
                            <View className="items-center justify-center my-2 p-2 border border-dashed border-indigo-200 rounded-2xl bg-indigo-50/20">
                                <Image
                                    source={{ uri: screenshot.uri }}
                                    style={{ width: 120, height: 120 }}
                                    className="rounded-xl"
                                />
                                <Button
                                    compact
                                    mode="text"
                                    onPress={() => setScreenshot(null)}
                                    textColor="#dc2626"
                                    className="mt-2"
                                    labelStyle={{ fontWeight: "bold" }}
                                >
                                    Remove Screenshot
                                </Button>
                            </View>
                        ) : (
                            <Button
                                mode="outlined"
                                icon="upload"
                                onPress={handlePickScreenshot}
                                className="mb-6 rounded-xl border-indigo-200"
                                textColor="#4338ca"
                                labelStyle={{ fontWeight: "bold" }}
                            >
                                Upload Payment Screenshot
                            </Button>
                        )}

                        <View className="flex-row gap-3">
                            <Button
                                mode="outlined"
                                onPress={() => setPaymentModalVisible(false)}
                                disabled={submitting}
                                className="flex-1 rounded-xl border-slate-200"
                                textColor="#64748b"
                                labelStyle={{ fontWeight: "bold" }}
                            >
                                Cancel
                            </Button>
                            <Button
                                mode="contained"
                                onPress={handleSubmitPayment}
                                loading={submitting}
                                disabled={submitting}
                                className="flex-1 bg-indigo-600 rounded-xl"
                                labelStyle={{ fontWeight: "bold" }}
                            >
                                Submit Request
                            </Button>
                        </View>
                    </ScrollView>
                </Modal>
            </Portal>
        </View>
    );
}

const styles = StyleSheet.create({});
