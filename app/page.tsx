import Link from "next/link";
import { QuickDiagnosis } from "@/components/QuickDiagnosis";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { calculateInheritanceTax } from "@/lib/inheritanceTax";
import { DEFAULT_QUICK_INPUT, runQuickDiagnosis, type YearPoint } from "@/lib/simulation";

const PROBLEMS = [
  { title: "いくらまで使っていいか分からない", body: "老後が不安で、つい貯め込んでしまう。気づけば使わないまま、という方は少なくありません。" },
  { title: "資産の全体像が見えていない", body: "預金・証券・保険・不動産がバラバラ。とくに実家や土地の「いまの値段」は分かりにくいものです。" },
  { title: "実家や空き家の整理が後回し", body: "売るか、貸すか、子に渡すか。決めないまま年月が過ぎ、選択肢が狭まっていきます。" },
  { title: "相続の話を家族でできない", body: "切り出すきっかけがない。そもそも相続税がかかるのかも分からない。" },
];

// 詳細診断の入力例。金融資産まわりはかんたん診断の初期値と同じ前提で計算する。
const EXAMPLE_RESULT = runQuickDiagnosis(DEFAULT_QUICK_INPUT);
const EXAMPLE_HOUSE_VALUE = 2350; // 実家の推定時価（万円）
const EXAMPLE_FINAL_BALANCE = EXAMPLE_RESULT.plannedPath[EXAMPLE_RESULT.plannedPath.length - 1].balance;
const EXAMPLE_ESTATE = EXAMPLE_FINAL_BALANCE + EXAMPLE_HOUSE_VALUE;
const EXAMPLE_TAX = calculateInheritanceTax({
  estate: EXAMPLE_ESTATE,
  liabilities: 0,
  deathBenefit: 0,
  hasSpouse: true,
  childrenCount: 2,
});
const fmt = (v: number) => Math.round(v).toLocaleString();

const OUTPUTS = [
  { label: "毎年あと使える額", value: fmt(EXAMPLE_RESULT.extraAnnualSpend), unit: "万円/年", note: "最期に残したい額を守ったうえで" },
  { label: "最期に残る見込み額", value: fmt(EXAMPLE_FINAL_BALANCE), unit: "万円", note: `${DEFAULT_QUICK_INPUT.lifeExpectancy}歳時点・使い切りプランの場合` },
  {
    label: "相続税の目安",
    value: EXAMPLE_TAX.payableTax > 0 ? fmt(EXAMPLE_TAX.payableTax) : "0",
    unit: EXAMPLE_TAX.payableTax > 0 ? "万円" : "円",
    note:
      EXAMPLE_TAX.taxableEstate > 0
        ? `遺産${fmt(EXAMPLE_ESTATE)}万円・配偶者の税額軽減後`
        : `遺産${fmt(EXAMPLE_ESTATE)}万円は基礎控除 ${fmt(EXAMPLE_TAX.basicDeduction)}万円の範囲内`,
  },
  { label: "実家の推定時価", value: fmt(EXAMPLE_HOUSE_VALUE), unit: "万円", note: "周辺の取引 38件から推定" },
];

const STEPS = [
  { n: "01", title: "3〜5分で入力", body: "年齢、預貯金、年金、生活費、そして持っている不動産。分かる範囲のざっくりで始められます。" },
  { n: "02", title: "使い切り計画をつくる", body: "やりたいことを「何歳〜何歳に、いくら」で並べると、いつ・いくら使えるかが年ごとに見えます。" },
  { n: "03", title: "整理と相続を準備する", body: "実家を何歳で売るか貸すかを計画に組み込み、相続税の目安と家族への渡し方を確認します。" },
];

