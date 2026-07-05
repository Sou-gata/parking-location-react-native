import React, { useState, useEffect } from "react";
import { View, ScrollView, FlatList, Pressable, ActivityIndicator, StyleSheet } from "react-native";
import {
    Text,
    Card,
    Button,
    TextInput,
    Avatar,
    Chip,
    SegmentedButtons,
    Portal,
    Modal,
    RadioButton,
    IconButton,
    Divider,
    Badge,
} from "react-native-paper";
import { useSelector, useDispatch } from "react-redux";
import useToast from "../hooks/useToast";
import useRolePermissions from "../hooks/useRolePermissions";
import { ROLES, ROLE_DISPLAY_NAMES } from "../utils/rbacConfig";
import apiService from "../utils/apiService";
import {
    approveRequest,
    rejectRequest,
    updateAgency,
    registerAgencyUser,
    updateAgencyUser,
    deleteAgencyUser,
    toggleUserStatus,
} from "../store/parkingSlice";

export default function ManageUsers({ navigation }) {
    const toast = useToast();
    const dispatch = useDispatch();
    const { role, user } = useRolePermissions();

    const [tab, setTab] = useState(role === ROLES.AGENCY_ADMIN ? "active" : "requests"); // "requests" or "active"
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedRoleFilter, setSelectedRoleFilter] = useState("all");
    const [loading, setLoading] = useState(false);

    // API state
    const [apiAgencies, setApiAgencies] = useState([]);
    const [apiRequests, setApiRequests] = useState([]);
    const [apiStaff, setApiStaff] = useState([]);
    const [apiLoading, setApiLoading] = useState(false);

    // Fetch from Redux
    const reduxRequests = useSelector((state) => state.parking.registrationRequests);
    const reduxAgencies = useSelector((state) => state.parking.agencies);
    const reduxUsers = useSelector((state) => state.parking.users);

    // Fetch data from API
    const fetchData = async () => {
        setApiLoading(true);
        try {
            if (role === ROLES.SUPER_ADMIN) {
                // Fetch active agencies
                const agenciesRes = await apiService.get("agencies");
                if (agenciesRes && agenciesRes.success) {
                    setApiAgencies(agenciesRes.data);
                }
                
                // Fetch pending requests
                const requestsRes = await apiService.get("users/requests");
                if (requestsRes && requestsRes.success) {
                    setApiRequests(requestsRes.data);
                }
            } else if (role === ROLES.AGENCY_ADMIN) {
                // Fetch the agency admin's own agency
                if (user?.agencyId) {
                    const agencyRes = await apiService.get(`agencies/${user.agencyId}`);
                    if (agencyRes && agencyRes.success) {
                        setApiAgencies([agencyRes.data]);
                        setSelectedAgency(agencyRes.data);
                    }
                }
                
                // Fetch staff
                const staffRes = await apiService.get("users/staff");
                if (staffRes && staffRes.success) {
                    setApiStaff(staffRes.data);
                }
            }
        } catch (error) {
            console.error("Error fetching users/staff/agencies from API:", error);
            // Non-blocking toast: user might be offline/testing with Redux mock data
        } finally {
            setApiLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [role, user?.agencyId]);

    // Use API data if available, else fallback to Redux
    const activeAgencies = apiAgencies.length > 0 ? apiAgencies : reduxAgencies;
    const activeRequests = apiRequests.length > 0 ? apiRequests : reduxRequests;

    // Map nested structure for rendering compatibility
    const agencies = activeAgencies.map((a) => {
        const agencyStaff = apiAgencies.length > 0
            ? (String(a.id) === String(role === ROLES.AGENCY_ADMIN ? user?.agencyId : selectedAgency?.id) ? apiStaff : [])
            : reduxUsers.filter((u) => String(u.agencyId) === String(a.id));
        return {
            ...a,
            users: agencyStaff,
        };
    });

    // Drill-down State
    const [selectedAgency, setSelectedAgency] = useState(null);

    // Fetch agency staff on demand for Super Admin drilldown
    useEffect(() => {
        if (role === ROLES.SUPER_ADMIN && selectedAgency) {
            const fetchAgencyStaff = async () => {
                try {
                    const staffRes = await apiService.get(`users/staff/${selectedAgency.id}`);
                    if (staffRes && staffRes.success) {
                        setApiStaff(staffRes.data);
                    }
                } catch (error) {
                    console.error("Error fetching agency staff:", error);
                }
            };
            fetchAgencyStaff();
        }
    }, [selectedAgency, role]);

    // Computed agency for current role
    const currentSelectedAgency = role === ROLES.AGENCY_ADMIN
        ? (agencies.find(
              (a) =>
                  String(a.id) === String(user?.agencyId) ||
                  a.owner === user?.name ||
                  a.email === user?.email ||
                  a.users?.some((u) => String(u.id) === String(user?.id) || u.email === user?.email)
          ) || null)
        : selectedAgency;

    // --- Modals State ---
    const [editAgencyVisible, setEditAgencyVisible] = useState(false);
    const [agencyEditData, setAgencyEditData] = useState({ id: "", name: "", owner: "", email: "", phone_number: "", address: "" });

    const [addEmployeeVisible, setAddEmployeeVisible] = useState(false);
    const [newEmployeeData, setNewEmployeeData] = useState({ name: "", username: "", password: "", email: "", phone_number: "", role: ROLES.AGENCY_USER });

    const [editEmployeeVisible, setEditEmployeeVisible] = useState(false);
    const [employeeEditData, setEmployeeEditData] = useState({ id: "", name: "", username: "", email: "", phone_number: "", role: ROLES.AGENCY_USER });

    const [roleModalVisible, setRoleModalVisible] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [selectedRole, setSelectedRole] = useState("");

    // Lock to active tab for Agency Admin
    useEffect(() => {
        if (role === ROLES.AGENCY_ADMIN) {
            setTab("active");
            const myAgency = agencies.find(
                (a) =>
                    String(a.id) === String(user?.agencyId) ||
                    a.owner === user?.name ||
                    a.email === user?.email ||
                    a.users.some((u) => String(u.id) === String(user?.id) || u.email === user?.email)
            );
            if (myAgency) {
                setSelectedAgency(myAgency);
            }
        }
    }, [role, activeAgencies, user]);

    // Handle Approvals
    const handleApprove = async (request) => {
        if (apiAgencies.length > 0 || apiRequests.length > 0) {
            try {
                const res = await apiService.post(`users/requests/${request.id}/approve`);
                if (res && res.success) {
                    toast.success(`Approved agency ${request.name}!`, "Approved", true);
                    fetchData(); // Refresh data
                } else {
                    toast.error(res?.message || "Failed to approve request", "Error", true);
                }
            } catch (error) {
                console.error(error);
                toast.error("Failed to approve request via API", "Error", true);
            }
        } else {
            dispatch(approveRequest(request.id));
            toast.success(`Approved agency ${request.name}! Admin user registered.`, "Approved", true);
        }
    };

    // Handle Rejections
    const handleReject = async (request) => {
        if (apiAgencies.length > 0 || apiRequests.length > 0) {
            try {
                const res = await apiService.post(`users/requests/${request.id}/reject`);
                if (res && res.success) {
                    toast.success(`Rejected registration request from ${request.name}.`, "Rejected", true);
                    fetchData(); // Refresh data
                } else {
                    toast.error(res?.message || "Failed to reject request", "Error", true);
                }
            } catch (error) {
                console.error(error);
                toast.error("Failed to reject request via API", "Error", true);
            }
        } else {
            dispatch(rejectRequest(request.id));
            toast.success(`Rejected registration request from ${request.name}.`, "Rejected", true);
        }
    };

    // Open Edit Agency Modal
    const openEditAgency = (agency) => {
        setAgencyEditData({
            id: agency.id,
            name: agency.name,
            owner: agency.owner,
            email: agency.email,
            phone_number: agency.phone_number,
            address: agency.address,
        });
        setEditAgencyVisible(true);
    };

    const handleSaveAgency = async () => {
        if (!agencyEditData.name || !agencyEditData.owner) {
            toast.error("Please fill in required fields.", "Error", true);
            return;
        }
        if (apiAgencies.length > 0) {
            try {
                const res = await apiService.put(`agencies/${agencyEditData.id}`, {
                    org_name: agencyEditData.name,
                    phone_number: agencyEditData.phone_number,
                    org_address: agencyEditData.address,
                });
                if (res && res.success) {
                    toast.success("Agency profile updated successfully!", "Success", true);
                    setEditAgencyVisible(false);
                    fetchData();
                } else {
                    toast.error(res?.message || "Failed to update agency", "Error", true);
                }
            } catch (error) {
                console.error(error);
                toast.error("Failed to update agency via API", "Error", true);
            }
        } else {
            dispatch(updateAgency(agencyEditData));
            toast.success("Agency profile updated successfully!", "Success", true);
            setEditAgencyVisible(false);

            // Update selected agency state if currently drilling down
            if (selectedAgency && selectedAgency.id === agencyEditData.id) {
                setSelectedAgency((prev) => ({ ...prev, ...agencyEditData }));
            }
        }
    };

    // Open Add Employee Modal
    const openAddEmployee = () => {
        setNewEmployeeData({
            name: "",
            username: "",
            password: "",
            email: "",
            phone_number: "",
            role: ROLES.AGENCY_USER,
        });
        setAddEmployeeVisible(true);
    };

    const handleCreateEmployee = async () => {
        if (!newEmployeeData.name || !newEmployeeData.username || !newEmployeeData.password) {
            toast.error("Name, Username, and Password are required.", "Error", true);
            return;
        }

        if (apiAgencies.length > 0) {
            try {
                const res = await apiService.post("users/staff/register", {
                    full_name: newEmployeeData.name,
                    username: newEmployeeData.username,
                    password: newEmployeeData.password,
                    email: newEmployeeData.email,
                    phone_number: newEmployeeData.phone_number,
                    role: newEmployeeData.role || ROLES.AGENCY_USER,
                });
                if (res && res.success) {
                    toast.success(`Registered ${newEmployeeData.name} as staff!`, "Success", true);
                    setAddEmployeeVisible(false);
                    // Refresh staff list
                    if (role === ROLES.SUPER_ADMIN && selectedAgency) {
                        const staffRes = await apiService.get(`users/staff/${selectedAgency.id}`);
                        if (staffRes && staffRes.success) setApiStaff(staffRes.data);
                    } else {
                        const staffRes = await apiService.get("users/staff");
                        if (staffRes && staffRes.success) setApiStaff(staffRes.data);
                    }
                } else {
                    toast.error(res?.message || "Failed to register staff", "Error", true);
                }
            } catch (error) {
                console.error(error);
                const msg = error.response?.data?.message || "Failed to register staff via API";
                toast.error(msg, "Error", true);
            }
        } else {
            // Check if username already exists
            const exists = reduxUsers.some(u => u.username.toLowerCase() === newEmployeeData.username.toLowerCase());
            if (exists) {
                toast.error("Username is already taken.", "Error", true);
                return;
            }

            dispatch(registerAgencyUser({
                ...newEmployeeData,
                agencyId: currentSelectedAgency.id,
            }));

            toast.success(`Registered ${newEmployeeData.name} as staff!`, "Success", true);
            setAddEmployeeVisible(false);
        }
    };

    // Open Edit Employee Modal
    const openEditEmployee = (emp) => {
        setEmployeeEditData({
            id: emp.id,
            name: emp.name,
            username: emp.username,
            email: emp.email,
            phone_number: emp.phone_number,
            role: emp.role,
        });
        setEditEmployeeVisible(true);
    };

    const handleSaveEmployee = async () => {
        if (!employeeEditData.name || !employeeEditData.username) {
            toast.error("Name and Username are required.", "Error", true);
            return;
        }

        if (apiAgencies.length > 0) {
            try {
                const res = await apiService.put(`users/staff/${employeeEditData.id}`, {
                    full_name: employeeEditData.name,
                    username: employeeEditData.username,
                    email: employeeEditData.email,
                    phone_number: employeeEditData.phone_number,
                    role: employeeEditData.role,
                });
                if (res && res.success) {
                    toast.success("Employee details updated successfully!", "Success", true);
                    setEditEmployeeVisible(false);
                    // Refresh staff list
                    if (role === ROLES.SUPER_ADMIN && selectedAgency) {
                        const staffRes = await apiService.get(`users/staff/${selectedAgency.id}`);
                        if (staffRes && staffRes.success) setApiStaff(staffRes.data);
                    } else {
                        const staffRes = await apiService.get("users/staff");
                        if (staffRes && staffRes.success) setApiStaff(staffRes.data);
                    }
                } else {
                    toast.error(res?.message || "Failed to update employee", "Error", true);
                }
            } catch (error) {
                console.error(error);
                const msg = error.response?.data?.message || "Failed to update employee via API";
                toast.error(msg, "Error", true);
            }
        } else {
            dispatch(updateAgencyUser(employeeEditData));
            toast.success("Employee details updated successfully!", "Success", true);
            setEditEmployeeVisible(false);
        }
    };

    // Delete Employee
    const handleDeleteEmployee = async (empId, empName) => {
        if (apiAgencies.length > 0) {
            try {
                const res = await apiService.delete(`users/staff/${empId}`);
                if (res && res.success) {
                    toast.success(`Removed ${empName} from agency roster.`, "Removed", true);
                    // Refresh staff list
                    if (role === ROLES.SUPER_ADMIN && selectedAgency) {
                        const staffRes = await apiService.get(`users/staff/${selectedAgency.id}`);
                        if (staffRes && staffRes.success) setApiStaff(staffRes.data);
                    } else {
                        const staffRes = await apiService.get("users/staff");
                        if (staffRes && staffRes.success) setApiStaff(staffRes.data);
                    }
                } else {
                    toast.error(res?.message || "Failed to delete employee", "Error", true);
                }
            } catch (error) {
                console.error(error);
                toast.error("Failed to delete employee via API", "Error", true);
            }
        } else {
            dispatch(deleteAgencyUser(empId));
            toast.success(`Removed ${empName} from agency roster.`, "Removed", true);
        }
    };

    // Toggle Employee Block Status
    const handleToggleStatus = async (emp) => {
        if (apiAgencies.length > 0) {
            try {
                const res = await apiService.post(`users/staff/${emp.id}/toggle-status`);
                if (res && res.success) {
                    const newStatus = emp.status === "active" ? "blocked" : "active";
                    toast.success(
                        `${emp.name} is now ${newStatus === "blocked" ? "disabled" : "activated"}.`,
                        newStatus === "blocked" ? "Account Blocked" : "Account Active",
                        true
                    );
                    // Refresh staff list
                    if (role === ROLES.SUPER_ADMIN && selectedAgency) {
                        const staffRes = await apiService.get(`users/staff/${selectedAgency.id}`);
                        if (staffRes && staffRes.success) setApiStaff(staffRes.data);
                    } else {
                        const staffRes = await apiService.get("users/staff");
                        if (staffRes && staffRes.success) setApiStaff(staffRes.data);
                    }
                } else {
                    toast.error(res?.message || "Failed to update staff status", "Error", true);
                }
            } catch (error) {
                console.error(error);
                toast.error("Failed to toggle status via API", "Error", true);
            }
        } else {
            dispatch(toggleUserStatus(emp.id));
            const newStatus = emp.status === "active" ? "blocked" : "active";
            toast.success(
                `${emp.name} is now ${newStatus === "blocked" ? "disabled" : "activated"}.`,
                newStatus === "blocked" ? "Account Blocked" : "Account Active",
                true
            );
        }
    };

    // Role Change Submissions
    const handleChangeRoleSubmit = async () => {
        if (!selectedUser || !selectedRole) return;
        if (apiAgencies.length > 0) {
            try {
                const res = await apiService.put(`users/staff/${selectedUser.id}`, {
                    full_name: selectedUser.name,
                    username: selectedUser.username,
                    email: selectedUser.email,
                    phone_number: selectedUser.phone_number,
                    role: selectedRole,
                });
                if (res && res.success) {
                    toast.success("User role updated!", "Success", true);
                    setRoleModalVisible(false);
                    setSelectedUser(null);
                    // Refresh staff list
                    if (role === ROLES.SUPER_ADMIN && selectedAgency) {
                        const staffRes = await apiService.get(`users/staff/${selectedAgency.id}`);
                        if (staffRes && staffRes.success) setApiStaff(staffRes.data);
                    } else {
                        const staffRes = await apiService.get("users/staff");
                        if (staffRes && staffRes.success) setApiStaff(staffRes.data);
                    }
                } else {
                    toast.error(res?.message || "Failed to update role", "Error", true);
                }
            } catch (error) {
                console.error(error);
                toast.error("Failed to update role via API", "Error", true);
            }
        } else {
            dispatch(updateAgencyUser({
                ...selectedUser,
                role: selectedRole,
            }));
            toast.success("User role updated!", "Success", true);
            setRoleModalVisible(false);
            setSelectedUser(null);
        }
    };

    // Filters
    const filteredRequests = role === ROLES.SUPER_ADMIN
        ? reduxRequests.filter((r) => {
              const query = searchQuery.toLowerCase();
              return (
                  r.name.toLowerCase().includes(query) ||
                  r.owner.toLowerCase().includes(query) ||
                  r.email.toLowerCase().includes(query)
              );
          })
        : [];

    const filteredAgencies = agencies.filter((a) => {
        if (role === ROLES.AGENCY_ADMIN) {
            const isMyAgency =
                a.owner === user?.name ||
                a.email === user?.email ||
                a.users?.some((u) => u.id === user?.id || u.email === user?.email);
            if (!isMyAgency) return false;
        }

        const query = searchQuery.toLowerCase();
        return (
            a.name.toLowerCase().includes(query) ||
            a.owner.toLowerCase().includes(query) ||
            a.email.toLowerCase().includes(query)
        );
    });

    const filteredEmployees = currentSelectedAgency
        ? currentSelectedAgency.users.filter((u) => {
              const query = searchQuery.toLowerCase();
              const matchesSearch =
                  u.name.toLowerCase().includes(query) ||
                  u.username.toLowerCase().includes(query) ||
                  u.email.toLowerCase().includes(query);
              const matchesRole =
                  selectedRoleFilter === "all" || u.role === selectedRoleFilter;
              return matchesSearch && matchesRole;
          })
        : [];

    const openRoleModal = (user) => {
        setSelectedUser(user);
        setSelectedRole(user.role);
        setRoleModalVisible(true);
    };

    const handleTabChange = (selectedTab) => {
        setTab(selectedTab);
        setSearchQuery("");
        setSelectedRoleFilter("all");
        setSelectedAgency(null);
    };

    return (
        <View className="flex-1 bg-slate-50">
            {/* Search Input Bar */}
            <View className="px-4 pt-3 pb-2 bg-white border-b border-slate-100">
                <TextInput
                    placeholder={
                        tab === "requests"
                            ? "Search pending agencies..."
                            : currentSelectedAgency
                            ? `Search users under ${currentSelectedAgency.name}...`
                            : "Search active agencies..."
                    }
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    mode="outlined"
                    dense
                    outlineColor="#e2e8f0"
                    activeOutlineColor="#4338ca"
                    left={<TextInput.Icon icon="magnify" />}
                    right={
                        searchQuery ? (
                            <TextInput.Icon
                                icon="close"
                                onPress={() => setSearchQuery("")}
                            />
                        ) : null
                    }
                    className="bg-white h-11"
                />
            </View>

            {apiLoading && (
                <ActivityIndicator
                    animating={true}
                    color="#4338ca"
                    style={{ marginVertical: 10 }}
                />
            )}

            {/* Tab Segment Selector */}
            {role === ROLES.SUPER_ADMIN && (
                <View className="px-4 py-3 bg-white">
                    <SegmentedButtons
                        value={tab}
                        onValueChange={handleTabChange}
                        buttons={[
                            {
                                value: "requests",
                                label: `Requests (${reduxRequests.length})`,
                                showSelectedCheck: true,
                            },
                            {
                                value: "active",
                                label: `Agencies (${reduxAgencies.length})`,
                                showSelectedCheck: true,
                            },
                        ]}
                        theme={{ colors: { primary: "#4338ca" } }}
                    />
                </View>
            )}

            {/* Role Filter Pills (Drill-down view) */}
            {tab === "active" && currentSelectedAgency && (
                <View className="bg-white pb-3">
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={{ paddingHorizontal: 16 }}
                    >
                        <Chip
                            selected={selectedRoleFilter === "all"}
                            onPress={() => setSelectedRoleFilter("all")}
                            className="mr-2 h-9 items-center justify-center rounded-full"
                            selectedColor={selectedRoleFilter === "all" ? "#fff" : "#64748b"}
                            style={{ backgroundColor: selectedRoleFilter === "all" ? "#4338ca" : "#f1f5f9" }}
                        >
                            All Roles
                        </Chip>
                        {Object.keys(ROLES).map((roleKey) => {
                            const roleValue = ROLES[roleKey];
                            return (
                                <Chip
                                    key={roleValue}
                                    selected={selectedRoleFilter === roleValue}
                                    onPress={() => setSelectedRoleFilter(roleValue)}
                                    className="mr-2 h-9 items-center justify-center rounded-full"
                                    selectedColor={selectedRoleFilter === roleValue ? "#fff" : "#64748b"}
                                    style={{ backgroundColor: selectedRoleFilter === roleValue ? "#4338ca" : "#f1f5f9" }}
                                >
                                    {ROLE_DISPLAY_NAMES[roleValue]}
                                </Chip>
                            );
                        })}
                    </ScrollView>
                </View>
            )}

            {/* Breadcrumb / Back button when drilling down */}
            {tab === "active" && currentSelectedAgency && role === ROLES.SUPER_ADMIN && (
                <View className="px-4 py-2 bg-slate-100 border-b border-slate-200 flex-row items-center justify-between">
                    <Pressable
                        onPress={() => {
                            setSelectedAgency(null);
                            setSearchQuery("");
                        }}
                        className="flex-row items-center"
                    >
                        <IconButton
                            icon="arrow-left"
                            size={20}
                            className="m-0"
                            iconColor="#4338ca"
                        />
                        <Text className="text-indigo-700 font-bold text-sm ml-1">
                            Back to Agencies
                        </Text>
                    </Pressable>
                    <Text className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Agency Roster
                    </Text>
                </View>
            )}

            {/* Content Lists */}
            {tab === "requests" && role === ROLES.SUPER_ADMIN ? (
                /* 1. Pending Approvals Tab */
                <FlatList
                    data={filteredRequests}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
                    renderItem={({ item }) => (
                        <Card className="mb-4 bg-white border border-slate-100 rounded-xl elevation-1">
                            <Card.Content className="pb-3">
                                <View className="flex-row items-center justify-between">
                                    <View className="flex-row items-center flex-1 pr-2">
                                        <Avatar.Icon
                                            size={46}
                                            icon="office-building"
                                            style={{ backgroundColor: "#fef3c7" }}
                                            color="#d97706"
                                        />
                                        <View className="ml-3 flex-1">
                                            <Text className="text-base font-bold text-slate-800" numberOfLines={1}>
                                                {item.name}
                                            </Text>
                                            <Text className="text-xs text-slate-500">
                                                Owner: {item.owner} • {item.phone_number}
                                            </Text>
                                        </View>
                                    </View>
                                    <Badge className="bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded text-xs">
                                        Pending Agency
                                    </Badge>
                                </View>

                                <Divider className="my-3 bg-slate-100" />

                                <View className="gap-1">
                                    <Text className="text-sm text-slate-600">
                                        <Text className="font-semibold">Email:</Text> {item.email}
                                    </Text>
                                    <Text className="text-sm text-slate-600">
                                        <Text className="font-semibold">Address:</Text> {item.address}
                                    </Text>
                                </View>
                            </Card.Content>

                            <Card.Actions className="border-t border-slate-50 px-4 py-2 flex-row gap-2 bg-slate-50/50 rounded-b-xl">
                                <Button
                                    mode="outlined"
                                    onPress={() => handleReject(item)}
                                    textColor="#dc2626"
                                    className="flex-1 rounded-lg border-red-200"
                                    labelStyle={{ fontWeight: "700" }}
                                >
                                    Reject
                                </Button>
                                <Button
                                    mode="contained"
                                    onPress={() => handleApprove(item)}
                                    buttonColor="#16a34a"
                                    className="flex-1 rounded-lg"
                                    labelStyle={{ color: "white", fontWeight: "700" }}
                                >
                                    Approve
                                </Button>
                            </Card.Actions>
                        </Card>
                    )}
                    ListEmptyComponent={
                        <View className="items-center justify-center pt-20">
                            <Avatar.Icon
                                size={64}
                                icon="check-decagram"
                                style={{ backgroundColor: "#f0fdf4" }}
                                color="#16a34a"
                            />
                            <Text className="text-lg font-bold text-slate-700 mt-4">
                                All Clear!
                            </Text>
                            <Text className="text-sm text-slate-400 text-center mt-1 px-8">
                                There are no pending agency requests.
                            </Text>
                        </View>
                    }
                />
            ) : currentSelectedAgency ? (
                /* 2. Employee Drill-Down List inside Tab "active" */
                <FlatList
                    data={filteredEmployees}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
                    renderItem={({ item }) => {
                        const isBlocked = item.status === "blocked";
                        const isOwnerAdmin = item.role === ROLES.AGENCY_ADMIN;
                        return (
                            <Card className="mb-4 bg-white border border-slate-100 rounded-xl elevation-1">
                                <Card.Content className="pb-3">
                                    <View className="flex-row items-center justify-between">
                                        <View className="flex-row items-center flex-1 pr-2">
                                            <Avatar.Text
                                                size={46}
                                                label={item.name.substring(0, 2).toUpperCase()}
                                                style={{ backgroundColor: isBlocked ? "#f1f5f9" : "#e0e7ff" }}
                                                labelStyle={{ color: isBlocked ? "#64748b" : "#4338ca", fontWeight: "bold" }}
                                            />
                                            <View className="ml-3 flex-1">
                                                <View className="flex-row items-center gap-1.5 flex-wrap">
                                                    <Text
                                                        className={`text-base font-bold ${
                                                            isBlocked ? "text-slate-400 line-through" : "text-slate-800"
                                                        }`}
                                                        numberOfLines={1}
                                                    >
                                                        {item.name}
                                                    </Text>
                                                    {isBlocked && (
                                                        <Badge className="bg-red-100 text-red-800 font-bold px-1.5 py-0.5 rounded text-[10px]">
                                                            Blocked
                                                        </Badge>
                                                    )}
                                                </View>
                                                <Text className="text-xs text-slate-500">
                                                    @{item.username} • {item.phone_number || "No Phone"}
                                                </Text>
                                            </View>
                                        </View>
                                        <Badge className="bg-indigo-100 text-indigo-800 font-bold px-2 py-0.5 rounded text-xs">
                                            {ROLE_DISPLAY_NAMES[item.role] || "Customer"}
                                        </Badge>
                                    </View>

                                    <Divider className="my-3 bg-slate-100" />

                                    <View className="flex-row justify-between items-center flex-wrap gap-2">
                                        <Text className={`text-sm ${isBlocked ? "text-slate-400" : "text-slate-600"}`}>
                                            {item.email}
                                        </Text>

                                        {/* Row of Action Buttons */}
                                        <View className="flex-row gap-1">
                                            {/* Block / Unblock (Except Owner Admin) */}
                                            {!isOwnerAdmin && (
                                                <IconButton
                                                    icon={isBlocked ? "lock-open-outline" : "block-helper"}
                                                    iconColor={isBlocked ? "#16a34a" : "#dc2626"}
                                                    size={18}
                                                    style={{ margin: 0 }}
                                                    onPress={() => handleToggleStatus(item)}
                                                />
                                            )}

                                            {/* Edit Employee (Only for Agency Admin & Superuser) */}
                                            {(role === ROLES.AGENCY_ADMIN || role === ROLES.SUPER_ADMIN) && (
                                                <IconButton
                                                    icon="account-edit-outline"
                                                    iconColor="#4338ca"
                                                    size={18}
                                                    style={{ margin: 0 }}
                                                    onPress={() => openEditEmployee(item)}
                                                    disabled={isBlocked}
                                                />
                                            )}

                                            {/* Delete Employee (Except Owner Admin) */}
                                            {!isOwnerAdmin && (role === ROLES.AGENCY_ADMIN || role === ROLES.SUPER_ADMIN) && (
                                                <IconButton
                                                    icon="trash-can-outline"
                                                    iconColor="#ef4444"
                                                    size={18}
                                                    style={{ margin: 0 }}
                                                    onPress={() => handleDeleteEmployee(item.id, item.name)}
                                                />
                                            )}

                                            {/* Quick Role switch modal */}
                                            <IconButton
                                                icon="shield-key-outline"
                                                iconColor="#64748b"
                                                size={18}
                                                style={{ margin: 0 }}
                                                onPress={() => openRoleModal(item)}
                                                disabled={isBlocked}
                                            />
                                        </View>
                                    </View>
                                </Card.Content>
                            </Card>
                        );
                    }}
                    ListHeaderComponent={
                        <Card className="mb-4 bg-white border border-slate-100 rounded-xl" elevation={0}>
                            <Card.Content className="py-3 bg-indigo-50/50 rounded-xl border border-indigo-100/50">
                                <View className="flex-row justify-between items-start">
                                    <View style={{ flex: 1 }}>
                                        <Text className="text-xs font-bold text-indigo-800 uppercase tracking-wider mb-1">
                                            {role === ROLES.SUPER_ADMIN ? "Selected Agency Profile" : "My Agency Profile"}
                                        </Text>
                                        <Text className="text-lg font-bold text-slate-800">
                                            {currentSelectedAgency.name}
                                        </Text>
                                        <Text className="text-sm text-slate-600 mt-1">
                                            <Text className="font-semibold">Owner Admin:</Text> {currentSelectedAgency.owner}
                                        </Text>
                                        <Text className="text-sm text-slate-600">
                                            <Text className="font-semibold">Address:</Text> {currentSelectedAgency.address}
                                        </Text>
                                    </View>
                                    <View className="flex-row">
                                        {/* Super Admin can edit the agency profile details */}
                                        {role === ROLES.SUPER_ADMIN && (
                                            <IconButton
                                                icon="pencil-outline"
                                                iconColor="#4338ca"
                                                size={20}
                                                onPress={() => openEditAgency(currentSelectedAgency)}
                                            />
                                        )}
                                        {/* Agency Admin can register new employees */}
                                        {role === ROLES.AGENCY_ADMIN && (
                                            <Button
                                                mode="contained"
                                                compact
                                                onPress={openAddEmployee}
                                                buttonColor="#4338ca"
                                                className="rounded-lg self-center"
                                                labelStyle={{ color: "white", fontSize: 11, fontWeight: "700" }}
                                            >
                                                Add Staff
                                            </Button>
                                        )}
                                    </View>
                                </View>
                            </Card.Content>
                        </Card>
                    }
                    ListEmptyComponent={
                        <View className="items-center justify-center pt-20">
                            <Avatar.Icon
                                size={64}
                                icon="account-multiple-outline"
                                style={{ backgroundColor: "#f8fafc" }}
                                color="#64748b"
                            />
                            <Text className="text-lg font-bold text-slate-700 mt-4">
                                No Employees Found
                            </Text>
                            <Text className="text-sm text-slate-400 text-center mt-1 px-8">
                                There are no users matching your role filter or query.
                            </Text>
                        </View>
                    }
                />
            ) : (
                /* 3. Active Agencies List (Default View for Super Admin) */
                <FlatList
                    data={filteredAgencies}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
                    renderItem={({ item }) => (
                        <Pressable
                            onPress={() => {
                                setSelectedAgency(item);
                                setSearchQuery("");
                            }}
                        >
                            <Card className="mb-4 bg-white border border-slate-100 rounded-xl elevation-1">
                                <Card.Content className="pb-3 flex-row items-center justify-between">
                                    <View className="flex-row items-center flex-1 pr-4">
                                        <Avatar.Icon
                                            size={48}
                                            icon="office-building"
                                            style={{ backgroundColor: "#e0e7ff" }}
                                            color="#4338ca"
                                        />
                                        <View className="ml-3 flex-1">
                                            <Text className="text-base font-bold text-slate-800" numberOfLines={1}>
                                                {item.name}
                                            </Text>
                                            <Text className="text-xs text-slate-500" numberOfLines={1}>
                                                Admin: {item.owner} • {item.phone_number}
                                            </Text>
                                            <Text className="text-xs text-slate-400 mt-0.5" numberOfLines={1}>
                                                {item.address}
                                            </Text>
                                        </View>
                                    </View>
                                    <View className="items-end">
                                        <Badge className="bg-indigo-100 text-indigo-800 font-bold px-2 py-0.5 rounded text-xs mb-1">
                                            {item.users.length} Users
                                        </Badge>
                                        <IconButton
                                            icon="chevron-right"
                                            iconColor="#4338ca"
                                            size={24}
                                            style={{ margin: 0, marginRight: -8 }}
                                        />
                                    </View>
                                </Card.Content>
                            </Card>
                        </Pressable>
                    )}
                    ListEmptyComponent={
                        <View className="items-center justify-center pt-20">
                            <Avatar.Icon
                                size={64}
                                icon="office-building-off"
                                style={{ backgroundColor: "#f8fafc" }}
                                color="#64748b"
                            />
                            <Text className="text-lg font-bold text-slate-700 mt-4">
                                No Agencies Found
                            </Text>
                            <Text className="text-sm text-slate-400 text-center mt-1 px-8">
                                No active agencies match your search query.
                            </Text>
                        </View>
                    }
                />
            )}

            {/* Modals & Dialogs */}
            <Portal>
                {/* 1. Edit Agency Details Modal (Super Admin) */}
                <Modal
                    visible={editAgencyVisible}
                    onDismiss={() => setEditAgencyVisible(false)}
                    className="bg-white p-6 m-5 rounded-2xl max-w-[500px] self-center w-[90%]"
                >
                    <Text className="text-lg font-bold text-slate-800 mb-4">Edit Agency Details</Text>

                    <TextInput
                        label="Agency Name *"
                        value={agencyEditData.name}
                        onChangeText={(text) => setAgencyEditData({ ...agencyEditData, name: text })}
                        mode="outlined"
                        dense
                        className="bg-white mb-3"
                        outlineColor="#e2e8f0"
                        activeOutlineColor="#4338ca"
                    />
                    <TextInput
                        label="Owner Name *"
                        value={agencyEditData.owner}
                        onChangeText={(text) => setAgencyEditData({ ...agencyEditData, owner: text })}
                        mode="outlined"
                        dense
                        className="bg-white mb-3"
                        outlineColor="#e2e8f0"
                        activeOutlineColor="#4338ca"
                    />
                    <TextInput
                        label="Email Address"
                        value={agencyEditData.email}
                        onChangeText={(text) => setAgencyEditData({ ...agencyEditData, email: text })}
                        mode="outlined"
                        dense
                        keyboardType="email-address"
                        className="bg-white mb-3"
                        outlineColor="#e2e8f0"
                        activeOutlineColor="#4338ca"
                    />
                    <TextInput
                        label="Phone Number"
                        value={agencyEditData.phone_number}
                        onChangeText={(text) => setAgencyEditData({ ...agencyEditData, phone_number: text })}
                        mode="outlined"
                        dense
                        className="bg-white mb-3"
                        outlineColor="#e2e8f0"
                        activeOutlineColor="#4338ca"
                    />
                    <TextInput
                        label="Address"
                        value={agencyEditData.address}
                        onChangeText={(text) => setAgencyEditData({ ...agencyEditData, address: text })}
                        mode="outlined"
                        dense
                        multiline
                        className="bg-white mb-4"
                        outlineColor="#e2e8f0"
                        activeOutlineColor="#4338ca"
                    />

                    <View className="flex-row justify-end gap-2 mt-2">
                        <Button mode="outlined" onPress={() => setEditAgencyVisible(false)} textColor="#64748b">
                            Cancel
                        </Button>
                        <Button mode="contained" onPress={handleSaveAgency} buttonColor="#4338ca" labelStyle={{ color: "white" }}>
                            Save Changes
                        </Button>
                    </View>
                </Modal>

                {/* 2. Add Employee/Staff Modal (Agency Admin) */}
                <Modal
                    visible={addEmployeeVisible}
                    onDismiss={() => setAddEmployeeVisible(false)}
                    className="bg-white p-6 m-5 rounded-2xl max-w-[500px] self-center w-[90%]"
                >
                    <Text className="text-lg font-bold text-slate-800 mb-4">Register New Employee</Text>

                    <TextInput
                        label="Full Name *"
                        value={newEmployeeData.name}
                        onChangeText={(text) => setNewEmployeeData({ ...newEmployeeData, name: text })}
                        mode="outlined"
                        dense
                        className="bg-white mb-3"
                        outlineColor="#e2e8f0"
                        activeOutlineColor="#4338ca"
                    />
                    <TextInput
                        label="Username *"
                        value={newEmployeeData.username}
                        onChangeText={(text) => setNewEmployeeData({ ...newEmployeeData, username: text })}
                        mode="outlined"
                        dense
                        autoCapitalize="none"
                        className="bg-white mb-3"
                        outlineColor="#e2e8f0"
                        activeOutlineColor="#4338ca"
                    />
                    <TextInput
                        label="Password *"
                        value={newEmployeeData.password}
                        onChangeText={(text) => setNewEmployeeData({ ...newEmployeeData, password: text })}
                        mode="outlined"
                        dense
                        secureTextEntry
                        className="bg-white mb-3"
                        outlineColor="#e2e8f0"
                        activeOutlineColor="#4338ca"
                    />
                    <TextInput
                        label="Email Address"
                        value={newEmployeeData.email}
                        onChangeText={(text) => setNewEmployeeData({ ...newEmployeeData, email: text })}
                        mode="outlined"
                        dense
                        keyboardType="email-address"
                        className="bg-white mb-3"
                        outlineColor="#e2e8f0"
                        activeOutlineColor="#4338ca"
                    />
                    <TextInput
                        label="Phone Number"
                        value={newEmployeeData.phone_number}
                        onChangeText={(text) => setNewEmployeeData({ ...newEmployeeData, phone_number: text })}
                        mode="outlined"
                        dense
                        keyboardType="phone-pad"
                        className="bg-white mb-4"
                        outlineColor="#e2e8f0"
                        activeOutlineColor="#4338ca"
                    />

                    <Text className="text-sm font-semibold text-slate-700 mb-2">Assign Role</Text>
                    <SegmentedButtons
                        value={newEmployeeData.role}
                        onValueChange={(val) => setNewEmployeeData({ ...newEmployeeData, role: val })}
                        buttons={[
                            { value: ROLES.AGENCY_USER, label: "Staff (Operator)" },
                            { value: ROLES.AGENCY_ADMIN, label: "Admin" },
                        ]}
                        theme={{ colors: { primary: "#4338ca" } }}
                        style={{ marginBottom: 16 }}
                    />

                    <View className="flex-row justify-end gap-2 mt-2">
                        <Button mode="outlined" onPress={() => setAddEmployeeVisible(false)} textColor="#64748b">
                            Cancel
                        </Button>
                        <Button mode="contained" onPress={handleCreateEmployee} buttonColor="#4338ca" labelStyle={{ color: "white" }}>
                            Register User
                        </Button>
                    </View>
                </Modal>

                {/* 3. Edit Employee Modal (Agency Admin) */}
                <Modal
                    visible={editEmployeeVisible}
                    onDismiss={() => setEditEmployeeVisible(false)}
                    className="bg-white p-6 m-5 rounded-2xl max-w-[500px] self-center w-[90%]"
                >
                    <Text className="text-lg font-bold text-slate-800 mb-4">Edit Employee Details</Text>

                    <TextInput
                        label="Full Name *"
                        value={employeeEditData.name}
                        onChangeText={(text) => setEmployeeEditData({ ...employeeEditData, name: text })}
                        mode="outlined"
                        dense
                        className="bg-white mb-3"
                        outlineColor="#e2e8f0"
                        activeOutlineColor="#4338ca"
                    />
                    <TextInput
                        label="Username *"
                        value={employeeEditData.username}
                        onChangeText={(text) => setEmployeeEditData({ ...employeeEditData, username: text })}
                        mode="outlined"
                        dense
                        autoCapitalize="none"
                        className="bg-white mb-3"
                        outlineColor="#e2e8f0"
                        activeOutlineColor="#4338ca"
                    />
                    <TextInput
                        label="Email Address"
                        value={employeeEditData.email}
                        onChangeText={(text) => setEmployeeEditData({ ...employeeEditData, email: text })}
                        mode="outlined"
                        dense
                        keyboardType="email-address"
                        className="bg-white mb-3"
                        outlineColor="#e2e8f0"
                        activeOutlineColor="#4338ca"
                    />
                    <TextInput
                        label="Phone Number"
                        value={employeeEditData.phone_number}
                        onChangeText={(text) => setEmployeeEditData({ ...employeeEditData, phone_number: text })}
                        mode="outlined"
                        dense
                        keyboardType="phone-pad"
                        className="bg-white mb-4"
                        outlineColor="#e2e8f0"
                        activeOutlineColor="#4338ca"
                    />

                    <Text className="text-sm font-semibold text-slate-700 mb-2">Role Permissions</Text>
                    <SegmentedButtons
                        value={employeeEditData.role}
                        onValueChange={(val) => setEmployeeEditData({ ...employeeEditData, role: val })}
                        buttons={[
                            { value: ROLES.AGENCY_USER, label: "Staff (Operator)" },
                            { value: ROLES.AGENCY_ADMIN, label: "Admin" },
                        ]}
                        theme={{ colors: { primary: "#4338ca" } }}
                        style={{ marginBottom: 16 }}
                    />

                    <View className="flex-row justify-end gap-2 mt-2">
                        <Button mode="outlined" onPress={() => setEditEmployeeVisible(false)} textColor="#64748b">
                            Cancel
                        </Button>
                        <Button mode="contained" onPress={handleSaveEmployee} buttonColor="#4338ca" labelStyle={{ color: "white" }}>
                            Save Details
                        </Button>
                    </View>
                </Modal>

                {/* 4. Role Override Modal */}
                <Modal
                    visible={roleModalVisible}
                    onDismiss={() => setRoleModalVisible(false)}
                    className="bg-white p-6 m-5 rounded-2xl max-w-[500px] self-center w-[90%]"
                >
                    <Text className="text-lg font-bold text-slate-800 mb-2">Modify User Role</Text>
                    <Text className="text-sm text-slate-500 mb-4">
                        Select a new role and permissions level for <Text className="font-bold text-slate-700">{selectedUser?.name}</Text>.
                    </Text>

                    <Divider className="mb-2 bg-slate-100" />

                    <ScrollView style={{ maxHeight: 300 }}>
                        <RadioButton.Group onValueChange={setSelectedRole} value={selectedRole}>
                            {Object.keys(ROLES).map((roleKey) => {
                                const roleValue = ROLES[roleKey];
                                return (
                                    <View key={roleValue} className="flex-row items-center justify-between py-1.5 px-1">
                                        <Text className="text-sm text-slate-700 font-medium">
                                            {ROLE_DISPLAY_NAMES[roleValue]}
                                        </Text>
                                        <RadioButton value={roleValue} color="#4338ca" uncheckedColor="#cbd5e1" />
                                    </View>
                                );
                            })}
                        </RadioButton.Group>
                    </ScrollView>

                    <Divider className="my-3 bg-slate-100" />

                    <View className="flex-row justify-end gap-2">
                        <Button mode="outlined" onPress={() => setRoleModalVisible(false)} textColor="#64748b">
                            Cancel
                        </Button>
                        <Button mode="contained" onPress={handleChangeRoleSubmit} buttonColor="#4338ca" labelStyle={{ color: "white" }}>
                            Save Changes
                        </Button>
                    </View>
                </Modal>
            </Portal>
        </View>
    );
}

const styles = StyleSheet.create({});
