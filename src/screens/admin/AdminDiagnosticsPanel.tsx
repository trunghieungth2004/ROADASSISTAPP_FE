import { useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Typography from "@mui/material/Typography";
import { adminAudit, adminRegisterPush } from "../../api/admin";
import { useAdminToast } from "./AdminToastContext";
import { config } from "../../config";
import { useAuth } from "../../context/AuthContext";
import { useStrings } from "../../context/LanguageContext";
import {
  adminPushConfigReady,
  enableAdminPush,
  probeAdminPushToken,
  type AdminPushReason,
} from "../../services/adminPush";
import PanelHeader from "./PanelHeader";
import SettingSection from "./SettingSection";

type Status = "idle" | "running" | "pass" | "fail";
type Result = { status: Status; detail: string };
type Group = "network" | "config" | "browser" | "push";

type Check = {
  id: string;
  group: Group;
  label: string;
  run: () => Promise<{ ok: boolean; detail: string }>;
};

export default function AdminDiagnosticsPanel() {
  const { t } = useStrings();
  const { token: authToken } = useAuth();
  const { showToast } = useAdminToast();
  const [results, setResults] = useState<Record<string, Result>>({});
  const [busy, setBusy] = useState(false);
  const [enableBusy, setEnableBusy] = useState(false);
  const [enableNotice, setEnableNotice] = useState<string | null>(null);
  const [enableError, setEnableError] = useState<string | null>(null);

  function reasonMessage(reason?: AdminPushReason): string {
    if (reason === "CONFIG_MISSING") return t.admin.pushReasonConfig;
    if (reason === "UNSUPPORTED") return t.admin.pushReasonUnsupported;
    if (reason === "PERMISSION_DENIED") return t.admin.pushReasonDenied;
    if (reason === "NO_TOKEN") return t.admin.pushReasonNoToken;
    return t.admin.pushReasonUnknown;
  }

  const checks: Check[] = [
    {
      id: "apiUrl",
      group: "network",
      label: t.admin.diagApiUrl,
      run: async () => ({
        ok: true,
        detail: config.apiBaseUrl || "same origin",
      }),
    },
    {
      id: "ping",
      group: "network",
      label: t.admin.diagPing,
      run: async () => {
        if (!authToken) return { ok: false, detail: t.admin.diagNoAuth };
        const started = performance.now();
        try {
          await adminAudit(authToken, 1);
          return {
            ok: true,
            detail: `${Math.round(performance.now() - started)} ms`,
          };
        } catch (err) {
          return {
            ok: false,
            detail: err instanceof Error ? err.message : String(err),
          };
        }
      },
    },
    {
      id: "sender",
      group: "config",
      label: t.admin.diagSender,
      run: async () => ({
        ok: config.firebase.messagingSenderId !== "",
        detail: config.firebase.messagingSenderId || "MISSING",
      }),
    },
    {
      id: "appId",
      group: "config",
      label: t.admin.diagAppId,
      run: async () => ({
        ok: config.firebase.appId !== "",
        detail: config.firebase.appId || "MISSING",
      }),
    },
    {
      id: "vapid",
      group: "config",
      label: t.admin.diagVapid,
      run: async () => ({
        ok: config.firebase.messagingVapidKey !== "",
        detail: config.firebase.messagingVapidKey === "" ? "MISSING" : "SET",
      }),
    },
    {
      id: "secure",
      group: "browser",
      label: t.admin.diagSecure,
      run: async () => ({
        ok: window.isSecureContext,
        detail: window.location.origin,
      }),
    },
    {
      id: "permission",
      group: "browser",
      label: t.admin.diagPermission,
      run: async () => ({
        ok:
          typeof Notification !== "undefined" &&
          Notification.permission === "granted",
        detail:
          typeof Notification === "undefined"
            ? "UNSUPPORTED"
            : Notification.permission,
      }),
    },
    {
      id: "serviceWorker",
      group: "browser",
      label: t.admin.diagServiceWorker,
      run: async () => {
        if (!("serviceWorker" in navigator)) {
          return { ok: false, detail: t.admin.diagNoSw };
        }
        const registration = await navigator.serviceWorker.getRegistration(
          "/firebase-messaging-sw.js",
        );
        return {
          ok: Boolean(registration?.active),
          detail: registration?.active?.state ?? t.admin.diagNoSw,
        };
      },
    },
    {
      id: "enable",
      group: "push",
      label: t.admin.diagEnable,
      run: async () => {
        const probe = await probeAdminPushToken();
        return probe.token
          ? { ok: true, detail: "ON" }
          : { ok: false, detail: reasonMessage(probe.reason) };
      },
    },
    {
      id: "token",
      group: "push",
      label: t.admin.diagToken,
      run: async () => {
        const probe = await probeAdminPushToken();
        return probe.token
          ? { ok: true, detail: `${probe.token.slice(0, 14)}…` }
          : { ok: false, detail: reasonMessage(probe.reason) };
      },
    },
    {
      id: "registered",
      group: "push",
      label: t.admin.diagRegistered,
      run: async () => {
        if (!authToken) return { ok: false, detail: t.admin.diagNoAuth };
        const probe = await probeAdminPushToken();
        if (!probe.token) {
          return { ok: false, detail: reasonMessage(probe.reason) };
        }
        try {
          const record = await adminRegisterPush(authToken, probe.token);
          const present = record.tokens.includes(probe.token);
          return {
            ok: present,
            detail: `${record.tokens.length} tokens`,
          };
        } catch (err) {
          return {
            ok: false,
            detail: err instanceof Error ? err.message : String(err),
          };
        }
      },
    },
  ];

  async function enable(): Promise<void> {
    if (!authToken || enableBusy) return;
    setEnableBusy(true);
    setEnableNotice(null);
    setEnableError(null);
    try {
      const result = await enableAdminPush(authToken);
      if (result.enabled) {
        setEnableNotice(t.admin.pushEnabled);
        setResults((prev) => ({
          ...prev,
          enable: { status: "pass", detail: "ON" },
        }));
      } else {
        setEnableError(reasonMessage(result.reason));
      }
    } catch (err) {
      setEnableError(err instanceof Error ? err.message : String(err));
    } finally {
      setEnableBusy(false);
    }
  }

  async function runAll(): Promise<void> {
    if (busy) return;
    setBusy(true);
    setResults(
      Object.fromEntries(
        checks.map((check) => [
          check.id,
          { status: "running" as Status, detail: "" },
        ]),
      ),
    );
    for (const check of checks) {
      try {
        const result = await check.run();
        setResults((prev) => ({
          ...prev,
          [check.id]: {
            status: result.ok ? "pass" : "fail",
            detail: result.detail,
          },
        }));
      } catch (err) {
        setResults((prev) => ({
          ...prev,
          [check.id]: {
            status: "fail",
            detail: err instanceof Error ? err.message : String(err),
          },
        }));
      }
    }
    setBusy(false);
  }

  function statusLabel(status: Status): string {
    if (status === "pass") return t.admin.diagPass;
    if (status === "fail") return t.admin.diagFail;
    if (status === "running") return t.admin.diagRunning;
    return t.admin.diagIdle;
  }

  function statusColor(status: Status): "success" | "error" | "warning" | "default" {
    if (status === "pass") return "success";
    if (status === "fail") return "error";
    if (status === "running") return "warning";
    return "default";
  }

  function groupChecks(group: Group): Check[] {
    return checks.filter((check) => check.group === group);
  }

  function renderRows(group: Group) {
    return groupChecks(group).map((check) => {
      const result = results[check.id] ?? { status: "idle" as Status, detail: "" };
      return (
        <Box
          key={check.id}
          sx={{ display: "flex", alignItems: "flex-start", gap: 2 }}
        >
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Typography variant="body2">{check.label}</Typography>
            {result.detail ? (
              <Typography variant="caption" color="text.secondary" sx={{ wordBreak: "break-word" }}>
                {result.detail}
              </Typography>
            ) : null}
          </Box>
          <Chip
            size="small"
            label={statusLabel(result.status)}
            color={statusColor(result.status)}
          />
        </Box>
      );
    });
  }

  return (
    <Box>
      <PanelHeader
        title={t.admin.diagnostics}
        refreshLabel={t.admin.refresh}
        action={
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            <Button
              size="small"
              variant="text"
              onClick={() =>
                showToast({
                  title: t.admin.toastTestTitle,
                  body: t.admin.toastTestBody,
                  route: "/admin",
                })
              }
            >
              {t.admin.toastTest}
            </Button>
            <Button
              size="small"
              variant="outlined"
              disabled={enableBusy}
              onClick={() => void enable()}
            >
              {t.admin.pushEnable}
            </Button>
            <Button size="small" variant="contained" disabled={busy} onClick={() => void runAll()}>
              {t.admin.diagRunAll}
            </Button>
          </Box>
        }
      />
      {enableError ? <Alert severity="error" sx={{ mb: 2 }}>{enableError}</Alert> : null}
      {enableNotice ? <Alert severity="success" sx={{ mb: 2 }}>{enableNotice}</Alert> : null}
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        {t.admin.diagLede}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {t.admin.diagHint}
      </Typography>
      <SettingSection title={t.admin.diagGroupNetwork}>
        {renderRows("network")}
      </SettingSection>
      <SettingSection title={t.admin.diagGroupConfig}>
        {renderRows("config")}
      </SettingSection>
      <SettingSection title={t.admin.diagGroupBrowser}>
        {renderRows("browser")}
      </SettingSection>
      <SettingSection title={t.admin.diagGroupPush}>
        {renderRows("push")}
      </SettingSection>
      {!adminPushConfigReady() ? (
        <Typography variant="caption" color="error" sx={{ display: "block", mt: 2 }}>
          {t.admin.pushReasonConfig}
        </Typography>
      ) : null}
    </Box>
  );
}
