import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { qaTurns, screenings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { v4 as uuid } from "uuid";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const body = await req.json();
  const { role, content } = body as {
    role: "assistant" | "candidate" | "system";
    content: string;
  };

  if (!role || !content) {
    return NextResponse.json(
      { error: "Missing role or content" },
      { status: 400 }
    );
  }

  const [s] = await db.select().from(screenings).where(eq(screenings.id, id));
  if (!s)
    return NextResponse.json({ error: "Screening not found" }, { status: 404 });

  await db.insert(qaTurns).values({
    id: uuid(),
    screeningId: id,
    role,
    content,
  });

  return NextResponse.json({ ok: true });
}
