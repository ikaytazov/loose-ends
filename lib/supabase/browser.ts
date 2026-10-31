"use client";
// Read-only Supabase client for screens. It can READ tables and views and listen for live changes.
// It cannot write: every change goes through a route in app/api (see docs/api.md).
//
// Example — live board:
//   const supabase = browserSupabase();
//   const { data } = await supabase.from("task_board").select("*").eq("workstream_id", id);
//   supabase.channel("tasks").on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, reload).subscribe();
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

export function browserSupabase(): SupabaseClient {
  if (!client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local");
    client = createClient(url, key);
  }
  return client;
}
