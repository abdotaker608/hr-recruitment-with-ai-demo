export function stubExtract(transcript: string) {
  const find = (q: RegExp) => transcript.match(q)?.[1]?.trim() || null;
  const salary = find(/salary[^:\n]*:\s*([^\n]+)/i) || "Not stated";
  const notice = find(/notice[^:\n]*:\s*([^\n]+)/i) || "2 weeks";
  const reason = find(/reason[^:\n]*:\s*([^\n]+)/i) || "Career growth";
  const motivation = find(/motivation[^:\n]*:\s*([^\n]+)/i) || "Impact + scale";
  const expectations =
    find(/expectations?[^:\n]*:\s*([^\n]+)/i) ||
    "Senior IC with leadership scope";

  const sparc = [
    {
      anchorSnippet: "Reduced p95 latency from 800ms to 200ms with Redis cache",
      situation: "Payment API latency",
      problem: "High p95 under peak",
      action: "Cache + SQL tuning + autoscaling",
      result: "p95→200ms; +3% conv",
      calibration: "Led 3 engineers on GCP K8s",
      score: 0.85,
    },
    {
      anchorSnippet: "CI/CD with GH Actions + Helm",
      situation: "Slow releases",
      problem: "Manual deploy rollbacks",
      action: "Pipelines + canary + auto-rollback",
      result: "60% faster deploys",
      calibration: "Designed & mentored",
      score: 0.78,
    },
  ];

  return {
    salaryExpectation: salary,
    noticePeriod: notice,
    reasonForLeaving: reason,
    motivation,
    careerExpectations: expectations,
    sparc,
    riskFlags: ["Limited Go experience"],
  };
}
