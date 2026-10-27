"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { DEMO_OFFICES, login, OFFICE_TYPE_LABELS } from "@/lib/office/store";

export default function OfficeLoginPage() {
  const router = useRouter();
  return (
    <main className="mx-auto max-w-3xl px-4 py-14 md:px-6 md:py-20">
      <p className="text-sm font-bold tracking-widest text-pine">事務所向け（デモ）</p>
      <h1 className="mt-3 text-3xl leading-snug font-bold md:text-4xl">面談で、お客さまと一緒に人生後半の計画をつくる</h1>
      <p className="mt-4 text-muted">
        税理士・司法書士・不動産会社のための面談ツールです。デモでは、下の架空の事務所から1つ選んで試せます。本番ではメールアドレスでログインします。
      </p>
      <div className="mt-10 grid gap-4">
        {DEMO_OFFICES.map((o) => (
          <button
            key={o.id}
            type="button"
            onClick={() => {
              login(o.id);
              router.push("/office/clients");
            }}
            className="flex items-center justify-between gap-4 rounded-2xl border border-line bg-white p-5 text-left transition hover:border-pine hover:shadow-md"
          >
            <span>
              <span className="block text-lg font-bold">{o.name}</span>
              <span className="mt-1 block text-sm text-muted">
                {OFFICE_TYPE_LABELS[o.type]}・{o.area.prefecture}
                {o.area.city}・{o.specialties.join("、")}
              </span>
            </span>
            <span className="shrink-0 font-bold text-pine">この事務所で試す →</span>
          </button>
        ))}
      </div>
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
