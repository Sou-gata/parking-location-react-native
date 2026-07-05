import React from "react";
import useRolePermissions from "../hooks/useRolePermissions";

/**
 * PermissionGuard Component
 * Wraps UI elements and conditionally renders them based on user permissions.
 *
 * @param {Object} props
 * @param {string|string[]} props.permission - A single permission string or array of permissions required.
 * @param {boolean} [props.requireAll=false] - When true, user must have all specified permissions. When false, user needs at least one.
 * @param {React.ReactNode} [props.fallback=null] - UI to render if user is not authorized.
 * @param {React.ReactNode} props.children - Elements to render if authorized.
 */
export const PermissionGuard = ({
    permission,
    requireAll = false,
    fallback = null,
    children,
}) => {
    const { hasPermission, hasAnyPermission, hasAllPermissions } =
        useRolePermissions();

    let isAuthorized = false;

    if (Array.isArray(permission)) {
        isAuthorized = requireAll
            ? hasAllPermissions(permission)
            : hasAnyPermission(permission);
    } else if (typeof permission === "string") {
        isAuthorized = hasPermission(permission);
    } else {
        // If no permission specified, allow rendering
        isAuthorized = true;
    }

    if (!isAuthorized) {
        return fallback;
    }

    return <>{children}</>;
};

export default PermissionGuard;
