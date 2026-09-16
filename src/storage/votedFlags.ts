const KEY = "roadassist.votedFlags";
const DENY_KEY = "roadassist.deniedFlags";

function load(): string[] {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed.filter((v): v is string => typeof v === "string")
      : [];
  } catch {
    return [];
  }
}

function loadDenied(): string[] {
  try {
    const raw = localStorage.getItem(DENY_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed.filter((v): v is string => typeof v === "string")
      : [];
  } catch {
    return [];
  }
}

export function hasVoted(flagId: string): boolean {
  return load().includes(flagId);
}

export function markVoted(flagId: string): void {
  const ids = load();
  if (!ids.includes(flagId)) {
    ids.push(flagId);
    try {
      localStorage.setItem(KEY, JSON.stringify(ids.slice(-500)));
    } catch {
      return;
    }
  }
}

export function hasDenied(flagId: string): boolean {
  return loadDenied().includes(flagId);
}

export function markDenied(flagId: string): void {
  const ids = loadDenied();
  if (!ids.includes(flagId)) {
    ids.push(flagId);
    try {
      localStorage.setItem(DENY_KEY, JSON.stringify(ids.slice(-500)));
    } catch {
      return;
    }
  }
}
