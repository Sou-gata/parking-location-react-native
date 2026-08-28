import React, { useState, useEffect, useCallback } from "react";
import { View, FlatList, Pressable, ActivityIndicator } from "react-native";
import {
    Text,
    Card,
    Button,
    TextInput,
    Avatar,
    Divider,
    SegmentedButtons,
    Portal,
    Modal,
} from "react-native-paper";
import Chip from "../components/Chip";
import RatingModal from "../components/RatingModal";
import ComplaintModal from "../components/ComplaintModal";
import RefundBookingModal from "../components/RefundBookingModal";
import UserProfileModal from "../components/manageUsers/UserProfileModal";
import { useSelector, useDispatch } from "react-redux";
import {
    checkInBooking,
    checkOutBooking,
    addBooking,
    cancelBooking,
    setBookings,
    setAgencies,
} from "../store/slices/parkingSlice";
import useToast from "../hooks/useToast";
import useRolePermissions from "../hooks/useRolePermissions";
import { PERMISSIONS } from "../utils/rbacConfig";
import apiService from "../utils/apiService";
import { debounce } from "../utils/helperFunctions";

const VEHICLE_TYPE_LABELS = {
    twoWheeler: "Two-Wheeler",
    threeWheeler: "Three-Wheeler",
    car: "Car",
    suv: "SUV / MUV",
    van: "Van",
    pickup: "Pickup Truck",
    ev: "EV",
};

const VEHICLE_TYPE_ICONS = {
    twoWheeler: "motorbike",
    threeWheeler: "rickshaw",
    car: "car",
    suv: "car-estate",
    van: "van-passenger",
    pickup: "car-pickup",
    ev: "ev-station",
};

const VEHICLE_TYPE_RATES = {
    twoWheeler: 20,
    threeWheeler: 30,
    car: 40,
    suv: 50,
    van: 50,
    pickup: 50,
    ev: 60,
};

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
        ev_rate: a.ev_rate !== undefined ? parseFloat(a.ev_rate) : a.ev_rate,
    };
};

