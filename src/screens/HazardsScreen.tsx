import { useCallback, useState, type FormEvent } from "react";
import { toMessage } from "../api/client";
import {
  alleysNear,
  submitAlley,
  type AlleySegment,
  type Tier,
} from "../api/alleys";
import {
  confirmFlag,
  flagsNear,
  submitFlag,
  unflag,
  type Flag,
  type FlagType,
} from "../api/flags";
import MapView, { type MapClick } from "../components/MapView";
import { useAuth } from "../context/AuthContext";
import { useStrings } from "../context/LanguageContext";
import { mapDefaults } from "../map/style";

const FLAG_TYPES: FlagType[] = ["FLOOD", "OBSTRUCTION", "ACCIDENT"];
const TIERS: Tier[] = ["TIER1", "TIER2", "TIER3"];

export default function HazardsScreen() {
  const { t } = useStrings();
  const { token, uid } = useAuth();
  const [point, setPoint] = useState({ lat: mapDefaults.center[1], lng: mapDefaults.center[0] });
  const [flags, setFlags] = useState<Flag[]>([]);
  const [segments, setSegments] = useState<AlleySegment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [flagType, setFlagType] = useState<FlagType>("FLOOD");
  const [radius, setRadius] = useState("200");
  const [note, setNote] = useState("");
  const [baseWidth, setBaseWidth] = useState("1.2");
  const [tier, setTier] = useState<Tier>("TIER2");

  const reload = useCallback(async () => {
    if (!token) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [f, s] = await Promise.all([
        flagsNear(point.lat, point.lng, 2000, token),
        alleysNear(point.lat, point.lng, 2000, token),
      ]);
      setFlags(f);
      setSegments(s);
    } catch (err) {
      setError(toMessage(err));
    } finally {
      setLoading(false);
    }
  }, [token, point]);

  function onPick(p: MapClick) {
    setPoint({ lat: p.lat, lng: p.lng });
  }

  async function onSubmitFlag(e: FormEvent) {
    e.preventDefault();
    if (!token) {
      return;
    }
    setError(null);
    setNotice(null);
    try {
      await submitFlag(
        {
          type: flagType,
          lat: point.lat,
          lng: point.lng,
          note: note || undefined,
          radiusMeters: radius ? Number(radius) : undefined,
        },
        token,
      );
      setNotice(t.hazards.reported);
      setNote("");
      await reload();
    } catch (err) {
      setError(toMessage(err));
    }
  }

  async function onConfirm(flagId: string) {
    if (!token) {
      return;
    }
    setError(null);
    try {
      await confirmFlag(flagId, token);
      await reload();
    } catch (err) {
      setError(toMessage(err));
    }
  }

  async function onUnflag(flagId: string) {
    if (!token) {
      return;
    }
    setError(null);
    try {
      await unflag(flagId, token);
      await reload();
    } catch (err) {
      setError(toMessage(err));
    }
  }

  async function onSubmitAlley(e: FormEvent) {
    e.preventDefault();
    if (!token) {
      return;
    }
    setError(null);
    setNotice(null);
    try {
      await submitAlley(
        { lat: point.lat, lng: point.lng, baseWidth: Number(baseWidth), tier },
        token,
      );
      setNotice(t.hazards.alleySaved);
      await reload();
    } catch (err) {
      setError(toMessage(err));
    }
  }

  const input =
    "w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-base outline-none focus:border-green-700";
  const label = "text-xs font-medium text-neutral-500";
  const card = "rounded-2xl bg-white p-4 shadow-sm";

  return (
    <div className="mx-auto max-w-md p-4">
      <h1 className="text-lg font-semibold">{t.hazards.title}</h1>
      <p className="mt-1 text-xs text-neutral-500">{t.hazards.pickPoint}</p>
      <div className="relative mt-2 h-56 overflow-hidden rounded-2xl">
        <MapView onClick={onPick} />
      </div>
      <button
        type="button"
        onClick={() => void reload()}
        disabled={loading}
        className="mt-2 w-full rounded-xl bg-green-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
      >
        {point.lat.toFixed(5)}, {point.lng.toFixed(5)}
      </button>
      {error && (
        <p className="mt-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      {notice && (
        <p className="mt-2 rounded-xl bg-green-50 px-3 py-2 text-sm text-green-700">
          {notice}
        </p>
      )}
      <div className="mt-3 flex flex-col gap-3">
        {flags.length === 0 && !loading && (
          <p className="text-sm text-neutral-500">{t.hazards.empty}</p>
        )}
        {flags.map((f) => (
          <div key={f.id} className={card}>
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold">{f.type}</span>
              <span className="text-neutral-500">
                {f.voteCount ?? 0} {t.hazards.votes} · {f.status}
              </span>
            </div>
            {f.note && <p className="mt-1 text-sm">{f.note}</p>}
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() => void onConfirm(f.id)}
                className="rounded-lg bg-green-100 px-3 py-1 text-xs font-semibold text-green-800"
              >
                {t.hazards.confirm}
              </button>
              {f.reporterId === uid && (
                <button
                  type="button"
                  onClick={() => void onUnflag(f.id)}
                  className="rounded-lg bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-600"
                >
                  {t.hazards.unflag}
                </button>
              )}
            </div>
          </div>
        ))}
        <section className={card}>
          <h2 className="text-sm font-semibold">{t.hazards.submitFlag}</h2>
          <form onSubmit={onSubmitFlag} className="mt-2 flex flex-col gap-2">
            <label className={label}>
              <select
                className={input}
                value={flagType}
                onChange={(e) => setFlagType(e.target.value as FlagType)}
              >
                {FLAG_TYPES.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
            <label className={label}>
              {t.hazards.radius}
              <input
                className={input}
                type="number"
                min="25"
                max="3000"
                value={radius}
                onChange={(e) => setRadius(e.target.value)}
              />
            </label>
            <label className={label}>
              {t.hazards.note}
              <input
                className={input}
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </label>
            <button
              type="submit"
              className="rounded-xl bg-green-700 px-3 py-2 text-sm font-semibold text-white"
            >
              {t.common.save}
            </button>
          </form>
        </section>
        <section className={card}>
          <h2 className="text-sm font-semibold">
            {t.hazards.alleys} ({segments.length})
          </h2>
          {segments.length === 0 && (
            <p className="mt-1 text-sm text-neutral-500">{t.hazards.noAlleys}</p>
          )}
          {segments.map((s) => (
            <div
              key={s.id}
              className="mt-2 flex items-center justify-between rounded-xl bg-neutral-50 px-3 py-2 text-sm"
            >
              <span className="font-medium">{s.tier}</span>
              <span className="text-neutral-500">
                {t.vehicle.width}: {s.baseWidth} m
              </span>
            </div>
          ))}
          <form onSubmit={onSubmitAlley} className="mt-2 flex flex-col gap-2">
            <label className={label}>
              {t.vehicle.widthMeters}
              <input
                className={input}
                type="number"
                step="0.05"
                min="0.1"
                required
                value={baseWidth}
                onChange={(e) => setBaseWidth(e.target.value)}
              />
            </label>
            <label className={label}>
              {t.hazards.tier}
              <select
                className={input}
                value={tier}
                onChange={(e) => setTier(e.target.value as Tier)}
              >
                {TIERS.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="submit"
              className="rounded-xl bg-green-700 px-3 py-2 text-sm font-semibold text-white"
            >
              {t.hazards.submitAlley}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
