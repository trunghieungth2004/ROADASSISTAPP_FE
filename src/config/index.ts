import appConfig from "./appConfig.json";

export const config = {
  apiBaseUrl:
    import.meta.env.VITE_API_BASE_URL || appConfig.apiBaseUrl || "/api",
  firebase: {
    apiKey: appConfig.firebase.apiKey,
    authDomain: appConfig.firebase.authDomain,
    projectId: appConfig.firebase.projectId,
    storageBucket:
      (appConfig.firebase as { storageBucket?: string }).storageBucket ||
      `${appConfig.firebase.projectId}.firebasestorage.app`,
    messagingVapidKey:
      import.meta.env.VITE_FIREBASE_VAPID_KEY ||
      (appConfig.firebase as { messagingVapidKey?: string })
        .messagingVapidKey ||
      "",
    messagingSenderId:
      (appConfig.firebase as { messagingSenderId?: string })
        .messagingSenderId || "",
    appId: (appConfig.firebase as { appId?: string }).appId || "",
  },
  authEmulatorUrl:
    import.meta.env.VITE_USE_AUTH_EMULATOR === "true"
      ? appConfig.authEmulatorUrl
      : "",
  maptilerKey: appConfig.maptilerKey || "",
};
