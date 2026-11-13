import { api } from "./client";

export type NotificationPrefs = {
  paymentUpdates: boolean;
  payoutUpdates: boolean;
};

export function getNotificationPrefs(token: string): Promise<NotificationPrefs> {
  return api.post<NotificationPrefs>("/notifications/prefs", {}, token);
}

export function updateNotificationPrefs(
  patch: Partial<NotificationPrefs>,
  token: string,
): Promise<NotificationPrefs> {
  return api.put<NotificationPrefs>("/notifications/prefs", patch, token);
}
