// lib/fit.ts
type SparcLike = {
  score: number;
  anchorSnippet?: string;
  action?: string;
  result?: string;
};

export async function computeWeightedFit({
  sparcItems,
  weights = { backend: 0.4, leadership: 0.3, scaling: 0.3 },
}: {
  sparcItems: SparcLike[];
  weights?: { backend: number; leadership: number; scaling: number };
}) {
  // 1) Normalize weights (handles 4/3/3 or any arbitrary numbers)
  const sumW = Math.max(
    1e-9,
    weights.backend + weights.leadership + weights.scaling
  );
  const W = {
    backend: weights.backend / sumW,
    leadership: weights.leadership / sumW,
    scaling: weights.scaling / sumW,
  };

  // 2) Ensure scores are 0..1 (if someone passed 78 instead of 0.78)
  const normalizeScore = (x: number) => {
    if (x == null || Number.isNaN(x)) return 0.0;
    if (x > 1.0) return Math.min(1.0, x / 100); // treat 0..100 as percent
    if (x < 0.0) return 0.0;
    return x;
  };

  // 3) Thematic grouping (very simple keyword buckets)
  const match = (re: RegExp, s?: string) => !!(s && re.test(s));
  const bucket = (re: RegExp) =>
    sparcItems
      .map((s) => ({
        ...s,
        _n: normalizeScore(s.score),
        _hit: re.test(
          [s.anchorSnippet, s.action, s.result]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
        ),
      }))
      .filter((s) => s._hit)
      .map((s) => s._n);

  const avg = (arr: number[], fallback = 0.6) =>
    arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : fallback;

  const backendArr = bucket(
    /latency|cache|postgres|redis|api|throughput|perf|query|index/
  );
  const leadershipArr = bucket(
    /lead|mentor|ownership|coordinate|drive|guided|coached/
  );
  const scalingArr = bucket(
    /scale|kubernetes|k8s|replica|autoscal|traffic|peak|hpa/
  );

  const backend = avg(backendArr);
  const leadership = avg(leadershipArr);
  const scaling = avg(scalingArr);

  // 4) Weighted score (0..1), then to 0..100 and clamp
  const score01 =
    backend * W.backend + leadership * W.leadership + scaling * W.scaling;

  const score100 = Math.round(Math.min(100, Math.max(0, score01 * 100)));
  return score100;
}
