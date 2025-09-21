import { db } from "@/db/client";
import { screenings, candidates, jobs } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import Link from "next/link";

type Row = {
  id: string;
  fitScore: number | null;
  startedAt: number;
  endedAt: number | null;
  candidateName: string;
  jobTitle: string;
};

export default async function DashboardPage() {
  const s = await db
    .select()
    .from(screenings)
    .orderBy(desc(screenings.startedAt));
  const rows: Row[] = [];
  for (const r of s) {
    const [[cand]] = await Promise.all([
      db.select().from(candidates).where(eq(candidates.id, r.candidateId)),
    ]);
    const [[job]] = await Promise.all([
      db.select().from(jobs).where(eq(jobs.id, r.jobId)),
    ]);
    rows.push({
      id: r.id,
      fitScore: r.fitScore ?? null,
      startedAt: Number(r.startedAt),
      endedAt: r.endedAt ? Number(r.endedAt) : null,
      candidateName: cand?.name ?? "—",
      jobTitle: job?.title ?? "—",
    });
  }

  return (
    <main className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Screenings</h1>
        <Link href="/" className="underline">
          + New
        </Link>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b">
              <th className="py-2 pr-4">Candidate</th>
              <th className="py-2 pr-4">Role</th>
              <th className="py-2 pr-4">Score</th>
              <th className="py-2 pr-4">Status</th>
              <th className="py-2 pr-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b">
                <td className="py-2 pr-4">{r.candidateName}</td>
                <td className="py-2 pr-4">{r.jobTitle}</td>
                <td className="py-2 pr-4">{r.fitScore ?? "—"}</td>
                <td className="py-2 pr-4">
                  {r.endedAt ? "Finished" : "In progress"}
                </td>
                <td className="py-2 pr-4">
                  <a className="underline mr-3" href={`/screening/${r.id}`}>
                    Open
                  </a>
                  <a className="underline" href={`/report/${r.id}`}>
                    Report
                  </a>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td className="py-3 text-gray-600">No screenings yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
