"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { fieldClass } from "@/components/office/Field";
import { PREFECTURES } from "@/lib/prefectures";
import {
  DEMO_OFFICES,
  logout,
  OFFICE_TYPE_LABELS,
  registerOffice,
  reloadCloud,
  sendLoginLink,
  startDemo,
  useOfficeStore,
  type OfficeType,
} from "@/lib/office/store";

export default function OfficeLoginPage() {
  const router = useRouter();
  const { mode, cloud, office } = useOfficeStore();

  // 本番でログイン済み・承認済みなら顧客一覧へ
  useEffect(() => {
    if (mode === "cloud" && cloud.phase === "ready") router.replace("/office/clients");
  }, [mode, cloud.phase, router]);

  return (
    <main className="mx-auto max-w-3xl px-4 py-14 md:px-6 md:py-20">
      <p className="text-sm font-bold tracking-widest text-pine">税理士・司法書士・不動産会社の方へ</p>
      <h1 className="mt-3 text-3xl leading-snug font-bold md:text-4xl">面談で、お客さまと一緒に人生後半の計画をつくる</h1>

      <div className="mt-10">
        {cloud.phase === "loading" && <p className="text-muted">読み込み中…</p>}
        {cloud.phase === "error" && (
          <div className="rounded-2xl bg-sun-soft p-5">
            <p className="font-bold text-alert">読み込めませんでした</p>
            <p className="mt-1 text-sm text-muted">{cloud.message}</p>
            <button type="button" onClick={() => void reloadCloud()} className="mt-3 font-bold text-pine">
              もう一度読み込む
            </button>
          </div>
        )}
        {cloud.phase === "signed_out" && <LoginForm />}
        {cloud.phase === "needs_registration" && <RegisterOfficeForm email={cloud.email} />}
        {cloud.phase === "pending" && (
          <div className="rounded-2xl border border-line bg-white p-6">
            <p className="text-lg font-bold">{cloud.office.name}</p>
            <p className="mt-2">
              {cloud.status === "pending"
                ? "ご登録ありがとうございます。運営で内容を確認しています。承認されると、この画面から使えるようになります。"
                : "この事務所は現在ご利用を停止しています。運営までお問い合わせください。"}
            </p>
            <div className="mt-4 flex gap-4 text-sm font-bold">
              <button type="button" onClick={() => void reloadCloud()} className="text-pine">
                承認されたか確かめる
              </button>
              <button type="button" onClick={() => void logout()} className="text-muted">
                ログアウト
              </button>
            </div>
          </div>
        )}
      </div>

      <section className="mt-14 border-t border-line pt-10">
        <h2 className="text-lg font-bold">まずはデモで試す</h2>
        <p className="mt-1 text-sm text-muted">架空の事務所で、すべての画面を試せます。データはこのブラウザにだけ保存されます。</p>
        <div className="mt-5 grid gap-3">
          {DEMO_OFFICES.map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => {
                startDemo(o.id);
                router.push("/office/clients");
              }}
              className={`flex items-center justify-between gap-4 rounded-2xl border bg-white p-5 text-left transition hover:border-pine hover:shadow-md ${
                mode === "demo" && office?.id === o.id ? "border-pine" : "border-line"
              }`}
            >
              <span>
                <span className="block font-bold">{o.name}</span>
                <span className="mt-1 block text-sm text-muted">
                  {OFFICE_TYPE_LABELS[o.type]}・{o.area.prefecture}
                  {o.area.city}
                </span>
              </span>
              <span className="shrink-0 text-sm font-bold text-pine">この事務所で試す →</span>
            </button>
          ))}
        </div>
      </section>

      <p className="mt-10 text-sm text-muted">
        お客さま向けの画面は{" "}
        <Link href="/" className="font-bold text-pine underline">
          こちら
        </Link>
        。
      </p>
    </main>
  );
}

function LoginForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState("");
  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  if (status === "sent") {
    return (
      <div className="rounded-2xl bg-pine p-6 text-white" role="status">
        <p className="text-lg font-bold">ログイン用のメールを送りました</p>
        <p className="mt-2 text-white/85">{email} に届いたメールのリンクを押すと、ログインできます。届かない場合は迷惑メールのフォルダもご確認ください。</p>
        <button type="button" onClick={() => setStatus("idle")} className="mt-4 text-sm font-bold text-sun-soft">
          別のメールアドレスで送る
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (!valid) return;
        setStatus("sending");
        const err = await sendLoginLink(email.trim());
        if (err) {
          setError(err);
          setStatus("error");
        } else setStatus("sent");
      }}
      className="rounded-2xl border border-line bg-white p-6"
    >
      <h2 className="text-lg font-bold">ログイン・事務所の新規登録</h2>
      <p className="mt-1 text-sm text-muted">メールアドレスに、ログイン用のリンクをお送りします。初めての方も同じ手順で登録できます。</p>
      <label htmlFor="login-email" className="mt-4 block text-sm font-bold">
        メールアドレス
      </label>
      <div className="mt-1 flex flex-col gap-3 sm:flex-row">
        <input id="login-email" type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={fieldClass} />
        <button type="submit" disabled={!valid || status === "sending"} className="shrink-0 rounded-full bg-sun px-6 py-3 font-bold text-ink disabled:opacity-50">
          {status === "sending" ? "送っています…" : "ログイン用のメールを送る"}
        </button>
      </div>
      {status === "error" && (
        <p className="mt-3 text-sm font-bold text-alert" role="alert">
          送れませんでした：{error}
        </p>
      )}
    </form>
  );
}

function RegisterOfficeForm({ email }: { email: string }) {
  const [name, setName] = useState("");
  const [type, setType] = useState<OfficeType>("tax_accountant");
  const [prefecture, setPrefecture] = useState("東京都");
  const [city, setCity] = useState("");
  const [staffName, setStaffName] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const valid = name.trim() && city.trim() && staffName.trim();

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (!valid) return;
        setSending(true);
        const err = await registerOffice({ name: name.trim(), type, prefecture, city: city.trim(), staffName: staffName.trim() });
        setSending(false);
        if (err) setError(err);
      }}
      className="space-y-4 rounded-2xl border border-line bg-white p-6"
    >
      <div>
        <h2 className="text-lg font-bold">事務所を登録する</h2>
        <p className="mt-1 text-sm text-muted">{email} でログインしています。登録後、運営の確認が済むと使えるようになります。</p>
      </div>
      <div>
        <label htmlFor="office-name" className="text-sm font-bold">
          事務所名
        </label>
        <input id="office-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} className={`mt-1 ${fieldClass}`} />
      </div>
      <div>
        <span className="text-sm font-bold">種別</span>
        <div className="mt-1 grid gap-2 sm:grid-cols-3">
          {(Object.keys(OFFICE_TYPE_LABELS) as OfficeType[]).map((t) => (
            <button
              key={t}
              type="button"
              aria-pressed={type === t}
              onClick={() => setType(t)}
              className={`rounded-xl border px-3 py-2.5 font-bold ${type === t ? "border-pine bg-pine text-white" : "border-line"}`}
            >
              {OFFICE_TYPE_LABELS[t]}
            </button>
          ))}
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="office-pref" className="text-sm font-bold">
            所在地（都道府県）
          </label>
          <select id="office-pref" value={prefecture} onChange={(e) => setPrefecture(e.target.value)} className={`mt-1 ${fieldClass}`}>
            {PREFECTURES.map((p) => (
              <option key={p.code}>{p.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="office-city" className="text-sm font-bold">
            市区町村
          </label>
          <input id="office-city" value={city} onChange={(e) => setCity(e.target.value)} maxLength={30} placeholder="中央区" className={`mt-1 ${fieldClass}`} />
        </div>
      </div>
      <div>
        <label htmlFor="staff-name" className="text-sm font-bold">
          ご担当者のお名前
        </label>
        <input id="staff-name" value={staffName} onChange={(e) => setStaffName(e.target.value)} maxLength={50} className={`mt-1 ${fieldClass}`} />
      </div>
      {error && (
        <p className="text-sm font-bold text-alert" role="alert">
          登録できませんでした：{error}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-4">
        <button type="submit" disabled={!valid || sending} className="rounded-full bg-sun px-6 py-3 font-bold text-ink disabled:opacity-50">
          {sending ? "登録しています…" : "この内容で登録する"}
        </button>
        <button type="button" onClick={() => void logout()} className="text-sm font-bold text-muted">
          ログアウト
        </button>
      </div>
    </form>
  );
}
