import { createSlice, PayloadAction } from "@reduxjs/toolkit";
// @ts-ignore
import { ROLES } from "../../utils/rbacConfig";
import { User } from "./userSlice";

export interface Agency {
    id: string;
    name: string;
    owner: string;
    email: string;
    phone_number: string;
    address: string;
    latitude: number | string;
    longitude: number | string;
    twoWheeler_capacity?: number;
    car_capacity?: number;
    ev_capacity?: number;
    ev_charging_support?: boolean;
    twoWheeler_rate?: number;
    threeWheeler_rate?: number;
    car_rate?: number;
    suv_rate?: number;
    van_rate?: number;
    pickup_rate?: number;
    ev_rate?: number;
    [key: string]: any;
}

export interface RegistrationRequest {
    id: string;
    name: string;
    owner: string;
    email: string;
    phone_number: string;
    address: string;
    latitude: number | string;
    longitude: number | string;
    date: string;
    username: string;
    password?: string;
    profile_photo?: string;
    verification_document?: string;
}

export interface Booking {
    id: string;
    bookingCode: string;
    userId: string | null;
    userName: string;
    userPhone: string;
    agencyId: string;
    agencyName: string;
    vehicleType: string;
    vehicleNumber: string;
    status: "booked" | "checked_in" | "completed" | "cancelled";
    startTime: string;
    endTime: string | null;
    bookedDuration: number;
    hourlyRate: number;
    totalBill: number;
    paymentStatus: "pending" | "paid";
}

export interface ParkingState {
    agencies: Agency[];
    registrationRequests: RegistrationRequest[];
    users: User[];
    bookings: Booking[];
}

const INITIAL_REQUESTS: RegistrationRequest[] = [];
const INITIAL_AGENCIES: Agency[] = [];
const INITIAL_USERS: User[] = [];
const INITIAL_BOOKINGS: Booking[] = [];

const initialState: ParkingState = {
    agencies: INITIAL_AGENCIES,
    registrationRequests: INITIAL_REQUESTS,
    users: INITIAL_USERS,
    bookings: INITIAL_BOOKINGS,
};

