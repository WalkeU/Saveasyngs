import { useEffect, useState } from "react";
import { api } from "../api";
import { setDecimalPlaces } from "../format";
import { IconDownload } from "../icons";
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

          <BackupCard />

          {authRequired && <PasswordCard />}
        </div>
      )}
    </div>
  );
}

function BackupCard() {
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function doImport() {
    if (!file) return;
    const ok = window.confirm(
      "Ez felülírja a jelenlegi adatbázis ÖSSZES adatát a feltöltött fájl tartalmával. Ez nem visszavonható. Biztosan folytatod?",
    );
    if (!ok) return;
    setImporting(true);
    setError(null);
    try {
      await api.backup.import(file);
      setDone(true);
      setTimeout(() => window.location.reload(), 1200);
    } catch {
      setError("A visszaállítás nem sikerült — ellenőrizd, hogy a fájl érvényes-e.");
      setImporting(false);
    }
  }

  return (
    <div className="card">
      <h2 style={{ fontSize: 17, marginBottom: 6 }}>Biztonsági mentés</h2>
      <div style={{ fontSize: 12.5, color: "var(--ink-faint)", marginBottom: 14 }}>
        A teljes adatbázis le- és visszatöltése — költözéshez egy másik szerverre, vagy sima
        backuphoz. A visszaállítás felülírja az összes jelenlegi adatot.
      </div>

      {done ? (
        <div style={{ fontSize: 13, color: "var(--accent)" }}>Visszaállítva — az oldal újratöltődik…</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <div style={{ fontSize: 13, marginBottom: 8 }}>Export</div>
            <a className="btn btn-primary" href={api.backup.exportUrl}>
              <IconDownload size={14} /> Teljes export letöltése
            </a>
          </div>
          <div>
            <div style={{ fontSize: 13, marginBottom: 8 }}>Visszaállítás</div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <input type="file" accept=".db" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
              <button className="btn btn-danger" disabled={!file || importing} onClick={doImport}>
                Visszaállítás
              </button>
            </div>
            {error && <div style={{ fontSize: 12, color: "var(--expense)", marginTop: 8 }}>{error}</div>}
          </div>
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
