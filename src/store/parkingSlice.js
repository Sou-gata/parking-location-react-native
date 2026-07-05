import { createSlice } from "@reduxjs/toolkit";
import { ROLES } from "../utils/rbacConfig";

// Pre-seeded registration requests
const INITIAL_REQUESTS = [
    {
        id: "req_agency_1",
        name: "SafePark Garages",
        owner: "Liam O'Connor",
        email: "contact@safepark.com",
        phone_number: "+1 555-0300",
        address: "150 Van Ness Ave, San Francisco",
        latitude: 37.7766,
        longitude: -122.4191,
        date: "2026-06-26T14:32:00Z",
    },
    {
        id: "req_agency_2",
        name: "Downtown Parking Co.",
        owner: "Sophia Martinez",
        email: "support@downtownparking.com",
        phone_number: "+1 555-0311",
        address: "201 Mission St, San Francisco",
        latitude: 37.7906,
        longitude: -122.3985,
        date: "2026-06-27T08:15:00Z",
    },
];

// Pre-seeded active agencies
const INITIAL_AGENCIES = [
    {
        id: "agency_1",
        name: "Metro Parking Solutions",
        owner: "Satish Kumar",
        email: "contact@metroparking.com",
        phone_number: "+91 9876543210",
        address: "12/A Park Street, Kolkata",
        latitude: 22.5532,
        longitude: 88.3524,
        twoWheeler_capacity: 30,
        threeWheeler_capacity: 10,
        car_capacity: 50,
        suv_capacity: 15,
        van_capacity: 5,
        pickup_capacity: 5,
        ev_capacity: 10,
        ev_charging_support: true,
    },
    {
        id: "agency_2",
        name: "Elite Valet Services",
        owner: "Robert Smith",
        email: "info@elitevalet.com",
        phone_number: "+1 555-0177",
        address: "450 Sutter St, San Francisco",
        latitude: 37.7891,
        longitude: -122.4084,
        twoWheeler_capacity: 10,
        threeWheeler_capacity: 0,
        car_capacity: 40,
        suv_capacity: 10,
        van_capacity: 0,
        pickup_capacity: 0,
        ev_capacity: 5,
        ev_charging_support: false,
    },
];

// Pre-seeded users in the application
const INITIAL_USERS = [
    // Super Admin
    {
        id: "user_admin",
        name: "Sougata Talukdar (Admin)",
        username: "sa",
        password: "sa",
        email: "admin@parklocator.com",
        phone_number: "+91 9999999999",
        role: ROLES.SUPER_ADMIN,
        status: "active",
    },
    // Agency Admins
    {
        id: "user_satish",
        name: "Satish Kumar",
        username: "aa1",
        password: "aa1",
        email: "satish@example.com",
        phone_number: "+91 8765432109",
        role: ROLES.AGENCY_ADMIN,
        agencyId: "agency_1",
        status: "active",
    },
    {
        id: "user_robert",
        name: "Robert Smith",
        username: "aa2",
        password: "aa2",
        email: "robert@elitevalet.com",
        phone_number: "+1 555-0188",
        role: ROLES.AGENCY_ADMIN,
        agencyId: "agency_2",
        status: "active",
    },
    // Agency Staff (Agency User)
    {
        id: "user_john",
        name: "John Doe",
        username: "au1",
        password: "au1",
        email: "john@example.com",
        phone_number: "+1 555-0100",
        role: ROLES.AGENCY_USER,
        agencyId: "agency_1",
        status: "active",
    },
    {
        id: "user_tom",
        name: "Tom Davis",
        username: "au2",
        password: "au2",
        email: "tom@example.com",
        phone_number: "+1 555-0199",
        role: ROLES.AGENCY_USER,
        agencyId: "agency_2",
        status: "active",
    },
    // Normal Customers
    {
        id: "user_customer",
        name: "Sougata Talukdar",
        username: "user",
        password: "user",
        email: "user@example.com",
        phone_number: "+91 7000000000",
        role: ROLES.USER,
        status: "active",
    },
];

