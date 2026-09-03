import { useEffect, useState } from "react";
import { api } from "../api";
import { formatMoney, roundMoney, toLocalDateInput } from "../format";
import { CategoryIcon } from "../IconPicker";
import { IconPlus, IconRepeat, IconTrash } from "../icons";
import type { NetWorth, SavingsBucket } from "../types";

export function Savings() {
  const [data, setData] = useState<NetWorth | null>(null);
  const [buckets, setBuckets] = useState<SavingsBucket[]>([]);
  const [loading, setLoading] = useState(true);
  const [newBucketName, setNewBucketName] = useState("");

  const load = () => {
    setLoading(true);
    Promise.all([api.networth.get(), api.buckets.list()])
      .then(([net, b]) => {
        setData(net);
        setBuckets(b);
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  async function addBucket(e: React.FormEvent) {
    e.preventDefault();
    if (!newBucketName.trim()) return;
    await api.buckets.create({ name: newBucketName.trim() });
    setNewBucketName("");
    load();
  }

  async function removeBucket(id: number) {
    await api.buckets.remove(id);
    load();
  }

  async function renoteBucket(id: number, note: string) {
    await api.buckets.update(id, { note: note.trim() || null });
    load();
  }

  async function revalueBucket(id: number, manualValue: number | null) {
    await api.buckets.update(id, { manualValue });
    load();
  }

  async function setLiquid(value: number | null) {
    const net = await api.networth.setLiquid(value);
    setData(net);
  }

  const bucketsTotal = data?.buckets.reduce((sum, b) => sum + b.total, 0) ?? 0;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Megtakarítás</h1>
          <div className="page-sub">
            A vagyonod összetétele — mennyi a szabad (liquid) pénzed, és mennyi van lekötve
          </div>
        </div>
      </div>

      {!loading && data && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 24 }}>
          <StatCard label="Nettó vagyon" value={data.netWorth} />
          <LiquidCard data={data} onSet={setLiquid} />
          <StatCard label="Lekötve összesen" value={bucketsTotal} muted />
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, alignItems: "flex-start" }}>
        <div className="card">
          <h2 style={{ fontSize: 17, marginBottom: 14 }}>Megtakarítási helyek (buckets)</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
            {buckets.map((b) => {
              const bucketData = data?.buckets.find((nb) => nb.bucket_id === b.id);
              const total = bucketData?.total ?? 0;
              const isManual = bucketData?.isManual ?? false;
              return (
                <div
                  key={b.id}
                  style={{ display: "flex", flexDirection: "column", gap: 4, paddingBottom: 8, borderBottom: "1px solid var(--hairline)" }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <CategoryIcon icon={b.icon} color={b.color ?? undefined} />
                    <span style={{ flex: 1, fontSize: 13.5 }}>{b.name}</span>
                    {isManual && (
                      <span className="badge badge-muted" title="Kézzel beállított érték, nem a tranzakciókból számolva">
                        kézi
                      </span>
                    )}
                    <input
                      key={roundMoney(total)}
                      type="number"
                      defaultValue={roundMoney(total)}
                      onBlur={(e) => {
                        const next = roundMoney(Number(e.target.value));
                        if (!Number.isNaN(next) && next !== roundMoney(total)) revalueBucket(b.id, next);
                      }}
                      className="tabular"
                      style={{ width: 130, textAlign: "right", fontSize: 13.5 }}
                      title="Kattints és írd át az aktuális értéket (pl. árfolyamváltozás miatt)"
                    />
                    {isManual && (
                      <button
                        className="btn btn-icon btn-ghost"
                        onClick={() => revalueBucket(b.id, null)}
                        title="Vissza automatikus (tranzakció-alapú) számolásra"
                      >
                        <IconRepeat size={14} />
                      </button>
                    )}
                    <button className="btn btn-icon btn-ghost btn-danger" onClick={() => removeBucket(b.id)} title="Törlés">
                      <IconTrash />
                    </button>
                  </div>
                  <input
                    key={b.note ?? ""}
                    defaultValue={b.note ?? ""}
                    onBlur={(e) => e.target.value.trim() !== (b.note ?? "") && renoteBucket(b.id, e.target.value)}
                    placeholder="Jegyzet, pl. 10 db AAPL részvény"
                    style={{ fontSize: 12, color: "var(--ink-soft)" }}
                  />
                </div>
              );
            })}
            {buckets.length === 0 && (
              <div style={{ fontSize: 13, color: "var(--ink-faint)" }}>
                Még nincs megtakarítási helyed. Vegyél fel egyet, pl. "ETH" vagy "Részvényszámla".
              </div>
            )}
          </div>
          <form onSubmit={addBucket} style={{ display: "flex", gap: 8 }}>
            <input
              value={newBucketName}
              onChange={(e) => setNewBucketName(e.target.value)}
              placeholder="Új megtakarítási hely neve"
              style={{ flex: 1 }}
            />
            <button className="btn btn-primary" type="submit">
              <IconPlus size={14} />
            </button>
          </form>
        </div>

        <TransferForm buckets={buckets} liquid={data?.liquid ?? 0} onDone={load} />
      </div>
    </div>
  );
}

