import React, { useState, useEffect } from "react";
import { View, ScrollView, Pressable, ActivityIndicator } from "react-native";
import {
    Text,
    TextInput,
    Chip,
    SegmentedButtons,
    Portal,
    IconButton,
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
} from "../store/slices/parkingSlice";

import EditAgencyModal from "../components/manageUsers/EditAgencyModal";
import AddEmployeeModal from "../components/manageUsers/AddEmployeeModal";
import EditEmployeeModal from "../components/manageUsers/EditEmployeeModal";
import RoleModal from "../components/manageUsers/RoleModal";
import RequestDetailsModal from "../components/manageUsers/RequestDetailsModal";
import RequestsTab from "../components/manageUsers/RequestsTab";
import EmployeeRosterList from "../components/manageUsers/EmployeeRosterList";
import AgenciesList from "../components/manageUsers/AgenciesList";
import AgencyDetailsModal from "../components/manageUsers/AgencyDetailsModal";
import WalletRequestsTab from "../components/manageUsers/WalletRequestsTab";
import WalletDetailsModal from "../components/manageUsers/WalletDetailsModal";

export default function SuperAdminManageUsers({ navigation }) {
    const toast = useToast();
    const dispatch = useDispatch();
    const { role } = useRolePermissions();

    const [tab, setTab] = useState("requests"); // "requests" or "active"
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedRoleFilter, setSelectedRoleFilter] = useState("all");

    // API state
    const [apiAgencies, setApiAgencies] = useState([]);
    const [apiRequests, setApiRequests] = useState([]);
    const [walletRequests, setWalletRequests] = useState([]);
    const [apiStaff, setApiStaff] = useState([]);
    const [apiLoading, setApiLoading] = useState(false);
    const [useApiData, setUseApiData] = useState(false);

    // Fetch from Redux
    const reduxRequests = useSelector(
        (state) => state.parking.registrationRequests
    );
    const reduxAgencies = useSelector((state) => state.parking.agencies);
    const reduxUsers = useSelector((state) => state.parking.users);

    const [selectedAgency, setSelectedAgency] = useState(null);
    const [agencyDetailsVisible, setAgencyDetailsVisible] = useState(false);

    const openAgencyDetails = () => {
        setAgencyDetailsVisible(true);
    };

    // Fetch data from API
    const fetchData = async () => {
        setApiLoading(true);
        try {
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

            // Fetch pending wallet requests
            const walletRes = await apiService.get("wallets/requests");
            if (walletRes && walletRes.success) {
                setWalletRequests(walletRes.data);
            }
            setUseApiData(true);
        } catch (error) {
            console.error(
                "Error fetching users/staff/agencies/wallets from API:",
                error
            );
        } finally {
            setApiLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Fetch agency staff on demand for Super Admin drilldown
    useEffect(() => {
        if (selectedAgency) {
            const fetchAgencyStaff = async () => {
                setApiLoading(true);
                try {
                    const staffRes = await apiService.get(
                        `users/staff/${selectedAgency.id}`
                    );
                    if (staffRes && staffRes.success) {
                        setApiStaff(staffRes.data);
                    }
                } catch (error) {
                    console.error("Error fetching agency staff:", error);
                } finally {
                    setApiLoading(false);
                }
            };
            fetchAgencyStaff();
        }
    }, [selectedAgency]);

    // Use API data if available, else fallback to Redux
    const activeAgencies = useApiData ? apiAgencies : reduxAgencies;
    const activeRequests = useApiData ? apiRequests : reduxRequests;

    // Map nested structure for rendering compatibility
    const agencies = activeAgencies.map((a) => {
        let agencyStaff = [];
        if (useApiData) {
            if (selectedAgency && String(a.id) === String(selectedAgency.id)) {
                agencyStaff = apiStaff;
            } else {
                agencyStaff = Array(a.staffCount || 0).fill({});
            }
        } else {
            agencyStaff = reduxUsers.filter(
                (u) => String(u.agencyId) === String(a.id)
            );
        }
        return {
            ...a,
            users: agencyStaff,
        };
    });

    const currentSelectedAgency = selectedAgency
        ? agencies.find((a) => String(a.id) === String(selectedAgency.id))
        : null;

    // --- Modals State ---
    const [detailsModalVisible, setDetailsModalVisible] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState(null);

    const [walletDetailsVisible, setWalletDetailsVisible] = useState(false);
    const [selectedWalletRequest, setSelectedWalletRequest] = useState(null);

    const handleOpenRequestDetails = (request) => {
        setSelectedRequest(request);
        setDetailsModalVisible(true);
    };

    const handleOpenWalletDetails = (request) => {
        setSelectedWalletRequest(request);
        setWalletDetailsVisible(true);
    };

    const [editAgencyVisible, setEditAgencyVisible] = useState(false);
    const [agencyEditData, setAgencyEditData] = useState({
        id: "",
        name: "",
        owner: "",
        email: "",
        phone_number: "",
        address: "",
    });

    const [addEmployeeVisible, setAddEmployeeVisible] = useState(false);
    const [newEmployeeData, setNewEmployeeData] = useState({
        name: "",
        username: "",
        password: "",
        email: "",
        phone_number: "",
        role: ROLES.AGENCY_USER,
    });

    const [editEmployeeVisible, setEditEmployeeVisible] = useState(false);
    const [employeeEditData, setEmployeeEditData] = useState({
        id: "",
        name: "",
        username: "",
        email: "",
        phone_number: "",
        role: ROLES.AGENCY_USER,
    });

    const [roleModalVisible, setRoleModalVisible] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [selectedRole, setSelectedRole] = useState("");

    // Handle Approvals
    const handleApprove = async (request) => {
        if (useApiData) {
            try {
                const res = await apiService.post(
                    `users/requests/${request.id}/approve`
                );
                if (res && res.success) {
                    toast.success(
                        `Approved agency ${request.name}!`,
                        "Approved",
                        true
                    );
                    fetchData(); // Refresh data
                } else {
                    toast.error(
                        res?.message || "Failed to approve request",
                        "Error",
                        true
                    );
                }
            } catch (error) {
                console.error(error);
                toast.error("Failed to approve request via API", "Error", true);
            }
        } else {
            dispatch(approveRequest(request.id));
            toast.success(
                `Approved agency ${request.name}! Admin user registered.`,
                "Approved",
                true
            );
        }
    };

    // Handle Rejections
    const handleReject = async (request) => {
        if (useApiData) {
            try {
                const res = await apiService.post(
                    `users/requests/${request.id}/reject`
                );
                if (res && res.success) {
                    toast.success(
                        `Rejected registration request from ${request.name}.`,
                        "Rejected",
                        true
                    );
                    fetchData(); // Refresh data
                } else {
                    toast.error(
                        res?.message || "Failed to reject request",
                        "Error",
                        true
                    );
                }
            } catch (error) {
                console.error(error);
                toast.error("Failed to reject request via API", "Error", true);
            }
        } else {
            dispatch(rejectRequest(request.id));
            toast.success(
                `Rejected registration request from ${request.name}.`,
                "Rejected",
                true
            );
        }
    };

    const handleApproveWallet = async (request) => {
        try {
            const res = await apiService.post(
                `wallets/requests/${request.id}/approve`
            );
            if (res && res.success) {
                toast.success(
                    `Approved ₹${request.amount.toFixed(2)} deposit for ${
                        request.userName
                    }!`,
                    "Approved",
                    true
                );
                fetchData(); // Refresh list
            } else {
                toast.error(
                    res?.message || "Failed to approve request",
                    "Error",
                    true
                );
            }
        } catch (error) {
            console.error(error);
            toast.error("Failed to approve wallet request", "Error", true);
        }
    };

    const handleRejectWallet = async (request) => {
        try {
            const res = await apiService.post(
                `wallets/requests/${request.id}/reject`
            );
            if (res && res.success) {
                toast.success(
                    `Rejected deposit request of ₹${request.amount.toFixed(
                        2
                    )} from ${request.userName}.`,
                    "Rejected",
                    true
                );
                fetchData(); // Refresh list
            } else {
                toast.error(
                    res?.message || "Failed to reject request",
                    "Error",
                    true
                );
            }
        } catch (error) {
            console.error(error);
            toast.error("Failed to reject wallet request", "Error", true);
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
        if (useApiData) {
            try {
                const res = await apiService.put(
                    `agencies/${agencyEditData.id}`,
                    {
                        org_name: agencyEditData.name,
                        phone_number: agencyEditData.phone_number,
                        org_address: agencyEditData.address,
                    }
                );
                if (res && res.success) {
                    toast.success(
                        "Agency profile updated successfully!",
                        "Success",
                        true
                    );
                    setEditAgencyVisible(false);
                    fetchData();
                } else {
                    toast.error(
                        res?.message || "Failed to update agency",
                        "Error",
                        true
                    );
                }
            } catch (error) {
                console.error(error);
                toast.error("Failed to update agency via API", "Error", true);
            }
        } else {
            dispatch(updateAgency(agencyEditData));
            toast.success(
                "Agency profile updated successfully!",
                "Success",
                true
            );
            setEditAgencyVisible(false);

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
        if (
            !newEmployeeData.name ||
            !newEmployeeData.username ||
            !newEmployeeData.password
        ) {
            toast.error(
                "Name, Username, and Password are required.",
                "Error",
                true
            );
            return;
        }

        if (useApiData) {
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
                    toast.success(
                        `Registered ${newEmployeeData.name} as staff!`,
                        "Success",
                        true
                    );
                    setAddEmployeeVisible(false);
                    if (selectedAgency) {
                        const staffRes = await apiService.get(
                            `users/staff/${selectedAgency.id}`
                        );
                        if (staffRes && staffRes.success)
                            setApiStaff(staffRes.data);
                    }
                } else {
                    toast.error(
                        res?.message || "Failed to register staff",
                        "Error",
                        true
                    );
                }
            } catch (error) {
                console.error(error);
                const msg =
                    error.response?.data?.message ||
                    "Failed to register staff via API";
                toast.error(msg, "Error", true);
            }
        } else {
            const exists = reduxUsers.some(
                (u) =>
                    u.username.toLowerCase() ===
                    newEmployeeData.username.toLowerCase()
            );
            if (exists) {
                toast.error("Username is already taken.", "Error", true);
                return;
            }

            dispatch(
                registerAgencyUser({
                    ...newEmployeeData,
                    agencyId: currentSelectedAgency.id,
                })
            );

            toast.success(
                `Registered ${newEmployeeData.name} as staff!`,
                "Success",
                true
            );
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

        if (useApiData) {
            try {
                const res = await apiService.put(
                    `users/staff/${employeeEditData.id}`,
                    {
                        full_name: employeeEditData.name,
                        username: employeeEditData.username,
                        email: employeeEditData.email,
                        phone_number: employeeEditData.phone_number,
                        role: employeeEditData.role,
                    }
                );
                if (res && res.success) {
                    toast.success(
                        "Employee details updated successfully!",
                        "Success",
                        true
                    );
                    setEditEmployeeVisible(false);
                    if (selectedAgency) {
                        const staffRes = await apiService.get(
                            `users/staff/${selectedAgency.id}`
                        );
                        if (staffRes && staffRes.success)
                            setApiStaff(staffRes.data);
                    }
                } else {
                    toast.error(
                        res?.message || "Failed to update employee",
                        "Error",
                        true
                    );
                }
            } catch (error) {
                console.error(error);
                const msg =
                    error.response?.data?.message ||
                    "Failed to update employee via API";
                toast.error(msg, "Error", true);
            }
        } else {
            dispatch(updateAgencyUser(employeeEditData));
            toast.success(
                "Employee details updated successfully!",
                "Success",
                true
            );
            setEditEmployeeVisible(false);
        }
    };

    // Delete Employee
    const handleDeleteEmployee = async (empId, empName) => {
        if (useApiData) {
            try {
                const res = await apiService.delete(`users/staff/${empId}`);
                if (res && res.success) {
                    toast.success(
                        `Removed ${empName} from agency roster.`,
                        "Removed",
                        true
                    );
                    if (selectedAgency) {
                        const staffRes = await apiService.get(
                            `users/staff/${selectedAgency.id}`
                        );
                        if (staffRes && staffRes.success)
                            setApiStaff(staffRes.data);
                    }
                } else {
                    toast.error(
                        res?.message || "Failed to delete employee",
                        "Error",
                        true
                    );
                }
            } catch (error) {
                console.error(error);
                toast.error("Failed to delete employee via API", "Error", true);
            }
        } else {
            dispatch(deleteAgencyUser(empId));
            toast.success(
                `Removed ${empName} from agency roster.`,
                "Removed",
                true
            );
        }
    };

    // Toggle Employee Block Status
    const handleToggleStatus = async (emp) => {
        if (useApiData) {
            try {
                const res = await apiService.post(
                    `users/staff/${emp.id}/toggle-status`
                );
                if (res && res.success) {
                    const newStatus =
                        emp.status === "active" ? "blocked" : "active";
                    toast.success(
                        `${emp.name} is now ${
                            newStatus === "blocked" ? "disabled" : "activated"
                        }.`,
                        newStatus === "blocked"
                            ? "Account Blocked"
                            : "Account Active",
                        true
                    );
                    if (selectedAgency) {
                        const staffRes = await apiService.get(
                            `users/staff/${selectedAgency.id}`
                        );
                        if (staffRes && staffRes.success)
                            setApiStaff(staffRes.data);
                    }
                } else {
                    toast.error(
                        res?.message || "Failed to update staff status",
                        "Error",
                        true
                    );
                }
            } catch (error) {
                console.error(error);
                toast.error("Failed to toggle status via API", "Error", true);
            }
        } else {
            dispatch(toggleUserStatus(emp.id));
            const newStatus = emp.status === "active" ? "blocked" : "active";
            toast.success(
                `${emp.name} is now ${
                    newStatus === "blocked" ? "disabled" : "activated"
                }.`,
                newStatus === "blocked" ? "Account Blocked" : "Account Active",
                true
            );
        }
    };

    // Role Change Submissions
    const handleChangeRoleSubmit = async () => {
        if (!selectedUser || !selectedRole) return;
        if (useApiData) {
            try {
                const res = await apiService.put(
                    `users/staff/${selectedUser.id}`,
                    {
                        full_name: selectedUser.name,
                        username: selectedUser.username,
                        email: selectedUser.email,
                        phone_number: selectedUser.phone_number,
                        role: selectedRole,
                    }
                );
                if (res && res.success) {
                    toast.success("User role updated!", "Success", true);
                    setRoleModalVisible(false);
                    setSelectedUser(null);
                    if (selectedAgency) {
                        const staffRes = await apiService.get(
                            `users/staff/${selectedAgency.id}`
                        );
                        if (staffRes && staffRes.success)
                            setApiStaff(staffRes.data);
                    }
                } else {
                    toast.error(
                        res?.message || "Failed to update role",
                        "Error",
                        true
                    );
                }
            } catch (error) {
                console.error(error);
                toast.error("Failed to update role via API", "Error", true);
            }
        } else {
            dispatch(
                updateAgencyUser({
                    ...selectedUser,
                    role: selectedRole,
                })
            );
            toast.success("User role updated!", "Success", true);
            setRoleModalVisible(false);
            setSelectedUser(null);
        }
    };

    // Filters
    const filteredRequests = activeRequests.filter((r) => {
        const query = searchQuery.toLowerCase();
        return (
            r.name.toLowerCase().includes(query) ||
            r.owner.toLowerCase().includes(query) ||
            r.email.toLowerCase().includes(query)
        );
    });

    const filteredAgencies = agencies.filter((a) => {
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
              const name = u.name || "";
              const username = u.username || "";
              const email = u.email || "";
              const matchesSearch =
                  name.toLowerCase().includes(query) ||
                  username.toLowerCase().includes(query) ||
                  email.toLowerCase().includes(query);
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
            <View className="px-4 py-3 bg-white">
                <SegmentedButtons
                    value={tab}
                    onValueChange={handleTabChange}
                    buttons={[
                        {
                            value: "requests",
                            label: `Requests (${activeRequests.length})`,
                            showSelectedCheck: true,
                        },
                        {
                            value: "active",
                            label: `Agencies (${activeAgencies.length})`,
                            showSelectedCheck: true,
                        },
                        {
                            value: "wallet",
                            label: `Wallet (${walletRequests.length})`,
                            showSelectedCheck: true,
                        },
                    ]}
                    theme={{ colors: { primary: "#4338ca" } }}
                />
            </View>

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
                            selectedColor={
                                selectedRoleFilter === "all"
                                    ? "#fff"
                                    : "#64748b"
                            }
                            style={{
                                backgroundColor:
                                    selectedRoleFilter === "all"
                                        ? "#4338ca"
                                        : "#f1f5f9",
                            }}
                        >
                            All Roles
                        </Chip>
                        {Object.keys(ROLES).map((roleKey) => {
                            const roleValue = ROLES[roleKey];
                            return (
                                <Chip
                                    key={roleValue}
                                    selected={selectedRoleFilter === roleValue}
                                    onPress={() =>
                                        setSelectedRoleFilter(roleValue)
                                    }
                                    className="mr-2 h-9 items-center justify-center rounded-full"
                                    selectedColor={
                                        selectedRoleFilter === roleValue
                                            ? "#fff"
                                            : "#64748b"
                                    }
                                    style={{
                                        backgroundColor:
                                            selectedRoleFilter === roleValue
                                                ? "#4338ca"
                                                : "#f1f5f9",
                                    }}
                                >
                                    {ROLE_DISPLAY_NAMES[roleValue]}
                                </Chip>
                            );
                        })}
                    </ScrollView>
                </View>
            )}

            {/* Breadcrumb / Back button when drilling down */}
            {tab === "active" && currentSelectedAgency && (
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
            {tab === "requests" ? (
                <RequestsTab
                    data={filteredRequests}
                    onApprove={handleApprove}
                    onReject={handleReject}
                    onPressItem={handleOpenRequestDetails}
                />
            ) : tab === "wallet" ? (
                <WalletRequestsTab
                    requests={walletRequests}
                    onApprove={handleApproveWallet}
                    onReject={handleRejectWallet}
                    onPressItem={handleOpenWalletDetails}
                />
            ) : currentSelectedAgency ? (
                <EmployeeRosterList
                    employees={filteredEmployees}
                    currentSelectedAgency={currentSelectedAgency}
                    role={role}
                    onToggleStatus={handleToggleStatus}
                    onEditEmployee={openEditEmployee}
                    onDeleteEmployee={handleDeleteEmployee}
                    onOpenRoleModal={openRoleModal}
                    onOpenEditAgency={openEditAgency}
                    onOpenAddEmployee={openAddEmployee}
                    onOpenAgencyDetails={openAgencyDetails}
                />
            ) : (
                <AgenciesList
                    agencies={filteredAgencies}
                    onPressAgency={(item) => {
                        setSelectedAgency(item);
                        setSearchQuery("");
                    }}
                />
            )}

            {/* Modals & Dialogs */}
            <Portal>
                <EditAgencyModal
                    visible={editAgencyVisible}
                    onDismiss={() => setEditAgencyVisible(false)}
                    data={agencyEditData}
                    onChangeData={setAgencyEditData}
                    onSave={handleSaveAgency}
                />

                <AddEmployeeModal
                    visible={addEmployeeVisible}
                    onDismiss={() => setAddEmployeeVisible(false)}
                    data={newEmployeeData}
                    onChangeData={setNewEmployeeData}
                    onSubmit={handleCreateEmployee}
                />

                <EditEmployeeModal
                    visible={editEmployeeVisible}
                    onDismiss={() => setEditEmployeeVisible(false)}
                    data={employeeEditData}
                    onChangeData={setEmployeeEditData}
                    onSave={handleSaveEmployee}
                />

                <RoleModal
                    visible={roleModalVisible}
                    onDismiss={() => setRoleModalVisible(false)}
                    selectedUser={selectedUser}
                    selectedRole={selectedRole}
                    onChangeRole={setSelectedRole}
                    onSubmit={handleChangeRoleSubmit}
                />

                <RequestDetailsModal
                    visible={detailsModalVisible}
                    onDismiss={() => {
                        setDetailsModalVisible(false);
                        setSelectedRequest(null);
                    }}
                    request={selectedRequest}
                    onApprove={handleApprove}
                    onReject={handleReject}
                />

                <AgencyDetailsModal
                    visible={agencyDetailsVisible}
                    onDismiss={() => setAgencyDetailsVisible(false)}
                    agency={selectedAgency}
                />

                <WalletDetailsModal
                    visible={walletDetailsVisible}
                    onDismiss={() => {
                        setWalletDetailsVisible(false);
                        setSelectedWalletRequest(null);
                    }}
                    request={selectedWalletRequest}
                    onApprove={handleApproveWallet}
                    onReject={handleRejectWallet}
                />
            </Portal>
        </View>
    );
}
