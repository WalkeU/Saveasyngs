import { db } from "./db.js";

// keeps only the most recent 50 entries — this is a lightweight "what did I
// just do" trail, not a permanent audit log
const HISTORY_LIMIT = 50;

export function logActivity(action: string, summary: string): void {
  db.prepare("INSERT INTO activity_log (action, summary) VALUES (?, ?)").run(action, summary);
  db.prepare(
    `DELETE FROM activity_log WHERE id NOT IN (
       SELECT id FROM activity_log ORDER BY id DESC LIMIT ?
     )`,
  ).run(HISTORY_LIMIT);
}
