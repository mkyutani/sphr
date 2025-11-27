/**
 * Authentication Hook
 * Provides authentication state and methods
 */

import { createContext, useContext, useState, ReactNode } from "react";
import { api } from "../services/api";

interface AuthContextType {
  isAuthenticated: boolean;
  username: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState<string | null>(null);

  const login = async (username: string, password: string) => {
    await api.login(username, password);
    setIsAuthenticated(true);
    setUsername(username);
  };

  const logout = async () => {
    await api.logout();
    setIsAuthenticated(false);
    setUsername(null);
  };

  const register = async (username: string, password: string) => {
    await api.register(username, password);
    // Auto-login after registration
    await login(username, password);
  };

  return (
    <AuthContext.Provider
      value={{ isAuthenticated, username, login, logout, register }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
