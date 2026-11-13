import { useEffect, useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { toMessage } from "../../api/client";
import {
  adminAudit,
  adminDashboard,
  adminOps,
  adminProviderStats,
  type AdminAuditRow,
  type AdminDashboard,
  type AdminOps,
  type AdminProviderStats,
} from "../../api/admin";
import {
  adminPushEnabled,
  disableAdminPush,
  enableAdminPush,
} from "../../services/adminPush";
import { useStrings } from "../../context/LanguageContext";
import PanelHeader from "./PanelHeader";
import { useAdminQueue } from "./AdminQueueContext";
import { ago, money } from "./format";
import { BarChart, BarList, LineChart } from "./DashboardCharts";

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <Card variant="outlined">
      <CardContent sx={{ py: 1 }}>
        <Typography variant="caption" color="text.secondary">
          {label}
        </Typography>
        <Typography variant="subtitle1">{value}</Typography>
      </CardContent>
    </Card>
  );
}

export default function DashboardPanel({
  token,
  onOpenSection,
}: {
  token: string | null;
  onOpenSection: (section: string, kind?: string) => void;
}) {
  const { t } = useStrings();
  const queue = useAdminQueue();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [dash, setDash] = useState<AdminDashboard | null>(null);
  const [audit, setAudit] = useState<AdminAuditRow[]>([]);
  const [dashDays, setDashDays] = useState(30);
  const [ops, setOps] = useState<AdminOps | null>(null);
  const [providerLookup, setProviderLookup] = useState("");
  const [providerStats, setProviderStats] = useState<AdminProviderStats | null>(null);
  const [providerBusy, setProviderBusy] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(adminPushEnabled());

  async function load(key: string, days: number) {
    setError(null);
    try {
      const [overview, health, recent] = await Promise.all([
        adminDashboard(key, days),
        adminOps(key),
        adminAudit(key, 8),
      ]);
      setDash(overview);
      setOps(health);
      setAudit(recent);
    } catch (err) {
      setError(toMessage(err));
    }
  }

  useEffect(() => {
    if (token) void load(token, dashDays);
  }, [token]);

  async function lookupProvider(): Promise<void> {
    if (!token || providerLookup.trim() === "" || providerBusy) return;
    setProviderBusy(true);
    setError(null);
    try {
      setProviderStats(await adminProviderStats(token, providerLookup.trim()));
    } catch (err) {
      setProviderStats(null);
      setError(toMessage(err));
    } finally {
      setProviderBusy(false);
    }
  }

  function pushReasonMessage(reason?: string): string {
    if (reason === "CONFIG_MISSING") return t.admin.pushReasonConfig;
    if (reason === "UNSUPPORTED") return t.admin.pushReasonUnsupported;
    if (reason === "PERMISSION_DENIED") return t.admin.pushReasonDenied;
    if (reason === "NO_TOKEN") return t.admin.pushReasonNoToken;
    return t.admin.pushReasonUnknown;
  }

  async function toggleAdminPush(): Promise<void> {
    if (!token || pushBusy) return;
    setPushBusy(true);
    setError(null);
    try {
      if (pushEnabled) {
        await disableAdminPush(token);
        setPushEnabled(false);
        setNotice(t.admin.pushDisabled);
      } else {
        const result = await enableAdminPush(token);
        if (!result.enabled) {
          setError(pushReasonMessage(result.reason));
          return;
        }
        setPushEnabled(true);
        setNotice(t.admin.pushEnabled);
      }
    } catch (err) {
      setError(toMessage(err));
    } finally {
      setPushBusy(false);
    }
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <PanelHeader
        title={t.admin.dashboard}
        refreshLabel={t.admin.refresh}
        onRefresh={() => {
          if (token) {
            void load(token, dashDays);
            queue.refresh();
          }
        }}
      />
      {error ? <Alert severity="error">{error}</Alert> : null}
      {notice ? <Alert severity="success">{notice}</Alert> : null}
      <Card>
        <CardContent sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          <Typography variant="subtitle2">{t.admin.pushTitle}</Typography>
          <Typography variant="body2" color="text.secondary">
            {t.admin.pushBody}
          </Typography>
          <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
            <Button
              size="small"
              variant={pushEnabled ? "outlined" : "contained"}
              disabled={pushBusy}
              onClick={() => void toggleAdminPush()}
            >
              {pushEnabled ? t.admin.pushDisable : t.admin.pushEnable}
            </Button>
            {pushEnabled ? (
              <Chip size="small" color="success" label={t.admin.pushActive} />
            ) : null}
          </Box>
        </CardContent>
      </Card>
      <Box sx={{ display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap" }}>
        <Typography variant="body2" color="text.secondary">
          {t.admin.window}
        </Typography>
        <Button
          size="small"
          variant={dashDays === 30 ? "contained" : "outlined"}
          onClick={() => {
            setDashDays(30);
            if (token) void load(token, 30);
          }}
        >
          {t.admin.days30}
        </Button>
        <Button
          size="small"
          variant={dashDays === 90 ? "contained" : "outlined"}
          onClick={() => {
            setDashDays(90);
            if (token) void load(token, 90);
          }}
        >
          {t.admin.days90}
        </Button>
        <Button size="small" onClick={() => token && void load(token, dashDays)}>
          {t.admin.refresh}
        </Button>
      </Box>
      <Box>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>{t.admin.queues}</Typography>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
            gap: 1,
          }}
        >
          {[
            { id: "requests", label: t.admin.requests, countKey: "requests" },
            { id: "cases", kind: "REPORT", label: t.admin.reports, countKey: "reports" },
            { id: "cases", kind: "DISPUTE", label: t.admin.disputes, countKey: "disputes" },
            { id: "cases", kind: "APPEAL", label: t.admin.appeals, countKey: "appeals" },
            { id: "refunds", label: t.admin.refundsQueue, countKey: "refunds" },
            { id: "support", label: t.admin.support, countKey: "support" },
            { id: "warranty", label: t.admin.warranty, countKey: "warranty" },
          ].map((item) => (
            <Card
              key={`${item.id}-${item.kind ?? ""}`}
              sx={{ cursor: "pointer", "&:hover": { borderColor: "primary.main" } }}
              onClick={() => onOpenSection(item.id, item.kind)}
            >
              <CardContent sx={{ py: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  {item.label}
                </Typography>
                <Typography variant="h5">{queue.counts[item.countKey] ?? 0}</Typography>
              </CardContent>
            </Card>
          ))}
        </Box>
      </Box>
      {ops ? (
        <Card variant="outlined">
          <CardContent sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
            <Typography variant="subtitle2">{t.admin.ops}</Typography>
            <Typography variant="body2">{`${t.admin.stuckPayments}: ${ops.payments.stuckPending} (${ops.payments.stuckAmount.toLocaleString()} ₫)`}</Typography>
            <Typography variant="body2">{`${t.admin.refundBacklog}: ${ops.refunds.requested + ops.refunds.approved + ops.refunds.sent} (${ops.refunds.openAmount.toLocaleString()} ₫)`}</Typography>
            <Typography variant="body2">{`${t.admin.expiredQuotes}: ${ops.quotes.expiredNotSwept} · ${t.admin.pendingWalkIns}: ${ops.walkIns.pending}`}</Typography>
            <Typography variant="body2">{`${t.admin.commissionOwed}: ${ops.commission.owedTotal.toLocaleString()} ₫`}</Typography>
          </CardContent>
        </Card>
      ) : null}
      <Box sx={{ display: "flex", gap: 1 }}>
        <TextField
          size="small"
          label={t.admin.providerLookup}
          value={providerLookup}
          onChange={(e) => setProviderLookup(e.target.value)}
          fullWidth
        />
        <Button variant="outlined" disabled={providerBusy} onClick={() => void lookupProvider()}>
          {t.admin.providerStats}
        </Button>
      </Box>
      {providerStats ? (
        <Card variant="outlined">
          <CardContent sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
            <Typography variant="subtitle2">{providerStats.provider.name}</Typography>
            <Typography variant="body2">{`${providerStats.provider.kind} · ${providerStats.provider.status} · ★ ${providerStats.provider.ratingAvg.toFixed(1)} (${providerStats.provider.ratingCount})`}</Typography>
            <Typography variant="body2">{`${providerStats.completedJobs} jobs · ${providerStats.payouts.batches} payouts · ${providerStats.payouts.net.toLocaleString()} ₫ net`}</Typography>
            <Typography variant="body2">{`${t.admin.commissionOwed}: ${providerStats.payouts.commissionOwed.toLocaleString()} ₫`}</Typography>
          </CardContent>
        </Card>
      ) : null}
      {audit.length > 0 ? (
        <Card>
          <CardContent sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography variant="subtitle2" sx={{ flexGrow: 1 }}>
                {t.admin.recentActivity}
              </Typography>
              <Button size="small" onClick={() => onOpenSection("audit")}>
                {t.admin.viewAll}
              </Button>
            </Box>
            {audit.map((row) => (
              <Box key={row.id} sx={{ display: "flex", gap: 1, alignItems: "baseline" }}>
                <Typography variant="body2" sx={{ flexGrow: 1 }}>
                  {row.action}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {`${row.targetType}${row.targetId ? ` · ${row.targetId.slice(0, 8)}` : ""} · ${ago(row.createdAt, t)}`}
                </Typography>
              </Box>
            ))}
          </CardContent>
        </Card>
      ) : null}
      {dash ? (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
            gap: 1,
          }}
        >
          <Stat label={t.admin.totalUsers} value={dash.users.total} />
          <Stat label={t.admin.activeUsers} value={dash.users.active} />
          <Stat label={t.admin.totalProviders} value={dash.providers.total} />
          <Stat label={t.admin.activeTickets} value={dash.tickets.active} />
          <Stat label={t.admin.matchRate} value={`${Math.round(dash.tickets.matchRate * 100)}%`} />
          <Stat label={t.admin.avgAccept} value={dash.tickets.avgAcceptMinutes === null ? "—" : dash.tickets.avgAcceptMinutes.toFixed(0)} />
          <Stat label={t.admin.gross} value={`${dash.money.gross.toLocaleString()} ₫`} />
          <Stat label={t.admin.platformRevenue} value={`${dash.money.commission.toLocaleString()} ₫`} />
          <Stat label={t.admin.net} value={`${dash.money.net.toLocaleString()} ₫`} />
          <Stat label={t.admin.commissionOwed} value={`${dash.money.commissionOwed.toLocaleString()} ₫`} />
          <Stat label={t.admin.pendingPayouts} value={`${dash.money.payoutsNet.toLocaleString()} ₫`} />
          <Stat label={t.admin.flags} value={dash.flags.total} />
        </Box>
      ) : null}
      {dash?.series ? (
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" }, gap: 2 }}>
          <LineChart
            title={t.admin.revenueTrend}
            data={dash.series.daily.map((row) => ({
              date: row.date,
              values: {gross: row.gross, commission: row.commission, net: row.net},
            }))}
            series={[
              {key: "gross", label: t.admin.gross, color: "#0284c7"},
              {key: "commission", label: t.admin.platformRevenue, color: "#15803d"},
              {key: "net", label: t.admin.net, color: "#b45309"},
            ]}
            format={money}
          />
          <LineChart
            title={t.admin.growth}
            data={dash.series.daily.map((row) => ({
              date: row.date,
              values: {users: row.users, providers: row.providers},
            }))}
            series={[
              {key: "users", label: t.admin.users, color: "#0284c7"},
              {key: "providers", label: t.admin.totalProviders, color: "#b45309"},
            ]}
            format={(value) => String(Math.round(value))}
          />
          <BarChart
            title={t.admin.ticketVolume}
            data={dash.series.daily.map((row) => ({
              label: row.date.slice(5),
              values: {tickets: row.tickets, cases: row.cases},
            }))}
            series={[
              {key: "tickets", label: t.admin.activeTickets, color: "#0284c7"},
              {key: "cases", label: t.admin.cases, color: "#b45309"},
            ]}
          />
          <BarChart
            title={t.admin.caseVolume}
            data={dash.series.cases.map((row) => ({
              label: row.date.slice(5),
              values: {reports: row.reports, disputes: row.disputes, appeals: row.appeals},
            }))}
            series={[
              {key: "reports", label: t.admin.reports, color: "#0284c7"},
              {key: "disputes", label: t.admin.disputes, color: "#b45309"},
              {key: "appeals", label: t.admin.appeals, color: "#15803d"},
            ]}
          />
          <LineChart
            title={t.admin.slaTrend}
            data={dash.series.sla.map((row) => ({
              date: row.date,
              values: {
                matchRate: Math.round(row.matchRate * 100),
                accept: row.avgAcceptMinutes,
              },
            }))}
            series={[
              {key: "matchRate", label: t.admin.matchRate, color: "#0284c7"},
              {key: "accept", label: t.admin.avgAccept, color: "#b45309"},
            ]}
            format={(value) => String(Math.round(value))}
          />
          <BarList
            title={t.admin.paymentStatusSplit}
            data={Object.entries(dash.series.paymentsByStatus).map(([label, value]) => ({
              label,
              value,
            }))}
            format={(value) => String(value)}
          />
          <BarList
            title={t.admin.topProviders}
            data={dash.series.topProviders.map((provider) => ({
              label: provider.name,
              value: provider.gross,
            }))}
            format={money}
          />
        </Box>
      ) : null}
    </Box>
  );
}
