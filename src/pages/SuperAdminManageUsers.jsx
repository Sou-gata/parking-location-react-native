import React, { useState, useEffect } from "react";
import { View, ScrollView, Pressable, ActivityIndicator } from "react-native";
import {
    Text,
    TextInput,
    Portal,
    IconButton,
    Surface,
    Modal,
    Button,
} from "react-native-paper";
import Chip from "../components/Chip";
import { useSelector, useDispatch } from "react-redux";
import { MaterialDesignIcons } from "@react-native-vector-icons/material-design-icons";
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
import WithdrawalActionModal from "../components/manageUsers/WithdrawalActionModal";
import AdminTransactionHistoryTab from "../components/manageUsers/AdminTransactionHistoryTab";
import WorkingHoursApprovalModal from "../components/manageUsers/WorkingHoursApprovalModal";
import AgencySettlementsTab from "../components/manageUsers/AgencySettlementsTab";
import ApproveSettlementModal from "../components/manageUsers/ApproveSettlementModal";
import SuperAdminRegisterComplaintModal from "../components/SuperAdminRegisterComplaintModal";
import VehicleRequestsTab from "../components/manageUsers/VehicleRequestsTab";
import VehicleRejectModal from "../components/manageUsers/VehicleRejectModal";

export default function SuperAdminManageUsers({ route, navigation }) {
    const toast = useToast();
    const dispatch = useDispatch();
    const { role } = useRolePermissions();

    // Register Complaint Modal state
    const [registerModalVisible, setRegisterModalVisible] = useState(false);
    const [registerTargetType, setRegisterTargetType] = useState("user");
    const [registerTargetId, setRegisterTargetId] = useState(null);
    const [registerTargetName, setRegisterTargetName] = useState("");

    const [tab, setTab] = useState(route?.params?.initialTab || "requests");
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedRoleFilter, setSelectedRoleFilter] = useState("all");

    const handleTabChange = (selectedTab) => {
        setTab(selectedTab);
        setSearchQuery("");
        setSelectedRoleFilter("all");
        setSelectedAgency(null);
    };

    useEffect(() => {
        if (route?.params?.initialTab) {
            handleTabChange(route.params.initialTab);
        }
    }, [route?.params?.initialTab]);

    // API state
    const [apiAgencies, setApiAgencies] = useState([]);
    const [apiRequests, setApiRequests] = useState([]);
    const [pendingVehicleRequests, setPendingVehicleRequests] = useState([]);
    const [vehicleRejectModalVisible, setVehicleRejectModalVisible] =
        useState(false);
    const [vehicleToReject, setVehicleToReject] = useState(null);
    const [userWalletRequests, setUserWalletRequests] = useState([]);
    const [agencyWithdrawalRequests, setAgencyWithdrawalRequests] = useState(
        []
    );
    const [agencySettlements, setAgencySettlements] = useState([]);
    const [workingHoursRequests, setWorkingHoursRequests] = useState([]);
    const [adminHistory, setAdminHistory] = useState([]);
    const [selectedAgencyFilterId, setSelectedAgencyFilterId] = useState("all");
    const [apiStaff, setApiStaff] = useState([]);
    const [apiLoading, setApiLoading] = useState(false);
    const [useApiData, setUseApiData] = useState(false);

    // Settlement modal states
    const [approveSettlementModalVisible, setApproveSettlementModalVisible] =
        useState(false);
    const [settlementToApprove, setSettlementToApprove] = useState(null);
    const [rejectSettlementModalVisible, setRejectSettlementModalVisible] =
        useState(false);
    const [settlementToReject, setSettlementToReject] = useState(null);
    const [rejectionReasonInput, setRejectionReasonInput] = useState("");
    const [submittingSettlement, setSubmittingSettlement] = useState(false);

    // Agency Withdrawal Modal states
    const [withdrawalModalVisible, setWithdrawalModalVisible] = useState(false);
    const [selectedWithdrawalRequest, setSelectedWithdrawalRequest] =
        useState(null);
    const [withdrawalActionType, setWithdrawalActionType] = useState("approve"); // "approve" or "reject"

    // Working Hours Modal state
    const [whModalVisible, setWhModalVisible] = useState(false);
    const [selectedWHRequest, setSelectedWHRequest] = useState(null);

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

            // Fetch pending vehicle registration requests
            try {
                const vehicleRequestsRes = await apiService.get(
                    "users/vehicles/requests"
                );
                if (vehicleRequestsRes && vehicleRequestsRes.success) {
                    setPendingVehicleRequests(vehicleRequestsRes.data || []);
                }
            } catch (vehErr) {
                console.error(
                    "Error fetching pending vehicle requests:",
                    vehErr
                );
            }

            // Fetch pending customer deposit requests
            const customerWalletRes = await apiService.get("wallets/requests");
            if (customerWalletRes && customerWalletRes.success) {
                setUserWalletRequests(customerWalletRes.data);
            }

            // Fetch pending agency withdrawal requests
            const agencyWithdrawRes = await apiService.get(
                "wallets/agency/requests"
            );
            if (agencyWithdrawRes && agencyWithdrawRes.success) {
                setAgencyWithdrawalRequests(agencyWithdrawRes.data);
            }

            // Fetch pending agency revenue settlements
            try {
                const settlementsRes = await apiService.get(
                    "wallets/agency/settlements/pending"
                );
                if (settlementsRes && settlementsRes.success) {
                    setAgencySettlements(settlementsRes.data || []);
                }
            } catch (settleErr) {
                console.error(
                    "Error fetching pending agency settlements:",
                    settleErr
                );
            }

            // Fetch pending working hours requests
            try {
                const whRes = await apiService.get("working-hours/pending");
                if (whRes && whRes.success) {
                    setWorkingHoursRequests(whRes.data || []);
                }
            } catch (whErr) {
                console.error(
                    "Error fetching pending working hours requests:",
                    whErr
                );
            }

            // Fetch admin transaction history
            const historyRes = await apiService.get("wallets/admin/history");
            if (historyRes && historyRes.success) {
                setAdminHistory(historyRes.data);
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

    // Handle Vehicle Approvals & Rejections
    const handleApproveVehicle = async (item) => {
        try {
            const res = await apiService.post(
                "users/vehicles/requests/approve",
                {
                    userId: item.userId,
                    vehicleNumber: item.vehicleNumber,
                }
            );
            if (res && res.success) {
                toast.success(
                    `Approved vehicle ${item.vehicleNumber}!`,
                    "Approved",
                    true
                );
                fetchData();
            } else {
                toast.error(
                    res?.message || "Failed to approve vehicle",
                    "Error",
                    true
                );
            }
        } catch (error) {
            console.error("Error approving vehicle:", error);
            toast.error("Failed to approve vehicle request", "Error", true);
        }
    };

    const handleRejectVehicleClick = (item) => {
        setVehicleToReject(item);
        setVehicleRejectModalVisible(true);
    };

    const handleRejectVehicleSubmit = async ({
        userId,
        vehicleNumber,
        rejection_reason,
    }) => {
        try {
            const res = await apiService.post(
                "users/vehicles/requests/reject",
                {
                    userId,
                    vehicleNumber,
                    rejection_reason,
                }
            );
            if (res && res.success) {
                toast.success(
                    `Rejected vehicle ${vehicleNumber}.`,
                    "Rejected",
                    true
                );
                fetchData();
            } else {
                toast.error(
                    res?.message || "Failed to reject vehicle",
                    "Error",
                    true
                );
            }
        } catch (error) {
            console.error("Error rejecting vehicle:", error);
            toast.error("Failed to reject vehicle request", "Error", true);
        }
    };

    const handleApproveWallet = async (request) => {
        if (request.type === "agency_withdrawal" || request.agencyId) {
            setSelectedWithdrawalRequest(request);
            setWithdrawalActionType("approve");
            setWithdrawalModalVisible(true);
            return;
        }
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
        if (request.type === "agency_withdrawal" || request.agencyId) {
            setSelectedWithdrawalRequest(request);
            setWithdrawalActionType("reject");
            setWithdrawalModalVisible(true);
            return;
        }
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

    const handleConfirmWithdrawalSubmit = async (data) => {
        if (!selectedWithdrawalRequest) return;
        const reqId = selectedWithdrawalRequest.id;

        if (withdrawalActionType === "approve") {
            const res = await apiService.post(
                `wallets/agency/requests/${reqId}/approve`,
                data
            );
            if (res && res.success) {
                toast.success(
                    `Approved cash withdrawal of ₹${parseFloat(
                        selectedWithdrawalRequest.amount || 0
                    ).toFixed(2)} for ${
                        selectedWithdrawalRequest.agencyName || "Agency"
                    }!`,
                    "Approved",
                    true
                );
                fetchData();
            } else {
                toast.error(
                    res?.message || "Failed to approve withdrawal",
                    "Error",
                    true
                );
            }
        } else {
            const res = await apiService.post(
                `wallets/agency/requests/${reqId}/reject`,
                data
            );
            if (res && res.success) {
                toast.success(
                    `Rejected withdrawal request for ${
                        selectedWithdrawalRequest.agencyName || "Agency"
                    }.`,
                    "Rejected",
                    true
                );
                fetchData();
            } else {
                toast.error(
                    res?.message || "Failed to reject withdrawal",
                    "Error",
                    true
                );
            }
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
            commission_percentage:
                agency.commission_percentage !== undefined
                    ? agency.commission_percentage
                    : 0,
        });
        setEditAgencyVisible(true);
    };

    const handleSaveAgency = async () => {
        if (!agencyEditData.name || !agencyEditData.owner) {
            toast.error("Please fill in required fields.", "Error", true);
            return;
        }
        const parsedCommission = isNaN(
            parseFloat(agencyEditData.commission_percentage)
        )
            ? 0
            : parseFloat(agencyEditData.commission_percentage);

        if (useApiData) {
            try {
                const res = await apiService.put(
                    `agencies/${agencyEditData.id}`,
                    {
                        org_name: agencyEditData.name,
                        phone_number: agencyEditData.phone_number,
                        org_address: agencyEditData.address,
                        commission_percentage: parsedCommission,
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
            dispatch(
                updateAgency({
                    ...agencyEditData,
                    commission_percentage: parsedCommission,
                })
            );
            toast.success(
                "Agency profile updated successfully!",
                "Success",
                true
            );
            setEditAgencyVisible(false);

            if (selectedAgency && selectedAgency.id === agencyEditData.id) {
                setSelectedAgency((prev) => ({
                    ...prev,
                    ...agencyEditData,
                    commission_percentage: parsedCommission,
                }));
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

            {Boolean(apiLoading) && (
                <ActivityIndicator
                    animating={true}
                    color="#4338ca"
                    style={{ marginVertical: 10 }}
                />
            )}

            {/* Tab Selector Bar */}
            <View className="bg-white py-2.5 border-b border-slate-100">
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ paddingHorizontal: 16 }}
                >
                    {[
                        {
                            key: "requests",
                            label: `Registrations (${activeRequests.length})`,
                            icon: "account-clock",
                        },
                        {
                            key: "vehicles",
                            label: `Vehicles (${pendingVehicleRequests.length})`,
                            icon: "car-clock",
                        },
                        {
                            key: "active",
                            label: `Agencies (${activeAgencies.length})`,
                            icon: "domain",
                        },
                        {
                            key: "user_wallets",
                            label: `User Deposits (${userWalletRequests.length})`,
                            icon: "wallet-plus",
                        },
                        {
                            key: "agency_settlements",
                            label: `Revenue Settlements (${agencySettlements.length})`,
                            icon: "cash-clock",
                        },
                        {
                            key: "agency_withdrawals",
                            label: `Agency Withdrawals (${agencyWithdrawalRequests.length})`,
                            icon: "cash-minus",
                        },
                        {
                            key: "working_hours",
                            label: `Working Hours (${workingHoursRequests.length})`,
                            icon: "clock-alert-outline",
                        },
                        { key: "history", label: "History", icon: "history" },
                    ].map((t) => {
                        const isSelected = tab === t.key;
                        return (
                            <Chip
                                key={t.key}
                                selected={isSelected}
                                icon={t.icon}
                                onPress={() => handleTabChange(t.key)}
                                className="mr-2 h-9"
                                style={{
                                    backgroundColor: isSelected
                                        ? "#4338ca"
                                        : "#f1f5f9",
                                    borderColor: isSelected
                                        ? "#4338ca"
                                        : "#cbd5e1",
                                }}
                                textStyle={{
                                    color: isSelected ? "#ffffff" : "#334155",
                                    fontWeight: isSelected ? "700" : "600",
                                }}
                            >
                                {t.label}
                            </Chip>
                        );
                    })}
                </ScrollView>
            </View>

            {/* Role Filter Pills (Drill-down view) */}
            {Boolean(tab === "active" && currentSelectedAgency) && (
                <View className="bg-white pb-3">
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={{ paddingHorizontal: 16 }}
                    >
                        <Chip
                            selected={selectedRoleFilter === "all"}
                            onPress={() => setSelectedRoleFilter("all")}
                            className="mr-2 h-9"
                            style={{
                                backgroundColor:
                                    selectedRoleFilter === "all"
                                        ? "#4338ca"
                                        : "#f1f5f9",
                                borderColor:
                                    selectedRoleFilter === "all"
                                        ? "#4338ca"
                                        : "#cbd5e1",
                            }}
                            textStyle={{
                                color:
                                    selectedRoleFilter === "all"
                                        ? "#ffffff"
                                        : "#334155",
                                fontWeight:
                                    selectedRoleFilter === "all"
                                        ? "700"
                                        : "600",
                            }}
                        >
                            All Roles
                        </Chip>
                        {Object.keys(ROLES).map((roleKey) => {
                            const roleValue = ROLES[roleKey];
                            const isRoleSel = selectedRoleFilter === roleValue;
                            return (
                                <Chip
                                    key={roleValue}
                                    selected={isRoleSel}
                                    onPress={() =>
                                        setSelectedRoleFilter(roleValue)
                                    }
                                    className="mr-2 h-9"
                                    style={{
                                        backgroundColor: isRoleSel
                                            ? "#4338ca"
                                            : "#f1f5f9",
                                        borderColor: isRoleSel
                                            ? "#4338ca"
                                            : "#cbd5e1",
                                    }}
                                    textStyle={{
                                        color: isRoleSel
                                            ? "#ffffff"
                                            : "#334155",
                                        fontWeight: isRoleSel ? "700" : "600",
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
            {Boolean(tab === "active" && currentSelectedAgency) && (
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
            ) : tab === "vehicles" ? (
                <VehicleRequestsTab
                    data={pendingVehicleRequests}
                    onApprove={handleApproveVehicle}
                    onReject={handleRejectVehicleClick}
                />
            ) : tab === "user_wallets" ? (
                <WalletRequestsTab
                    requests={userWalletRequests}
                    onApprove={handleApproveWallet}
                    onReject={handleRejectWallet}
                    onPressItem={handleOpenWalletDetails}
                />
            ) : tab === "agency_settlements" ? (
                <AgencySettlementsTab
                    settlements={agencySettlements}
                    onApprove={(item) => {
                        setSettlementToApprove(item);
                        setApproveSettlementModalVisible(true);
                    }}
                    onReject={(item) => {
                        setSettlementToReject(item);
                        setRejectionReasonInput("");
                        setRejectSettlementModalVisible(true);
                    }}
                />
            ) : tab === "agency_withdrawals" ? (
                <WalletRequestsTab
                    requests={agencyWithdrawalRequests}
                    onApprove={handleApproveWallet}
                    onReject={handleRejectWallet}
                    onPressItem={handleOpenWalletDetails}
                />
            ) : tab === "history" ? (
                <AdminTransactionHistoryTab
                    transactions={adminHistory}
                    agencies={activeAgencies}
                    selectedAgencyId={selectedAgencyFilterId}
                    onSelectAgencyId={setSelectedAgencyFilterId}
                />
            ) : tab === "working_hours" ? (
                <ScrollView
                    className="flex-1 p-4"
                    contentContainerStyle={{ paddingBottom: 40 }}
                >
                    <Text className="text-slate-700 text-base font-bold mb-3">
                        Pending Working Hours & Schedule Requests (
                        {workingHoursRequests.length})
                    </Text>
                    {workingHoursRequests.length > 0 ? (
                        workingHoursRequests.map((item) => (
                            <Surface
                                key={item.id || item.orgId}
                                elevation={1}
                                className="bg-white rounded-2xl p-4 mb-3 border border-slate-100 flex-row items-center justify-between"
                            >
                                <View className="flex-row items-center flex-1 mr-2">
                                    <View className="w-10 h-10 rounded-xl bg-blue-100 items-center justify-center mr-3">
                                        <MaterialDesignIcons
                                            name="clock-edit-outline"
                                            size={22}
                                            color="#1d4ed8"
                                        />
                                    </View>
                                    <View className="flex-1">
                                        <Text className="font-bold text-slate-800 text-sm">
                                            {item.orgName || "Parking Agency"}
                                        </Text>
                                        <Text className="text-slate-500 text-xs mt-0.5">
                                            Days:{" "}
                                            {(
                                                item.pendingWorkingDays || []
                                            ).join(", ") || "Custom Schedule"}
                                        </Text>
                                        <Text className="text-indigo-700 text-[11px] font-semibold mt-0.5">
                                            {item.pendingIs247
                                                ? "24/7 Operation"
                                                : `${
                                                      item.pendingOpenTime ||
                                                      "08:00"
                                                  } - ${
                                                      item.pendingCloseTime ||
                                                      "20:00"
                                                  }`}
                                        </Text>
                                    </View>
                                </View>
                                <Pressable
                                    className="bg-indigo-700 px-3.5 py-2 rounded-xl"
                                    onPress={() => {
                                        setSelectedWHRequest(item);
                                        setWhModalVisible(true);
                                    }}
                                >
                                    <Text className="text-white font-bold text-xs">
                                        Review
                                    </Text>
                                </Pressable>
                            </Surface>
                        ))
                    ) : (
                        <Surface
                            elevation={1}
                            className="bg-white rounded-2xl p-8 items-center justify-center border border-slate-100"
                        >
                            <MaterialDesignIcons
                                name="clock-check-outline"
                                size={40}
                                color="#cbd5e1"
                            />
                            <Text className="text-slate-400 font-medium text-xs mt-2 text-center">
                                No pending working hours requests requiring
                                approval.
                            </Text>
                        </Surface>
                    )}
                </ScrollView>
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
                    onLodgeComplaint={(user) => {
                        setRegisterTargetType("user");
                        setRegisterTargetId(user.id || user.user_id);
                        setRegisterTargetName(user.name || user.full_name);
                        setRegisterModalVisible(true);
                    }}
                />
            ) : (
                <AgenciesList
                    agencies={filteredAgencies}
                    onPressAgency={(item) => {
                        setSelectedAgency(item);
                        setSearchQuery("");
                    }}
                    onEditAgency={openEditAgency}
                    onLodgeComplaint={(agency) => {
                        setRegisterTargetType("agency");
                        setRegisterTargetId(agency.id || agency.org_id);
                        setRegisterTargetName(agency.name || agency.org_name);
                        setRegisterModalVisible(true);
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

                <WithdrawalActionModal
                    visible={withdrawalModalVisible}
                    onDismiss={() => {
                        setWithdrawalModalVisible(false);
                        setSelectedWithdrawalRequest(null);
                    }}
                    request={selectedWithdrawalRequest}
                    actionType={withdrawalActionType}
                    onSubmit={handleConfirmWithdrawalSubmit}
                />

                <WorkingHoursApprovalModal
                    visible={whModalVisible}
                    onDismiss={() => {
                        setWhModalVisible(false);
                        setSelectedWHRequest(null);
                    }}
                    request={selectedWHRequest}
                    onClose={() => {
                        setWhModalVisible(false);
                        setSelectedWHRequest(null);
                    }}
                    onRefresh={fetchData}
                />

                <ApproveSettlementModal
                    visible={approveSettlementModalVisible}
                    onDismiss={() => {
                        setApproveSettlementModalVisible(false);
                        setSettlementToApprove(null);
                    }}
                    settlement={settlementToApprove}
                    submitting={submittingSettlement}
                    onConfirmApprove={async (transactionId, customAmount) => {
                        setSubmittingSettlement(true);
                        try {
                            const res = await apiService.post(
                                `wallets/agency/settlements/${transactionId}/approve`,
                                { customAmount }
                            );
                            if (res && res.success) {
                                toast.success(
                                    "Agency settlement approved and wallet credited successfully!"
                                );
                                setApproveSettlementModalVisible(false);
                                setSettlementToApprove(null);
                                fetchData();
                            } else {
                                toast.error(
                                    res?.message ||
                                        "Failed to approve settlement",
                                    "Error",
                                    true
                                );
                            }
                        } catch (err) {
                            console.error("Error approving settlement:", err);
                            toast.error(
                                "Error approving settlement",
                                "Error",
                                true
                            );
                        } finally {
                            setSubmittingSettlement(false);
                        }
                    }}
                />

                {/* Settlement Rejection Modal */}
                <Portal>
                    <Modal
                        visible={rejectSettlementModalVisible}
                        onDismiss={() => {
                            setRejectSettlementModalVisible(false);
                            setSettlementToReject(null);
                        }}
                        contentContainerStyle={{
                            backgroundColor: "white",
                            padding: 20,
                            margin: 20,
                            borderRadius: 24,
                        }}
                    >
                        <Text className="text-xl font-extrabold text-slate-800 mb-1">
                            Reject Revenue Settlement
                        </Text>
                        <Text className="text-xs text-slate-500 mb-4">
                            Specify a reason for rejecting the revenue
                            settlement for booking #
                            {settlementToReject?.bookingCode || ""}.
                        </Text>
                        <TextInput
                            mode="outlined"
                            label="Rejection Reason"
                            placeholder="Enter rejection reason"
                            value={rejectionReasonInput}
                            onChangeText={setRejectionReasonInput}
                            multiline
                            numberOfLines={3}
                            activeOutlineColor="#dc2626"
                            outlineColor="#cbd5e1"
                            className="bg-white mb-5"
                        />
                        <View className="flex-row gap-3">
                            <Button
                                mode="outlined"
                                onPress={() =>
                                    setRejectSettlementModalVisible(false)
                                }
                                disabled={submittingSettlement}
                                className="flex-1 rounded-xl border-slate-200"
                                textColor="#64748b"
                                labelStyle={{ fontWeight: "bold" }}
                            >
                                Cancel
                            </Button>
                            <Button
                                mode="contained"
                                onPress={async () => {
                                    if (!settlementToReject) return;
                                    setSubmittingSettlement(true);
                                    try {
                                        const res = await apiService.post(
                                            `wallets/agency/settlements/${settlementToReject.id}/reject`,
                                            {
                                                rejectionReason:
                                                    rejectionReasonInput,
                                            }
                                        );
                                        if (res && res.success) {
                                            toast.success(
                                                "Revenue settlement rejected"
                                            );
                                            setRejectSettlementModalVisible(
                                                false
                                            );
                                            setSettlementToReject(null);
                                            fetchData();
                                        } else {
                                            toast.error(
                                                res?.message ||
                                                    "Failed to reject settlement",
                                                "Error",
                                                true
                                            );
                                        }
                                    } catch (err) {
                                        console.error(
                                            "Error rejecting settlement:",
                                            err
                                        );
                                        toast.error(
                                            "Error rejecting settlement",
                                            "Error",
                                            true
                                        );
                                    } finally {
                                        setSubmittingSettlement(false);
                                    }
                                }}
                                loading={submittingSettlement}
                                disabled={submittingSettlement}
                                buttonColor="#dc2626"
                                className="flex-1 rounded-xl"
                                labelStyle={{
                                    fontWeight: "bold",
                                    color: "white",
                                }}
                            >
                                Reject Settlement
                            </Button>
                        </View>
                    </Modal>
                </Portal>
            </Portal>

            {/* Super Admin Register Complaint Modal */}
            <SuperAdminRegisterComplaintModal
                visible={registerModalVisible}
                onClose={() => setRegisterModalVisible(false)}
                onSuccess={() => {
                    toast.success("Complaint registered successfully", "Success", true);
                }}
                initialTargetType={registerTargetType}
                initialTargetId={registerTargetId}
                initialTargetName={registerTargetName}
            />

            {/* Vehicle Rejection Reason Modal */}
            <VehicleRejectModal
                visible={vehicleRejectModalVisible}
                onDismiss={() => {
                    setVehicleRejectModalVisible(false);
                    setVehicleToReject(null);
                }}
                request={vehicleToReject}
                onSubmit={handleRejectVehicleSubmit}
            />
        </View>
    );
}
