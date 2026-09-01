import { useEffect, useMemo, useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { api } from "../api";
import { categoryColor, formatMoney, toLocalDateInput } from "../format";
import { CategoryIcon } from "../IconPicker";
import { IconChevronLeft, IconChevronRight } from "../icons";
import type { MonthlyComparison, ReportByCategory, ReportSummary, TransactionType } from "../types";

function monthBounds(offset = 0) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const end = new Date(now.getFullYear(), now.getMonth() + offset + 1, 0);
  return { from: toLocalDateInput(start), to: toLocalDateInput(end) };
}

function monthKey(offset = 0) {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function shiftMonthKey(month: string, delta: number) {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function formatMonthLabel(month: string) {
  const [y, m] = month.split("-").map(Number);
  return new Intl.DateTimeFormat("hu-HU", { year: "numeric", month: "long" }).format(
    new Date(y, m - 1, 1),
  );
}

export function Dashboard() {
  const [{ from, to }, setRange] = useState(monthBounds());
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [breakdownType, setBreakdownType] = useState<TransactionType>("expense");
  const [breakdown, setBreakdown] = useState<ReportByCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.reports.summary({ from, to }),
      api.reports.byCategory({ type: breakdownType, from, to }),
    ])
      .then(([s, b]) => {
        setSummary(s);
        setBreakdown(b);
      })
      .finally(() => setLoading(false));
  }, [from, to, breakdownType]);

  const breakdownTotal = useMemo(
    () => breakdown.reduce((sum, row) => sum + row.total, 0),
    [breakdown],
  );

  const [comparisonMonth, setComparisonMonth] = useState(monthKey());
  const [comparison, setComparison] = useState<MonthlyComparison | null>(null);
  const [comparisonLoading, setComparisonLoading] = useState(true);

  useEffect(() => {
    setComparisonLoading(true);
    api.reports
      .monthlyComparison(comparisonMonth)
      .then(setComparison)
      .finally(() => setComparisonLoading(false));
  }, [comparisonMonth]);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Áttekintés</h1>
          <div className="page-sub">Bevételek, kiadások és kategóriák a kiválasztott időszakban</div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
          <div className="field">
            <label>Ettől</label>
            <input type="date" value={from} onChange={(e) => setRange({ from: e.target.value, to })} />
          </div>
          <div className="field">
            <label>Eddig</label>
            <input type="date" value={to} onChange={(e) => setRange({ from, to: e.target.value })} />
          </div>
          <button className="btn" onClick={() => setRange(monthBounds())}>
            Ez a hónap
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 24 }}>
        <StatCard label="Bevétel" value={summary?.income ?? 0} tone="income" />
        <StatCard label="Kiadás" value={summary?.expense ?? 0} tone="expense" />
        <StatCard label="Egyenleg" value={summary?.net ?? 0} tone={((summary?.net ?? 0) >= 0 ? "income" : "expense")} />
      </div>

      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h2 style={{ fontSize: 17 }}>Kategóriák szerint</h2>
          <div style={{ display: "flex", gap: 4 }}>
            <button
              className={`btn ${breakdownType === "expense" ? "btn-primary" : "btn-ghost"}`}
              onClick={() => setBreakdownType("expense")}
            >
              Kiadás
            </button>
            <button
              className={`btn ${breakdownType === "income" ? "btn-primary" : "btn-ghost"}`}
              onClick={() => setBreakdownType("income")}
            >
              Bevétel
            </button>
          </div>
        </div>

        {!loading && breakdown.length === 0 && (
          <div className="empty-state">Nincs adat ebben az időszakban.</div>
        )}

        {breakdown.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 28, alignItems: "center" }}>
            <div style={{ height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={breakdown}
                    dataKey="total"
                    nameKey="category_name"
                    innerRadius={58}
                    outerRadius={90}
                    paddingAngle={2}
                    stroke="var(--paper-raised)"
                    strokeWidth={2}
                  >
                    {breakdown.map((row) => (
                      <Cell key={row.category_id ?? "none"} fill={categoryColor(row.category_id, row.category_color)} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => formatMoney(Number(value) || 0)}
                    contentStyle={{
                      background: "var(--paper-raised)",
                      border: "1px solid var(--hairline)",
                      borderRadius: 8,
                      fontSize: 13,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {breakdown.map((row) => {
                const pct = breakdownTotal ? (row.total / breakdownTotal) * 100 : 0;
                return (
                  <div key={row.category_id ?? "none"}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5, marginBottom: 4 }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 7 }}>
                        <CategoryIcon icon={row.category_icon} color={categoryColor(row.category_id, row.category_color)} />
                        {row.category_name}
                        <span style={{ color: "var(--ink-faint)" }}>({row.count})</span>
                      </span>
                      <span className="tabular">{formatMoney(row.total)}</span>
                    </div>
                    <div style={{ height: 5, background: "var(--paper-sunken)", borderRadius: 4, overflow: "hidden" }}>
                      <div
                        style={{
                          width: `${pct}%`,
                          height: "100%",
                          background: categoryColor(row.category_id, row.category_color),
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="card" style={{ marginTop: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h2 style={{ fontSize: 17 }}>Havi összehasonlítás</h2>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <button
              className="btn btn-icon btn-ghost"
              onClick={() => setComparisonMonth((m) => shiftMonthKey(m, -1))}
              title="Előző hónap"
            >
              <IconChevronLeft />
            </button>
            <span style={{ fontSize: 13.5, minWidth: 130, textAlign: "center", textTransform: "capitalize" }}>
              {formatMonthLabel(comparisonMonth)}
            </span>
            <button
              className="btn btn-icon btn-ghost"
              onClick={() => setComparisonMonth((m) => shiftMonthKey(m, 1))}
              title="Következő hónap"
              disabled={comparisonMonth >= monthKey()}
            >
              <IconChevronRight />
            </button>
          </div>
        </div>

        {!comparisonLoading && comparison && comparison.categories.length === 0 && (
          <div className="empty-state">Nincs kiadás ebben a hónapban.</div>
        )}

        {comparison && comparison.categories.length > 0 && (
          <table className="data-table">
            <thead>
              <tr>
                <th>Kategória</th>
                <th style={{ textAlign: "right" }}>Ez a hónap</th>
                <th style={{ textAlign: "right" }}>Előző hónap</th>
                <th style={{ textAlign: "right" }}>Változás</th>
                <th style={{ textAlign: "right" }}>Havi átlag</th>
              </tr>
            </thead>
            <tbody>
              {comparison.categories.map((row) => (
                <tr key={row.category_id ?? "none"}>
                  <td>
                    <span style={{ display: "flex", alignItems: "center", gap: 7 }}>
                      <CategoryIcon icon={row.category_icon} color={categoryColor(row.category_id, row.category_color)} />
                      {row.category_name}
                    </span>
                  </td>
                  <td className="tabular" style={{ textAlign: "right" }}>
                    {formatMoney(row.current)}
                  </td>
                  <td className="tabular" style={{ textAlign: "right", color: "var(--ink-soft)" }}>
                    {formatMoney(row.previous)}
                  </td>
                  <td
                    className={`tabular ${row.delta > 0 ? "amount-expense" : row.delta < 0 ? "amount-income" : ""}`}
                    style={{ textAlign: "right", whiteSpace: "nowrap" }}
                  >
                    {row.delta > 0 ? "+" : row.delta < 0 ? "−" : "±"}
                    {formatMoney(Math.abs(row.delta))}
                    {row.deltaPercent !== null && (
                      <span style={{ color: "var(--ink-faint)", marginLeft: 5 }}>
                        ({row.delta >= 0 ? "+" : "−"}
                        {Math.abs(row.deltaPercent).toFixed(0)}%)
                      </span>
                    )}
                  </td>
                  <td className="tabular" style={{ textAlign: "right", color: "var(--ink-soft)" }}>
                    {formatMoney(row.average)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, tone }: { label: string; value: number; tone: "income" | "expense" }) {
  return (
    <div className="card">
      <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--ink-soft)", marginBottom: 8 }}>
        {label}
      </div>
      <div className={`tabular amount-${tone}`} style={{ fontSize: 26, fontWeight: 600 }}>
        {formatMoney(value)}
      </div>
    </div>
  );
}
