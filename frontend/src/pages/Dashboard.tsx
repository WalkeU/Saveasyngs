import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "../api";
import {
  categoryColor,
  formatMoney,
  formatMonthLabel,
  monthKey,
  shiftMonthKey,
  toLocalDateInput,
} from "../format";
import { CategoryIcon } from "../IconPicker";
import { IconChevronLeft, IconChevronRight } from "../icons";
import type {
  MonthlyByCategory,
  MonthlyComparison,
  RecurringShare,
  ReportByCategory,
  ReportSummary,
  TransactionType,
} from "../types";

const tooltipStyle = {
  background: "var(--paper-raised)",
  border: "1px solid var(--hairline)",
  borderRadius: 8,
  fontSize: 13,
};

function monthBounds(offset = 0) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const end = new Date(now.getFullYear(), now.getMonth() + offset + 1, 0);
  return { from: toLocalDateInput(start), to: toLocalDateInput(end) };
}


export function Dashboard() {
  const [monthOffset, setMonthOffset] = useState(0);
  const [{ from, to }, setRange] = useState(monthBounds());

  function goToMonth(offset: number) {
    setMonthOffset(offset);
    setRange(monthBounds(offset));
  }
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [breakdownType, setBreakdownType] = useState<TransactionType>("expense");
  const [breakdown, setBreakdown] = useState<ReportByCategory[]>([]);
  const [chartKind, setChartKind] = useState<"pie" | "bar">("pie");
  const [loading, setLoading] = useState(true);

  const [trendType, setTrendType] = useState<TransactionType>("expense");
  const [trend, setTrend] = useState<MonthlyByCategory | null>(null);
  const [trendLoading, setTrendLoading] = useState(true);

  useEffect(() => {
    setTrendLoading(true);
    api.reports
      .monthlyByCategory({ type: trendType, months: 6 })
      .then(setTrend)
      .finally(() => setTrendLoading(false));
  }, [trendType]);

  const [share, setShare] = useState<RecurringShare | null>(null);
  useEffect(() => {
    api.recurring.share(monthKey(monthOffset)).then(setShare);
  }, [monthOffset]);

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
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <button className="btn btn-icon btn-ghost" onClick={() => goToMonth(monthOffset - 1)} title="Előző hónap">
              <IconChevronLeft />
            </button>
            <button
              className="btn"
              onClick={() => goToMonth(0)}
              style={{ minWidth: 130, textTransform: "capitalize" }}
              title="Ugrás a mai hónapra"
            >
              {formatMonthLabel(monthKey(monthOffset))}
            </button>
            <button
              className="btn btn-icon btn-ghost"
              onClick={() => goToMonth(monthOffset + 1)}
              title="Következő hónap"
              disabled={monthOffset >= 0}
            >
              <IconChevronRight />
            </button>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 24 }}>
        <StatCard label="Bevétel" value={summary?.income ?? 0} tone="income" />
        <StatCard label="Kiadás" value={summary?.expense ?? 0} tone="expense" />
        <StatCard label="Egyenleg" value={summary?.net ?? 0} tone={((summary?.net ?? 0) >= 0 ? "income" : "expense")} />
      </div>

      {share && (share.expense.recurringTotal > 0 || share.income.recurringTotal > 0) && (
        <div className="card" style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: 17, marginBottom: 14 }}>Ismétlődők aránya</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {share.expense.recurringTotal > 0 && (
              <RecurringShareRow label="Kiadás" tone="expense" data={share.expense} />
            )}
            {share.income.recurringTotal > 0 && (
              <RecurringShareRow label="Bevétel" tone="income" data={share.income} />
            )}
          </div>
        </div>
      )}

      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h2 style={{ fontSize: 17 }}>Kategóriák szerint</h2>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <div style={{ display: "flex", gap: 4 }}>
              <button
                className={`btn ${chartKind === "pie" ? "btn-primary" : "btn-ghost"}`}
                onClick={() => setChartKind("pie")}
                title="Kör diagram"
              >
                Kör
              </button>
              <button
                className={`btn ${chartKind === "bar" ? "btn-primary" : "btn-ghost"}`}
                onClick={() => setChartKind("bar")}
                title="Oszlopdiagram"
              >
                Oszlop
              </button>
            </div>
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
        </div>

        {!loading && breakdown.length === 0 && (
          <div className="empty-state">Nincs adat ebben az időszakban.</div>
        )}

        {breakdown.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 28, alignItems: "center" }}>
            <div style={{ height: 220, width: 220, minWidth: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                {chartKind === "pie" ? (
                  <PieChart key={`pie-${breakdownType}`}>
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
                    <Tooltip formatter={(value) => formatMoney(Number(value) || 0)} contentStyle={tooltipStyle} />
                  </PieChart>
                ) : (
                  <BarChart
                    key={`bar-${breakdownType}`}
                    data={[Object.fromEntries(breakdown.map((row) => [row.category_name, row.total]))]}
                    margin={{ left: 0, right: 0, top: 8 }}
                  >
                    <XAxis hide dataKey={() => "x"} />
                    <YAxis hide />
                    <Tooltip formatter={(value) => formatMoney(Number(value) || 0)} contentStyle={tooltipStyle} />
                    {breakdown.map((row) => (
                      <Bar
                        key={row.category_id ?? "none"}
                        dataKey={row.category_name}
                        name={row.category_name}
                        fill={categoryColor(row.category_id, row.category_color)}
                        radius={[4, 4, 0, 0]}
                      />
                    ))}
                  </BarChart>
                )}
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

      <div className="card" style={{ marginTop: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h2 style={{ fontSize: 17 }}>Kategóriák havonta</h2>
          <div style={{ display: "flex", gap: 4 }}>
            <button
              className={`btn ${trendType === "expense" ? "btn-primary" : "btn-ghost"}`}
              onClick={() => setTrendType("expense")}
            >
              Kiadás
            </button>
            <button
              className={`btn ${trendType === "income" ? "btn-primary" : "btn-ghost"}`}
              onClick={() => setTrendType("income")}
            >
              Bevétel
            </button>
          </div>
        </div>

        {!trendLoading && trend && trend.months.length === 0 && (
          <div className="empty-state">Nincs elég adat a trendhez.</div>
        )}

        {trend && trend.months.length > 0 && (
          <div style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trend.data} margin={{ left: 8, right: 8, top: 8 }}>
                <CartesianGrid vertical={false} stroke="var(--hairline)" />
                <XAxis
                  dataKey="month"
                  tickFormatter={formatMonthShort}
                  tick={{ fontSize: 12, fill: "var(--ink-soft)" }}
                  axisLine={{ stroke: "var(--hairline)" }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "var(--ink-faint)" }}
                  axisLine={false}
                  tickLine={false}
                  width={84}
                  tickFormatter={(v) => formatMoney(Number(v))}
                />
                <Tooltip
                  formatter={(value) => formatMoney(Number(value) || 0)}
                  labelFormatter={(label) => formatMonthLabel(String(label))}
                  contentStyle={tooltipStyle}
                />
                <Legend wrapperStyle={{ fontSize: 12.5 }} />
                {trend.categories.map((cat) => (
                  <Bar
                    key={cat.category_id ?? "none"}
                    dataKey={cat.name}
                    name={cat.name}
                    stackId="a"
                    fill={categoryColor(cat.category_id, cat.color)}
                    radius={[0, 0, 0, 0]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}

function formatMonthShort(month: string) {
  const [y, m] = month.split("-").map(Number);
  return new Intl.DateTimeFormat("hu-HU", { month: "short" }).format(new Date(y, m - 1, 1));
}

function RecurringShareRow({
  label,
  tone,
  data,
}: {
  label: string;
  tone: "income" | "expense";
  data: { recurringTotal: number; monthTotal: number };
}) {
  const pct = data.monthTotal > 0 ? (data.recurringTotal / data.monthTotal) * 100 : null;
  const color = tone === "income" ? "var(--income)" : "var(--expense)";
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5, marginBottom: 4 }}>
        <span>{label}</span>
        <span className="tabular">
          {formatMoney(data.recurringTotal)} / {formatMoney(data.monthTotal)}
          {pct !== null && <span style={{ color: "var(--ink-faint)" }}> ({pct.toFixed(0)}%)</span>}
        </span>
      </div>
      <div style={{ height: 5, background: "var(--paper-sunken)", borderRadius: 4, overflow: "hidden" }}>
        <div
          style={{
            width: `${Math.min(pct ?? 100, 100)}%`,
            height: "100%",
            background: color,
          }}
        />
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
