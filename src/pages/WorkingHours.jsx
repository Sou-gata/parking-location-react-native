import React, { useState, useEffect, useCallback } from "react";
import { View, ScrollView } from "react-native";
import { Text, Surface, ActivityIndicator } from "react-native-paper";
import Chip from "../components/Chip";
import { MaterialDesignIcons } from "@react-native-vector-icons/material-design-icons";
import { useSelector } from "react-redux";
import useRolePermissions from "../hooks/useRolePermissions";
import { ROLES } from "../utils/rbacConfig";
import apiService from "../utils/apiService";
import WorkingHoursTab from "../components/manageParking/WorkingHoursTab";

export default function WorkingHours({ navigation, route }) {
    const { role, user } = useRolePermissions();
    const isSuperAdmin = role === ROLES.SUPER_ADMIN;

    // Redux fallback for agencies
    const reduxAgencies = useSelector((state) => state.parking?.agencies || []);

    const [agencies, setAgencies] = useState([]);
    const [loadingAgencies, setLoadingAgencies] = useState(isSuperAdmin);
    const [selectedAgencyId, setSelectedAgencyId] = useState(
        route?.params?.agencyId || route?.params?.id || null
    );

    // Resolve agency ID for Agency Admin / Staff
    const userAgencyId =
        route?.params?.agencyId ||
        route?.params?.id ||
        user?.agencyId ||
        user?.agency_id ||
        user?.org_id ||
        (role === ROLES.AGENCY_ADMIN ? user?.id : null);

    const fetchAgencies = useCallback(async () => {
        if (!isSuperAdmin) return;
        setLoadingAgencies(true);
        try {
            const res = await apiService.get("agencies");
            if (res && res.success && Array.isArray(res.data)) {
                const mapped = res.data.map((a) => ({
                    ...a,
                    id: a.org_id || a.id,
                    name: a.org_name || a.name,
                    address:
                        a.org_address || a.address || "No address provided",
                }));
                setAgencies(mapped);
                if (mapped.length > 0) {
                    setSelectedAgencyId((prev) => {
                        if (
                            prev &&
                            mapped.some((m) => String(m.id) === String(prev))
                        ) {
                            return prev;
                        }
                        return mapped[0].id;
                    });
                }
            } else if (reduxAgencies.length > 0) {
                setAgencies(reduxAgencies);
                setSelectedAgencyId((prev) => prev || reduxAgencies[0]?.id);
            }
        } catch (error) {
            console.error("Error fetching agencies for Working Hours:", error);
            if (reduxAgencies.length > 0) {
                setAgencies(reduxAgencies);
                setSelectedAgencyId((prev) => prev || reduxAgencies[0]?.id);
            }
        } finally {
            setLoadingAgencies(false);
        }
    }, [isSuperAdmin, reduxAgencies]);

    useEffect(() => {
        if (isSuperAdmin) {
            fetchAgencies();
        } else {
            setSelectedAgencyId(userAgencyId);
        }
    }, [isSuperAdmin, userAgencyId, fetchAgencies]);

    // Active agency resolution
    const effectiveAgencyId = isSuperAdmin
        ? selectedAgencyId
        : selectedAgencyId || userAgencyId;

    const currentAgency = isSuperAdmin
        ? agencies.find((a) => String(a.id) === String(selectedAgencyId)) ||
          agencies[0]
        : {
              id: effectiveAgencyId,
              name: user?.org_name || user?.name || "My Agency",
              address:
                  user?.org_address ||
                  user?.address ||
                  "Registered Agency Location",
          };

    if (isSuperAdmin && loadingAgencies && agencies.length === 0) {
        return (
            <View className="flex-1 bg-slate-50 items-center justify-center py-12">
                <ActivityIndicator size="large" color="#ff9933" />
                <Text className="text-slate-500 font-semibold text-xs mt-3">
                    Loading Agencies...
                </Text>
            </View>
        );
    }

    if (isSuperAdmin && agencies.length === 0 && !loadingAgencies) {
        return (
            <View className="flex-1 bg-slate-50 items-center justify-center p-6">
                <MaterialDesignIcons
                    name="office-building-marker"
                    size={54}
                    color="#94a3b8"
                />
                <Text className="text-slate-800 font-bold text-base mt-3">
                    No Agencies Found
                </Text>
                <Text className="text-slate-500 text-xs text-center mt-1">
                    There are currently no active agencies registered in the
                    system.
                </Text>
            </View>
        );
    }

    return (
        <View className="flex-1 bg-slate-50">
            {/* Agency Header Banner */}
            {Boolean(currentAgency) && (
                <Surface
                    elevation={2}
                    className="bg-carrot-400 px-5 pt-3 pb-4 rounded-b-2xl"
                >
                    <Text
                        className="text-white text-xl font-bold"
                        numberOfLines={1}
                    >
                        {currentAgency.name || "Agency Working Hours"}
                    </Text>
                    {Boolean(currentAgency.address) && (
                        <View className="flex-row items-center mt-1">
                            <MaterialDesignIcons
                                name="map-marker"
                                size={16}
                                color="#ffdba8"
                            />
                            <Text
                                className="text-carrot-100 text-xs ml-1 flex-1"
                                numberOfLines={1}
                            >
                                {currentAgency.address}
                            </Text>
                        </View>
                    )}
                </Surface>
            )}

            {/* Super Admin Agency Switcher */}
            {isSuperAdmin && agencies.length > 1 && (
                <View className="px-4 py-2.5 bg-white border-b border-slate-200">
                    <Text className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
                        Select Agency
                    </Text>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        className="flex-row"
                    >
                        <View className="flex-row gap-2">
                            {agencies.map((agency) => {
                                const isSelected =
                                    String(selectedAgencyId) ===
                                    String(agency.id);
                                return (
                                    <Chip
                                        key={agency.id}
                                        selected={isSelected}
                                        onPress={() =>
                                            setSelectedAgencyId(agency.id)
                                        }
                                        selectedColor="#ef6207"
                                        showSelectedOverlay
                                        style={{ minWidth: 60 }}
                                    >
                                        {agency.name}
                                    </Chip>
                                );
                            })}
                        </View>
                    </ScrollView>
                </View>
            )}

            {/* Working Hours Form Tab */}
            <View className="flex-1">
                <WorkingHoursTab
                    agencyId={effectiveAgencyId}
                    onRefresh={fetchAgencies}
                />
            </View>
        </View>
    );
}