export default function CheckInOut() {
    const dispatch = useDispatch();
    const toast = useToast();
    const { user: currentUser, hasPermission } = useRolePermissions();
    const bookings = useSelector((state) => state.parking.bookings);
    const agencies = useSelector((state) => state.parking.agencies);
    const [loading, setLoading] = useState(false);

    const userAgencyId =
        currentUser?.agencyId ||
        currentUser?.org_id ||
        currentUser?.orgId ||
        currentUser?.id;

    // Get staff's agency
    const myAgency =
        agencies.find(
            (a) =>
                String(a.id) === String(userAgencyId) ||
                a.owner === currentUser?.name ||
                a.owner === currentUser?.username
        ) || agencies[0]; // fallback to first agency for super admin testing

    // Filter bookings belonging to this agency
    const myAgencyBookings = bookings.filter(
        (b) =>
            String(b.agencyId) === String(myAgency?.id) ||
            String(b.agencyId) === String(userAgencyId)
    );

    const [tab, setTab] = useState("checked_in"); // checked_in (Parked), booked (Reserved), completed

    const [searchState, setSearchState] = useState({
        query: "",
        debouncedQuery: "",
    });
    const { query: searchQuery, debouncedQuery: debouncedSearchQuery } =
        searchState;

    const [completedState, setCompletedState] = useState({
        list: [],
        page: 1,
        hasMore: true,
        loading: false,
        loadingMore: false,
        totalCount: 0,
    });
    const {
        list: completedList,
        page: completedPage,
        hasMore: completedHasMore,
        loading: completedLoading,
        loadingMore: completedLoadingMore,
        totalCount: totalCompletedCount,
    } = completedState;

    // Modals / Action states
    const [selectedBooking, setSelectedBooking] = useState(null); // Checkout modal
    const [walkinForm, setWalkinForm] = useState(null); // Walk-in modal
    const [otpState, setOtpState] = useState({
        // OTP modal
        targetBooking: null,
        input: "",
    });

    // User Profile Modal state
    const [selectedUserForModal, setSelectedUserForModal] = useState(null);

    // Approval / Rejection state
    const [selectedPendingIds, setSelectedPendingIds] = useState([]);
    const [rejectionModalState, setRejectionModalState] = useState({
        visible: false,
        targetIds: [],
        reason: "",
        submitting: false,
    });

    const handleBatchApprovalStatus = async (
        bookingIds,
        action,
        rejectionReason = ""
    ) => {
        try {
            const res = await apiService.post("bookings/approval-status", {
                bookingIds,
                action,
                rejectionReason,
            });
            if (res && res.success) {
                toast.success(
                    res.message ||
                        `Booking(s) ${
                            action === "approve" ? "approved" : "rejected"
                        } successfully!`,
                    "Success",
                    true
                );
                setSelectedPendingIds([]);
                setRejectionModalState({
                    visible: false,
                    targetIds: [],
                    reason: "",
                    submitting: false,
                });
                fetchAgenciesAndBookings();
                return true;
            } else {
                toast.error(
                    res?.message || `Failed to ${action} bookings`,
                    "Error",
                    true
                );
                return false;
            }
        } catch (error) {
            console.error(`Error updating approval status:`, error);
            toast.error(
                error.response?.data?.message || `Failed to ${action} bookings`,
                "Error",
                true
            );
            return false;
        }
    };

    const openRejectionModal = (ids) => {
        setRejectionModalState({
            visible: true,
            targetIds: ids,
            reason: "",
            submitting: false,
        });
    };

    const handleConfirmRejection = async () => {
        if (!rejectionModalState.reason || !rejectionModalState.reason.trim()) {
            toast.error("Please enter a rejection reason", "Required", true);
            return;
        }
        setRejectionModalState((prev) => ({ ...prev, submitting: true }));
        await handleBatchApprovalStatus(
            rejectionModalState.targetIds,
            "reject",
            rejectionModalState.reason.trim()
        );
        setRejectionModalState((prev) => ({ ...prev, submitting: false }));
    };

    // Consolidated Customer Rating state
    const [ratingState, setRatingState] = useState({
        visible: false,
        targetBooking: null,
        existingRating: null,
        submitting: false,
        ratingsMap: {},
    });
    const {
        visible: ratingModalVisible,
        targetBooking: targetBookingForRating,
        existingRating: existingUserRating,
        submitting: submittingRating,
        ratingsMap: userRatingsMap,
    } = ratingState;

    // Consolidated Agency Complaint state
    const [agencyComplaintState, setAgencyComplaintState] = useState({
        visible: false,
        targetBooking: null,
        submitting: false,
        complainedBookingIds: [],
    });

    // Refund Modal State
    const [refundModalState, setRefundModalState] = useState({
        visible: false,
        targetBooking: null,
    });

    // Force Cancel Modal State
    const [forceCancelModalState, setForceCancelModalState] = useState({
        visible: false,
        targetBooking: null,
        reason: "",
        submitting: false,
    });

    const handleOpenForceCancelModal = (booking) => {
        setForceCancelModalState({
            visible: true,
            targetBooking: booking,
            reason: "",
            submitting: false,
        });
    };

    const handleConfirmForceCancel = async () => {
        const { targetBooking, reason } = forceCancelModalState;
        if (!targetBooking) return;

        setForceCancelModalState((prev) => ({ ...prev, submitting: true }));
        try {
            const res = await apiService.post("bookings/force-cancel", {
                bookingCode:
                    targetBooking.bookingCode || targetBooking.booking_code,
                reason: reason.trim() || "Cancelled by agency",
            });

            if (res && res.success) {
                dispatch(
                    cancelBooking(
                        targetBooking.bookingCode || targetBooking.booking_code
                    )
                );
                toast.success(
                    res.message ||
                        `Booking ${targetBooking.bookingCode} force cancelled successfully.`,
                    "Force Cancelled",
                    true
                );
                setForceCancelModalState({
                    visible: false,
                    targetBooking: null,
                    reason: "",
                    submitting: false,
                });
                fetchAgenciesAndBookings();
            } else {
                toast.error(
                    res?.message || "Force cancellation failed.",
                    "Error",
                    true
                );
                setForceCancelModalState((prev) => ({
                    ...prev,
                    submitting: false,
                }));
            }
        } catch (error) {
            console.error("Force Cancel Error:", error);
            const errMsg =
                error.response?.data?.message ||
                error.message ||
                "Failed to force cancel booking.";
            toast.error(errMsg, "Error", true);
            setForceCancelModalState((prev) => ({
                ...prev,
                submitting: false,
            }));
        }
    };

    const handleOpenLodgeUserComplaint = (booking) => {
        if (!booking.userId) {
            toast.error(
                "Cannot lodge complaint against walk-in/guest customer without a registered user account.",
                "Info",
                true
            );
            return;
        }
        setAgencyComplaintState((prev) => ({
            ...prev,
            targetBooking: booking,
            visible: true,
        }));
    };

    const handleSubmitUserComplaint = async ({ subject, description }) => {
        const booking = agencyComplaintState.targetBooking;
        if (!booking) return;
        setAgencyComplaintState((prev) => ({ ...prev, submitting: true }));
        try {
            const res = await apiService.post("complaints", {
                bookingId: booking.id || booking.booking_id,
                subject,
                description,
                complainantType: "agency_to_user",
            });
            if (res && res.success) {
                toast.success(
                    "Complaint against user submitted successfully",
                    "Complaint Submitted",
                    true
                );
                setAgencyComplaintState((prev) => ({
                    ...prev,
                    visible: false,
                    submitting: false,
                    complainedBookingIds: [
                        ...prev.complainedBookingIds,
                        booking.id || booking.booking_id,
                    ],
                }));
            } else {
                toast.error(
                    res?.message || "Failed to submit complaint",
                    "Error",
                    true
                );
                setAgencyComplaintState((prev) => ({
                    ...prev,
                    submitting: false,
                }));
            }
        } catch (error) {
            console.error("Error submitting agency complaint:", error);
            const msg =
                error.response?.data?.message || "Failed to submit complaint";
            toast.error(msg, "Error", true);
            setAgencyComplaintState((prev) => ({ ...prev, submitting: false }));
        }
    };

    const handleOpenRateCustomer = async (booking) => {
        if (!booking.userId) {
            toast.error(
                "Cannot rate walk-in / guest customer without a registered account.",
                "Info",
                true
            );
            return;
        }
        setRatingState((prev) => ({
            ...prev,
            targetBooking: booking,
            existingRating: prev.ratingsMap[booking.id] || null,
            visible: true,
        }));
        try {
            const res = await apiService.get(`ratings/booking/${booking.id}`);
            if (res && res.success && res.data?.agencyToUserRating) {
                const ratingData = res.data.agencyToUserRating;
                setRatingState((prev) => ({
                    ...prev,
                    existingRating: ratingData,
                    ratingsMap: {
                        ...prev.ratingsMap,
                        [booking.id]: ratingData,
                    },
                }));
            }
        } catch (e) {
            console.error("Error fetching agency-to-user rating:", e);
        }
    };

    const handleSubmitCustomerRating = async ({ rating, review }) => {
        if (!targetBookingForRating) return;
        setRatingState((prev) => ({ ...prev, submitting: true }));
        try {
            const res = await apiService.post("ratings", {
                bookingId: targetBookingForRating.id,
                agencyId: targetBookingForRating.agencyId,
                rating,
                review,
                ratingType: "agency_to_user",
            });
            if (res && res.success) {
                toast.success("Customer rating submitted!", "Success", true);
                setRatingState((prev) => ({
                    ...prev,
                    visible: false,
                    submitting: false,
                    ratingsMap: {
                        ...prev.ratingsMap,
                        [targetBookingForRating.id]: res.data,
                    },
                }));
            } else {
                toast.error(
                    res?.message || "Failed to submit rating",
                    "Error",
                    true
                );
                setRatingState((prev) => ({ ...prev, submitting: false }));
            }
        } catch (error) {
            console.error("Error submitting customer rating:", error);
            const msg =
                error.response?.data?.message || "Failed to submit rating";
            toast.error(msg, "Error", true);
            setRatingState((prev) => ({ ...prev, submitting: false }));
        }
    };

    const fetchAgenciesAndBookings = async () => {
        setLoading(true);
        try {
            const currentAgencyId =
                currentUser?.agencyId ||
                currentUser?.org_id ||
                currentUser?.orgId ||
                currentUser?.id;
            let resolvedAgencyId = currentAgencyId;
            let loadedAgencies = [];

            if (hasPermission(PERMISSIONS.MANAGE_AGENCIES)) {
                const agenciesRes = await apiService.get("agencies");
                if (agenciesRes && agenciesRes.success) {
                    loadedAgencies = agenciesRes.data.map(mapAgencyFromApi);
                    dispatch(setAgencies(loadedAgencies));
                    resolvedAgencyId =
                        resolvedAgencyId || loadedAgencies[0]?.id;
                }
            } else if (currentAgencyId) {
                const agencyRes = await apiService.get(
                    `agencies/${currentAgencyId}`
                );
                if (agencyRes && agencyRes.success) {
                    loadedAgencies = [mapAgencyFromApi(agencyRes.data)];
                    dispatch(setAgencies(loadedAgencies));
                }
            }

            if (resolvedAgencyId) {
                const bookingsRes = await apiService.get(
                    `bookings/agency/${resolvedAgencyId}`
                );
                if (bookingsRes && bookingsRes.success) {
                    dispatch(setBookings(bookingsRes.data));
                }
                try {
                    const compRes = await apiService.get("complaints/agency");
                    if (compRes && compRes.success && Array.isArray(compRes.data)) {
                        const agencyComplaintsMap = {};
                        const agencyComplaintIds = [];
                        compRes.data.forEach((c) => {
                            if (c.complainant_type === "agency_to_user") {
                                agencyComplaintsMap[c.booking_id] = c;
                                agencyComplaintIds.push(c.booking_id);
                            }
                        });
                        setAgencyComplaintState((prev) => ({
                            ...prev,
                            complainedBookingIds: agencyComplaintIds,
                        }));
                    }
                } catch (ce) {
                    console.error("Error fetching agency complaints list:", ce);
                }
            }
        } catch (error) {
            console.error("Error fetching checkin/checkout data:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAgenciesAndBookings();
    }, [
        currentUser?.agencyId,
        currentUser?.org_id,
        currentUser?.orgId,
        currentUser?.id,
        currentUser?.role,
    ]);

    // Backend completed bookings fetcher (pagination & search)
    const fetchCompletedBookings = useCallback(
        async ({ page = 1, search = searchQuery, isLoadMore = false } = {}) => {
            const agencyId = myAgency?.id;
            if (!agencyId) return;

            if (isLoadMore) {
                setCompletedState((prev) => ({ ...prev, loadingMore: true }));
            } else {
                setCompletedState((prev) => ({ ...prev, loading: true }));
            }

            try {
                const queryParams = new URLSearchParams({
                    status: "completed",
                    page: String(page),
                    limit: "10",
                });
                if (search && search.trim()) {
                    queryParams.append("search", search.trim());
                }

                const res = await apiService.get(
                    `bookings/agency/${agencyId}?${queryParams.toString()}`
                );

                if (res && res.success) {
                    const items =
                        res.data?.items ||
                        (Array.isArray(res.data) ? res.data : []);
                    const pagination = res.data?.pagination || {};

                    setCompletedState((prev) => {
                        const existingIds = new Set(
                            prev.list.map((i) => String(i.id))
                        );
                        const newUniqueItems = items.filter(
                            (i) => !existingIds.has(String(i.id))
                        );
                        return {
                            ...prev,
                            list: isLoadMore
                                ? [...prev.list, ...newUniqueItems]
                                : items,
                            page,
                            hasMore: pagination.hasMore ?? items.length === 10,
                            totalCount:
                                pagination.totalCount !== undefined
                                    ? pagination.totalCount
                                    : prev.totalCount,
                            loading: false,
                            loadingMore: false,
                        };
                    });
                } else {
                    setCompletedState((prev) => ({
                        ...prev,
                        loading: false,
                        loadingMore: false,
                    }));
                }
            } catch (err) {
                console.error("Error fetching completed bookings:", err);
                setCompletedState((prev) => ({
                    ...prev,
                    loading: false,
                    loadingMore: false,
                }));
            }
        },
        [myAgency?.id]
    );

    // Debounced search setter using HOF debounce from helperFunctions.js (800ms pause)
    const debouncedSetSearch = useCallback(
        debounce((val) => {
            setSearchState((prev) => ({ ...prev, debouncedQuery: val }));
        }, 800),
        []
    );

    const handleSearchChange = (text) => {
        setSearchState((prev) => ({ ...prev, query: text }));
        debouncedSetSearch(text);
    };

    // Instant search submit on Enter / Search keyboard press
    const handleSearchSubmit = () => {
        if (debouncedSetSearch.cancel) debouncedSetSearch.cancel();
        setSearchState((prev) => ({ ...prev, debouncedQuery: prev.query }));
        if (tab === "completed") {
            fetchCompletedBookings({
                page: 1,
                search: searchQuery,
                isLoadMore: false,
            });
        }
    };

    // Trigger backend search and pagination when tab or debouncedSearchQuery changes
    useEffect(() => {
        if (tab === "completed") {
            fetchCompletedBookings({
                page: 1,
                search: debouncedSearchQuery,
                isLoadMore: false,
            });
        }
    }, [tab, debouncedSearchQuery, fetchCompletedBookings]);

    const handleLoadMoreCompleted = () => {
        if (
            tab === "completed" &&
            !completedLoadingMore &&
            !completedLoading &&
            completedHasMore
        ) {
            fetchCompletedBookings({
                page: completedPage + 1,
                search: debouncedSearchQuery,
                isLoadMore: true,
            });
        }
    };

    // Checkout calculated variables (derived dynamically)
    let actualDuration = 0;
    let calculatedBill = 0;
    if (selectedBooking) {
        const start = new Date(selectedBooking.startTime);
        const end = new Date();
        const diffMs = end - start;
        // Minimum 1 hour, rounded up to nearest half hour
        actualDuration = Math.max(
            1,
            Math.ceil((diffMs / (1000 * 60 * 60)) * 2) / 2
        );
        calculatedBill = actualDuration * selectedBooking.hourlyRate;
    }

    const updateWalkinForm = (key, value) => {
        setWalkinForm((prev) => (prev ? { ...prev, [key]: value } : null));
    };

    // Income calculations
    const completedBookings = myAgencyBookings.filter(
        (b) => b.status === "completed"
    );
    const activeBookings = myAgencyBookings.filter(
        (b) => b.status === "checked_in"
    );
    const totalIncome = completedBookings.reduce(
        (sum, b) => sum + (b.totalBill || 0),
        0
    );

    const handleSearch = (booking) => {
        const query = searchQuery.toLowerCase().trim();
        if (!query) return true;
        return (
            booking.bookingCode.toLowerCase().includes(query) ||
            booking.vehicleNumber.toLowerCase().includes(query) ||
            booking.userName.toLowerCase().includes(query)
        );
    };

    const filteredBookings =
        tab === "completed"
            ? completedList
            : myAgencyBookings
                  .filter((b) => b.status === tab)
                  .filter(handleSearch);

    const handleCheckIn = async (code, otp = null) => {
        try {
            const res = await apiService.post("bookings/checkin", {
                bookingCode: code,
                otp: otp ? otp.trim() : undefined,
            });
            if (res && res.success) {
                dispatch(checkInBooking(code));
                toast.success(
                    res.message || `Check-in successful for ${code}!`,
                    "Checked In",
                    true
                );
                return true;
            } else {
                toast.error(res?.message || "Check-in failed.", "Error", true);
                return false;
            }
        } catch (error) {
            console.error("Check-in Error:", error);
            const errMsg =
                error.response?.data?.message ||
                error.message ||
                "Failed to check in. Network error.";
            toast.error(errMsg, "Error", true);
            return false;
        }
    };

    const triggerCheckIn = (booking) => {
        if (booking.otp) {
            setOtpState({
                targetBooking: booking,
                input: "",
            });
        } else {
            handleCheckIn(booking.bookingCode);
        }
    };

    const handleVerifyOtpAndCheckIn = async () => {
        if (!otpState.targetBooking) return;
        if (!otpState.input.trim()) {
            toast.error("Please enter the 6-digit OTP.", "Error", true);
            return;
        }

        const success = await handleCheckIn(
            otpState.targetBooking.bookingCode,
            otpState.input
        );
        if (success) {
            setOtpState({
                targetBooking: null,
                input: "",
            });
        }
    };

    const openCheckoutModal = (booking) => {
        setSelectedBooking(booking);
    };

    const handleConfirmCheckout = async () => {
        if (!selectedBooking) return;
        try {
            const res = await apiService.post("bookings/checkout", {
                bookingCode: selectedBooking.bookingCode,
            });

            if (res && res.success) {
                const finalBill = res.data?.totalBill ?? calculatedBill;
                const endTimeStr =
                    res.data?.endTime ||
                    res.data?.checkoutTime ||
                    new Date().toISOString();

                dispatch(
                    checkOutBooking({
                        bookingCode: selectedBooking.bookingCode,
                        totalBill: finalBill,
                        actualEndTime: endTimeStr,
                    })
                );
                toast.success(
                    res.message ||
                        `Checked out successfully! Bill: ₹${finalBill.toFixed(
                            2
                        )}`,
                    "Checkout Complete",
                    true
                );
                setSelectedBooking(null);
                fetchAgenciesAndBookings();
            } else {
                toast.error(res?.message || "Checkout failed.", "Error", true);
            }
        } catch (error) {
            console.error("Checkout Error:", error);
            const errMsg =
                error.response?.data?.message ||
                error.message ||
                "Failed to check out vehicle. Network error.";
            toast.error(errMsg, "Error", true);
        }
    };

    const handleRegisterWalkin = () => {
        if (!walkinForm?.vehicleNum) {
            toast.error("Please enter the vehicle number.", "Error", true);
            return;
        }

        const vehicleType = walkinForm.vehicleType || "car";
        const bookingCode = `WK-${Math.floor(1000 + Math.random() * 9000)}`;
        const hourlyRate =
            myAgency?.[`${vehicleType}_rate`] ||
            VEHICLE_TYPE_RATES[vehicleType] ||
            40;

        const newBooking = {
            id: `book_${Date.now()}`,
            bookingCode,
            userId: null,
            userName: walkinForm.name || "Walk-In Customer",
            userPhone: walkinForm.phone || "N/A",
            agencyId: myAgency?.id,
            agencyName: myAgency?.name,
            vehicleType: vehicleType,
            vehicleNumber: (walkinForm.vehicleNum || "").toUpperCase(),
            status: "checked_in", // Checked in immediately
            startTime: new Date().toISOString(),
            endTime: null,
            bookedDuration: 0,
            hourlyRate,
            totalBill: 0,
            paymentStatus: "pending",
        };

        dispatch(addBooking(newBooking));
        toast.success(
            `Registered Walk-in check-in: ${bookingCode}`,
            "Success",
            true
        );

        // Reset fields and close modal
        setWalkinForm(null);
        setTab("checked_in");
    };

    const formatDateTime = (isoString) => {
        if (!isoString) return "-";
        const date = new Date(isoString);
        return date.toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const formatTime = (isoString) => {
        if (!isoString) return "-";
        const date = new Date(isoString);
        return date.toLocaleTimeString("en-IN", {
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    return (
        <View className="flex-1 bg-slate-50">
            {/* Dashboard Headers */}
            <View className="flex-row px-4 pt-4 gap-3">
                <Card className="flex-1 bg-indigo-600 rounded-xl" elevation={2}>
                    <Card.Content className="items-center py-3">
                        <Text className="text-white text-xs font-semibold opacity-80 uppercase">
                            Total Income
                        </Text>
                        <Text className="text-white text-2xl font-bold mt-1">
                            ₹{totalIncome}
                        </Text>
                    </Card.Content>
                </Card>
                <Card
                    className="flex-1 bg-emerald-600 rounded-xl"
                    elevation={2}
                >
                    <Card.Content className="items-center py-3">
                        <Text className="text-white text-xs font-semibold opacity-80 uppercase">
                            Parked
                        </Text>
                        <Text className="text-white text-2xl font-bold mt-1">
                            {activeBookings.length} Cars
                        </Text>
                    </Card.Content>
                </Card>
                <Card className="flex-1 bg-amber-600 rounded-xl" elevation={2}>
                    <Card.Content className="items-center py-3">
                        <Text className="text-white text-xs font-semibold opacity-80 uppercase">
                            Reservations
                        </Text>
                        <Text className="text-white text-2xl font-bold mt-1">
                            {
                                myAgencyBookings.filter(
                                    (b) => b.status === "booked"
                                ).length
                            }
                        </Text>
                    </Card.Content>
                </Card>
            </View>

            {/* Search and Walk-in Register row */}
            <View className="flex-row items-center px-4 pt-4 gap-2">
                <TextInput
                    placeholder="Code, Vehicle, Name..."
                    value={searchQuery}
                    onChangeText={handleSearchChange}
                    onSubmitEditing={handleSearchSubmit}
                    returnKeyType="search"
                    mode="outlined"
                    dense
                    outlineColor="#e2e8f0"
                    activeOutlineColor="#4338ca"
                    left={
                        <TextInput.Icon
                            icon="magnify"
                            onPress={handleSearchSubmit}
                        />
                    }
                    right={
                        searchQuery ? (
                            <TextInput.Icon
                                icon="close-circle"
                                onPress={() => {
                                    if (debouncedSetSearch.cancel)
                                        debouncedSetSearch.cancel();
                                    setSearchState({
                                        query: "",
                                        debouncedQuery: "",
                                    });
                                }}
                            />
                        ) : null
                    }
                    style={{ flex: 1, backgroundColor: "white", height: 42 }}
                />
                <Button
                    mode="contained"
                    onPress={() =>
                        setWalkinForm({
                            name: "",
                            phone: "",
                            vehicleNum: "",
                            vehicleType: "car",
                        })
                    }
                    buttonColor="#4338ca"
                    className="h-10 justify-center rounded-lg"
                    icon="plus"
                    labelStyle={{ color: "white", fontWeight: "700" }}
                >
                    Walk-In
                </Button>
            </View>

            {/* Tab Selector */}
            <View className="px-4 py-3">
                <SegmentedButtons
                    value={tab}
                    onValueChange={setTab}
                    buttons={[
                        {
                            value: "pending_approval",
                            label: `Approvals (${
                                myAgencyBookings.filter(
                                    (b) =>
                                        b.status === "pending_approval" ||
                                        b.status === "pending"
                                ).length
                            })`,
                        },
                        {
                            value: "checked_in",
                            label: `Parked (${activeBookings.length})`,
                        },
                        {
                            value: "booked",
                            label: `Reserved (${
                                myAgencyBookings.filter(
                                    (b) => b.status === "booked"
                                ).length
                            })`,
                        },
                        {
                            value: "completed",
                            label: `Completed (${
                                totalCompletedCount || completedBookings.length
                            })`,
                        },
                    ]}
                    theme={{ colors: { primary: "#4338ca" } }}
                />
            </View>

            {/* Bulk Action Header for Pending Approvals */}
            {tab === "pending_approval" && (
                <View className="px-4 py-2 bg-indigo-50/80 flex-row items-center justify-between border-b border-indigo-100 mb-2">
                    <Pressable
                        onPress={() => {
                            const pendingIds = myAgencyBookings
                                .filter(
                                    (b) =>
                                        b.status === "pending_approval" ||
                                        b.status === "pending"
                                )
                                .map((b) => b.id);
                            if (
                                selectedPendingIds.length === pendingIds.length
                            ) {
                                setSelectedPendingIds([]);
                            } else {
                                setSelectedPendingIds(pendingIds);
                            }
                        }}
                        className="flex-row items-center py-1"
                    >
                        <Avatar.Icon
                            size={26}
                            icon={
                                selectedPendingIds.length > 0 &&
                                selectedPendingIds.length ===
                                    myAgencyBookings.filter(
                                        (b) =>
                                            b.status === "pending_approval" ||
                                            b.status === "pending"
                                    ).length
                                    ? "checkbox-marked"
                                    : "checkbox-blank-outline"
                            }
                            style={{ backgroundColor: "transparent" }}
                            color="#4338ca"
                        />
                        <Text className="text-xs font-bold text-indigo-900 ml-1">
                            Select All (
                            {
                                myAgencyBookings.filter(
                                    (b) =>
                                        b.status === "pending_approval" ||
                                        b.status === "pending"
                                ).length
                            }
                            )
                        </Text>
                    </Pressable>

                    {selectedPendingIds.length > 0 && (
                        <View className="flex-row gap-2">
                            <Button
                                compact
                                mode="contained"
                                buttonColor="#16a34a"
                                onPress={() =>
                                    handleBatchApprovalStatus(
                                        selectedPendingIds,
                                        "approve"
                                    )
                                }
                                labelStyle={{
                                    fontSize: 11,
                                    fontWeight: "700",
                                    color: "white",
                                }}
                            >{String("                                 Approve (" + (selectedPendingIds.length) + ")                             ")}</Button>
                            <Button
                                compact
                                mode="contained"
                                buttonColor="#dc2626"
                                onPress={() =>
                                    openRejectionModal(selectedPendingIds)
                                }
                                labelStyle={{
                                    fontSize: 11,
                                    fontWeight: "700",
                                    color: "white",
                                }}
                            >{String("                                 Reject (" + (selectedPendingIds.length) + ")                             ")}</Button>
                        </View>
                    )}
                </View>
            )}

            {/* Bookings List */}
            <FlatList
                data={filteredBookings}
                keyExtractor={(item) => String(item.id)}
                contentContainerStyle={{
                    paddingHorizontal: 16,
                    paddingBottom: 40,
                }}
                refreshing={tab === "completed" ? completedLoading : loading}
                onRefresh={() => {
                    if (tab === "completed") {
                        fetchCompletedBookings({
                            page: 1,
                            search: searchQuery,
                            isLoadMore: false,
                        });
                    } else {
                        fetchAgenciesAndBookings();
                    }
                }}
                onEndReached={handleLoadMoreCompleted}
                onEndReachedThreshold={0.4}
                ListFooterComponent={
                    tab === "completed" && completedLoadingMore ? (
                        <View className="py-4 items-center flex-row justify-center gap-2">
                            <ActivityIndicator size="small" color="#4338ca" />
                            <Text className="text-xs text-slate-500 font-semibold">
                                Loading more completed vehicles...
                            </Text>
                        </View>
                    ) : null
                }
                renderItem={({ item }) => (
                    <Card className="mb-4 bg-white border border-slate-100 rounded-xl elevation-1">
                        <Card.Content className="pb-3">
                            <View className="flex-row items-center justify-between">
                                <View className="flex-row items-center flex-1 pr-2">
                                    {tab === "pending_approval" && (
                                        <Pressable
                                            onPress={() => {
                                                if (
                                                    selectedPendingIds.includes(
                                                        item.id
                                                    )
                                                ) {
                                                    setSelectedPendingIds(
                                                        (prev) =>
                                                            prev.filter(
                                                                (id) =>
                                                                    id !==
                                                                    item.id
                                                            )
                                                    );
                                                } else {
                                                    setSelectedPendingIds(
                                                        (prev) => [
                                                            ...prev,
                                                            item.id,
                                                        ]
                                                    );
                                                }
                                            }}
                                            className="mr-2"
                                        >
                                            <Avatar.Icon
                                                size={28}
                                                icon={
                                                    selectedPendingIds.includes(
                                                        item.id
                                                    )
                                                        ? "checkbox-marked"
                                                        : "checkbox-blank-outline"
                                                }
                                                style={{
                                                    backgroundColor:
                                                        selectedPendingIds.includes(
                                                            item.id
                                                        )
                                                            ? "#4338ca"
                                                            : "#f1f5f9",
                                                }}
                                                color={
                                                    selectedPendingIds.includes(
                                                        item.id
                                                    )
                                                        ? "#ffffff"
                                                        : "#64748b"
                                                }
                                            />
                                        </Pressable>
                                    )}
                                    <Avatar.Icon
                                        size={40}
                                        icon={
                                            VEHICLE_TYPE_ICONS[
                                                item.vehicleType
                                            ] || "car"
                                        }
                                        style={{ backgroundColor: "#f1f5f9" }}
                                        color="#4338ca"
                                    />
                                    <View className="ml-3 flex-1">
                                        <Text
                                            className="text-base font-bold text-slate-800"
                                            numberOfLines={1}
                                        >
                                            {item.vehicleNumber}
                                        </Text>
                                        <Text className="text-xs text-slate-400">
                                            Code:{" "}
                                            <Text className="font-mono font-bold text-slate-600">
                                                {item.bookingCode}
                                            </Text>
                                        </Text>
                                    </View>
                                </View>
                                <Chip
                                    isCompact={true}
                                    textStyle={{
                                        fontSize: 10,
                                        fontWeight: "bold",
                                    }}
                                >
                                    {VEHICLE_TYPE_LABELS[item.vehicleType]}
                                </Chip>
                            </View>

                            <Divider className="my-3 bg-slate-100" />

                            <View className="gap-1.5">
                                <View className="flex-row items-center flex-wrap">
                                    <Text className="text-sm text-slate-600 font-semibold">
                                        Customer:{" "}
                                    </Text>
                                    <Pressable
                                        onPress={() =>
                                            setSelectedUserForModal({
                                                userId: item.userId,
                                                userName: item.userName,
                                                userPhone: item.userPhone,
                                            })
                                        }
                                        className="flex-row items-center bg-indigo-50 px-2 py-0.5 rounded-md active:opacity-70"
                                    >
                                        <Avatar.Icon
                                            size={18}
                                            icon="account-circle-outline"
                                            style={{ backgroundColor: "transparent" }}
                                            color="#4338ca"
                                        />
                                        <Text className="text-sm font-bold text-indigo-700 underline ml-1">
                                            {item.userName || "View Profile"}
                                        </Text>
                                    </Pressable>
                                </View>
                                <Text className="text-sm text-slate-600">
                                    <Text className="font-semibold">
                                        Phone:
                                    </Text>{" "}
                                    {item.userPhone}
                                </Text>
                                <Text className="text-sm text-slate-600">
                                    <Text className="font-semibold">Rate:</Text>{" "}
                                    ₹{item.hourlyRate}/hr
                                </Text>
                                {item.status === "pending_approval" ||
                                item.status === "booked" ? (
                                    <>
                                        <Text className="text-sm text-slate-600">
                                            <Text className="font-semibold">
                                                Reserved For:
                                            </Text>{" "}
                                            {formatDateTime(
                                                item.bookingStartTime
                                            )}
                                        </Text>
                                        <Text className="text-sm text-slate-600">
                                            <Text className="font-semibold">
                                                Booking Time:
                                            </Text>{" "}
                                            {formatTime(item.bookingStartTime)}{" "}
                                            - {formatTime(item.bookingEndTime)}{" "}
                                            ({item.bookedDuration} Hrs)
                                        </Text>
                                    </>
                                ) : (
                                    <Text className="text-sm text-slate-600">
                                        <Text className="font-semibold">
                                            Checked In At:
                                        </Text>{" "}
                                        {formatDateTime(item.startTime)}
                                    </Text>
                                )}

                                {item.status === "completed" && (
                                    <>
                                        <Text className="text-sm text-slate-600">
                                            <Text className="font-semibold">
                                                Checked Out At:
                                            </Text>{" "}
                                            {formatDateTime(item.endTime)}
                                        </Text>
                                        <View className="flex-row justify-between mt-1 p-2 bg-emerald-50 rounded-lg border border-emerald-100">
                                            <Text className="text-sm font-bold text-emerald-800">
                                                Income Collected:
                                            </Text>
                                            <Text className="text-sm font-bold text-emerald-800">
                                                ₹{item.totalBill}
                                            </Text>
                                        </View>
                                    </>
                                )}
                            </View>
                        </Card.Content>

                        {item.status !== "completed" && (
                            <Card.Actions className="border-t border-slate-50 px-4 py-2 bg-slate-50/50 rounded-b-xl flex-row gap-2">
                                {(item.status === "pending_approval" ||
                                    item.status === "pending") && (
                                    <View className="flex-row gap-2 flex-1">
                                        <Button
                                            mode="contained"
                                            onPress={() =>
                                                handleBatchApprovalStatus(
                                                    [item.id],
                                                    "approve"
                                                )
                                            }
                                            buttonColor="#16a34a"
                                            className="flex-1 rounded-lg"
                                            labelStyle={{
                                                color: "white",
                                                fontWeight: "700",
                                            }}
                                        >
                                            Approve
                                        </Button>
                                        <Button
                                            mode="outlined"
                                            onPress={() =>
                                                openRejectionModal([item.id])
                                            }
                                            textColor="#dc2626"
                                            style={{ borderColor: "#fca5a5" }}
                                            className="flex-1 rounded-lg"
                                            labelStyle={{ fontWeight: "700" }}
                                        >
                                            Reject
                                        </Button>
                                    </View>
                                )}
                                {item.status === "booked" && (
                                    <View className="flex-row gap-2 flex-1">
                                        <Button
                                            mode="contained"
                                            onPress={() => triggerCheckIn(item)}
                                            buttonColor="#16a34a"
                                            className="flex-1 rounded-lg"
                                            labelStyle={{
                                                color: "white",
                                                fontWeight: "700",
                                            }}
                                        >
                                            Check In
                                        </Button>
                                        <Button
                                            mode="outlined"
                                            onPress={() =>
                                                handleOpenForceCancelModal(item)
                                            }
                                            textColor="#dc2626"
                                            style={{ borderColor: "#fca5a5" }}
                                            className="rounded-lg"
                                            labelStyle={{ fontWeight: "700" }}
                                        >
                                            Force Cancel
                                        </Button>
                                    </View>
                                )}
                                {item.status === "checked_in" && (
                                    <View className="flex-row gap-2 flex-1">
                                        <Button
                                            mode="contained"
                                            onPress={() =>
                                                openCheckoutModal(item)
                                            }
                                            buttonColor="#dc2626"
                                            className="flex-1 rounded-lg"
                                            labelStyle={{
                                                color: "white",
                                                fontWeight: "700",
                                            }}
                                        >
                                            Checkout & Collect Bill
                                        </Button>
                                        <Button
                                            mode="outlined"
                                            onPress={() =>
                                                handleOpenForceCancelModal(item)
                                            }
                                            textColor="#dc2626"
                                            style={{ borderColor: "#fca5a5" }}
                                            className="rounded-lg"
                                            labelStyle={{ fontWeight: "700" }}
                                        >
                                            Force Cancel
                                        </Button>
                                    </View>
                                )}
                            </Card.Actions>
                        )}

                        {item.status === "completed" &&
                            Boolean(item.userId) && (
                                <Card.Actions className="border-t border-slate-50 px-4 py-2 bg-slate-50/50 rounded-b-xl flex-col gap-2">
                                    {userRatingsMap[item.id] ? (
                                        <Button
                                            mode="contained-tonal"
                                            icon="star"
                                            textColor="#d97706"
                                            buttonColor="#fef3c7"
                                            onPress={() =>
                                                handleOpenRateCustomer(item)
                                            }
                                            style={{ width: "100%" }}
                                            className="rounded-lg"
                                            labelStyle={{ fontWeight: "700" }}
                                        >
                                            {`Customer Rated ${
                                                userRatingsMap[item.id].rating
                                            }/5 ★`}
                                        </Button>
                                    ) : (
                                        <Button
                                            mode="contained-tonal"
                                            icon="star-outline"
                                            textColor="#4338ca"
                                            buttonColor="#e0e7ff"
                                            onPress={() =>
                                                handleOpenRateCustomer(item)
                                            }
                                            style={{ width: "100%" }}
                                            className="rounded-lg"
                                            labelStyle={{ fontWeight: "700" }}
                                        >
                                            Rate Customer
                                        </Button>
                                    )}

                                    {agencyComplaintState.complainedBookingIds.includes(
                                        item.id || item.booking_id
                                    ) ? (
                                        <Button
                                            mode="contained-tonal"
                                            icon="alert-circle"
                                            textColor="#991b1b"
                                            buttonColor="#fee2e2"
                                            disabled
                                            style={{ width: "100%" }}
                                            className="rounded-lg"
                                            labelStyle={{ fontWeight: "700" }}
                                        >
                                            Complaint Logged Against User
                                        </Button>
                                    ) : (
                                        <Button
                                            mode="outlined"
                                            icon="alert-circle-outline"
                                            textColor="#ef4444"
                                            style={{
                                                borderColor: "#fca5a5",
                                                width: "100%",
                                            }}
                                            onPress={() =>
                                                handleOpenLodgeUserComplaint(
                                                    item
                                                )
                                            }
                                            className="rounded-lg"
                                            labelStyle={{ fontWeight: "700" }}
                                        >
                                            Lodge Complaint Against User
                                        </Button>
                                    )}

                                    {(() => {
                                        const isRefunded =
                                            item.paymentStatus === "refunded" ||
                                            parseFloat(item.refundAmount || 0) >
                                                0;
                                        const hasDeduction =
                                            parseFloat(
                                                item.totalBill ||
                                                    item.total_bill ||
                                                    0
                                            ) > 0 ||
                                            item.paymentStatus === "paid";

                                        if (isRefunded) {
                                            return (
                                                <Button
                                                    mode="contained-tonal"
                                                    icon="cash-refund"
                                                    textColor="#047857"
                                                    buttonColor="#d1fae5"
                                                    disabled
                                                    style={{ width: "100%" }}
                                                    className="rounded-lg"
                                                    labelStyle={{
                                                        fontWeight: "700",
                                                    }}
                                                >
                                                    {`✓ Refunded (₹${parseFloat(
                                                        item.refundAmount ||
                                                            item.totalBill ||
                                                            0
                                                    ).toFixed(2)})`}
                                                </Button>
                                            );
                                        }

                                        if (hasDeduction) {
                                            return (
                                                <Button
                                                    mode="outlined"
                                                    icon="cash-refund"
                                                    textColor="#059669"
                                                    style={{
                                                        borderColor: "#a7f3d0",
                                                        width: "100%",
                                                    }}
                                                    onPress={() =>
                                                        setRefundModalState({
                                                            visible: true,
                                                            targetBooking: item,
                                                        })
                                                    }
                                                    className="rounded-lg"
                                                    labelStyle={{
                                                        fontWeight: "700",
                                                    }}
                                                >
                                                    Issue Refund to Customer
                                                    Wallet
                                                </Button>
                                            );
                                        }

                                        return null;
                                    })()}
                                </Card.Actions>
                            )}
                    </Card>
                )}
                ListEmptyComponent={
                    <View className="items-center justify-center pt-20">
                        <Avatar.Icon
                            size={64}
                            icon="format-list-bulleted"
                            style={{ backgroundColor: "#f1f5f9" }}
                            color="#64748b"
                        />
                        <Text className="text-lg font-bold text-slate-700 mt-4">
                            No Vehicles Listed
                        </Text>
                        <Text className="text-sm text-slate-400 text-center mt-1 px-8">
                            {tab === "checked_in"
                                ? "There are currently no parked vehicles. Click walk-in or search a booking to check-in."
                                : tab === "booked"
                                ? "No upcoming reservations scheduled for today."
                                : "No completed transactions recorded today."}
                        </Text>
                    </View>
                }
            />

            {/* Portal Modals */}
            <Portal>
                {/* 1. Walk-In Registration Modal */}
                <Modal
                    visible={!!walkinForm}
                    onDismiss={() => setWalkinForm(null)}
                    className="bg-white p-6 m-5 rounded-2xl max-w-[500px] self-center w-[90%]"
                >
                    <Text className="text-lg font-bold text-slate-800 mb-4">
                        Register Walk-In Customer
                    </Text>

                    <TextInput
                        label="Vehicle Registration Number *"
                        value={walkinForm?.vehicleNum || ""}
                        onChangeText={(val) =>
                            updateWalkinForm("vehicleNum", val)
                        }
                        mode="outlined"
                        dense
                        autoCapitalize="characters"
                        className="bg-white mb-3"
                        outlineColor="#e2e8f0"
                        activeOutlineColor="#4338ca"
                    />

                    <TextInput
                        label="Customer Name (Optional)"
                        value={walkinForm?.name || ""}
                        onChangeText={(val) => updateWalkinForm("name", val)}
                        mode="outlined"
                        dense
                        className="bg-white mb-3"
                        outlineColor="#e2e8f0"
                        activeOutlineColor="#4338ca"
                    />

                    <TextInput
                        label="Phone Number (Optional)"
                        value={walkinForm?.phone || ""}
                        onChangeText={(val) => updateWalkinForm("phone", val)}
                        mode="outlined"
                        dense
                        keyboardType="phone-pad"
                        className="bg-white mb-4"
                        outlineColor="#e2e8f0"
                        activeOutlineColor="#4338ca"
                    />

                    <Text className="text-sm font-semibold text-slate-700 mb-2">
                        Select Vehicle Type
                    </Text>
                    <View className="flex-row flex-wrap gap-2 mb-4">
                        {Object.keys(VEHICLE_TYPE_LABELS).map((key) => (
                            <Pressable
                                key={key}
                                onPress={() =>
                                    updateWalkinForm("vehicleType", key)
                                }
                                className={`flex-row items-center px-3 py-1.5 rounded-full border ${
                                    walkinForm?.vehicleType === key
                                        ? "bg-indigo-50 border-indigo-600"
                                        : "bg-white border-slate-200"
                                }`}
                            >
                                <Avatar.Icon
                                    size={18}
                                    icon={VEHICLE_TYPE_ICONS[key]}
                                    style={{ backgroundColor: "transparent" }}
                                    color={
                                        walkinForm?.vehicleType === key
                                            ? "#4338ca"
                                            : "#64748b"
                                    }
                                />
                                <Text
                                    className={`text-xs ml-1.5 font-bold ${
                                        walkinForm?.vehicleType === key
                                            ? "text-indigo-800"
                                            : "text-slate-600"
                                    }`}
                                >
                                    {VEHICLE_TYPE_LABELS[key]}
                                </Text>
                            </Pressable>
                        ))}
                    </View>

                    <Divider className="my-2 bg-slate-100" />

                    <View className="flex-row justify-end gap-2 mt-2">
                        <Button
                            mode="outlined"
                            onPress={() => setWalkinForm(null)}
                            textColor="#64748b"
                        >
                            Cancel
                        </Button>
                        <Button
                            mode="contained"
                            onPress={handleRegisterWalkin}
                            buttonColor="#4338ca"
                            labelStyle={{ color: "white" }}
                        >
                            Register & Check In
                        </Button>
                    </View>
                </Modal>

                {/* 2. Checkout Billing Modal */}
                <Modal
                    visible={!!selectedBooking}
                    onDismiss={() => setSelectedBooking(null)}
                    className="bg-white p-6 m-5 rounded-2xl max-w-[450px] self-center w-[90%]"
                >
                    <Text className="text-lg font-bold text-slate-800 mb-2">
                        Calculate Invoice Bill
                    </Text>
                    <Text className="text-xs text-slate-400 mb-4">
                        Booking code: {selectedBooking?.bookingCode}
                    </Text>

                    <Card
                        className="bg-slate-50 border border-slate-100 rounded-xl mb-4"
                        elevation={0}
                    >
                        <Card.Content className="py-3 gap-2">
                            <View className="flex-row justify-between">
                                <Text className="text-slate-500 text-sm">
                                    Vehicle Number:
                                </Text>
                                <Text className="font-bold text-slate-800 text-sm">
                                    {selectedBooking?.vehicleNumber}
                                </Text>
                            </View>
                            <View className="flex-row justify-between">
                                <Text className="text-slate-500 text-sm">
                                    Hourly Rate:
                                </Text>
                                <Text className="font-semibold text-slate-800 text-sm">
                                    ₹{selectedBooking?.hourlyRate}/hr
                                </Text>
                            </View>
                            <View className="flex-row justify-between">
                                <Text className="text-slate-500 text-sm">
                                    Time Checked-In:
                                </Text>
                                <Text className="font-medium text-slate-800 text-sm">
                                    {formatDateTime(selectedBooking?.startTime)}
                                </Text>
                            </View>
                            <View className="flex-row justify-between">
                                <Text className="text-slate-500 text-sm">
                                    Time Checked-Out:
                                </Text>
                                <Text className="font-medium text-slate-800 text-sm">
                                    {formatDateTime(new Date().toISOString())}
                                </Text>
                            </View>
                        </Card.Content>
                    </Card>

                    <View className="flex-row justify-between items-center py-2 px-1">
                        <Text className="font-semibold text-slate-600">
                            Actual Duration Paid:
                        </Text>
                        <Text className="font-bold text-slate-800 text-base">
                            {actualDuration} Hrs
                        </Text>
                    </View>

                    <Divider className="my-2 bg-slate-100" />

                    <View className="flex-row justify-between items-center py-2 px-1 mb-4">
                        <Text className="font-bold text-slate-800 text-lg">
                            Total Bill Amount:
                        </Text>
                        <Text className="font-bold text-indigo-700 text-2xl">
                            ₹{calculatedBill}
                        </Text>
                    </View>

                    <Button
                        mode="contained"
                        onPress={handleConfirmCheckout}
                        buttonColor="#16a34a"
                        contentStyle={{ height: 48 }}
                        className="rounded-xl justify-center"
                        labelStyle={{
                            color: "white",
                            fontSize: 16,
                            fontWeight: "bold",
                        }}
                    >
                        Collect Payment & Print Invoice
                    </Button>

                    <Button
                        mode="text"
                        onPress={() => setSelectedBooking(null)}
                        textColor="#ef4444"
                        className="mt-2"
                    >
                        Cancel Checkout
                    </Button>
                </Modal>

                {/* 3. OTP Verification Modal */}
                <Modal
                    visible={!!otpState.targetBooking}
                    onDismiss={() => {
                        setOtpState({
                            targetBooking: null,
                            input: "",
                        });
                    }}
                    className="bg-white p-6 m-5 rounded-2xl max-w-[400px] self-center w-[85%]"
                >
                    <Text className="text-lg font-bold text-slate-800 mb-2">
                        Verify Entry OTP
                    </Text>
                    <Text className="text-sm text-slate-500 mb-4">
                        Please ask the customer for the 6-digit verification OTP
                        visible on their booking details.
                    </Text>

                    <TextInput
                        label="Enter 6-Digit OTP *"
                        value={otpState.input}
                        onChangeText={(val) =>
                            setOtpState((prev) => ({ ...prev, input: val }))
                        }
                        mode="outlined"
                        dense
                        keyboardType="numeric"
                        maxLength={6}
                        className="bg-white mb-4 text-center text-lg tracking-widest font-mono"
                        outlineColor="#e2e8f0"
                        activeOutlineColor="#4338ca"
                    />

                    <View className="flex-row gap-2 mt-2">
                        <Button
                            mode="outlined"
                            onPress={() => {
                                setOtpState({
                                    targetBooking: null,
                                    input: "",
                                });
                            }}
                            className="flex-1 rounded-lg"
                            textColor="#64748b"
                            style={{ borderColor: "#cbd5e1" }}
                        >
                            Cancel
                        </Button>
                        <Button
                            mode="contained"
                            onPress={handleVerifyOtpAndCheckIn}
                            className="flex-1 rounded-lg"
                            buttonColor="#4338ca"
                            textColor="white"
                        >
                            Verify & Check-In
                        </Button>
                    </View>
                </Modal>

                {/* 4. Force Cancel Modal */}
                <Modal
                    visible={forceCancelModalState.visible}
                    onDismiss={() =>
                        !forceCancelModalState.submitting &&
                        setForceCancelModalState({
                            visible: false,
                            targetBooking: null,
                            reason: "",
                            submitting: false,
                        })
                    }
                    className="bg-white p-6 m-5 rounded-2xl max-w-[420px] self-center w-[88%]"
                >
                    <Text className="text-lg font-bold text-rose-700 mb-1">
                        Force Cancel Booking
                    </Text>
                    <Text className="text-xs text-slate-500 mb-3">
                        Are you sure you want to force cancel booking{" "}
                        <Text className="font-mono font-bold text-slate-800">
                            {forceCancelModalState.targetBooking?.bookingCode}
                        </Text>
                        ? No money will be deducted from the user's account.
                    </Text>

                    <TextInput
                        label="Cancellation Reason (Optional)"
                        value={forceCancelModalState.reason}
                        onChangeText={(val) =>
                            setForceCancelModalState((prev) => ({
                                ...prev,
                                reason: val,
                            }))
                        }
                        mode="outlined"
                        dense
                        placeholder="e.g. Space unavailable, emergency maintenance"
                        className="bg-white mb-4"
                        outlineColor="#e2e8f0"
                        activeOutlineColor="#e11d48"
                    />

                    <View className="flex-row gap-2 mt-2">
                        <Button
                            mode="outlined"
                            onPress={() =>
                                setForceCancelModalState({
                                    visible: false,
                                    targetBooking: null,
                                    reason: "",
                                    submitting: false,
                                })
                            }
                            disabled={forceCancelModalState.submitting}
                            className="flex-1 rounded-lg"
                            textColor="#64748b"
                            style={{ borderColor: "#cbd5e1" }}
                        >
                            Back
                        </Button>
                        <Button
                            mode="contained"
                            onPress={handleConfirmForceCancel}
                            loading={forceCancelModalState.submitting}
                            disabled={forceCancelModalState.submitting}
                            className="flex-1 rounded-lg"
                            buttonColor="#dc2626"
                            textColor="white"
                        >
                            Confirm Force Cancel
                        </Button>
                    </View>
                </Modal>

                {/* 5. Approval Rejection Reason Modal */}
                <Modal
                    visible={rejectionModalState.visible}
                    onDismiss={() =>
                        !rejectionModalState.submitting &&
                        setRejectionModalState({
                            visible: false,
                            targetIds: [],
                            reason: "",
                            submitting: false,
                        })
                    }
                    className="bg-white p-6 m-5 rounded-2xl max-w-[440px] self-center w-[90%]"
                >
                    <Text className="text-lg font-bold text-rose-700 mb-1">
                        Reject Booking Request
                    </Text>
                    <Text className="text-xs text-slate-500 mb-4">
                        Please specify a reason for rejecting{" "}
                        {rejectionModalState.targetIds.length} request(s). The
                        reserved balance will be released immediately to the
                        user.
                    </Text>

                    <TextInput
                        label="Rejection Reason *"
                        value={rejectionModalState.reason}
                        onChangeText={(val) =>
                            setRejectionModalState((prev) => ({
                                ...prev,
                                reason: val,
                            }))
                        }
                        mode="outlined"
                        dense
                        placeholder="e.g. Parking space unavailable, invalid vehicle details"
                        className="bg-white mb-4"
                        outlineColor="#e2e8f0"
                        activeOutlineColor="#dc2626"
                    />

                    <View className="flex-row gap-2 mt-2">
                        <Button
                            mode="outlined"
                            onPress={() =>
                                setRejectionModalState({
                                    visible: false,
                                    targetIds: [],
                                    reason: "",
                                    submitting: false,
                                })
                            }
                            disabled={rejectionModalState.submitting}
                            className="flex-1 rounded-lg"
                            textColor="#64748b"
                            style={{ borderColor: "#cbd5e1" }}
                        >
                            Cancel
                        </Button>
                        <Button
                            mode="contained"
                            onPress={handleConfirmRejection}
                            loading={rejectionModalState.submitting}
                            disabled={rejectionModalState.submitting}
                            className="flex-1 rounded-lg"
                            buttonColor="#dc2626"
                            textColor="white"
                        >
                            Reject Booking
                        </Button>
                    </View>
                </Modal>
            </Portal>

            <RatingModal
                visible={ratingModalVisible}
                onClose={() =>
                    setRatingState((prev) => ({ ...prev, visible: false }))
                }
                onSubmit={handleSubmitCustomerRating}
                title="Rate Customer"
                subtitle={`Customer: ${
                    targetBookingForRating?.userName || "User"
                } (${targetBookingForRating?.vehicleNumber || ""})`}
                existingRating={existingUserRating}
                loading={submittingRating}
            />

            <ComplaintModal
                visible={agencyComplaintState.visible}
                onClose={() =>
                    setAgencyComplaintState((prev) => ({
                        ...prev,
                        visible: false,
                    }))
                }
                onSubmit={handleSubmitUserComplaint}
                title="Lodge Complaint Against User"
                subtitle={`Customer: ${
                    agencyComplaintState.targetBooking?.userName || "User"
                } (${agencyComplaintState.targetBooking?.vehicleNumber || ""})`}
                loading={agencyComplaintState.submitting}
            />

            <RefundBookingModal
                visible={refundModalState.visible}
                onClose={() =>
                    setRefundModalState({ visible: false, targetBooking: null })
                }
                booking={refundModalState.targetBooking}
                onRefundSuccess={(updatedBooking) => {
                    fetchAgenciesAndBookings();
                }}
            />

            <UserProfileModal
                visible={!!selectedUserForModal}
                onDismiss={() => setSelectedUserForModal(null)}
                userId={selectedUserForModal?.userId}
                fallbackName={selectedUserForModal?.userName}
                fallbackPhone={selectedUserForModal?.userPhone}
            />
        </View>
    );
}
