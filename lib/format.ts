/** 万円単位の金額を「1億2,345万円」のように表示する。 */
export function formatMan(v: number): string {
  const n = Math.round(v);
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  if (abs < 10000) return `${sign}${abs.toLocaleString()}万円`;
  const oku = Math.floor(abs / 10000);
  const rest = abs % 10000;
  return `${sign}${oku.toLocaleString()}億${rest ? `${rest.toLocaleString()}万` : ""}円`;
}

/** グラフの目盛り用。1億以上は「10億」のように短く表示する（単位は軸に「万円」と表示済み）。 */
export function formatAxisMan(v: number): string {
  return Math.abs(v) >= 10000 ? `${(v / 10000).toLocaleString()}億` : v.toLocaleString();
}
