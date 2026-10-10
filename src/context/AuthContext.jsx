import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { apiClient } from "../lib/apiClient";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      try {
        // Cek localStorage
        const savedUser = window.localStorage.getItem('zcoffee-user');
        if (savedUser && mounted) {
          try {
            const parsedUser = JSON.parse(savedUser);
            setUser(parsedUser);
            setProfile({ full_name: parsedUser.name || parsedUser.email, role: parsedUser.role || 'admin' });
          } catch {
            window.localStorage.removeItem('zcoffee-user');
          }
        }
      } catch (err) {
        console.error("Auth initialization error:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    initAuth();

    return () => {
      mounted = false;
    };
  }, []);

  const login = async (credentials) => {
    try {
      // 1. Try real backend
      try {
        const { user: apiUser } = await apiClient.post('/auth/login', credentials);
        if (apiUser) {
          if (typeof window !== 'undefined' && window.localStorage) {
            window.localStorage.setItem("zcoffee-user", JSON.stringify(apiUser));
          }
          setUser(apiUser);
          setProfile({ full_name: apiUser.name || apiUser.email, role: apiUser.role || 'admin' });
          return { success: true };
        }
      } catch (error) {
        // Fallback or handle error appropriately. If the backend is running, it will throw error from fetch if invalid credentials.
        if (error.message.includes('Failed to fetch') || error.message.includes('Load failed')) {
          console.warn("Backend not running, falling back to demo login");
        } else {
          return { success: false, error: "Email atau password salah." };
        }
      }

      // 2. Demo fallback authentication (if backend is not running yet)
      if (credentials.email === "admin@zcoffee.id" && credentials.password === "caffee123!@#") {
        const nextUser = {
          id: "demo-admin-id",
          name: "Admin Kasir",
          email: credentials.email,
          initials: "AK",
          role: "admin"
        };
  
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem("zcoffee-user", JSON.stringify(nextUser));
        }
        setUser(nextUser);
        setProfile({ full_name: "Admin Kasir", role: "admin" });
        return { success: true };
      }
  
      return { success: false, error: "Email atau password salah. Coba admin@zcoffee.id dan caffee123!@#." };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const logout = async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch(e) {
      // Ignore if backend not running
    }
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem("zcoffee-user");
    }
    setUser(null);
    setProfile(null);
  };

  const value = useMemo(
    () => ({
      user,
      profile,
      loading,
      login,
      logout,
      isAuthenticated: Boolean(user),
      isAdmin: profile?.role === 'admin' || user?.email === 'admin@zcoffee.id',
    }),
    [user, profile, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}