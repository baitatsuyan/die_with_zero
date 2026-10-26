"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { QuickResultPanel } from "@/components/QuickResultPanel";
import { QUICK_FIELDS, visibleQuickFields } from "@/components/quickFields";
import { DEFAULT_QUICK_INPUT, runQuickDiagnosis, type QuickInput } from "@/lib/simulation";
import { sanitizeDigits } from "@/lib/numberText";
import { loadJSON, saveJSON, STORAGE_KEYS } from "@/lib/storage";

/** かんたん診断を1問ずつ答える形式。最後に結果を表示する。 */
export function QuickWizard() {
  const [step, setStep] = useState(0);
  const [input, setInput] = useState<QuickInput>(DEFAULT_QUICK_INPUT);
  const [draft, setDraft] = useState(String(DEFAULT_QUICK_INPUT[QUICK_FIELDS[0].key]));
  const result = useMemo(() => runQuickDiagnosis(input), [input]);

  // 前回の回答があれば、初期値として使う
  useEffect(() => {
    const saved = loadJSON<Partial<QuickInput>>(STORAGE_KEYS.quickInput);
    if (!saved) return;
    const merged = { ...DEFAULT_QUICK_INPUT, ...saved };
    setInput(merged);
    setDraft(String(merged[QUICK_FIELDS[0].key]));
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [step]);

  const fields = visibleQuickFields(input);
  const isResult = step >= fields.length;
  const field = fields[Math.min(step, fields.length - 1)];
  const value = Number(draft);
  const valid = draft.trim() !== "" && Number.isFinite(value) && value >= field.min && value <= field.max;

  const goTo = (next: number, current: QuickInput = input) => {
    const currentFields = visibleQuickFields(current);
    setStep(next);
    if (next < currentFields.length) setDraft(String(current[currentFields[next].key]));
  };

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!valid) return;
    const next = { ...input, [field.key]: value };
    setInput(next);
    if (step + 1 >= visibleQuickFields(next).length) saveJSON(STORAGE_KEYS.quickInput, next);
    goTo(step + 1, next);
  };

  if (isResult) {
    return (
      <div className="space-y-8">
        <div>
          <p className="text-sm font-bold tracking-widest text-pine">診断結果</p>
          <h1 className="mt-2 text-3xl leading-snug font-bold md:text-4xl">あなたの「使い切り」の目安</h1>
        </div>

        <QuickResultPanel input={input} result={result} action={{ href: "/inheritance", label: "相続税の目安も見てみる" }} />

        <div className="rounded-3xl border border-line bg-white p-6 md:p-8">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="text-lg font-bold">あなたの回答</h2>
            <button type="button" onClick={() => goTo(0)} className="text-sm font-bold text-pine hover:underline">
              最初から答え直す
            </button>
          </div>
          <dl className="mt-4 divide-y divide-line/70">
            {fields.map((f, i) => (
              <div key={f.key} className="flex items-center justify-between gap-4 py-3">
                <dt className="text-muted">{f.label}</dt>
                <dd className="flex shrink-0 items-center gap-4 whitespace-nowrap">
                  <span className="font-bold tabular-nums">
                    {input[f.key].toLocaleString()}
                    {f.unit}
                  </span>
                  <button type="button" onClick={() => goTo(i)} className="text-sm font-bold text-pine hover:underline">
                    変更
                  </button>
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Link href="/inheritance" className="group rounded-3xl bg-pine-soft p-6 transition hover:shadow-md">
            <p className="text-sm font-bold text-pine">つぎの一歩</p>
            <p className="mt-1 text-xl font-bold">相続税がかかるか確かめる</p>
            <p className="mt-2 text-muted">家族構成と不動産を入れて、相続税の目安を見てみましょう。</p>
            <p className="mt-3 font-bold text-pine group-hover:underline">相続税の目安へ →</p>
          </Link>
          <div className="rounded-3xl border border-dashed border-line bg-white p-6">
            <p className="text-sm font-bold text-muted">準備中</p>
            <p className="mt-1 text-xl font-bold">詳細診断で計画をつくる</p>
            <p className="mt-2 text-muted">実家の時価推定、やりたいことリスト、売却・賃貸のタイミングまで含めた計画づくりは、現在準備中です。</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="mx-auto max-w-2xl">
      <div className="flex items-center justify-between text-sm font-bold text-muted">
        <span>
          質問 {step + 1} / {fields.length}
        </span>
        <span>約1分</span>
      </div>
      <div
        className="mt-2 h-2 overflow-hidden rounded-full bg-sand"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={fields.length}
        aria-valuenow={step}
      >
        <div className="h-full rounded-full bg-pine transition-all" style={{ width: `${(step / fields.length) * 100}%` }} />
      </div>

      <div className="mt-10 rounded-3xl border border-line bg-white p-6 shadow-sm md:p-10">
        <label htmlFor="answer" className="block text-2xl leading-snug font-bold md:text-3xl">
          {field.question}
        </label>
        {field.hint && <p className="mt-2 text-muted">{field.hint}</p>}
        {field.helpLink && (
          <Link href={field.helpLink.href} className="mt-2 inline-block font-bold text-pine hover:underline">
            {field.helpLink.label} →
          </Link>
        )}

        <div className="mt-8 flex items-center gap-3">
          <input
            id="answer"
            key={field.key}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            autoFocus
            value={draft}
            onChange={(e) => setDraft(sanitizeDigits(e.target.value))}
            aria-invalid={!valid}
            aria-describedby="answer-range"
            className="w-full rounded-2xl border border-line bg-cream px-5 py-4 text-right text-4xl font-bold tabular-nums focus:border-pine focus:ring-2 focus:ring-pine/30 focus:outline-none"
          />
          <span className="w-14 shrink-0 text-xl text-muted">{field.unit}</span>
        </div>
        <p id="answer-range" className={`mt-2 text-sm ${valid ? "text-muted" : "font-bold text-alert"}`}>
          {field.min.toLocaleString()}〜{field.max.toLocaleString()}
          {field.unit}の範囲で入力してください
        </p>

        <div className="mt-6 flex flex-wrap gap-2">
          {field.presets.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setDraft(String(p))}
              className={`rounded-full border px-4 py-2 font-bold tabular-nums transition ${
                value === p && valid ? "border-pine bg-pine text-white" : "border-line bg-white text-ink hover:border-pine"
              }`}
            >
              {p.toLocaleString()}
              {field.unit}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-8 flex gap-3">
        {step > 0 && (
          <button
            type="button"
            onClick={() => goTo(step - 1)}
            className="rounded-full border-2 border-line px-6 py-4 font-bold text-muted transition hover:border-pine hover:text-pine"
          >
            戻る
          </button>
        )}
        <button
          type="submit"
          disabled={!valid}
          className="flex-1 rounded-full bg-sun px-6 py-4 text-lg font-bold text-ink shadow-md transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {step + 1 >= visibleQuickFields({ ...input, [field.key]: valid ? value : input[field.key] }).length ? "結果を見る" : "次へ"}
        </button>
      </div>
      <p className="mt-6 text-center text-xs text-muted">
        回答はこの端末のブラウザにだけ保存されます。想定寿命90歳・物価上昇率1.5%・運用利回り2%で計算します。
      </p>
    </form>
  );
}
