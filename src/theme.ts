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
        text: {
          primary: "#111111",
          secondary: "#737373",
        },
        divider: "#e5e5e5",
        error: {
          main: "#b91c1c",
        },
        success: {
          main: "#15803d",
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
        background: {
          default: "#121212",
          paper: "#1e1e22",
        },
        text: {
          primary: "#ffffff",
          secondary: "#a3a3a3",
        },
        divider: "#404040",
        error: {
          main: "#f87171",
        },
        success: {
          main: "#4ade80",
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
    h5: {
      fontWeight: 700,
    },
    h6: {
      fontWeight: 700,
    },
    subtitle1: {
      fontWeight: 600,
    },
    subtitle2: {
      fontWeight: 600,
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        ":root": {
          colorScheme: "light dark",
        },
        "button, [role='button'], a": {
          WebkitTapHighlightColor: "transparent",
        },
        "*:focus-visible": {
          outline: "3px solid var(--mui-palette-primary-main)",
          outlineOffset: 2,
        },
      },
    },
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
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
          boxShadow: "none",
          border: "1px solid",
          borderColor: "var(--mui-palette-divider)",
          borderRadius: 20,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
          fontWeight: 600,
          borderRadius: 12,
          minHeight: 40,
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 22,
          border: "1px solid var(--mui-palette-divider)",
          backgroundImage: "none",
          margin: 16,
          width: "calc(100% - 32px)",
        },
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: {
          fontWeight: 800,
          paddingBottom: 8,
        },
      },
    },
    MuiDialogActions: {
      styleOverrides: {
        root: {
          gap: 8,
          padding: "12px 20px 20px",
          flexWrap: "wrap",
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        variant: "outlined",
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 14,
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: "none",
          fontWeight: 600,
        },
      },
    },
    MuiBottomNavigationAction: {
      styleOverrides: {
        root: {
          minWidth: 0,
          paddingTop: 8,
          paddingBottom: 8,
        },
      },
    },
  },
});
