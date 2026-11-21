import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Accordion from "@mui/material/Accordion";
import AccordionDetails from "@mui/material/AccordionDetails";
import AccordionSummary from "@mui/material/AccordionSummary";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { toMessage } from "../../api/client";
import {
  adminAudit,
  adminDashboard,
  adminDashboardDay,
  adminOps,
  adminProviderStats,
  type AdminAuditRow,
  type AdminDashboard,
  type AdminDashboardDay,
  type AdminDashboardRange,
  type AdminOps,
  type AdminProviderStats,
} from "../../api/admin";
import {
  adminPushEnabled,
  disableAdminPush,
  enableAdminPush,
} from "../../services/adminPush";
import { useStrings } from "../../context/LanguageContext";
import DateField from "../../components/DateField";
import { formatDateDMY, formatDateTimeDMY, formatDayMonth } from "../../utils/date";
import { serviceColor } from "../../utils/serviceColors";
import { humanizeEnum } from "./adminLabels";
import PanelHeader from "./PanelHeader";
import { useAdminQueue } from "./AdminQueueContext";
import { ago, money } from "./format";
import { BarChart, BarList, LineChart, Sparkline } from "./DashboardCharts";
import DayDetailDialog, { type DayDetailTab } from "./DayDetailDialog";

type TabKey =
  | "overview"
  | "demand"
  | "supply"
  | "money"
  | "bookings"
  | "trust";

const TABS: TabKey[] = [
  "overview",
  "demand",
  "supply",
  "money",
  "bookings",
  "trust",
];

function dayKey(offsetDays = 0): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

function daysBetween(startDate: string, endDate: string): number {
  const start = Date.parse(`${startDate}T00:00:00.000Z`);
  const end = Date.parse(`${endDate}T00:00:00.000Z`);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return 0;
  return Math.round((end - start) / 86400000) + 1;
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <Card variant="outlined">
      <CardContent sx={{ py: 1 }}>
        <Typography variant="caption" color="text.secondary">{label}</Typography>
        <Typography variant="subtitle1">{value}</Typography>
      </CardContent>
    </Card>
  );
}

function Delta({
  value,
  label,
}: {
  value: number;
  label: string;
}) {
  const tone = value > 0 ? "success" : value < 0 ? "error" : "default";
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
      <Chip
        size="small"
        color={tone}
        variant={tone === "default" ? "outlined" : "filled"}
        label={`${value > 0 ? "+" : ""}${value.toFixed(1)}%`}
      />
      <Typography variant="caption" color="text.secondary">{label}</Typography>
    </Box>
  );
}

