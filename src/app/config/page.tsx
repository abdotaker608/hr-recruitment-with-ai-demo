"use client";
import { useEffect, useState } from "react";

export default function ConfigPage() {
  const [cfg, setCfg] = useState<any>(null);
  const [token, setToken] = useState("");

  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then(setCfg);
  }, []);

  async function save() {
    await fetch("/api/config", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(cfg),
    });
    alert("Saved!");
  }

  if (!cfg) return <main className="p-6">Loading…</main>;

  return (
    <main className="p-6 space-y-4 max-w-xl">
      <h1 className="text-2xl font-bold">Demo Config</h1>
      <div className="space-y-3">
        <label className="block">Admin Token</label>
        <input
          className="border px-3 py-2 rounded w-full"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="DEMO_ADMIN_TOKEN"
        />
      </div>

      <section className="grid grid-cols-3 gap-3">
        {(["w_backend", "w_leadership", "w_scaling"] as const).map((k) => (
          <div key={k}>
            <label className="block text-sm font-medium">{k}</label>
            <input
              type="number"
              step="0.05"
              className="border px-2 py-1 rounded w-full"
              value={cfg[k]}
              onChange={(e) =>
                setCfg((c: any) => ({ ...c, [k]: parseFloat(e.target.value) }))
              }
            />
          </div>
        ))}
      </section>

      <section className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium">th_advance</label>
          <input
            type="number"
            className="border px-2 py-1 rounded w-full"
            value={cfg.th_advance}
            onChange={(e) =>
              setCfg((c: any) => ({
                ...c,
                th_advance: parseInt(e.target.value),
              }))
            }
          />
        </div>
        <div>
          <label className="block text-sm font-medium">th_hold_min</label>
          <input
            type="number"
            className="border px-2 py-1 rounded w-full"
            value={cfg.th_hold_min}
            onChange={(e) =>
              setCfg((c: any) => ({
                ...c,
                th_hold_min: parseInt(e.target.value),
              }))
            }
          />
        </div>
      </section>

      <button onClick={save} className="px-4 py-2 rounded bg-black text-white">
        Save
      </button>
    </main>
  );
}
