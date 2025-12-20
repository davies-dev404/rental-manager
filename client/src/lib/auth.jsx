import { createContext, useContext, useState, useEffect } from "react";
import { api } from "./api";
import { useToast } from "@/hooks/use-toast";
const AuthContext = createContext(undefined);
export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();
    useEffect(() => {
        // Simulate session check
        const storedUser = localStorage.getItem("rental_user");
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }
        setIsLoading(false);
    }, []);
    const login = async (email, role) => {
        try {
            const user = await api.login(email, role);
            setUser(user);
            localStorage.setItem("rental_user", JSON.stringify(user));
            toast({ title: "Welcome back", description: `Logged in as ${user.name}` });
        }
        catch (error) {
            toast({ variant: "destructive", title: "Login failed", description: "Invalid credentials" });
            throw error;
        }
    };
    const logout = () => {
        setUser(null);
        localStorage.removeItem("rental_user");
        toast({ title: "Logged out" });
    };
    return (<AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>);
}
export function useAuth() {
    const context = useContext(AuthContext);
    if (!context)
        throw new Error("useAuth must be used within AuthProvider");
    return context;
}
