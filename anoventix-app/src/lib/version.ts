// Comparaison de versions « x.y.z » (RG-12-21). Les parties manquantes valent 0 ; un suffixe (-beta…) est ignoré.

const parties = (v: string): number[] =>
  v.trim().split('-')[0].split('.').map((p) => {
    const n = Number.parseInt(p, 10);
    return Number.isNaN(n) ? 0 : n;
  });

/** Négatif si a < b, 0 si égales, positif si a > b. */
export function comparerVersions(a: string, b: string): number {
  const pa = parties(a);
  const pb = parties(b);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d !== 0) return d;
  }
  return 0;
}
