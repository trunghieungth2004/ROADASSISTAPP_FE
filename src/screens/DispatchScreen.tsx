import { useEffect, useState, type FormEvent } from "react";
import { toMessage } from "../api/client";
import {
  advanceTicket,
  createTicket,
  fetchStatuses,
  getTicket,
  type DispatchTicket,
  type StatusEntry,
  type TicketType,
} from "../api/dispatch";
import { useAuth } from "../context/AuthContext";
import { useStrings } from "../context/LanguageContext";
import { mapDefaults } from "../map/style";

const TICKET_TYPES: TicketType[] = ["MECHANIC", "TOW", "SOS"];
const LAST_TICKET_KEY = "roadassist.lastTicket";

export default function DispatchScreen() {
  const { t } = useStrings();
  const { token } = useAuth();
  const [ticketType, setTicketType] = useState<TicketType>("MECHANIC");
  const [lat, setLat] = useState(String(mapDefaults.center[1]));
  const [lng, setLng] = useState(String(mapDefaults.center[0]));
  const [lookupId, setLookupId] = useState(
    () => localStorage.getItem(LAST_TICKET_KEY) ?? "",
  );
  const [ticket, setTicket] = useState<DispatchTicket | null>(null);
  const [statuses, setStatuses] = useState<StatusEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      fetchStatuses(token)
        .then((all) => setStatuses(all.dispatch ?? []))
        .catch(() => setStatuses([]));
    }
  }, [token]);

  function useLocation() {
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(String(pos.coords.latitude));
        setLng(String(pos.coords.longitude));
      },
      (err) => setError(err.message),
      { timeout: 8000 },
    );
  }

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    if (!token) {
      return;
    }
    setError(null);
    setNotice(null);
    try {
      const created = await createTicket(
        { ticketType, lat: Number(lat), lng: Number(lng) },
        token,
      );
      setTicket(created);
      setLookupId(created.id);
      localStorage.setItem(LAST_TICKET_KEY, created.id);
      setNotice(t.dispatch.created);
    } catch (err) {
      setError(toMessage(err));
    }
  }

  async function onLookup(e: FormEvent) {
    e.preventDefault();
    if (!token || !lookupId) {
      return;
    }
    setError(null);
    try {
      setTicket(await getTicket(lookupId, token));
    } catch (err) {
      setError(toMessage(err));
    }
  }

  async function onAdvance(status: string) {
    if (!token || !ticket) {
      return;
    }
    setError(null);
    try {
      await advanceTicket(ticket.id, status, token);
      setTicket(await getTicket(ticket.id, token));
    } catch (err) {
      setError(toMessage(err));
    }
  }

  const input =
    "w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-base outline-none focus:border-green-700";
  const label = "text-xs font-medium text-neutral-500";
  const card = "rounded-2xl bg-white p-4 shadow-sm";
  const statusName =
    statuses.find((s) => s.code === ticket?.status)?.name ?? ticket?.status;

  return (
    <div className="mx-auto max-w-md p-4">
      <h1 className="text-lg font-semibold">{t.dispatch.title}</h1>
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
        <section className={card}>
          <h2 className="text-sm font-semibold">{t.dispatch.newTicket}</h2>
          <form onSubmit={onCreate} className="mt-2 flex flex-col gap-2">
            <label className={label}>
              <select
                className={input}
                value={ticketType}
                onChange={(e) => setTicketType(e.target.value as TicketType)}
              >
                {TICKET_TYPES.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex gap-2">
              <input
                className={input}
                type="number"
                step="any"
                required
                value={lat}
                onChange={(e) => setLat(e.target.value)}
                aria-label="lat"
              />
              <input
                className={input}
                type="number"
                step="any"
                required
                value={lng}
                onChange={(e) => setLng(e.target.value)}
                aria-label="lng"
              />
            </div>
            <button
              type="button"
              onClick={useLocation}
              className="rounded-xl bg-neutral-100 px-3 py-2 text-sm font-semibold text-neutral-700"
            >
              {t.dispatch.useLocation}
            </button>
            <button
              type="submit"
              className="rounded-xl bg-green-700 px-3 py-2 text-sm font-semibold text-white"
            >
              {t.dispatch.create}
            </button>
          </form>
        </section>
        <section className={card}>
          <h2 className="text-sm font-semibold">{t.dispatch.lookup}</h2>
          <form onSubmit={onLookup} className="mt-2 flex gap-2">
            <input
              className={input}
              placeholder={t.dispatch.ticketId}
              value={lookupId}
              onChange={(e) => setLookupId(e.target.value)}
            />
            <button
              type="submit"
              className="shrink-0 rounded-xl bg-green-700 px-3 py-2 text-sm font-semibold text-white"
            >
              {t.common.retry}
            </button>
          </form>
          {ticket ? (
            <div className="mt-2 rounded-xl bg-neutral-50 px-3 py-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-semibold">{ticket.ticketType}</span>
                <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-800">
                  {t.dispatch.statusNames}: {statusName}
                </span>
              </div>
              <p className="mt-1 text-xs text-neutral-500">
                {ticket.lat.toFixed(5)}, {ticket.lng.toFixed(5)}
              </p>
              {statuses.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {statuses
                    .filter((s) => s.code !== ticket.status)
                    .map((s) => (
                      <button
                        key={s.code}
                        type="button"
                        onClick={() => void onAdvance(s.code)}
                        className="rounded-lg bg-neutral-200 px-2 py-1 text-xs font-semibold text-neutral-700"
                      >
                        {t.dispatch.advance}: {s.name}
                      </button>
                    ))}
                </div>
              )}
            </div>
          ) : (
            <p className="mt-2 text-sm text-neutral-500">{t.dispatch.empty}</p>
          )}
        </section>
      </div>
    </div>
  );
}
