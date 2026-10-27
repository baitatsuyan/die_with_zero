"use client";

import { NumberInput } from "@/components/NumberInput";

export const fieldClass =
  "w-full rounded-xl border border-line bg-cream px-4 py-2.5 text-lg font-bold focus:border-pine focus:ring-2 focus:ring-pine/30 focus:outline-none";

/** ラベル・単位つきの数値入力。 */
export function NumberField({
  id,
  label,
  unit,
  value,
  onChange,
  hint,
}: {
  id: string;
  label: string;
  unit: string;
  value: number;
  onChange: (v: number) => void;
  hint?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="text-sm font-bold">
        {label}
      </label>
      {hint && <p className="text-xs text-muted">{hint}</p>}
      <div className="mt-1 flex items-center gap-2">
        <NumberInput id={id} value={value} onChange={onChange} className={`${fieldClass} text-right tabular-nums`} />
        <span className="w-10 shrink-0 text-sm text-muted">{unit}</span>
      </div>
    </div>
  );
}
