import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { onIdTokenChanged, signOut as firebaseSignOut } from "firebase/auth";
import { auth } from "../auth/firebase";
import { UNAUTHORIZED_EVENT, setTokenRefresher } from "../api/client";
import { loadStatuses } from "../api/meta";

type Session = {
  uid: string;
  token: string;
};

type AuthState = {
  uid: string | null;
  token: string | null;
  signIn: (uid: string, token: string) => void;
  signOut: () => void;
  refreshToken: () => Promise<string | null>;
};

const AuthContext = createContext<AuthState | null>(null);

const STORAGE_KEY = "roadassist.session";

const INVALID_SESSION_CODES = new Set([
  "auth/user-token-expired",
  "auth/invalid-user-token",
  "auth/user-disabled",
  "auth/user-not-found",
]);

function isSessionInvalid(err: unknown): boolean {
  return (
    !!err &&
    typeof err === "object" &&
    "code" in err &&
    typeof err.code === "string" &&
    INVALID_SESSION_CODES.has(err.code)
  );
}

function readSession(): Session | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(readSession);

  useEffect(() => {
    if (session?.token) {
      void loadStatuses(session.token);
    }
  }, [session?.token]);

  const signIn = useCallback((nextUid: string, nextToken: string) => {
    const next = { uid: nextUid, token: nextToken };
    setSession(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const clearSession = useCallback(() => {
    setSession(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const signOut = useCallback(async () => {
    clearSession();
    await firebaseSignOut(auth);
  }, [clearSession]);

  const refreshToken = useCallback(async (): Promise<string | null> => {
    const user = auth.currentUser;
    if (!user) {
      return null;
    }
    const token = await user.getIdToken(true);
    signIn(user.uid, token);
    return token;
  }, [signIn]);

  useEffect(
    () =>
      onIdTokenChanged(auth, (user) => {
        if (!user) {
          clearSession();
          return;
        }
        void user
          .getIdToken()
          .then((token) => {
            setSession((prev) => {
              if (prev && prev.uid === user.uid && prev.token === token) {
                return prev;
              }
              const next = { uid: user.uid, token };
              localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
              return next;
            });
          })
          .catch(() => {
            clearSession();
          });
      }),
    [clearSession],
  );

  useEffect(() => {
    let cancelled = false;
    async function checkSession(): Promise<void> {
      const user = auth.currentUser;
      if (!user || cancelled) {
        return;
      }
      try {
        await user.getIdToken(false);
      } catch (err) {
        if (cancelled) {
          return;
        }
        if (isSessionInvalid(err)) {
          clearSession();
          await firebaseSignOut(auth);
        }
      }
    }
    void checkSession();
    const id = window.setInterval(() => void checkSession(), 60000);
    const onVisible = (): void => {
      if (document.visibilityState === "visible") {
        void checkSession();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [clearSession]);

  useEffect(() => {
    setTokenRefresher(refreshToken);
    return () => setTokenRefresher(null);
  }, [refreshToken]);

  useEffect(() => {
    const onUnauthorized = (): void => {
      clearSession();
      void firebaseSignOut(auth);
    };
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
  }, [clearSession]);

  return (
    <AuthContext.Provider
      value={{
        uid: session?.uid ?? null,
        token: session?.token ?? null,
        signIn,
        signOut,
        refreshToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("AuthProvider missing");
  }
  return ctx;
}
