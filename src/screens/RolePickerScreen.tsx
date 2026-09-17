import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import StorefrontIcon from "@mui/icons-material/Storefront";
import TwoWheelerIcon from "@mui/icons-material/TwoWheeler";
import VolunteerActivismIcon from "@mui/icons-material/VolunteerActivism";
import { toMessage } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useProfile } from "../context/ProfileContext";
import { useStrings } from "../context/LanguageContext";

const PROVIDERS = [
  {
    service: "VOLUNTEER",
    labelKey: "volunteer",
    hintKey: "volunteerHint",
    Icon: VolunteerActivismIcon,
  },
  {
    service: "SHOP",
    labelKey: "shop",
    hintKey: "shopHint",
    Icon: StorefrontIcon,
  },
  {
    service: "TOW",
    labelKey: "tow",
    hintKey: "towHint",
    Icon: LocalShippingIcon,
  },
] as const;

export default function RolePickerScreen() {
  const { t } = useStrings();
  const { token } = useAuth();
  const { markOnboarded } = useProfile();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [picked, setPicked] = useState<string[]>([]);

  function toggle(service: string) {
    setPicked((prev) =>
      prev.includes(service) ?
        prev.filter((s) => s !== service) :
        [...prev, service],
    );
  }

  async function finish() {
    if (!token) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await markOnboarded("RIDER");
      for (const service of picked) {
        await markOnboarded(service);
      }
      navigate("/");
    } catch (err) {
      setError(toMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Container maxWidth="sm" sx={{ py: 2, overflowY: "auto", height: "100%" }}>
      <Typography variant="h6">{t.roles.title}</Typography>
      <Typography variant="body2" color="text.secondary">
        {t.roles.subtitle}
      </Typography>
      {error && (
        <Alert severity="error" sx={{ mt: 1 }}>
          {error}
        </Alert>
      )}
      <Box sx={{ mt: 2, display: "flex", flexDirection: "column", gap: 2 }}>
        <Card>
          <CardContent
            sx={{ display: "flex", flexDirection: "column", gap: 1 }}
          >
            <Button
              variant="outlined"
              startIcon={<TwoWheelerIcon color="primary" />}
              aria-pressed
              sx={{
                justifyContent: "flex-start",
                color: "text.primary",
                fontWeight: 700,
                borderWidth: 2,
                borderColor: "primary.main",
                padding: "4px 14px",
              }}
            >
              {t.roles.rider} — {t.roles.riderHint}
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardContent
            sx={{ display: "flex", flexDirection: "column", gap: 1 }}
          >
            {PROVIDERS.map(({ service, labelKey, hintKey, Icon }) => {
              const active = picked.includes(service);
              const label = t.roles[labelKey] as string;
              const hint = t.roles[hintKey] as string;
              return (
                <Button
                  key={service}
                  variant={active ? "contained" : "outlined"}
                  startIcon={<Icon color={active ? "inherit" : "primary"} />}
                  aria-pressed={active}
                  disabled={busy}
                  onClick={() => toggle(service)}
                  sx={{
                    justifyContent: "flex-start",
                    padding: "4px 14px",
                  }}
                >
                  {label} — {hint}
                </Button>
              );
            })}
          </CardContent>
        </Card>
        <Button variant="contained" disabled={busy} onClick={() => void finish()}>
          {t.roles.rider}
        </Button>
        <Button variant="text" disabled={busy} onClick={() => void finish()}>
          {t.roles.skip}
        </Button>
      </Box>
    </Container>
  );
}
