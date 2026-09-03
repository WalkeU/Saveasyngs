import { useEffect, useState } from "react";
import { api } from "../api";
import { setDecimalPlaces } from "../format";
import type { AppSettings } from "../types";

export function Settings() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [saved, setSaved] = useState<"decimalPlaces" | "transactionsBatchSize" | null>(null);

  useEffect(() => {
    api.settings.get().then(setSettings);
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
        </div>
      )}
    </div>
  );
}
