import React from "react";
import { View } from "react-native";
import useRolePermissions from "../hooks/useRolePermissions";
import WorkingHoursTab from "../components/manageParking/WorkingHoursTab";

export default function WorkingHours({ navigation }) {
    const { user } = useRolePermissions();
    const agencyId = user?.agencyId || user?.org_id;

    return (
        <View className="flex-1 bg-slate-50">
            <WorkingHoursTab agencyId={agencyId} />
        </View>
    );
}
