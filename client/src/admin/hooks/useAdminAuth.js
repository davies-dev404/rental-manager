import { useAuth } from "@/lib/auth";

export function useAdminAuth() {
  const { user, isLoading, logout } = useAuth();
  const isAuthenticated = Boolean(user && user.token);
  const isSuperAdmin = Boolean(user && (user.isSuperAdmin === true || user.role === "superadmin"));

  return {
    user,
    isLoading,
    isAuthenticated,
    isSuperAdmin,
    logout
  };
}
