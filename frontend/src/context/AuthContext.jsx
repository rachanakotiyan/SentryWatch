import { useEffect, useMemo, useState } from "react";
import { getCurrentUser, getErrorMessage, login as loginRequest, register as registerRequest } from "../utils/storage";
import { TOKEN_KEY } from "../services/api";
import { AuthContext } from "./auth-context-value";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [authError, setAuthError] = useState("");
  const [loading, setLoading] = useState(() => Boolean(localStorage.getItem(TOKEN_KEY)));

  useEffect(() => {
    if (!localStorage.getItem(TOKEN_KEY)) return undefined;

    let active = true;
    getCurrentUser()
      .then((currentUser) => {
        if (active) setUser(currentUser);
      })
      .catch((error) => {
        if (active) {
          setUser(null);
          setAuthError(getErrorMessage(error, "Could not verify your session. Check your connection and try again."));
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const authenticate = async (request, email, password) => {
    const data = await request(email, password);
    localStorage.setItem(TOKEN_KEY, data.token);
    setAuthError("");
    setUser(data.user);
    return data.user;
  };

  const value = useMemo(() => ({
    user,
    loading,
    authError,
    login: (email, password) => authenticate(loginRequest, email, password),
    register: (email, password) => authenticate(registerRequest, email, password),
    logout: () => {
      localStorage.removeItem(TOKEN_KEY);
      setUser(null);
    },
  }), [user, loading, authError]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
