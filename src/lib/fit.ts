export async function computeWeightedFit({
  sparcItems,
  weights = { backend: 0.4, leadership: 0.3, scaling: 0.3 },
}: {
  sparcItems: {
    score: number;
    tags?: string[];
    anchor_snippet?: string;
    action?: string;
    result?: string;
  }[];
  weights?: { backend: number; leadership: number; scaling: number };
}) {
  // map SPARC items to themes by naive keyword tags (demo-ready)
  const tag = (t: string) => (s: string) => new RegExp(t, "i").test(s);
  const by = (p: (s: string) => boolean) =>
    sparcItems
      .filter(
        (x) =>
          p(x.anchor_snippet || "") || p(x.action || "") || p(x.result || "")
      )
      .map((x) => x.score);
  const avg = (a: number[]) =>
    a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0.6;

  const backend = avg(by(tag("latency|cache|postgres|redis|api|throughput")));
  const leadership = avg(by(tag("lead|mentor|drive|coordinate|ownership")));
  const scaling = avg(
    by(tag("scale|kubernetes|replica|autoscal|traffic|peak"))
  );

  const score =
    (backend * weights.backend +
      leadership * weights.leadership +
      scaling * weights.scaling) *
    100;

  return Math.round(score);
}
