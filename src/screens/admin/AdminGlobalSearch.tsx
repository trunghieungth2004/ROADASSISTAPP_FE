import { useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import ButtonBase from "@mui/material/ButtonBase";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { toMessage } from "../../api/client";
import { adminSearch, type AdminSearchResults } from "../../api/admin";
import { paymentMethodLabel } from "../../api/payments";
import { useStrings } from "../../context/LanguageContext";
import { money } from "./format";
import { useAdminBill } from "./AdminBillContext";
import { adminStatusLabel, humanizeEnum } from "./adminLabels";
import { ticketStatusLabel } from "./ticketStatus";

function ResultRow({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <ButtonBase
      onClick={onClick}
      sx={{
        width: "100%",
        justifyContent: "flex-start",
        textAlign: "left",
        borderRadius: 1,
        px: 0.75,
        py: 0.5,
        "&:hover": { backgroundColor: "action.hover" },
      }}
    >
      <Typography variant="body2">{label}</Typography>
    </ButtonBase>
  );
}

export default function AdminGlobalSearch({
  token,
  onOpenSection,
}: {
  token: string | null;
  onOpenSection: (section: string) => void;
}) {
  const { t } = useStrings();
  const { openBill } = useAdminBill();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AdminSearchResults | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(): Promise<void> {
    if (!token || query.trim() === "" || busy) return;
    setBusy(true);
    setError(null);
    try {
      setResults(await adminSearch(token, query.trim()));
    } catch (err) {
      setError(toMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const count = results === null ? 0 :
    results.users.length + results.providers.length +
    results.tickets.length + results.payments.length;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1, mb: 2 }}>
      <Box sx={{ display: "flex", gap: 1 }}>
        <TextField
          size="small"
          fullWidth
          label={t.admin.globalSearch}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") void run();
          }}
        />
        <Button variant="outlined" disabled={busy || query.trim() === ""} onClick={() => void run()}>
          {t.admin.search}
        </Button>
      </Box>
      {error ? <Typography variant="caption" color="error">{error}</Typography> : null}
      {results ? (
        <Card variant="outlined">
          <CardContent sx={{ display: "flex", flexDirection: "column", gap: 0.25 }}>
            {count === 0 ? (
              <Typography variant="body2" color="text.secondary">{t.admin.noResults}</Typography>
            ) : null}
            {results.users.map((user) => (
              <ResultRow
                key={`u-${user.id}`}
                label={`USER · ${user.name ?? user.id} · ${user.email ?? user.id} · ${user.status ? adminStatusLabel(user.status, t) : ""}`}
                onClick={() => onOpenSection("users")}
              />
            ))}
            {results.providers.map((provider) => (
              <ResultRow
                key={`p-${provider.id}`}
                label={`PROVIDER · ${provider.name} · ${humanizeEnum(provider.kind)} · ${adminStatusLabel(provider.status, t)}${provider.plate ? ` · ${provider.plate}` : ""}`}
                onClick={() => onOpenSection("providers")}
              />
            ))}
            {results.tickets.map((ticket) => (
              <ResultRow
                key={`t-${ticket.id}`}
                label={`TICKET · ${ticket.ticketType} · ${ticketStatusLabel(ticket.status, t)} · ${ticket.id}`}
                onClick={() => openBill(ticket.id)}
              />
            ))}
            {results.payments.map((payment) => (
              <ResultRow
                key={`pay-${payment.id}`}
                label={`PAYMENT · ${money(payment.amount)} · ${paymentMethodLabel(payment.method)} · ${adminStatusLabel(payment.status, t)} · ${payment.id}`}
                onClick={() => openBill(payment.ticketId)}
              />
            ))}
          </CardContent>
        </Card>
      ) : null}
    </Box>
  );
}
