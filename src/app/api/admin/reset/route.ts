import { NextRequest, NextResponse } from "next/server";
import { client } from "@/db/client";
import { v4 as uuid } from "uuid";
import { JD, CV } from "@/const/mock";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  console.log(token, req.headers.get("authorization"));
  if (!token || token !== process.env.DEMO_ADMIN_TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // wipe (idempotent & simple for demo)
  await client.execute("DELETE FROM qa_turns");
  await client.execute("DELETE FROM sparc_items");
  await client.execute("DELETE FROM screenings");
  await client.execute("DELETE FROM candidates");
  await client.execute("DELETE FROM jobs");
  await client.execute("DELETE FROM search_index");

  // reseed
  const jobId = uuid();
  const candId = uuid();

  await client.execute({
    sql: `INSERT INTO jobs (id,title,department,location,jd_text,created_at)
          VALUES (?1,'Senior Backend Engineer','Engineering','Remote',?2,strftime('%s','now')*1000)`,
    args: [jobId, JD.trim()],
  });

  await client.execute({
    sql: `INSERT INTO candidates (id,name,email,phone,resume_text,created_at)
          VALUES (?1,'Sarah Ahmed','sarah.ahmed@example.com',NULL,?2,strftime('%s','now')*1000)`,
    args: [candId, CV.trim()],
  });

  // minimal FTS seed
  const QUESTIONS = [
    "baseline: What is your salary expectation?",
    "baseline: What is your notice period?",
    "baseline: Reason for leaving?",
    "backend: Describe reducing p95 latency.",
    "devops: Walk through a CI/CD pipeline you built.",
    "scaling: How did you scale a service at peak?",
    "leadership: Mentoring/driving delivery example.",
    "security: How do you handle dependencies/secrets?",
  ];
  await client.execute({
    sql: "INSERT INTO search_index (owner_type, owner_id, content) VALUES (?1, ?2, ?3)",
    args: ["job", jobId, JD.trim()],
  });
  await client.execute({
    sql: "INSERT INTO search_index (owner_type, owner_id, content) VALUES (?1, ?2, ?3)",
    args: ["candidate", candId, CV.trim()],
  });
  for (const q of QUESTIONS) {
    await client.execute({
      sql: "INSERT INTO search_index (owner_type, owner_id, content) VALUES (?1, ?2, ?3)",
      args: ["question", uuid(), q],
    });
  }

  return NextResponse.json({ ok: true, jobId, candId });
}
