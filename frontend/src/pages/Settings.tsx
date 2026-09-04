import { useEffect, useState } from "react";
import { api } from "../api";
import { setDecimalPlaces } from "../format";
import type { AppSettings } from "../types";

export function Settings() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [saved, setSaved] = useState<"decimalPlaces" | "transactionsBatchSize" | null>(null);
  const [authRequired, setAuthRequired] = useState(false);

  useEffect(() => {
    api.settings.get().then(setSettings);
    api.auth.status().then((s) => setAuthRequired(s.authRequired));
  }, []);

  async function save(field: keyof AppSettings, value: number) {
    setSettings((prev) => (prev ? { ...prev, [field]: value } : prev));
    setSaved(null);
    const updated = await api.settings.update({ [field]: value });
    setDecimalPlaces(updated.decimalPlaces);
    setSettings(updated);
    setSaved(field as "decimalPlaces" | "transactionsBatchSize");
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Beállítások</h1>
          <div className="page-sub">Az alkalmazás megjelenítési beállításai</div>
        </div>
      </div>

      {settings && (
        <div style={{ display: "flex", flexDirection: "column", gap: 18, maxWidth: 420 }}>
          <div className="card">
            <h2 style={{ fontSize: 17, marginBottom: 6 }}>Pénzösszegek tizedesjegyei</h2>
            <div style={{ fontSize: 12.5, color: "var(--ink-faint)", marginBottom: 14 }}>
              Forintnál általában 0 a jó érték. Ha egy megtakarítási helyed tört értékeket tart (pl.
              kripto), állíts be többet.
            </div>
            <div className="field">
              <label>Tizedesjegyek száma</label>
              <select
                value={settings.decimalPlaces}
                onChange={(e) => save("decimalPlaces", Number(e.target.value))}
              >
                {[0, 1, 2, 3, 4, 5, 6].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
            {saved === "decimalPlaces" && (
              <div style={{ fontSize: 12, color: "var(--accent)", marginTop: 10 }}>Elmentve.</div>
            )}
          </div>

          <div className="card">
            <h2 style={{ fontSize: 17, marginBottom: 6 }}>Tranzakciók betöltési mérete</h2>
            <div style={{ fontSize: 12.5, color: "var(--ink-faint)", marginBottom: 14 }}>
              A Tranzakciók lista ennyi tételt tölt be egyszerre, majd lefelé görgetve automatikusan
              betölti a következő adagot.
            </div>
            <div className="field">
              <label>Tételek adagonként</label>
              <select
                value={settings.transactionsBatchSize}
                onChange={(e) => save("transactionsBatchSize", Number(e.target.value))}
              >
                {[50, 100, 200, 500, 1000].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
            {saved === "transactionsBatchSize" && (
              <div style={{ fontSize: 12, color: "var(--accent)", marginTop: 10 }}>Elmentve.</div>
            )}
          </div>

          {authRequired && <PasswordCard />}
        </div>
      )}
    </div>
  );
}

function PasswordCard() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    if (newPassword !== confirm) {
      setError("Az új jelszó és a megerősítés nem egyezik.");
      return;
    }
    setSaving(true);
    try {
      await api.auth.changePassword(currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setConfirm("");
      setSaved(true);
    } catch {
      setError("Hibás jelenlegi jelszó.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="card" onSubmit={submit}>
      <h2 style={{ fontSize: 17, marginBottom: 6 }}>Jelszó módosítása</h2>
      <div style={{ fontSize: 12.5, color: "var(--ink-faint)", marginBottom: 14 }}>
        A belépéshez használt jelszó módosítása.
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div className="field">
          <label>Jelenlegi jelszó</label>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
          />
        </div>
        <div className="field">
          <label>Új jelszó</label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            minLength={4}
          />
        </div>
        <div className="field">
          <label>Új jelszó megerősítése</label>
          <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required minLength={4} />
        </div>
      </div>
      {error && <div style={{ fontSize: 12, color: "var(--expense)", marginTop: 10 }}>{error}</div>}
      {saved && <div style={{ fontSize: 12, color: "var(--accent)", marginTop: 10 }}>Jelszó módosítva.</div>}
      <button className="btn btn-primary" type="submit" disabled={saving} style={{ marginTop: 12 }}>
        Mentés
      </button>
    </form>
  );
}
