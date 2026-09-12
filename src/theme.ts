import { createTheme } from "@mui/material/styles";

export const theme = createTheme({
  cssVariables: {
    colorSchemeSelector: "data-mui-color-scheme",
  },
  colorSchemes: {
    light: {
      palette: {
        primary: {
          main: "#0284c7",
          light: "#7dd3fc",
          dark: "#0369a1",
          contrastText: "#ffffff",
        },
        secondary: {
          main: "#b45309",
          light: "#fbbf24",
          dark: "#78350f",
          contrastText: "#ffffff",
        },
        background: {
          default: "#f5f7f5",
          paper: "#ffffff",
        },
      },
    },
    dark: {
      palette: {
        primary: {
          main: "#38bdf8",
          light: "#7dd3fc",
          dark: "#075985",
          contrastText: "#082f49",
        },
        secondary: {
          main: "#fbbf24",
          light: "#fde68a",
          dark: "#b45309",
          contrastText: "#451a03",
        },
      },
    },
  },
  shape: {
    borderRadius: 16,
  },
  typography: {
    fontFamily: [
      "Roboto",
      "system-ui",
      "-apple-system",
      "Segoe UI",
      "sans-serif",
    ].join(","),
  },
  components: {
    MuiBottomNavigation: {
      styleOverrides: {
        root: ({ theme }) => ({
          borderTop: `1px solid ${theme.palette.divider}`,
        }),
      },
    },
    MuiDrawer: {
      styleOverrides: {
        anchorBottom: {
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
        },
      },
    },
  },
});
