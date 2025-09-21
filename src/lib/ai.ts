import { llmAvailable } from "./llm";

export async function generatePlan(
  jobTitle: string,
  jdText: string,
  resumeText?: string
) {
  // Deterministic plan for now (so demo works w/o keys)
  return [
    "Baseline: salary expectation?",
    "Baseline: notice period?",
    "Baseline: reason for leaving?",
    "Baseline: motivation for this role?",
    "Baseline: career expectations?",
    `JD-tailored: Describe a time you scaled a Node.js service (Kubernetes).`,
    `DevOps: Walk me through a CI/CD pipeline you built (GitHub Actions/Helm).`,
    `Scaling: What bottleneck did you find and how did you reduce p95 latency?`,
    `Leadership: Example mentoring or leading delivery.`,
    `Security/Resilience: incident you handled; detection/rollback.`,
  ];
}
export async function extractSignalsFromTranscript(transcript: string) {
  if (!llmAvailable()) {
    // fallback (existing stub content)
    const canned = await import("./ai_stub_extraction");
    return canned.stubExtract(transcript);
  }

  const system = `You are an expert recruiting analyst. Extract baseline answers and SPARC items from the transcript.
                  Return strict JSON with:
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
                  "riskFlags": string[]
                  }`;

  const user = `Transcript:\n"""${transcript}"""`;

  // Call the same OpenAI-compatible endpoint we already set up
  const res = await fetchJSON(system, user);
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
