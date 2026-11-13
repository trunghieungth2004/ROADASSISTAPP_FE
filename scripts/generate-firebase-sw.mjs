import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const configPath = path.join(root, "src/config/appConfig.json");
const outputPath = path.join(root, "public/firebase-messaging-sw.js");

if (!fs.existsSync(configPath)) {
  console.warn("firebase-messaging-sw skipped: appConfig.json missing");
  process.exit(0);
}

const appConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));
const firebase = appConfig.firebase ?? {};

if (!firebase.messagingSenderId || !firebase.appId) {
  fs.rmSync(outputPath, { force: true });
  console.warn("firebase-messaging-sw skipped: messaging config missing");
  process.exit(0);
}

const body = `importScripts("https://www.gstatic.com/firebasejs/12.19.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/12.19.0/firebase-messaging-compat.js");

firebase.initializeApp(${JSON.stringify({
  apiKey: firebase.apiKey ?? "",
  authDomain: firebase.authDomain ?? "",
  projectId: firebase.projectId ?? "",
  storageBucket: firebase.storageBucket ||
    `${firebase.projectId}.firebasestorage.app`,
  messagingSenderId: firebase.messagingSenderId ?? "",
  appId: firebase.appId ?? "",
}, null, 2)});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const data = {
    title: payload.notification?.title ?? "RoadAssist admin",
    body: payload.notification?.body ?? "",
    route: payload.data?.route ?? "/admin",
  };
  self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
    for (const client of list) {
      client.postMessage({ type: "roadassist-admin-push", payload: data });
    }
  });
});
`;
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, body);
