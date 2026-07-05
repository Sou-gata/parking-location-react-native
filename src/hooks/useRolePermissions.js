import { useSelector } from "react-redux";
import { ROLE_PERMISSIONS } from "../utils/rbacConfig";

export const useRolePermissions = () => {
    const user = useSelector((state) => state.user.user);
    let role = user?.role || "user";

    // Safely retrieve permissions from config based on user role
    const permissions = ROLE_PERMISSIONS[role] || [];

    const hasPermission = (permission) => {
        return permissions.includes(permission);
    };

    const hasAnyPermission = (requiredPermissions) => {
        if (!Array.isArray(requiredPermissions)) return false;
        return requiredPermissions.some((perm) => permissions.includes(perm));
    };

    const hasAllPermissions = (requiredPermissions) => {
        if (!Array.isArray(requiredPermissions)) return false;
        return requiredPermissions.every((perm) => permissions.includes(perm));
    };
    const hasRole = (checkRole) => {
        return role === checkRole;
    };

    return {
        user,
        role,
        permissions,
        hasPermission,
        hasAnyPermission,
        hasAllPermissions,
        hasRole,
    };
};

export default useRolePermissions;
