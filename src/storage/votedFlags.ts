const KEY = "roadassist.votedFlags";

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
