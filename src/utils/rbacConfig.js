// Define all available roles in the system (4 roles)
export const ROLES = {
    SUPER_ADMIN: "super_admin",
    AGENCY_ADMIN: "agency_admin",
    AGENCY_USER: "agency_user",
    USER: "user",
};

// Friendly display names for UI presentation
export const ROLE_DISPLAY_NAMES = {
    [ROLES.SUPER_ADMIN]: "Super Admin",
    [ROLES.AGENCY_ADMIN]: "Agency Admin",
    [ROLES.AGENCY_USER]: "Agency User",
    [ROLES.USER]: "User",
};

// Define granular permissions (actions or feature areas)
export const PERMISSIONS = {
    VIEW_MAP: "view_map", // Search and view parking locations on the map
    BOOK_PARKING: "book_parking", // Ability to reserve a parking slot
    MANAGE_LOCATIONS: "manage_locations", // Add/edit/remove parking lots
    MANAGE_USERS: "manage_users", // Add/edit/remove roles, approve agencies/employees
    MANAGE_BOOKINGS: "manage_bookings", // Check-in/out, handle parking slots
    MANAGE_AGENCIES: "manage_agencies", // Super Admin agency management
    VIEW_WALLET: "view_wallet", // View wallet balance, deposits, or earnings
    MANAGE_COMPLAINTS: "manage_complaints", // Review and resolve customer complaints
    MANAGE_SETTINGS: "manage_settings", // System configuration and settings
    WITHDRAW_EARNINGS: "withdraw_earnings", // Request agency cash payouts
    MANAGE_POLICY: "manage_policy", // Configure cancellation policies
};

// Define the Role-to-Permissions Matrix
export const ROLE_PERMISSIONS = {
    // Super Admin Privileges: Location Management, Agency Management, System Settings, Complaints, Policy
    [ROLES.SUPER_ADMIN]: [
        PERMISSIONS.MANAGE_LOCATIONS,
        PERMISSIONS.MANAGE_AGENCIES,
        PERMISSIONS.MANAGE_USERS,
        PERMISSIONS.VIEW_WALLET,
        PERMISSIONS.MANAGE_COMPLAINTS,
        PERMISSIONS.MANAGE_SETTINGS,
        PERMISSIONS.MANAGE_POLICY,
    ],

    // Agency Admin manages their organization's lots, users, checkins, complaints, and payouts
    [ROLES.AGENCY_ADMIN]: [
        PERMISSIONS.MANAGE_LOCATIONS,
        PERMISSIONS.MANAGE_USERS,
        PERMISSIONS.MANAGE_BOOKINGS,
        PERMISSIONS.VIEW_WALLET,
        PERMISSIONS.MANAGE_COMPLAINTS,
        PERMISSIONS.WITHDRAW_EARNINGS,
    ],

    // Agency User handles day-to-day slot checkin, checkout, and parking management
    [ROLES.AGENCY_USER]: [
        PERMISSIONS.VIEW_MAP,
        PERMISSIONS.MANAGE_BOOKINGS,
        PERMISSIONS.VIEW_WALLET,
    ],

    // Regular User registers on the app, views map, books slots, and manages personal wallet
    [ROLES.USER]: [
        PERMISSIONS.VIEW_MAP,
        PERMISSIONS.BOOK_PARKING,
        PERMISSIONS.VIEW_WALLET,
    ],
};
