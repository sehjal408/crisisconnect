import { createContext, useContext, useState, useCallback } from "react";
import { auth } from "../api/services";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("crisisconnect_token"));
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem("crisisconnect_user");
    return stored ? JSON.parse(stored) : null;
  });

  const persist = useCallback((nextToken, nextUser) => {
    localStorage.setItem("crisisconnect_token", nextToken);
    localStorage.setItem("crisisconnect_user", JSON.stringify(nextUser));
    setToken(nextToken);
    setUser(nextUser);
  }, []);

  const login = useCallback(
    async (email, password) => {
      const data = await auth.login(email, password);
      persist(data.token, data.user);
      return data.user;
    },
    [persist]
  );

  const register = useCallback(
    async (payload) => {
      const data = await auth.register(payload);
      persist(data.token, data.user);
      return data.user;
    },
    [persist]
  );

  // Merge fresh fields into the stored user (e.g. after a profile edit) so the
  // sidebar and greetings update without a re-login.
  const updateUser = useCallback((patch) => {
    setUser((prev) => {
      const next = { ...prev, ...patch };
      localStorage.setItem("crisisconnect_user", JSON.stringify(next));
      return next;
    });
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("crisisconnect_token");
    localStorage.removeItem("crisisconnect_user");
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ token, user, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
