import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import AssessmentIcon from "@mui/icons-material/Assessment";
import CreditCardIcon from "@mui/icons-material/CreditCard";
import AssignmentIcon from "@mui/icons-material/Assignment";
import DashboardIcon from "@mui/icons-material/Dashboard";
import BugReportIcon from "@mui/icons-material/BugReport";
import FlagIcon from "@mui/icons-material/Flag";
import GavelIcon from "@mui/icons-material/Gavel";
import HistoryIcon from "@mui/icons-material/History";
import PaymentsIcon from "@mui/icons-material/Payments";
import PeopleIcon from "@mui/icons-material/People";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import SettingsIcon from "@mui/icons-material/Settings";
import ConfirmationNumberIcon from "@mui/icons-material/ConfirmationNumber";
import SupportAgentIcon from "@mui/icons-material/SupportAgent";
import VerifiedUserIcon from "@mui/icons-material/VerifiedUser";
import { adminAppeals, adminDisputes, adminRefunds, adminReports, adminWarrantyClaims } from "../api/admin";
import { fetchPendingProviders } from "../api/providers";
import { adminSupport } from "../api/support";
import { useAuth } from "../context/AuthContext";
import { watchAdminPush } from "../services/adminPush";
import { useStrings } from "../context/LanguageContext";
import AdminLayout, { type AdminGroup } from "./admin/AdminLayout";
import { useAdminToast } from "./admin/AdminToastContext";
import AdminToastProvider from "./admin/AdminToastProvider";
import AdminQueueContext from "./admin/AdminQueueContext";
import AuditAdminPanel from "./admin/AuditAdminPanel";
import ConfigAdminPanel from "./admin/ConfigAdminPanel";
import DashboardPanel from "./admin/DashboardPanel";
import AdminDiagnosticsPanel from "./admin/AdminDiagnosticsPanel";

import FinancialsPanel from "./admin/FinancialsPanel";
import FlagsPanel from "./admin/FlagsPanel";
import PaymentsAdminPanel from "./admin/PaymentsAdminPanel";
import PaymentsAuditPanel from "./admin/PaymentsAuditPanel";
import PayoutsPanel from "./admin/PayoutsPanel";
import RefundsPanel from "./admin/RefundsPanel";


import RequestsPanel from "./admin/RequestsPanel";
import SupportAdminPanel from "./admin/SupportAdminPanel";
import TicketsPanel from "./admin/TicketsPanel";
import CasesPanel from "./admin/CasesPanel";
import AdminBillProvider from "./admin/AdminBillContext";
import AdminGlobalSearch from "./admin/AdminGlobalSearch";
import UsersPanel from "./admin/UsersPanel";
import WarrantyAdminPanel from "./admin/WarrantyAdminPanel";

type SectionId =
  | "dashboard"
  | "users"
  | "flags"
  | "requests"
  | "tickets"
  | "cases"
  | "reports"
  | "appeals"
  | "payouts"
  | "payments"
  | "disputes"
  | "refunds"
  | "financials"
  | "support"
  | "warranty"
  | "config"
  | "diagnostics"
  | "audit"
  | "paymentsAudit";