function TransferForm({
  buckets,
  liquid,
  onDone,
}: {
  buckets: SavingsBucket[];
  liquid: number;
  onDone: () => void;
}) {
  const [amount, setAmount] = useState("");
  const [bucketId, setBucketId] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!amount || Number(amount) <= 0 || !bucketId) return;
    setSaving(true);
    try {
      await api.transactions.create({
        type: "savings",
        amount: Number(amount),
        description: "Átrakás megtakarításba",
        bucketId: Number(bucketId),
        date: toLocalDateInput(new Date()),
      });
      setAmount("");
      setBucketId("");
      onDone();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card">
      <h2 style={{ fontSize: 17, marginBottom: 6 }}>Átrakás a szabad pénzből</h2>
      <div style={{ fontSize: 12.5, color: "var(--ink-faint)", marginBottom: 14 }}>
        Szabad (liquid) pénz most: <span className="tabular">{formatMoney(liquid)}</span>. Az átrakás
        egy tranzakcióként bekerül a Tranzakciók listába is.
      </div>
      <form onSubmit={submit} style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
        <div className="field">
          <label>Összeg</label>
          <input type="number" min="0" step="1" value={amount} onChange={(e) => setAmount(e.target.value)} required style={{ width: 140 }} />
        </div>
        <div className="field" style={{ flex: 1, minWidth: 160 }}>
          <label>Hova</label>
          <select value={bucketId} onChange={(e) => setBucketId(e.target.value)} required>
            <option value="">Válassz</option>
            {buckets.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
        <button className="btn btn-primary" type="submit" disabled={saving || buckets.length === 0}>
          Átrakás
        </button>
      </form>
    </div>
  );
}

function LiquidCard({ data, onSet }: { data: NetWorth; onSet: (value: number | null) => void }) {
  return (
    <div className="card">
      <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--ink-soft)", marginBottom: 8 }}>
        Szabad (liquid) pénz
      </div>
      <input
        key={roundMoney(data.liquid)}
        type="number"
        defaultValue={roundMoney(data.liquid)}
        onBlur={(e) => {
          const next = roundMoney(Number(e.target.value));
          if (!Number.isNaN(next) && next !== roundMoney(data.liquid)) onSet(next);
        }}
        className="tabular"
        style={{
          fontSize: 26,
          fontWeight: 600,
          color: "var(--ink)",
          width: "100%",
          border: "none",
          background: "none",
          padding: 0,
        }}
        title="Kattints és írd át a szabad pénz összegét"
      />
    </div>
  );
}

function StatCard({ label, value, muted }: { label: string; value: number; muted?: boolean }) {
  return (
    <div className="card">
      <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--ink-soft)", marginBottom: 8 }}>
        {label}
      </div>
      <div
        className="tabular"
        style={{ fontSize: 26, fontWeight: 600, color: muted ? "var(--ink)" : "var(--accent)" }}
      >
        {formatMoney(value)}
      </div>
    </div>
  );
}
