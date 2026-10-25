"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { SavedProperty } from "@/components/PropertyEstimator";
import { formatMan } from "@/lib/format";
import { PROPERTY_TYPES } from "@/lib/realEstateEstimate";
import { DEFAULT_QUICK_INPUT, runQuickDiagnosis, type QuickInput } from "@/lib/simulation";
import { loadJSON, STORAGE_KEYS } from "@/lib/storage";

// Netlify Forms のフォーム名。public/__forms.html の定義と揃える
export const CONSULT_FORM_NAME = "sale-consultation";

const TIMING_OPTIONS = ["1年以内", "1〜3年以内", "3年より先", "まだ決めていない"];
const TOPICS = ["売ったらいくらになるか知りたい", "住み替え先も相談したい", "貸すことも考えたい", "相続のことも相談したい"];

type Status = "idle" | "sending" | "sent" | "error";

const inputClass =
  "mt-2 w-full rounded-xl border border-line bg-cream px-4 py-3 text-lg focus:border-pine focus:ring-2 focus:ring-pine/30 focus:outline-none";

/** かんたん診断の売却期限から、希望時期の初期値を決める。 */
function timingFromDiagnosis(input: QuickInput | null): { timing: string; note: string } {
  if (!input) return { timing: "まだ決めていない", note: "" };
  const r = runQuickDiagnosis(input);
  if (r.saleAge === null) return { timing: "まだ決めていない", note: "" };
  const years = r.saleAge - input.currentAge;
  return {
    timing: years <= 1 ? "1年以内" : years <= 3 ? "1〜3年以内" : "3年より先",
    note: `かんたん診断の売却期限：${r.saleAge}歳（あと${years}年）`,
  };
}

