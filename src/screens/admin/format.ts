import type { Strings } from "../../i18n";

export function ago(iso: string, t: Strings): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(diff) || diff < 0) return "";
  const minutes = Math.max(1, Math.floor(diff / 60000));
  if (minutes < 60) return `${minutes}m ${t.admin.ago}`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ${t.admin.ago}`;
  return `${Math.floor(hours / 24)}d ${t.admin.ago}`;
}

export function maskAccount(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length <= 4) return trimmed;
  return `•••• ${trimmed.slice(-4)}`;
}

export function money(value: number): string {
  return `${value.toLocaleString()} VND`;
}
