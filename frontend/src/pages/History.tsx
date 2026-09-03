import { useEffect, useState } from "react";
import { api } from "../api";
import { formatLogTime } from "../format";
import type { ActivityLogEntry } from "../types";

export function History() {
  const [entries, setEntries] = useState<ActivityLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.history.list().then((e) => {
      setEntries(e);
      setLoading(false);
    });
  }, []);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Előzmények</h1>
          <div className="page-sub">Az utolsó legfeljebb 50 módosítás — az ennél régebbiek elvesznek</div>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        {!loading && entries.length === 0 ? (
          <div className="empty-state">Még nincs rögzített módosítás.</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ whiteSpace: "nowrap" }}>Időpont</th>
                <th>Esemény</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id}>
                  <td style={{ whiteSpace: "nowrap", color: "var(--ink-soft)" }}>
                    {formatLogTime(e.created_at)}
                  </td>
                  <td>{e.summary}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
