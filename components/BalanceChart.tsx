"use client";

import { useEffect, useRef, useState } from "react";
import { formatAxisMan } from "@/lib/format";
import type { YearPoint } from "@/lib/simulation";

type Props = {
  path: YearPoint[];
  plannedPath: YearPoint[];
  safetyMargin: number;
};

const FONT_SIZE = 13;

/**
 * 資産残高の推移（追加支出なし／使い切りプラン）を描く簡易チャート。
 * 表示幅に合わせて実寸で描くので、スマホでも目盛りの文字が小さくならない。
 */
export function BalanceChart({ path, plannedPath, safetyMargin }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(640);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const narrow = width < 480;
  const W = Math.max(width, 200);
  const H = narrow ? 220 : 260;
  const PAD = { top: 24, right: 12, bottom: 30, left: narrow ? 46 : 56 };

  const all = [...path, ...plannedPath].map((p) => p.balance);
  const maxY = Math.max(...all, safetyMargin) * 1.1;
  const minY = Math.min(0, ...all);
  const minAge = path[0].age;
  const maxAge = path[path.length - 1].age;

  const x = (age: number) => PAD.left + ((age - minAge) / (maxAge - minAge)) * (W - PAD.left - PAD.right);
  const y = (v: number) => PAD.top + ((maxY - v) / (maxY - minY)) * (H - PAD.top - PAD.bottom);
  const line = (pts: YearPoint[]) => pts.map((p, i) => `${i ? "L" : "M"}${x(p.age)},${y(p.balance)}`).join(" ");
  const area = (pts: YearPoint[]) => `${line(pts)} L${x(maxAge)},${y(0)} L${x(minAge)},${y(0)} Z`;

  const ticks = niceTicks(minY, maxY, narrow ? 3 : 5);
  // 狭い画面では10歳刻みにして、ラベル同士が重ならないようにする
  const ageStep = narrow ? 10 : 5;
  const ageTicks = path.filter((p) => p.age % ageStep === 0).map((p) => p.age);

  return (
    <div ref={ref} className="w-full">
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="block max-w-full" role="img" aria-label="年齢ごとの資産残高の推移">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} stroke="var(--color-line)" strokeWidth={1} />
            <text x={PAD.left - 6} y={y(t) + 4} textAnchor="end" fontSize={FONT_SIZE} fill="var(--color-muted)">
              {formatAxisMan(t)}
            </text>
          </g>
        ))}
        {ageTicks.map((a) => (
          <text key={a} x={x(a)} y={H - 8} textAnchor="middle" fontSize={FONT_SIZE} fill="var(--color-muted)">
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
        <text x={PAD.left - 6} y={12} textAnchor="end" fontSize={FONT_SIZE - 1} fill="var(--color-muted)">
          万円
        </text>
      </svg>
    </div>
  );
}

function niceTicks(min: number, max: number, maxCount: number): number[] {
  const range = max - min || 1;
  const magnitude = Math.pow(10, Math.floor(Math.log10(range)));
  const step = [1, 2, 5, 10].map((m) => m * magnitude).find((s) => range / s <= maxCount) ?? magnitude * 10;
  const ticks: number[] = [];
  for (let t = Math.ceil(min / step) * step; t <= max; t += step) ticks.push(t);
  return ticks;
}
