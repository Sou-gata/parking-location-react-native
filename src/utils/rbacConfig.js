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
};

// Define the Role-to-Permissions Matrix
export const ROLE_PERMISSIONS = {
    // Super Admin has full system privileges
    [ROLES.SUPER_ADMIN]: [
        PERMISSIONS.VIEW_MAP,
        PERMISSIONS.BOOK_PARKING,
        PERMISSIONS.MANAGE_LOCATIONS,
        PERMISSIONS.MANAGE_USERS,
        PERMISSIONS.MANAGE_BOOKINGS,
    ],

    // Agency Admin manages their organization's lots, users, and checkins
    [ROLES.AGENCY_ADMIN]: [
        PERMISSIONS.VIEW_MAP,
        PERMISSIONS.MANAGE_LOCATIONS,
        PERMISSIONS.MANAGE_USERS,
        PERMISSIONS.MANAGE_BOOKINGS,
    ],

    // Agency User handles day-to-day slot checkin, checkout, and parking management
    [ROLES.AGENCY_USER]: [PERMISSIONS.VIEW_MAP, PERMISSIONS.MANAGE_BOOKINGS],

    // Regular User registers on the app, views map, and books slots
    [ROLES.USER]: [PERMISSIONS.VIEW_MAP, PERMISSIONS.BOOK_PARKING],
};
