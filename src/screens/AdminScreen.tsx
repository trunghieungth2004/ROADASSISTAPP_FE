import { useEffect, useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Container from "@mui/material/Container";
import MenuItem from "@mui/material/MenuItem";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { toMessage } from "../api/client";
import {
  fetchAllUsers,
  updateUserRole,
  updateUserStatus,
  updateUserTrust,
  type AdminUser,
} from "../api/users";
import {
  expireFlags,
  fetchAllFlags,
  moderateFlag,
  type AdminFlag,
} from "../api/flags";
import {
  fetchAlleySegment,
  moderateSegment,
  type AlleySegment,
  type Tier,
} from "../api/alleys";
import { useAuth } from "../context/AuthContext";
import { useStrings } from "../context/LanguageContext";
import { flagStatusColor, flagStatusLabel } from "../components/flagStatus";
import { tierLabel } from "../i18n/labels";

const FLAG_STATUSES = ["1", "2", "3", "4", "5"];

export default function AdminScreen() {
  const { t } = useStrings();
  const { token } = useAuth();
  const [tab, setTab] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [query, setQuery] = useState("");
  const [trust, setTrust] = useState<Record<string, string>>({});
  const [flags, setFlags] = useState<AdminFlag[]>([]);
  const [flagStatus, setFlagStatus] = useState<Record<string, string>>({});
  const [segmentId, setSegmentId] = useState("");
  const [segment, setSegment] = useState<AlleySegment | null>(null);
  const [segWidth, setSegWidth] = useState("");
  const [segWire, setSegWire] = useState("");
  const [segIncline, setSegIncline] = useState("");
  const [segTier, setSegTier] = useState<Tier>("TIER2");
  const [segVerified, setSegVerified] = useState("");

  async function loadUsers(key: string) {
    setError(null);
    try {
      setUsers(await fetchAllUsers(key));
    } catch (err) {
      setError(toMessage(err));
    }
  }

  async function loadFlags(key: string) {
    setError(null);
    try {
      setFlags(await fetchAllFlags(key));
    } catch (err) {
      setError(toMessage(err));
    }
  }

  useEffect(() => {
    if (token) {
      void loadUsers(token);
      void loadFlags(token);
    }
  }, [token]);

  async function onRole(u: AdminUser, role: string) {
    if (!token) {
      return;
    }
    setError(null);
    setNotice(null);
    try {
      await updateUserRole(u.id, role, token);
      await loadUsers(token);
      setNotice(t.admin.saved);
    } catch (err) {
      setError(toMessage(err));
    }
  }

  async function onStatus(u: AdminUser, status: string) {
    if (!token) {
      return;
    }
    setError(null);
    setNotice(null);
    try {
      await updateUserStatus(u.id, status, token);
      await loadUsers(token);
      setNotice(t.admin.saved);
    } catch (err) {
      setError(toMessage(err));
    }
  }

  async function onTrust(u: AdminUser) {
    if (!token) {
      return;
    }
    const score = Number(trust[u.id] ?? "");
    if (!Number.isFinite(score)) {
      return;
    }
    setError(null);
    setNotice(null);
    try {
      await updateUserTrust(u.id, score, token);
      await loadUsers(token);
      setNotice(t.admin.saved);
    } catch (err) {
      setError(toMessage(err));
    }
  }

  async function onModerate(f: AdminFlag) {
    if (!token) {
      return;
    }
    const status = flagStatus[f.id] ?? f.status;
    setError(null);
    setNotice(null);
    try {
      await moderateFlag(f.id, status, token);
      await loadFlags(token);
      setNotice(t.admin.saved);
    } catch (err) {
      setError(toMessage(err));
    }
  }

  async function onExpire() {
    if (!token) {
      return;
    }
    setError(null);
    setNotice(null);
    try {
      const res = await expireFlags(token);
      await loadFlags(token);
      setNotice(`${t.admin.expired}: ${res.expired}`);
    } catch (err) {
      setError(toMessage(err));
    }
  }

  async function onLoadSegment() {
    if (!token || !segmentId.trim()) {
      return;
    }
    setError(null);
    setNotice(null);
    try {
      const seg = await fetchAlleySegment(segmentId.trim(), token);
      setSegment(seg);
      setSegWidth(seg.baseWidth != null ? String(seg.baseWidth) : "");
      setSegWire(seg.wireHeight != null ? String(seg.wireHeight) : "");
      setSegIncline(seg.inclinePct != null ? String(seg.inclinePct) : "");
      setSegTier((seg.tier as Tier) ?? "TIER2");
      setSegVerified(
        seg.verifiedCount != null ? String(seg.verifiedCount) : "",
      );
    } catch (err) {
      setSegment(null);
      setError(toMessage(err));
    }
  }

  async function onSaveSegment() {
    if (!token || !segment) {
      return;
    }
    setError(null);
    setNotice(null);
    try {
      await moderateSegment(
        segment.id,
        {
          ...(segWidth !== "" ? { baseWidth: Number(segWidth) } : {}),
          ...(segWire !== "" ? { wireHeight: Number(segWire) } : {}),
          ...(segIncline !== "" ? { inclinePct: Number(segIncline) } : {}),
          tier: segTier,
          ...(segVerified !== ""
            ? { verifiedCount: Number(segVerified) }
            : {}),
        },
        token,
      );
      setNotice(t.admin.saved);
    } catch (err) {
      setError(toMessage(err));
    }
  }

  const visibleUsers = users.filter((u) => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return true;
    }
    return (
      (u.email ?? "").toLowerCase().includes(q) ||
      (u.displayName ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <Container maxWidth="sm" sx={{ py: 2, overflowY: "auto", height: "100%" }}>
      <Typography variant="h6">{t.admin.title}</Typography>
      {error && (
        <Alert severity="error" sx={{ mt: 1 }}>
          {error}
        </Alert>
      )}
      {notice && (
        <Alert severity="success" sx={{ mt: 1 }}>
          {notice}
        </Alert>
      )}
      <Tabs value={tab} onChange={(_, v: number) => setTab(v)} sx={{ mt: 1 }}>
        <Tab label={t.admin.users} />
        <Tab label={t.admin.flags} />
        <Tab label={t.admin.alleys} />
      </Tabs>
      {tab === 0 && (
        <Box sx={{ mt: 2, display: "flex", flexDirection: "column", gap: 1 }}>
          <Box sx={{ display: "flex", gap: 1 }}>
            <TextField
              size="small"
              label={t.admin.search}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              fullWidth
            />
            <Button
              variant="outlined"
              onClick={() => token && void loadUsers(token)}
            >
              {t.admin.refresh}
            </Button>
          </Box>
          {visibleUsers.map((u) => (
            <Card key={u.id}>
              <CardContent
                sx={{ display: "flex", flexDirection: "column", gap: 1 }}
              >
                <Typography variant="subtitle2">
                  {u.displayName || u.email || u.id}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {u.email ?? ""} · {t.admin.trust}: {u.trustScore ?? 0}
                </Typography>
                <Box sx={{ display: "flex", gap: 1 }}>
                  <TextField
                    select
                    size="small"
                    label={t.admin.role}
                    value={u.role}
                    onChange={(e) => void onRole(u, e.target.value)}
                    sx={{ minWidth: 120 }}
                  >
                    <MenuItem value="1">{t.admin.admin}</MenuItem>
                    <MenuItem value="2">{t.admin.user}</MenuItem>
                  </TextField>
                  <TextField
                    select
                    size="small"
                    label={t.admin.status}
                    value={u.status ?? "1"}
                    onChange={(e) => void onStatus(u, e.target.value)}
                    sx={{ minWidth: 120 }}
                  >
                    <MenuItem value="1">{t.admin.active}</MenuItem>
                    <MenuItem value="0">{t.admin.blocked}</MenuItem>
                  </TextField>
                  <TextField
                    size="small"
                    type="number"
                    label={t.admin.trust}
                    value={trust[u.id] ?? String(u.trustScore ?? 0)}
                    onChange={(e) =>
                      setTrust((prev) => ({ ...prev, [u.id]: e.target.value }))
                    }
                    sx={{ width: 110 }}
                  />
                  <Button size="small" onClick={() => void onTrust(u)}>
                    {t.admin.save}
                  </Button>
                </Box>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}
      {tab === 1 && (
        <Box sx={{ mt: 2, display: "flex", flexDirection: "column", gap: 1 }}>
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button
              variant="outlined"
              onClick={() => token && void loadFlags(token)}
            >
              {t.admin.refresh}
            </Button>
            <Button variant="outlined" onClick={() => void onExpire()}>
              {t.admin.runExpiry}
            </Button>
          </Box>
          {flags.map((f) => (
            <Card key={f.id}>
              <CardContent
                sx={{ display: "flex", flexDirection: "column", gap: 1 }}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 1,
                  }}
                >
                  <Typography variant="subtitle2">{f.type}</Typography>
                  <Typography
                    variant="caption"
                    sx={{ color: flagStatusColor(f.status) }}
                  >
                    {flagStatusLabel(f.status, t)} ({f.status})
                  </Typography>
                </Box>
                <Typography variant="caption" color="text.secondary">
                  {f.lat.toFixed(5)}, {f.lng.toFixed(5)} ·{" "}
                  {t.admin.votes}: {f.voteCount ?? 0}
                  {f.reporterUid ? ` · ${f.reporterUid.slice(0, 8)}` : ""}
                </Typography>
                <Box sx={{ display: "flex", gap: 1 }}>
                  <TextField
                    select
                    size="small"
                    label={t.admin.flagStatus}
                    value={flagStatus[f.id] ?? f.status}
                    onChange={(e) =>
                      setFlagStatus((prev) => ({
                        ...prev,
                        [f.id]: e.target.value,
                      }))
                    }
                    fullWidth
                  >
                    {FLAG_STATUSES.map((s) => (
                      <MenuItem key={s} value={s}>
                        {flagStatusLabel(s, t)} ({s})
                      </MenuItem>
                    ))}
                  </TextField>
                  <Button size="small" onClick={() => void onModerate(f)}>
                    {t.admin.apply}
                  </Button>
                </Box>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}
      {tab === 2 && (
        <Box sx={{ mt: 2, display: "flex", flexDirection: "column", gap: 1 }}>
          <Box sx={{ display: "flex", gap: 1 }}>
            <TextField
              size="small"
              label={t.admin.segmentId}
              value={segmentId}
              onChange={(e) => setSegmentId(e.target.value)}
              fullWidth
            />
            <Button variant="outlined" onClick={() => void onLoadSegment()}>
              {t.admin.load}
            </Button>
          </Box>
          {segment && (
            <Card>
              <CardContent
                sx={{ display: "flex", flexDirection: "column", gap: 2 }}
              >
                <Typography variant="subtitle2">{segment.id}</Typography>
                <TextField
                  size="small"
                  type="number"
                  label={t.admin.baseWidth}
                  value={segWidth}
                  onChange={(e) => setSegWidth(e.target.value)}
                  fullWidth
                />
                <TextField
                  size="small"
                  type="number"
                  label={t.admin.wireHeight}
                  value={segWire}
                  onChange={(e) => setSegWire(e.target.value)}
                  fullWidth
                />
                <TextField
                  size="small"
                  type="number"
                  label={t.admin.incline}
                  value={segIncline}
                  onChange={(e) => setSegIncline(e.target.value)}
                  fullWidth
                />
                <TextField
                  select
                  size="small"
                  label={t.admin.tier}
                  value={segTier}
                  onChange={(e) => setSegTier(e.target.value as Tier)}
                  fullWidth
                >
                  {(["TIER1", "TIER2", "TIER3"] as Tier[]).map((tier) => (
                    <MenuItem key={tier} value={tier}>
                      {tierLabel(tier, t)}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  size="small"
                  type="number"
                  label={t.admin.verified}
                  value={segVerified}
                  onChange={(e) => setSegVerified(e.target.value)}
                  fullWidth
                />
                <Button variant="contained" onClick={() => void onSaveSegment()}>
                  {t.admin.save}
                </Button>
              </CardContent>
            </Card>
          )}
        </Box>
      )}
    </Container>
  );
}
