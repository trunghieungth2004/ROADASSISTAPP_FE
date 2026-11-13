import Box from "@mui/material/Box";
import ButtonBase from "@mui/material/ButtonBase";
import Card from "@mui/material/Card";
import Chip from "@mui/material/Chip";
import Typography from "@mui/material/Typography";
import type { ReactNode } from "react";

export default function AdminListItem({
  selected,
  onClick,
  title,
  subtitle,
  chip,
  chipColor = "default",
  trailing,
}: {
  selected: boolean;
  onClick: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  chip?: string;
  chipColor?: "default" | "primary" | "success" | "warning" | "error" | "info";
  trailing?: ReactNode;
}) {
  return (
    <Card sx={{ borderColor: selected ? "primary.main" : "divider" }}>
      <ButtonBase
        onClick={onClick}
        sx={{
          width: "100%",
          display: "flex",
          alignItems: "flex-start",
          gap: 1,
          px: 1.75,
          py: 1.25,
          textAlign: "left",
        }}
      >
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Typography variant="subtitle2" noWrap>
            {title}
          </Typography>
          {subtitle ? (
            <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
              {subtitle}
            </Typography>
          ) : null}
        </Box>
        {trailing}
        {chip ? <Chip size="small" label={chip} color={chipColor} /> : null}
      </ButtonBase>
    </Card>
  );
}
