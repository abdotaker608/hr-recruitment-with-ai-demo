import { NextRequest } from "next/server";
import { db } from "@/db/client";
import { candidates, jobs, qaTurns, screenings } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { streamChat } from "@/lib/llm";
import { generatePlan } from "@/lib/ai";
import { v4 as uuid } from "uuid";
import { retrieveContext } from "@/lib/rag";

export const runtime = "nodejs"; // ensure streaming works reliably

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Load context: screening + job + candidate + turns
  const [s] = await db.select().from(screenings).where(eq(screenings.id, id));
  if (!s) return new Response("Not found", { status: 404 });

  const [[job]] = await Promise.all([
    db.select().from(jobs).where(eq(jobs.id, s.jobId)),
  ]);
  const [[cand]] = await Promise.all([
    db.select().from(candidates).where(eq(candidates.id, s.candidateId)),
  ]);

  const turns = await db
    .select()
    .from(qaTurns)
    .where(eq(qaTurns.screeningId, id))
    .orderBy(asc(qaTurns.createdAt));

  // Determine the next question to ask: generate plan and pick the first item
  // that hasn't been covered (naive heuristic: number of assistant questions asked so far).
  const plan = await generatePlan(
    job.title,
    job.jdText,
    cand?.resumeText ?? undefined
  );
  const askedCount = turns.filter((t) => t.role === "assistant").length;
  const nextQuestion = plan[Math.min(askedCount, plan.length - 1)];

  // Construct chat messages (system + short memory of last 8 turns)
  const lastTurns = turns
    .slice(-8)
    .map((t) => ({
      role: t.role as "system" | "assistant" | "user" | "candidate",
      content: t.content,
    }))
    .map((m) =>
      m.role === "candidate" ? { role: "user" as const, content: m.content } : m
    );

  const lastCandidate =
    [...turns].reverse().find((t) => t.role === "candidate")?.content ?? "";
  const ragQuery = lastCandidate || nextQuestion;
  const ctx = await retrieveContext({ query: ragQuery });

  const system = {
    role: "system" as const,
    content: `You are a structured recruiter assistant for "${job.title}".
              Ask ONE concise question at a time. Prefer baseline until captured (salary, notice, reason, motivation, expectations).
              Use the provided context, but do NOT quote long passages.

              <CONTEXT>
              <JD>
              ${ctx.jd.join("\n---\n")}
              </JD>
              <CV>
              ${ctx.cv.join("\n---\n")}
              </CV>
              <QUESTIONS>
              ${ctx.qs.join("\n")}
              </QUESTIONS>
              </CONTEXT>`,
  };

  const userPrompt = {
    role: "user" as const,
    content: `Ask the next best question:\n\nNext question hint: "${nextQuestion}"\nIf the candidate's last answer is vague, ask a pointed follow-up.`,
  };

  // Create a streaming response
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // 1) stream tokens out to the client
        let collected = "";
        for await (const token of streamChat([
          system,
          ...lastTurns,
          userPrompt,
        ])) {
          collected += token;
          controller.enqueue(new TextEncoder().encode(token));
        }
        controller.close();

        // 2) persist the assistant turn after streaming completes
        await db.insert(qaTurns).values({
          id: uuid(),
          screeningId: id,
          role: "assistant",
          content: collected.trim(),
        });
      } catch (err: any) {
        controller.error(err);
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
    },
  });
}
