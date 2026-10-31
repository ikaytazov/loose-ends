// GET /api/dev/score-notes?n=01 — runs the notes reader on test-data/transcripts/<n>.md and scores it
// against test-data/expected/<n>.json. For tuning the prompt; not used by any screen.
// Protected: needs header `x-score-key: <BRIDGE_SECRET>` (it spends Claude API credit).
// Reads the test files from the public GitHub repo, so it always uses the latest test data on main.
import { connection } from "next/server";
import { NotesExtraction } from "@/lib/contracts/ai";
import { extractTasks } from "@/lib/notes/extract";
import { readTranscriptHeader, scoreExtraction } from "@/lib/notes/score";
import { env } from "@/lib/server/env";
import { HttpError, route } from "@/lib/server/http";

export const maxDuration = 60;

const RAW = "https://raw.githubusercontent.com/ikaytazov/loose-ends/main/test-data";

async function getText(path: string): Promise<string> {
  const res = await fetch(`${RAW}/${path}`, { cache: "no-store" });
  if (!res.ok) throw new HttpError(404, `Could not load ${path} (${res.status})`);
  return res.text();
}

const handler = route(async (req: Request) => {
  if (req.headers.get("x-score-key") !== env.bridgeSecret()) throw new HttpError(401, "Not allowed");
  const n = new URL(req.url).searchParams.get("n") ?? "01";
  if (!/^\d{2}$/.test(n)) throw new HttpError(400, "n must look like 01");

  const [transcript, expectedText, teamText] = await Promise.all([
    getText(`transcripts/${n}.md`),
    getText(`expected/${n}.json`),
    getText("team.json"),
  ]);
  const team = JSON.parse(teamText) as { members: { name: string }[]; workstreams: { name: string }[] };
  const expected = NotesExtraction.parse(JSON.parse(expectedText));
  const { meetingDate, attendees, notes } = readTranscriptHeader(transcript);

  const started = Date.now();
  const got = await extractTasks({
    notes,
    meetingDate,
    attendees,
    teamNames: team.members.map((m) => m.name),
    workstreamNames: team.workstreams.map((w) => w.name),
  });
  return Response.json({
    transcript: n,
    seconds: Math.round((Date.now() - started) / 1000),
    score: scoreExtraction(got.tasks, expected.tasks),
    got: got.tasks,
  });
});

export async function GET(req: Request) {
  await connection(); // run on every call, never at build time (must stay outside route(), which catches errors)
  return handler(req);
}
