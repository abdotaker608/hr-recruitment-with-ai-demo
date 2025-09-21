import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { qaTurns, screenings, sparcItems } from "@/db/schema";
import { eq } from "drizzle-orm";
import { extractSignalsFromTranscript } from "@/lib/ai";
import { computeWeightedFit } from "@/lib/fit";
import { v4 as uuid } from "uuid";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const body = await req.json();
  // For now, we accept the whole transcript from the client.
  // Later we will persist turns in qaTurns (and/or do STT live).
  const { transcript } = body as { transcript: string };

  const extraction = await extractSignalsFromTranscript(transcript);

  const cfg = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL ?? ""}/api/config`
  )
    .then((r) => r.json())
    .catch(() => null);
  const weights = cfg
    ? {
        backend: cfg.w_backend,
        leadership: cfg.w_leadership,
        scaling: cfg.w_scaling,
      }
    : undefined;

  const fitScore = await computeWeightedFit({
    sparcItems: extraction.sparc,
    weights,
  });

  await db
    .update(screenings)
    .set({
      salaryExpectation: extraction.salaryExpectation,
      noticePeriod: extraction.noticePeriod,
      reasonForLeaving: extraction.reasonForLeaving,
      motivation: extraction.motivation,
      careerExpectations: extraction.careerExpectations,
      summary: `Candidate demonstrates strong backend & DevOps skills. Key wins: ${extraction.sparc[0].anchorSnippet}.`,
      fitScore,
      riskFlags: JSON.stringify(extraction.riskFlags),
      endedAt: new Date(),
    })
    .where(eq(screenings.id, id));

  // Save SPARC rows
  for (const si of extraction.sparc) {
    await db.insert(sparcItems).values({
      id: uuid(),
      screeningId: id,
      anchorSnippet: si.anchorSnippet,
      situation: si.situation,
      problem: si.problem,
      action: si.action,
      result: si.result,
      calibration: si.calibration,
      score: si.score,
    });
  }

  return NextResponse.json({ ok: true, fitScore });
}
