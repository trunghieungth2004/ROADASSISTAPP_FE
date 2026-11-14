import { useEffect, useMemo, useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import InputAdornment from "@mui/material/InputAdornment";
import MenuItem from "@mui/material/MenuItem";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { toMessage } from "../../api/client";
import { adminConfig, adminUpdateConfig, type AdminConfig } from "../../api/admin";
import { useStrings } from "../../context/LanguageContext";
import PanelHeader from "./PanelHeader";
import SettingCard from "./SettingCard";
import SettingField from "./SettingField";
import SettingSection from "./SettingSection";

const COMMISSIONS = ["MECHANIC", "TOW", "SOS", "WALK_IN"] as const;

const NUMBERS = [
  { key: "towBaseFee", min: 0 },
  { key: "towPerKmFee", min: 0 },
  { key: "minimumTowFee", min: 0 },
  { key: "bikeIncludedKm", min: 0, step: 0.5 },
  { key: "carIncludedKm", min: 0, step: 0.5 },
  { key: "ceilingMultiplier", min: 1, step: 0.01 },
  { key: "carBaseFee", min: 0 },
  { key: "carMultiplier", min: 1, step: 0.01 },
  { key: "nightMultiplier", min: 1, step: 0.01 },
  { key: "waitingRatePer15Min", min: 0 },
  { key: "waitingGraceMin", min: 0, integer: true },
  { key: "waitingCapMin", min: 0, integer: true },
  { key: "detourTolerancePct", min: 0, max: 100 },
] as const;

const PRICING_GROUPS = ["TOW", "MOBILE_SHOP"] as const;

const PRICING_KEYS: Record<string, string[]> = {
  TOW: ["baseMin", "baseMax", "perKmMin", "perKmMax"],
  MOBILE_SHOP: ["callOutMin", "callOutMax", "travelPerKmMin", "travelPerKmMax"],
};

type Draft = {
  numbers: Record<string, string>;
  commission: Record<string, string>;
  night: { start: string; end: string };
  features: Record<string, boolean>;
  deadhead: boolean;
  refundPolicy: string;
  pricing: Record<string, Record<string, string>>;
};

function text(value: unknown): string {
  return typeof value === "number" ? String(value) : "";
}

function fromConfig(config: AdminConfig): Draft {
  const pricing = config.providerPricing ?? {};
  return {
    numbers: Object.fromEntries(NUMBERS.map((field) => [field.key, text(config[field.key])])),
    commission: Object.fromEntries(
      COMMISSIONS.map((key) => [key, text((config.commissionRate ?? {})[key])]),
    ),
    night: {
      start: text(config.nightWindow?.start ?? 22),
      end: text(config.nightWindow?.end ?? 6),
    },
    features: { ...config.features },
    deadhead: config.deadheadPayable !== false,
    refundPolicy: config.refundPolicy ?? "FULL",
    pricing: Object.fromEntries(
      PRICING_GROUPS.map((group) => [
        group,
        Object.fromEntries(
          PRICING_KEYS[group].map((key) => [
            key,
            text(((pricing as Record<string, Record<string, unknown>>)[group] ?? {})[key]),
          ]),
        ),
      ]),
    ),
  };
}

export default function ConfigAdminPanel({ token }: { token: string | null }) {
  const { t } = useStrings();
  const [config, setConfig] = useState<AdminConfig | null>(null);
  const [draft, setDraft] = useState<Draft>(() => fromConfig({} as AdminConfig));
  const [baseline, setBaseline] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedLine, setSavedLine] = useState("");

  function apply(configRow: AdminConfig): void {
    const nextDraft = fromConfig(configRow);
    setConfig(configRow);
    setDraft(nextDraft);
    setBaseline(JSON.stringify(nextDraft));
    setErrors({});
    setSavedLine(
      [
        configRow.updatedAt ? new Date(configRow.updatedAt).toLocaleString() : "",
        configRow.updatedBy ?? "",
      ]
        .filter((part) => part !== "")
        .join(" · "),
    );
  }

  useEffect(() => {
    if (!token) return;
    void adminConfig(token)
      .then(apply)
      .catch((err: unknown) => setError(toMessage(err)));
  }, [token]);

  const dirty = useMemo(
    () => baseline !== "" && JSON.stringify(draft) !== baseline,
    [draft, baseline],
  );

  function setNumber(key: string, value: string): void {
    setDraft((prev) => ({ ...prev, numbers: { ...prev.numbers, [key]: value } }));
    setErrors((prev) => ({ ...prev, [key]: "" }));
  }

  function setCommission(key: string, value: string): void {
    setDraft((prev) => ({
      ...prev,
      commission: { ...prev.commission, [key]: value },
    }));
    setErrors((prev) => ({ ...prev, [`commission.${key}`]: "" }));
  }

  function setPricing(group: string, key: string, value: string): void {
    setDraft((prev) => ({
      ...prev,
      pricing: {
        ...prev.pricing,
        [group]: { ...prev.pricing[group], [key]: value },
      },
    }));
    setErrors((prev) => ({ ...prev, [`pricing.${group}.${key}`]: "" }));
  }

  function validate(): boolean {
    const next: Record<string, string> = {};
    const check = (
      id: string,
      raw: string,
      min: number,
      max?: number,
      integer = false,
    ): void => {
      const value = Number(raw);
      if (
        raw.trim() === "" ||
        !Number.isFinite(value) ||
        value < min ||
        (max !== undefined && value > max) ||
        (integer && !Number.isInteger(value))
      ) {
        next[id] = t.admin.cfgFieldError;
      }
    };
    for (const key of COMMISSIONS) {
      check(`commission.${key}`, draft.commission[key] ?? "", 0, 100);
    }
    for (const field of NUMBERS) {
      check(
        field.key,
        draft.numbers[field.key] ?? "",
        field.min,
        "max" in field ? field.max : undefined,
        "integer" in field ? field.integer : false,
      );
    }
    check("night.start", draft.night.start, 0, 23, true);
    check("night.end", draft.night.end, 0, 23, true);
    if (
      !next["night.start"] &&
      !next["night.end"] &&
      Number(draft.night.start) === Number(draft.night.end)
    ) {
      next["night.end"] = t.admin.cfgFieldError;
    }
    for (const group of PRICING_GROUPS) {
      for (const key of PRICING_KEYS[group]) {
        check(`pricing.${group}.${key}`, draft.pricing[group]?.[key] ?? "", 0);
      }
      const pairs = group === "TOW"
        ? [["baseMin", "baseMax"], ["perKmMin", "perKmMax"]]
        : [["callOutMin", "callOutMax"], ["travelPerKmMin", "travelPerKmMax"]];
      for (const [minKey, maxKey] of pairs) {
        const minValue = Number(draft.pricing[group]?.[minKey]);
        const maxValue = Number(draft.pricing[group]?.[maxKey]);
        if (Number.isFinite(minValue) && Number.isFinite(maxValue) && minValue > maxValue) {
          next[`pricing.${group}.${maxKey}`] = t.admin.cfgFieldError;
        }
      }
    }
    setErrors(next);
    if (Object.keys(next).length > 0) {
      setError(t.admin.cfgInvalid);
      return false;
    }
    setError(null);
    return true;
  }

  async function save(): Promise<void> {
    if (!token || busy || !validate()) return;
    setBusy(true);
    setError(null);
    try {
      const pricing = Object.fromEntries(
        PRICING_GROUPS.map((group) => [
          group,
          Object.fromEntries(
            PRICING_KEYS[group].map((key) => [
              key,
              Number(draft.pricing[group]?.[key]),
            ]),
          ),
        ]),
      );
      const patch: Record<string, unknown> = {
        commissionRate: Object.fromEntries(
          COMMISSIONS.map((key) => [key, Number(draft.commission[key])]),
        ),
        ...Object.fromEntries(
          NUMBERS.map((field) => [field.key, Number(draft.numbers[field.key])]),
        ),
        nightWindow: {
          start: Number(draft.night.start),
          end: Number(draft.night.end),
        },
        deadheadPayable: draft.deadhead,
        refundPolicy: draft.refundPolicy,
        features: draft.features,
        providerPricing: pricing,
      };
      const next = await adminUpdateConfig(token, patch);
      apply(next);
      setError(null);
    } catch (err) {
      setError(toMessage(err));
    } finally {
      setBusy(false);
    }
  }

  if (config === null) {
    return (
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <PanelHeader title={t.admin.config} refreshLabel={t.admin.refresh} />
        {error ? <Alert severity="error">{error}</Alert> : <Typography color="text.secondary">{t.common.loading}</Typography>}
      </Box>
    );
  }

  function numberField(
    key: string,
    label: string,
    description: string,
    unit?: string,
    step?: number,
  ) {
    return (
      <SettingField
        key={key}
        label={label}
        description={description}
        error={errors[key]}
      >
        <TextField
          size="small"
          type="number"
          fullWidth
          value={draft.numbers[key] ?? ""}
          onChange={(event) => setNumber(key, event.target.value)}
          error={Boolean(errors[key])}
          slotProps={{
            htmlInput: { step: step ?? 1, min: 0 },
            input: unit
              ? {
                  endAdornment: (
                    <InputAdornment position="end">{unit}</InputAdornment>
                  ),
                }
              : undefined,
          }}
        />
      </SettingField>
    );
  }

  function commissionField(key: string, label: string) {
    const id = `commission.${key}`;
    return (
      <SettingField
        key={id}
        label={label}
        description={t.admin.cfgCommissionDesc}
        error={errors[id]}
      >
        <TextField
          size="small"
          type="number"
          fullWidth
          value={draft.commission[key] ?? ""}
          onChange={(event) => setCommission(key, event.target.value)}
          error={Boolean(errors[id])}
          slotProps={{
            htmlInput: { min: 0, max: 100 },
            input: {
              endAdornment: <InputAdornment position="end">%</InputAdornment>,
            },
          }}
        />
      </SettingField>
    );
  }

  function pairField(
    group: string,
    minKey: string,
    maxKey: string,
    label: string,
    description: string,
  ) {
    return (
      <SettingField
        label={label}
        description={description}
        error={errors[`pricing.${group}.${minKey}`] ?? errors[`pricing.${group}.${maxKey}`]}
      >
        <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5 }}>
          <TextField
            size="small"
            type="number"
            label={t.admin.cfgMin}
            value={draft.pricing[group]?.[minKey] ?? ""}
            onChange={(event) => setPricing(group, minKey, event.target.value)}
            error={Boolean(errors[`pricing.${group}.${minKey}`])}
            slotProps={{ htmlInput: { min: 0 } }}
          />
          <TextField
            size="small"
            type="number"
            label={t.admin.cfgMax}
            value={draft.pricing[group]?.[maxKey] ?? ""}
            onChange={(event) => setPricing(group, maxKey, event.target.value)}
            error={Boolean(errors[`pricing.${group}.${maxKey}`])}
            slotProps={{ htmlInput: { min: 0 } }}
          />
        </Box>
      </SettingField>
    );
  }

  function toggleRow(
    label: string,
    description: string,
    checked: boolean,
    onChange: (value: boolean) => void,
  ) {
    return (
      <Box sx={{ display: "flex", alignItems: "flex-start", gap: 2 }}>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="subtitle2">{label}</Typography>
          <Typography variant="caption" color="text.secondary">
            {description}
          </Typography>
        </Box>
        <Switch checked={checked} onChange={(event) => onChange(event.target.checked)} />
      </Box>
    );
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column" }}>
      <PanelHeader
        title={t.admin.config}
        refreshLabel={t.admin.refresh}
        onRefresh={() => token && void adminConfig(token).then(apply).catch((err: unknown) => setError(toMessage(err)))}
      />
      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
      <SettingSection title={t.admin.cfgCommissions} lede={t.admin.cfgCommissionsLede}>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
          {COMMISSIONS.map((key) =>
            commissionField(
              key,
              key === "MECHANIC"
                ? t.admin.cfgCommissionMechanic
                : key === "TOW"
                  ? t.admin.cfgCommissionTow
                  : key === "SOS"
                    ? t.admin.cfgCommissionSos
                    : t.admin.cfgCommissionWalkIn,
            ),
          )}
        </Box>
      </SettingSection>
      <SettingSection title={t.admin.cfgTow} lede={t.admin.cfgTowLede}>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
          {numberField("towBaseFee", t.admin.cfgTowBaseFee, t.admin.cfgTowBaseFeeDesc, "VND")}
          {numberField("towPerKmFee", t.admin.cfgTowPerKmFee, t.admin.cfgTowPerKmFeeDesc, "VND/km")}
          {numberField("minimumTowFee", t.admin.cfgMinimumTowFee, t.admin.cfgMinimumTowFeeDesc, "VND")}
          {numberField("bikeIncludedKm", t.admin.cfgBikeIncludedKm, t.admin.cfgBikeIncludedKmDesc, "km", 0.5)}
          {numberField("carIncludedKm", t.admin.cfgCarIncludedKm, t.admin.cfgCarIncludedKmDesc, "km", 0.5)}
          {numberField("ceilingMultiplier", t.admin.cfgCeilingMultiplier, t.admin.cfgCeilingMultiplierDesc, "×", 0.01)}
        </Box>
      </SettingSection>
      <SettingSection title={t.admin.cfgCarNight} lede={t.admin.cfgCarNightLede}>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
          {numberField("carBaseFee", t.admin.cfgCarBaseFee, t.admin.cfgCarBaseFeeDesc, "VND")}
          {numberField("carMultiplier", t.admin.cfgCarMultiplier, t.admin.cfgCarMultiplierDesc, "×", 0.01)}
          {numberField("nightMultiplier", t.admin.cfgNightMultiplier, t.admin.cfgNightMultiplierDesc, "×", 0.01)}
        </Box>
        <SettingField label={t.admin.cfgNightStart} description={t.admin.cfgNightStartDesc} error={errors["night.start"]}>
          <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5 }}>
            <TextField
              size="small"
              type="number"
              label={t.admin.cfgNightStart}
              value={draft.night.start}
              onChange={(event) => {
                setDraft((prev) => ({ ...prev, night: { ...prev.night, start: event.target.value } }));
                setErrors((prev) => ({ ...prev, "night.start": "" }));
              }}
              error={Boolean(errors["night.start"])}
              slotProps={{ htmlInput: { min: 0, max: 23 } }}
            />
            <TextField
              size="small"
              type="number"
              label={t.admin.cfgNightEnd}
              value={draft.night.end}
              onChange={(event) => {
                setDraft((prev) => ({ ...prev, night: { ...prev.night, end: event.target.value } }));
                setErrors((prev) => ({ ...prev, "night.end": "" }));
              }}
              error={Boolean(errors["night.end"])}
              slotProps={{ htmlInput: { min: 0, max: 23 } }}
            />
          </Box>
        </SettingField>
      </SettingSection>
      <SettingSection title={t.admin.cfgWaiting} lede={t.admin.cfgWaitingLede}>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
          {numberField("waitingRatePer15Min", t.admin.cfgWaitingRate, t.admin.cfgWaitingRateDesc, "VND")}
          {numberField("waitingGraceMin", t.admin.cfgWaitingGrace, t.admin.cfgWaitingGraceDesc, "min")}
          {numberField("waitingCapMin", t.admin.cfgWaitingCap, t.admin.cfgWaitingCapDesc, "min")}
          {numberField("detourTolerancePct", t.admin.cfgDetourTolerance, t.admin.cfgDetourToleranceDesc, "%")}
        </Box>
      </SettingSection>
      <SettingSection title={t.admin.cfgRefunds} lede={t.admin.cfgRefundsLede}>
        <SettingField label={t.admin.cfgRefundPolicy} description={t.admin.cfgRefundPolicyDesc}>
          <TextField
            select
            size="small"
            fullWidth
            value={draft.refundPolicy}
            onChange={(event) =>
              setDraft((prev) => ({ ...prev, refundPolicy: event.target.value }))
            }
          >
            <MenuItem value="FULL">{t.admin.cfgRefundFull}</MenuItem>
            <MenuItem value="PARTIAL">{t.admin.cfgRefundPartial}</MenuItem>
            <MenuItem value="NONE">{t.admin.cfgRefundNone}</MenuItem>
          </TextField>
        </SettingField>
        {toggleRow(
          t.admin.cfgDeadhead,
          t.admin.cfgDeadheadDesc,
          draft.deadhead,
          (value) => setDraft((prev) => ({ ...prev, deadhead: value })),
        )}
      </SettingSection>
      <SettingSection title={t.admin.cfgFeatures} lede={t.admin.cfgFeaturesLede}>
        {toggleRow(
          t.admin.cfgQuickFix,
          t.admin.cfgQuickFixDesc,
          draft.features.quickFix === true,
          (value) =>
            setDraft((prev) => ({
              ...prev,
              features: { ...prev.features, quickFix: value },
            })),
        )}
        {toggleRow(
          t.admin.cfgPhoneMasking,
          t.admin.cfgPhoneMaskingDesc,
          draft.features.phoneMasking === true,
          (value) =>
            setDraft((prev) => ({
              ...prev,
              features: { ...prev.features, phoneMasking: value },
            })),
        )}
      </SettingSection>
      <SettingSection title={t.admin.cfgProviderLimits} lede={t.admin.cfgProviderLimitsLede}>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2 }}>
          <SettingCard title={t.admin.cfgTowLimits}>
            {pairField("TOW", "baseMin", "baseMax", t.admin.cfgBaseRange, t.admin.cfgBaseRangeDesc)}
            {pairField("TOW", "perKmMin", "perKmMax", t.admin.cfgPerKmRange, t.admin.cfgPerKmRangeDesc)}
          </SettingCard>
          <SettingCard title={t.admin.cfgMobileLimits}>
            {pairField("MOBILE_SHOP", "callOutMin", "callOutMax", t.admin.cfgCallOutRange, t.admin.cfgCallOutRangeDesc)}
            {pairField("MOBILE_SHOP", "travelPerKmMin", "travelPerKmMax", t.admin.cfgTravelRange, t.admin.cfgTravelRangeDesc)}
          </SettingCard>
        </Box>
      </SettingSection>
      <Box
        sx={{
          position: "sticky",
          bottom: 0,
          zIndex: 3,
          display: "flex",
          alignItems: "center",
          gap: 1,
          flexWrap: "wrap",
          py: 1.5,
          px: 1,
          bgcolor: "background.paper",
          borderTop: 1,
          borderColor: "divider",
        }}
      >
        <Button variant="contained" disabled={!dirty || busy} onClick={() => void save()}>
          {t.admin.configSave}
        </Button>
        <Button
          variant="outlined"
          disabled={!dirty || busy}
          onClick={() => {
            setDraft(fromConfig(config));
            setErrors({});
            setError(null);
          }}
        >
          {t.admin.cfgDiscard}
        </Button>
        <Typography
          variant="caption"
          color={dirty ? "warning.main" : "text.secondary"}
          sx={{ ml: "auto" }}
        >
          {dirty
            ? t.admin.cfgDirty
            : `${t.admin.cfgClean}${savedLine ? ` · ${t.admin.cfgUpdated}: ${savedLine}` : ""}`}
        </Typography>
      </Box>
    </Box>
  );
}
