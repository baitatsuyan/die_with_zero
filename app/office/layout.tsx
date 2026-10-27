import type { Metadata } from "next";
import type { ReactNode } from "react";
import { OfficeShell } from "@/components/office/OfficeShell";

export const metadata: Metadata = {
  title: "事務所向け｜使い切りプランナー",
  robots: { index: false },
};

export default function OfficeLayout({ children }: { children: ReactNode }) {
  return <OfficeShell>{children}</OfficeShell>;
}