function KpiCard({
  label,
  value,
  change,
  series,
  color,
  comparison,
}: {
  label: string;
  value: string | number;
  change?: number;
  series: number[];
  color: string;
  comparison: string;
}) {
  return (
    <Card variant="outlined">
      <CardContent sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
        <Typography variant="caption" color="text.secondary">{label}</Typography>
        <Typography variant="h5">{value}</Typography>
        {change !== undefined ? <Delta value={change} label={comparison} /> : null}
        <Box sx={{ maxWidth: 180, mt: 0.5 }}>
          <Sparkline values={series} color={color} />
        </Box>
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
  const [searchParams, setSearchParams] = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [dash, setDash] = useState<AdminDashboard | null>(null);
  const [audit, setAudit] = useState<AdminAuditRow[]>([]);
  const [dashDays, setDashDays] = useState(30);
  const [startDate, setStartDate] = useState(dayKey(-29));
  const [endDate, setEndDate] = useState(dayKey(0));
  const [rangeError, setRangeError] = useState<string | null>(null);
  const [dashQuery, setDashQuery] = useState<number | AdminDashboardRange>(30);
  const [ops, setOps] = useState<AdminOps | null>(null);
  const [providerLookup, setProviderLookup] = useState("");
  const [providerStats, setProviderStats] = useState<AdminProviderStats | null>(null);
  const [providerBusy, setProviderBusy] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(adminPushEnabled());
  const [dayDate, setDayDate] = useState<string | null>(null);
  const [dayData, setDayData] = useState<AdminDashboardDay | null>(null);
  const [dayLoading, setDayLoading] = useState(false);
  const [dayError, setDayError] = useState<string | null>(null);
  const [dayTab, setDayTab] = useState<DayDetailTab>("tickets");

  const tabParam = searchParams.get("tab");
  const tab: TabKey = TABS.includes(tabParam as TabKey) ?
    (tabParam as TabKey) :
    "overview";

  function chooseTab(next: string): void {
    const params = new URLSearchParams(searchParams);
    params.set("tab", next);
    setSearchParams(params, { replace: true });
  }

  async function load(key: string, range: number | AdminDashboardRange) {
    setError(null);
    try {
      const [overview, health, recent] = await Promise.all([
        adminDashboard(key, range),
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

  function applyPreset(days: number): void {
    setDashDays(days);
    setStartDate(dayKey(-(days - 1)));
    setEndDate(dayKey(0));
    setRangeError(null);
    setDashQuery({ days });
    if (token) void load(token, { days });
  }

  function applyRange(): void {
    if (!token) return;
    const days = daysBetween(startDate, endDate);
    if (days < 1) {
      setRangeError(t.admin.rangeInvalid);
      return;
    }
    if (days > 365) {
      setRangeError(t.admin.rangeTooLong);
      return;
    }
    setRangeError(null);
    setDashDays(days);
    const query = { startDate, endDate };
    setDashQuery(query);
    void load(token, query);
  }

  useEffect(() => {
    if (token) void load(token, dashQuery);
  }, [token]);

  async function openDay(date: string): Promise<void> {
    if (!token) return;
    setDayDate(date);
    setDayTab("tickets");
    setDayData(null);
    setDayError(null);
    setDayLoading(true);
    try {
      setDayData(await adminDashboardDay(token, date));
    } catch (err) {
      setDayError(toMessage(err));
    } finally {
      setDayLoading(false);
    }
  }

  function closeDay(): void {
    setDayDate(null);
    setDayData(null);
    setDayError(null);
  }

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

  const activePreset = typeof dashQuery === "number" ? dashQuery : dashQuery.days;
  const daily = dash?.series?.daily ?? [];
  const comparison = dash?.comparison;
  const providerRows = dash ?
    Object.entries(dash.providers.byKind).flatMap(([kind, statuses]) =>
      Object.entries(statuses).map(([status, count]) => ({
        label: `${humanizeEnum(kind)} · ${humanizeEnum(status)}`,
        value: count,
      }))) :
    [];
  const queueTiles = [
    { id: "providers", label: t.admin.providerApprovals, countKey: "providers" },
    { id: "cases", kind: "REPORT", label: t.admin.reports, countKey: "reports" },
    { id: "cases", kind: "DISPUTE", label: t.admin.disputes, countKey: "disputes" },
    { id: "cases", kind: "APPEAL", label: t.admin.appeals, countKey: "appeals" },
    { id: "refunds", label: t.admin.refundsQueue, countKey: "refunds" },
    { id: "support", label: t.admin.support, countKey: "support" },
    { id: "warranty", label: t.admin.warranty, countKey: "warranty" },
  ];

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <PanelHeader
        title={t.admin.dashboard}
        refreshLabel={t.admin.refresh}
        onRefresh={() => {
          if (token) {
            void load(token, dashQuery);
            queue.refresh();
          }
        }}
      />
      {error ? <Alert severity="error">{error}</Alert> : null}
      {notice ? <Alert severity="success">{notice}</Alert> : null}
      <Card variant="outlined">
        <CardContent sx={{ display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap" }}>
          <Button
            size="small"
            variant={activePreset === 30 ? "contained" : "outlined"}
            onClick={() => applyPreset(30)}
          >
            {t.admin.days30}
          </Button>
          <Button
            size="small"
            variant={typeof dashQuery === "object" && dashQuery.days === 90 ? "contained" : "outlined"}
            onClick={() => applyPreset(90)}
          >
            {t.admin.days90}
          </Button>
          <DateField
            label={t.admin.startDate}
            value={startDate}
            onChange={setStartDate}
          />
          <DateField
            label={t.admin.endDate}
            value={endDate}
            onChange={setEndDate}
          />
          <Button size="small" variant="outlined" onClick={applyRange}>
            {t.admin.applyRange}
          </Button>
          <Typography variant="caption" color="text.secondary">
            {dash ? `${formatDateDMY(dash.startDate)} → ${formatDateDMY(dash.endDate)} · ${dash.windowDays}d` : `${dashDays}d`}
          </Typography>
          {dash?.generatedAt ? (
            <Typography variant="caption" color="text.secondary">
              {`${t.admin.lastUpdated} ${formatDateTimeDMY(dash.generatedAt)}`}
            </Typography>
          ) : null}
        </CardContent>
      </Card>
      {rangeError ? <Alert severity="warning">{rangeError}</Alert> : null}
      <Card variant="outlined">
        <CardContent sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          <Typography variant="subtitle2">{t.admin.needsAttention}</Typography>
          <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 1 }}>
            {queueTiles.map((item) => {
              const count = queue.counts[item.countKey] ?? 0;
              return (
                <Card
                  key={`${item.id}-${item.kind ?? ""}`}
                  variant="outlined"
                  sx={{
                    cursor: "pointer",
                    borderColor: count > 0 && item.countKey !== "support" ? "warning.main" : "divider",
                    "&:hover": { borderColor: "primary.main" },
                  }}
                  onClick={() => onOpenSection(item.id, item.kind)}
                >
                  <CardContent sx={{ py: 1 }}>
                    <Typography variant="caption" color="text.secondary">{item.label}</Typography>
                    <Typography variant="h5" color={count > 0 ? "warning.main" : "text.primary"}>{count}</Typography>
                  </CardContent>
                </Card>
              );
            })}
          </Box>
        </CardContent>
      </Card>
      {dash ? (
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", xl: "repeat(4, 1fr)" }, gap: 2 }}>
          <KpiCard
            label={t.admin.gross}
            value={`${dash.money.gross.toLocaleString()} ₫`}
            change={comparison?.change.gross}
            series={daily.map((row) => row.gross)}
            color="#0284c7"
            comparison={t.admin.vsPrevious}
          />
          <KpiCard
            label={t.admin.platformRevenue}
            value={`${dash.money.commission.toLocaleString()} ₫`}
            change={comparison?.change.commission}
            series={daily.map((row) => row.commission)}
            color="#15803d"
            comparison={t.admin.vsPrevious}
          />
          <KpiCard
            label={t.admin.completedJobs}
            value={comparison?.current.completed ?? dash.tickets.completed}
            change={comparison?.change.completed}
            series={daily.map((row) => row.tickets)}
            color="#b45309"
            comparison={t.admin.vsPrevious}
          />
          <KpiCard
            label={t.admin.bookings}
            value={comparison?.current.bookings ?? dash.bookings.total}
            change={comparison?.change.bookings}
            series={daily.map((row) => row.bookings)}
            color="#7c3aed"
            comparison={t.admin.vsPrevious}
          />
        </Box>
      ) : null}
      <Tabs value={tab} onChange={(_, value) => chooseTab(value)} variant="scrollable" scrollButtons="auto">
        <Tab value="overview" label={t.admin.overview} />
        <Tab value="demand" label={t.admin.demand} />
        <Tab value="supply" label={t.admin.supply} />
        <Tab value="money" label={t.admin.moneyTab} />
        <Tab value="bookings" label={t.admin.bookings} />
        <Tab value="trust" label={t.admin.trustSafety} />
      </Tabs>
      {!dash ? (
        <Card variant="outlined">
          <CardContent>
            <Typography variant="body2" color="text.secondary">{t.common.loading}</Typography>
          </CardContent>
        </Card>
      ) : null}
      {dash && tab === "overview" ? (
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" }, gap: 2 }}>
          <LineChart
            title={t.admin.revenueTrend}
            onSelectDate={(date) => void openDay(date)}
            data={daily.map((row) => ({
              date: row.date,
              values: { gross: row.gross, commission: row.commission, net: row.net },
            }))}
            series={[
              { key: "gross", label: t.admin.gross, color: "#0284c7" },
              { key: "commission", label: t.admin.platformRevenue, color: "#15803d" },
              { key: "net", label: t.admin.net, color: "#b45309" },
            ]}
            format={money}
          />
          <BarChart
            title={t.admin.ticketVolume}
            onSelectDate={(date) => void openDay(date)}
            data={daily.map((row) => ({
              label: formatDayMonth(row.date),
              date: row.date,
              values: { tickets: row.tickets, bookings: row.bookings, cases: row.cases },
            }))}
            series={[
              { key: "tickets", label: t.admin.activeTickets, color: "#0284c7" },
              { key: "bookings", label: t.admin.bookings, color: "#7c3aed" },
              { key: "cases", label: t.admin.cases, color: "#b45309" },
            ]}
          />
          <BarList
            title={t.admin.servicePopularity}
            subtitle={dash.services.topService ? `${t.admin.mostPopularService}: ${dash.services.topService.name}` : undefined}
            data={dash.services.services.slice(0, 5).map((service) => ({
              label: service.name,
              value: service.count,
            }))}
            format={(value) => String(value)}
          />
          <LineChart
            title={t.admin.slaTrend}
            onSelectDate={(date) => void openDay(date)}
            data={(dash.series?.sla ?? []).map((row) => ({
              date: row.date,
              values: {
                matchRate: Math.round(row.matchRate * 100),
                accept: row.avgAcceptMinutes,
              },
            }))}
            series={[
              { key: "matchRate", label: t.admin.matchRate, color: "#0284c7" },
              { key: "accept", label: t.admin.avgAccept, color: "#b45309" },
            ]}
            format={(value) => String(Math.round(value))}
          />
        </Box>
      ) : null}
      {dash && tab === "demand" ? (
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" }, gap: 2 }}>
          <BarList
            title={t.admin.servicePopularity}
            data={dash.services.services.map((service) => ({
              label: service.name,
              value: service.count,
            }))}
            format={(value) => String(value)}
          />
          <BarList
            title={t.admin.serviceTypes}
            data={Object.entries(dash.services.byType).map(([label, value]) => ({
              label,
              value,
              color: serviceColor(label),
            }))}
            format={(value) => String(value)}
          />
          <BarList
            title={t.admin.bookingsByStatus}
            data={Object.entries(dash.bookings.byStatus).map(([label, value]) => ({ label, value }))}
            format={(value) => String(value)}
          />
          <BarList
            title={t.admin.bookingServices}
            data={dash.bookings.byService.map((service) => ({ label: service.name, value: service.count }))}
            format={(value) => String(value)}
          />
        </Box>
      ) : null}
      {dash && tab === "supply" ? (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 1 }}>
            <MiniStat label={t.admin.totalProviders} value={dash.providers.total} />
            <MiniStat label={t.admin.suspendedNote} value={dash.providers.suspended} />
            <MiniStat label={t.admin.rating} value={`${dash.providers.ratingAvg.toFixed(1)} (${dash.providers.ratingCount})`} />
          </Box>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" }, gap: 2 }}>
            <BarList
              title={t.admin.totalProviders}
              data={providerRows}
              format={(value) => String(value)}
            />
            <LineChart
              title={t.admin.growth}
              onSelectDate={(date) => void openDay(date)}
              data={daily.map((row) => ({
                date: row.date,
                values: { users: row.users, providers: row.providers },
              }))}
              series={[
                { key: "users", label: t.admin.users, color: "#0284c7" },
                { key: "providers", label: t.admin.totalProviders, color: "#b45309" },
              ]}
              format={(value) => String(Math.round(value))}
            />
          </Box>
        </Box>
      ) : null}
      {dash && tab === "money" ? (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 1 }}>
            <MiniStat label={t.admin.gross} value={`${dash.money.gross.toLocaleString()} ₫`} />
            <MiniStat label={t.admin.net} value={`${dash.money.net.toLocaleString()} ₫`} />
            <MiniStat label={t.admin.commissionOwed} value={`${dash.money.commissionOwed.toLocaleString()} ₫`} />
            <MiniStat label={t.admin.pendingPayouts} value={`${dash.money.payoutsNet.toLocaleString()} ₫`} />
          </Box>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" }, gap: 2 }}>
            <LineChart
              title={t.admin.revenueTrend}
            onSelectDate={(date) => void openDay(date)}
              data={daily.map((row) => ({
                date: row.date,
                values: { gross: row.gross, commission: row.commission, net: row.net },
              }))}
              series={[
                { key: "gross", label: t.admin.gross, color: "#0284c7" },
                { key: "commission", label: t.admin.platformRevenue, color: "#15803d" },
                { key: "net", label: t.admin.net, color: "#b45309" },
              ]}
              format={money}
            />
            <BarList
              title={t.admin.paymentStatusSplit}
              data={Object.entries(dash.money.byStatus).map(([label, value]) => ({ label, value }))}
              format={(value) => String(value)}
            />
            <BarList
              title={t.admin.paymentMethod}
              data={Object.entries(dash.money.byMethod).map(([label, value]) => ({ label, value }))}
              format={(value) => String(value)}
            />
            <BarList
              title={t.admin.topProviders}
              data={(dash.series?.topProviders ?? []).map((provider) => ({
                label: provider.name,
                value: provider.gross,
              }))}
              format={money}
            />
          </Box>
        </Box>
      ) : null}
      {dash && tab === "bookings" ? (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 1 }}>
            <MiniStat label={t.admin.bookings} value={dash.bookings.total} />
            <MiniStat label={t.admin.bookingsActive} value={dash.bookings.active} />
            <MiniStat label={t.admin.bookingsCompleted} value={dash.bookings.completed} />
            <MiniStat label={t.admin.bookingsCancelled} value={dash.bookings.cancelled + dash.bookings.declined + dash.bookings.noShow} />
          </Box>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" }, gap: 2 }}>
            <BarList
              title={t.admin.bookingsByStatus}
              data={Object.entries(dash.bookings.byStatus).map(([label, value]) => ({ label, value }))}
              format={(value) => String(value)}
            />
            <BarList
              title={t.admin.bookingServices}
              data={dash.bookings.byService.map((service) => ({ label: service.name, value: service.count }))}
              format={(value) => String(value)}
            />
            <BarChart
              title={t.admin.ticketVolume}
            onSelectDate={(date) => void openDay(date)}
              data={daily.map((row) => ({
                label: formatDayMonth(row.date),
                date: row.date,
                values: { bookings: row.bookings },
              }))}
              series={[{ key: "bookings", label: t.admin.bookings, color: "#7c3aed" }]}
            />
          </Box>
        </Box>
      ) : null}
      {dash && tab === "trust" ? (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 1 }}>
            <MiniStat label={t.admin.flags} value={dash.flags.total} />
            <MiniStat label={t.admin.recent7d} value={dash.flags.recent7d} />
            <MiniStat label={t.admin.reports} value={queue.counts.reports ?? 0} />
            <MiniStat label={t.admin.disputes} value={queue.counts.disputes ?? 0} />
            <MiniStat label={t.admin.appeals} value={queue.counts.appeals ?? 0} />
          </Box>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" }, gap: 2 }}>
            <BarList
              title={t.admin.flags}
              data={Object.entries(dash.flags.byStatus).map(([label, value]) => ({ label, value }))}
              format={(value) => String(value)}
            />
            <BarChart
              title={t.admin.caseVolume}
              onSelectDate={(date) => void openDay(date)}
              data={(dash.series?.cases ?? []).map((row) => ({
                label: formatDayMonth(row.date),
                date: row.date,
                values: { reports: row.reports, disputes: row.disputes, appeals: row.appeals },
              }))}
              series={[
                { key: "reports", label: t.admin.reports, color: "#0284c7" },
                { key: "disputes", label: t.admin.disputes, color: "#b45309" },
                { key: "appeals", label: t.admin.appeals, color: "#15803d" },
              ]}
            />
          </Box>
        </Box>
      ) : null}
      <Accordion variant="outlined">
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle2">{t.admin.ops}</Typography>
        </AccordionSummary>
        <AccordionDetails sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {ops ? (
            <Card variant="outlined">
              <CardContent sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
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
                  <Typography variant="subtitle2" sx={{ flexGrow: 1 }}>{t.admin.recentActivity}</Typography>
                  <Button size="small" onClick={() => onOpenSection("audit")}>{t.admin.viewAll}</Button>
                </Box>
                {audit.map((row) => (
                  <Box key={row.id} sx={{ display: "flex", gap: 1, alignItems: "baseline" }}>
                    <Typography variant="body2" sx={{ flexGrow: 1 }}>{row.action}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {`${row.targetType}${row.targetId ? ` · ${row.targetId.slice(0, 8)}` : ""} · ${ago(row.createdAt, t)}`}
                    </Typography>
                  </Box>
                ))}
              </CardContent>
            </Card>
          ) : null}
          <Card>
            <CardContent sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              <Typography variant="subtitle2">{t.admin.pushTitle}</Typography>
              <Typography variant="body2" color="text.secondary">{t.admin.pushBody}</Typography>
              <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                <Button
                  size="small"
                  variant={pushEnabled ? "outlined" : "contained"}
                  disabled={pushBusy}
                  onClick={() => void toggleAdminPush()}
                >
                  {pushEnabled ? t.admin.pushDisable : t.admin.pushEnable}
                </Button>
                {pushEnabled ? <Chip size="small" color="success" label={t.admin.pushActive} /> : null}
              </Box>
            </CardContent>
          </Card>
        </AccordionDetails>
      </Accordion>
      <DayDetailDialog
        open={dayDate !== null}
        date={dayDate}
        data={dayData}
        loading={dayLoading}
        error={dayError}
        tab={dayTab}
        onTab={setDayTab}
        onClose={closeDay}
      />
    </Box>
  );
}
