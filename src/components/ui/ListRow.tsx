import Box from "@mui/material/Box";
import ButtonBase from "@mui/material/ButtonBase";
import Typography from "@mui/material/Typography";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import type { ReactNode } from "react";

export default function ListRow({
  icon,
  label,
  hint,
  onClick,
  danger = false,
  trailing,
}: {
  icon: ReactNode;
  label: string;
  hint?: string;
  onClick?: () => void;
  danger?: boolean;
  trailing?: ReactNode;
}) {
  return (
    <ButtonBase
      onClick={onClick}
      sx={{
        width: "100%",
        justifyContent: "flex-start",
        gap: 1.5,
        px: 2,
        py: 1.75,
        textAlign: "left",
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          color: danger ? "error.main" : "primary.main",
        }}
      >
        {icon}
      </Box>
      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
        <Typography
          sx={{
            fontSize: 15,
            fontWeight: 500,
            color: danger ? "error.main" : "text.primary",
          }}
        >
          {label}
        </Typography>
        {hint ? (
          <Typography variant="caption" color="text.secondary">
            {hint}
          </Typography>
        ) : null}
      </Box>
      {trailing ?? (danger ? null : <ChevronRightIcon sx={{ color: "text.secondary" }} />)}
    </ButtonBase>
  );
}
