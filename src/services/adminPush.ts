import {
  getMessaging,
  getToken,
  isSupported,
  onMessage,
  type MessagePayload,
} from "firebase/messaging";
import { app } from "../auth/firebase";
import { config } from "../config";
import { adminRegisterPush, adminUnregisterPush } from "../api/admin";

const TOKEN_KEY = "roadassist.adminPush.token";

export type AdminPushReason =
  | "CONFIG_MISSING"
  | "UNSUPPORTED"
  | "PERMISSION_DENIED"
  | "NO_TOKEN";

export type AdminPushMessage = {
  title: string;
  body: string;
  route: string;
};

const routeFrom = (payload: MessagePayload): string => {
  const route = payload.data?.route;
  return typeof route === "string" && route !== "" ? route : "/admin";
};

export function adminPushConfigReady(): boolean {
  return (
    config.firebase.messagingVapidKey !== "" &&
    config.firebase.messagingSenderId !== "" &&
    config.firebase.appId !== ""
  );
}

export async function probeAdminPushToken(): Promise<{
  token: string | null;
  reason?: AdminPushReason;
}> {
  if (!adminPushConfigReady()) {
    return { token: null, reason: "CONFIG_MISSING" };
  }
  if (!(await isSupported())) {
    return { token: null, reason: "UNSUPPORTED" };
  }
  if (Notification.permission !== "granted") {
    return { token: null, reason: "PERMISSION_DENIED" };
  }
  const registration = await navigator.serviceWorker.register(
    "/firebase-messaging-sw.js",
  );
  const deviceToken = await getToken(getMessaging(app), {
    vapidKey: config.firebase.messagingVapidKey,
    serviceWorkerRegistration: registration,
  });
  if (deviceToken === "") {
    return { token: null, reason: "NO_TOKEN" };
  }
  return { token: deviceToken };
}

export async function enableAdminPush(
  authToken: string,
): Promise<{ enabled: boolean; reason?: AdminPushReason }> {
  if (!adminPushConfigReady()) {
    return { enabled: false, reason: "CONFIG_MISSING" };
  }
  if (!(await isSupported())) {
    return { enabled: false, reason: "UNSUPPORTED" };
  }
  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    return { enabled: false, reason: "PERMISSION_DENIED" };
  }
  const probe = await probeAdminPushToken();
  if (probe.token === null) {
    return { enabled: false, reason: probe.reason };
  }
  await adminRegisterPush(authToken, probe.token);
  localStorage.setItem(TOKEN_KEY, probe.token);
  return { enabled: true };
}

export async function disableAdminPush(authToken: string): Promise<void> {
  const deviceToken = localStorage.getItem(TOKEN_KEY);
  localStorage.removeItem(TOKEN_KEY);
  if (deviceToken !== null && deviceToken !== "") {
    await adminUnregisterPush(authToken, deviceToken).catch(() => undefined);
  }
}

export function adminPushEnabled(): boolean {
  return (localStorage.getItem(TOKEN_KEY) ?? "") !== "";
}

export async function watchAdminPush(
  handler: (message: AdminPushMessage) => void,
): Promise<() => void> {
  if (!adminPushConfigReady()) {
    return () => undefined;
  }
  if (!(await isSupported())) return () => undefined;
  return onMessage(getMessaging(app), (payload) => {
    handler({
      title: payload.notification?.title ?? "RoadAssist admin",
      body: payload.notification?.body ?? "",
      route: routeFrom(payload),
    });
  });
}
