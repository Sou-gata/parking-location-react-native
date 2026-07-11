import React from "react";
import { View } from "react-native";
import { Text } from "react-native-paper";
import useRolePermissions from "../hooks/useRolePermissions";
import { ROLES } from "../utils/rbacConfig";
import SuperAdminManageUsers from "./SuperAdminManageUsers";
import AgencyAdminManageUsers from "./AgencyAdminManageUsers";

export default function ManageUsers({ navigation }) {
    const { role } = useRolePermissions();

    if (role === ROLES.SUPER_ADMIN) {
        return <SuperAdminManageUsers navigation={navigation} />;
    }

    if (role === ROLES.AGENCY_ADMIN) {
        return <AgencyAdminManageUsers navigation={navigation} />;
    }

    return (
        <View className="flex-1 justify-center items-center bg-slate-50">
            <Text variant="titleMedium">Access Denied: Insufficient Permissions</Text>
        </View>
    );
}
