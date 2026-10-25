import type { Metadata } from "next";
import Link from "next/link";
import { InheritanceSimulator } from "@/components/InheritanceSimulator";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";

export const metadata: Metadata = {
  title: "相続税の目安｜使い切りプランナー",
  description: "家族構成と財産を入れるだけで、相続税がかかるか・いくらくらいかの目安が分かります。",
};

const MEASURES = [
  {
    title: "生前贈与（暦年贈与）",
    body: "受け取る人1人あたり年110万円までは贈与税がかかりません。ただし亡くなる前の一定期間（2024年以降の贈与は段階的に最長7年）に受けた贈与は、相続財産に足し戻されます。",
  },
  {
    title: "相続時精算課税",
    body: "累計2,500万円まで贈与税をかけずに渡せる制度です。年110万円までの基礎控除分は相続時にも足し戻されません。一度選ぶと暦年贈与には戻れないため、選ぶ前に専門家に相談しましょう。",
  },
  {
    title: "死亡保険金の非課税枠",
    body: "家族が受け取る死亡保険金は「500万円×法定相続人の数」まで相続税がかかりません。この試算にも反映しています。",
  },
  {
    title: "小規模宅地等の特例",
    body: "自宅の土地を配偶者や同居の家族が相続する場合などは、330㎡までの部分の評価額が80%下がることがあります。要件が細かいため、使えるかどうかは専門家に確認しましょう。",
  },
  {
    title: "二次相続まで考える",
    body: "配偶者が多く受け取ると今回の税額は小さくなりますが、その配偶者が亡くなったときの相続（二次相続）で子の負担が増えることがあります。2回分をあわせて考えるのが大切です。",
  },
];

export default function InheritancePage() {
  return (
    <>
      <SiteHeader />
      <main>
        <section className="py-14 md:py-20">
          <div className="mx-auto max-w-6xl px-4 md:px-6">
            <div className="mb-10 max-w-2xl">
              <p className="text-sm font-bold tracking-widest text-pine">相続税の目安</p>
              <h1 className="mt-3 text-3xl leading-snug font-bold md:text-5xl md:leading-tight">
                うちは相続税、
                <br />
                かかるのかな？
              </h1>
              <p className="mt-4 text-muted">
                家族構成と財産をざっくり入れるだけで、相続税がかかるか、いくらくらいかの目安が分かります。数字を変えると、その場で結果が変わります。
              </p>
            </div>
            <InheritanceSimulator />
          </div>
        </section>

        <section className="bg-sand/60 py-16 md:py-20">
          <div className="mx-auto max-w-6xl px-4 md:px-6">
            <div className="mb-10 max-w-2xl">
              <p className="text-sm font-bold tracking-widest text-pine">知っておきたい制度</p>
              <h2 className="mt-3 text-3xl leading-snug font-bold">相続税を考えるときの、一般的な選択肢</h2>
              <p className="mt-4 text-muted">
                どれが合うかはご家族の状況によって変わります。ここでは制度の概要だけをご紹介します。
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {MEASURES.map((m) => (
                <div key={m.title} className="rounded-2xl bg-white p-6">
                  <h3 className="text-lg font-bold">{m.title}</h3>
                  <p className="mt-2 text-muted">{m.body}</p>
                </div>
              ))}
            </div>
            <div className="mt-8 rounded-2xl border border-line bg-white p-6">
              <h3 className="font-bold">不動産の「時価」と「相続税評価額」はちがいます</h3>
              <p className="mt-2 text-sm text-muted">
                相続税は、土地なら路線価、建物なら固定資産税評価額などで計算するのが一般的で、時価より低くなることが多くあります。この試算は時価で計算しているため、実際より高めに出る「保守的な目安」です。
              </p>
            </div>
          </div>
        </section>

        <section className="py-16 md:py-20">
          <div className="mx-auto max-w-4xl px-4 md:px-6">
            <div className="rounded-3xl bg-ink p-6 text-white md:p-10">
              <p className="text-sm font-bold tracking-widest text-sun">専門家に相談する</p>
              <h2 className="mt-3 text-2xl leading-snug font-bold md:text-3xl">正確な税額や対策は、税理士と一緒に</h2>
              <p className="mt-4 text-white/80">
                申告が必要か、どの特例が使えるか、贈与をどう進めるか。相続に詳しい提携税理士をご紹介します。
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  disabled
                  className="cursor-not-allowed rounded-full bg-sun px-8 py-4 font-bold text-ink opacity-80"
                >
                  税理士に相談する（準備中）
                </button>
                <Link href="/#quick" className="rounded-full border border-white/40 px-8 py-4 text-center font-bold transition hover:bg-white/10">
                  毎年あと使える額を診断する
                </Link>
              </div>
              <p className="mt-6 text-xs leading-relaxed text-white/60">
                ※ 専門家をご紹介した場合、提携先から当社に紹介料が支払われることがあります。試算の結果は紹介の有無によって変わりません。当サービスは個別の税務相談は行っていません。
              </p>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
