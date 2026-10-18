import { createContext, useContext, useState, useEffect } from "react";
import { api } from "./api";
import { useToast } from "@/hooks/use-toast";
const AuthContext = createContext(undefined);
export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();
    useEffect(() => {
        const storedUser = localStorage.getItem("rental_user");
        if (storedUser) {
            const parsed = JSON.parse(storedUser);
            if (parsed && parsed.token) {
                setUser(parsed);
            } else {
                console.log("Detecting stale mock user, clearing session.");
                localStorage.removeItem("rental_user");
                setUser(null);
            }
        }
        setIsLoading(false);
    }, []);

    // Step 1: verify credentials. Returns { requiresOTP, email, name } or throws.
    const login = async (email, password) => {
        const result = await api.login(email, password);
        // Server returns requiresOTP: true after credentials pass
        if (result.requiresOTP) {
            return result;
        }
        setUser(result);
        localStorage.setItem("rental_user", JSON.stringify(result));
        return result;
    };

    // Step 2: submit the login OTP and finalise the session.
    const verifyLoginOtp = async (email, otp) => {
        const result = await api.verifyLoginOtp(email, otp);
        setUser(result);
        localStorage.setItem("rental_user", JSON.stringify(result));
        return result;
    };

    const resendLoginOtp = async (email) => {
        return await api.resendLoginOtp(email);
    };

    const socialLogin = async (provider, payload) => {
        try {
            const authFn = provider === 'apple' ? api.appleAuth : api.googleAuth;
            const resUser = await authFn(payload);
            setUser(resUser);
            localStorage.setItem("rental_user", JSON.stringify(resUser));
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

    const logout = () => {
        setUser(null);
        localStorage.removeItem("rental_user");
        toast({ title: "Logged out successfully" });
        window.location.href = "/login";
    };

    const updateProfile = async (updates) => {
        try {
            const updatedUser = { ...user, ...updates };
            // In a real app, we'd wait for API confirmation
            await api.updateUser(updates);
            
            setUser(updatedUser);
            localStorage.setItem("rental_user", JSON.stringify(updatedUser));
            toast({ title: "Profile updated", description: "Your profile has been updated successfully." });
        } catch (error) {
            toast({ variant: "destructive", title: "Update failed", description: "Could not update profile." });
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
