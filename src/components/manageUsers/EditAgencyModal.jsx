import React from "react";
import { View, ScrollView, Modal, TouchableWithoutFeedback } from "react-native";
import { Text, TextInput, Button, Switch } from "react-native-paper";

export default function EditAgencyModal({
    visible,
    onDismiss,
    data,
    onChangeData,
    onSave,
}) {
    const isRequireApproval = Boolean(
        data?.require_booking_approval !== undefined
            ? data.require_booking_approval
            : data?.requireBookingApproval
    );

    return (
        <Modal
            visible={Boolean(visible)}
            transparent={true}
            animationType="fade"
            onRequestClose={onDismiss}
        >
            <TouchableWithoutFeedback onPress={onDismiss}>
                <View className="flex-1 bg-black/50 justify-center items-center p-4">
                    <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
                        <View className="bg-white rounded-3xl p-5 w-[92%] max-w-[500px] max-h-[85%] shadow-2xl">
                            <ScrollView showsVerticalScrollIndicator={false}>
                                <Text className="text-lg font-bold text-slate-800 mb-4">
                                    Edit Agency Details
                                </Text>

                                <TextInput
                                    label="Agency Name *"
                                    value={data.name}
                                    onChangeText={(text) => onChangeData({ ...data, name: text })}
                                    mode="outlined"
                                    dense
                                    className="bg-white mb-3"
                                    outlineColor="#e2e8f0"
                                    activeOutlineColor="#4338ca"
                                />
                                <TextInput
                                    label="Owner Name *"
                                    value={data.owner}
                                    onChangeText={(text) => onChangeData({ ...data, owner: text })}
                                    mode="outlined"
                                    dense
                                    className="bg-white mb-3"
                                    outlineColor="#e2e8f0"
                                    activeOutlineColor="#4338ca"
                                />
                                <TextInput
                                    label="Email Address"
                                    value={data.email}
                                    onChangeText={(text) => onChangeData({ ...data, email: text })}
                                    mode="outlined"
                                    dense
                                    keyboardType="email-address"
                                    className="bg-white mb-3"
                                    outlineColor="#e2e8f0"
                                    activeOutlineColor="#4338ca"
                                />
                                <TextInput
                                    label="Phone Number"
                                    value={data.phone_number}
                                    onChangeText={(text) => onChangeData({ ...data, phone_number: text })}
                                    mode="outlined"
                                    dense
                                    className="bg-white mb-3"
                                    outlineColor="#e2e8f0"
                                    activeOutlineColor="#4338ca"
                                />
                                <TextInput
                                    label="Address"
                                    value={data.address}
                                    onChangeText={(text) => onChangeData({ ...data, address: text })}
                                    mode="outlined"
                                    dense
                                    multiline
                                    className="bg-white mb-3"
                                    outlineColor="#e2e8f0"
                                    activeOutlineColor="#4338ca"
                                />
                                <TextInput
                                    label="Commission Percentage (%)"
                                    value={
                                        data.commission_percentage !== undefined && data.commission_percentage !== null
                                            ? String(data.commission_percentage)
                                            : ""
                                    }
                                    onChangeText={(text) => onChangeData({ ...data, commission_percentage: text })}
                                    mode="outlined"
                                    dense
                                    keyboardType="numeric"
                                    className="bg-white mb-4"
                                    outlineColor="#e2e8f0"
                                    activeOutlineColor="#4338ca"
                                />

                                {/* Require Booking Approval Toggle */}
                                <View className="flex-row items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl mb-4">
                                    <View className="flex-1 mr-2">
                                        <Text className="text-sm font-bold text-slate-800">
                                            Require Booking Approval
                                        </Text>
                                        <Text className="text-xs text-slate-500 mt-0.5">
                                            {isRequireApproval
                                                ? "Bookings require Agency Admin approval before confirmation."
                                                : "Bookings are automatically approved immediately."}
                                        </Text>
                                    </View>
                                    <Switch
                                        value={isRequireApproval}
                                        onValueChange={(val) =>
                                            onChangeData({
                                                ...data,
                                                require_booking_approval: val,
                                                requireBookingApproval: val,
                                            })
                                        }
                                        color="#4338ca"
                                    />
                                </View>

                                <View className="flex-row justify-end gap-2 mt-2">
                                    <Button
                                        mode="outlined"
                                        onPress={onDismiss}
                                        textColor="#64748b"
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        mode="contained"
                                        onPress={onSave}
                                        buttonColor="#4338ca"
                                        labelStyle={{ color: "white" }}
                                    >
                                        Save Changes
                                    </Button>
                                </View>
                            </ScrollView>
                        </View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
}
