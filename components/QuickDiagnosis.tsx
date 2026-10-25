"use client";

import { useMemo, useState } from "react";
import { QuickResultPanel } from "@/components/QuickResultPanel";
import { QUICK_FIELDS, type QuickFieldKey } from "@/components/quickFields";
import { DEFAULT_QUICK_INPUT, runQuickDiagnosis, type QuickInput } from "@/lib/simulation";

export function QuickDiagnosis() {
  const [input, setInput] = useState<QuickInput>(DEFAULT_QUICK_INPUT);
  const result = useMemo(() => runQuickDiagnosis(input), [input]);

  const update = (key: QuickFieldKey, raw: string) => {
    const n = Number(raw);
    if (Number.isFinite(n)) setInput((prev) => ({ ...prev, [key]: n }));
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <form className="rounded-3xl border border-line bg-white p-6 shadow-sm md:p-8" onSubmit={(e) => e.preventDefault()}>
        <p className="mb-6 text-sm font-bold text-pine">5つの質問・約1分</p>
        <div className="space-y-6">
          {QUICK_FIELDS.map((f, i) => (
            <div key={f.key}>
              <label htmlFor={f.key} className="flex items-baseline gap-2 font-bold">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-pine-soft text-sm text-pine">
                  {i + 1}
                </span>
                {f.label}
              </label>
              {f.hint && <p className="ml-9 text-sm text-muted">{f.hint}</p>}
              <div className="mt-2 ml-9 flex items-center gap-3">
                <input
                  id={f.key}
                  type="number"
                  inputMode="numeric"
                  min={f.min}
                  max={f.max}
                  step={f.step}
                  value={input[f.key]}
                  onChange={(e) => update(f.key, e.target.value)}
                  className="w-full rounded-xl border border-line bg-cream px-4 py-3 text-right text-xl font-bold tabular-nums focus:border-pine focus:ring-2 focus:ring-pine/30 focus:outline-none"
                />
                <span className="w-10 shrink-0 text-muted">{f.unit}</span>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-6 text-xs leading-relaxed text-muted">
          想定寿命90歳・物価上昇率1.5%・運用利回り2%で計算しています（詳細診断で変更できます）。
        </p>
      </form>

      <QuickResultPanel input={input} result={result} action={{ href: "/inheritance", label: "相続税の目安も見てみる" }} />
    </div>
  );
}
