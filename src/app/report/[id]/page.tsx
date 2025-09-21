import { db } from "@/db/client";
import { screenings, jobs, candidates, sparcItems } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import Link from "next/link";
import CopyButton from "./components/copy-button";

function badge(score: number | null) {
  if (score == null)
    return <span className="px-2 py-1 rounded bg-gray-200">N/A</span>;
  const color =
    score >= 75 ? "bg-green-600" : score >= 60 ? "bg-yellow-600" : "bg-red-600";
  const label = score >= 75 ? "Advance" : score >= 60 ? "Hold" : "Reject";
  return (
    <span className={`px-2 py-1 rounded text-white ${color}`}>
      {label} ({score})
    </span>
  );
}

export default async function ReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [s] = await db.select().from(screenings).where(eq(screenings.id, id));

  if (!s) return <div className="p-6">Not found</div>;

  const [[job], [cand], sparc] = await Promise.all([
    db.select().from(jobs).where(eq(jobs.id, s.jobId)),
    db.select().from(candidates).where(eq(candidates.id, s.candidateId)),
    db
      .select()
      .from(sparcItems)
      .where(eq(sparcItems.screeningId, s.id))
      .orderBy(desc(sparcItems.score)),
  ]);

  const riskFlags: string[] = s.riskFlags ? JSON.parse(s.riskFlags) : [];

  async function copySummary() {
    "use server";
    // no-op on server; we handle copy on client via a small component below
  }

  return (
    <main className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Screening Report</h1>
        <Link href="/" className="underline">
          ← Back
        </Link>
      </div>

      <section className="grid md:grid-cols-3 gap-4">
        <div className="p-4 rounded border">
          <div className="font-semibold">Candidate</div>
          <div>{cand?.name}</div>
          <div className="text-sm text-gray-600">{cand?.email}</div>
        </div>
        <div className="p-4 rounded border">
          <div className="font-semibold">Role</div>
          <div>{job?.title}</div>
          <div className="text-sm text-gray-600">{job?.location}</div>
        </div>
        <div className="p-4 rounded border">
          <div className="font-semibold">Decision</div>
          <div className="mt-1">{badge(s.fitScore ?? null)}</div>
        </div>
      </section>

      <section className="p-4 rounded border space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Summary</h2>
          <CopyButton text={s.summary ?? "No summary yet."} />
        </div>
        <p className="whitespace-pre-wrap text-gray-800">
          {s.summary ?? "No summary yet."}
        </p>
      </section>

      <section className="grid md:grid-cols-2 gap-4">
        <div className="p-4 rounded border space-y-2">
          <h2 className="font-semibold">Baseline Answers</h2>
          <ul className="text-sm leading-7">
            <li>
              <span className="font-medium">Salary:</span>{" "}
              {s.salaryExpectation ?? "—"}
            </li>
            <li>
              <span className="font-medium">Notice:</span>{" "}
              {s.noticePeriod ?? "—"}
            </li>
            <li>
              <span className="font-medium">Reason for leaving:</span>{" "}
              {s.reasonForLeaving ?? "—"}
            </li>
            <li>
              <span className="font-medium">Motivation:</span>{" "}
              {s.motivation ?? "—"}
            </li>
            <li>
              <span className="font-medium">Career expectations:</span>{" "}
              {s.careerExpectations ?? "—"}
            </li>
          </ul>
          {riskFlags.length > 0 && (
            <div className="pt-2">
              <div className="font-semibold">Risk flags</div>
              <ul className="list-disc list-inside text-sm">
                {riskFlags.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="p-4 rounded border space-y-2">
          <h2 className="font-semibold">SPARC Evidence</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2 pr-2">Anchor</th>
                  <th className="py-2 pr-2">S</th>
                  <th className="py-2 pr-2">P</th>
                  <th className="py-2 pr-2">A</th>
                  <th className="py-2 pr-2">R</th>
                  <th className="py-2 pr-2">C</th>
                  <th className="py-2 pr-2">Score</th>
                </tr>
              </thead>
              <tbody>
                {sparc.map((row) => (
                  <tr key={row.id} className="border-b align-top">
                    <td className="py-2 pr-2">{row.anchorSnippet}</td>
                    <td className="py-2 pr-2">{row.situation}</td>
                    <td className="py-2 pr-2">{row.problem}</td>
                    <td className="py-2 pr-2">{row.action}</td>
                    <td className="py-2 pr-2">{row.result}</td>
                    <td className="py-2 pr-2">{row.calibration}</td>
                    <td className="py-2 pr-2">{(row.score ?? 0).toFixed(2)}</td>
                  </tr>
                ))}
                {sparc.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-3 text-gray-500">
                      No SPARC items yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="p-4 rounded border">
        <h2 className="font-semibold">What’s next?</h2>
        <div className="text-sm text-gray-700">
          Use this report in your ATS; copy the summary, and share the decision
          with the panel.
        </div>
      </section>
    </main>
  );
}
