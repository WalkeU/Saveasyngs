import { copyFileSync, existsSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import type { FastifyInstance } from "fastify";
import { db, dbPath, openDatabase } from "../db.js";

export async function backupRoutes(app: FastifyInstance) {
  app.get("/api/backup/export", async (_req, reply) => {
    // flush the WAL into the main file so the exported copy is a complete,
    // self-contained snapshot rather than missing whatever's still sitting
    // in -wal
    db.pragma("wal_checkpoint(TRUNCATE)");
    const buffer = readFileSync(dbPath);
    const filename = `saveasy-backup-${new Date().toISOString().slice(0, 10)}.db`;
    reply.header("Content-Type", "application/octet-stream");
    reply.header("Content-Disposition", `attachment; filename="${filename}"`);
    return reply.send(buffer);
  });

  app.post("/api/backup/import", async (req, reply) => {
    const file = await req.file();
    if (!file) return reply.code(400).send({ error: "file is required" });
    const buffer = await file.toBuffer();

    // cheap sanity check before we touch anything on disk
    if (buffer.subarray(0, 16).toString("utf-8") !== "SQLite format 3\0") {
      return reply.code(400).send({ error: "nem érvényes SQLite adatbázis fájl" });
    }

    db.pragma("wal_checkpoint(TRUNCATE)");
    db.close();

    // one safety copy of whatever was there, in case the upload turns out
    // to be bad in a way the header check above doesn't catch
    if (existsSync(dbPath)) copyFileSync(dbPath, `${dbPath}.bak-${Date.now()}`);

    writeFileSync(dbPath, buffer);
    for (const suffix of ["-wal", "-shm"]) {
      const sidecar = `${dbPath}${suffix}`;
      if (existsSync(sidecar)) unlinkSync(sidecar);
    }

    // re-open in place against the file we just wrote, re-running schema/
    // migrations so an older backup gets brought up to date automatically.
    // No process restart needed: other modules' `import { db }` bindings
    // are live ES module references and pick up the new connection the
    // next time they read it — no re-import required.
    openDatabase();

    return { ok: true };
  });
}
