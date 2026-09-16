import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  fetchMeBundle,
  setActiveVehicle as apiSetActiveVehicle,
  setOnboarded as apiSetOnboarded,
  type MeBundle,
  type MeVehicle,
} from "../api/users";
import { useAuth } from "./AuthContext";

type ProfileState = {
  bundle: MeBundle | null;
  loading: boolean;
  user: MeBundle["user"] | null;
  vehicles: MeVehicle[];
  activeVehicle: MeVehicle | null;
  roleChosen: boolean;
  hasVehicle: boolean;
  refresh: () => Promise<MeBundle | null>;
  activateVehicle: (profileId: string | null) => Promise<void>;
  markOnboarded: (role: string) => Promise<void>;
};

const ProfileContext = createContext<ProfileState | null>(null);

const MIRROR_KEY = "roadassist.profile";

function readMirror(uid: string | null): MeBundle | null {
  if (!uid) {
    return null;
  }
  try {
    const raw = localStorage.getItem(MIRROR_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as { uid?: unknown; bundle?: unknown };
    if (parsed.uid !== uid || !parsed.bundle) {
      return null;
    }
    return parsed.bundle as MeBundle;
  } catch {
    return null;
  }
}

function writeMirror(uid: string, bundle: MeBundle | null): void {
  try {
    if (!bundle) {
      localStorage.removeItem(MIRROR_KEY);
      return;
    }
    localStorage.setItem(MIRROR_KEY, JSON.stringify({ uid, bundle }));
  } catch {
    return;
  }
}

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { token, uid } = useAuth();
  const [bundle, setBundle] = useState<MeBundle | null>(() =>
    readMirror(uid),
  );
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async (): Promise<MeBundle | null> => {
    if (!token || !uid) {
      setBundle(null);
      writeMirror("", null);
      return null;
    }
    setLoading(true);
    try {
      let next = await fetchMeBundle(token);
      if (next.vehicles.length > 0 && !next.activeVehicle) {
        try {
          await apiSetActiveVehicle({ profileId: next.vehicles[0].id }, token);
          next = { ...next, activeVehicle: next.vehicles[0] };
        } catch {
          next = { ...next, activeVehicle: null };
        }
      }
      setBundle(next);
      writeMirror(uid, next);
      return next;
    } catch {
      return null;
    } finally {
      setLoading(false);
    }
  }, [token, uid]);

  useEffect(() => {
    if (token && uid) {
      void refresh();
    } else {
      setBundle(null);
      writeMirror("", null);
    }
  }, [token, uid, refresh]);

  const activateVehicle = useCallback(
    async (profileId: string | null) => {
      if (!token || !uid) {
        return;
      }
      const res = await apiSetActiveVehicle({ profileId }, token);
      setBundle((prev) => {
        if (!prev) {
          return prev;
        }
        const active = res.profileId
          ? (prev.vehicles.find((v) => v.id === res.profileId) ?? null)
          : null;
        const next = { ...prev, activeVehicle: active };
        writeMirror(uid, next);
        return next;
      });
    },
    [token, uid],
  );

  const markOnboarded = useCallback(
    async (role: string) => {
      if (!token || !uid) {
        return;
      }
      const res = await apiSetOnboarded({ role }, token);
      setBundle((prev) => {
        if (!prev) {
          return prev;
        }
        const next = {
          ...prev,
          user: {
            ...prev.user,
            onboarded: res.onboarded,
            services: res.services,
          },
        };
        writeMirror(uid, next);
        return next;
      });
    },
    [token, uid],
  );

  const value = useMemo<ProfileState>(() => {
    const vehicles = bundle?.vehicles ?? [];
    return {
      bundle,
      loading,
      user: bundle?.user ?? null,
      vehicles,
      activeVehicle: bundle?.activeVehicle ?? null,
      roleChosen: bundle?.user.onboarded === true,
      hasVehicle: vehicles.length > 0,
      refresh,
      activateVehicle,
      markOnboarded,
    };
  }, [bundle, loading, refresh, activateVehicle, markOnboarded]);

  return (
    <ProfileContext.Provider value={value}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const ctx = useContext(ProfileContext);
  if (!ctx) {
    throw new Error("ProfileProvider missing");
  }
  return ctx;
}
