import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { signOut as firebaseSignOut } from "firebase/auth";
import { auth } from "../auth/firebase";

type Session = {
  uid: string;
  token: string;
};

type AuthState = {
  uid: string | null;
  token: string | null;
  signIn: (uid: string, token: string) => void;
  signOut: () => void;
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

  const signOut = useCallback(async () => {
    setSession(null);
    localStorage.removeItem(STORAGE_KEY);
    await firebaseSignOut(auth);
  }, []);

  return (
    <AuthContext.Provider
      value={{ uid: session?.uid ?? null, token: session?.token ?? null, signIn, signOut }}
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
