import { useEffect, useState } from "react";
import { api } from "../api";
import { IconPlus, IconTrash } from "../icons";
import type { Category, TransactionType } from "../types";

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

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Kategóriák</h1>
          <div className="page-sub">Kiadás és bevétel kategóriák kezelése</div>
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
          onDelete={remove}
        />
        <CategoryGroup
          title="Bevétel"
          type="income"
          categories={categories.filter((c) => c.type === "income")}
          onCreated={(c) => setCategories((prev) => [...prev, c])}
          onRename={rename}
          onRecolor={recolor}
          onDelete={remove}
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
  onDelete,
}: {
  title: string;
  type: TransactionType;
  categories: Category[];
  onCreated: (c: Category) => void;
  onRename: (id: number, name: string) => void;
  onRecolor: (id: number, color: string) => void;
  onDelete: (id: number) => void;
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
        {categories.map((c) => (
          <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input
              type="color"
              value={c.color ?? "#a89d87"}
              onChange={(e) => onRecolor(c.id, e.target.value)}
              style={{ width: 30, height: 30, padding: 2, flexShrink: 0 }}
            />
            <input
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
        <button className="btn btn-sm btn-primary" type="submit">
          <IconPlus size={14} />
        </button>
      </form>
    </div>
  );
}
