import { llmAvailable } from "./llm";

/**
 * Generate a dynamic screening plan based on the JD and the candidate's resume.
 * - Always includes the 5 baseline questions.
 * - Tailors technical/leadership/scaling probes from JD signal.
 * - Detects gaps: items strongly present in JD but weak/absent in the resume.
 * - Optionally refines w/ LLM when keys exist (kept short; still deterministic fallback).
 */
export async function generatePlan(
  jobTitle: string,
  jdText: string,
  resumeText?: string
) {
  const baseline = [
    "Baseline: salary expectation?",
    "Baseline: notice period?",
    "Baseline: reason for leaving?",
    "Baseline: motivation for this role?",
    "Baseline: career expectations?",
  ];

  const analysis = analyze(jobTitle, jdText || "", resumeText || "");
  const tailored = buildTailoredQuestions(analysis);

  // Optional refinement via LLM (kept small, never blocks the demo)
  // You can remove this block if you prefer purely deterministic behavior.
  if (llmAvailable()) {
    try {
      const refined = await refineWithLlm({
        jobTitle,
        jdSummary: summarize(jdText, 900),
        resumeSummary: summarize(resumeText || "", 900),
        suggestions: tailored.slice(0, 7), // keep prompt tight
      });
      // Merge (dedupe), keeping baseline first
      const merged = dedupe([...baseline, ...refined, ...tailored]);
      return merged.slice(0, 12); // cap length
    } catch {
      // Fallback to deterministic only
    }
  }

  return dedupe([...baseline, ...tailored]).slice(0, 12);
}

/* -------------------- Deterministic analysis helpers -------------------- */

type Analysis = {
  seniority: "junior" | "mid" | "senior" | "staff_or_above";
  jd: Signal;
  cv: Signal;
  gaps: string[]; // strong JD signals missing in CV
  domainHints: string[];
};

type Signal = {
  stacks: string[]; // node, ts, go, java, python, etc.
  devops: string[]; // k8s, docker, terraform, helm, ci/cd tool, etc.
  data: string[]; // postgres, redis, kafka, rabbitmq, etc.
  cloud: string[]; // aws/gcp/azure
  patterns: string[]; // microservices, event-driven, cqrs, etc.
  leadership: boolean;
  security: boolean;
  scaling: boolean; // hints of scale (hpa, autoscaling, replicas, p95/p99, rps)
};

function analyze(jobTitle: string, jd: string, cv: string): Analysis {
  const seniority = detectSeniority(jobTitle + " " + jd);

  const jdSig = extractSignal(jd);
  const cvSig = extractSignal(cv);

  const jdSet = new Set([
    ...jdSig.stacks,
    ...jdSig.devops,
    ...jdSig.data,
    ...jdSig.cloud,
    ...jdSig.patterns,
  ]);
  const cvSet = new Set([
    ...cvSig.stacks,
    ...cvSig.devops,
    ...cvSig.data,
    ...cvSig.cloud,
    ...cvSig.patterns,
  ]);

  const gaps = Array.from(jdSet)
    .filter((x) => !cvSet.has(x))
    .slice(0, 6);

  const domainHints = pickDomains(jd + " " + jobTitle);

  return { seniority, jd: jdSig, cv: cvSig, gaps, domainHints };
}

function detectSeniority(text: string): Analysis["seniority"] {
  const t = lower(text);
  if (/\b(principal|staff|architect)\b/.test(t)) return "staff_or_above";
  if (/\bsenior\b/.test(t)) return "senior";
  if (/\b(mid|intermediate)\b/.test(t)) return "mid";
  return "junior";
}

