export type ActiveVehicle = {
  type: string;
  baseWidth: number;
};

const KEY = "roadassist.activeVehicle";

export function getActiveVehicle(): ActiveVehicle | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as Partial<ActiveVehicle>;
    if (
      typeof parsed.type !== "string" ||
      typeof parsed.baseWidth !== "number" ||
      !(parsed.baseWidth > 0)
    ) {
      return null;
    }
    return {type: parsed.type, baseWidth: parsed.baseWidth};
  } catch {
    return null;
  }
}

export function setActiveVehicle(vehicle: ActiveVehicle): void {
  localStorage.setItem(KEY, JSON.stringify(vehicle));
}

export function clearActiveVehicle(): void {
  localStorage.removeItem(KEY);
}
