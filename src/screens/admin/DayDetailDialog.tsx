import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Divider from "@mui/material/Divider";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import Typography from "@mui/material/Typography";
import { useStrings } from "../../context/LanguageContext";
import { formatDateDMY, formatDateTimeDMY } from "../../utils/date";
import { serviceColor } from "../../utils/serviceColors";
import { adminStatusLabel, humanizeEnum } from "./adminLabels";
import { ticketStatusLabel } from "./ticketStatus";
import type { AdminDashboardDay } from "../../api/admin";

export type DayDetailTab = "tickets" | "bookings" | "payments";

export default function DayDetailDialog({
  open,
  date,
  data,
  loading,
  error,
  tab,
  onTab,
  onClose,
}: {
  open: boolean;
  date: string | null;
  data: AdminDashboardDay | null;
  loading: boolean;
  error: string | null;
  tab: DayDetailTab;
  onTab: (tab: DayDetailTab) => void;
  onClose: () => void;
}) {
  const { t } = useStrings();
  const totals = data?.totals;
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>
        {`${t.admin.dayDetail}${date ? ` · ${formatDateDMY(date)}` : ""}`}
      </DialogTitle>
      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
        {error ? <Alert severity="error">{error}</Alert> : null}
        {loading ? <Typography variant="body2" color="text.secondary">{t.common.loading}</Typography> : null}
        {totals ? (
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            <Chip size="small" label={`${t.admin.tickets}: ${totals.tickets}`} />
            <Chip size="small" color="success" variant="outlined" label={`${t.admin.completedJobs}: ${totals.completed}`} />
            <Chip size="small" label={`${t.admin.bookings}: ${totals.bookings}`} />
            <Chip size="small" color="primary" variant="outlined" label={`${t.admin.gross}: ${totals.gross.toLocaleString()} ₫`} />
            <Chip size="small" label={`${t.admin.platformRevenue}: ${totals.commission.toLocaleString()} ₫`} />
          </Box>
        ) : null}
        <Tabs value={tab} onChange={(_, value) => onTab(value)} variant="fullWidth">
          <Tab value="tickets" label={t.admin.tickets} />
          <Tab value="bookings" label={t.admin.bookings} />
          <Tab value="payments" label={t.admin.payments} />
        </Tabs>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
          {tab === "tickets" ? (
            data?.tickets.length === 0 ? (
              <Typography variant="body2" color="text.secondary">{t.admin.noTickets}</Typography>
            ) : data?.tickets.map((ticket) => (
              <Box key={ticket.id} sx={{ display: "flex", gap: 1, alignItems: "flex-start", py: 0.5 }}>
                <Box sx={{ width: 8, height: 8, borderRadius: "50%", mt: 0.7, bgcolor: serviceColor(ticket.ticketType) }} />
                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                  <Typography variant="body2">
                    {`${humanizeEnum(ticket.ticketType)} · ${ticketStatusLabel(ticket.status, t)}`}
                    {ticket.amount !== null ? ` · ${ticket.amount.toLocaleString()} ₫` : ""}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {[
                      ticket.createdAt ? formatDateTimeDMY(ticket.createdAt) : null,
                      ticket.riderName,
                      ticket.providerName,
                      ticket.paymentStatus ? adminStatusLabel(ticket.paymentStatus, t) : null,
                    ].filter(Boolean).join(" · ")}
                  </Typography>
                  {ticket.description || ticket.symptom ? (
                    <Typography variant="caption" color="text.secondary" noWrap>
                      {ticket.description ?? ticket.symptom}
                    </Typography>
                  ) : null}
                </Box>
              </Box>
            ))
          ) : null}
          {tab === "bookings" ? (
            data?.bookings.length === 0 ? (
              <Typography variant="body2" color="text.secondary">{t.admin.noBookings}</Typography>
            ) : data?.bookings.map((booking) => (
              <Box key={booking.id} sx={{ py: 0.5 }}>
                <Typography variant="body2">
                  {`${booking.providerName ?? booking.providerId} · ${adminStatusLabel(booking.status, t)}`}
                  {booking.depositAmount > 0 ? ` · ${booking.depositAmount.toLocaleString()} ₫` : ""}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {[
                    booking.scheduledAt ? formatDateTimeDMY(booking.scheduledAt) : null,
                    booking.serviceNames.join(", "),
                  ].filter(Boolean).join(" · ")}
                </Typography>
              </Box>
            ))
          ) : null}
          {tab === "payments" ? (
            data?.payments.length === 0 ? (
              <Typography variant="body2" color="text.secondary">{t.admin.noPayments}</Typography>
            ) : data?.payments.map((payment) => (
              <Box key={payment.id} sx={{ py: 0.5 }}>
                <Typography variant="body2">
                  {`${payment.amount.toLocaleString()} ₫ · ${adminStatusLabel(payment.status, t)} · ${payment.method}`}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {[
                    payment.createdAt ? formatDateTimeDMY(payment.createdAt) : null,
                    payment.ticketId,
                    `${t.admin.platformRevenue}: ${payment.commissionAmount.toLocaleString()} ₫`,
                  ].filter(Boolean).join(" · ")}
                </Typography>
              </Box>
            ))
          ) : null}
        </Box>
        <Divider />
      </DialogContent>
    </Dialog>
  );
}