const FEATURES = [
  {
    tag: "使い切る",
    title: "「残す」ではなく「使い切る」側に立つ",
    body: "金融機関は資産を預かり続けることで収益を得ます。私たちは、あなたが人生を楽しむために使える額を、中立に計算します。",
  },
  {
    tag: "不動産",
    title: "実家・保有不動産の時価を自動で推定",
    body: "国の公的な取引価格データから、所在地・面積・築年の近い事例をもとに推定。根拠となった件数とレンジも表示します。",
  },
  {
    tag: "整理",
    title: "資産整理を、計画のイベントとして扱う",
    body: "「75歳で実家を売却」「70歳から賃貸に」。整理の方針を決めると、その後の資産推移にそのまま反映されます。",
  },
];

const BUCKETS = [
  { age: "60〜64歳", items: ["夫婦で海外旅行（年1回）", "キャンピングカーで日本一周"], cost: "650万円" },
  { age: "65〜74歳", items: ["孫との家族旅行", "陶芸教室・アトリエ"], cost: "480万円" },
  { age: "75〜84歳", items: ["実家を売却し住み替え", "子へ住宅資金を贈与"], cost: "＋1,800万円" },
];

const FAQ = [
  { q: "無料で使えますか？", a: "かんたん診断と詳細診断は無料です。不動産の売却・活用や税理士への相談など、専門家をご紹介する場合に提携先から紹介料をいただく仕組みです。" },
  { q: "銀行や証券口座とつなぐ必要はありますか？", a: "いいえ。金額は手入力で、概算で始められます。口座連携は現在提供していません。" },
  { q: "税金や相続の相談にのってもらえますか？", a: "本サービスでは試算と一般的な情報の提供にとどめています。具体的なご相談は、税理士・弁護士などの専門家をご紹介します。" },
  { q: "特定の金融商品をすすめられませんか？", a: "おすすめしません。私たちは金融商品の販売・推奨を行いません。" },
  { q: "入力したデータはどこに保存されますか？", a: "現在のプロトタイプでは、お使いのブラウザの中だけに保存されます。" },
];

function SectionHeading({ eyebrow, title, lead }: { eyebrow: string; title: string; lead?: string }) {
  return (
    <div className="mx-auto mb-10 max-w-2xl text-center md:mb-14">
      <p className="text-sm font-bold tracking-widest text-pine">{eyebrow}</p>
      <h2 className="mt-3 text-3xl leading-snug font-bold md:text-4xl">{title}</h2>
      {lead && <p className="mt-4 text-muted">{lead}</p>}
    </div>
  );
}

