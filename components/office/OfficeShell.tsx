"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { logout, OFFICE_TYPE_LABELS, useOfficeStore, type SaveStatus } from "@/lib/office/store";

const SAVE_LABELS: Record<SaveStatus, string> = { idle: "", saving: "保存しています…", saved: "保存しました", error: "保存できませんでした。通信を確かめてください" };

/** 事務所向け画面の枠。ログインしていなければログイン画面へ戻す。 */
export function OfficeShell({ children }: { children: ReactNode }) {
  const { office, ready, mode, save, network } = useOfficeStore();
  const router = useRouter();
  const pathname = usePathname();
  const isLogin = pathname === "/office";
  // 面談モードはお客さまと一緒に見る全画面表示なので、事務所向けの帯やヘッダーを出さない
  const bare = pathname.endsWith("/meeting") || pathname.endsWith("/consent");
  const waiting = office ? network.referrals.filter((r) => r.toOfficeId === office.id && r.status === "sent").length : 0;

  useEffect(() => {
    if (ready && !office && !isLogin) router.replace("/office");
  }, [ready, office, isLogin, router]);

  if (!ready) return <div className="min-h-screen bg-cream" />;
  if (!office && !isLogin) return null;

  if (bare) return <>{children}</>;

  return (
    <div className="min-h-screen bg-cream">
      {mode === "demo" ? (
        <div className="bg-ink px-4 py-1.5 text-center text-xs text-white/80 print:hidden">
          デモ版：データはこのブラウザにだけ保存されます。実在の顧客情報は入れないでください。
        </div>
      ) : (
        save !== "idle" && (
          <div className={`px-4 py-1.5 text-center text-xs print:hidden ${save === "error" ? "bg-alert text-white" : "bg-pine-soft text-pine"}`} role="status">
            {SAVE_LABELS[save]}
          </div>
        )
      )}
      {office && (
        <header className="border-b border-line bg-white print:hidden">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-6">
            <div className="flex items-center gap-3">
              <Link href="/office/clients" className="flex items-center gap-2 font-bold">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-pine text-sm text-white">0</span>
                <span className="hidden sm:inline">使い切りプランナー</span>
              </Link>
              <span className="rounded-full bg-pine-soft px-3 py-1 text-xs font-bold text-pine">事務所向け</span>
              <nav className="ml-2 flex items-center gap-1 text-sm font-bold">
                {[
                  { href: "/office/clients", label: "顧客" },
                  { href: "/office/referrals", label: "紹介" },
                ].map((n) => (
                  <Link
                    key={n.href}
                    href={n.href}
                    aria-current={pathname.startsWith(n.href) ? "page" : undefined}
                    className={`rounded-full px-4 py-2 ${pathname.startsWith(n.href) ? "bg-pine text-white" : "text-pine hover:bg-pine-soft"}`}
                  >
                    {n.label}
                    {n.href === "/office/referrals" && waiting > 0 && (
                      <span className="ml-1.5 rounded-full bg-sun px-2 py-0.5 text-xs text-ink" aria-label={`返事待ち${waiting}件`}>
                        {waiting}
                      </span>
                    )}
                  </Link>
                ))}
              </nav>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <span className="text-right">
                <span className="block font-bold">{office.name}</span>
                <span className="block text-xs text-muted">
                  {OFFICE_TYPE_LABELS[office.type]}・{office.area.prefecture}
                  {office.area.city}
                </span>
              </span>
              <button
                type="button"
                onClick={async () => {
                  await logout();
                  router.push("/office");
                }}
                className="rounded-full border border-line px-4 py-2 font-bold text-muted hover:border-pine hover:text-pine"
              >
                ログアウト
              </button>
            </div>
          </div>
        </header>
      )}
      {children}
    </div>
  );
}
