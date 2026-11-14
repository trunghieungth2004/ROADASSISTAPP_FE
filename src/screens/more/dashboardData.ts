import type {Bill} from "../../api/bills";
import type {Booking} from "../../api/bookings";
import type {ProviderStats} from "../../api/providers";
import type {Strings} from "../../i18n/en";

export type DashboardBar = { label: string; value: number; display: string };
export type DashboardStat = { label: string; value: string };
export type DashboardData = {
  mode: "RIDER" | "PROVIDER";
  stats: DashboardStat[];
  monthly: DashboardBar[];
  breakdown: DashboardBar[];
};

const terminal = new Set(["4", "5", "8", "15"]);

function money(value: number): string {
  return `${Math.round(value).toLocaleString()} VND`;
}

function monthKey(value: string | number | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function lastMonths(count: number, locale: string): Array<{key: string; label: string}> {
  const now = new Date();
  return Array.from({length: count}, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (count - 1 - index), 1);
    return {key: monthKey(date), label: date.toLocaleDateString(locale, {month: "short"})};
  });
}

export function buildRiderDashboard({
  bills,
  rating,
  t,
  lang,
}: {
  bills: Bill[];
  rating: {avg: number; count: number};
  t: Strings;
  lang: string;
}): {data: DashboardData; summary: string} {
  const months = lastMonths(6, lang === "vi" ? "vi-VN" : "en-US");
  const completed = bills.filter((bill) => bill.ticketStatus === "4").length;
  const active = bills.filter((bill) => !terminal.has(bill.ticketStatus)).length;
  const spend = bills.reduce((sum, bill) => sum + bill.paid, 0);
  const monthly = months.map((month) => {
    const rows = bills.filter((bill) =>
      bill.createdAt !== null && monthKey(bill.createdAt) === month.key);
    const value = rows.reduce((sum, bill) => sum + bill.paid, 0);
    return {label: month.label, value, display: money(value)};
  });
  const types = new Map<string, number>();
  for (const bill of bills) types.set(bill.ticketType, (types.get(bill.ticketType) ?? 0) + 1);
  return {
    data: {
      mode: "RIDER",
      stats: [
        {label: t.more.dashboardTrips, value: String(bills.length)},
        {label: t.more.dashboardCompleted, value: String(completed)},
        {label: t.more.dashboardActive, value: String(active)},
        {label: t.more.dashboardSpend, value: money(spend)},
        {label: t.more.dashboardRating, value: rating.count > 0 ? `${rating.avg.toFixed(1)} (${rating.count})` : "-"},
      ],
      monthly,
      breakdown: [...types.entries()].map(([label, value]) => ({label, value, display: String(value)})),
    },
    summary: `${bills.length} ${t.more.dashboardTrips.toLowerCase()} · ${money(spend)} · ${rating.count > 0 ? `★ ${rating.avg.toFixed(1)}` : "-"}`,
  };
}

export function buildProviderDashboard({
  stats,
  bookings,
  t,
  lang,
}: {
  stats: ProviderStats | null;
  bookings: Booking[];
  t: Strings;
  lang: string;
}): {data: DashboardData; summary: string} {
  const months = lastMonths(6, lang === "vi" ? "vi-VN" : "en-US");
  const providers = stats?.providers ?? [];
  const completed = providers.reduce((sum, row) => sum + row.completedJobs, 0);
  const ratingCount = providers.reduce((sum, row) => sum + row.ratingCount, 0);
  const rating = ratingCount > 0 ?
    providers.reduce((sum, row) => sum + row.ratingAvg * row.ratingCount, 0) / ratingCount :
    0;
  const activeBookings = bookings.filter((booking) =>
    booking.status === "REQUESTED" ||
    booking.status === "CONFIRMED" ||
    booking.status === "ARRIVED").length;
  const monthly = months.map((month) => {
    const value = bookings.filter((booking) => monthKey(booking.scheduledAt) === month.key).length;
    return {label: month.label, value, display: String(value)};
  });
  const kinds = new Map<string, number>();
  for (const row of providers) kinds.set(row.kind, (kinds.get(row.kind) ?? 0) + 1);
  return {
    data: {
      mode: "PROVIDER",
      stats: [
        {label: t.more.dashboardCompleted, value: String(completed)},
        {label: t.more.dashboardBookings, value: String(activeBookings)},
        {label: t.more.dashboardEarned, value: money(stats?.payouts.gross ?? 0)},
        {label: t.more.dashboardNet, value: money(stats?.payouts.net ?? 0)},
        {label: t.more.dashboardCommission, value: money(stats?.payouts.commissionOwed ?? 0)},
        {label: t.more.dashboardRating, value: ratingCount > 0 ? `${rating.toFixed(1)} (${ratingCount})` : "-"},
      ],
      monthly,
      breakdown: [...kinds.entries()].map(([label, value]) => ({label, value, display: String(value)})),
    },
    summary: `${completed} ${t.more.dashboardCompleted.toLowerCase()} · ${activeBookings} ${t.more.dashboardBookings.toLowerCase()} · ${money(stats?.payouts.gross ?? 0)}`,
  };
}
