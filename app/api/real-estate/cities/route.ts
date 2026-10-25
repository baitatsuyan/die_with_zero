import { NextResponse, type NextRequest } from "next/server";
import { fetchCities, ReinfolibNotConfiguredError } from "@/lib/reinfolib";

/** GET /api/real-estate/cities?pref=13 */
export async function GET(req: NextRequest) {
  const pref = req.nextUrl.searchParams.get("pref") ?? "";
  if (!/^\d{2}$/.test(pref) || Number(pref) < 1 || Number(pref) > 47) {
    return NextResponse.json({ error: "invalid_params" }, { status: 400 });
  }
  try {
    const cities = await fetchCities(pref);
    return NextResponse.json({ cities });
  } catch (e) {
    if (e instanceof ReinfolibNotConfiguredError) return NextResponse.json({ error: "not_configured" }, { status: 503 });
    console.error("city list failed", e);
    return NextResponse.json({ error: "upstream_error" }, { status: 502 });
  }
}
