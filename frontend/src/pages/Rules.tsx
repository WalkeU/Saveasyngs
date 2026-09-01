import { useEffect, useState } from "react";
import { api } from "../api";
import { IconPlus, IconTrash } from "../icons";
import type { Category, CategoryRule } from "../types";

export function Rules() {
  const [rules, setRules] = useState<CategoryRule[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [pattern, setPattern] = useState("");
  const [categoryId, setCategoryId] = useState("");

  useEffect(() => {
    api.rules.list().then(setRules);
    api.categories.list().then(setCategories);
  }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!pattern.trim() || !categoryId) return;
    const created = await api.rules.create({ pattern: pattern.trim(), categoryId: Number(categoryId) });
    setRules((prev) => [created as CategoryRule, ...prev]);
    setPattern("");
  }

  async function toggle(rule: CategoryRule) {
    const updated = await api.rules.update(rule.id, { enabled: !rule.enabled });
    setRules((prev) => prev.map((r) => (r.id === rule.id ? updated : r)));
  }

  async function remove(id: number) {
    await api.rules.remove(id);
    setRules((prev) => prev.filter((r) => r.id !== id));
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Szabályok</h1>
          <div className="page-sub">
            Ha egy tranzakció leírása tartalmazza a mintát, importáláskor automatikusan ez a kategória kerül rá.
            Hosszabb minta előbb próbálkozik, mint egy rövidebb.
          </div>
        </div>
      </div>

      <form onSubmit={add} className="card" style={{ display: "flex", gap: 10, alignItems: "flex-end", marginBottom: 18 }}>
        <div className="field" style={{ flex: 1 }}>
          <label>Minta a leírásban</label>
          <input value={pattern} onChange={(e) => setPattern(e.target.value)} placeholder="pl. valamelyik bolt vagy szolgáltató neve" />
        </div>
        <div className="field">
          <label>Kategória</label>
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">Válassz</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.type === "expense" ? "kiadás" : "bevétel"})
              </option>
            ))}
          </select>
        </div>
        <button className="btn btn-primary" type="submit">
          <IconPlus size={14} /> Hozzáadás
        </button>
      </form>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        {rules.length === 0 ? (
          <div className="empty-state">Még nincs egy szabály sem — vegyél fel egyet fent, vagy kategorizálj egy tranzakciót a listában.</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Minta</th>
                <th>Kategória</th>
                <th>Eredet</th>
                <th>Állapot</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rules.map((rule) => (
                <tr key={rule.id} style={{ opacity: rule.enabled ? 1 : 0.5 }}>
                  <td className="tabular">{rule.pattern}</td>
                  <td>{rule.category_name}</td>
                  <td>
                    <span className={`badge ${rule.source === "learned" ? "badge-warn" : "badge-muted"}`}>
                      {rule.source === "learned" ? "Tanult" : "Kézi"}
                    </span>
                  </td>
                  <td>
                    <button className="btn btn-ghost" onClick={() => toggle(rule)}>
                      {rule.enabled ? "Bekapcsolva" : "Kikapcsolva"}
                    </button>
                  </td>
                  <td>
                    <button className="btn btn-icon btn-ghost btn-danger" onClick={() => remove(rule.id)} title="Törlés">
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
