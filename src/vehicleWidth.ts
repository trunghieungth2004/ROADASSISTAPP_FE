const KEY = "roadassist.routingWidth";

export function getRoutingWidth(): number {
  const n = Number(localStorage.getItem(KEY));
  return Number.isFinite(n) && n > 0 ? n : 0.9;
}

export function setRoutingWidth(width: number): void {
  localStorage.setItem(KEY, String(width));
}