function extractSignal(text: string): Signal {
  const t = " " + lower(text) + " ";

  const stacks = hit(t, [
    "node",
    "node.js",
    "typescript",
    "ts",
    "javascript",
    "go",
    "golang",
    "java",
    "python",
    "rust",
    "c#",
    ".net",
  ]);

  const devops = hit(t, [
    "kubernetes",
    "k8s",
    "docker",
    "terraform",
    "helm",
    "github actions",
    "gitlab ci",
    "jenkins",
    "argo",
    "flux",
    "prometheus",
    "grafana",
    "elk",
    "opentelemetry",
    "otel",
    "datadog",
  ]);

  const data = hit(t, [
    "postgres",
    "postgresql",
    "mysql",
    "mariadb",
    "mongodb",
    "redis",
    "kafka",
    "rabbitmq",
    "sqs",
    "pub/sub",
    "bigquery",
    "elasticsearch",
  ]);

  const cloud = hit(t, ["aws", "gcp", "azure"]);
  const patterns = hit(t, [
    "microservices",
    "event-driven",
    "cqrs",
    "saga",
    "outbox",
    "ddd",
    "rest",
    "grpc",
    "graphqL",
  ]);

  const leadership =
    /\b(lead|mento(?:r|red)|coac|own(?:ed|ership)|guided|managed|tech(?:nical)?\s*lead)\b/.test(
      t
    );

  const security =
    /\b(security|owasp|secrets|sbom|sast|dast|iam|kms|vault)\b/.test(t);

  const scaling =
    /\b(hpa|autoscal|replica|throughput|rps|qps|p95|p99|latency|scale|scaling|load|peak traffic)\b/.test(
      t
    );

  return {
    stacks,
    devops,
    data,
    cloud,
    patterns,
    leadership,
    security,
    scaling,
  };
}

function hit(t: string, vocab: string[]): string[] {
  const out: string[] = [];
  for (const v of vocab) {
    const re = new RegExp("\\b" + escapeReg(v) + "\\b", "i");
    if (re.test(t)) out.push(normalizeToken(v));
  }
  return uniq(out);
}

function pickDomains(t: string): string[] {
  const text = lower(t);
  const domains = [
    "fintech",
    "payments",
    "ecommerce",
    "adtech",
    "healthcare",
    "edtech",
    "logistics",
    "gaming",
    "social",
    "saas",
    "marketplace",
  ];
  return domains
    .filter((d) => new RegExp("\\b" + d + "\\b", "i").test(text))
    .slice(0, 3);
}

function normalizeToken(v: string) {
  if (v === "node.js") return "node";
  if (v === "ts") return "typescript";
  if (v === "k8s") return "kubernetes";
  if (v === "postgresql") return "postgres";
  return v.toLowerCase();
}

function lower(s: string) {
  return (s || "").toLowerCase();
}
function uniq<T>(arr: T[]) {
  return Array.from(new Set(arr));
}
function escapeReg(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function summarize(s: string, max = 900) {
  const t = (s || "").trim().replace(/\s+/g, " ");
  return t.length > max ? t.slice(0, max) + "…" : t;
}

function dedupe(arr: string[]) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const q of arr) {
    const key = q.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      out.push(q);
    }
  }
  return out;
}

/* -------------------- Plan builder -------------------- */

