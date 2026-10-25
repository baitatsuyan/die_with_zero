import type { NextConfig } from "next";

// GitHub Pages ではリポジトリ名のパス（/die_with_zero）の下で公開するため、
// ビルド時に BASE_PATH を渡したときだけ basePath を付ける。
const basePath = process.env.BASE_PATH ?? "";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  basePath,
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
  images: { unoptimized: true },
};

export default nextConfig;