function AdminShell() {
  const { t } = useStrings();
  const { token } = useAuth();
  const { showToast } = useAdminToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const section = (searchParams.get("section") as SectionId | null) ?? "dashboard";
  const caseKind = searchParams.get("kind") ?? "ALL";
  const selectSection = useCallback((next: string, kind?: string) => {
    const params = new URLSearchParams(searchParams);
    params.set("section", next);
    if (kind) params.set("kind", kind);
    else params.delete("kind");
    setSearchParams(params, { replace: true });
  }, [searchParams, setSearchParams]);
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    let dispose: (() => void) | null = null;
    let alive = true;
    void watchAdminPush((message) => {
      showToast({
        title: message.title,
        body: message.body,
        route: message.route,
      });
    }).then((unsubscribe) => {
      if (alive) dispose = unsubscribe;
      else unsubscribe();
    });
    return () => {
      alive = false;
      dispose?.();
    };
  }, [showToast]);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const handler = (event: MessageEvent) => {
      const data = event.data as
        | {
            type?: string;
            payload?: { title?: string; body?: string; route?: string };
          }
        | undefined;
      if (data?.type !== "roadassist-admin-push" || !data.payload) return;
      showToast({
        title: data.payload.title ?? "RoadAssist admin",
        body: data.payload.body,
        route: data.payload.route,
      });
    };
    navigator.serviceWorker.addEventListener("message", handler);
    return () => {
      navigator.serviceWorker.removeEventListener("message", handler);
    };
  }, [showToast]);

  const refreshCounts = useCallback(() => {
    if (!token) return;
    void Promise.all([
      fetchPendingProviders(token)
        .then((rows) => ({ key: "requests", value: rows.length }))
        .catch(() => ({ key: "requests", value: 0 })),
      adminReports(token, undefined, "OPEN")
        .then((result) => ({ key: "reports", value: result.reports.length }))
        .catch(() => ({ key: "reports", value: 0 })),
      adminAppeals(token, undefined, "OPEN")
        .then((rows) => ({ key: "appeals", value: rows.length }))
        .catch(() => ({ key: "appeals", value: 0 })),
      adminDisputes(token)
        .then((rows) => ({
          key: "disputes",
          value: rows.filter((row) => row.status === "OPEN").length,
        }))
        .catch(() => ({ key: "disputes", value: 0 })),
      adminRefunds(token, "REQUESTED")
        .then((rows) => ({ key: "refunds", value: rows.length }))
        .catch(() => ({ key: "refunds", value: 0 })),
      adminSupport(token, "OPEN")
        .then((result) => ({ key: "support", value: result.tickets.length }))
        .catch(() => ({ key: "support", value: 0 })),
      adminWarrantyClaims(token, "OPEN")
        .then((rows) => ({
          key: "warranty",
          value: rows.filter((row) => row.status === "OPEN").length,
        }))
        .catch(() => ({ key: "warranty", value: 0 })),
    ]).then((entries) => {
      setCounts(Object.fromEntries(entries.map((entry) => [entry.key, entry.value])));
    });
  }, [token]);

  useEffect(() => {
    refreshCounts();
  }, [refreshCounts]);

  const groups: AdminGroup[] = [
    {
      label: t.admin.groupOperations,
      items: [
        { id: "dashboard", label: t.admin.dashboard, icon: <DashboardIcon fontSize="small" /> },
        { id: "users", label: t.admin.users, icon: <PeopleIcon fontSize="small" /> },
        { id: "flags", label: t.admin.flags, icon: <FlagIcon fontSize="small" /> },
        { id: "requests", label: t.admin.requests, icon: <AssignmentIcon fontSize="small" /> },
        { id: "tickets", label: t.admin.tickets, icon: <ConfirmationNumberIcon fontSize="small" /> },
        { id: "cases", label: t.admin.cases, icon: <GavelIcon fontSize="small" /> },
      ],
    },
    {
      label: t.admin.groupMoney,
      items: [
        { id: "payouts", label: t.admin.payouts, icon: <PaymentsIcon fontSize="small" /> },
        { id: "payments", label: t.admin.payments, icon: <CreditCardIcon fontSize="small" /> },

        { id: "refunds", label: t.admin.refundsQueue, icon: <ReceiptLongIcon fontSize="small" /> },
        { id: "financials", label: t.admin.financials, icon: <AssessmentIcon fontSize="small" /> },
      ],
    },
    {
      label: t.admin.groupContent,
      items: [
        { id: "support", label: t.admin.support, icon: <SupportAgentIcon fontSize="small" /> },
        { id: "warranty", label: t.admin.warranty, icon: <VerifiedUserIcon fontSize="small" /> },
      ],
    },
    {
      label: t.admin.groupSystem,
      items: [
        { id: "config", label: t.admin.config, icon: <SettingsIcon fontSize="small" /> },
        { id: "diagnostics", label: t.admin.diagnostics, icon: <BugReportIcon fontSize="small" /> },
        { id: "audit", label: t.admin.audit, icon: <HistoryIcon fontSize="small" /> },
        { id: "paymentsAudit", label: t.admin.paymentsAudit, icon: <ReceiptLongIcon fontSize="small" /> },
      ],
    },
  ];

  return (
    <AdminQueueContext.Provider value={{ counts, refresh: refreshCounts }}>
      <AdminBillProvider token={token}>
        <AdminLayout
          title={t.admin.title}
          groups={groups}
          active={section}
          badges={counts}
          onSelect={(id) => selectSection(id)}
        >
          <AdminGlobalSearch token={token} onOpenSection={selectSection} />
        {section === "dashboard" ? (
          <DashboardPanel token={token} onOpenSection={selectSection} />
        ) : null}
        {section === "users" ? <UsersPanel token={token} /> : null}
        {section === "flags" ? <FlagsPanel token={token} /> : null}
        {section === "requests" ? <RequestsPanel token={token} /> : null}
        {section === "tickets" ? <TicketsPanel token={token} /> : null}
        {section === "cases" ? <CasesPanel token={token} initialKind={caseKind} /> : null}
        {section === "reports" ? <CasesPanel token={token} initialKind="REPORT" /> : null}
        {section === "appeals" ? <CasesPanel token={token} initialKind="APPEAL" /> : null}
        {section === "payouts" ? <PayoutsPanel token={token} /> : null}
        {section === "payments" ? <PaymentsAdminPanel token={token} /> : null}
        {section === "disputes" ? <CasesPanel token={token} initialKind="DISPUTE" /> : null}
        {section === "refunds" ? <RefundsPanel token={token} /> : null}
        {section === "financials" ? <FinancialsPanel token={token} /> : null}
        {section === "support" ? <SupportAdminPanel token={token} /> : null}
        {section === "warranty" ? <WarrantyAdminPanel token={token} /> : null}
        {section === "config" ? <ConfigAdminPanel token={token} /> : null}
        {section === "diagnostics" ? <AdminDiagnosticsPanel /> : null}
        {section === "audit" ? <AuditAdminPanel token={token} /> : null}
          {section === "paymentsAudit" ? <PaymentsAuditPanel token={token} /> : null}
        </AdminLayout>
      </AdminBillProvider>
    </AdminQueueContext.Provider>
  );
}

export default function AdminScreen() {
  return (
    <AdminToastProvider>
      <AdminShell />
    </AdminToastProvider>
  );
}
