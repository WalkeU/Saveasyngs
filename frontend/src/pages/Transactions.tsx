import { useEffect, useRef, useState } from "react";
import { api } from "../api";
import { evaluateAmountExpression, formatDate, formatMoney, roundMoney, toLocalDateInput } from "../format";
import { IconNote, IconPlus, IconTag, IconTrash } from "../icons";
import type { Category, CategoryRule, SavingsBucket, Transaction, TransactionType } from "../types";

const today = () => toLocalDateInput(new Date());

export function Transactions() {
  const [rows, setRows] = useState<Transaction[]>([]);
  const [total, setTotal] = useState(0);
  const [categories, setCategories] = useState<Category[]>([]);
  const [buckets, setBuckets] = useState<SavingsBucket[]>([]);
  const [loading, setLoading] = useState(true);

  const [type, setType] = useState<TransactionType | "">("");
  const [categoryId, setCategoryId] = useState("");
  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState("");

  const [batchSize, setBatchSize] = useState(100);
  const [loadingMore, setLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const [selected, setSelected] = useState<Set<number>>(new Set());

  const [showAdd, setShowAdd] = useState(false);
  const [suggestion, setSuggestion] = useState<{ transaction: Transaction; categoryId: number; pattern: string } | null>(
    null,
  );
  const [suggestionOpen, setSuggestionOpen] = useState(false);
  const [noteEditor, setNoteEditor] = useState<{ transaction: Transaction; text: string } | null>(null);

  useEffect(() => {
    api.categories.list().then(setCategories);
    api.buckets.list().then(setBuckets);
    api.settings.get().then((s) => setBatchSize(s.transactionsBatchSize));
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setQ(qInput), 300);
    return () => clearTimeout(timer);
  }, [qInput]);

  const load = () => {
    setLoading(true);
    setSelected(new Set());
    api.transactions
      .list({
        type: type || undefined,
        categoryId: categoryId || undefined,
        q: q || undefined,
        limit: String(batchSize),
        offset: "0",
      })
      .then(({ rows, total }) => {
        setRows(rows);
        setTotal(total);
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, [type, categoryId, q, batchSize]);

  async function loadMore() {
    if (loadingMore || rows.length >= total) return;
    setLoadingMore(true);
    try {
      const { rows: next } = await api.transactions.list({
        type: type || undefined,
        categoryId: categoryId || undefined,
        q: q || undefined,
        limit: String(batchSize),
        offset: String(rows.length),
      });
      setRows((prev) => [...prev, ...next]);
    } finally {
      setLoadingMore(false);
    }
  }

  // keeps the observer stable across renders while always calling the
  // latest loadMore (which closes over the current filters/rows)
  const loadMoreRef = useRef(loadMore);
  loadMoreRef.current = loadMore;

  const hasMore = rows.length < total;

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMoreRef.current();
      },
      { rootMargin: "600px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore]);

  async function handleCategoryChange(transaction: Transaction, newCategoryId: string) {
    const idNum = newCategoryId ? Number(newCategoryId) : null;
    const updated = await api.transactions.update(transaction.id, { categoryId: idNum });
    setRows((prev) => prev.map((r) => (r.id === transaction.id ? { ...r, ...updated } : r)));
    setSuggestionOpen(false);
    if (idNum && transaction.description.trim()) {
      setSuggestion({ transaction, categoryId: idNum, pattern: transaction.description.trim() });
    } else {
      setSuggestion(null);
    }
  }

  async function handleCategorySelect(transaction: Transaction, value: string) {
    if (value === "__revert__") {
      const updated = await api.transactions.update(transaction.id, {
        type: "expense",
        categoryId: null,
        bucketId: null,
      });
      setRows((prev) => prev.map((r) => (r.id === transaction.id ? { ...r, ...updated } : r)));
      return;
    }
    if (value.startsWith("bucket:")) {
      const bucketId = Number(value.slice("bucket:".length));
      const updated = await api.transactions.update(transaction.id, { type: "savings", bucketId });
      setRows((prev) => prev.map((r) => (r.id === transaction.id ? { ...r, ...updated } : r)));
      return;
    }
    if (transaction.type === "savings") {
      const updated = await api.transactions.update(transaction.id, { bucketId: null });
      setRows((prev) => prev.map((r) => (r.id === transaction.id ? { ...r, ...updated } : r)));
      return;
    }
    await handleCategoryChange(transaction, value);
  }

  async function handleAmountChange(transaction: Transaction, input: HTMLInputElement) {
    const next = evaluateAmountExpression(input.value);
    if (next === null || next === roundMoney(transaction.amount)) {
      input.value = String(roundMoney(transaction.amount));
      return;
    }
    const updated = await api.transactions.update(transaction.id, { amount: next });
    setRows((prev) => prev.map((r) => (r.id === transaction.id ? { ...r, ...updated } : r)));
  }

  async function saveNote() {
    if (!noteEditor) return;
    const updated = await api.transactions.update(noteEditor.transaction.id, {
      note: noteEditor.text.trim() || null,
    });
    setRows((prev) => prev.map((r) => (r.id === noteEditor.transaction.id ? { ...r, ...updated } : r)));
    setNoteEditor(null);
  }

  async function confirmRule() {
    if (!suggestion) return;
    const rule = (await api.rules.create({
      pattern: suggestion.pattern,
      categoryId: suggestion.categoryId,
      source: "learned",
    })) as CategoryRule & { appliedCount?: number };
    setSuggestion(null);
    setSuggestionOpen(false);
    if (rule.appliedCount) load();
  }

  async function handleDelete(transaction: Transaction) {
    const label = transaction.description.trim() || formatMoney(transaction.amount);
    const ok = window.confirm(`Biztosan törlöd ezt a tranzakciót: "${label}"?`);
    if (!ok) return;
    await api.transactions.remove(transaction.id);
    setRows((prev) => prev.filter((r) => r.id !== transaction.id));
    setTotal((t) => t - 1);
  }

  function toggleSelect(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const allLoadedSelected = rows.length > 0 && rows.every((r) => selected.has(r.id));

  function toggleSelectAll() {
    setSelected(allLoadedSelected ? new Set() : new Set(rows.map((r) => r.id)));
  }

  async function handleBulkDelete() {
    const ids = [...selected];
    if (ids.length === 0) return;
    const ok = window.confirm(`Biztosan törlöd a kiválasztott ${ids.length} tranzakciót?`);
    if (!ok) return;
    await api.transactions.bulkRemove(ids);
    setRows((prev) => prev.filter((r) => !selected.has(r.id)));
    setTotal((t) => t - ids.length);
    setSelected(new Set());
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Tranzakciók</h1>
          <div className="page-sub">{hasMore ? `${rows.length} / ${total} tétel` : `${total} tétel`}</div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAdd((s) => !s)}>
          <IconPlus /> Új tétel
        </button>
      </div>

      {showAdd && (
        <AddForm
          categories={categories}
          buckets={buckets}
          onCreated={(t) => {
            setRows((prev) => [t, ...prev]);
            setTotal((n) => n + 1);
            setShowAdd(false);
          }}
          onCancel={() => setShowAdd(false)}
        />
      )}

      <div className="card" style={{ marginBottom: 18, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
        <div className="field">
          <label>Típus</label>
          <select value={type} onChange={(e) => setType(e.target.value as TransactionType | "")}>
            <option value="">Mind</option>
            <option value="expense">Kiadás</option>
            <option value="income">Bevétel</option>
            <option value="savings">Megtakarítás</option>
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

      {selected.size > 0 && (
        <div
          className="card"
          style={{
            marginBottom: 18,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "10px 16px",
          }}
        >
          <div style={{ fontSize: 13 }}>{selected.size} tétel kiválasztva</div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-ghost" onClick={() => setSelected(new Set())}>
              Mégse
            </button>
            <button className="btn btn-danger" onClick={handleBulkDelete}>
              <IconTrash size={14} /> Törlés
            </button>
          </div>
        </div>
      )}

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        {!loading && rows.length === 0 ? (
          <div className="empty-state">Nincs a szűrésnek megfelelő tranzakció.</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 32 }}>
                  <input type="checkbox" checked={allLoadedSelected} onChange={toggleSelectAll} />
                </th>
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
                  <td>
                    <input
                      type="checkbox"
                      checked={selected.has(row.id)}
                      onChange={() => toggleSelect(row.id)}
                    />
                  </td>
                  <td style={{ whiteSpace: "nowrap", color: "var(--ink-soft)" }}>
                    {formatDate(row.date)}
                    {row.time && <span style={{ color: "var(--ink-faint)" }}> · {row.time.slice(0, 5)}</span>}
                  </td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <span>{row.description || <span style={{ color: "var(--ink-faint)" }}>—</span>}</span>
                      {row.note && (
                        <span
                          style={{
                            fontSize: 11.5,
                            color: "var(--ink-faint)",
                            overflow: "hidden",
                            whiteSpace: "nowrap",
                            textOverflow: "ellipsis",
                            maxWidth: 90,
                            minWidth: 0,
                          }}
                          title={row.note}
                        >
                          {row.note}
                        </span>
                      )}
                      <div className="rule-suggest">
                        <button
                          type="button"
                          className="btn btn-icon btn-ghost"
                          style={{ color: row.note ? "var(--accent)" : "var(--ink-faint)" }}
                          onClick={() => setNoteEditor({ transaction: row, text: row.note ?? "" })}
                          title={row.note ? "Jegyzet szerkesztése" : "Jegyzet hozzáadása"}
                        >
                          <IconNote size={13} />
                        </button>
                        {noteEditor && noteEditor.transaction.id === row.id && (
                          <>
                            <div className="popover-backdrop" onClick={() => setNoteEditor(null)} />
                            <div className="rule-popover">
                              <div style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>Jegyzet</div>
                              <textarea
                                value={noteEditor.text}
                                onChange={(e) => setNoteEditor({ ...noteEditor, text: e.target.value })}
                                rows={3}
                                autoFocus
                                style={{ resize: "vertical", fontFamily: "inherit" }}
                              />
                              <div style={{ display: "flex", gap: 8 }}>
                                <button className="btn btn-primary" style={{ flex: 1 }} onClick={saveNote}>
                                  Mentés
                                </button>
                                <button className="btn btn-ghost" onClick={() => setNoteEditor(null)}>
                                  Mégse
                                </button>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      {row.type === "savings" ? (
                        <select
                          value={row.bucket_id ? `bucket:${row.bucket_id}` : ""}
                          onChange={(e) => handleCategorySelect(row, e.target.value)}
                          style={{ fontSize: 12.5, padding: "4px 8px" }}
                        >
                          <option value="">Nincs megtakarítási hely</option>
                          {buckets.map((b) => (
                            <option key={b.id} value={`bucket:${b.id}`}>
                              {b.name}
                            </option>
                          ))}
                          <option value="__revert__">« vissza kiadásnak</option>
                        </select>
                      ) : (
                        <select
                          value={row.category_id ?? ""}
                          onChange={(e) => handleCategorySelect(row, e.target.value)}
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
                          {buckets.length > 0 && (
                            <optgroup label="Megtakarításnak jelölés">
                              {buckets.map((b) => (
                                <option key={`b-${b.id}`} value={`bucket:${b.id}`}>
                                  {b.name}
                                </option>
                              ))}
                            </optgroup>
                          )}
                        </select>
                      )}
                      {suggestion && suggestion.transaction.id === row.id && (
                        <div className="rule-suggest">
                          <button
                            type="button"
                            className="btn btn-icon btn-ghost"
                            onClick={() => setSuggestionOpen((v) => !v)}
                            title="Szabály létrehozása ebből a kategorizálásból"
                          >
                            <IconTag size={14} />
                          </button>
                          {suggestionOpen && (
                            <>
                              <div className="popover-backdrop" onClick={() => setSuggestionOpen(false)} />
                              <div className="rule-popover">
                                <div style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>
                                  Szabály létrehozása — ha a leírás tartalmazza:
                                </div>
                                <input
                                  value={suggestion.pattern}
                                  onChange={(e) => setSuggestion({ ...suggestion, pattern: e.target.value })}
                                  autoFocus
                                />
                                <div style={{ fontSize: 12 }}>
                                  → mindig{" "}
                                  <strong>{categories.find((c) => c.id === suggestion.categoryId)?.name}</strong>
                                </div>
                                <div style={{ display: "flex", gap: 8 }}>
                                  <button className="btn btn-primary" style={{ flex: 1 }} onClick={confirmRule}>
                                    Létrehozás
                                  </button>
                                  <button
                                    className="btn btn-ghost"
                                    onClick={() => {
                                      setSuggestion(null);
                                      setSuggestionOpen(false);
                                    }}
                                  >
                                    Mégse
                                  </button>
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className={`tabular amount-${row.type}`} style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                    {row.type === "expense" ? "−" : row.type === "income" ? "+" : "⇄"}
                    <input
                      key={roundMoney(row.amount)}
                      type="text"
                      inputMode="decimal"
                      defaultValue={roundMoney(row.amount)}
                      onBlur={(e) => handleAmountChange(row, e.target)}
                      onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
                      className="tabular inline-amount-input"
                      title="Beírhatsz képletet is, pl. meglévő érték után: -3000"
                    />{" "}
                    Ft
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

      {hasMore && (
        <div
          ref={sentinelRef}
          style={{ textAlign: "center", padding: "18px 0", fontSize: 12.5, color: "var(--ink-faint)" }}
        >
          {loadingMore ? "Betöltés…" : ""}
        </div>
      )}
    </div>
  );
}

function AddForm({
  categories,
  buckets,
  onCreated,
  onCancel,
}: {
  categories: Category[];
  buckets: SavingsBucket[];
  onCreated: (t: Transaction) => void;
  onCancel: () => void;
}) {
  const [type, setType] = useState<TransactionType>("expense");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [bucketId, setBucketId] = useState("");
  const [date, setDate] = useState(today());
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsedAmount = evaluateAmountExpression(amount);
    if (parsedAmount === null) return;
    setSaving(true);
    try {
      const created = await api.transactions.create({
        type,
        amount: parsedAmount,
        description,
        categoryId: type === "savings" ? null : categoryId ? Number(categoryId) : null,
        bucketId: type === "savings" ? (bucketId ? Number(bucketId) : null) : null,
        date,
      });
      onCreated({ ...created, category_name: null, category_color: null, bucket_name: null, bucket_color: null, bucket_icon: null } as Transaction);
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
          <option value="savings">Megtakarítás</option>
        </select>
      </div>
      <div className="field">
        <label>Összeg</label>
        <input
          type="text"
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="pl. 31000-3000"
          required
        />
      </div>
      <div className="field" style={{ flex: 1, minWidth: 160 }}>
        <label>Leírás</label>
        <input value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      {type === "savings" ? (
        <div className="field">
          <label>Megtakarítási hely</label>
          <select value={bucketId} onChange={(e) => setBucketId(e.target.value)}>
            <option value="">Nincs</option>
            {buckets.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
      ) : (
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
      )}
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
