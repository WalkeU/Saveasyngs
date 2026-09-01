import { useEffect, useState } from "react";
import { api } from "../api";
import { formatMoney, formatMonthLabel, monthKey, shiftMonthKey, toLocalDateInput } from "../format";
import { CategoryIcon } from "../IconPicker";
import { IconChevronLeft, IconChevronRight, IconPlus, IconTrash } from "../icons";
import type { Category, MissingRecurring, RecurringPayment, Transaction, TransactionType } from "../types";

export function Recurring() {
  const [items, setItems] = useState<RecurringPayment[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [missingMonth, setMissingMonth] = useState(monthKey());
  const [missing, setMissing] = useState<MissingRecurring | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  const load = () => api.recurring.list().then(setItems);
  const loadMissing = () => api.recurring.missing(missingMonth).then(setMissing);

  useEffect(() => {
    load();
    api.categories.list().then(setCategories);
  }, []);

  useEffect(() => {
    loadMissing();
  }, [missingMonth, items]);

  async function toggle(item: RecurringPayment) {
    const updated = await api.recurring.update(item.id, { enabled: !item.enabled });
    setItems((prev) => prev.map((i) => (i.id === item.id ? updated : i)));
  }

  async function remove(id: number) {
    await api.recurring.remove(id);
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  async function recordNow(item: RecurringPayment) {
    await api.transactions.create({
      type: item.type,
      amount: item.amount,
      description: item.description,
      categoryId: item.category_id,
      date: toLocalDateInput(new Date()),
    });
    loadMissing();
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Ismétlődők</h1>
          <div className="page-sub">Rendszeres bevételek, kiadások és megtakarítások, és hogy megtörténtek-e már ebben a hónapban</div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAdd((s) => !s)}>
          <IconPlus /> Új ismétlődő
        </button>
      </div>

      {showAdd && (
        <AddForm
          categories={categories}
          onCreated={(item) => {
            setItems((prev) => [...prev, item]);
            setShowAdd(false);
          }}
          onCancel={() => setShowAdd(false)}
        />
      )}

      <div className="card" style={{ marginBottom: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h2 style={{ fontSize: 17 }}>Hiányzik ebben a hónapban</h2>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <button className="btn btn-icon btn-ghost" onClick={() => setMissingMonth((m) => shiftMonthKey(m, -1))} title="Előző hónap">
              <IconChevronLeft />
            </button>
            <span style={{ fontSize: 13.5, minWidth: 130, textAlign: "center", textTransform: "capitalize" }}>
              {formatMonthLabel(missingMonth)}
            </span>
            <button
              className="btn btn-icon btn-ghost"
              onClick={() => setMissingMonth((m) => shiftMonthKey(m, 1))}
              title="Következő hónap"
              disabled={missingMonth >= monthKey()}
            >
              <IconChevronRight />
            </button>
          </div>
        </div>

        {missing && missing.missing.length === 0 && (
          <div className="empty-state">Minden ismétlődő tétel megvan ebben a hónapban. ✓</div>
        )}

        {missing && missing.missing.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {missing.missing.map((item) => (
              <div
                key={item.id}
                className="banner"
                style={{ background: "var(--warn-soft)", borderColor: "var(--warn)", color: "var(--ink)" }}
              >
                <CategoryIcon icon={item.category_icon} color={item.category_color ?? undefined} />
                <span style={{ flex: 1 }}>
                  <strong>{item.description || item.category_name}</strong>
                  <span style={{ color: "var(--ink-faint)", marginLeft: 6 }}>
                    minden hó {item.day_of_month}. napján
                  </span>
                </span>
                <span className="tabular">{formatMoney(item.amount)}</span>
                <button className="btn btn-primary" onClick={() => recordNow(item)}>
                  Rögzítés most
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        {items.length === 0 ? (
          <div className="empty-state">Még nincs felvett ismétlődő tétel.</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Leírás</th>
                <th>Kategória</th>
                <th>Típus</th>
                <th style={{ textAlign: "right" }}>Összeg</th>
                <th>Nap</th>
                <th>Állapot</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} style={{ opacity: item.enabled ? 1 : 0.5 }}>
                  <td>{item.description || "—"}</td>
                  <td>
                    <span style={{ display: "flex", alignItems: "center", gap: 7 }}>
                      <CategoryIcon icon={item.category_icon} color={item.category_color ?? undefined} />
                      {item.category_name ?? "—"}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${item.type === "expense" ? "badge-expense" : item.type === "income" ? "badge-income" : "badge-muted"}`}>
                      {item.type === "expense" ? "Kiadás" : item.type === "income" ? "Bevétel" : "Megtakarítás"}
                    </span>
                  </td>
                  <td className="tabular" style={{ textAlign: "right" }}>
                    {formatMoney(item.amount)}
                  </td>
                  <td className="tabular">{item.day_of_month}.</td>
                  <td>
                    <button className="btn btn-ghost" onClick={() => toggle(item)}>
                      {item.enabled ? "Bekapcsolva" : "Kikapcsolva"}
                    </button>
                  </td>
                  <td>
                    <button className="btn btn-icon btn-ghost btn-danger" onClick={() => remove(item.id)} title="Törlés">
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
  onCreated: (item: RecurringPayment) => void;
  onCancel: () => void;
}) {
  const [type, setType] = useState<TransactionType>("expense");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [dayOfMonth, setDayOfMonth] = useState("1");
  const [saving, setSaving] = useState(false);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerQuery, setPickerQuery] = useState("");
  const [pickerResults, setPickerResults] = useState<Transaction[]>([]);

  useEffect(() => {
    if (!pickerOpen) return;
    api.transactions.list({ q: pickerQuery || undefined, limit: "15" }).then(({ rows }) => setPickerResults(rows));
  }, [pickerOpen, pickerQuery]);

  function pickTransaction(t: Transaction) {
    setType(t.type);
    setAmount(String(t.amount));
    setDescription(t.description);
    setCategoryId(t.category_id ? String(t.category_id) : "");
    setDayOfMonth(String(new Date(t.date).getDate()));
    setPickerOpen(false);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) return;
    setSaving(true);
    try {
      const created = await api.recurring.create({
        type,
        amount: Number(amount),
        description,
        categoryId: categoryId ? Number(categoryId) : null,
        dayOfMonth: Number(dayOfMonth),
      });
      onCreated(created);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card" style={{ marginBottom: 18 }}>
      <div style={{ marginBottom: 12 }}>
        <button type="button" className="btn btn-ghost" onClick={() => setPickerOpen((o) => !o)}>
          Kiválasztás egy meglévő tranzakcióból
        </button>
      </div>

      {pickerOpen && (
        <div style={{ marginBottom: 16, border: "1px solid var(--hairline)", borderRadius: "var(--radius-sm)", padding: 10 }}>
          <input
            value={pickerQuery}
            onChange={(e) => setPickerQuery(e.target.value)}
            placeholder="Keresés leírás szerint…"
            style={{ width: "100%", marginBottom: 8 }}
          />
          <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 200, overflow: "auto" }}>
            {pickerResults.map((t) => (
              <button
                key={t.id}
                type="button"
                className="btn btn-ghost"
                onClick={() => pickTransaction(t)}
                style={{ justifyContent: "space-between", height: "auto", padding: "6px 10px" }}
              >
                <span>{t.description || "—"}</span>
                <span className="tabular">{formatMoney(t.amount)}</span>
              </button>
            ))}
            {pickerResults.length === 0 && (
              <div style={{ fontSize: 13, color: "var(--ink-faint)", padding: "6px 10px" }}>Nincs találat.</div>
            )}
          </div>
        </div>
      )}

      <form onSubmit={submit} style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
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
          <input type="number" min="0" step="1" value={amount} onChange={(e) => setAmount(e.target.value)} required style={{ width: 130 }} />
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
          <label>Nap (hónapban)</label>
          <input
            type="number"
            min="1"
            max="31"
            value={dayOfMonth}
            onChange={(e) => setDayOfMonth(e.target.value)}
            required
            style={{ width: 80 }}
          />
        </div>
        <button className="btn btn-primary" type="submit" disabled={saving}>
          Mentés
        </button>
        <button className="btn btn-ghost" type="button" onClick={onCancel}>
          Mégse
        </button>
      </form>
    </div>
  );
}
