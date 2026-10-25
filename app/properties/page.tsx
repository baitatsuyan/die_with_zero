import type { Metadata } from "next";
import { PropertyEstimator } from "@/components/PropertyEstimator";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";

export const metadata: Metadata = {
  title: "不動産の時価｜使い切りプランナー",
  description: "自宅や実家が「売ったらいくらになりそうか」を、国土交通省が公開する実際の取引事例から推定します。",
};

export default function PropertiesPage() {
  return (
    <>
      <SiteHeader />
      <main className="py-14 md:py-20">
        <div className="mx-auto max-w-6xl px-4 md:px-6">
          <div className="mb-10 max-w-2xl">
            <p className="text-sm font-bold tracking-widest text-pine">不動産の時価</p>
            <h1 className="mt-3 text-3xl leading-snug font-bold md:text-5xl md:leading-tight">
              実家、いま売ったら
              <br />
              いくらになる？
            </h1>
            <p className="mt-4 text-muted">
              所在地・種類・面積を入れると、近くで実際に取引された事例から、いまの時価の目安を推定します。登録は不要です。
            </p>
          </div>
          <PropertyEstimator />
          <p className="mt-10 text-xs leading-relaxed text-muted">
            出典：国土交通省 不動産情報ライブラリ（
            <a href="https://www.reinfolib.mlit.go.jp/" className="underline" target="_blank" rel="noopener noreferrer">
              https://www.reinfolib.mlit.go.jp/
            </a>
            ）。「不動産価格（取引価格・成約価格）情報」（国土交通省）をもとに使い切りプランナーが推定値を計算して作成しています。
          </p>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
