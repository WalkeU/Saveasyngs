import { useEffect, useState } from "react";
import { api } from "../api";
import { setDecimalPlaces } from "../format";

export function Settings() {
  const [decimalPlaces, setValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.settings.get().then((s) => {
      setValue(s.decimalPlaces);
      setLoading(false);
    });
  }, []);

  async function save(next: number) {
    setValue(next);
    setSaved(false);
    const updated = await api.settings.update(next);
    setDecimalPlaces(updated.decimalPlaces);
    setSaved(true);
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Beállítások</h1>
          <div className="page-sub">Az alkalmazás megjelenítési beállításai</div>
        </div>
      </div>

      {!loading && (
        <div className="card" style={{ maxWidth: 420 }}>
          <h2 style={{ fontSize: 17, marginBottom: 6 }}>Pénzösszegek tizedesjegyei</h2>
          <div style={{ fontSize: 12.5, color: "var(--ink-faint)", marginBottom: 14 }}>
            Forintnál általában 0 a jó érték. Ha egy megtakarítási helyed tört értékeket tart (pl.
            kripto), állíts be többet.
          </div>
          <div className="field">
            <label>Tizedesjegyek száma</label>
            <select value={decimalPlaces} onChange={(e) => save(Number(e.target.value))}>
              {[0, 1, 2, 3, 4, 5, 6].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
          {saved && <div style={{ fontSize: 12, color: "var(--accent)", marginTop: 10 }}>Elmentve.</div>}
        </div>
      )}
    </div>
  );
}
