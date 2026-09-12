import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { onAuthStateChanged, signOut as firebaseSignOut } from "firebase/auth";
import { auth } from "../auth/firebase";
import { UNAUTHORIZED_EVENT } from "../api/client";

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
    const token = await user.getIdToken();
    signIn(user.uid, token);
    return token;
  }, [signIn]);

  useEffect(
    () =>
      onAuthStateChanged(auth, (user) => {
        if (!user) {
          clearSession();
          return;
        }
        setSession((prev) => {
          if (prev && prev.uid === user.uid) {
            return prev;
          }
          void user.getIdToken().then((token) => signIn(user.uid, token));
          return prev;
        });
      }),
    [clearSession, signIn],
  );

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
