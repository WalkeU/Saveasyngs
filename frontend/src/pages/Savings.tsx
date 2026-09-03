import { useEffect, useState } from "react";
import { api } from "../api";
import { formatMoney } from "../format";
import { CategoryIcon } from "../IconPicker";
import type { NetWorth } from "../types";

export function Savings() {
  const [data, setData] = useState<NetWorth | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.networth
      .get()
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

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
      </div>

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
