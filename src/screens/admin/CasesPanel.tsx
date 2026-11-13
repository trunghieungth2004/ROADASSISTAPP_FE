import { useEffect, useMemo, useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { toMessage } from "../../api/client";
import {
  adminAppeals,
  adminDisputes,
  adminReports,
  type AdminAppeal,
  type AdminDispute,
  type AdminReport,
} from "../../api/admin";
import { useStrings } from "../../context/LanguageContext";
import AdminListItem from "./AdminListItem";
import EmptyState from "./EmptyState";
import PanelHeader from "./PanelHeader";
import AppealCaseDialog from "./AppealCaseDialog";
import DisputeCaseDialog from "./DisputeCaseDialog";
import ReportCaseDialog from "./ReportCaseDialog";
import { ago } from "./format";
import {
  adminStatusLabel,
  adminStatusTone,
  appealSubjectLabel,
  disputeOutcomeLabel,
  humanizeEnum,
  reportActionLabel,
} from "./adminLabels";

type CaseRow =
  | { kind: "REPORT"; id: string; status: string; label: string; createdAt: string; report: AdminReport }
  | { kind: "DISPUTE"; id: string; status: string; label: string; createdAt: string; dispute: AdminDispute }
  | { kind: "APPEAL"; id: string; status: string; label: string; createdAt: string; appeal: AdminAppeal };

export default function CasesPanel({
  token,
  initialKind = "ALL",
}: {
  token: string | null;
  initialKind?: string;
}) {
  const { t } = useStrings();
  const [rows, setRows] = useState<CaseRow[]>([]);
  const [kind, setKind] = useState(initialKind);
  const [status, setStatus] = useState("OPEN");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<CaseRow | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load(key: string) {
    setError(null);
    try {
      const [reports, disputes, appeals] = await Promise.all([
        adminReports(key, undefined, status === "ALL" ? undefined : status),
        adminDisputes(key),
        adminAppeals(key, undefined, status === "ALL" ? undefined : status),
      ]);
      const next: CaseRow[] = [
        ...reports.reports.map((report) => ({
          kind: "REPORT" as const,
          id: report.id,
          status: report.status,
          label: `${report.targetName ?? report.targetId} · ${humanizeEnum(report.reason)} · ${reportActionLabel(report.action, t)}`,
          createdAt: report.createdAt,
          report,
        })),
        ...disputes
          .filter((dispute) => status === "ALL" || dispute.status === status)
          .map((dispute) => ({
            kind: "DISPUTE" as const,
            id: dispute.id,
            status: dispute.status,
            label: `${humanizeEnum(dispute.type)} · ${dispute.outcome ? disputeOutcomeLabel(dispute.outcome, t) : ""} · ${dispute.ticketId}`,
            createdAt: dispute.createdAt,
            dispute,
          })),
        ...appeals.map((appeal) => ({
          kind: "APPEAL" as const,
          id: appeal.id,
          status: appeal.status,
          label: `${appealSubjectLabel(appeal.subjectKind, t)} · ${appeal.appellantName} · ${humanizeEnum(appeal.reason)}`,
          createdAt: appeal.createdAt,
          appeal,
        })),
      ];
      setRows(next.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
    } catch (err) {
      setError(toMessage(err));
    }
  }

  useEffect(() => {
    setKind(initialKind);
  }, [initialKind]);

  useEffect(() => {
    if (token) void load(token);
  }, [token, kind, status]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (kind !== "ALL" && row.kind !== kind) return false;
      if (q === "") return true;
      return row.label.toLowerCase().includes(q) || row.id.toLowerCase().includes(q);
    });
  }, [rows, kind, query]);

  return (
    <Box>
      <PanelHeader
        title={t.admin.cases}
        onRefresh={() => token && void load(token)}
        refreshLabel={t.admin.refresh}
      />
      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
      <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 2 }}>
        <TextField
          size="small"
          label={t.admin.search}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          sx={{ flexGrow: 1, minWidth: 220 }}
        />
        <TextField select size="small" label={t.admin.appealSubjectType} value={kind} onChange={(event) => setKind(event.target.value)} sx={{ minWidth: 150 }}>
          <MenuItem value="ALL">{t.admin.all}</MenuItem>
          <MenuItem value="REPORT">{t.admin.report}</MenuItem>
          <MenuItem value="DISPUTE">{t.admin.dispute}</MenuItem>
          <MenuItem value="APPEAL">{t.admin.appeal}</MenuItem>
        </TextField>
        <TextField select size="small" label={t.admin.status} value={status} onChange={(event) => setStatus(event.target.value)} sx={{ minWidth: 150 }}>
          <MenuItem value="ALL">{t.admin.allStatuses}</MenuItem>
          <MenuItem value="OPEN">{adminStatusLabel("OPEN", t)}</MenuItem>
          <MenuItem value="RESOLVED">{adminStatusLabel("RESOLVED", t)}</MenuItem>
          <MenuItem value="DISMISSED">{adminStatusLabel("DISMISSED", t)}</MenuItem>
        </TextField>
      </Box>
      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
        {`${visible.length} ${t.admin.cases}`}
      </Typography>
      {visible.length === 0 ? (
        <EmptyState message={t.admin.noCases} />
      ) : (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          {visible.map((row) => (
            <AdminListItem
              key={`${row.kind}-${row.id}`}
              selected={false}
              onClick={() => setSelected(row)}
              title={row.label}
              subtitle={`${humanizeEnum(row.kind)} · ${ago(row.createdAt, t)}`}
              chip={adminStatusLabel(row.status, t)}
              chipColor={adminStatusTone(row.status)}
            />
          ))}
        </Box>
      )}
      {selected?.kind === "REPORT" ? (
        <ReportCaseDialog
          token={token}
          report={selected.report}
          onClose={() => setSelected(null)}
          onDecided={() => {
            setSelected(null);
            if (token) void load(token);
          }}
        />
      ) : null}
      {selected?.kind === "DISPUTE" ? (
        <DisputeCaseDialog
          token={token}
          dispute={selected.dispute}
          onClose={() => setSelected(null)}
          onDecided={() => {
            setSelected(null);
            if (token) void load(token);
          }}
        />
      ) : null}
      {selected?.kind === "APPEAL" ? (
        <AppealCaseDialog
          token={token}
          appeal={selected.appeal}
          onClose={() => setSelected(null)}
          onDecided={() => {
            setSelected(null);
            if (token) void load(token);
          }}
        />
      ) : null}
    </Box>
  );
}
