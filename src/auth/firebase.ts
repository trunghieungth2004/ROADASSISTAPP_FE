import { initializeApp } from "firebase/app";
import { connectAuthEmulator, getAuth } from "firebase/auth";
import { config } from "../config";

export const app = initializeApp({
  apiKey: config.firebase.apiKey,
  authDomain: config.firebase.authDomain,
  projectId: config.firebase.projectId,
  storageBucket: config.firebase.storageBucket,
  messagingSenderId: config.firebase.messagingSenderId,
  appId: config.firebase.appId,
});

export const auth = getAuth(app);

if (config.authEmulatorUrl) {
  connectAuthEmulator(auth, config.authEmulatorUrl, { disableWarnings: true });
}
