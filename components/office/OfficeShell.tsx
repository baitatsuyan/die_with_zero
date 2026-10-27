"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { logout, OFFICE_TYPE_LABELS, useOfficeStore } from "@/lib/office/store";

/** 事務所向け画面の枠。ログインしていなければログイン画面へ戻す。 */
export function OfficeShell({ children }: { children: ReactNode }) {
  const { office, ready } = useOfficeStore();
  const router = useRouter();
  const pathname = usePathname();
  const isLogin = pathname === "/office";
  // 面談モードはお客さまと一緒に見る全画面表示なので、事務所向けの帯やヘッダーを出さない
  const bare = pathname.endsWith("/meeting");

  useEffect(() => {
    if (ready && !office && !isLogin) router.replace("/office");
  }, [ready, office, isLogin, router]);

  if (!ready) return <div className="min-h-screen bg-cream" />;
  if (!office && !isLogin) return null;

  if (bare) return <>{children}</>;

  return (
    <div className="min-h-screen bg-cream">
      <div className="bg-ink px-4 py-1.5 text-center text-xs text-white/80 print:hidden">
        デモ版：データはこのブラウザにだけ保存されます。実在の顧客情報は入れないでください。
      </div>
      {office && (
        <header className="border-b border-line bg-white print:hidden">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-6">
            <div className="flex items-center gap-3">
              <Link href="/office/clients" className="flex items-center gap-2 font-bold">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-pine text-sm text-white">0</span>
                <span className="hidden sm:inline">使い切りプランナー</span>
              </Link>
              <span className="rounded-full bg-pine-soft px-3 py-1 text-xs font-bold text-pine">事務所向け</span>
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
                onClick={() => {
                  logout();
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
