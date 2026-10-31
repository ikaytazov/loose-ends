// /api/reply/[code] — the "reply here" page (docs/api.md). The code from the morning email link is the only key.
//   GET   the person's name and numbered tasks
//   POST  a plain-language update, handled exactly like an email reply
import { connection } from "next/server";
import { ReplyPageRequest } from "@/lib/contracts/api";
import { todayIn } from "@/lib/email/ordering";
import { loadReplyPage, submitReplyPage } from "@/lib/replies/page";
import { claudeReplyParser } from "@/lib/replies/parse";
import { supabaseReplyRepo } from "@/lib/replies/supabase-repo";
import { env } from "@/lib/server/env";
import { HttpError, readJson, route } from "@/lib/server/http";
import { db } from "@/lib/server/supabase";

export const maxDuration = 60;

const NOT_FOUND = "This link is not valid. Please use the one in your latest morning email.";

export const GET = route(async (_req: Request, ctx: { params: Promise<{ code: string }> }) => {
  await connection(); // run on every call, never once at build time
  const { code } = await ctx.params;
  const page = await loadReplyPage(supabaseReplyRepo(db()), code);
  if (!page) throw new HttpError(404, NOT_FOUND);
  return Response.json(page);
});

export const POST = route(async (req: Request, ctx: { params: Promise<{ code: string }> }) => {
  const { code } = await ctx.params;
  const { text } = await readJson(req, ReplyPageRequest);
  const result = await submitReplyPage(supabaseReplyRepo(db()), claudeReplyParser, code, text, { today: todayIn(env.timezone()) });
  if (!result) throw new HttpError(404, NOT_FOUND);
  if (!result.ok) throw new HttpError(500, "Your update could not be saved. Please try again.");
  return Response.json(result);
});
