// AI step 1: read meeting notes and propose tasks (agreement B).
//
// >>> STUB <<<  This returns the same made-up tasks every time, so the screens can be built tonight.
// Owner of the real version: see docs/team-tasks.md ("Notes-reading prompt").
// To make it real: replace the body of `extractTasks` with a Claude call that returns NotesExtraction
// (copy the pattern in lib/replies/parse.ts). Nothing else needs to change — app/api/notes/route.ts
// already saves whatever this returns.
import type { NotesExtraction } from "@/lib/contracts/ai";

export interface ExtractInput {
  notes: string;
  meetingDate: string; // YYYY-MM-DD
  attendees: string[];
  teamNames: string[];
  workstreamNames: string[];
}

function addDays(date: string, days: number): string {
  const d = new Date(date + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export async function extractTasks(input: ExtractInput): Promise<NotesExtraction> {
  const d = (n: number) => addDays(input.meetingDate, n);
  const ws = (name: string) => (input.workstreamNames.includes(name) ? name : input.workstreamNames[0] ?? null);
  return {
    tasks: [
      { title: "Launch the new pricing page", owner_name: "Priya", due_date: d(3), priority: "high", workstream_name: ws("Product launch"), source_sentence: "Priya will get the new pricing page live by Thursday.", flags: [] },
      { title: "Finish the partner deck", owner_name: "Priya", due_date: d(3), priority: "high", workstream_name: ws("Product launch"), source_sentence: "Priya also owns the partner deck, same deadline.", flags: [] },
      { title: "Run five customer interviews", owner_name: "Jordan", due_date: d(4), priority: "medium", workstream_name: ws("Customer onboarding"), source_sentence: "Jordan to line up five customer interviews before Friday.", flags: [] },
      { title: "Draft the onboarding email sequence", owner_name: "Jordan", due_date: d(7), priority: "medium", workstream_name: ws("Customer onboarding"), source_sentence: "Jordan said he'd draft the onboarding emails next week.", flags: [] },
      { title: "Send the investor update", owner_name: "Maya", due_date: d(2), priority: "high", workstream_name: ws("Fundraising"), source_sentence: "Maya sends the investor update on Wednesday.", flags: [] },
      { title: "Renew the vendor contract", owner_name: "Alex", due_date: d(5), priority: "low", workstream_name: ws("Operations"), source_sentence: "Alex will sort out the vendor contract renewal.", flags: [] },
      { title: "Own the launch checklist", owner_name: null, due_date: d(4), priority: "medium", workstream_name: ws("Product launch"), source_sentence: "Someone needs to own the launch checklist.", flags: ["no_owner"] },
      { title: "Book the venue for the launch event", owner_name: null, due_date: null, priority: "low", workstream_name: ws("Operations"), source_sentence: "We should book a venue for the launch event at some point.", flags: ["no_owner", "no_date"] },
    ],
  };
}
