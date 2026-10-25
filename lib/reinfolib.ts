// 国土交通省「不動産情報ライブラリ」API の呼び出し（サーバー側専用）。
// APIキーは環境変数 REINFOLIB_API_KEY に置き、ブラウザには渡さない。
import "server-only";
import type { RawTransaction } from "@/lib/realEstateEstimate";

const BASE_URL = "https://www.reinfolib.mlit.go.jp/ex-api/external";
// 取引価格は四半期ごとの更新なので、同じ問い合わせは30日間キャッシュする
const REVALIDATE_SECONDS = 60 * 60 * 24 * 30;

export class ReinfolibNotConfiguredError extends Error {}
export class ReinfolibUpstreamError extends Error {}

async function call<T>(api: string, params: Record<string, string>): Promise<T[]> {
  const key = process.env.REINFOLIB_API_KEY;
  if (!key) throw new ReinfolibNotConfiguredError("REINFOLIB_API_KEY is not set");
  const url = `${BASE_URL}/${api}?${new URLSearchParams(params)}`;
  const res = await fetch(url, {
    headers: { "Ocp-Apim-Subscription-Key": key },
    next: { revalidate: REVALIDATE_SECONDS },
  });
  // 該当データがない場合は 404 が返ることがある
  if (res.status === 404) return [];
  if (!res.ok) throw new ReinfolibUpstreamError(`${api} responded ${res.status}`);
  const body = (await res.json()) as { data?: T[] } | T[];
  return Array.isArray(body) ? body : (body.data ?? []);
}

/** 市区町村の取引価格・成約価格の事例を、指定した年の分まとめて取得する。取得できなかった年は飛ばす。 */
export async function fetchTransactions(cityCode: string, years: number[]): Promise<RawTransaction[]> {
  const results = await Promise.allSettled(years.map((year) => call<RawTransaction>("XIT001", { year: String(year), city: cityCode })));
  const ok = results.filter((r): r is PromiseFulfilledResult<RawTransaction[]> => r.status === "fulfilled");
  if (ok.length === 0) {
    const reason = (results[0] as PromiseRejectedResult).reason;
    throw reason instanceof Error ? reason : new ReinfolibUpstreamError(String(reason));
  }
  return ok.flatMap((r) => r.value);
}

/** 都道府県内の市区町村一覧。 */
export function fetchCities(prefectureCode: string): Promise<{ id: string; name: string }[]> {
  return call<{ id: string; name: string }>("XIT002", { area: prefectureCode });
}
