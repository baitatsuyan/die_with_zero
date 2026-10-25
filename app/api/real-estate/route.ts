import { NextResponse, type NextRequest } from "next/server";
import { estimateValue, MIN_SAMPLES, parseTransaction, type PropertyType, type Transaction } from "@/lib/realEstateEstimate";
import { fetchTransactions, ReinfolibNotConfiguredError } from "@/lib/reinfolib";

const TYPES: PropertyType[] = ["land", "house", "condo"];
// 直近3年分（今年・昨年・一昨年）の事例を使う
const yearsToFetch = () => {
  const y = new Date().getFullYear();
  return [y, y - 1, y - 2];
};

/** GET /api/real-estate?city=13102&type=condo&area=70&builtYear=2005&district=日本橋 */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const city = q.get("city") ?? "";
  const type = q.get("type") as PropertyType;
  const area = Number(q.get("area"));
  const builtYearRaw = q.get("builtYear");
  const builtYear = builtYearRaw ? Number(builtYearRaw) : null;
  const district = (q.get("district") ?? "").slice(0, 30);

  if (!/^\d{5}$/.test(city) || !TYPES.includes(type) || !Number.isFinite(area) || area < 10 || area > 100000) {
    return NextResponse.json({ error: "invalid_params" }, { status: 400 });
  }
  if (builtYear !== null && (!Number.isInteger(builtYear) || builtYear < 1900 || builtYear > new Date().getFullYear())) {
    return NextResponse.json({ error: "invalid_params" }, { status: 400 });
  }

  try {
    const raw = await fetchTransactions(city, yearsToFetch());
    const transactions = raw.map(parseTransaction).filter((t): t is Transaction => t !== null);
    const estimate = estimateValue({ propertyType: type, areaSqm: area, builtYear, district }, transactions);
    if (!estimate) return NextResponse.json({ error: "not_enough_data", minSamples: MIN_SAMPLES }, { status: 404 });
    return NextResponse.json({ estimate, updatedAt: new Date().toISOString() });
  } catch (e) {
    if (e instanceof ReinfolibNotConfiguredError) return NextResponse.json({ error: "not_configured" }, { status: 503 });
    console.error("real-estate estimate failed", e);
    return NextResponse.json({ error: "upstream_error" }, { status: 502 });
  }
}