export function ConsultForm() {
  const [status, setStatus] = useState<Status>("idle");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [propertyType, setPropertyType] = useState("戸建て");
  const [estimatedValue, setEstimatedValue] = useState("");
  const [timing, setTiming] = useState("まだ決めていない");
  const [diagnosisNote, setDiagnosisNote] = useState("");
  const [topics, setTopics] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [touched, setTouched] = useState(false);

  // 時価推定・かんたん診断の結果があれば、入力の手間を省くために初期値に使う
  useEffect(() => {
    const property = loadJSON<SavedProperty>(STORAGE_KEYS.property);
    if (property) {
      setLocation([property.cityName, property.district].filter(Boolean).join(" "));
      setPropertyType(PROPERTY_TYPES.find((t) => t.value === property.propertyType)?.label ?? "戸建て");
      if (property.estimate) setEstimatedValue(`${formatMan(property.estimate.mid)}（推定）`);
    }
    const saved = loadJSON<Partial<QuickInput>>(STORAGE_KEYS.quickInput);
    const { timing: t, note } = timingFromDiagnosis(saved ? { ...DEFAULT_QUICK_INPUT, ...saved } : null);
    setTiming(t);
    setDiagnosisNote(note);
  }, []);

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const valid = name.trim() !== "" && emailValid && location.trim() !== "" && agreed;

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setTouched(true);
    if (!valid) return;
    setStatus("sending");
    const body = new URLSearchParams({
      "form-name": CONSULT_FORM_NAME,
      name,
      email,
      phone,
      location,
      propertyType,
      estimatedValue,
      timing,
      diagnosis: diagnosisNote,
      topics: topics.join("、"),
      message,
      agreed: "同意する",
      "bot-field": (e.currentTarget.elements.namedItem("bot-field") as HTMLInputElement | null)?.value ?? "",
    });
    try {
      const res = await fetch("/__forms.html", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
      });
      setStatus(res.ok ? "sent" : "error");
    } catch {
      setStatus("error");
    }
  };

  if (status === "sent") {
    return (
      <div className="rounded-3xl bg-pine p-6 text-white md:p-10" role="status">
        <p className="text-2xl font-bold">ご相談を受け付けました</p>
        <p className="mt-3 text-white/85">
          内容を確認のうえ、ご入力いただいたメールアドレス（{email}）にご連絡します。数日たっても連絡がない場合は、お手数ですがもう一度お送りください。
        </p>
        <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2">
          <Link href="/quick" className="font-bold text-sun-soft hover:underline">
            かんたん診断へ →
          </Link>
          <Link href="/inheritance" className="font-bold text-sun-soft hover:underline">
            相続税の目安へ →
          </Link>
        </div>
      </div>
    );
  }

  const fieldError = (show: boolean, text: string) => touched && show && <p className="mt-1 text-sm font-bold text-alert">{text}</p>;

  return (
    <form onSubmit={submit} noValidate className="space-y-8 rounded-3xl border border-line bg-white p-6 shadow-sm md:p-10">
      {/* スパム対策（人には見えない欄） */}
      <p className="hidden">
        <label>
          入力しないでください <input name="bot-field" tabIndex={-1} autoComplete="off" />
        </label>
      </p>

      <fieldset className="space-y-5">
        <legend className="text-lg font-bold">物件について</legend>
        <div>
          <label htmlFor="location" className="font-bold">
            所在地 <span className="text-sm text-alert">必須</span>
          </label>
          <p className="text-sm text-muted">市区町村と地区名まで（番地は不要です）</p>
          <input id="location" value={location} onChange={(e) => setLocation(e.target.value)} maxLength={100} className={inputClass} />
          {fieldError(location.trim() === "", "所在地を入力してください")}
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="propertyType" className="font-bold">
              種類
            </label>
            <select id="propertyType" value={propertyType} onChange={(e) => setPropertyType(e.target.value)} className={inputClass}>
              {PROPERTY_TYPES.map((t) => (
                <option key={t.value}>{t.label}</option>
              ))}
              <option>その他・複数</option>
            </select>
          </div>
          <div>
            <label htmlFor="estimatedValue" className="font-bold">
              価格の目安（任意）
            </label>
            <input
              id="estimatedValue"
              value={estimatedValue}
              onChange={(e) => setEstimatedValue(e.target.value)}
              maxLength={50}
              placeholder="例：2,000万円くらい"
              className={inputClass}
            />
          </div>
        </div>
        <div>
          <label htmlFor="timing" className="font-bold">
            売却を考えている時期
          </label>
          {diagnosisNote && <p className="text-sm text-pine">{diagnosisNote}</p>}
          <select id="timing" value={timing} onChange={(e) => setTiming(e.target.value)} className={inputClass}>
            {TIMING_OPTIONS.map((o) => (
              <option key={o}>{o}</option>
            ))}
          </select>
        </div>
        <fieldset>
          <legend className="font-bold">相談したいこと（いくつでも）</legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {TOPICS.map((t) => (
              <label key={t} className="flex cursor-pointer items-center gap-3 rounded-xl border border-line px-4 py-3">
                <input
                  type="checkbox"
                  className="h-5 w-5 accent-pine"
                  checked={topics.includes(t)}
                  onChange={(e) => setTopics((prev) => (e.target.checked ? [...prev, t] : prev.filter((x) => x !== t)))}
                />
                {t}
              </label>
            ))}
          </div>
        </fieldset>
        <div>
          <label htmlFor="message" className="font-bold">
            そのほか伝えたいこと（任意）
          </label>
          <textarea id="message" value={message} onChange={(e) => setMessage(e.target.value)} maxLength={2000} rows={4} className={inputClass} />
        </div>
      </fieldset>

      <fieldset className="space-y-5">
        <legend className="text-lg font-bold">ご連絡先</legend>
        <div>
          <label htmlFor="name" className="font-bold">
            お名前 <span className="text-sm text-alert">必須</span>
          </label>
          <input id="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={50} autoComplete="name" className={inputClass} />
          {fieldError(name.trim() === "", "お名前を入力してください")}
        </div>
        <div>
          <label htmlFor="email" className="font-bold">
            メールアドレス <span className="text-sm text-alert">必須</span>
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            maxLength={100}
            autoComplete="email"
            inputMode="email"
            className={inputClass}
          />
          {fieldError(!emailValid, "メールアドレスを正しく入力してください")}
        </div>
        <div>
          <label htmlFor="phone" className="font-bold">
            電話番号（任意）
          </label>
          <p className="text-sm text-muted">お電話での連絡を希望される場合のみ</p>
          <input
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            maxLength={20}
            autoComplete="tel"
            inputMode="tel"
            className={inputClass}
          />
        </div>
      </fieldset>

      <div className="space-y-3 rounded-2xl bg-cream p-5 text-sm leading-relaxed text-muted">
        <p className="font-bold text-ink">ご相談の前にお読みください</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>ご入力いただいた内容は、ご相談への回答とご連絡のためだけに、使い切りプランナーの運営者が利用します。</li>
          <li>
            不動産会社などの提携先をご紹介する場合は、ご紹介の前にあらためてご了承をいただきます。ご了承なく第三者に情報を渡すことはありません。
          </li>
          <li>ご紹介によって、提携先から当サービスに紹介料が支払われることがあります。ご相談者さまの費用が増えることはありません。</li>
          <li>ご相談をもとに売却や契約をおすすめしたり、決断をせかしたりすることはありません。</li>
        </ul>
      </div>

      <div>
        <label className="flex cursor-pointer items-start gap-3">
          <input type="checkbox" className="mt-1 h-5 w-5 accent-pine" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
          <span className="font-bold">上記の内容に同意して相談する</span>
        </label>
        {fieldError(!agreed, "内容をご確認のうえ、チェックを入れてください")}
      </div>

      {status === "error" && (
        <p className="rounded-xl bg-sun-soft p-3 font-bold text-alert" role="alert">
          送信できませんでした。通信状況をご確認のうえ、もう一度お試しください。
        </p>
      )}

      <button
        type="submit"
        disabled={status === "sending"}
        className="w-full rounded-full bg-sun px-6 py-4 text-lg font-bold text-ink shadow-md transition hover:brightness-105 disabled:opacity-60"
      >
        {status === "sending" ? "送信しています…" : "この内容で相談する（無料）"}
      </button>
    </form>
  );
}
