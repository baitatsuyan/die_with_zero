import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "使い切りプランナー｜人生後半のお金を、楽しく使い切り、きれいに渡す",
  description:
    "資産と年齢を入れるだけで「毎年あと使える額」「最期に残る額」「相続税の目安」「不動産の時価」が一枚で見える、人生後半のお金の計画サービス。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className="antialiased">{children}</body>
    </html>
  );
}
