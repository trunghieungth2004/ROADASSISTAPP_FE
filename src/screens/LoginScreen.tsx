import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword } from "firebase/auth";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Container from "@mui/material/Container";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { auth } from "../auth/firebase";
import { register } from "../api/auth";
import { toMessage } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useProfile } from "../context/ProfileContext";
import { useStrings } from "../context/LanguageContext";

export default function LoginScreen() {
  const { t } = useStrings();
  const { signIn } = useAuth();
  const { refresh } = useProfile();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
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
          phone,
        });
      }
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const nextToken = await cred.user.getIdToken();
      signIn(cred.user.uid, nextToken);
      const next = await refresh();
      if (next?.user.role === "1") {
        navigate("/admin");
      } else if (!next || next.user.onboarded === true) {
        navigate("/");
      } else {
        navigate("/roles");
      }
    } catch (err) {
      setError(toMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Box
      sx={{
        height: "100%",
        overflowY: "auto",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        px: 2,
        py: 4,
      }}
    >
      <Container maxWidth="xs" disableGutters>
        <Box sx={{ textAlign: "center", mb: 3 }}>
          <Typography variant="h4" component="h1" color="primary">
            {t.appName}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {t.home.subtitle}
          </Typography>
        </Box>
        <Card>
          <CardContent sx={{ p: 2 }}>
            <Tabs
              value={mode}
              onChange={(_, value: "login" | "register") => setMode(value)}
              variant="fullWidth"
            >
              <Tab value="login" label={t.auth.signIn} />
              <Tab value="register" label={t.auth.createAccount} />
            </Tabs>
            <Box
              component="form"
              onSubmit={onSubmit}
              sx={{ mt: 2, display: "flex", flexDirection: "column", gap: 2 }}
            >
              {mode === "register" ? (
                <TextField
                  label={t.auth.displayName}
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  autoComplete="name"
                  fullWidth
                />
              ) : null}
              {mode === "register" ? (
                <TextField
                  label={t.auth.phone}
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  autoComplete="tel"
                  fullWidth
                />
              ) : null}
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
              {error ? <Alert severity="error">{error}</Alert> : null}
              <Button type="submit" variant="contained" disabled={busy} fullWidth>
                {mode === "login" ? t.auth.signIn : t.auth.createAccount}
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
}
