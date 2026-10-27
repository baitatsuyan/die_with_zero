import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-line/70 bg-cream/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 md:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2 font-bold">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-pine text-sm text-white">0</span>
          <span className="hidden sm:inline">使い切りプランナー</span>
        </Link>
        <nav className="flex items-center gap-3 sm:gap-5">
          <Link href="/properties" className="text-sm font-bold text-pine hover:underline">
            不動産<span className="hidden md:inline">の時価</span>
          </Link>
          <Link href="/inheritance" className="text-sm font-bold text-pine hover:underline">
            相続税<span className="hidden md:inline">の目安</span>
          </Link>
          <Link href="/quick" className="rounded-full bg-pine px-5 py-2 text-sm font-bold text-white transition hover:bg-pine-dark">
            無料で診断
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-white py-10 text-sm text-muted">
      <div className="mx-auto max-w-6xl space-y-3 px-4 md:px-6">
        <p className="font-bold text-ink">使い切りプランナー（仮称）</p>
        <p className="text-xs leading-relaxed">
          本サービスの試算結果はすべて概算であり、将来の運用成果や税額を保証するものではありません。相続税の目安は不動産の時価をもとにした保守的な概算で、実際の相続税評価額（路線価等）とは異なります。正確な税額は税理士にご相談ください。本サービスは金融商品の勧誘・推奨、個別の税務相談・法律相談を行うものではありません。
        </p>
        <p className="text-xs leading-relaxed">
          このサービスは、国土交通省の不動産情報ライブラリのAPI機能を使用していますが、提供情報の最新性、正確性、完全性等が保証されたものではありません。本サービスは使い切りプランナーの運営者が開発・運営しており、その内容については運営者が責任を負います。
        </p>
        <nav className="flex flex-wrap gap-x-5 gap-y-1 text-xs font-bold">
          <Link href="/quick" className="hover:underline">かんたん診断</Link>
          <Link href="/properties" className="hover:underline">不動産の時価</Link>
          <Link href="/consult" className="hover:underline">売却相談</Link>
          <Link href="/inheritance" className="hover:underline">相続税の目安</Link>
          <Link href="/office" className="hover:underline">税理士・司法書士・不動産会社の方へ（デモ）</Link>
        </nav>
        <p className="text-xs">© 2026 使い切りプランナー</p>
      </div>
    </footer>
  );
}
