import { useAuth } from "@/lib/auth";

export const PERMISSIONS = {
  MANAGE_SETTINGS: 'manage_settings',
  DELETE_DATA: 'delete_data',
  MANAGE_USERS: 'manage_users',
  VIEW_REPORTS: 'view_reports',
  MANAGE_PROPERTIES: 'manage_properties', // Full access (create/delete)
  EDIT_PROPERTIES: 'edit_properties', // Edit only
  MANAGE_TENANTS: 'manage_tenants',
};

const ROLE_PERMISSIONS = {
  admin: [
    PERMISSIONS.MANAGE_SETTINGS,
    PERMISSIONS.DELETE_DATA,
    PERMISSIONS.MANAGE_USERS,
    PERMISSIONS.VIEW_REPORTS,
    PERMISSIONS.MANAGE_PROPERTIES,
    PERMISSIONS.EDIT_PROPERTIES,
    PERMISSIONS.MANAGE_TENANTS
  ],
  caretaker: [
    PERMISSIONS.EDIT_PROPERTIES,
    PERMISSIONS.MANAGE_TENANTS, // Can add/edit but restricted delete in UI check
    PERMISSIONS.VIEW_REPORTS
  ]
};

export function usePermission(permission) {
  const { user } = useAuth();
  if (!user) return false;
  
  const userPermissions = ROLE_PERMISSIONS[user.role] || [];
  return userPermissions.includes(permission);
}

export function Protect({ permission, children, fallback = null }) {
  const hasPermission = usePermission(permission);
  if (!hasPermission) return fallback;
  return <>{children}</>;
}
