import { useEffect, useState } from "react";
import { api } from "../api";
import { formatDate, formatMoney, toLocalDateInput } from "../format";
import { IconPlus, IconTrash } from "../icons";
import type { Category, Transaction, TransactionType } from "../types";

const today = () => toLocalDateInput(new Date());

export function Transactions() {
  const [rows, setRows] = useState<Transaction[]>([]);
  const [total, setTotal] = useState(0);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const [type, setType] = useState<TransactionType | "">("");
  const [categoryId, setCategoryId] = useState("");
  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState("");

  const [showAdd, setShowAdd] = useState(false);
  const [suggestion, setSuggestion] = useState<{ transaction: Transaction; categoryId: number; pattern: string } | null>(
    null,
  );

  useEffect(() => {
    api.categories.list().then(setCategories);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setQ(qInput), 300);
    return () => clearTimeout(timer);
  }, [qInput]);

  const load = () => {
    setLoading(true);
    api.transactions
      .list({ type: type || undefined, categoryId: categoryId || undefined, q: q || undefined })
      .then(({ rows, total }) => {
        setRows(rows);
        setTotal(total);
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, [type, categoryId, q]);

  async function handleCategoryChange(transaction: Transaction, newCategoryId: string) {
    const idNum = newCategoryId ? Number(newCategoryId) : null;
    const updated = await api.transactions.update(transaction.id, { categoryId: idNum });
    setRows((prev) => prev.map((r) => (r.id === transaction.id ? { ...r, ...updated } : r)));
    if (idNum && transaction.description.trim()) {
      setSuggestion({ transaction, categoryId: idNum, pattern: transaction.description.trim() });
    }
  }

  async function confirmRule() {
    if (!suggestion) return;
    await api.rules.create({ pattern: suggestion.pattern, categoryId: suggestion.categoryId, source: "learned" });
    setSuggestion(null);
  }

  async function handleDelete(transaction: Transaction) {
    const label = transaction.description.trim() || formatMoney(transaction.amount);
    const ok = window.confirm(`Biztosan törlöd ezt a tranzakciót: "${label}"?`);
    if (!ok) return;
    await api.transactions.remove(transaction.id);
    setRows((prev) => prev.filter((r) => r.id !== transaction.id));
    setTotal((t) => t - 1);
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Tranzakciók</h1>
          <div className="page-sub">{total} tétel</div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAdd((s) => !s)}>
          <IconPlus /> Új tétel
        </button>
      </div>

      {showAdd && (
        <AddForm
          categories={categories}
          onCreated={(t) => {
            setRows((prev) => [t, ...prev]);
            setTotal((n) => n + 1);
            setShowAdd(false);
          }}
          onCancel={() => setShowAdd(false)}
        />
      )}

      {suggestion && (
        <div className="banner" style={{ marginBottom: 18 }}>
          <span>Szabály létrehozása — ha a leírás tartalmazza:</span>
          <input value={suggestion.pattern} onChange={(e) => setSuggestion({ ...suggestion, pattern: e.target.value })} />
          <span>
            → mindig{" "}
            <strong>{categories.find((c) => c.id === suggestion.categoryId)?.name}</strong>
          </span>
          <button className="btn btn-primary" onClick={confirmRule}>
            Létrehozás
          </button>
          <button className="btn btn-ghost" onClick={() => setSuggestion(null)}>
            Mégse
          </button>
        </div>
      )}

      <div className="card" style={{ marginBottom: 18, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
        <div className="field">
          <label>Típus</label>
          <select value={type} onChange={(e) => setType(e.target.value as TransactionType | "")}>
            <option value="">Mind</option>
            <option value="expense">Kiadás</option>
            <option value="income">Bevétel</option>
          </select>
        </div>
        <div className="field">
          <label>Kategória</label>
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">Mind</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field" style={{ flex: 1, minWidth: 200 }}>
          <label>Leírás keresése</label>
          <input value={qInput} onChange={(e) => setQInput(e.target.value)} placeholder="pl. Tesco" />
        </div>
        <button
          type="button"
          className={`btn ${categoryId === "none" ? "btn-primary" : ""}`}
          onClick={() => setCategoryId(categoryId === "none" ? "" : "none")}
        >
          Kategorizálatlan
        </button>
      </div>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        {!loading && rows.length === 0 ? (
          <div className="empty-state">Nincs a szűrésnek megfelelő tranzakció.</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Dátum</th>
                <th>Leírás</th>
                <th>Kategória</th>
                <th style={{ textAlign: "right" }}>Összeg</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td style={{ whiteSpace: "nowrap", color: "var(--ink-soft)" }}>{formatDate(row.date)}</td>
                  <td>{row.description || <span style={{ color: "var(--ink-faint)" }}>—</span>}</td>
                  <td>
                    <select
                      value={row.category_id ?? ""}
                      onChange={(e) => handleCategoryChange(row, e.target.value)}
                      style={{ fontSize: 12.5, padding: "4px 8px" }}
                    >
                      <option value="">Nincs kategória</option>
                      {categories
                        .filter((c) => c.type === row.type)
                        .map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                    </select>
                  </td>
                  <td className={`tabular amount-${row.type}`} style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                    {row.type === "expense" ? "−" : "+"}
                    {formatMoney(row.amount)}
                  </td>
                  <td>
                    <button className="btn btn-icon btn-ghost btn-danger" onClick={() => handleDelete(row)} title="Törlés">
                      <IconTrash />
                    </button>
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

function AddForm({
  categories,
  onCreated,
  onCancel,
}: {
  categories: Category[];
  onCreated: (t: Transaction) => void;
  onCancel: () => void;
}) {
  const [type, setType] = useState<TransactionType>("expense");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [date, setDate] = useState(today());
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) return;
    setSaving(true);
    try {
      const created = await api.transactions.create({
        type,
        amount: Number(amount),
        description,
        categoryId: categoryId ? Number(categoryId) : null,
        date,
      });
      onCreated({ ...created, category_name: null, category_color: null } as Transaction);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="card" onSubmit={submit} style={{ marginBottom: 18, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
      <div className="field">
        <label>Típus</label>
        <select value={type} onChange={(e) => setType(e.target.value as TransactionType)}>
          <option value="expense">Kiadás</option>
          <option value="income">Bevétel</option>
        </select>
      </div>
      <div className="field">
        <label>Összeg</label>
        <input type="number" min="0" step="1" value={amount} onChange={(e) => setAmount(e.target.value)} required />
      </div>
      <div className="field" style={{ flex: 1, minWidth: 160 }}>
        <label>Leírás</label>
        <input value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      <div className="field">
        <label>Kategória</label>
        <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
          <option value="">Nincs</option>
          {categories
            .filter((c) => c.type === type)
            .map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
        </select>
      </div>
      <div className="field">
        <label>Dátum</label>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
      </div>
      <button className="btn btn-primary" type="submit" disabled={saving}>
        Mentés
      </button>
      <button className="btn btn-ghost" type="button" onClick={onCancel}>
        Mégse
      </button>
    </form>
  );
}
