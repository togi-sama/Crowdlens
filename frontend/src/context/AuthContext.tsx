import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { authService } from "../api/authService";
import { checkAlerts } from "../api/crowdService";
import type { AlertedLocation } from "../components/AlertModal";

export interface User {
  name: string;
  email: string;
  role: string;
}

interface AuthContextValue {
  user: User | null;
  logout: () => void;
  refreshUser: () => void;
  pendingAlerts: AlertedLocation[];
  clearAlerts: () => void;
}

function decodeToken(token: string): User | null {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    const name =
      payload["name"] ??
      payload["unique_name"] ??
      payload["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"] ??
      "";
    const email =
      payload["email"] ??
      payload["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress"] ??
      "";
    const role =
      payload["role"] ??
      payload["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"] ??
      "user";
    return { name, email, role };
  } catch {
    return null;
  }
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  logout: () => {},
  refreshUser: () => {},
  pendingAlerts: [],
  clearAlerts: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const token = authService.getToken();
    return token ? decodeToken(token) : null;
  });

  const [pendingAlerts, setPendingAlerts] = useState<AlertedLocation[]>([]);

  const logout = useCallback(() => {
    authService.logout();
    setUser(null);
    setPendingAlerts([]);
  }, []);

  // Called right after a successful login. Decodes the new token and fires the
  // alert check in the background — the modal will appear once UserHome mounts.
  const refreshUser = useCallback(() => {
    const token = authService.getToken();
    const decoded = token ? decodeToken(token) : null;
    setUser(decoded);
    if (decoded) {
      checkAlerts()
        .then(setPendingAlerts)
        .catch(() => setPendingAlerts([]));
    }
  }, []);

  const clearAlerts = useCallback(() => setPendingAlerts([]), []);

  return (
    <AuthContext.Provider value={{ user, logout, refreshUser, pendingAlerts, clearAlerts }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