function buildTailoredQuestions(a: Analysis): string[] {
  const qs: string[] = [];

  // 1) Domain-specific opener (if present)
  if (a.domainHints.length) {
    qs.push(
      `Domain: Share a project in ${a.domainHints[0]} where you impacted reliability or performance—what changed and how did you measure it?`
    );
  }

  // 2) Core stacks from JD (prioritize those also in CV)
  for (const s of take(priorityIntersect(a.jd.stacks, a.cv.stacks), 2)) {
    qs.push(
      `Backend: Deep dive into your most impactful ${fmt(
        s
      )} service—architecture, data model, performance profile, and failure modes.`
    );
  }

  // 3) DevOps/Kubernetes if JD mentions it
  if (a.jd.devops.includes("kubernetes")) {
    qs.push(
      "DevOps: Walk me through your Kubernetes deployment strategy—Helm/Kustomize, rollouts, HPA signals, and rollback story."
    );
  }
  if (
    a.jd.devops.some((d) =>
      [
        "terraform",
        "helm",
        "github actions",
        "argo",
        "jenkins",
        "gitlab ci",
      ].includes(d)
    )
  ) {
    qs.push(
      "CI/CD: Describe your pipeline (stages, test gates, canary/blue-green) and a time it prevented a bad deploy."
    );
  }

  // 4) Data layer from JD
  if (
    a.jd.data.some((d) =>
      ["postgres", "mysql", "redis", "kafka", "rabbitmq"].includes(d)
    )
  ) {
    qs.push(
      "Data: What were your top 2 database/caching bottlenecks and exactly how you fixed them (indices, query plans, cache policy)?"
    );
  }

  // 5) Scaling & reliability
  if (a.jd.scaling || a.jd.patterns.includes("microservices")) {
    qs.push(
      "Scaling: Tell me about an incident at peak traffic—what failed, what you changed, and the new p95/p99 / saturation metrics."
    );
  }

  // 6) Leadership expectations by seniority
  if (a.jd.leadership || a.seniority !== "junior") {
    qs.push(
      "Leadership: Example of mentoring/tech-leading—goal, conflicts handled, and how you measured team improvement."
    );
  }

  // 7) Security if JD hints it
  if (a.jd.security) {
    qs.push(
      "Security: How do you manage secrets, SBOM, and dependency risk in your pipelines? Give one concrete example."
    );
  }

  // 8) Gaps (ask probing questions for JD items missing in CV)
  for (const g of take(a.gaps, 3)) {
    qs.push(
      `Gap probe: The JD emphasizes ${fmt(
        g
      )}—can you share any relevant experience or how you’d approach it here?`
    );
  }

  // 9) Calibration prompt for SPARC richness
  qs.push(
    "Calibration: For your last major win—team size, your scope, exact metrics (before/after), and the rollback plan."
  );

  // Keep it tidy and unique
  return dedupe(qs).slice(0, 7);
}

function take<T>(arr: T[], n: number) {
  return arr.slice(0, Math.max(0, n));
}
function fmt(s: string) {
  return s.toUpperCase() === s ? s : s;
}

function priorityIntersect(jdList: string[], cvList: string[]) {
  const setCV = new Set(cvList);
  const both = jdList.filter((x) => setCV.has(x));
  // lightweight priority: keep a sensible order – stacks first (node/typescript/go)
  const order = ["node", "typescript", "go", "java", "python", "rust"];
  both.sort((a, b) => order.indexOf(a) + 999 - (order.indexOf(b) + 999));
  return both;
}

/* -------------------- Optional LLM refinement -------------------- */

