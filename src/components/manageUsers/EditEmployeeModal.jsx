import React from "react";
import { View, ScrollView, Modal, TouchableWithoutFeedback } from "react-native";
import { Text, TextInput, Button, SegmentedButtons } from "react-native-paper";
import { ROLES } from "../../utils/rbacConfig";

export default function EditEmployeeModal({
    visible,
    onDismiss,
    data,
    onChangeData,
    onSave,
}) {
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
                                    Edit Employee Details
                                </Text>

                                <TextInput
                                    label="Full Name *"
                                    value={data.name}
                                    onChangeText={(text) => onChangeData({ ...data, name: text })}
                                    mode="outlined"
                                    dense
                                    className="bg-white mb-3"
                                    outlineColor="#e2e8f0"
                                    activeOutlineColor="#4338ca"
                                />
                                <TextInput
                                    label="Username *"
                                    value={data.username}
                                    onChangeText={(text) => onChangeData({ ...data, username: text })}
                                    mode="outlined"
                                    dense
                                    autoCapitalize="none"
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
                                    keyboardType="phone-pad"
                                    className="bg-white mb-4"
                                    outlineColor="#e2e8f0"
                                    activeOutlineColor="#4338ca"
                                />

                                <Text className="text-sm font-semibold text-slate-700 mb-2">
                                    Role Permissions
                                </Text>
                                <SegmentedButtons
                                    value={data.role}
                                    onValueChange={(val) => onChangeData({ ...data, role: val })}
                                    buttons={[
                                        {
                                            value: ROLES.AGENCY_USER,
                                            label: "Staff (Operator)",
                                        },
                                        { value: ROLES.AGENCY_ADMIN, label: "Admin" },
                                    ]}
                                    theme={{ colors: { primary: "#4338ca" } }}
                                    style={{ marginBottom: 16 }}
                                />

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
                                        Save Details
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
