import "dotenv/config";
import { client, db } from "./client";
import { candidates, jobs } from "./schema";
import { v4 as uuid } from "uuid";

const JD = `
Role: Senior Backend Engineer (with DevOps expertise)
Responsibilities:
- Architect and implement backend services in Node.js/TypeScript and Go.
- CI/CD, Docker, Kubernetes; design scalable data models (PostgreSQL, Redis).
- Monitoring (Prometheus, Grafana, ELK). Cloud (AWS/GCP). Terraform/Helm.
Qualifications:
- 5+ years backend, distributed systems, scalable architectures.
- DevOps background: CI/CD, K8s, IaC. Mentoring experience.
Nice to have: Event-driven (Kafka/RabbitMQ), security best practices.
`;

const CV = `
Name: Sarah Ahmed
Summary: Backend engineer with 6 years in distributed, high-performance systems. Node.js/TS, cloud-native, CI/CD, scaling.
FinTechX (2021–present): Scaled payment APIs to 20k+/min; K8s (GCP); GitHub Actions + Helm; led 3 engineers; Redis cache cut p95 from 800ms->200ms.
ShopEase (2018–2021): Node/Express; Postgres optimizations + read replicas; Terraform; Prometheus/Grafana lowered MTTR 40%.
Skills: Node.js, TS, Go (beginner), PostgreSQL, Redis, Kubernetes, Docker, Terraform, Helm, Prometheus, Grafana, ELK.
`;

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
