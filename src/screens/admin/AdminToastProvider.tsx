import { useCallback, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import CloseIcon from "@mui/icons-material/Close";
import AdminToastContext, { type AdminToastInput } from "./AdminToastContext";

type ToastItem = AdminToastInput & { id: number };

export default function AdminToastProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    (input: AdminToastInput) => {
      const id = Date.now() + Math.random();
      setToasts((prev) => [...prev.slice(-3), { ...input, id }]);
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
      }, 6000);
    },
    [],
  );

  return (
    <AdminToastContext.Provider value={{ showToast }}>
      {children}
      <Box
        sx={{
          position: "fixed",
          top: 16,
          right: 16,
          zIndex: 1400,
          display: "flex",
          flexDirection: "column",
          gap: 1,
          width: { xs: "calc(100% - 32px)", sm: 360 },
          pointerEvents: "none",
        }}
      >
        {toasts.map((toast) => (
          <Card
            key={toast.id}
            sx={{
              pointerEvents: "auto",
              boxShadow: 6,
              cursor: toast.route ? "pointer" : "default",
              borderColor: "primary.main",
            }}
            onClick={() => {
              if (toast.route) {
                navigate(toast.route);
                dismiss(toast.id);
              }
            }}
          >
            <CardContent
              sx={{
                display: "flex",
                alignItems: "flex-start",
                gap: 1,
                py: 1.25,
                "&:last-child": { pb: 1.25 },
              }}
            >
              <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                <Typography variant="subtitle2">{toast.title}</Typography>
                {toast.body ? (
                  <Typography variant="body2" color="text.secondary">
                    {toast.body}
                  </Typography>
                ) : null}
              </Box>
              <IconButton
                size="small"
                aria-label="close"
                onClick={(event) => {
                  event.stopPropagation();
                  dismiss(toast.id);
                }}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </CardContent>
          </Card>
        ))}
      </Box>
    </AdminToastContext.Provider>
  );
}
