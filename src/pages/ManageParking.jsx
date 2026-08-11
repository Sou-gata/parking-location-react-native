import React, { useState, useEffect } from "react";
import { View, ScrollView, Pressable, ActivityIndicator } from "react-native";
import { Text, Avatar, Surface } from "react-native-paper";
import Chip from "../components/Chip";
import { useSelector } from "react-redux";
import useRolePermissions from "../hooks/useRolePermissions";
import { ROLES } from "../utils/rbacConfig";
import apiService from "../utils/apiService";
import CapacitiesTab from "../components/manageParking/CapacitiesTab";
import ParkedTab from "../components/manageParking/ParkedTab";
import PolicyTab from "../components/manageParking/PolicyTab";
import MediaTab from "../components/manageParking/MediaTab";
import WorkingHoursTab from "../components/manageParking/WorkingHoursTab";
import { STANDARD_VEHICLES } from "../components/manageParking/utils";

export default function ManageParking({ navigation }) {
    const { role, user } = useRolePermissions();

    const reduxAgencies = useSelector((state) => state.parking.agencies);
    const reduxBookings = useSelector((state) => state.parking.bookings);

    // If super admin, they can choose which agency's parking to manage.
    const [selectedAgencyId, setSelectedAgencyId] = useState(null);

    // Tab control: "capacities", "parked", or "cancellation"
    const [activeTab, setActiveTab] = useState("capacities");

    // Consolidated API and loading state
    const [parkingState, setParkingState] = useState({
        agencies: [],
        bookings: [],
        loading: false,
    });

    const mapAgencyFromApi = (a) => {
        if (!a) return null;
        return {
            ...a,
            id: a.org_id || a.id,
            name: a.org_name || a.name,
            address: a.org_address || a.address,
            twoWheeler_capacity:
                a.two_wheeler_capacity !== undefined
                    ? a.two_wheeler_capacity
                    : a.twoWheeler_capacity,
            threeWheeler_capacity:
                a.three_wheeler_capacity !== undefined
                    ? a.three_wheeler_capacity
                    : a.threeWheeler_capacity,
            twoWheeler_rate:
                a.two_wheeler_rate !== undefined
                    ? parseFloat(a.two_wheeler_rate)
                    : a.twoWheeler_rate,
            threeWheeler_rate:
                a.three_wheeler_rate !== undefined
                    ? parseFloat(a.three_wheeler_rate)
                    : a.threeWheeler_rate,
            car_rate:
                a.car_rate !== undefined ? parseFloat(a.car_rate) : a.car_rate,
            suv_rate:
                a.suv_rate !== undefined ? parseFloat(a.suv_rate) : a.suv_rate,
            van_rate:
                a.van_rate !== undefined ? parseFloat(a.van_rate) : a.van_rate,
            pickup_rate:
                a.pickup_rate !== undefined
                    ? parseFloat(a.pickup_rate)
                    : a.pickup_rate,
            ev_rate:
                a.ev_rate !== undefined ? parseFloat(a.ev_rate) : a.ev_rate,
        };
    };

    const fetchAgenciesAndBookings = async () => {
        setParkingState((prev) => ({ ...prev, loading: true }));
        try {
            let loadedAgencies = [];
            if (role === ROLES.SUPER_ADMIN) {
                const agenciesRes = await apiService.get("agencies");
                if (agenciesRes && agenciesRes.success) {
                    loadedAgencies = agenciesRes.data.map(mapAgencyFromApi);
                }
            } else if (role === ROLES.AGENCY_ADMIN) {
                if (user?.agencyId) {
                    const agencyRes = await apiService.get(
                        `agencies/${user.agencyId}`
                    );
                    if (agencyRes && agencyRes.success) {
                        const mapped = mapAgencyFromApi(agencyRes.data);
                        loadedAgencies = [mapped];
                    }
                }
            }

            // Resolve the current agency ID to load bookings
            const resolvedAgencyId =
                role === ROLES.AGENCY_ADMIN
                    ? user?.agencyId
                    : selectedAgencyId || loadedAgencies[0]?.id;

            let loadedBookings = [];
            if (resolvedAgencyId && !isNaN(Number(resolvedAgencyId))) {
                const bookingsRes = await apiService.get(
                    `bookings/agency/${resolvedAgencyId}`
                );
                if (bookingsRes && bookingsRes.success) {
                    loadedBookings = bookingsRes.data;
                }
            }

            setParkingState({
                agencies: loadedAgencies,
                bookings: loadedBookings,
                loading: false,
            });
        } catch (error) {
            console.error("Error fetching parking data from API:", error);
            setParkingState((prev) => ({ ...prev, loading: false }));
        }
    };

    useEffect(() => {
        fetchAgenciesAndBookings();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [role, user?.agencyId, selectedAgencyId]);

    const activeAgencies =
        parkingState.agencies.length > 0
            ? parkingState.agencies
            : reduxAgencies;
    const activeBookings =
        parkingState.agencies.length > 0
            ? parkingState.bookings
            : reduxBookings;

    // Resolve which agency we are managing
    const currentAgency =
        role === ROLES.AGENCY_ADMIN
            ? activeAgencies.find(
                  (a) =>
                      String(a.id) === String(user?.agencyId) ||
                      a.owner === user?.name ||
                      a.email === user?.email ||
                      a.users?.some((u) => String(u.id) === String(user?.id))
              ) || activeAgencies[0]
            : activeAgencies.find(
                  (a) => String(a.id) === String(selectedAgencyId)
              ) || activeAgencies[0];

    useEffect(() => {
        if (role === ROLES.AGENCY_ADMIN && currentAgency) {
            setSelectedAgencyId(currentAgency.id);
        } else if (role === ROLES.SUPER_ADMIN && activeAgencies.length > 0) {
            const exists = activeAgencies.some(
                (a) => String(a.id) === String(selectedAgencyId)
            );
            if (!selectedAgencyId || !exists) {
                setSelectedAgencyId(activeAgencies[0].id);
            }
        }
    }, [role, currentAgency, activeAgencies, selectedAgencyId]);

    if (!currentAgency) {
        return (
            <View className="flex-1 justify-center items-center bg-slate-50">
                <Text className="text-slate-500">No agency found.</Text>
            </View>
        );
    }

    const useApi = parkingState.agencies.length > 0;

    return (
        <View className="flex-1 bg-slate-50">
            {/* Header info */}
            <Surface
                elevation={2}
                className="bg-indigo-700 px-5 pt-4 pb-5 rounded-b-3xl"
            >
                <Text className="text-white text-2xl font-bold">
                    {currentAgency.name}
                </Text>
                <View className="flex-row items-center mt-1">
                    <Avatar.Icon
                        size={18}
                        icon="map-marker"
                        style={{ backgroundColor: "transparent" }}
                        color="#a5b4fc"
                    />
                    <Text
                        className="text-indigo-200 text-xs ml-1"
                        numberOfLines={1}
                    >
                        {currentAgency.address}
                    </Text>
                </View>
            </Surface>

            {parkingState.loading && (
                <ActivityIndicator
                    animating={true}
                    color="#4338ca"
                    style={{ marginVertical: 10 }}
                />
            )}

            {/* Super Admin selector */}
            {role === ROLES.SUPER_ADMIN && activeAgencies.length > 1 && (
                <View className="px-4 py-3 bg-white border-b border-slate-200">
                    <Text className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                        Simulating Agency (Super Admin View)
                    </Text>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        className="flex-row"
                    >
                        {activeAgencies.map((agency) => (
                            <Chip
                                key={agency.id}
                                selected={
                                    String(selectedAgencyId) ===
                                    String(agency.id)
                                }
                                onPress={() => setSelectedAgencyId(agency.id)}
                                className="mr-2"
                                selectedColor="#4338ca"
                                showSelectedOverlay
                            >
                                {agency.name}
                            </Chip>
                        ))}
                    </ScrollView>
                </View>
            )}

            {/* Tabs for Capacities, Parked Vehicles, and Cancellation Policy */}
            <View className="flex-row bg-white border-b border-slate-200">
                <Pressable
                    className={`flex-1 py-3.5 items-center justify-center border-b-2 ${
                        activeTab === "capacities"
                            ? "border-indigo-600"
                            : "border-transparent"
                    }`}
                    onPress={() => setActiveTab("capacities")}
                >
                    <Text
                        className={`text-sm font-bold ${
                            activeTab === "capacities"
                                ? "text-indigo-600"
                                : "text-slate-500"
                        }`}
                    >
                        Capacities (
                        {Object.keys(STANDARD_VEHICLES).filter((type) => {
                            const total =
                                currentAgency[`${type}_capacity`] || 0;
                            return total > 0;
                        }).length +
                            Object.keys(currentAgency).filter(
                                (k) =>
                                    k.endsWith("_capacity") &&
                                    !Object.keys(STANDARD_VEHICLES)
                                        .map((t) => `${t}_capacity`)
                                        .includes(k) &&
                                    k !== "two_wheeler_capacity" &&
                                    k !== "three_wheeler_capacity" &&
                                    (currentAgency[k] || 0) > 0
                            ).length}
                        )
                    </Text>
                </Pressable>
                <Pressable
                    className={`flex-1 py-3.5 items-center justify-center border-b-2 ${
                        activeTab === "parked"
                            ? "border-indigo-600"
                            : "border-transparent"
                    }`}
                    onPress={() => setActiveTab("parked")}
                >
                    <Text
                        className={`text-sm font-bold ${
                            activeTab === "parked"
                                ? "text-indigo-600"
                                : "text-slate-500"
                        }`}
                    >
                        Parked (
                        {
                            activeBookings.filter(
                                (b) =>
                                    String(b.agencyId) ===
                                        String(currentAgency.id) &&
                                    b.status === "checked_in"
                            ).length
                        }
                        )
                    </Text>
                </Pressable>
                <Pressable
                    className={`flex-1 py-3.5 items-center justify-center border-b-2 ${
                        activeTab === "cancellation"
                            ? "border-indigo-600"
                            : "border-transparent"
                    }`}
                    onPress={() => setActiveTab("cancellation")}
                >
                    <Text
                        className={`text-sm font-bold ${
                            activeTab === "cancellation"
                                ? "text-indigo-600"
                                : "text-slate-500"
                        }`}
                    >
                        Policy
                    </Text>
                </Pressable>
                <Pressable
                    className={`flex-1 py-3.5 items-center justify-center border-b-2 ${
                        activeTab === "media"
                            ? "border-indigo-600"
                            : "border-transparent"
                    }`}
                    onPress={() => setActiveTab("media")}
                >
                    <Text
                        className={`text-sm font-bold ${
                            activeTab === "media"
                                ? "text-indigo-600"
                                : "text-slate-500"
                        }`}
                    >
                        Media
                    </Text>
                </Pressable>
                <Pressable
                    className={`flex-1 py-3.5 items-center justify-center border-b-2 ${
                        activeTab === "working_hours"
                            ? "border-indigo-600"
                            : "border-transparent"
                    }`}
                    onPress={() => setActiveTab("working_hours")}
                >
                    <Text
                        className={`text-sm font-bold ${
                            activeTab === "working_hours"
                                ? "text-indigo-600"
                                : "text-slate-500"
                        }`}
                    >
                        Working Hours
                    </Text>
                </Pressable>
            </View>

            {/* Tab contents */}
            {activeTab === "capacities" && (
                <CapacitiesTab
                    currentAgency={currentAgency}
                    activeBookings={activeBookings}
                    onRefresh={fetchAgenciesAndBookings}
                    useApi={useApi}
                />
            )}

            {activeTab === "parked" && (
                <ParkedTab
                    currentAgency={currentAgency}
                    activeBookings={activeBookings}
                />
            )}

            {activeTab === "cancellation" && (
                <PolicyTab
                    currentAgency={currentAgency}
                    onRefresh={fetchAgenciesAndBookings}
                />
            )}

            {activeTab === "media" && (
                <MediaTab agencyId={currentAgency.id} />
            )}

            {activeTab === "working_hours" && (
                <WorkingHoursTab agencyId={currentAgency.id} />
            )}
        </View>
    );
}
