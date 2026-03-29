import React, { createContext, useContext, useState } from "react";
import { api } from "../api/client";

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("admin_token"));

  async function login(username, password) {
    const res = await api.post("/login", { username, password });
    const { token: t } = res.data;
    localStorage.setItem("admin_token", t);
    setToken(t);
  }

  function logout() {
    localStorage.removeItem("admin_token");
    setToken(null);
  }

  return <AuthCtx.Provider value={{ token, login, logout }}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);