const parkingSlice = createSlice({
    name: "parking",
    initialState,
    reducers: {
        setAgencies: (state, action: PayloadAction<Agency[]>) => {
            state.agencies = action.payload;
        },
        // --- Agency Approvals (Super Admin) ---
        approveRequest: (state, action: PayloadAction<string>) => {
            const request = state.registrationRequests.find(
                (r) => r.id === action.payload
            );
            if (request) {
                const agencyId = `agency_${Date.now()}`;
                const newAgency: Agency = {
                    id: agencyId,
                    name: request.name,
                    owner: request.owner,
                    email: request.email,
                    phone_number: request.phone_number,
                    address: request.address,
                    latitude: request.latitude,
                    longitude: request.longitude,
                    twoWheeler_capacity: 20, // default capacities
                    car_capacity: 20,
                    ev_capacity: 5,
                    ev_charging_support: true,
                    twoWheeler_rate: 20,
                    threeWheeler_rate: 30,
                    car_rate: 40,
                    suv_rate: 50,
                    van_rate: 50,
                    pickup_rate: 50,
                    ev_rate: 60,
                };

                const newAdminUser: User = {
                    id: `user_${Date.now()}`,
                    name: request.owner,
                    username: request.owner.toLowerCase().replace(/\s+/g, "_"),
                    password: "password123", // default password
                    email: request.email,
                    phone_number: request.phone_number,
                    role: ROLES.AGENCY_ADMIN,
                    agencyId: agencyId,
                    status: "active",
                };

                state.agencies.push(newAgency);
                state.users.push(newAdminUser);
                state.registrationRequests = state.registrationRequests.filter(
                    (r) => r.id !== action.payload
                );
            }
        },
        rejectRequest: (state, action: PayloadAction<string>) => {
            state.registrationRequests = state.registrationRequests.filter(
                (r) => r.id !== action.payload
            );
        },
        updateAgency: (
            state,
            action: PayloadAction<{
                id: string;
                name: string;
                owner: string;
                email: string;
                phone_number: string;
                address: string;
            }>
        ) => {
            const { id, name, owner, email, phone_number, address } =
                action.payload;
            const agency = state.agencies.find((a) => a.id === id);
            if (agency) {
                agency.name = name;
                agency.owner = owner;
                agency.email = email;
                agency.phone_number = phone_number;
                agency.address = address;
            }
        },
        updateAgencyCapacities: (
            state,
            action: PayloadAction<{
                agencyId: string;
                capacities: Record<string, any>;
            }>
        ) => {
            const { agencyId, capacities } = action.payload;
            const agency = state.agencies.find((a) => a.id === agencyId);
            if (agency) {
                Object.keys(capacities).forEach((key) => {
                    agency[key] = capacities[key];
                });
            }
        },

        // --- Agency User (Staff) Management (Agency Admin) ---
        registerAgencyUser: (
            state,
            action: PayloadAction<
                Pick<
                    User,
                    | "name"
                    | "username"
                    | "password"
                    | "email"
                    | "phone_number"
                    | "role"
                    | "agencyId"
                >
            >
        ) => {
            const {
                name,
                username,
                password,
                email,
                phone_number,
                role,
                agencyId,
            } = action.payload;
            const newUser: User = {
                id: `user_${Date.now()}`,
                name,
                username,
                password,
                email,
                phone_number,
                role, // agency_admin or agency_user
                agencyId,
                status: "active",
            };
            state.users.push(newUser);
        },
        updateAgencyUser: (
            state,
            action: PayloadAction<
                Pick<User, "id" | "name" | "username" | "email" | "phone_number" | "role">
            >
        ) => {
            const { id, name, username, email, phone_number, role } =
                action.payload;
            const user = state.users.find((u) => u.id === id);
            if (user) {
                user.name = name;
                user.username = username;
                user.email = email;
                user.phone_number = phone_number;
                user.role = role;
            }
        },
        deleteAgencyUser: (state, action: PayloadAction<string>) => {
            state.users = state.users.filter((u) => u.id !== action.payload);
        },
        toggleUserStatus: (state, action: PayloadAction<string>) => {
            const user = state.users.find((u) => u.id === action.payload);
            if (user) {
                user.status = user.status === "active" ? "blocked" : "active";
            }
        },

        // --- Booking Management ---
        addBooking: (state, action: PayloadAction<Booking>) => {
            state.bookings.push(action.payload);
        },
        checkInBooking: (state, action: PayloadAction<string>) => {
            const booking = state.bookings.find(
                (b) => b.bookingCode === action.payload
            );
            if (booking) {
                booking.status = "checked_in";
                booking.startTime = new Date().toISOString();
            }
        },
        checkOutBooking: (
            state,
            action: PayloadAction<{
                bookingCode: string;
                totalBill: number;
                actualEndTime: string;
            }>
        ) => {
            const { bookingCode, totalBill, actualEndTime } = action.payload;
            const booking = state.bookings.find(
                (b) => b.bookingCode === bookingCode
            );
            if (booking) {
                booking.status = "completed";
                booking.endTime = actualEndTime;
                booking.totalBill = totalBill;
                booking.paymentStatus = "paid";
            }
        },
        cancelBooking: (state, action: PayloadAction<string>) => {
            const booking = state.bookings.find(
                (b) => b.bookingCode === action.payload
            );
            if (booking) {
                booking.status = "cancelled";
            }
        },

        // --- Registration logic for user signups ---
        registerNormalUser: (
            state,
            action: PayloadAction<
                Omit<User, "id" | "role" | "status"> & {
                    address?: string;
                    landmark?: string;
                    latitude?: number | string;
                    longitude?: number | string;
                    profile_photo?: string;
                }
            >
        ) => {
            const {
                name,
                username,
                email,
                phone_number,
                password,
                address,
                landmark,
                latitude,
                longitude,
                profile_photo,
            } = action.payload;
            const newUser: User = {
                id: `user_${Date.now()}`,
                name,
                username,
                password,
                email,
                phone_number,
                role: ROLES.USER,
                address,
                landmark,
                latitude,
                longitude,
                profile_photo,
                status: "active",
            };
            state.users.push(newUser);
        },
        registerAgencyRequest: (
            state,
            action: PayloadAction<{
                org_name: string;
                username: string;
                email: string;
                phone_number: string;
                password?: string;
                org_address: string;
                landmark?: string;
                latitude: number | string;
                longitude: number | string;
                profile_photo?: string;
                verification_document?: string;
            }>
        ) => {
            const {
                org_name,
                username,
                email,
                phone_number,
                password,
                org_address,
                latitude,
                longitude,
                profile_photo,
                verification_document,
            } = action.payload;
            // Create a pending request
            const newRequest: RegistrationRequest = {
                id: `req_${Date.now()}`,
                name: org_name,
                owner: org_name, // Let owner be same as org_name or parse username
                email,
                phone_number,
                address: org_address,
                latitude,
                longitude,
                date: new Date().toISOString(),
                username,
                password,
                profile_photo,
                verification_document,
            };
            state.registrationRequests.push(newRequest);
        },
    },
});

export const {
    approveRequest,
    rejectRequest,
    updateAgency,
    updateAgencyCapacities,
    registerAgencyUser,
    updateAgencyUser,
    deleteAgencyUser,
    toggleUserStatus,
    addBooking,
    checkInBooking,
    checkOutBooking,
    cancelBooking,
    registerNormalUser,
    registerAgencyRequest,
    setAgencies,
} = parkingSlice.actions;

export default parkingSlice.reducer;
