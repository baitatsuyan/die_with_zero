import type { Metadata } from "next";
import { QuickWizard } from "@/components/QuickWizard";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";

export const metadata: Metadata = {
  title: "かんたん診断｜使い切りプランナー",
  description: "いくつかの質問に答えるだけで、人生後半に「毎年あと使える額」の目安が分かります。",
};

export default function QuickPage() {
  return (
    <>
      <SiteHeader />
      <main className="py-10 md:py-16">
        <div className="mx-auto max-w-6xl px-4 md:px-6">
          <QuickWizard />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
