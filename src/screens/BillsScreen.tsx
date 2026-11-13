import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import MenuItem from "@mui/material/MenuItem";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Screen from "../components/ui/Screen";
import { toMessage } from "../api/client";
import { myBills, payeeBills, type Bill } from "../api/bills";
import {
  myPayouts,
  payoutStatement,
  payoutBanks,
  requestPayout,
  savePayoutAccount,
  type PayoutBank,
  type PayoutStatement,
  type PayoutSummary,
} from "../api/payouts";
import { useAuth } from "../context/AuthContext";
import { useStrings } from "../context/LanguageContext";

function billStatusColor(status: string): "success" | "warning" | "error" | "default" {
  if (status === "PAID") return "success";
  if (status === "PARTIAL" || status === "UNPAID") return "warning";
  if (status === "VOID") return "error";
  return "default";
}

function money(value: number): string {
  return `${value.toLocaleString()} VND`;
}

export default function BillsScreen() {
  const { t } = useStrings();
  const { token } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"pay" | "receive">("pay");
  const [bills, setBills] = useState<Bill[]>([]);
  const [payouts, setPayouts] = useState<PayoutSummary | null>(null);
  const [statement, setStatement] = useState<PayoutStatement | null>(null);
  const [statementBusy, setStatementBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [banks, setBanks] = useState<PayoutBank[]>([]);
  const [accountOpen, setAccountOpen] = useState(false);
  const [bankCode, setBankCode] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [holderName, setHolderName] = useState("");
  const [accountBusy, setAccountBusy] = useState(false);
  const [accountError, setAccountError] = useState<string | null>(null);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawBusy, setWithdrawBusy] = useState(false);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      if (tab === "pay") {
        setBills(await myBills(token));
        setPayouts(null);
      } else {
        setBills(await payeeBills(token));
        setPayouts(await myPayouts(token));
      }
    } catch (err) {
      setError(toMessage(err));
    } finally {
      setLoading(false);
    }
  }, [token, tab]);

  useEffect(() => {
    void load();
  }, [load]);

  function openAccount(): void {
    const account = payouts?.account ?? null;
    setBankCode(account?.bankCode ?? "");
    setAccountNumber(account?.accountNumber ?? "");
    setHolderName(account?.holderName ?? "");
    setAccountError(null);
    setAccountOpen(true);
    if (banks.length === 0 && token) {
      void payoutBanks(token).then(setBanks).catch(() => undefined);
    }
  }

  async function saveAccount(): Promise<void> {
    if (!token || accountBusy) return;
    if (!bankCode || accountNumber.trim() === "" || holderName.trim() === "") {
      setAccountError(t.payments.invalidAccount);
      return;
    }
    setAccountBusy(true);
    setAccountError(null);
    try {
      await savePayoutAccount({ bankCode, accountNumber: accountNumber.trim(), holderName: holderName.trim() }, token);
      setAccountOpen(false);
      setNotice(t.payments.accountSaved);
      await load();
    } catch (err) {
      setAccountError(toMessage(err));
    } finally {
      setAccountBusy(false);
    }
  }

  async function submitWithdraw(): Promise<void> {
    if (!token || withdrawBusy) return;
    const amount = Number.parseInt(withdrawAmount.replace(/[^0-9]/g, ""), 10);
    const available = payouts?.pending.available ?? 0;
    if (!Number.isFinite(amount) || amount <= 0 || amount > available) {
      setWithdrawError(t.payments.invalidAmount);
      return;
    }
    setWithdrawBusy(true);
    setWithdrawError(null);
    try {
      await requestPayout({ amount }, token);
      setWithdrawOpen(false);
      setWithdrawAmount("");
      setNotice(t.payments.requestSent);
      await load();
    } catch (err) {
      setWithdrawError(toMessage(err));
    } finally {
      setWithdrawBusy(false);
    }
  }

  async function loadStatement(): Promise<void> {
    if (!token || statementBusy) return;
    setStatementBusy(true);
    try {
      setStatement(await payoutStatement(token));
    } catch (err) {
      setNotice(toMessage(err));
    } finally {
      setStatementBusy(false);
    }
  }

  function requestStatusLabel(status: string): string {
    if (status === "PAID") return t.payments.requestStatusPAID;
    if (status === "REJECTED") return t.payments.requestStatusREJECTED;
    if (status === "CANCELLED") return t.payments.requestStatusCANCELLED;
    return t.payments.requestStatusPENDING;
  }

  return (
    <Screen maxWidth="md">
      <Typography variant="h6">{t.bills.title}</Typography>
      <Tabs value={tab} onChange={(_, value: "pay" | "receive") => setTab(value)} sx={{ mt: 1 }}>
        <Tab value="pay" label={t.bills.toPay} />
        <Tab value="receive" label={t.bills.toReceive} />
      </Tabs>
      {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
      {notice && <Alert severity="success" sx={{ mt: 2 }} onClose={() => setNotice(null)}>{notice}</Alert>}
      {loading && <Typography sx={{ mt: 2 }} color="text.secondary">{t.common.loading}</Typography>}
      {!loading && bills.length === 0 && <Alert severity="info" sx={{ mt: 2 }}>{t.bills.empty}</Alert>}
      <Box sx={{ mt: 2, display: "flex", flexDirection: "column", gap: 2 }}>
        {bills.map((bill) => (
          <Card key={bill.billId}>
            <CardContent sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Typography variant="subtitle1" sx={{ flexGrow: 1 }}>
                  {bill.ticketType} · {bill.billId}
                </Typography>
                <Chip size="small" color={billStatusColor(bill.status)} label={bill.status} />
              </Box>
              <Typography variant="body2" color="text.secondary">
                {t.bills.total}: {money(bill.total)} · {t.bills.due}: {money(bill.due)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {bill.items.length} {t.bills.items}
              </Typography>
              <Button
                size="small"
                variant="contained"
                onClick={() => navigate(`/bills/${encodeURIComponent(bill.ticketId)}${tab === "receive" ? "?scope=payee" : ""}`)}
              >
                {t.bills.open}
              </Button>
            </CardContent>
          </Card>
        ))}
        {tab === "receive" && payouts && (
          <Card>
            <CardContent sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              <Typography variant="h6">{t.payments.payouts}</Typography>
              <Typography variant="body2">
                {t.payments.available}: {money(payouts.pending.available ?? 0)} · {t.payments.commissionOwed}: {money(payouts.pending.commissionOwed ?? 0)}
              </Typography>
              <Typography variant="body2">
                {t.payments.pending}: {money(payouts.pending.net)} · {payouts.pending.itemCount} {t.bills.items}
              </Typography>
              <Typography variant="body2">
                {t.payments.settled}: {money(payouts.settled.net)} · {payouts.settled.itemCount} {t.bills.items}
              </Typography>
              <Divider />
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="body2">{payouts.account ? payouts.account.bankName : t.payments.addAccount}</Typography>
                  {payouts.account && (
                    <Typography variant="caption" color="text.secondary">
                      {`•••• ${payouts.account.accountNumber.slice(-4)} · ${payouts.account.holderName}`}
                    </Typography>
                  )}
                </Box>
                <Button size="small" onClick={openAccount}>{payouts.account ? t.payments.editAccount : t.payments.addAccount}</Button>
              </Box>
              {(payouts.pendingRequestCount ?? 0) > 0 ? (
                <Typography variant="body2" color="text.secondary">{t.payments.requestPending}</Typography>
              ) : (
                <Button
                  size="small"
                  variant="contained"
                  disabled={(payouts.pending.available ?? 0) <= 0}
                  onClick={() => { setWithdrawAmount(String(payouts.pending.available ?? 0)); setWithdrawError(null); setWithdrawOpen(true); }}
                >
                  {t.payments.withdraw}
                </Button>
              )}
              {(payouts.requests ?? []).length > 0 && (
                <>
                  <Typography variant="subtitle2">{t.payments.requests}</Typography>
                  {(payouts.requests ?? []).map((request) => (
                    <Box key={request.id} sx={{ display: "flex", justifyContent: "space-between", gap: 1 }}>
                      <Typography variant="body2">{money(request.amount)}</Typography>
                      <Typography variant="caption" color="text.secondary">{requestStatusLabel(request.status)}</Typography>
                    </Box>
                  ))}
                </>
              )}
              <Divider />
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Typography variant="subtitle2" sx={{ flexGrow: 1 }}>{t.payments.statement}</Typography>
                <Button size="small" disabled={statementBusy} onClick={() => void loadStatement()}>{t.payments.statement}</Button>
              </Box>
              {statement && (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 0.25 }}>
                  <Typography variant="body2">{`${t.payments.gross}: ${money(statement.totals.gross)} · ${t.payments.commission}: ${money(statement.totals.commission)}`}</Typography>
                  <Typography variant="body2">{`${t.payments.cashCollected}: ${money(statement.totals.cashCollected)} · ${t.payments.netCollected}: ${money(statement.totals.net)}`}</Typography>
                  <Typography variant="body2">{`${t.payments.commissionOwed}: ${money(statement.totals.commissionDeducted)} · ${payouts.batches.length} ${t.payments.payouts.toLowerCase()}`}</Typography>
                </Box>
              )}
              {payouts.batches.length === 0 ? (
                <Typography variant="body2" color="text.secondary">{t.payments.noPayouts}</Typography>
              ) : payouts.batches.map((batch) => (
                <Box key={batch.id}>
                  <Typography variant="body2">{batch.payoutRef || batch.id} · {money(batch.netPayout ?? batch.net)}</Typography>
                  <Typography variant="caption" color="text.secondary">{batch.status} · {batch.batchedAt}</Typography>
                </Box>
              ))}
            </CardContent>
          </Card>
        )}
      </Box>
      <Dialog open={accountOpen} onClose={() => setAccountOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{t.payments.payoutAccount}</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
          {accountError && <Alert severity="error">{accountError}</Alert>}
          <TextField select label={t.payments.bank} value={bankCode} onChange={(e) => setBankCode(e.target.value)}>
            {banks.map((bank) => <MenuItem key={bank.code} value={bank.code}>{bank.name}</MenuItem>)}
          </TextField>
          <TextField label={t.payments.accountNumber} value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} />
          <TextField label={t.payments.holderName} value={holderName} onChange={(e) => setHolderName(e.target.value.toUpperCase())} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAccountOpen(false)}>{t.common.close}</Button>
          <Button variant="contained" disabled={accountBusy} onClick={() => void saveAccount()}>{t.common.save}</Button>
        </DialogActions>
      </Dialog>
      <Dialog open={withdrawOpen} onClose={() => setWithdrawOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{t.payments.withdraw}</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
          {withdrawError && <Alert severity="error">{withdrawError}</Alert>}
          <TextField label={t.payments.withdrawAmount} type="number" value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)} />
          <Typography variant="caption" color="text.secondary">{t.payments.withdrawHint}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setWithdrawOpen(false)}>{t.common.close}</Button>
          <Button variant="contained" disabled={withdrawBusy} onClick={() => void submitWithdraw()}>{t.payments.withdraw}</Button>
        </DialogActions>
      </Dialog>
    </Screen>
  );
}
