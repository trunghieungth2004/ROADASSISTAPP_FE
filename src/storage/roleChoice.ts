const KEY = "roadassist.roleChosen";

export function hasChosenRole(): boolean {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return true;
  }
}

export function markRoleChosen(): void {
  try {
    localStorage.setItem(KEY, "1");
  } catch {
    return;
  }
}
