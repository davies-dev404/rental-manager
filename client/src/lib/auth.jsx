import { createContext, useContext, useState, useEffect } from "react";
import { api, refreshAuthSession } from "./api";
import { hydrateQueryCacheForUser, clearPersistedQueryCache } from "./queryClient";
import { useToast } from "@/hooks/use-toast";
const AuthContext = createContext(undefined);

function readInitialAuthState() {
    if (typeof window === "undefined") {
        return { user: null, needsRefresh: false };
    }
    const storedUser = localStorage.getItem("rental_user");
    if (!storedUser) {
        return { user: null, needsRefresh: false };
    }
    try {
        const parsed = JSON.parse(storedUser);
        if (!parsed || !parsed.token) {
            localStorage.removeItem("rental_user");
            return { user: null, needsRefresh: false };
        }
        let isExpired = false;
        const tokenParts = parsed.token.split('.');
        if (tokenParts.length === 3) {
            try {
                const payload = JSON.parse(atob(tokenParts[1]));
                if (payload.exp && Date.now() >= payload.exp * 1000) {
                    isExpired = true;
                }
            } catch (e) {}
        }
        if (isExpired) {
            return { user: null, needsRefresh: true };
        }
        return { user: parsed, needsRefresh: false };
    } catch {
        localStorage.removeItem("rental_user");
        return { user: null, needsRefresh: false };
    }
}

export function AuthProvider({ children }) {
    const initialAuth = readInitialAuthState();
    const [user, setUser] = useState(initialAuth.user);
    const [isLoading, setIsLoading] = useState(initialAuth.needsRefresh);
    const { toast } = useToast();
    useEffect(() => {
        let isMounted = true;
        const initAuth = async () => {
            if (!initialAuth.needsRefresh) {
                if (initialAuth.user) {
                    hydrateQueryCacheForUser(initialAuth.user);
                }
                return;
            }
            try {
                const refreshed = await refreshAuthSession();
                if (!isMounted) return;
                if (refreshed?.token) {
                    hydrateQueryCacheForUser(refreshed);
                    setUser(refreshed);
                } else {
                    console.log("Session token expired, clearing stored session.");
                    localStorage.removeItem("rental_user");
                    clearPersistedQueryCache();
                    setUser(null);
                }
            } finally {
                if (isMounted) setIsLoading(false);
            }
        };

        initAuth();

        const handleLogoutEvent = () => {
            setUser(null);
            localStorage.removeItem("rental_user");
            clearPersistedQueryCache();
        };
        window.addEventListener("auth:logout", handleLogoutEvent);
        return () => {
            isMounted = false;
            window.removeEventListener("auth:logout", handleLogoutEvent);
        };
    }, []);

    // Step 1: verify credentials. Returns { requiresOTP, email, name } or throws.
    const login = async (email, password, turnstileToken) => {
        const result = await api.login(email, password, turnstileToken);
        // Server returns requiresOTP: true after credentials pass
        if (result.requiresOTP) {
            return result;
        }
        localStorage.setItem("rental_user", JSON.stringify(result));
        hydrateQueryCacheForUser(result);
        setUser(result);
        return result;
    };

    // Step 2: submit the login OTP and finalise the session.
    const verifyLoginOtp = async (email, otp) => {
        const result = await api.verifyLoginOtp(email, otp);
        localStorage.setItem("rental_user", JSON.stringify(result));
        hydrateQueryCacheForUser(result);
        setUser(result);
        return result;
    };

    const resendLoginOtp = async (email) => {
        return await api.resendLoginOtp(email);
    };

    const socialLogin = async (provider, payload) => {
        try {
            const authFn = provider === 'apple' ? api.appleAuth : api.googleAuth;
            const resUser = await authFn(payload);
            localStorage.setItem("rental_user", JSON.stringify(resUser));
            hydrateQueryCacheForUser(resUser);
            setUser(resUser);
            toast({ 
              title: "Welcome! 🎉", 
              description: `Signed in as ${resUser.name} (${resUser.role})` 
            });
            return resUser;
        } catch (error) {
            toast({ 
              variant: "destructive", 
              title: `${provider === 'apple' ? 'Apple' : 'Google'} Sign-In Failed`, 
              description: error.message || "Could not complete sign in" 
            });
            throw error;
        }
    };

    const logout = async () => {
        try {
            await api.logout();
        } catch (e) {}
        setUser(null);
        localStorage.removeItem("rental_user");
        clearPersistedQueryCache();
        toast({ title: "Logged out successfully" });
        window.location.href = "/login";
    };

    const updateProfile = async (updates) => {
        try {
            const serverUser = await api.updateUser(updates);
            const updatedUser = { ...user, ...serverUser };
            setUser(updatedUser);
            localStorage.setItem("rental_user", JSON.stringify(updatedUser));
            return updatedUser;
        } catch (error) {
            toast({ variant: "destructive", title: "Update failed", description: error.message || "Could not update profile." });
            throw error;
        }
    };

    return (<AuthContext.Provider value={{ user, login, verifyLoginOtp, resendLoginOtp, socialLogin, logout, updateProfile, isLoading }}>
      {children}
    </AuthContext.Provider>);
}
export function useAuth() {
    const context = useContext(AuthContext);
    if (!context)
        throw new Error("useAuth must be used within AuthProvider");
    return context;
}
