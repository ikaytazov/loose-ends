// POST /api/notes — paste meeting notes, get proposed tasks back (docs/api.md).
// The AI reads the notes (lib/notes/extract.ts); this route saves the meeting and the proposed tasks.
import { PasteNotesRequest, type PasteNotesResponse } from "@/lib/contracts/api";
import type { Task, TeamMember, Workstream } from "@/lib/contracts/domain";
import { extractTasks } from "@/lib/notes/extract";
import { readJson, route, throwIf } from "@/lib/server/http";
import { db } from "@/lib/server/supabase";

export const maxDuration = 60; // reading long notes can take a while

function matchMember(name: string | null, members: TeamMember[]): string | null {
  if (!name) return null;
  const n = name.trim().toLowerCase();
  const hit =
    members.find((m) => m.name.toLowerCase() === n) ??
    members.find((m) => m.name.toLowerCase().split(" ")[0] === n.split(" ")[0]);
  return hit?.id ?? null;
}

export const POST = route(async (req: Request) => {
  const body = await readJson(req, PasteNotesRequest);
  const sb = db();

  const [{ data: members, error: e1 }, { data: workstreams, error: e2 }] = await Promise.all([
    sb.from("team_members").select("*"),
    sb.from("workstreams").select("*"),
  ]);
  throwIf(e1, "load team");
  throwIf(e2, "load workstreams");
  const team = (members ?? []) as TeamMember[];
  const streams = (workstreams ?? []) as Workstream[];

  const { data: meeting, error: e3 } = await sb
    .from("meetings")
    .insert({ title: body.title, meeting_date: body.meeting_date, attendees: body.attendees, raw_notes: body.notes, source: "paste", status: "processing" })
    .select("id")
    .single();
  throwIf(e3, "save meeting");
  const meetingId = (meeting as { id: string }).id;

  const extraction = await extractTasks({
    notes: body.notes,
    meetingDate: body.meeting_date,
    attendees: body.attendees,
    teamNames: team.map((m) => m.name),
    workstreamNames: streams.map((w) => w.name),
  });

  const rows = extraction.tasks.map((t) => {
    const owner_id = matchMember(t.owner_name, team);
    const workstream_id = streams.find((w) => w.name.toLowerCase() === (t.workstream_name ?? "").toLowerCase())?.id ?? null;
    const flags = new Set(t.flags);
    if (!owner_id) flags.add("no_owner");
    if (!t.due_date) flags.add("no_date");
    return {
      title: t.title,
      owner_id,
      workstream_id,
      meeting_id: meetingId,
      due_date: t.due_date,
      priority: t.priority,
      status: "proposed",
      source_sentence: t.source_sentence,
      flags: [...flags],
    };
  });

  const { data: tasks, error: e4 } = rows.length
    ? await sb.from("tasks").insert(rows).select("*")
    : { data: [], error: null };
  throwIf(e4, "save proposed tasks");
  await sb.from("meetings").update({ status: "proposed" }).eq("id", meetingId);

  const res: PasteNotesResponse = { meeting_id: meetingId, tasks: (tasks ?? []) as Task[] };
  return Response.json(res);
});
