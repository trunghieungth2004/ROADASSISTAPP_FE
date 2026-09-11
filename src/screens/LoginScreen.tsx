import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../auth/firebase";
import { register } from "../api/auth";
import { toMessage } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useStrings } from "../context/LanguageContext";

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

  const input =
    "w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-base outline-none focus:border-green-700";

  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col justify-center p-4">
      <h1 className="text-xl font-bold text-green-800">{t.appName}</h1>
      <p className="mt-1 text-sm font-medium text-neutral-600">
        {mode === "login" ? t.auth.signIn : t.auth.createAccount}
      </p>
      <form onSubmit={onSubmit} className="mt-4 flex flex-col gap-3">
        {mode === "register" && (
          <input
            className={input}
            placeholder={t.auth.displayName}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            autoComplete="name"
          />
        )}
        <input
          className={input}
          placeholder={t.auth.email}
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />
        <input
          className={input}
          placeholder={t.auth.password}
          type="password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={mode === "login" ? "current-password" : "new-password"}
        />
        {error && (
          <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={busy}
          className="rounded-xl bg-green-700 px-3 py-2.5 text-base font-semibold text-white disabled:opacity-50"
        >
          {mode === "login" ? t.auth.signIn : t.auth.createAccount}
        </button>
      </form>
      <button
        type="button"
        onClick={() => setMode(mode === "login" ? "register" : "login")}
        className="mt-3 text-sm font-medium text-green-700"
      >
        {mode === "login" ? t.auth.needAccount : t.auth.haveAccount}
      </button>
    </div>
  );
}
