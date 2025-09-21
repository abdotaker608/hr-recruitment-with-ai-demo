"use client";

import { useState } from "react";

export default function Home() {
  const [jobId, setJobId] = useState("");
  const [candId, setCandId] = useState("");
  const [screeningId, setScreeningId] = useState<string | null>(null);

  async function create() {
    const res = await fetch("/api/screenings", {
      method: "POST",
      body: JSON.stringify({ jobId, candidateId: candId, mode: "text" }),
      headers: { "Content-Type": "application/json" },
    }).then((r) => r.json());
    setScreeningId(res.id);
  }

  return (
    <main className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">AI Phone Screening Assistant</h1>

      <div className="space-y-2">
        <label className="block">Job ID</label>
        <input
          className="border px-3 py-2 rounded w-full"
          value={jobId}
          onChange={(e) => setJobId(e.target.value)}
          placeholder="Paste jobId from seed output"
        />
        <label className="block">Candidate ID</label>
        <input
          className="border px-3 py-2 rounded w-full"
          value={candId}
          onChange={(e) => setCandId(e.target.value)}
          placeholder="Paste candId from seed output"
        />
        <button
          onClick={create}
          className="bg-black text-white px-4 py-2 rounded"
        >
          Create Screening
        </button>
      </div>

      {screeningId && (
        <div className="pt-2">
          <a className="underline" href={`/screening/${screeningId}`}>
            Open Screening Chat →
          </a>
        </div>
      )}
    </main>
  );
}
