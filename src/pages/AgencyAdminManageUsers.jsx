import React, { useState, useEffect } from "react";
import { View, ScrollView, ActivityIndicator } from "react-native";
import { TextInput, Chip, Portal } from "react-native-paper";
import { useSelector, useDispatch } from "react-redux";
import useToast from "../hooks/useToast";
import useRolePermissions from "../hooks/useRolePermissions";
import { ROLES, ROLE_DISPLAY_NAMES } from "../utils/rbacConfig";
import apiService from "../utils/apiService";
import {
    registerAgencyUser,
    updateAgencyUser,
    deleteAgencyUser,
    toggleUserStatus,
} from "../store/slices/parkingSlice";

import AddEmployeeModal from "../components/manageUsers/AddEmployeeModal";
import EditEmployeeModal from "../components/manageUsers/EditEmployeeModal";
import RoleModal from "../components/manageUsers/RoleModal";
import EmployeeRosterList from "../components/manageUsers/EmployeeRosterList";

export default function AgencyAdminManageUsers({ navigation }) {
    const toast = useToast();
    const dispatch = useDispatch();
    const { role, user } = useRolePermissions();

    const [searchQuery, setSearchQuery] = useState("");
    const [selectedRoleFilter, setSelectedRoleFilter] = useState("all");

    // API state
    const [apiAgencies, setApiAgencies] = useState([]);
    const [apiStaff, setApiStaff] = useState([]);
    const [apiLoading, setApiLoading] = useState(false);
    const [useApiData, setUseApiData] = useState(false);

    // Fetch from Redux
    const reduxAgencies = useSelector((state) => state.parking.agencies);
    const reduxUsers = useSelector((state) => state.parking.users);

    const [selectedAgency, setSelectedAgency] = useState(null);

    // Fetch data from API
    const fetchData = async () => {
        setApiLoading(true);
        try {
            // Fetch the agency admin's own agency
            if (user?.agencyId) {
                const agencyRes = await apiService.get(
                    `agencies/${user.agencyId}`
                );
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
            setUseApiData(true);
        } catch (error) {
            console.error(
                "Error fetching users/staff/agencies from API:",
                error
            );
        } finally {
            setApiLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [user?.agencyId]);

    // Use API data if available, else fallback to Redux
    const activeAgencies = useApiData ? apiAgencies : reduxAgencies;

    // Map nested structure for rendering compatibility
    const agencies = activeAgencies.map((a) => {
        let agencyStaff = [];
        if (useApiData) {
            if (String(a.id) === String(user?.agencyId)) {
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

    // Computed agency for current role
    const currentSelectedAgency =
        agencies.find(
            (a) =>
                String(a.id) === String(user?.agencyId) ||
                a.owner === user?.name ||
                a.email === user?.email ||
                a.users?.some(
                    (u) =>
                        (u.id &&
                            user?.id &&
                            String(u.id) === String(user?.id)) ||
                        (u.email && user?.email && u.email === user?.email)
                )
        ) || null;

    // --- Modals State ---
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
                    // Refresh staff list
                    const staffRes = await apiService.get("users/staff");
                    if (staffRes && staffRes.success)
                        setApiStaff(staffRes.data);
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
            // Check if username already exists
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
                    // Refresh staff list
                    const staffRes = await apiService.get("users/staff");
                    if (staffRes && staffRes.success)
                        setApiStaff(staffRes.data);
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
                    // Refresh staff list
                    const staffRes = await apiService.get("users/staff");
                    if (staffRes && staffRes.success)
                        setApiStaff(staffRes.data);
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
                    // Refresh staff list
                    const staffRes = await apiService.get("users/staff");
                    if (staffRes && staffRes.success)
                        setApiStaff(staffRes.data);
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
                    // Refresh staff list
                    const staffRes = await apiService.get("users/staff");
                    if (staffRes && staffRes.success)
                        setApiStaff(staffRes.data);
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

    return (
        <View className="flex-1 bg-slate-50">
            {/* Search Input Bar */}
            <View className="px-4 pt-3 pb-2 bg-white border-b border-slate-100">
                <TextInput
                    placeholder={
                        currentSelectedAgency
                            ? `Search users under ${currentSelectedAgency.name}...`
                            : "Search users..."
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

            {/* Role Filter Pills */}
            {currentSelectedAgency && (
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

            {/* Content List */}
            {currentSelectedAgency && (
                <EmployeeRosterList
                    employees={filteredEmployees}
                    currentSelectedAgency={currentSelectedAgency}
                    role={role}
                    onToggleStatus={handleToggleStatus}
                    onEditEmployee={openEditEmployee}
                    onDeleteEmployee={handleDeleteEmployee}
                    onOpenRoleModal={openRoleModal}
                    onOpenAddEmployee={openAddEmployee}
                />
            )}

            {/* Modals & Dialogs */}
            <Portal>
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
            </Portal>
        </View>
    );
}
