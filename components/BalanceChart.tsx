import type { YearPoint } from "@/lib/simulation";

type Props = {
  path: YearPoint[];
  plannedPath: YearPoint[];
  safetyMargin: number;
};

const W = 640;
const H = 260;
const PAD = { top: 16, right: 16, bottom: 32, left: 56 };

/** 資産残高の推移（追加支出なし／使い切りプラン）を描く簡易チャート。 */
export function BalanceChart({ path, plannedPath, safetyMargin }: Props) {
  const all = [...path, ...plannedPath].map((p) => p.balance);
  const maxY = Math.max(...all, safetyMargin) * 1.1;
  const minY = Math.min(0, ...all);
  const minAge = path[0].age;
  const maxAge = path[path.length - 1].age;

  const x = (age: number) => PAD.left + ((age - minAge) / (maxAge - minAge)) * (W - PAD.left - PAD.right);
  const y = (v: number) => PAD.top + ((maxY - v) / (maxY - minY)) * (H - PAD.top - PAD.bottom);
  const line = (pts: YearPoint[]) => pts.map((p, i) => `${i ? "L" : "M"}${x(p.age)},${y(p.balance)}`).join(" ");
  const area = (pts: YearPoint[]) => `${line(pts)} L${x(maxAge)},${y(0)} L${x(minAge)},${y(0)} Z`;

  const ticks = niceTicks(minY, maxY);
  const ageTicks = path.filter((p) => p.age % 5 === 0).map((p) => p.age);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="年齢ごとの資産残高の推移">
      {ticks.map((t) => (
        <g key={t}>
          <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} stroke="var(--color-line)" strokeWidth={1} />
          <text x={PAD.left - 8} y={y(t) + 4} textAnchor="end" fontSize={12} fill="var(--color-muted)">
            {t.toLocaleString()}
          </text>
        </g>
      ))}
      {ageTicks.map((a) => (
        <text key={a} x={x(a)} y={H - 10} textAnchor="middle" fontSize={12} fill="var(--color-muted)">
          {a}歳
        </text>
      ))}
      <line
        x1={PAD.left}
        x2={W - PAD.right}
        y1={y(safetyMargin)}
        y2={y(safetyMargin)}
        stroke="var(--color-sun)"
        strokeDasharray="5 5"
        strokeWidth={1.5}
      />
      <path d={area(plannedPath)} fill="var(--color-pine)" opacity={0.12} />
      <path d={line(path)} fill="none" stroke="var(--color-muted)" strokeWidth={2} strokeDasharray="2 4" strokeLinecap="round" />
      <path d={line(plannedPath)} fill="none" stroke="var(--color-pine)" strokeWidth={3} strokeLinejoin="round" />
      <text x={PAD.left} y={PAD.top - 2} fontSize={11} fill="var(--color-muted)">
        万円
      </text>
    </svg>
  );
}

function niceTicks(min: number, max: number): number[] {
  const step = Math.pow(10, Math.floor(Math.log10(max - min || 1)));
  const s = (max - min) / step > 5 ? step * 2 : step;
  const ticks: number[] = [];
  for (let t = Math.ceil(min / s) * s; t <= max; t += s) ticks.push(t);
  return ticks;
}
