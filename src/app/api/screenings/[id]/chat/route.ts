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
    content: `You are a structured recruiter assistant for the role "${
      job.title
    }".
              Goals:
              1) Ask ONE concise question at a time. Prefer baseline until captured (salary, notice, reason, motivation, expectations).
              2) Use relevant context from <CONTEXT/> to tailor probes (do NOT quote long passages).
              3) **AI-Answer Check:** Evaluate each candidate reply for signs of AI or copy-paste:
                - overly generic, over-polished, or template-like phrasing
                - restating the question verbatim, buzzword stuffing, or JD-echoing
                - inconsistent first-person details (I/we) vs. concrete metrics
                - markdown artifacts or unexplained sudden style changes
                - missing specifics (dates, team size, numbers) after direct prompts
                If suspicion is moderate/high, ask a short "grounding" follow-up requiring **concrete details**:
                • “What was the exact p95/p99 latency before/after, and how did you measure it?”
                • “What was the team size and your exact role?” 
                • “Show a quick mental model of the rollout steps in bullet points.”
                Do NOT accuse; stay neutral and professional.

              4) Keep turns brisk. Avoid multi-part questions. If the candidate is vague, ask one pointed follow-up.

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
    content: `Ask the next best question:\n\nNext question hint: "${nextQuestion}"
      If the last candidate answer seems generic or template-like, ask for concrete details (numbers, dates, team size, tools) before moving on.`,
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
