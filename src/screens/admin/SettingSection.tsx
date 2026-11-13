import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import type { ReactNode } from "react";

export default function SettingSection({
  title,
  lede,
  children,
}: {
  title: string;
  lede?: string;
  children: ReactNode;
}) {
  return (
    <Box
      component="section"
      sx={{
        py: 2.5,
        borderBottom: 1,
        borderColor: "divider",
        "&:last-of-type": { borderBottom: 0 },
      }}
    >
      <Typography variant="subtitle1">{title}</Typography>
      {lede ? (
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mt: 0.5, mb: 2, maxWidth: "56ch" }}
        >
          {lede}
        </Typography>
      ) : (
        <Box sx={{ mb: 2 }} />
      )}
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2, maxWidth: 640 }}>
        {children}
      </Box>
    </Box>
  );
}
