import type { Provider } from "../../api/providers";
import type { Strings } from "../../i18n";

export function profileServiceKinds(
  services: string[],
  providers: Provider[],
): string[] {
  const providerKinds = providers
    .filter((provider) => provider.status !== "DENIED")
    .map((provider) => provider.kind);
  return [...new Set([
    ...services.filter((service) => service !== "RIDER"),
    ...providerKinds,
  ])];
}

export function profileRoleLabel(
  services: string[],
  isAdmin: boolean,
  t: Strings,
): string {
  if (isAdmin) return t.more.roleAdmin;
  return services.includes("RIDER") ? t.roles.rider : t.more.roleUser;
}
