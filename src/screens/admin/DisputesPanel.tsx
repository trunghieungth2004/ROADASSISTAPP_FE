import { useEffect, useMemo, useState } from "react";
import Accordion from "@mui/material/Accordion";
import AccordionDetails from "@mui/material/AccordionDetails";
import AccordionSummary from "@mui/material/AccordionSummary";
import Alert from "@mui/material/Alert";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Divider from "@mui/material/Divider";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { toMessage } from "../../api/client";
import {
  adminDismissDispute,
  adminDisputes,
  adminResolveDispute,
  type AdminDispute,
} from "../../api/admin";
import { adminChatMessages, type ChatMessage } from "../../api/chat";
import { useStrings } from "../../context/LanguageContext";
import { initials } from "../../components/ui/ProfileHeader";
import StorageImage from "../../components/StorageImage";
import PhotoLightbox, { type PhotoPreview } from "../../components/PhotoLightbox";
import EmptyState from "./EmptyState";
import SettingField from "./SettingField";
import AdminListItem from "./AdminListItem";
import TicketTimeline from "./TicketTimeline";
import { ticketStatusLabel } from "./ticketStatus";
import MasterDetail from "./MasterDetail";
import PanelHeader from "./PanelHeader";
import { useAdminQueue } from "./AdminQueueContext";
import { useAdminBill } from "./AdminBillContext";
import { adminStatusLabel, adminStatusTone, disputeOutcomeLabel, humanizeEnum } from "./adminLabels";
import { ago, money } from "./format";

type Draft = { resolution: string; outcome: string; adjustedAmount: string };

const EMPTY: Draft = { resolution: "", outcome: "", adjustedAmount: "" };

const prettyDispute = (type: string, reason: string): string =>
  humanizeEnum(type === reason ? type : reason);

const MONETARY_DISPUTE_TYPES = new Set([
  "FARE_DISPUTE",
  "SERVICE_QUALITY",
  "UNFIXABLE_DISAGREEMENT",
  "RIDER_PAYMENT",
]);

