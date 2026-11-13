import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import InboxIcon from "@mui/icons-material/Inbox";
import type { ReactNode } from "react";

export default function EmptyState({
  message,
  icon,
}: {
  message: string;
  icon?: ReactNode;
}) {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 1,
        py: 5,
        px: 2,
        textAlign: "center",
        color: "text.secondary",
      }}
    >
      {icon ?? <InboxIcon sx={{ fontSize: 40, opacity: 0.5 }} />}
      <Typography variant="body2">{message}</Typography>
    </Box>
  );
}
