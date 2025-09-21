import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { screenings, jobs, candidates, sparcItems, qaTurns } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const [s] = await db.select().from(screenings).where(eq(screenings.id, id));
  if (!s) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [[job], [cand], sparc, turns] = await Promise.all([
    db.select().from(jobs).where(eq(jobs.id, s.jobId)),
    db.select().from(candidates).where(eq(candidates.id, s.candidateId)),
    db.select().from(sparcItems).where(eq(sparcItems.screeningId, s.id)),
    db
      .select()
      .from(qaTurns)
      .where(eq(qaTurns.screeningId, s.id))
      .orderBy(desc(qaTurns.createdAt)),
  ]);

  return NextResponse.json({
    screening: s,
    job,
    candidate: cand,
    sparc,
    turns,
  });
}
