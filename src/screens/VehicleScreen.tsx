import { useEffect, useState, type FormEvent } from "react";
import { toMessage } from "../api/client";
import {
  addRideConfig,
  createProfile,
  listProfiles,
  type ConfigType,
  type VehicleProfile,
  type VehicleType,
} from "../api/vehicles";
import { useAuth } from "../context/AuthContext";
import { useStrings } from "../context/LanguageContext";
import { setRoutingWidth } from "../vehicleWidth";

const TYPES: VehicleType[] = ["SCOOTER", "CUB", "MANUAL"];
const CONFIGS: ConfigType[] = ["SOLO", "PASSENGER", "CARGO"];

export default function VehicleScreen() {
  const { t, lang, toggle } = useStrings();
  const { token, signOut } = useAuth();
  const [profiles, setProfiles] = useState<VehicleProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [type, setType] = useState<VehicleType>("SCOOTER");
  const [baseWidth, setBaseWidth] = useState("0.7");
  const [baseHeight, setBaseHeight] = useState("1.1");
  const [profileId, setProfileId] = useState("");
  const [configType, setConfigType] = useState<ConfigType>("SOLO");
  const [estWidth, setEstWidth] = useState("0.9");
  const [estHeight, setEstHeight] = useState("");

  async function reload(key: string) {
    setLoading(true);
    setError(null);
    try {
      const list = await listProfiles(key);
      setProfiles(list);
      if (!profileId && list.length > 0) {
        setProfileId(list[0].id);
      }
    } catch (err) {
      setError(toMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (token) {
      void reload(token);
    }
  }, [token]);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    if (!token) {
      return;
    }
    setError(null);
    setNotice(null);
    try {
      await createProfile(
        {
          type,
          baseWidth: Number(baseWidth),
          baseHeight: Number(baseHeight),
        },
        token,
      );
      await reload(token);
    } catch (err) {
      setError(toMessage(err));
    }
  }

  async function onRideConfig(e: FormEvent) {
    e.preventDefault();
    if (!token || !profileId) {
      return;
    }
    setError(null);
    setNotice(null);
    try {
      await addRideConfig(
        {
          profileId,
          configType,
          estWidth: estWidth ? Number(estWidth) : undefined,
          estHeight: estHeight ? Number(estHeight) : undefined,
        },
        token,
      );
      setNotice(t.vehicle.rideSaved);
      if (estWidth && Number(estWidth) > 0) {
        setRoutingWidth(Number(estWidth));
      }
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
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">{t.vehicle.title}</h1>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={toggle}
            className="rounded-full border border-neutral-300 px-3 py-1 text-xs font-medium"
          >
            {lang === "en" ? "VI" : "EN"}
          </button>
          <button
            type="button"
            onClick={() => void signOut()}
            className="rounded-full border border-neutral-300 px-3 py-1 text-xs font-medium"
          >
            ×
          </button>
        </div>
      </div>
      {loading && <p className="mt-4 text-sm text-neutral-500">{t.common.loading}</p>}
      {error && (
        <p className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      {notice && (
        <p className="mt-4 rounded-xl bg-green-50 px-3 py-2 text-sm text-green-700">
          {notice}
        </p>
      )}
      {!loading && !error && (
        <div className="mt-4 flex flex-col gap-4">
          <section className={card}>
            <h2 className="text-sm font-semibold">{t.vehicle.profiles}</h2>
            {profiles.length === 0 && (
              <p className="mt-2 text-sm text-neutral-500">{t.vehicle.none}</p>
            )}
            {profiles.map((p) => (
              <div
                key={p.id}
                className="mt-2 flex items-center justify-between rounded-xl bg-neutral-50 px-3 py-2 text-sm"
              >
                <span className="font-medium">{p.type}</span>
                <span className="text-neutral-500">
                  {t.vehicle.width}: {p.baseWidth} m
                </span>
              </div>
            ))}
          </section>
          <section className={card}>
            <h2 className="text-sm font-semibold">{t.vehicle.create}</h2>
            <form onSubmit={onCreate} className="mt-2 flex flex-col gap-2">
              <label className={label}>
                {t.vehicle.type}
                <select
                  className={input}
                  value={type}
                  onChange={(e) => setType(e.target.value as VehicleType)}
                >
                  {TYPES.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </label>
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
                {t.vehicle.height}
                <input
                  className={input}
                  type="number"
                  step="0.05"
                  min="0.1"
                  required
                  value={baseHeight}
                  onChange={(e) => setBaseHeight(e.target.value)}
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
          {profiles.length > 0 && (
            <section className={card}>
              <h2 className="text-sm font-semibold">{t.vehicle.rideSetup}</h2>
              <form onSubmit={onRideConfig} className="mt-2 flex flex-col gap-2">
                <label className={label}>
                  {t.vehicle.profiles}
                  <select
                    className={input}
                    value={profileId}
                    onChange={(e) => setProfileId(e.target.value)}
                  >
                    {profiles.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.type} · {p.baseWidth} m
                      </option>
                    ))}
                  </select>
                </label>
                <label className={label}>
                  {t.vehicle.load}
                  <select
                    className={input}
                    value={configType}
                    onChange={(e) => setConfigType(e.target.value as ConfigType)}
                  >
                    {CONFIGS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={label}>
                  {t.vehicle.estWidth}
                  <input
                    className={input}
                    type="number"
                    step="0.05"
                    min="0.1"
                    value={estWidth}
                    onChange={(e) => setEstWidth(e.target.value)}
                  />
                </label>
                <label className={label}>
                  {t.vehicle.estHeight}
                  <input
                    className={input}
                    type="number"
                    step="0.05"
                    min="0.1"
                    value={estHeight}
                    onChange={(e) => setEstHeight(e.target.value)}
                  />
                </label>
                <button
                  type="submit"
                  className="rounded-xl bg-green-700 px-3 py-2 text-sm font-semibold text-white"
                >
                  {t.vehicle.apply}
                </button>
              </form>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
