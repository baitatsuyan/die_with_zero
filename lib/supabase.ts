"use client";

// Supabase への接続（ブラウザ側）。
// publishable（anon）キーはブラウザに出す前提のキーで、データは RLS（supabase/migrations）で守る。
// 別のプロジェクトにつなぐときは、環境変数 NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY で上書きする。
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://kwweyrymcvtfdqxemnnn.supabase.co";
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "sb_publishable__XE15GTFBSq-IS6Dw7vMqg_8wDEcOs-";

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!client) client = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: true, detectSessionInUrl: true } });
  return client;
}
