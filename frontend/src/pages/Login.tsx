import { useState } from "react";
import { api } from "../api";

export function Login({ mode, onSuccess }: { mode: "login" | "setup"; onSuccess: () => void }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (mode === "setup" && password !== confirm) {
      setError("A két jelszó nem egyezik.");
      return;
    }
    setSubmitting(true);
    try {
      if (mode === "setup") await api.auth.setup(password);
      else await api.auth.login(password);
      onSuccess();
    } catch {
      setError(mode === "setup" ? "Nem sikerült beállítani a jelszót." : "Hibás jelszó.");
      setPassword("");
      setConfirm("");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100svh",
        display: "grid",
        placeItems: "center",
        background: "var(--paper)",
      }}
    >
      <form onSubmit={submit} className="card" style={{ width: 320, display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <img src="/favicon.svg" alt="" width={30} height={30} style={{ borderRadius: 8 }} />
          <span style={{ fontFamily: "var(--font-display)", fontSize: 19, fontWeight: 600, letterSpacing: "-0.01em" }}>
            Saveasy
          </span>
        </div>
        {mode === "setup" && (
          <div style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>
            Első belépés — állíts be egy jelszót. Bármikor módosíthatod majd a Beállításokban.
          </div>
        )}
        <div className="field">
          <label>{mode === "setup" ? "Új jelszó" : "Jelszó"}</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
            required
            minLength={4}
          />
        </div>
        {mode === "setup" && (
          <div className="field">
            <label>Jelszó megerősítése</label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              minLength={4}
            />
          </div>
        )}
        {error && <div style={{ fontSize: 12.5, color: "var(--expense)" }}>{error}</div>}
        <button className="btn btn-primary" type="submit" disabled={submitting}>
          {mode === "setup" ? "Jelszó beállítása" : "Belépés"}
        </button>
      </form>
    </div>
  );
}
