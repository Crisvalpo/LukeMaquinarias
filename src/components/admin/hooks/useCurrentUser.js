import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "luke_user";

/**
 * Hook liviano para gestionar la identidad del usuario actual.
 * Persiste en localStorage como { id, nombre_completo, rol, proyecto_actual_id, proyectos }
 */
export function useCurrentUser() {
  const [currentUser, setCurrentUserState] = useState(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        setCurrentUserState(JSON.parse(raw));
      }
    } catch {
      // localStorage no disponible
    }
    setLoaded(true);
  }, []);

  const setCurrentUser = useCallback((user) => {
    setCurrentUserState(user);
    try {
      if (user) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {}
  }, []);

  const clearUser = useCallback(() => {
    setCurrentUserState(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  }, []);

  return { currentUser, setCurrentUser, clearUser, loaded };
}
