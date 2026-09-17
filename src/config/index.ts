import appConfig from "./appConfig.json";

export const config = {
  apiBaseUrl:
    import.meta.env.VITE_API_BASE_URL || appConfig.apiBaseUrl || "/api",
  firebase: {
    apiKey: appConfig.firebase.apiKey,
    authDomain: appConfig.firebase.authDomain,
    projectId: appConfig.firebase.projectId,
  },
  authEmulatorUrl:
    import.meta.env.VITE_USE_AUTH_EMULATOR === "true"
      ? appConfig.authEmulatorUrl
      : "",
  maptilerKey: appConfig.maptilerKey || "",
};
