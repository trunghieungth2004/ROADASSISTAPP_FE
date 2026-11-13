import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import type { AdminTicketTimelineEntry } from "../../api/admin";
import type { Strings } from "../../i18n/en";
import { ticketStatusLabel } from "./ticketStatus";

export default function TicketTimeline({
  history,
  t,
}: {
  history: AdminTicketTimelineEntry[];
  t: Strings;
}) {
  const entries = Array.isArray(history) ? history : [];
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
      <Typography variant="subtitle2">{t.admin.ticketTimeline}</Typography>
      {entries.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          {t.admin.noTimeline}
        </Typography>
      ) : (
        entries.map((entry, index) => {
          const at = new Date(entry.at);
          const previous = index > 0 ? new Date(entries[index - 1].at) : null;
          const delta = previous
            ? Math.max(0, Math.round((at.getTime() - previous.getTime()) / 60000))
            : null;
          return (
            <Box key={`${entry.status}-${entry.at}-${index}`} sx={{ display: "flex", gap: 1 }}>
              <Box
                sx={{
                  width: 9,
                  height: 9,
                  borderRadius: "50%",
                  bgcolor: index === entries.length - 1 ? "primary.main" : "grey.400",
                  mt: "6px",
                  flexShrink: 0,
                }}
              />
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="body2">
                  {ticketStatusLabel(entry.status, t)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {at.toLocaleString()}
                  {delta !== null
                    ? ` · ${t.admin.timelineDelta.replace("{n}", String(delta))}`
                    : ""}
                </Typography>
              </Box>
            </Box>
          );
        })
      )}
    </Box>
  );
}
