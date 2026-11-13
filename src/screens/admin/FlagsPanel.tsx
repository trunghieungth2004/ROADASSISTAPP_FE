import { useEffect, useMemo, useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { toMessage } from "../../api/client";
import {
  expireFlags,
  fetchAllFlags,
  moderateFlag,
  type AdminFlag,
} from "../../api/flags";
import { flagStatusColor, flagStatusLabel } from "../../components/flagStatus";
import { flagTypeLabel } from "../../i18n/labels";
import { useStrings } from "../../context/LanguageContext";
import AdminFlagMap from "./AdminFlagMap";
import StorageImage from "../../components/StorageImage";
import PhotoLightbox, { type PhotoPreview } from "../../components/PhotoLightbox";
import AdminListItem from "./AdminListItem";
import EmptyState from "./EmptyState";
import MasterDetail from "./MasterDetail";
import PanelHeader from "./PanelHeader";
import { ago } from "./format";

const FLAG_STATUSES = ["1", "2", "3", "4", "5"];

export default function FlagsPanel({ token }: { token: string | null }) {
  const { t } = useStrings();
  const [flags, setFlags] = useState<AdminFlag[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [preview, setPreview] = useState<PhotoPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function load(key: string) {
    setError(null);
    try {
      setFlags(await fetchAllFlags(key));
    } catch (err) {
      setError(toMessage(err));
    }
  }

  useEffect(() => {
    if (token) void load(token);
  }, [token]);

  const visible = useMemo(
    () =>
      flags.filter(
        (flag) =>
          (filter === "ALL" || flag.status === filter) &&
          (typeFilter === "ALL" || flag.type === typeFilter),
      ),
    [flags, filter, typeFilter],
  );
  const selected = flags.find((flag) => flag.id === selectedId) ?? null;

  function select(flag: AdminFlag) {
    setSelectedId(flag.id);
    setStatus(flag.status);
    setNotice(null);
  }

  async function onModerate() {
    if (!token || !selected) return;
    setError(null);
    try {
      await moderateFlag(selected.id, status, token);
      await load(token);
      setNotice(t.admin.saved);
    } catch (err) {
      setError(toMessage(err));
    }
  }

  async function onExpire() {
    if (!token) return;
    setError(null);
    try {
      const result = await expireFlags(token);
      await load(token);
      setNotice(`${t.admin.expired}: ${result.expired}`);
    } catch (err) {
      setError(toMessage(err));
    }
  }

  return (
    <Box>
      <PanelHeader
        title={t.admin.flags}
        onRefresh={() => token && void load(token)}
        refreshLabel={t.admin.refresh}
        action={
          <Button size="small" variant="outlined" onClick={() => void onExpire()}>
            {t.admin.runExpiry}
          </Button>
        }
      />
      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
      {notice ? <Alert severity="success" sx={{ mb: 2 }}>{notice}</Alert> : null}
      <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap", mb: 2 }}>
        <Chip
          size="small"
          label={t.admin.allStatuses}
          color={filter === "ALL" ? "primary" : "default"}
          variant={filter === "ALL" ? "filled" : "outlined"}
          onClick={() => setFilter("ALL")}
        />
        {FLAG_STATUSES.map((value) => (
          <Chip
            key={value}
            size="small"
            label={`${flagStatusLabel(value, t)} (${value})`}
            color={filter === value ? "primary" : "default"}
            variant={filter === value ? "filled" : "outlined"}
            onClick={() => setFilter(value)}
          />
        ))}
      </Box>
      <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap", mb: 2 }}>
        {["ALL", "FLOOD", "OBSTRUCTION", "ACCIDENT"].map((value) => (
          <Chip
            key={value}
            size="small"
            label={value === "ALL" ? t.admin.all : flagTypeLabel(value, t)}
            color={typeFilter === value ? "primary" : "default"}
            variant={typeFilter === value ? "filled" : "outlined"}
            onClick={() => setTypeFilter(value)}
          />
        ))}
      </Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap", mb: 2 }}>
        <Typography variant="caption" color="text.secondary">
          {t.admin.legend}
        </Typography>
        {FLAG_STATUSES.map((value) => (
          <Box key={value} sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: flagStatusColor(value) }} />
            <Typography variant="caption" color="text.secondary">
              {flagStatusLabel(value, t)}
            </Typography>
          </Box>
        ))}
      </Box>
      <MasterDetail
        empty={t.admin.selectPrompt}
        list={visible.length === 0 ? <EmptyState message={t.admin.noFlags} /> : visible.map((flag) => (
          <AdminListItem
            key={flag.id}
            selected={flag.id === selectedId}
            onClick={() => select(flag)}
            title={flag.type}
            subtitle={`${flag.lat.toFixed(5)}, ${flag.lng.toFixed(5)} · ${t.admin.votes}: ${flag.voteCount ?? 0}${flag.createdAt ? ` · ${ago(flag.createdAt, t)}` : ""}`}
            chip={flagStatusLabel(flag.status, t)}
            chipColor={
              flag.status === "2" ? "error" : flag.status === "1" ? "warning" : "default"
            }
          />
        ))}
        detail={
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Card>
              <Box
                sx={{
                  position: "relative",
                  height: 300,
                  borderRadius: 4,
                  overflow: "hidden",
                }}
              >
                <AdminFlagMap
                  flags={visible}
                  selectedId={selectedId}
                  onSelect={select}
                />
              </Box>
            </Card>
            {selected ? (
              <Card>
                <CardContent sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Typography variant="h6" sx={{ flexGrow: 1 }}>
                      {selected.type}
                    </Typography>
                    <Chip
                      size="small"
                      label={flagStatusLabel(selected.status, t)}
                      sx={{ bgcolor: flagStatusColor(selected.status), color: "#fff" }}
                    />
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    {selected.lat.toFixed(5)}, {selected.lng.toFixed(5)} · {t.admin.votes}: {selected.voteCount ?? 0}
                    {selected.createdAt ? ` · ${ago(selected.createdAt, t)}` : ""}
                  </Typography>
                  {selected.reporterUid ? (
                    <Typography variant="caption" color="text.secondary">
                      {selected.reporterUid}
                    </Typography>
                  ) : null}
                  {selected.note ? (
                    <Typography variant="body2">{selected.note}</Typography>
                  ) : null}
                  {Array.isArray(selected.photoUrls) && selected.photoUrls.length > 0 ? (
                    <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                      {selected.photoUrls.map((url, index) => (
                        <Box
                          key={url}
                          sx={{
                            width: 96,
                            height: 96,
                            borderRadius: 2,
                            overflow: "hidden",
                            border: 1,
                            borderColor: "divider",
                          }}
                        >
                          <StorageImage
                            path={url}
                            sx={{ width: "100%", height: "100%" }}
                            onClick={() =>
                              setPreview({ photos: selected.photoUrls ?? [], index })
                            }
                          />
                        </Box>
                      ))}
                    </Box>
                  ) : null}
                  <Box sx={{ display: "flex", gap: 1 }}>
                    <TextField
                      select
                      size="small"
                      label={t.admin.flagStatus}
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      fullWidth
                    >
                      {FLAG_STATUSES.map((value) => (
                        <MenuItem key={value} value={value}>
                          {flagStatusLabel(value, t)} ({value})
                        </MenuItem>
                      ))}
                    </TextField>
                    <Button size="small" variant="contained" onClick={() => void onModerate()}>
                      {t.admin.apply}
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            ) : null}
          </Box>
        }
      />
      <PhotoLightbox
        preview={preview}
        onClose={() => setPreview(null)}
        onChange={(index) => setPreview((prev) => (prev ? { ...prev, index } : prev))}
      />
    </Box>
  );
}
