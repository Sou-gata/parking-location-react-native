import React from "react";
import { View } from "react-native";
import { Modal, Text, TextInput, Button } from "react-native-paper";

export default function EditAgencyModal({
    visible,
    onDismiss,
    data,
    onChangeData,
    onSave,
}) {
    return (
        <Modal
            visible={visible}
            onDismiss={onDismiss}
            className="bg-white p-6 m-5 rounded-2xl max-w-[500px] self-center w-[90%]"
        >
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
                className="bg-white mb-4"
                outlineColor="#e2e8f0"
                activeOutlineColor="#4338ca"
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
                    Save Changes
                </Button>
            </View>
        </Modal>
    );
}
