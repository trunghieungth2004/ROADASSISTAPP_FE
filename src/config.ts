import appConfig from "./config/appConfig.json";

export const config = {
  apiBaseUrl: appConfig.apiBaseUrl || "/api",
  firebase: {
    apiKey: appConfig.firebase.apiKey,
    authDomain: appConfig.firebase.authDomain,
    projectId: appConfig.firebase.projectId,
  },
  authEmulatorUrl: import.meta.env.DEV ? appConfig.authEmulatorUrl : "",
  maptilerKey: appConfig.maptilerKey || "",
};
