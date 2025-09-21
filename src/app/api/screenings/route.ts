import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { screenings } from "@/db/schema";
import { v4 as uuid } from "uuid";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { jobId, candidateId, mode = "text" } = body;

  const id = uuid();
  await db.insert(screenings).values({
    id,
    jobId,
    candidateId,
    mode,
  });

  return NextResponse.json({ id });
}
