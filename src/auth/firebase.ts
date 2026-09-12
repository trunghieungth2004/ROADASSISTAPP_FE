import { initializeApp } from "firebase/app";
import { connectAuthEmulator, getAuth } from "firebase/auth";
import { config } from "../config";

const app = initializeApp({
  apiKey: config.firebase.apiKey,
  authDomain: config.firebase.authDomain,
  projectId: config.firebase.projectId,
});

export const auth = getAuth(app);

if (config.authEmulatorUrl) {
  connectAuthEmulator(auth, config.authEmulatorUrl, { disableWarnings: true });
}
