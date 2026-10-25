import type { Metadata } from "next";
import { ConsultForm } from "@/components/ConsultForm";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";

export const metadata: Metadata = {
  title: "不動産の売却相談｜使い切りプランナー",
  description: "自宅や実家の売却・住み替えについて、無料でご相談いただけます。",
};

export default function ConsultPage() {
  return (
    <>
      <SiteHeader />
      <main className="py-14 md:py-20">
        <div className="mx-auto max-w-3xl px-4 md:px-6">
          <div className="mb-10">
            <p className="text-sm font-bold tracking-widest text-pine">不動産の売却相談</p>
            <h1 className="mt-3 text-3xl leading-snug font-bold md:text-5xl md:leading-tight">
              いつ、どう売るか。
              <br />
              一緒に考えます
            </h1>
            <p className="mt-4 text-muted">
              売却の時期や住み替え先、貸す・持ち続けるという選択肢も含めて、ご相談を受け付けています。相談は無料です。
            </p>
          </div>
          <ConsultForm />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
