import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { User, UserRole, api } from "./mock-data";
import { useToast } from "@/hooks/use-toast";

interface AuthContextType {
  user: User | null;
  login: (email: string, role: UserRole) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
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

  const login = async (email: string, role: UserRole) => {
    try {
      const user = await api.login(email, role);
      setUser(user);
      localStorage.setItem("rental_user", JSON.stringify(user));
      toast({ title: "Welcome back", description: `Logged in as ${user.name}` });
    } catch (error) {
      toast({ variant: "destructive", title: "Login failed", description: "Invalid credentials" });
      throw error;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("rental_user");
    toast({ title: "Logged out" });
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
