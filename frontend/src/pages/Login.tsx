import { useState } from "react";
import { api } from "../api";

export function Login({ onSuccess }: { onSuccess: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.auth.login(password);
      onSuccess();
    } catch {
      setError("Hibás jelszó.");
      setPassword("");
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
        <div className="field">
          <label>Jelszó</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
            required
          />
        </div>
        {error && <div style={{ fontSize: 12.5, color: "var(--expense)" }}>{error}</div>}
        <button className="btn btn-primary" type="submit" disabled={submitting}>
          Belépés
        </button>
      </form>
    </div>
  );
}