export default function DisputesPanel({ token }: { token: string | null }) {
  const { t } = useStrings();
  const { openBill } = useAdminBill();
  const { refresh } = useAdminQueue();
  const [disputes, setDisputes] = useState<AdminDispute[]>([]);
  const [filter, setFilter] = useState("ALL");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [dismissOpen, setDismissOpen] = useState(false);
  const [dismissNote, setDismissNote] = useState("");
  const [preview, setPreview] = useState<PhotoPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load(key: string) {
    setError(null);
    try {
      setDisputes(await adminDisputes(key));
    } catch (err) {
      setError(toMessage(err));
    }
  }

  useEffect(() => {
    if (token) void load(token);
  }, [token]);

  const visible = filter === "ALL" ? disputes : disputes.filter((dispute) => dispute.status === filter);
  const groups = useMemo(() => {
    const map = new Map<string, AdminDispute[]>();
    for (const dispute of visible) {
      const rows = map.get(dispute.ticketId) ?? [];
      rows.push(dispute);
      map.set(dispute.ticketId, rows);
    }
    return [...map.entries()]
      .map(([ticketId, rows]) => ({ ticketId, rows }))
      .sort((a, b) =>
        (b.rows[0]?.createdAt ?? "").localeCompare(a.rows[0]?.createdAt ?? ""),
      );
  }, [visible]);
  const selected = disputes.find((dispute) => dispute.id === selectedId) ?? null;
  const open = selected !== null && selected.status !== "RESOLVED" && selected.status !== "DISMISSED";

  useEffect(() => {
    if (!token || !selected) {
      setMessages([]);
      return;
    }
    let alive = true;
    void adminChatMessages(selected.ticketId, token)
      .then((result) => {
        if (alive) setMessages(result.messages);
      })
      .catch(() => {
        if (alive) setMessages([]);
      });
    return () => {
      alive = false;
    };
  }, [token, selected?.id]);

  function select(dispute: AdminDispute) {
    setSelectedId(dispute.id);
    setDraft(EMPTY);
    setNotice(null);
  }

  function askResolve() {
    if (!selected) return;
    if (draft.outcome === "") {
      setError(t.admin.outcomeRequired);
      return;
    }
    if (draft.resolution.trim() === "") {
      setError(t.admin.noteRequired);
      return;
    }
    if (draft.outcome === "PARTIAL" && draft.adjustedAmount.trim() === "") {
      setError(t.admin.adjustedAmount);
      return;
    }
    setError(null);
    setConfirmOpen(true);
  }

  async function resolve() {
    if (!token || !selected || busy) return;
    setBusy(true);
    setError(null);
    try {
      await adminResolveDispute(token, {
        disputeId: selected.id,
        resolution: draft.resolution.trim(),
        ...(draft.outcome ? { outcome: draft.outcome } : {}),
        ...(draft.adjustedAmount !== "" ? { adjustedAmount: Number(draft.adjustedAmount) } : {}),
      });
      setConfirmOpen(false);
      await load(token);
      refresh();
      setNotice(t.admin.saved);
    } catch (err) {
      setError(toMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function dismissDispute() {
    if (!token || !selected || busy) return;
    setBusy(true);
    setError(null);
    try {
      await adminDismissDispute(token, {
        disputeId: selected.id,
        ...(dismissNote.trim() ? { resolution: dismissNote.trim() } : {}),
      });
      setDismissOpen(false);
      setDismissNote("");
      await load(token);
      refresh();
      setNotice(t.admin.saved);
    } catch (err) {
      setError(toMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const context = selected?.context;
  const ticket = context?.ticket ?? null;
  const rider = context?.rider ?? null;
  const provider = context?.provider ?? null;
  const filer = context?.filer ?? null;
  const riderRole =
    filer === "RIDER" ? t.admin.filed : selected?.accusedKind === "RIDER" ? t.admin.accused : null;
  const providerRole =
    filer === "PROVIDER"
      ? t.admin.filed
      : selected && selected.accusedKind !== "RIDER"
        ? t.admin.accused
        : null;
  const effectText =
    draft.outcome === "SHOP"
      ? t.admin.effectShop
      : draft.outcome === "RIDER"
        ? t.admin.effectRider
        : draft.outcome === "PARTIAL"
          ? t.admin.effectPartial
          : "";

  return (
    <Box>
      <PanelHeader
        title={t.admin.disputes}
        onRefresh={() => token && void load(token)}
        refreshLabel={t.admin.refresh}
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
        {["OPEN", "RESOLVED", "DISMISSED"].map((value) => (
          <Chip
            key={value}
            size="small"
            label={value}
            color={filter === value ? "primary" : "default"}
            variant={filter === value ? "filled" : "outlined"}
            onClick={() => setFilter(value)}
          />
        ))}
      </Box>
      {visible.length === 0 ? (
        <EmptyState message={t.admin.noDisputes} />
      ) : (
        <MasterDetail
          empty={t.admin.selectPrompt}
          list={groups.map((group) => {
            const openRow = group.rows.find((row) => row.status === "OPEN");
            return (
              <Accordion
                key={group.ticketId}
                disableGutters
                sx={{ border: 1, borderColor: "divider", borderRadius: 2, "&:before": { display: "none" } }}
              >
                <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ px: 1.5 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, width: "100%", pr: 1, minWidth: 0 }}>
                    <Typography variant="subtitle2" noWrap sx={{ minWidth: 0 }}>
                      {`${t.admin.ticketContext}: ${group.ticketId}`}
                    </Typography>
                    <Chip size="small" label={group.rows.length} sx={{ ml: "auto" }} />
                    <Chip
                      size="small"
                      color={openRow ? "warning" : "default"}
                      label={openRow ? openRow.status : group.rows[0]?.status ?? ""}
                    />
                  </Box>
                </AccordionSummary>
                <AccordionDetails sx={{ p: 0, display: "flex", flexDirection: "column", gap: 1 }}>
                  {group.rows.map((dispute) => (
                    <AdminListItem
                      key={dispute.id}
                      selected={dispute.id === selectedId}
                      onClick={() => select(dispute)}
                      title={prettyDispute(dispute.type, dispute.reasonCode)}
                      subtitle={`${t.admin.filed}: ${ago(dispute.createdAt, t)}`}
                      chip={adminStatusLabel(dispute.status, t)}
                      chipColor={adminStatusTone(dispute.status)}
                    />
                  ))}
                </AccordionDetails>
              </Accordion>
            );
          })}
          detail={
            selected ? (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <Card>
                  <CardContent sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                      <Typography variant="h6" sx={{ flexGrow: 1 }}>
                        {prettyDispute(selected.type, selected.reasonCode)}
                      </Typography>
                      {selected.hold ? <Chip size="small" color="error" label="HOLD" /> : null}
                      <Chip size="small" label={adminStatusLabel(selected.status, t)} color={adminStatusTone(selected.status)} />
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      {`${t.admin.disputedTicket}: ${selected.ticketId} · ${t.admin.filed}: ${ago(selected.createdAt, t)}`}
                    </Typography>
                    {filer ? (
                      <Typography variant="caption" color="text.secondary">
                        {`${t.admin.filedBy}: ${filer === "RIDER" ? t.admin.riderParty : filer === "PROVIDER" ? t.admin.providerParty : filer === "SYSTEM" ? t.admin.system : t.admin.admin}`}
                      </Typography>
                    ) : null}
                  </CardContent>
                </Card>
                {selected.hold ? <Alert severity="warning">{t.admin.disputeHoldNote}</Alert> : null}
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                    gap: 2,
                  }}
                >
                  <Card>
                    <CardContent sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Avatar sx={{ bgcolor: "primary.main", width: 36, height: 36 }}>
                          {initials(rider?.name ?? t.admin.riderParty)}
                        </Avatar>
                        <Box sx={{ minWidth: 0 }}>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                            <Typography variant="subtitle2" noWrap>
                              {rider?.name ?? t.admin.riderParty}
                            </Typography>
                            {riderRole ? <Chip size="small" label={riderRole} /> : null}
                          </Box>
                          <Typography variant="caption" color="text.secondary" noWrap>
                            {rider?.email ?? selected.filedBy}
                          </Typography>
                        </Box>
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        {`${t.admin.rating}: ${rider ? rider.ratingAvg.toFixed(1) : "—"} (${rider?.ratingCount ?? 0}) · ${t.admin.trust}: ${rider?.trustScore ?? 0}`}
                      </Typography>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Avatar sx={{ bgcolor: "secondary.main", width: 36, height: 36 }}>
                          {initials(provider?.name ?? t.admin.providerParty)}
                        </Avatar>
                        <Box sx={{ minWidth: 0 }}>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                            <Typography variant="subtitle2" noWrap>
                              {provider?.name ?? t.admin.providerParty}
                            </Typography>
                            {providerRole ? <Chip size="small" label={providerRole} /> : null}
                          </Box>
                          <Typography variant="caption" color="text.secondary" noWrap>
                            {provider ? `${provider.kind} · ${provider.status}` : selected.accusedId ?? selected.accusedKind}
                          </Typography>
                        </Box>
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        {`${t.admin.rating}: ${provider ? provider.ratingAvg.toFixed(1) : "—"} (${provider?.ratingCount ?? 0}) · ${t.admin.declines}: ${provider?.declineCount ?? 0}`}
                        {provider?.suspended ? ` · ${t.admin.suspendedNote}` : ""}
                      </Typography>
                    </CardContent>
                  </Card>
                </Box>
                <Card>
                  <CardContent sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                    <Typography variant="subtitle2">{t.admin.ticketContext}</Typography>
                    {ticket ? (
                      <>
                        <Typography variant="body2">
                          {`${ticket.ticketType} · ${ticketStatusLabel(ticket.status, t)}${ticket.paymentStatus ? ` · ${ticket.paymentStatus}` : ""}`}
                        </Typography>
                        {ticket.destinationDecline ? (
                          <Typography variant="body2" color="text.secondary">
                            {`${t.admin.declineReason}: ${ticket.destinationDecline.reasonCode}${ticket.destinationDecline.at ? ` · ${ago(ticket.destinationDecline.at, t)}` : ""}`}
                          </Typography>
                        ) : null}
                        <TicketTimeline history={ticket.statusHistory} t={t} />
                        <Button size="small" variant="outlined" sx={{ alignSelf: "flex-start" }} onClick={() => openBill(selected.ticketId)}>
                          {`${t.admin.viewBill} · ${selected.ticketId}`}
                        </Button>
                        {ticket.symptom ? <Typography variant="body2">{ticket.symptom}</Typography> : null}
                        {ticket.description ? (
                          <Typography variant="body2" color="text.secondary">
                            {ticket.description}
                          </Typography>
                        ) : null}
                        <Typography variant="body2" color="text.secondary">
                          {`${t.admin.quote}: ${ticket.quoteAmount === null ? "—" : money(ticket.quoteAmount)} · ${t.admin.waitingFee}: ${ticket.waitingFee === null ? "—" : money(ticket.waitingFee)}`}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {`${t.admin.currentCharge}: ${ticket.finalAmount === null ? "—" : money(ticket.finalAmount)}`}
                        </Typography>
                        {ticket.photoUrls.length > 0 ? (
                          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                            {ticket.photoUrls.map((url, index) => (
                              <Box
                                key={url}
                                sx={{ width: 84, height: 84, borderRadius: 2, overflow: "hidden", border: 1, borderColor: "divider" }}
                              >
                                <StorageImage
                                  path={url}
                                  sx={{ width: "100%", height: "100%" }}
                                  onClick={() => setPreview({ photos: ticket.photoUrls, index })}
                                />
                              </Box>
                            ))}
                          </Box>
                        ) : null}
                      </>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        {t.admin.noContext}
                      </Typography>
                    )}
                  </CardContent>
                </Card>
                <Card>
                  <CardContent sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                    <Typography variant="subtitle2">{t.admin.evidence}</Typography>
                    {selected.note ? <Typography variant="body2">{selected.note}</Typography> : null}
                    {Array.isArray(selected.photoUrls) && selected.photoUrls.length > 0 ? (
                      <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                        {selected.photoUrls.map((url, index) => (
                          <Box
                            key={url}
                            sx={{ width: 84, height: 84, borderRadius: 2, overflow: "hidden", border: 1, borderColor: "divider" }}
                          >
                            <StorageImage
                              path={url}
                              sx={{ width: "100%", height: "100%" }}
                              onClick={() => setPreview({ photos: selected.photoUrls ?? [], index })}
                            />
                          </Box>
                        ))}
                      </Box>
                    ) : null}
                    {selected.outcome ? (
                      <Typography variant="body2">
                        {`${t.admin.outcome}: ${disputeOutcomeLabel(selected.outcome, t)}${typeof selected.adjustedAmount === "number" ? ` · ${money(selected.adjustedAmount)}` : ""}`}
                      </Typography>
                    ) : null}
                    {selected.resolution ? (
                      <Typography variant="caption" color="text.secondary">
                        {selected.resolution}
                      </Typography>
                    ) : null}
                  </CardContent>
                </Card>
                <Card>
                  <CardContent sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                    <Typography variant="subtitle2">{t.admin.disputeHistory}</Typography>
                    {(context?.history ?? []).length === 0 ? (
                      <Typography variant="body2" color="text.secondary">
                        {t.admin.noHistory}
                      </Typography>
                    ) : (
                      (context?.history ?? []).map((row) => (
                        <Box key={row.id} sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                          <Typography variant="body2" sx={{ flexGrow: 1 }}>
                            {prettyDispute(row.type, row.reasonCode)}
                          </Typography>
                          {row.id === selected.id ? (
                            <Chip size="small" variant="outlined" label={t.admin.current} />
                          ) : null}
                          {row.outcome ? (
                            <Typography variant="caption" color="text.secondary">
                              {row.outcome}
                            </Typography>
                          ) : null}
                          <Chip
                            size="small"
                            color={row.status === "OPEN" ? "warning" : "default"}
                            label={row.status}
                          />
                          <Typography variant="caption" color="text.secondary">
                            {ago(row.createdAt, t)}
                          </Typography>
                        </Box>
                      ))
                    )}
                  </CardContent>
                </Card>
                <Card>
                  <CardContent sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                    <Typography variant="subtitle2">{t.admin.payments}</Typography>
                    {(context?.payments ?? []).length === 0 ? (
                      <Typography variant="body2" color="text.secondary">
                        {t.admin.noPayments}
                      </Typography>
                    ) : (
                      (context?.payments ?? []).map((payment) => (
                        <Box key={payment.id} sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                          <Typography variant="body2" sx={{ flexGrow: 1 }}>
                            {`${money(payment.amount)} · ${payment.method}`}
                          </Typography>
                          <Chip size="small" label={payment.status} variant="outlined" />
                          {payment.disputeHold ? (
                            <Chip size="small" color="warning" label={t.admin.disputed} />
                          ) : null}
                          {payment.refundAmount !== null ? (
                            <Typography variant="caption" color="text.secondary">
                              {`${t.admin.paymentRefunded}: ${money(payment.refundAmount)}`}
                            </Typography>
                          ) : null}
                        </Box>
                      ))
                    )}
                  </CardContent>
                </Card>
                <Card>
                  <CardContent sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                    <Typography variant="subtitle2">{t.admin.transcript}</Typography>
                    {messages.length === 0 ? (
                      <Typography variant="body2" color="text.secondary">
                        {t.admin.noTranscript}
                      </Typography>
                    ) : (
                      <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                        {messages.map((message) => {
                          const isRider = rider !== null && message.senderUid === rider.id;
                          const isSystem = message.senderUid === "system" || message.kind === "SYSTEM";
                          return (
                            <Box
                              key={message.id}
                              sx={{
                                alignSelf: isRider ? "flex-start" : isSystem ? "center" : "flex-end",
                                maxWidth: "85%",
                                bgcolor: isSystem
                                  ? "action.hover"
                                  : isRider
                                    ? "primary.main"
                                    : "secondary.main",
                                color: isSystem
                                  ? "text.secondary"
                                  : isRider
                                    ? "primary.contrastText"
                                    : "secondary.contrastText",
                                borderRadius: 3,
                                px: 1.5,
                                py: 1,
                              }}
                            >
                              <Typography variant="caption" sx={{ display: "block", opacity: 0.8 }}>
                                {isSystem ? t.admin.systemMessage : message.senderName ?? message.senderUid.slice(0, 8)}
                              </Typography>
                              <Typography variant="body2">{message.text ?? "📷"}</Typography>
                            </Box>
                          );
                        })}
                      </Box>
                    )}
                  </CardContent>
                </Card>
                {open && !MONETARY_DISPUTE_TYPES.has(selected.type) ? (
                  <Alert severity="info">{t.admin.conductDisputeNotice}</Alert>
                ) : null}
                {open && MONETARY_DISPUTE_TYPES.has(selected.type) ? (
                  <Card>
                    <CardContent sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                      <Typography variant="subtitle2">{t.admin.decision}</Typography>
                      <SettingField label={t.admin.outcome}>
                        <TextField
                          select
                          size="small"
                          fullWidth
                          value={draft.outcome}
                          onChange={(e) => setDraft({ ...draft, outcome: e.target.value })}
                        >
                          <MenuItem value="">—</MenuItem>
                          <MenuItem value="SHOP">{t.admin.outcomeProviderWin}</MenuItem>
                          <MenuItem value="RIDER">{t.admin.outcomeRiderWin}</MenuItem>
                          <MenuItem value="PARTIAL">{t.admin.outcomePartialSplit}</MenuItem>
                        </TextField>
                      </SettingField>
                      {draft.outcome === "PARTIAL" ? (
                        <SettingField label={t.admin.adjustedAmount}>
                          <TextField
                            size="small"
                            type="number"
                            fullWidth
                            value={draft.adjustedAmount}
                            onChange={(e) => setDraft({ ...draft, adjustedAmount: e.target.value })}
                          />
                        </SettingField>
                      ) : null}
                      <SettingField label={t.admin.resolution}>
                        <TextField
                          size="small"
                          fullWidth
                          value={draft.resolution}
                          onChange={(e) => setDraft({ ...draft, resolution: e.target.value })}
                          multiline
                          minRows={2}
                        />
                      </SettingField>
                      {effectText ? (
                        <Typography variant="caption" color="text.secondary">
                          {effectText}
                        </Typography>
                      ) : null}
                      <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                        <Button variant="contained" disabled={busy} onClick={askResolve}>
                          {t.admin.resolve}
                        </Button>
                        <Button
                          variant="outlined"
                          disabled={busy}
                          onClick={() => {
                            setDismissNote("");
                            setDismissOpen(true);
                          }}
                        >
                          {t.admin.dismissDispute}
                        </Button>
                      </Box>
                    </CardContent>
                  </Card>
                ) : null}
              </Box>
            ) : null
          }
        />
      )}
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>{t.admin.confirmTitle}</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          <Typography variant="body2">{t.admin.confirmDispute}</Typography>
          <Divider />
          <Typography variant="body2">
            {`${t.admin.outcome}: ${draft.outcome || "—"}${draft.outcome === "PARTIAL" ? ` · ${t.admin.adjustedAmount}: ${draft.adjustedAmount}` : ""}`}
          </Typography>
          {effectText ? (
            <Typography variant="caption" color="text.secondary">
              {effectText}
            </Typography>
          ) : null}
          <Typography variant="body2" color="text.secondary">
            {draft.resolution}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>{t.common.cancel}</Button>
          <Button variant="contained" disabled={busy} onClick={() => void resolve()}>
            {t.admin.resolve}
          </Button>
        </DialogActions>
      </Dialog>
      <PhotoLightbox
        preview={preview}
        onClose={() => setPreview(null)}
        onChange={(index) => setPreview((prev) => (prev ? { ...prev, index } : prev))}
      />
      <Dialog open={dismissOpen} onClose={() => setDismissOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>{t.admin.dismissDispute}</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          <Typography variant="body2">{t.admin.confirmDismiss}</Typography>
          <Typography variant="caption" color="text.secondary">
            {t.admin.dismissHint}
          </Typography>
          <TextField
            size="small"
            label={t.admin.resolution}
            value={dismissNote}
            onChange={(e) => setDismissNote(e.target.value)}
            multiline
            minRows={2}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDismissOpen(false)}>{t.common.cancel}</Button>
          <Button variant="contained" disabled={busy} onClick={() => void dismissDispute()}>
            {t.admin.dismissDispute}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
