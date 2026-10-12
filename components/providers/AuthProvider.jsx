"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { get, patch, post } from "@/lib/client-api";

/**
 * Holds the signed-in user on the client.
 *
 * The server already knows who is signed in — layouts read the session
 * directly — so the initial value is passed down as a prop and this context
 * exists to keep the header in sync after a sign-in, sign-out or profile
 * edit, without a second round trip on first paint.
 */

const AuthContext = createContext(null);

export function AuthProvider({ initialUser = null, children }) {
  const router = useRouter();
  const [user, setUser] = useState(initialUser);

  const refresh = useCallback(async () => {
    try {
      const data = await get("/api/auth/me");
      setUser(data.user);
      return data.user;
    } catch {
      setUser(null);
      return null;
    }
  }, []);

  const login = useCallback(
    async (credentials) => {
      const data = await post("/api/auth/login", credentials);
      setUser(data.user);
      return data.user;
    },
    [],
  );

  const register = useCallback(async (payload) => {
    const data = await post("/api/auth/register", payload);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    await post("/api/auth/logout");
    setUser(null);
    try {
      sessionStorage.removeItem("jobai.booted");
    } catch {
      /* ignore */
    }
    router.replace("/");
    router.refresh();
  }, [router]);

  const updateProfile = useCallback(async (payload) => {
    const data = await patch("/api/auth/me", payload);
    setUser(data.user);
    return data.user;
  }, []);

  const value = useMemo(
    () => ({
      user,
      isAdmin: user?.role === "ADMIN",
      signedIn: Boolean(user),
      refresh,
      login,
      register,
      logout,
      updateProfile,
      setUser,
    }),
    [user, refresh, login, register, logout, updateProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside <AuthProvider>");
  return context;
}
