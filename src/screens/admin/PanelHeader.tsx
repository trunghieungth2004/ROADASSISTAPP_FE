import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import RefreshIcon from "@mui/icons-material/Refresh";
import type { ReactNode } from "react";

export default function PanelHeader({
  title,
  onRefresh,
  refreshLabel,
  action,
}: {
  title: string;
  onRefresh?: () => void;
  refreshLabel: string;
  action?: ReactNode;
}) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
      <Typography variant="h6" sx={{ flexGrow: 1 }}>
        {title}
      </Typography>
      {action}
      {onRefresh ? (
        <Button size="small" variant="outlined" startIcon={<RefreshIcon />} onClick={onRefresh}>
          {refreshLabel}
        </Button>
      ) : null}
    </Box>
  );
}