async function refineWithLlm(input: {
  jobTitle: string;
  jdSummary: string;
  resumeSummary: string;
  suggestions: string[];
}): Promise<string[]> {
  const provider = (process.env.LLM_PROVIDER || "groq").toLowerCase();
  const key =
    provider === "openrouter"
      ? process.env.OPENROUTER_API_KEY
      : process.env.GROQ_API_KEY;
  const baseUrl =
    provider === "openrouter"
      ? "https://openrouter.ai/api/v1"
      : "https://api.groq.com/openai/v1";
  const model =
    provider === "openrouter"
      ? process.env.OPENROUTER_MODEL || "meta-llama/llama-3.1-70b-instruct"
      : process.env.GROQ_MODEL || "llama-3.1-70b-versatile";

  const system = `You are a recruiting assistant. Improve a short list of screening questions.
Rules:
- Keep 5–7 questions max, one sentence each.
- Cover backend depth, DevOps/Kubernetes, scaling, leadership, and any JD–CV gaps.
- No multi-part run-ons; keep each question crisp and concrete.`;

  const user = `Role: ${input.jobTitle}
JD: ${input.jdSummary}
Resume summary: ${input.resumeSummary}

Seed questions:
- ${input.suggestions.join("\n- ")}

Return JSON array of strings.`;

  const r = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key!}`,
      ...(provider === "openrouter"
        ? { "HTTP-Referer": "http://localhost", "X-Title": "AI Screening Demo" }
        : {}),
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });

  const j = await r.json();
  const txt = j.choices?.[0]?.message?.content || "[]";
  try {
    const parsed = JSON.parse(txt);
    if (Array.isArray(parsed)) return parsed as string[];
    if (Array.isArray(parsed.questions)) return parsed.questions as string[];
  } catch {}
  // If malformed, just return the seed suggestions
  return input.suggestions;
}

export async function extractSignalsFromTranscript(transcript: string) {
  if (!llmAvailable()) {
    const canned = await import("./ai_stub_extraction");
    const base = canned.stubExtract(transcript);
    // naive local heuristic for suspicion
    const suspicious =
      /as an ai|chatgpt|large language model|as a language model/i.test(
        transcript
      ) ||
      /In conclusion,/.test(transcript) ||
      (transcript.match(/\b(p95|p99|kubernetes|helm|terraform)\b/gi)?.length ??
        0) > 18; // buzzword stuffing
    if (suspicious) {
      base.riskFlags = Array.from(
        new Set([...(base.riskFlags ?? []), "Possible AI-assisted responses"])
      );
    }
    (base as any).ai_assistance = {
      suspected: suspicious,
      confidence: suspicious ? 0.7 : 0.2,
      signals: suspicious ? ["stub-heuristic"] : [],
    };
    return base;
  }

  const system = `You are an expert recruiting analyst. From the transcript, extract baseline answers, SPARC items, and whether the candidate likely used AI assistance.

                  Return STRICT JSON with:
                  {
                  "salaryExpectation": string,
                  "noticePeriod": string,
                  "reasonForLeaving": string,
                  "motivation": string,
                  "careerExpectations": string,
                  "sparc": [{
                    "anchorSnippet": string,
                    "situation": string,
                    "problem": string,
                    "action": string,
                    "result": string,
                    "calibration": string,
                    "score": number
                  }],
                  "riskFlags": string[],
                  "ai_assistance": {
                    "suspected": boolean,
                    "confidence": number,    // 0..1
                    "signals": string[]      // short phrases like "JD echo", "template tone", "no concrete metrics"
                  }
                  }

                  AI-assistance guidelines:
                  - Consider: template-like/overly polished phrasing, JD echoing, buzzword stuffing, verbatim restatement, markdown artifacts, inconsistent personal details, refusal to provide concrete numbers after prompts.
                  - If evidence is weak, set suspected=false and confidence<=0.3.
                  - If moderate/strong, set suspected=true; add "Possible AI-assisted responses" to riskFlags (do not accuse, be neutral).`;

  const user = `Transcript:\n"""${transcript}"""`;

  const res = await fetchJSON(system, user);
  // Enforce the risk flag if suspected but flag missing
  if (res?.ai_assistance?.suspected) {
    const flags = new Set([
      ...(res.riskFlags ?? []),
      "Possible AI-assisted responses",
    ]);
    res.riskFlags = Array.from(flags);
  }
  return res;
}

async function fetchJSON(system: string, user: string) {
  // Use the same provider config as stream (openai-compatible)
  const provider = (process.env.LLM_PROVIDER || "groq").toLowerCase();
  const key =
    provider === "openrouter"
      ? process.env.OPENROUTER_API_KEY
      : process.env.GROQ_API_KEY;
  const baseUrl =
    provider === "openrouter"
      ? "https://openrouter.ai/api/v1"
      : "https://api.groq.com/openai/v1";
  const model =
    provider === "openrouter"
      ? process.env.OPENROUTER_MODEL || "meta-llama/llama-3.1-70b-instruct"
      : process.env.GROQ_MODEL || "llama-3.1-70b-versatile";

  const r = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });

  const j = await r.json();
  const txt = j.choices?.[0]?.message?.content ?? "{}";
  // final safety: shallow repair if someone returns trailing commas
  try {
    return JSON.parse(txt);
  } catch {
    const repaired = txt.replace(/,\s*}/g, "}").replace(/,\s*]/g, "]");
    return JSON.parse(repaired);
  }
}
