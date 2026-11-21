import { formatDateDMY } from "../utils/date";
import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import Alert from "@mui/material/Alert";
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
import Rating from "@mui/material/Rating";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Screen from "../components/ui/Screen";
import { toMessage } from "../api/client";
import { fetchBill, requestInvoice, type Bill, type BillItem } from "../api/bills";
import { confirmCashReceipt, createPayment, paymentMethodLabel, paymentStatusLabel } from "../api/payments";
import { submitRating } from "../api/ratings";
import { fileDispute } from "../api/disputes";
import { requestRefund } from "../api/refunds";
import { fileWarrantyClaim } from "../api/warranty";
import { uploadImages } from "../storage/uploads";
import { useAuth } from "../context/AuthContext";
import { useStrings } from "../context/LanguageContext";

const DISPUTE_REASONS = ["OVERCHARGE", "FIX_NOT_DONE", "POOR_QUALITY", "UNFIXABLE_DISAGREE"] as const;

function prettyDispute(type: string, reason: string): string {
  return (type === reason ? type : reason).replaceAll("_", " ");
}

function money(value: number): string {
  return `${value.toLocaleString()} VND`;
}

export default function BillDetailScreen() {
  const { t } = useStrings();
  const { token } = useAuth();
  const navigate = useNavigate();
  const { ticketId = "" } = useParams();
  const [search] = useSearchParams();
  const payee = search.get("scope") === "payee";
  const [bill, setBill] = useState<Bill | null>(null);
  const viewer = bill?.viewer ?? (payee ? "PAYEE" : null);
  const riderViewer = viewer === "RIDER";
  const payeeViewer = viewer === "PAYEE";
  const adminViewer = viewer === "ADMIN";
  const operatorViewer = viewer === "OPERATOR";
  const payer = riderViewer && !payee;
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [refundFor, setRefundFor] = useState<BillItem | null>(null);
  const [refundAmount, setRefundAmount] = useState("");
  const [refundReason, setRefundReason] = useState("");
  const [refundBusy, setRefundBusy] = useState(false);
  const [warrantyFor, setWarrantyFor] = useState<{lineId: string; name: string} | null>(null);
  const [warrantyReason, setWarrantyReason] = useState("");
  const [warrantyBusy, setWarrantyBusy] = useState(false);
  const [ratingFor, setRatingFor] = useState<BillItem | null>(null);
  const [disputeFor, setDisputeFor] = useState<BillItem | null>(null);
  const [score, setScore] = useState(5);
  const [ratingText, setRatingText] = useState("");
  const [invoiceBusy, setInvoiceBusy] = useState(false);
  const [reason, setReason] = useState<string>("LATE");
  const [disputeNote, setDisputeNote] = useState("");
  const [disputePhotos, setDisputePhotos] = useState<File[]>([]);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      setBill(await fetchBill(token, {
        ticketId,
        ...(payee ? { scope: "payee" as const } : {}),
      }));
    } catch (err) {
      setError(toMessage(err));
    } finally {
      setLoading(false);
    }
  }, [token, ticketId, payee]);

  useEffect(() => {
    void load();
  }, [load]);

  async function pay(item: BillItem, method: "CASH" | "SEPAY") {
    if (!token || busy || !bill?.canPay || !payer) return;
    setBusy(true);
    setError(null);
    const checkoutTab = method === "SEPAY" ? window.open("about:blank", "_blank") : null;
    try {
      const created = await createPayment(item.ticketId, method, token);
      if (method === "SEPAY") {
        if (created.checkoutUrl) {
          if (checkoutTab) checkoutTab.location.href = created.checkoutUrl;
          else window.location.href = created.checkoutUrl;
        } else {
          checkoutTab?.close();
          throw new Error(t.bills.noCheckout);
        }
      } else {
        setNotice(t.bills.cashArmed);
      }
      await load();
    } catch (err) {
      checkoutTab?.close();
      setError(toMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function confirmCash(item: BillItem) {
    if (!token || busy || !item.payment?.canConfirmCash || !payeeViewer) return;
    setBusy(true);
    try {
      await confirmCashReceipt(item.ticketId, token);
      await load();
      setNotice(t.bills.cashConfirmed);
    } catch (err) {
      setError(toMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function saveRating() {
    if (!ratingFor || !payer) return;
    const ratingTarget = ratingFor.ratingTargetId ?? ratingFor.payeeId;
    if (!token || !ratingTarget) return;
    setBusy(true);
    try {
      await submitRating({
        targetId: ratingTarget,
        targetKind: "SHOP",
        ticketId: ratingFor.ticketId,
        score,
        ...(ratingText.trim() ? { text: ratingText.trim() } : {}),
      }, token);
      setRatingFor(null);
      setScore(5);
      setRatingText("");
      setNotice(t.ratings.saved);
    } catch (err) {
      setError(toMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function saveDispute() {
    if (!token || !disputeFor || !payer) return;
    setBusy(true);
    try {
      if (["OVERCHARGE", "FIX_NOT_DONE", "POOR_QUALITY"].includes(reason) &&
        disputePhotos.length === 0) {
        setError(t.disputes.needPhoto);
        return;
      }
      const photoPaths = disputePhotos.length > 0
        ? await uploadImages(disputePhotos.slice(0, 5), `dispatch/dispute-${disputeFor.ticketId}`)
        : [];
      await fileDispute({
        ticketId: disputeFor.ticketId,
        reason,
        ...(disputeNote.trim() ? { note: disputeNote.trim() } : {}),
        ...(photoPaths.length > 0 ? { photoUrls: photoPaths } : {}),
      }, token);
      setDisputeFor(null);
      setDisputeNote("");
      setDisputePhotos([]);
      setNotice(t.disputes.saved);
    } catch (err) {
      setError(toMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function submitWarranty(): Promise<void> {
    if (!token || !warrantyFor || warrantyBusy || !payer) return;
    setWarrantyBusy(true);
    try {
      await fileWarrantyClaim({
        ticketId: bill?.ticketId ?? ticketId,
        lineId: warrantyFor.lineId,
        reason: warrantyReason.trim(),
      }, token);
      setWarrantyFor(null);
      setWarrantyReason("");
      setNotice(t.bills.warrantyClaimed);
      await load();
    } catch (err) {
      setError(toMessage(err));
    } finally {
      setWarrantyBusy(false);
    }
  }

  async function submitRefund(): Promise<void> {
    if (!token || !refundFor?.payment || refundBusy || !payer) return;
    setRefundBusy(true);
    try {
      const amount = Number.parseInt(refundAmount.replace(/[^0-9]/g, ""), 10);
      await requestRefund({
        paymentId: refundFor.payment.id,
        ...(Number.isFinite(amount) && amount > 0 ? { amount } : {}),
        ...(refundReason.trim() ? { reason: refundReason.trim() } : {}),
      }, token);
      setRefundFor(null);
      setRefundAmount("");
      setRefundReason("");
      setNotice(t.bills.refundRequested);
      await load();
    } catch (err) {
      setError(toMessage(err));
    } finally {
      setRefundBusy(false);
    }
  }

  async function downloadInvoice() {
    if (!token || !bill || invoiceBusy) return;
    setInvoiceBusy(true);
    try {
      const invoice = await requestInvoice(bill.ticketId, token);
      window.open(invoice.url, "_blank", "noopener,noreferrer");
    } catch (err) {
      setError(toMessage(err));
    } finally {
      setInvoiceBusy(false);
    }
  }

  return (
    <Screen maxWidth="md">
      <Button onClick={() => navigate("/bills")}>{t.common.back}</Button>
      <Typography variant="h6" sx={{ mt: 1 }}>{t.bills.detail}</Typography>
      {loading && <Typography sx={{ mt: 2 }} color="text.secondary">{t.common.loading}</Typography>}
      {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
      {notice && <Alert severity="success" sx={{ mt: 2 }}>{notice}</Alert>}
      {adminViewer ? <Alert severity="info" sx={{ mt: 2 }}>{t.bills.adminReadOnly}</Alert> : null}
      {payeeViewer || operatorViewer ? <Alert severity="info" sx={{ mt: 2 }}>{t.bills.readOnly}</Alert> : null}
      {bill && (
        <Box sx={{ mt: 2, display: "flex", flexDirection: "column", gap: 2 }}>
          <Card>
            <CardContent sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              <Typography variant="subtitle1">{bill.ticketType} · {bill.billId}</Typography>
              <Typography variant="body2">{t.bills.total}: {money(bill.total)}</Typography>
              <Typography variant="body2">{t.bills.paid}: {money(bill.paid)}</Typography>
              <Typography variant="body2">{t.bills.due}: {money(bill.due)}</Typography>
              <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                <Chip size="small" label={bill.status} />
                {bill.status === "PAID" ? (
                  <Button size="small" variant="contained" disabled={invoiceBusy} onClick={() => void downloadInvoice()}>
                    {t.bills.invoicePdf}
                  </Button>
                ) : null}
              </Box>
            </CardContent>
          </Card>
          {bill.items.map((item) => (
            <Card key={item.ticketId}>
              <CardContent sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Typography variant="subtitle1" sx={{ flexGrow: 1 }}>{item.ticketType} · {item.ticketId}</Typography>
                  <Chip size="small" label={item.status} />
                </Box>
                <Typography variant="body2">{money(item.amount)}{item.waitingFee > 0 ? ` · ${t.bills.waiting} ${money(item.waitingFee)}` : ""}</Typography>
                {Array.isArray(item.breakdown) && item.breakdown.length > 0 && (
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 0.25 }}>
                    {item.breakdown.map((line, i) => (
                      <Box key={`${line.label}-${i}`} sx={{ display: "flex", justifyContent: "space-between", gap: 2 }}>
                        <Typography variant="caption" color="text.secondary">{line.detail ? `${line.label} · ${line.detail}` : line.label}</Typography>
                        <Typography variant="caption">{money(line.amount)}</Typography>
                      </Box>
                    ))}
                  </Box>
                )}
                {item.refundRequest && (
                  <Typography variant="body2" color="warning.main">
                    {`${t.bills.refund}: ${item.refundRequest.status} · ${money(item.refundRequest.amount)}`}
                  </Typography>
                )}
                {item.warrantyUntil && (
                  <Typography variant="body2" color="success.main">
                    {`${t.bills.warranty}: ${formatDateDMY(item.warrantyUntil)}`}
                  </Typography>
                )}
                {item.payeeName && <Typography variant="body2" color="text.secondary">{item.payeeName}</Typography>}
                {(item.services ?? []).length > 0 && (
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                    <Typography variant="caption" sx={{ fontWeight: 700 }}>{t.bills.services}</Typography>
                    {(item.services ?? []).map((line, i) => (
                      <Box key={line.lineId ?? `${line.name}-${i}`} sx={{ display: "flex", justifyContent: "space-between", gap: 1 }}>
                        <Box sx={{ display: "flex", flexDirection: "column" }}>
                          <Typography variant="caption" color="text.secondary">
                            {`${line.name} × ${line.qty} · ${line.priceMode === "QUOTED" ? t.bills.quoted : t.bills.catalog}`}
                          </Typography>
                          {line.warrantyUntil && (
                            <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                              <Typography variant="caption" color="success.main">
                                {`${t.bills.warranty}: ${formatDateDMY(line.warrantyUntil)}`}
                              </Typography>
                              {payer && Date.parse(line.warrantyUntil) > Date.now() && line.lineId && (
                                <Button size="small" sx={{ minWidth: 0, py: 0 }} onClick={() => {
                                  setWarrantyFor({lineId: line.lineId as string, name: line.name});
                                  setWarrantyReason("");
                                }}>
                                  {t.bills.claimWarranty}
                                </Button>
                              )}
                            </Box>
                          )}
                        </Box>
                        <Typography variant="caption">{money(line.amount)}</Typography>
                      </Box>
                    ))}
                  </Box>
                )}
                {(item.extras ?? []).length > 0 && (
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                    <Typography variant="caption" sx={{ fontWeight: 700 }}>{t.bills.extras}</Typography>
                    {(item.extras ?? []).map((line, i) => (
                      <Box key={line.lineId ?? `${line.name}-${i}`} sx={{ display: "flex", justifyContent: "space-between", gap: 1 }}>
                        <Typography variant="caption" color="text.secondary">
                          {`${line.name} × ${line.qty}${line.note ? ` · ${line.note}` : ""}`}
                        </Typography>
                        <Typography variant="caption">{money(line.amount)}</Typography>
                      </Box>
                    ))}
                  </Box>
                )}
                {(item.services ?? []).length === 0 &&
                  (item.extras ?? []).length === 0 &&
                  (item.items ?? []).length > 0 && (
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                    {(item.items ?? []).map((line, i) => (
                      <Box key={`${line.name}-${i}`} sx={{ display: "flex", justifyContent: "space-between", gap: 1 }}>
                        <Typography variant="caption" color="text.secondary">{`${line.name} × ${line.qty}`}</Typography>
                        <Typography variant="caption">{money(line.amount)}</Typography>
                      </Box>
                    ))}
                  </Box>
                )}
                {item.payment && (
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                    <Typography variant="body2" color="text.secondary">
                      {paymentMethodLabel(item.payment.method)} · {paymentStatusLabel(item.payment.status)}
                    </Typography>
                    {item.payment.disputeId && !item.payment.disputeResolvedAt ? (
                      <Chip size="small" color="warning" label={t.admin.disputed} />
                    ) : null}
                  </Box>
                )}
                {item.payment?.disputeHold ? (
                  <Alert severity="warning">{t.bills.disputeHold}</Alert>
                ) : null}
                {item.dispute ? (
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                    <Chip
                      size="small"
                      color={item.dispute.status === "OPEN" ? "warning" : "default"}
                      label={`${t.bills.dispute}: ${item.dispute.status}`}
                    />
                    <Typography variant="caption" color="text.secondary">
                      {prettyDispute(item.dispute.type, item.dispute.reasonCode)}
                    </Typography>
                    {item.dispute.outcome ? (
                      <Typography variant="caption" color="text.secondary">
                        {`${t.admin.outcome}: ${item.dispute.outcome}`}
                      </Typography>
                    ) : null}
                    {item.dispute.resolution ? (
                      <Typography variant="caption" color="text.secondary">
                        {item.dispute.resolution}
                      </Typography>
                    ) : null}
                  </Box>
                ) : null}
                {item.disputes && item.disputes.length > 1 ? (
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                    <Typography variant="caption" color="text.secondary">
                      {t.bills.disputeHistory}
                    </Typography>
                    {item.disputes.map((row) => (
                      <Box key={row.id} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ flexGrow: 1 }}>
                          {prettyDispute(row.type, row.reasonCode)}
                        </Typography>
                        {row.outcome ? (
                          <Typography variant="caption" color="text.secondary">
                            {row.outcome}
                          </Typography>
                        ) : null}
                        <Chip
                          size="small"
                          variant="outlined"
                          color={row.status === "OPEN" ? "warning" : "default"}
                          label={row.status}
                        />
                      </Box>
                    ))}
                  </Box>
                ) : null}
                <Divider />
                {payer && item.status === "UNPAID" && bill.canPay && (
                  <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                    <Button size="small" variant="contained" disabled={busy} onClick={() => void pay(item, "SEPAY")}>SePay</Button>
                    <Button size="small" variant="outlined" disabled={busy} onClick={() => void pay(item, "CASH")}>{t.bills.payCash}</Button>
                  </Box>
                )}
                {payer && item.status === "PENDING" && item.payment?.method === "SEPAY" && bill.canPay && (
                  <Button size="small" variant="contained" disabled={busy} onClick={() => void pay(item, "SEPAY")}>{t.bills.openQr}</Button>
                )}
                {payer && item.payment &&
                  ["HELD", "CONFIRMED", "PARTIAL"].includes(item.payment.status) &&
                  !item.refundRequest && (
                  <Button
                    size="small"
                    color="warning"
                    disabled={busy}
                    onClick={() => {
                      setRefundFor(item);
                      setRefundAmount(String(item.payment?.amount ?? ""));
                      setRefundReason("");
                    }}
                  >
                    {t.bills.refundRequest}
                  </Button>
                )}
                {payeeViewer && item.payment?.status === "PENDING" && item.payment.method === "CASH" && item.payment.canConfirmCash && (
                  <Button size="small" variant="contained" disabled={busy} onClick={() => void confirmCash(item)}>{t.bills.confirmCash}</Button>
                )}
                {payer && item.ticketStatus === "4" && (
                  <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                    <Button size="small" disabled={busy || (!item.ratingTargetId && !item.payeeId)} onClick={() => { setRatingFor(item); setScore(5); setRatingText(""); }}>{t.ratings.rate}</Button>
                    <Button size="small" color="error" disabled={busy} onClick={() => { setDisputeFor(item); setReason("LATE"); setDisputeNote(""); setDisputePhotos([]); }}>{t.disputes.file}</Button>
                  </Box>
                )}
              </CardContent>
            </Card>
          ))}
        </Box>
      )}
      <Dialog open={ratingFor !== null} onClose={() => setRatingFor(null)} fullWidth maxWidth="xs">
        <DialogTitle>{t.ratings.rate}</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
          <Rating value={score} onChange={(_, value) => setScore(value ?? 5)} />
          <TextField label={t.ratings.comment} value={ratingText} onChange={(e) => setRatingText(e.target.value)} multiline rows={3} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRatingFor(null)}>{t.common.close}</Button>
          <Button variant="contained" disabled={busy} onClick={() => void saveRating()}>{t.common.save}</Button>
        </DialogActions>
      </Dialog>
      <Dialog open={disputeFor !== null} onClose={() => setDisputeFor(null)} fullWidth maxWidth="xs">
        <DialogTitle>{t.disputes.file}</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
          <TextField select label={t.disputes.reason} value={reason} onChange={(e) => setReason(e.target.value)}>
            {DISPUTE_REASONS.map((value) => (
              <MenuItem key={value} value={value}>{value.replaceAll("_", " ")}</MenuItem>
            ))}
          </TextField>
          <TextField label={t.disputes.note} value={disputeNote} onChange={(e) => setDisputeNote(e.target.value)} multiline rows={3} />
          <Button component="label" variant="outlined" disabled={disputePhotos.length >= 5}>
            {t.disputes.photo}
            <input
              hidden
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => {
                const picked = Array.from(e.target.files ?? []);
                setDisputePhotos((prev) => [...prev, ...picked].slice(0, 5));
                e.target.value = "";
              }}
            />
          </Button>
          {disputePhotos.length > 0 ? (
            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
              {disputePhotos.map((file, index) => (
                <Box key={`${file.name}-${index}`} sx={{ position: "relative" }}>
                  <Box
                    component="img"
                    src={URL.createObjectURL(file)}
                    alt={file.name}
                    sx={{ width: 64, height: 64, objectFit: "cover", borderRadius: 1.5, border: 1, borderColor: "divider" }}
                  />
                  <Button
                    size="small"
                    color="error"
                    sx={{ minWidth: 0, px: 0.5, position: "absolute", top: -8, right: -8 }}
                    onClick={() => setDisputePhotos((prev) => prev.filter((_, i) => i !== index))}
                  >
                    ×
                  </Button>
                </Box>
              ))}
            </Box>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDisputeFor(null)}>{t.common.close}</Button>
          <Button variant="contained" color="error" disabled={busy} onClick={() => void saveDispute()}>{t.disputes.submit}</Button>
        </DialogActions>
      </Dialog>
      <Dialog open={warrantyFor !== null} onClose={() => setWarrantyFor(null)} fullWidth maxWidth="xs">
        <DialogTitle>{`${t.bills.claimWarranty} · ${warrantyFor?.name ?? ""}`}</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
          <Typography variant="caption" color="text.secondary">{t.bills.warrantyClaimHint}</Typography>
          <TextField label={t.bills.refundReason} value={warrantyReason} onChange={(e) => setWarrantyReason(e.target.value)} multiline minRows={2} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setWarrantyFor(null)}>{t.common.close}</Button>
          <Button variant="contained" disabled={warrantyBusy || warrantyReason.trim().length < 5} onClick={() => void submitWarranty()}>{t.bills.warrantySubmit}</Button>
        </DialogActions>
      </Dialog>
      <Dialog open={refundFor !== null} onClose={() => setRefundFor(null)} fullWidth maxWidth="xs">
        <DialogTitle>{t.bills.refundRequest}</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
          <Typography variant="caption" color="text.secondary">{t.bills.refundHint}</Typography>
          <TextField label={t.bills.refundAmount} type="number" value={refundAmount} onChange={(e) => setRefundAmount(e.target.value)} />
          <TextField label={t.bills.refundReason} value={refundReason} onChange={(e) => setRefundReason(e.target.value)} multiline minRows={2} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRefundFor(null)}>{t.common.close}</Button>
          <Button variant="contained" disabled={refundBusy} onClick={() => void submitRefund()}>{t.bills.refundSubmit}</Button>
        </DialogActions>
      </Dialog>
    </Screen>
  );
}
