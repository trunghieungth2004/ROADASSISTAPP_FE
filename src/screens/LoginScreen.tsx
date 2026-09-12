import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword } from "firebase/auth";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Container from "@mui/material/Container";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { auth } from "../auth/firebase";
import { register } from "../api/auth";
import { toMessage } from "../api/client";
import { config } from "../config";
import { useAuth } from "../context/AuthContext";
import { useStrings } from "../context/LanguageContext";
import { mapDefaults } from "../map/style";

const TILE_ZOOM = 14;

function mapTileUrl(): string {
  const n = 2 ** TILE_ZOOM;
  const [lng, lat] = mapDefaults.center;
  const x = Math.floor(((lng + 180) / 360) * n);
  const rad = (lat * Math.PI) / 180;
  const y = Math.floor(
    ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * n,
  );
  return config.maptilerKey
    ? `https://api.maptiler.com/maps/streets-v2/${TILE_ZOOM}/${x}/${y}.png?key=${config.maptilerKey}`
    : `https://tile.openstreetmap.org/${TILE_ZOOM}/${x}/${y}.png`;
}

export default function LoginScreen() {
  const { t } = useStrings();
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === "register") {
        await register({
          email,
          password,
          displayName: displayName || undefined,
        });
      }
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const token = await cred.user.getIdToken();
      signIn(cred.user.uid, token);
      navigate("/");
    } catch (err) {
      setError(toMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Box sx={{ height: "100%", display: "flex" }}>
      <Box
        sx={{
          display: { xs: "none", md: "block" },
          position: "relative",
          overflow: "hidden",
          flex: "1 1 55%",
        }}
      >
        <Box
          aria-hidden
          sx={{
            position: "absolute",
            inset: "-10%",
            backgroundImage: `url("${mapTileUrl()}")`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            filter: "blur(14px)",
            transform: "scale(1.2)",
          }}
        />
        <Box
          aria-hidden
          sx={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(160deg, rgba(2,132,199,0.62), rgba(2,132,199,0.05) 75%)",
          }}
        />
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            p: 5,
            pointerEvents: "none",
          }}
        >
          <Box>
            <Typography variant="h4" component="h1" color="#ffffff">
              {t.appName}
            </Typography>
            <Typography sx={{ color: "rgba(255,255,255,0.92)", mt: 1 }}>
              {t.home.subtitle}
            </Typography>
          </Box>
          <svg
            viewBox="0 0 220 140"
            width="260"
            height="165"
            aria-hidden
            style={{ alignSelf: "flex-start" }}
          >
            <path
              d="M12 126 C 56 122, 62 80, 96 80 S 168 44, 200 22"
              fill="none"
              stroke="rgba(255,255,255,0.85)"
              strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray="1 14"
            />
            <circle
              cx="200"
              cy="22"
              r="12"
              fill="#fbbf24"
              stroke="#ffffff"
              strokeWidth="3"
            />
            <circle cx="200" cy="22" r="4.5" fill="#451a03" />
          </svg>
        </Box>
      </Box>
      <Box
        sx={{
          flex: "1 1 45%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          px: { xs: 3, md: 6 },
          py: 3,
        }}
      >
        <Container maxWidth="xs" disableGutters>
          <Typography
            variant="h5"
            component="h1"
            color="primary"
            sx={{ display: { md: "none" } }}
          >
            {t.appName}
          </Typography>
          <Tabs
            value={mode}
            onChange={(_, v: "login" | "register") => setMode(v)}
            sx={{ mt: { xs: 1, md: 0 } }}
          >
            <Tab value="login" label={t.auth.signIn} />
            <Tab value="register" label={t.auth.createAccount} />
          </Tabs>
          <Box
            component="form"
            onSubmit={onSubmit}
            sx={{ mt: 2, display: "flex", flexDirection: "column", gap: 2 }}
          >
            {mode === "register" && (
              <TextField
                label={t.auth.displayName}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                autoComplete="name"
                fullWidth
              />
            )}
            <TextField
              label={t.auth.email}
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              fullWidth
            />
            <TextField
              label={t.auth.password}
              type="password"
              required
              slotProps={{ htmlInput: { minLength: 6 } }}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              fullWidth
            />
            {error && <Alert severity="error">{error}</Alert>}
            <Button type="submit" variant="contained" disabled={busy} fullWidth>
              {mode === "login" ? t.auth.signIn : t.auth.createAccount}
            </Button>
          </Box>
        </Container>
      </Box>
    </Box>
  );
}