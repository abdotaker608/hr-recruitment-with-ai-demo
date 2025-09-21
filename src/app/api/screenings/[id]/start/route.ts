import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { jobs, candidates, screenings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { generatePlan } from "@/lib/ai";

export async function POST(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const [s] = await db.select().from(screenings).where(eq(screenings.id, id));
  if (!s) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [[job]] = await Promise.all([
    db.select().from(jobs).where(eq(jobs.id, s.jobId)),
  ]);
  const [[cand]] = await Promise.all([
    db.select().from(candidates).where(eq(candidates.id, s.candidateId)),
  ]);

  const plan = await generatePlan(
    job.title,
    job.jdText,
    cand?.resumeText ?? undefined
  );
  return NextResponse.json({ plan });
}
