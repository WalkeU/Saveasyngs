import { useRef, useState } from "react";
import { api } from "../api";
import { IconUpload } from "../icons";
import { formatMoney } from "../format";
import type { ImportPreview, ImportResult } from "../types";

export function Import() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [dateColumn, setDateColumn] = useState("");
  const [descriptionColumn, setDescriptionColumn] = useState("");
  const [amountColumn, setAmountColumn] = useState("");
  const [saveProfile, setSaveProfile] = useState(true);
  const [profileName, setProfileName] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function pickFile(f: File) {
    setError(null);
    setResult(null);
    setFile(f);
    setProfileName(f.name.replace(/\.csv$/i, ""));
    try {
      const p = await api.import.preview(f);
      setPreview(p);
      setDateColumn(p.mapping.date ?? "");
      setDescriptionColumn(p.mapping.description ?? "");
      setAmountColumn(p.mapping.amount ?? "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nem sikerült beolvasni a fájlt");
    }
  }

  async function commit() {
    if (!file || !dateColumn || !descriptionColumn || !amountColumn) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.import.commit(
        file,
        { dateColumn, descriptionColumn, amountColumn },
        { saveProfile, profileName },
      );
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Az importálás nem sikerült");
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setFile(null);
    setPreview(null);
    setResult(null);
    setError(null);
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Import</h1>
          <div className="page-sub">Bank-exportok (CSV) behúzása — az összeg előjele dönti el, kiadás vagy bevétel</div>
        </div>
      </div>

      {!preview && (
        <div
          className="card"
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const f = e.dataTransfer.files[0];
            if (f) pickFile(f);
          }}
          onClick={() => inputRef.current?.click()}
          style={{
            borderStyle: "dashed",
            borderColor: dragOver ? "var(--accent)" : "var(--hairline)",
            background: dragOver ? "var(--accent-soft)" : "var(--paper-raised)",
            padding: 48,
            textAlign: "center",
            cursor: "pointer",
          }}
        >
          <div style={{ color: "var(--ink-soft)", marginBottom: 10 }}>
            <IconUpload size={28} />
          </div>
          <div style={{ fontWeight: 500, marginBottom: 4 }}>Húzd ide a CSV fájlt, vagy kattints a tallózáshoz</div>
          <div style={{ fontSize: 12.5, color: "var(--ink-faint)" }}>Revolut, bank export, vagy bármilyen vesszővel tagolt fájl</div>
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) pickFile(f);
            }}
          />
        </div>
      )}

      {error && (
        <div className="card" style={{ borderColor: "var(--expense)", color: "var(--expense)", marginTop: 16 }}>
          {error}
        </div>
      )}

      {preview && !result && (
        <div className="card" style={{ marginTop: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
            <div>
              <strong>{file?.name}</strong>
              <span style={{ color: "var(--ink-faint)", marginLeft: 8 }}>{preview.rowCount} sor</span>
            </div>
            {preview.knownProfile && <span className="badge badge-muted">Ismert formátum: {preview.knownProfile}</span>}
          </div>

          <div style={{ display: "flex", gap: 10, marginBottom: 18, flexWrap: "wrap" }}>
            <div className="field">
              <label>Dátum oszlop</label>
              <select value={dateColumn} onChange={(e) => setDateColumn(e.target.value)}>
                <option value="">—</option>
                {preview.headers.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Leírás oszlop</label>
              <select value={descriptionColumn} onChange={(e) => setDescriptionColumn(e.target.value)}>
                <option value="">—</option>
                {preview.headers.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Összeg oszlop</label>
              <select value={amountColumn} onChange={(e) => setAmountColumn(e.target.value)}>
                <option value="">—</option>
                {preview.headers.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ overflowX: "auto", marginBottom: 18, border: "1px solid var(--hairline)", borderRadius: "var(--radius-sm)" }}>
            <table className="data-table">
              <thead>
                <tr>
                  {preview.headers.map((h) => (
                    <th
                      key={h}
                      style={{
                        color: [dateColumn, descriptionColumn, amountColumn].includes(h) ? "var(--accent)" : undefined,
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.sampleRows.map((row, i) => (
                  <tr key={i}>
                    {preview.headers.map((h) => (
                      <td key={h} style={{ whiteSpace: "nowrap" }}>
                        {row[h]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5, marginBottom: 16 }}>
            <input type="checkbox" checked={saveProfile} onChange={(e) => setSaveProfile(e.target.checked)} style={{ width: "auto" }} />
            Formátum megjegyzése:
            <input value={profileName} onChange={(e) => setProfileName(e.target.value)} disabled={!saveProfile} style={{ width: 160 }} />
          </label>

          <div style={{ display: "flex", gap: 8 }}>
            <button
              className="btn btn-primary"
              onClick={commit}
              disabled={loading || !dateColumn || !descriptionColumn || !amountColumn}
            >
              {loading ? "Importálás…" : "Importálás"}
            </button>
            <button className="btn btn-ghost" onClick={reset}>
              Mégse
            </button>
          </div>
        </div>
      )}

      {result && (
        <div className="card" style={{ marginTop: 16 }}>
          <h2 style={{ fontSize: 18, marginBottom: 14 }}>Kész</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 18 }}>
            <ResultStat label="Sor összesen" value={result.total} />
            <ResultStat label="Importálva" value={result.imported} tone="income" />
            <ResultStat label="Duplikátum" value={result.duplicates} tone="muted" />
            <ResultStat label="Kihagyva" value={result.skipped} tone="expense" />
          </div>

          {result.duplicateRows.length > 0 && (
            <RowDetails
              title={`Duplikátumok (${result.duplicateRows.length})`}
              headers={["Dátum", "Leírás", "Összeg"]}
              rows={result.duplicateRows.map((r) => [r.date, r.description || "—", formatMoney(r.amount)])}
            />
          )}

          {result.skippedRows.length > 0 && (
            <RowDetails
              title={`Kihagyva (${result.skippedRows.length})`}
              headers={["Dátum", "Leírás", "Összeg", "Ok"]}
              rows={result.skippedRows.map((r) => [r.date || "—", r.description || "—", r.amount || "—", r.reason])}
            />
          )}

          <button className="btn btn-primary" onClick={reset} style={{ marginTop: 16 }}>
            Új import
          </button>
        </div>
      )}
    </div>
  );
}

function RowDetails({ title, headers, rows }: { title: string; headers: string[]; rows: string[][] }) {
  return (
    <details style={{ marginTop: 14 }}>
      <summary style={{ cursor: "pointer", fontSize: 13.5, fontWeight: 500, color: "var(--ink-soft)" }}>
        {title}
      </summary>
      <div
        style={{
          marginTop: 10,
          maxHeight: 260,
          overflow: "auto",
          border: "1px solid var(--hairline)",
          borderRadius: "var(--radius-sm)",
        }}
      >
        <table className="data-table">
          <thead>
            <tr>
              {headers.map((h) => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i}>
                {row.map((cell, j) => (
                  <td key={j} style={{ whiteSpace: "nowrap" }}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

function ResultStat({ label, value, tone }: { label: string; value: number; tone?: "income" | "expense" | "muted" }) {
  return (
    <div style={{ background: "var(--paper-sunken)", borderRadius: "var(--radius-sm)", padding: 14 }}>
      <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--ink-soft)", marginBottom: 6 }}>
        {label}
      </div>
      <div className={`tabular ${tone ? `amount-${tone}` : ""}`} style={{ fontSize: 22, fontWeight: 600 }}>
        {value}
      </div>
    </div>
  );
}
