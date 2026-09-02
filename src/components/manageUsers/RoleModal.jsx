import React from "react";
import { View, ScrollView, Modal, TouchableWithoutFeedback } from "react-native";
import { Text, Divider, RadioButton, Button } from "react-native-paper";
import { ROLES, ROLE_DISPLAY_NAMES } from "../../utils/rbacConfig";

export default function RoleModal({
    visible,
    onDismiss,
    selectedUser,
    selectedRole,
    onChangeRole,
    onSubmit,
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
                        <View className="bg-white rounded-3xl p-5 w-[92%] max-w-[480px] shadow-2xl">
                            <Text className="text-lg font-bold text-slate-800 mb-2">
                                Modify User Role
                            </Text>
                            <Text className="text-sm text-slate-500 mb-4">
                                Select a new role and permissions level for{" "}
                                <Text className="font-bold text-slate-700">
                                    {selectedUser?.name}
                                </Text>
                                .
                            </Text>

                            <Divider className="mb-2 bg-slate-100" />

                            <ScrollView style={{ maxHeight: 300 }}>
                                <RadioButton.Group
                                    onValueChange={onChangeRole}
                                    value={selectedRole}
                                >
                                    {Object.keys(ROLES).map((roleKey) => {
                                        const roleValue = ROLES[roleKey];
                                        return (
                                            <View
                                                key={roleValue}
                                                className="flex-row items-center justify-between py-1.5 px-1"
                                            >
                                                <Text className="text-sm text-slate-700 font-medium">
                                                    {ROLE_DISPLAY_NAMES[roleValue]}
                                                </Text>
                                                <RadioButton
                                                    value={roleValue}
                                                    color="#4338ca"
                                                    uncheckedColor="#cbd5e1"
                                                />
                                            </View>
                                        );
                                    })}
                                </RadioButton.Group>
                            </ScrollView>

                            <Divider className="my-3 bg-slate-100" />

                            <View className="flex-row justify-end gap-2">
                                <Button
                                    mode="outlined"
                                    onPress={onDismiss}
                                    textColor="#64748b"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    mode="contained"
                                    onPress={onSubmit}
                                    buttonColor="#4338ca"
                                    labelStyle={{ color: "white" }}
                                >
                                    Save Changes
                                </Button>
                            </View>
                        </View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
}
