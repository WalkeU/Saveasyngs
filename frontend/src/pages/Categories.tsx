import { useEffect, useState } from "react";
import { api } from "../api";
import { IconChevronDown, IconChevronUp, IconLanguage, IconPalette, IconPlus, IconReset, IconTrash } from "../icons";
import { IconPicker } from "../IconPicker";
import type { Category, TransactionType } from "../types";

const EN_TRANSLATIONS: Record<string, string> = {
  Étkezés: "Food",
  Bevásárlás: "Shopping",
  Lakhatás: "Housing",
  Rezsi: "Utilities",
  Közlekedés: "Transport",
  Szórakozás: "Entertainment",
  Egészség: "Health",
  Utazás: "Travel",
  Egyéb: "Other",
  Fizetés: "Salary",
  Utalás: "Transfer",
  "Egyéb bevétel": "Other Income",
};

export function Categories() {
  const [categories, setCategories] = useState<Category[]>([]);

  const load = () => api.categories.list().then(setCategories);
  useEffect(() => {
    load();
  }, []);

  async function remove(id: number) {
    await api.categories.remove(id);
    setCategories((prev) => prev.filter((c) => c.id !== id));
  }

  async function rename(id: number, name: string) {
    const updated = await api.categories.update(id, { name });
    setCategories((prev) => prev.map((c) => (c.id === id ? updated : c)));
  }

  async function recolor(id: number, color: string) {
    const updated = await api.categories.update(id, { color });
    setCategories((prev) => prev.map((c) => (c.id === id ? updated : c)));
  }

  async function reicon(id: number, icon: string) {
    const updated = await api.categories.update(id, { icon });
    setCategories((prev) => prev.map((c) => (c.id === id ? updated : c)));
  }

  async function move(id: number, direction: "up" | "down") {
    const reordered = await api.categories.move(id, direction);
    setCategories((prev) => {
      const type = reordered[0]?.type;
      const rest = prev.filter((c) => c.type !== type);
      return [...rest, ...reordered];
    });
  }

  async function translateToEnglish() {
    const renames = categories
      .filter((c) => EN_TRANSLATIONS[c.name] && EN_TRANSLATIONS[c.name] !== c.name)
      .map((c) => rename(c.id, EN_TRANSLATIONS[c.name]));
    await Promise.all(renames);
  }

  async function autoColor() {
    const colored = await api.categories.autoColor();
    setCategories(colored);
  }

  async function resetToDefaults() {
    const ok = window.confirm(
      "Ez törli az összes kategóriát (a sajátjaidat is), és visszaállítja az alap listát. A tranzakciók megmaradnak, csak kategória nélkül. Biztosan folytatod?",
    );
    if (!ok) return;
    const reset = await api.categories.reset();
    setCategories(reset);
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Kategóriák</h1>
          <div className="page-sub">Kiadás és bevétel kategóriák kezelése</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn" onClick={translateToEnglish}>
            <IconLanguage /> Angolra fordítás
          </button>
          <button className="btn" onClick={autoColor}>
            <IconPalette /> Automatikus színezés
          </button>
          <button className="btn btn-danger" onClick={resetToDefaults}>
            <IconReset /> Alaphelyzet
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <CategoryGroup
          title="Kiadás"
          type="expense"
          categories={categories.filter((c) => c.type === "expense")}
          onCreated={(c) => setCategories((prev) => [...prev, c])}
          onRename={rename}
          onRecolor={recolor}
          onReicon={reicon}
          onDelete={remove}
          onMove={move}
        />
        <CategoryGroup
          title="Bevétel"
          type="income"
          categories={categories.filter((c) => c.type === "income")}
          onCreated={(c) => setCategories((prev) => [...prev, c])}
          onRename={rename}
          onRecolor={recolor}
          onReicon={reicon}
          onDelete={remove}
          onMove={move}
        />
      </div>
    </div>
  );
}

function CategoryGroup({
  title,
  type,
  categories,
  onCreated,
  onRename,
  onRecolor,
  onReicon,
  onDelete,
  onMove,
}: {
  title: string;
  type: TransactionType;
  categories: Category[];
  onCreated: (c: Category) => void;
  onRename: (id: number, name: string) => void;
  onRecolor: (id: number, color: string) => void;
  onReicon: (id: number, icon: string) => void;
  onDelete: (id: number) => void;
  onMove: (id: number, direction: "up" | "down") => void;
}) {
  const [name, setName] = useState("");

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    const created = await api.categories.create({ name: name.trim(), type });
    onCreated(created);
    setName("");
  }

  return (
    <div className="card">
      <h2 style={{ fontSize: 16, marginBottom: 14 }}>{title}</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
        {categories.map((c, i) => (
          <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <button
                className="btn btn-icon btn-ghost"
                style={{ padding: 1 }}
                onClick={() => onMove(c.id, "up")}
                disabled={i === 0}
                title="Feljebb"
              >
                <IconChevronUp />
              </button>
              <button
                className="btn btn-icon btn-ghost"
                style={{ padding: 1 }}
                onClick={() => onMove(c.id, "down")}
                disabled={i === categories.length - 1}
                title="Lejjebb"
              >
                <IconChevronDown />
              </button>
            </div>
            <IconPicker value={c.icon} onChange={(icon) => onReicon(c.id, icon)} />
            <input
              type="color"
              value={c.color ?? "#a89d87"}
              onChange={(e) => onRecolor(c.id, e.target.value)}
              style={{ width: 30, height: 30, padding: 2, flexShrink: 0 }}
            />
            <input
              key={c.name}
              defaultValue={c.name}
              onBlur={(e) => e.target.value.trim() && e.target.value !== c.name && onRename(c.id, e.target.value.trim())}
              style={{ flex: 1 }}
            />
            <button className="btn btn-icon btn-ghost btn-danger" onClick={() => onDelete(c.id)} title="Törlés">
              <IconTrash />
            </button>
          </div>
        ))}
        {categories.length === 0 && <div style={{ fontSize: 13, color: "var(--ink-faint)" }}>Nincs még kategória.</div>}
      </div>
      <form onSubmit={add} style={{ display: "flex", gap: 8 }}>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Új kategória neve" style={{ flex: 1 }} />
        <button className="btn btn-primary" type="submit">
          <IconPlus size={14} />
        </button>
      </form>
    </div>
  );
}
