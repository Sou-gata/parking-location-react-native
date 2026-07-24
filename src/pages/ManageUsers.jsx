import React from "react";
import { View } from "react-native";
import { Text } from "react-native-paper";
import useRolePermissions from "../hooks/useRolePermissions";
import { ROLES } from "../utils/rbacConfig";
import SuperAdminManageUsers from "./SuperAdminManageUsers";
import AgencyAdminManageUsers from "./AgencyAdminManageUsers";

export default function ManageUsers({ route, navigation }) {
    const { role } = useRolePermissions();

    if (role === ROLES.SUPER_ADMIN) {
        return <SuperAdminManageUsers route={route} navigation={navigation} />;
    }

    if (role === ROLES.AGENCY_ADMIN) {
        return <AgencyAdminManageUsers route={route} navigation={navigation} />;
    }

    return (
        <View className="flex-1 justify-center items-center bg-slate-50">
            <Text variant="titleMedium">Access Denied: Insufficient Permissions</Text>
        </View>
    );
}
