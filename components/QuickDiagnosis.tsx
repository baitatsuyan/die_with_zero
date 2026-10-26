"use client";

import { useMemo, useState } from "react";
import { NumberInput } from "@/components/NumberInput";
import { QuickResultPanel } from "@/components/QuickResultPanel";
import { visibleQuickFields, type QuickFieldKey } from "@/components/quickFields";
import { DEFAULT_QUICK_INPUT, runQuickDiagnosis, type QuickInput } from "@/lib/simulation";

export function QuickDiagnosis() {
  const [input, setInput] = useState<QuickInput>(DEFAULT_QUICK_INPUT);
  const result = useMemo(() => runQuickDiagnosis(input), [input]);

  const update = (key: QuickFieldKey, value: number) => setInput((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <form className="rounded-3xl border border-line bg-white p-6 shadow-sm md:p-8" onSubmit={(e) => e.preventDefault()}>
        <p className="mb-6 text-sm font-bold text-pine">かんたんな質問・約1分</p>
        <div className="space-y-6">
          {visibleQuickFields(input).map((f, i) => (
            <div key={f.key}>
              <label htmlFor={f.key} className="flex items-baseline gap-2 font-bold">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-pine-soft text-sm text-pine">
                  {i + 1}
                </span>
                {f.label}
              </label>
              {f.hint && <p className="ml-9 text-sm text-muted">{f.hint}</p>}
              <div className="mt-2 ml-9 flex items-center gap-3">
                <NumberInput
                  id={f.key}
                  value={input[f.key]}
                  onChange={(v) => update(f.key, Math.min(f.max, v))}
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
