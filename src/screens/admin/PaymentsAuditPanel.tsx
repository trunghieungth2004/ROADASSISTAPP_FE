import { useEffect, useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import { toMessage } from "../../api/client";
import { adminPaymentsAudit, type AdminPaymentAudit } from "../../api/admin";
import { useStrings } from "../../context/LanguageContext";
import PanelHeader from "./PanelHeader";

export default function PaymentsAuditPanel({ token }: { token: string | null }) {
  const { t } = useStrings();
  const [audit, setAudit] = useState<AdminPaymentAudit | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (!token) return;
    try {
      setAudit(await adminPaymentsAudit(token, 500));
      setError(null);
    } catch (err) {
      setError(toMessage(err));
    }
  }

  useEffect(() => {
    void load();
  }, [token]);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
      <PanelHeader
        title={t.admin.paymentsAudit}
        onRefresh={() => void load()}
        refreshLabel={t.admin.refresh}
      />
      {error ? <Alert severity="error">{error}</Alert> : null}
      {audit ? (
        <Card variant="outlined">
          <CardContent sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
            <Typography variant="body2">{`${t.admin.scanned}: ${audit.scanned}`}</Typography>
            <Typography variant="body2">{`${t.admin.tickets}: ${audit.tickets}`}</Typography>
            <Typography variant="body2">{`${t.admin.missingTickets}: ${audit.missingTickets}`}</Typography>
            <Typography variant="body2">{`${t.admin.drift}: ${audit.drift.length}`}</Typography>
          </CardContent>
        </Card>
      ) : null}
      {audit?.drift.map((row) => (
        <Card key={`${row.ticketId}-${row.paymentId}`} variant="outlined">
          <CardContent sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
            <Typography variant="subtitle2">{row.ticketId}</Typography>
            <Typography variant="caption" color="text.secondary">{row.paymentId}</Typography>
            <Typography variant="body2">{`${t.admin.expected}: ${row.expected}`}</Typography>
            <Typography variant="body2">{`${t.admin.actual}: ${row.actual ?? "—"}`}</Typography>
          </CardContent>
        </Card>
      ))}
    </Box>
  );
}
