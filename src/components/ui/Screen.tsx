import Container from "@mui/material/Container";
import type { ReactNode } from "react";

export default function Screen({
  children,
  maxWidth = "sm",
}: {
  children: ReactNode;
  maxWidth?: "sm" | "md" | "lg";
}) {
  return (
    <Container
      maxWidth={maxWidth}
      sx={{
        py: 2,
        px: { xs: 1.5, sm: 2.5 },
        overflowY: "auto",
        height: "100%",
        boxSizing: "border-box",
        scrollbarGutter: "stable",
      }}
    >
      {children}
    </Container>
  );
}
