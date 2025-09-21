import "dotenv/config";
import { client, db } from "./client";
import { candidates, jobs } from "./schema";
import { v4 as uuid } from "uuid";
import { JD, CV } from "@/const/mock";

// ...
const QUESTIONS = [
  { topic: "baseline", question: "What is your salary expectation?" },
  { topic: "baseline", question: "What is your notice period?" },
  { topic: "baseline", question: "Reason for leaving your current role?" },
  {
    topic: "backend",
    question: "Describe a time you reduced p95 latency. What changed?",
  },
  {
    topic: "devops",
    question: "Walk through a CI/CD pipeline you built (stages, rollback).",
  },
  {
    topic: "scaling",
    question: "How did you scale a service during peak traffic? Bottlenecks?",
  },
  {
    topic: "leadership",
    question: "Tell me about mentoring and driving delivery under pressure.",
  },
  {
    topic: "security",
    question: "How do you approach secrets, SBOM, and dependency risks?",
  },
];

async function main() {
  /* Jobs & candidates seed */
  const jobId = uuid();
  const candId = uuid();

  await db.insert(jobs).values({
    id: jobId,
    title: "Senior Backend Engineer",
    department: "Engineering",
    location: "Remote",
    jdText: JD.trim(),
  });

  await db.insert(candidates).values({
    id: candId,
    name: "Sarah Ahmed",
    email: "sarah.ahmed@example.com",
    resumeText: CV.trim(),
  });

  console.log("Seeded:", { jobId, candId });

  /* JD, CV, QB search index seed */
  await client.execute({
    sql: "DELETE FROM search_index",
    args: [],
  });

  // Index JD
  await client.execute({
    sql: "INSERT INTO search_index (owner_type, owner_id, content) VALUES (?1, ?2, ?3)",
    args: ["job", jobId, JD.trim()],
  });

  // Index CV
  await client.execute({
    sql: "INSERT INTO search_index (owner_type, owner_id, content) VALUES (?1, ?2, ?3)",
    args: ["candidate", candId, CV.trim()],
  });

  // Index question bank
  for (const q of QUESTIONS) {
    const qid = uuid();
    await client.execute({
      sql: "INSERT INTO search_index (owner_type, owner_id, content) VALUES (?1, ?2, ?3)",
      args: ["question", qid, `${q.topic}: ${q.question}`],
    });
  }

  console.log("Search index seeded ✓");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