// Pre-seeded bookings
const INITIAL_BOOKINGS = [
    {
        id: "book_1",
        bookingCode: "PK-8192",
        userId: "user_customer",
        userName: "Sougata Talukdar",
        userPhone: "+91 7000000000",
        agencyId: "agency_1",
        agencyName: "Metro Parking Solutions",
        vehicleType: "car",
        vehicleNumber: "WB-02-AK-9812",
        status: "checked_in", // booked, checked_in, completed, cancelled
        startTime: "2026-06-30T10:15:00Z",
        endTime: null,
        bookedDuration: 3, // hours
        hourlyRate: 40,
        totalBill: 0,
        paymentStatus: "pending", // pending, paid
    },
    {
        id: "book_2",
        bookingCode: "PK-3918",
        userId: "user_customer",
        userName: "Sougata Talukdar",
        userPhone: "+91 7000000000",
        agencyId: "agency_1",
        agencyName: "Metro Parking Solutions",
        vehicleType: "twoWheeler",
        vehicleNumber: "WB-06-B-1234",
        status: "completed",
        startTime: "2026-06-30T08:00:00Z",
        endTime: "2026-06-30T10:30:00Z",
        bookedDuration: 2.5,
        hourlyRate: 20,
        totalBill: 50,
        paymentStatus: "paid",
    },
];

const parkingSlice = createSlice({
    name: "parking",
    initialState: {
        agencies: INITIAL_AGENCIES,
        registrationRequests: INITIAL_REQUESTS,
        users: INITIAL_USERS,
        bookings: INITIAL_BOOKINGS,
    },
    reducers: {
        // --- Agency Approvals (Super Admin) ---
        approveRequest: (state, action) => {
            const request = state.registrationRequests.find(r => r.id === action.payload);
            if (request) {
                const agencyId = `agency_${Date.now()}`;
                const newAgency = {
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
                };

                const newAdminUser = {
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
                state.registrationRequests = state.registrationRequests.filter(r => r.id !== action.payload);
            }
        },
        rejectRequest: (state, action) => {
            state.registrationRequests = state.registrationRequests.filter(r => r.id !== action.payload);
        },
        updateAgency: (state, action) => {
            const { id, name, owner, email, phone_number, address } = action.payload;
            const agency = state.agencies.find(a => a.id === id);
            if (agency) {
                agency.name = name;
                agency.owner = owner;
                agency.email = email;
                agency.phone_number = phone_number;
                agency.address = address;
            }
        },
        updateAgencyCapacities: (state, action) => {
            const { agencyId, capacities } = action.payload;
            const agency = state.agencies.find(a => a.id === agencyId);
            if (agency) {
                Object.keys(capacities).forEach(key => {
                    agency[key] = capacities[key];
                });
            }
        },

        // --- Agency User (Staff) Management (Agency Admin) ---
        registerAgencyUser: (state, action) => {
            const { name, username, password, email, phone_number, role, agencyId } = action.payload;
            const newUser = {
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
        updateAgencyUser: (state, action) => {
            const { id, name, username, email, phone_number, role } = action.payload;
            const user = state.users.find(u => u.id === id);
            if (user) {
                user.name = name;
                user.username = username;
                user.email = email;
                user.phone_number = phone_number;
                user.role = role;
            }
        },
        deleteAgencyUser: (state, action) => {
            state.users = state.users.filter(u => u.id !== action.payload);
        },
        toggleUserStatus: (state, action) => {
            const user = state.users.find(u => u.id === action.payload);
            if (user) {
                user.status = user.status === "active" ? "blocked" : "active";
            }
        },

        // --- Booking Management ---
        addBooking: (state, action) => {
            state.bookings.push(action.payload);
        },
        checkInBooking: (state, action) => {
            const booking = state.bookings.find(b => b.bookingCode === action.payload);
            if (booking) {
                booking.status = "checked_in";
                booking.startTime = new Date().toISOString();
            }
        },
        checkOutBooking: (state, action) => {
            const { bookingCode, totalBill, actualEndTime } = action.payload;
            const booking = state.bookings.find(b => b.bookingCode === bookingCode);
            if (booking) {
                booking.status = "completed";
                booking.endTime = actualEndTime;
                booking.totalBill = totalBill;
                booking.paymentStatus = "paid";
            }
        },
        cancelBooking: (state, action) => {
            const booking = state.bookings.find(b => b.bookingCode === action.payload);
            if (booking) {
                booking.status = "cancelled";
            }
        },

        // --- Registration logic for user signups ---
        registerNormalUser: (state, action) => {
            const { name, username, email, phone_number, password, address, landmark, latitude, longitude, profile_photo } = action.payload;
            const newUser = {
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
        registerAgencyRequest: (state, action) => {
            const { org_name, username, email, phone_number, password, org_address, landmark, latitude, longitude, profile_photo, verification_document } = action.payload;
            // Create a pending request
            const newRequest = {
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
} = parkingSlice.actions;

export default parkingSlice.reducer;
