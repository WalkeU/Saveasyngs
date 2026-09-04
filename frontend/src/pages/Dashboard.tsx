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
  formatDate,
  formatMoney,
  formatMonthLabel,
  monthKey,
  shiftMonthKey,
  toLocalDateInput,
} from "../format";
import { CategoryIcon } from "../IconPicker";
import { IconChevronLeft, IconChevronRight, IconCopy, IconDownload, IconX } from "../icons";
import type {
  CategoryExport,
  MonthlyByCategory,
  MonthlyComparison,
  RecurringShare,
  ReportByCategory,
  ReportSummary,
  Transaction,
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

  const [copied, setCopied] = useState(false);
  const [trendManualText, setTrendManualText] = useState<string | null>(null);

  async function copyTrendMarkdown() {
    if (!trend) return;
    setTrendManualText(null);
    const md = buildMonthlyMarkdown(trend, trendType);
    if (await copyToClipboard(md)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } else {
      setTrendManualText(md);
    }
  }

  function downloadTrendMarkdown() {
    if (!trend) return;
    const blob = new Blob([buildMonthlyMarkdown(trend, trendType)], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `kategoriak-havonta-${trendType}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

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

  const [categoryDetail, setCategoryDetail] = useState<{ row: ReportByCategory; rows: Transaction[] } | null>(
    null,
  );
  const [categoryDetailLoading, setCategoryDetailLoading] = useState(false);

  async function openCategoryDetail(row: ReportByCategory) {
    setCategoryDetail({ row, rows: [] });
    setCategoryDetailLoading(true);
    try {
      const { rows } = await api.transactions.list({
        type: breakdownType,
        categoryId: row.category_id === null ? "none" : String(row.category_id),
        from,
        to,
        limit: "500",
      });
      setCategoryDetail({ row, rows });
    } finally {
      setCategoryDetailLoading(false);
    }
  }

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
                        <Cell
                          key={row.category_id ?? "none"}
                          fill={categoryColor(row.category_id, row.category_color)}
                          cursor="pointer"
                          onClick={() => openCategoryDetail(row)}
                        />
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
                        cursor="pointer"
                        onClick={() => openCategoryDetail(row)}
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
                  <div
                    key={row.category_id ?? "none"}
                    className="clickable-row"
                    onClick={() => openCategoryDetail(row)}
                  >
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
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <div style={{ display: "flex", gap: 4 }}>
              <button
                className="btn btn-ghost"
                onClick={copyTrendMarkdown}
                disabled={!trend || trend.months.length === 0}
                title="Táblázat másolása Markdown formátumban"
              >
                <IconCopy /> {copied ? "Másolva" : "Másolás"}
              </button>
              <button
                className="btn btn-ghost"
                onClick={downloadTrendMarkdown}
                disabled={!trend || trend.months.length === 0}
                title="Letöltés .md fájlként"
              >
                <IconDownload /> Export .md
              </button>
            </div>
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

        {trendManualText && (
          <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: 12, color: "var(--ink-faint)", marginBottom: 6 }}>
              A vágólap nem érhető el ezen a kapcsolaton — jelöld ki kézzel:
            </div>
            <textarea
              readOnly
              value={trendManualText}
              rows={6}
              style={{ width: "100%", fontFamily: "monospace", fontSize: 12 }}
              onFocus={(e) => e.currentTarget.select()}
            />
          </div>
        )}
      </div>

      <CategoryExportCard />

      {categoryDetail && (
        <div className="modal-backdrop" onClick={() => setCategoryDetail(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "16px 20px",
                borderBottom: "1px solid var(--hairline)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <CategoryIcon
                  icon={categoryDetail.row.category_icon}
                  color={categoryColor(categoryDetail.row.category_id, categoryDetail.row.category_color)}
                />
                <h2 style={{ fontSize: 16 }}>{categoryDetail.row.category_name}</h2>
              </div>
              <button className="btn btn-icon btn-ghost" onClick={() => setCategoryDetail(null)} title="Bezárás">
                <IconX />
              </button>
            </div>

            <div style={{ overflow: "auto" }}>
              {categoryDetailLoading ? (
                <div style={{ padding: 20, textAlign: "center", color: "var(--ink-faint)" }}>Betöltés…</div>
              ) : categoryDetail.rows.length === 0 ? (
                <div className="empty-state">Nincs tranzakció ebben a kategóriában.</div>
              ) : (
                <table className="data-table">
                  <tbody>
                    {categoryDetail.rows.map((t) => (
                      <tr key={t.id}>
                        <td style={{ whiteSpace: "nowrap", color: "var(--ink-soft)" }}>{formatDate(t.date)}</td>
                        <td>{t.description || <span style={{ color: "var(--ink-faint)" }}>—</span>}</td>
                        <td className="tabular" style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                          {formatMoney(t.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div
              style={{
                padding: "12px 20px",
                borderTop: "1px solid var(--hairline)",
                display: "flex",
                justifyContent: "space-between",
                fontSize: 13,
              }}
            >
              <span style={{ color: "var(--ink-faint)" }}>{categoryDetail.rows.length} tétel</span>
              <span className="tabular" style={{ fontWeight: 600 }}>{formatMoney(categoryDetail.row.total)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function formatMonthShort(month: string) {
  const [y, m] = month.split("-").map(Number);
  return new Intl.DateTimeFormat("hu-HU", { month: "short" }).format(new Date(y, m - 1, 1));
}

// plain-number formatting for the markdown export — formatMoney's "Ft"
// suffix and thousands-separator spaces are nice on screen but make a
// markdown table noisier to read/paste elsewhere
function formatPlain(value: number): string {
  return new Intl.NumberFormat("hu-HU").format(Math.round(value));
}

function buildMonthlyMarkdown(trend: MonthlyByCategory, type: TransactionType): string {
  const title = type === "expense" ? "Kiadás" : "Bevétel";
  const header = `| Kategória | ${trend.months.map((m) => formatMonthLabel(m)).join(" | ")} | Összesen |`;
  const divider = `| --- | ${trend.months.map(() => "---:").join(" | ")} | ---: |`;

  const rows = trend.categories.map((cat) => {
    const values = trend.months.map((m) => {
      const entry = trend.data.find((d) => d.month === m);
      return Number(entry?.[cat.name] ?? 0);
    });
    const rowTotal = values.reduce((sum, v) => sum + v, 0);
    return `| ${cat.name} | ${values.map(formatPlain).join(" | ")} | ${formatPlain(rowTotal)} |`;
  });

  const monthTotals = trend.months.map((m) => {
    const entry = trend.data.find((d) => d.month === m);
    if (!entry) return 0;
    return trend.categories.reduce((sum, cat) => sum + Number(entry[cat.name] ?? 0), 0);
  });
  const grandTotal = monthTotals.reduce((sum, v) => sum + v, 0);
  const totalsRow = `| **Összesen** | ${monthTotals.map((t) => `**${formatPlain(t)}**`).join(" | ")} | **${formatPlain(grandTotal)}** |`;

  return `# Kategóriák havonta — ${title}\n\n${header}\n${divider}\n${rows.join("\n")}\n${totalsRow}\n`;
}

// navigator.clipboard requires a secure context (HTTPS or localhost) — this
// app is often reached over plain HTTP on a LAN/VPN, where it silently
// rejects, so fall back to the old execCommand trick before giving up
async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}

function buildCategoryExportMarkdown(data: CategoryExport): string {
  const title = data.type === "expense" ? "Kiadás" : "Bevétel";

  if (data.scope === "month") {
    const rows = data.categories.map((c) => `| ${c.name} | ${formatPlain(c.total)} |`);
    return `# ${title} kategóriánként — ${formatMonthLabel(data.periods[0])}\n\n| Kategória | Összeg |\n| --- | ---: |\n${rows.join("\n")}\n| **Összesen** | **${formatPlain(data.grandTotal)}** |\n`;
  }

  const year = data.periods[0].slice(0, 4);
  const header = `| Kategória | ${data.periods.map((p) => formatMonthShort(p)).join(" | ")} | Összesen |`;
  const divider = `| --- | ${data.periods.map(() => "---:").join(" | ")} | ---: |`;
  const rows = data.categories.map(
    (c) =>
      `| ${c.name} | ${data.periods.map((p) => formatPlain(c.totals[p] ?? 0)).join(" | ")} | ${formatPlain(c.total)} |`,
  );
  const totalsRow = `| **Összesen** | ${data.periods.map((p) => `**${formatPlain(data.periodTotals[p] ?? 0)}**`).join(" | ")} | **${formatPlain(data.grandTotal)}** |`;

  return `# ${title} kategóriánként — ${year}\n\n${header}\n${divider}\n${rows.join("\n")}\n${totalsRow}\n`;
}

function CategoryExportCard() {
  const [scope, setScope] = useState<"month" | "year">("month");
  const [type, setType] = useState<TransactionType>("expense");
  const [month, setMonth] = useState(monthKey());
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [copied, setCopied] = useState(false);
  const [manualText, setManualText] = useState<string | null>(null);

  async function fetchMarkdown() {
    const data =
      scope === "month"
        ? await api.reports.categoryExport({ type, month })
        : await api.reports.categoryExport({ type, year });
    const md = buildCategoryExportMarkdown(data);
    const filename = scope === "month" ? `koltesek-${month}.md` : `koltesek-${year}.md`;
    return { md, filename };
  }

  async function copy() {
    setManualText(null);
    const { md } = await fetchMarkdown();
    if (await copyToClipboard(md)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } else {
      setManualText(md);
    }
  }

  async function download() {
    const { md, filename } = await fetchMarkdown();
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="card" style={{ marginTop: 20 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          marginBottom: 14,
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        <div>
          <h2 style={{ fontSize: 17 }}>Kategóriák exportálása</h2>
          <div style={{ fontSize: 12.5, color: "var(--ink-faint)", marginTop: 4 }}>
            Egy adott hónap vagy egy teljes naptári év kategória szerinti bontása, Markdown táblázatként.
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div className="field">
            <label>Típus</label>
            <select value={type} onChange={(e) => setType(e.target.value as TransactionType)}>
              <option value="expense">Kiadás</option>
              <option value="income">Bevétel</option>
            </select>
          </div>
          <div className="field">
            <label>Időszak</label>
            <select value={scope} onChange={(e) => setScope(e.target.value as "month" | "year")}>
              <option value="month">Hónap</option>
              <option value="year">Év</option>
            </select>
          </div>
          {scope === "month" ? (
            <div className="field">
              <label>Melyik hónap</label>
              <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
            </div>
          ) : (
            <div className="field">
              <label>Melyik év</label>
              <input
                type="number"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                style={{ width: 90 }}
              />
            </div>
          )}
          <button className="btn btn-ghost" type="button" onClick={copy} title="Táblázat másolása Markdown formátumban">
            <IconCopy /> {copied ? "Másolva" : "Másolás"}
          </button>
          <button className="btn btn-ghost" type="button" onClick={download} title="Letöltés .md fájlként">
            <IconDownload /> Export .md
          </button>
        </div>
      </div>

      {manualText && (
        <div>
          <div style={{ fontSize: 12, color: "var(--ink-faint)", marginBottom: 6 }}>
            A vágólap nem érhető el ezen a kapcsolaton — jelöld ki kézzel:
          </div>
          <textarea
            readOnly
            value={manualText}
            rows={6}
            style={{ width: "100%", fontFamily: "monospace", fontSize: 12 }}
            onFocus={(e) => e.currentTarget.select()}
          />
        </div>
      )}
    </div>
  );
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
