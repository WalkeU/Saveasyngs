import { useEffect, useState } from "react";
import { api } from "../api";
import { formatMoney, toLocalDateInput } from "../format";
import { CategoryIcon } from "../IconPicker";
import type { NetWorth } from "../types";

export function Savings() {
  const [data, setData] = useState<NetWorth | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingOpening, setEditingOpening] = useState(false);
  const [openingLiquid, setOpeningLiquid] = useState("");
  const [openingDate, setOpeningDate] = useState(toLocalDateInput(new Date()));

  const load = () => {
    setLoading(true);
    api.networth
      .get()
      .then((d) => {
        setData(d);
        setOpeningLiquid(String(d.opening.opening_liquid));
        setOpeningDate(d.opening.opening_date);
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  async function saveOpening(e: React.FormEvent) {
    e.preventDefault();
    await api.networth.setOpening(Number(openingLiquid) || 0, openingDate);
    setEditingOpening(false);
    load();
  }

  const bucketsTotal = data?.buckets.reduce((sum, b) => sum + b.total, 0) ?? 0;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Megtakarítás</h1>
          <div className="page-sub">
            A vagyonod összetétele — mennyi a szabad (liquid) pénzed, és mennyi van lekötve
          </div>
        </div>
        <button className="btn" onClick={() => setEditingOpening((s) => !s)}>
          Nyitó egyenleg
        </button>
      </div>

      {editingOpening && (
        <form
          className="card"
          onSubmit={saveOpening}
          style={{ marginBottom: 18, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}
        >
          <div className="field">
            <label>Nyitó szabad (liquid) egyenleg</label>
            <input
              type="number"
              value={openingLiquid}
              onChange={(e) => setOpeningLiquid(e.target.value)}
              style={{ width: 160 }}
            />
          </div>
          <div className="field">
            <label>Dátum</label>
            <input type="date" value={openingDate} onChange={(e) => setOpeningDate(e.target.value)} />
          </div>
          <button className="btn btn-primary" type="submit">
            Mentés
          </button>
          <button className="btn btn-ghost" type="button" onClick={() => setEditingOpening(false)}>
            Mégse
          </button>
          <div style={{ flexBasis: "100%", fontSize: 12.5, color: "var(--ink-faint)" }}>
            Ezt csak egyszer kell beállítanod — a kezdő állapotot, amitől kezdve a rendszer a bevételekből,
            kiadásokból és megtakarításokból számolja tovább a vagyonod.
          </div>
        </form>
      )}

      {!loading && data && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 24 }}>
            <StatCard label="Nettó vagyon" value={data.netWorth} />
            <StatCard label="Szabad (liquid) pénz" value={data.liquid} muted />
            <StatCard label="Lekötve összesen" value={bucketsTotal} muted />
          </div>

          <div className="card">
            <h2 style={{ fontSize: 17, marginBottom: 14 }}>Megtakarítási kategóriák</h2>
            {data.buckets.length === 0 ? (
              <div className="empty-state">
                Még nincs megtakarítási kategóriád. Vegyél fel egyet a Kategóriák oldalon (pl. "ETH",
                "Részvényszámla"), majd a Tranzakciók listában bármelyik tételnél a kategória-választóban
                jelöld meg "megtakarításnak" — onnantól itt fog megjelenni.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {data.buckets.map((b) => {
                  const pct = bucketsTotal ? (b.total / bucketsTotal) * 100 : 0;
                  return (
                    <div key={b.category_id}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5, marginBottom: 4 }}>
                        <span style={{ display: "flex", alignItems: "center", gap: 7 }}>
                          <CategoryIcon icon={b.category_icon} color={b.category_color ?? undefined} />
                          {b.category_name}
                        </span>
                        <span className="tabular">{formatMoney(b.total)}</span>
                      </div>
                      <div style={{ height: 5, background: "var(--paper-sunken)", borderRadius: 4, overflow: "hidden" }}>
                        <div
                          style={{ width: `${pct}%`, height: "100%", background: b.category_color ?? "var(--accent)" }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({ label, value, muted }: { label: string; value: number; muted?: boolean }) {
  return (
    <div className="card">
      <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--ink-soft)", marginBottom: 8 }}>
        {label}
      </div>
      <div
        className="tabular"
        style={{ fontSize: 26, fontWeight: 600, color: muted ? "var(--ink)" : "var(--accent)" }}
      >
        {formatMoney(value)}
      </div>
    </div>
  );
}
