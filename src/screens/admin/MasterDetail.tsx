import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import type { ReactNode } from "react";

export default function MasterDetail({
  list,
  detail,
  empty,
}: {
  list: ReactNode;
  detail: ReactNode;
  empty: string;
}) {
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr", md: "minmax(280px, 360px) minmax(0, 1fr)" },
        gap: 2,
        alignItems: "start",
      }}
    >
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>{list}</Box>
      <Box sx={{ position: { md: "sticky" }, top: 0 }}>
        {detail ?? <Alert severity="info">{empty}</Alert>}
      </Box>
    </Box>
  );
}