export default function Home() {
  return (
    <>
      <SiteHeader />

      <main>
        {/* ヒーロー */}
        <section className="overflow-hidden">
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 pt-14 pb-20 md:px-6 md:pt-20 lg:grid-cols-2">
            <div>
              <p className="inline-block rounded-full bg-sun-soft px-4 py-1 text-sm font-bold text-ink">人生後半のお金の計画</p>
              <h1 className="mt-6 text-4xl leading-tight font-bold md:text-6xl md:leading-tight">
                あなたが
                <br />
                <span className="text-pine">使い切れる額</span>、
                <br />
                知っていますか？
              </h1>
              <p className="mt-6 text-lg text-muted">
                人生後半のお金を、楽しく使い切り、きれいに渡す。
                <br className="hidden md:block" />
                資産と年齢を入れるだけで、使える額・残る額・相続税の目安・実家の時価が一枚で見えます。
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Link href="/quick" className="rounded-full bg-sun px-8 py-4 text-center text-lg font-bold text-ink shadow-md transition hover:brightness-105">
                  1分でかんたん診断（無料）
                </Link>
                <span className="text-sm text-muted">登録不要・口座連携なし</span>
              </div>
            </div>

            <HeroCard />
          </div>
        </section>

        {/* 課題 */}
        <section className="bg-sand/60 py-20">
          <div className="mx-auto max-w-6xl px-4 md:px-6">
            <SectionHeading eyebrow="こんなお悩み、ありませんか？" title="貯めるのは得意。でも、使い方と渡し方は誰も教えてくれない。" />
            <div className="grid gap-4 md:grid-cols-2">
              {PROBLEMS.map((p) => (
                <div key={p.title} className="flex gap-4 rounded-2xl bg-white p-6">
                  <span className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sun-soft font-bold text-sun">?</span>
                  <div>
                    <h3 className="text-lg font-bold">{p.title}</h3>
                    <p className="mt-1 text-muted">{p.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* かんたん診断 */}
        <section id="quick" className="scroll-mt-16 py-20">
          <div className="mx-auto max-w-6xl px-4 md:px-6">
            <SectionHeading
              eyebrow="かんたん診断"
              title="まずは「毎年あと使える額」を見てみましょう"
              lead="数字を変えると、その場で結果が変わります。"
            />
            <QuickDiagnosis />
          </div>
        </section>

        {/* 一枚で見える */}
        <section className="bg-pine-soft py-20">
          <div className="mx-auto max-w-6xl px-4 md:px-6">
            <SectionHeading
              eyebrow="詳細診断でわかること"
              title="お金の「これから」が、一枚で見える"
              lead="預金・証券・保険に、不動産の時価まで含めて。結論から、大きな数字でお見せします。"
            />
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {OUTPUTS.map((o) => (
                <div key={o.label} className="rounded-2xl bg-white p-5 md:p-6">
                  <p className="text-sm font-bold text-muted">{o.label}</p>
                  <p className="mt-2 leading-none font-bold text-pine">
                    <span className="text-4xl tabular-nums md:text-5xl">{o.value}</span>
                    <span className="ml-1 text-base">{o.unit}</span>
                  </p>
                  <p className="mt-3 text-xs text-muted">{o.note}</p>
                  {o.label === "相続税の目安" && (
                    <Link href="/inheritance" className="mt-3 inline-block text-sm font-bold text-pine hover:underline">
                      自分の家族で試算する →
                    </Link>
                  )}
                </div>
              ))}
            </div>
            <p className="mt-4 text-center text-xs text-muted">※ 表示は入力例です（かんたん診断の初期値に、実家1件・相続人3人を加えた場合）。</p>
          </div>
        </section>

        {/* 使い方 */}
        <section className="py-20">
          <div className="mx-auto max-w-6xl px-4 md:px-6">
            <SectionHeading eyebrow="使い方" title="3つのステップで、使い切り計画と資産整理を同時に" />
            <ol className="grid gap-6 md:grid-cols-3">
              {STEPS.map((s) => (
                <li key={s.n} className="rounded-2xl border border-line bg-white p-6">
                  <p className="text-3xl font-bold text-sun">{s.n}</p>
                  <h3 className="mt-2 text-xl font-bold">{s.title}</h3>
                  <p className="mt-2 text-muted">{s.body}</p>
                </li>
              ))}
            </ol>

            <div className="mt-12 rounded-3xl bg-white p-6 md:p-10">
              <p className="text-sm font-bold text-pine">タイムバケットの例</p>
              <h3 className="mt-1 text-2xl font-bold">やりたいことを、年代ごとに並べる</h3>
              <div className="mt-6 grid gap-4 md:grid-cols-3">
                {BUCKETS.map((b) => (
                  <div key={b.age} className="rounded-2xl bg-cream p-5">
                    <div className="flex items-baseline justify-between">
                      <p className="font-bold">{b.age}</p>
                      <p className="text-sm font-bold text-pine">{b.cost}</p>
                    </div>
                    <ul className="mt-3 space-y-2">
                      {b.items.map((it) => (
                        <li key={it} className="flex gap-2 text-muted">
                          <span className="text-sun">●</span>
                          {it}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* 特徴 */}
        <section className="bg-ink py-20 text-white">
          <div className="mx-auto max-w-6xl px-4 md:px-6">
            <div className="mx-auto mb-14 max-w-2xl text-center">
              <p className="text-sm font-bold tracking-widest text-sun">ほかのサービスとのちがい</p>
              <h2 className="mt-3 text-3xl leading-snug font-bold md:text-4xl">終活ノートでも、相続税の計算機でもなく。</h2>
            </div>
            <div className="grid gap-6 md:grid-cols-3">
              {FEATURES.map((f) => (
                <div key={f.tag} className="rounded-2xl bg-white/5 p-6 ring-1 ring-white/10">
                  <span className="rounded-full bg-sun px-3 py-1 text-xs font-bold text-ink">{f.tag}</span>
                  <h3 className="mt-4 text-xl leading-snug font-bold">{f.title}</h3>
                  <p className="mt-3 text-white/75">{f.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 対象 */}
        <section className="py-20">
          <div className="mx-auto max-w-6xl px-4 md:px-6">
            <SectionHeading eyebrow="こんな方に" title="ご本人にも、そのご家族にも" />
            <div className="grid gap-6 md:grid-cols-2">
              <Persona
                who="50〜60代のご本人"
                items={["老後資金で何歳まで暮らせるか知りたい", "旅行や趣味にいくら使っていいか知りたい", "子どもに、いつ・どれくらい渡すか決めたい"]}
              />
              <Persona
                who="40代の子世代"
                items={["親の相続で揉めないか心配", "実家をどうするか、そろそろ話したい", "相続税がかかるのか知っておきたい"]}
                note="親子で画面を見ながら話す「きっかけ」にも。"
              />
            </div>
          </div>
        </section>

        {/* 中立性 */}
        <section className="pb-20">
          <div className="mx-auto max-w-4xl px-4 md:px-6">
            <div className="rounded-3xl border-2 border-pine/30 bg-white p-6 md:p-10">
              <h2 className="text-2xl font-bold">計画は中立に。提案には報酬が発生することを、はっきりお伝えします。</h2>
              <ul className="mt-6 space-y-3 text-muted">
                <li className="flex gap-3">
                  <span className="font-bold text-pine">✓</span>
                  シミュレーションの結果は、特定の会社や商品に有利になるよう調整していません。
                </li>
                <li className="flex gap-3">
                  <span className="font-bold text-pine">✓</span>
                  不動産会社や税理士などの専門家をご紹介する場合、提携先から紹介料を受け取ることがあります。その場合は画面上に明示します。
                </li>
                <li className="flex gap-3">
                  <span className="font-bold text-pine">✓</span>
                  金融商品の推奨や、個別の税務・法律相談は行いません。試算と一般的な情報提供にとどめ、具体的なご相談は専門家におつなぎします。
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="bg-sand/60 py-20">
          <div className="mx-auto max-w-3xl px-4 md:px-6">
            <SectionHeading eyebrow="よくある質問" title="FAQ" />
            <div className="space-y-3">
              {FAQ.map((f) => (
                <details key={f.q} className="group rounded-2xl bg-white p-5 open:shadow-sm">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-bold">
                    {f.q}
                    <span className="text-2xl text-pine transition group-open:rotate-45">+</span>
                  </summary>
                  <p className="mt-3 text-muted">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* 最終CTA */}
        <section id="start" className="py-24">
          <div className="mx-auto max-w-3xl px-4 text-center md:px-6">
            <h2 className="text-3xl leading-snug font-bold md:text-5xl md:leading-tight">
              お金は、使ってこそ。
              <br />
              <span className="text-pine">これからの計画</span>を始めましょう。
            </h2>
            <p className="mt-6 text-muted">詳細診断（不動産・相続・タイムバケット）は現在準備中です。</p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link href="/quick" className="rounded-full bg-sun px-8 py-4 text-lg font-bold text-ink shadow-md transition hover:brightness-105">
                かんたん診断をやってみる
              </Link>
              <a href="#" className="rounded-full border-2 border-pine px-8 py-4 text-lg font-bold text-pine transition hover:bg-pine-soft">
                詳細診断の開始を知らせてもらう
              </a>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}

const SPARK_W = 300;
const SPARK_H = 110;

/** 年齢ごとの残高を、ヒーローカード用の小さな折れ線のパスに変換する。 */
function sparkPath(path: YearPoint[], maxY: number): string {
  const first = path[0].age;
  const span = path[path.length - 1].age - first;
  return path
    .map((p, i) => `${i ? "L" : "M"}${((p.age - first) / span) * SPARK_W},${SPARK_H - (Math.max(p.balance, 0) / maxY) * SPARK_H}`)
    .join(" ");
}

function HeroCard() {
  // かんたん診断の初期値と同じ入力例で表示する
  const example = DEFAULT_QUICK_INPUT;
  const heroResult = runQuickDiagnosis(example);
  const maxY = Math.max(...heroResult.path.map((p) => p.balance), ...heroResult.plannedPath.map((p) => p.balance)) * 1.1;
  const planned = sparkPath(heroResult.plannedPath, maxY);
  const unspent = sparkPath(heroResult.path, maxY);
  return (
    <div className="relative mx-auto w-full max-w-md">
      <div className="absolute -top-8 -right-10 h-48 w-48 rounded-full bg-sun-soft" aria-hidden />
      <div className="absolute -bottom-10 -left-8 h-36 w-36 rounded-full bg-pine-soft" aria-hidden />
      <div className="relative rounded-3xl border border-line bg-white p-6 shadow-xl">
        <p className="text-sm font-bold text-muted">{example.currentAge}歳・ご夫婦の例</p>
        <p className="mt-3 text-sm">毎年あと使える額</p>
        <p className="leading-none font-bold text-pine">
          <span className="text-6xl tabular-nums">{Math.round(heroResult.extraAnnualSpend).toLocaleString()}</span>
          <span className="ml-1 text-xl">万円</span>
        </p>
        <svg viewBox={`0 0 ${SPARK_W} ${SPARK_H}`} className="mt-5 w-full" aria-hidden>
          <path d={`${planned} L${SPARK_W},${SPARK_H} L0,${SPARK_H} Z`} fill="var(--color-pine)" opacity="0.12" />
          <path d={planned} fill="none" stroke="var(--color-pine)" strokeWidth="3" strokeLinejoin="round" />
          <path d={unspent} fill="none" stroke="var(--color-muted)" strokeWidth="2" strokeDasharray="2 4" />
        </svg>
        <div className="mt-1 flex justify-between text-xs text-muted">
          <span>{example.currentAge}歳</span>
          <span>{example.lifeExpectancy}歳</span>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl bg-cream p-3">
            <p className="text-muted">相続税の目安</p>
            <p className="text-lg font-bold">{EXAMPLE_TAX.payableTax > 0 ? `約${fmt(EXAMPLE_TAX.payableTax)}万円` : "かからない見込み"}</p>
          </div>
          <div className="rounded-xl bg-cream p-3">
            <p className="text-muted">資産整理</p>
            <p className="text-lg font-bold">
              3件中 1件完了
            </p>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2 rounded-xl bg-sun-soft px-3 py-2 text-sm">
          <span className="font-bold text-alert">!</span>
          方針が「未定」の不動産が1件あります
        </div>
      </div>
    </div>
  );
}

function Persona({ who, items, note }: { who: string; items: string[]; note?: string }) {
  return (
    <div className="rounded-2xl bg-white p-6 md:p-8">
      <h3 className="text-xl font-bold">{who}</h3>
      <ul className="mt-4 space-y-3">
        {items.map((it) => (
          <li key={it} className="flex gap-3">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-pine text-xs text-white">✓</span>
            {it}
          </li>
        ))}
      </ul>
      {note && <p className="mt-4 text-sm text-pine">{note}</p>}
    </div>
  );
}
