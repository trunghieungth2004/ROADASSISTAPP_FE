import { useEffect, useMemo, useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { toMessage } from "../../api/client";
import { adminAudit, type AdminAuditRow } from "../../api/admin";
import { useStrings } from "../../context/LanguageContext";
import DateField from "../../components/DateField";
import { formatDateTimeDMY } from "../../utils/date";
import EmptyState from "./EmptyState";
import PanelHeader from "./PanelHeader";
import { ago } from "./format";

const PAGE_SIZE = 100;

function csvCell(value: unknown): string {
  const text = typeof value === "string" ? value : JSON.stringify(value ?? "");
  return `"${text.replaceAll("\"", "\"\"")}"`;
}

function downloadCsv(rows: AdminAuditRow[]): void {
  const header = [
    "createdAt",
    "action",
    "category",
    "actor",
    "actorEmail",
    "targetType",
    "targetId",
    "targetLabel",
    "note",
    "before",
    "after",
    "requestId",
  ];
  const body = rows.map((row) => [
    row.createdAt,
    row.action,
    row.category ?? "",
    row.actorName ?? row.adminUid,
    row.actorEmail ?? "",
    row.targetType,
    row.targetId ?? "",
    row.targetLabel ?? "",
    row.note ?? "",
    row.before ?? null,
    row.after ?? null,
    row.requestId ?? "",
  ].map(csvCell).join(","));
  const blob = new Blob([[header.join(","), ...body].join("\n")], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `admin-audit-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function sectionForTarget(targetType: string): string | null {
  const type = targetType.toUpperCase();
  if (type === "USER") return "users";
  if (type.includes("PROVIDER")) return "providers";
  if (["REPORT", "DISPUTE", "APPEAL"].includes(type)) return "cases";
  if (type === "REFUND") return "refunds";
  if (type.startsWith("PAYOUT") || type === "COMMISSION") return "payouts";
  if (type === "WARRANTY") return "warranty";
  if (type === "SUPPORT") return "support";
  if (type === "FLAG") return "flags";
  if (type === "PLATFORM_CONFIG") return "config";
  return null;
}

export default function AuditAdminPanel({
  token,
  onOpenSection,
}: {
  token: string | null;
  onOpenSection?: (section: string) => void;
}) {
  const { t } = useStrings();
  const [rows, setRows] = useState<AdminAuditRow[]>([]);
  const [query, setQuery] = useState("");
  const [action, setAction] = useState("ALL");
  const [category, setCategory] = useState("ALL");
  const [targetType, setTargetType] = useState("ALL");
  const [actor, setActor] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [selected, setSelected] = useState<AdminAuditRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load(reset: boolean): Promise<void> {
    if (!token || loading) return;
    setLoading(true);
    try {
      const before = reset || rows.length === 0 ?
        undefined :
        rows[rows.length - 1]?.createdAt;
      const next = await adminAudit(token, {
        limit: PAGE_SIZE,
        ...(before ? { before } : {}),
        ...(from ? { from: `${from}T00:00:00.000Z` } : {}),
        ...(to ? { to: `${to}T23:59:59.999Z` } : {}),
      });
      setRows((prev) => {
        if (reset) return next;
        const existing = new Set(prev.map((row) => row.id));
        return [...prev, ...next.filter((row) => !existing.has(row.id))];
      });
      setHasMore(next.length === PAGE_SIZE);
      setError(null);
    } catch (err) {
      setError(toMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load(true);
  }, [token, from, to]);

  const actions = useMemo(
    () => [...new Set(rows.map((row) => row.action))].sort(),
    [rows],
  );
  const categories = useMemo(
    () => [...new Set(rows.map((row) => row.category ?? "SYSTEM"))].sort(),
    [rows],
  );
  const targetTypes = useMemo(
    () => [...new Set(rows.map((row) => row.targetType))].sort(),
    [rows],
  );

  const visible = rows.filter((row) => {
    if (action !== "ALL" && row.action !== action) return false;
    if (category !== "ALL" && (row.category ?? "SYSTEM") !== category) return false;
    if (targetType !== "ALL" && row.targetType !== targetType) return false;
    const actorText = `${row.actorName ?? ""} ${row.actorEmail ?? ""} ${row.adminUid}`.toLowerCase();
    if (actor.trim() !== "" && !actorText.includes(actor.trim().toLowerCase())) {
      return false;
    }
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return [
      row.action,
      row.category ?? "",
      row.targetType,
      row.targetId ?? "",
      row.targetLabel ?? "",
      row.adminUid,
      row.actorName ?? "",
      row.actorEmail ?? "",
      row.note ?? "",
      JSON.stringify(row.before ?? {}),
      JSON.stringify(row.after ?? {}),
      JSON.stringify(row.meta ?? {}),
    ].some((value) => value.toLowerCase().includes(q));
  });

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
      <PanelHeader
        title={t.admin.audit}
        onRefresh={() => void load(true)}
        refreshLabel={t.admin.refresh}
        action={
          <Button size="small" variant="outlined" disabled={visible.length === 0} onClick={() => downloadCsv(visible)}>
            {t.admin.auditExport}
          </Button>
        }
      />
      <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
        <TextField
          size="small"
          label={t.admin.auditSearch}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          sx={{ flexGrow: 1, minWidth: 220 }}
        />
        <TextField
          size="small"
          label={t.admin.auditActor}
          value={actor}
          onChange={(e) => setActor(e.target.value)}
          sx={{ minWidth: 180 }}
        />
        <TextField
          select
          size="small"
          label={t.admin.filterAction}
          value={action}
          onChange={(e) => setAction(e.target.value)}
          sx={{ minWidth: 200 }}
        >
          <MenuItem value="ALL">{t.admin.allActions}</MenuItem>
          {actions.map((value) => (
            <MenuItem key={value} value={value}>{value}</MenuItem>
          ))}
        </TextField>
        <TextField
          select
          size="small"
          label={t.admin.auditCategory}
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          sx={{ minWidth: 150 }}
        >
          <MenuItem value="ALL">{t.admin.allCategories}</MenuItem>
          {categories.map((value) => (
            <MenuItem key={value} value={value}>{value}</MenuItem>
          ))}
        </TextField>
        <TextField
          select
          size="small"
          label={t.admin.filterTarget}
          value={targetType}
          onChange={(e) => setTargetType(e.target.value)}
          sx={{ minWidth: 180 }}
        >
          <MenuItem value="ALL">{t.admin.allTargets}</MenuItem>
          {targetTypes.map((value) => (
            <MenuItem key={value} value={value}>{value}</MenuItem>
          ))}
        </TextField>
        <DateField
          label={t.admin.auditFrom}
          value={from}
          onChange={setFrom}
        />
        <DateField
          label={t.admin.auditTo}
          value={to}
          onChange={setTo}
        />
      </Box>
      {error ? <Alert severity="error">{error}</Alert> : null}
      {visible.length === 0 ? <EmptyState message={t.admin.auditNone} /> : null}
      {visible.map((row) => (
        <Card key={row.id} variant="outlined">
          <CardContent sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
            <Box sx={{ display: "flex", alignItems: "baseline", gap: 1, flexWrap: "wrap" }}>
              <Typography variant="subtitle2" sx={{ flexGrow: 1 }}>
                {row.action}
              </Typography>
              <Chip size="small" label={row.category ?? "SYSTEM"} variant="outlined" />
              <Typography variant="caption" color="text.secondary">
                {ago(row.createdAt, t)}
              </Typography>
            </Box>
            <Typography variant="caption" color="text.secondary">
              {`${formatDateTimeDMY(row.createdAt)} · ${row.actorName ?? row.actorEmail ?? row.adminUid} · ${row.targetType}${row.targetId ? ` · ${row.targetId}` : ""}`}
            </Typography>
            {row.targetLabel ? <Typography variant="body2">{row.targetLabel}</Typography> : null}
            {row.note ? <Typography variant="caption" color="text.secondary">{row.note}</Typography> : null}
            <Box sx={{ display: "flex", gap: 1, mt: 0.5 }}>
              <Button size="small" onClick={() => setSelected(row)}>{t.admin.auditDetails}</Button>
              {onOpenSection && sectionForTarget(row.targetType) ? (
                <Button
                  size="small"
                  onClick={() => onOpenSection(sectionForTarget(row.targetType) as string)}
                >
                  {t.admin.auditOpenTarget}
                </Button>
              ) : null}
            </Box>
          </CardContent>
        </Card>
      ))}
      {hasMore ? (
        <Button variant="outlined" disabled={loading} onClick={() => void load(false)}>
          {t.admin.auditLoadMore}
        </Button>
      ) : null}
      <Dialog open={selected !== null} onClose={() => setSelected(null)} fullWidth maxWidth="md">
        <DialogTitle>{selected?.action ?? ""}</DialogTitle>
        <DialogContent dividers sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          {selected ? (
            <>
              <Typography variant="body2">{`${formatDateTimeDMY(selected.createdAt)} · ${selected.actorName ?? selected.actorEmail ?? selected.adminUid}`}</Typography>
              <Typography variant="body2">{`${selected.targetType}${selected.targetId ? ` · ${selected.targetId}` : ""}${selected.targetLabel ? ` · ${selected.targetLabel}` : ""}`}</Typography>
              {selected.note ? <Typography variant="body2">{selected.note}</Typography> : null}
              <Typography variant="subtitle2">{t.admin.auditBefore}</Typography>
              <Box component="pre" sx={{ m: 0, p: 1, bgcolor: "action.hover", borderRadius: 1, overflow: "auto", fontSize: 12 }}>
                {JSON.stringify(selected.before ?? {}, null, 2)}
              </Box>
              <Typography variant="subtitle2">{t.admin.auditAfter}</Typography>
              <Box component="pre" sx={{ m: 0, p: 1, bgcolor: "action.hover", borderRadius: 1, overflow: "auto", fontSize: 12 }}>
                {JSON.stringify(selected.after ?? {}, null, 2)}
              </Box>
              <Typography variant="subtitle2">{t.admin.auditMeta}</Typography>
              <Box component="pre" sx={{ m: 0, p: 1, bgcolor: "action.hover", borderRadius: 1, overflow: "auto", fontSize: 12 }}>
                {JSON.stringify(selected.meta ?? {}, null, 2)}
              </Box>
              {selected.requestId ? <Typography variant="caption" color="text.secondary">{`Request: ${selected.requestId}`}</Typography> : null}
            </>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelected(null)}>{t.common.close}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
