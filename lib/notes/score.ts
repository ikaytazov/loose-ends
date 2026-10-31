// Scores the notes reader against an answer key (test-data/expected/*.json).
// Tasks are paired up by how much their source sentence and title overlap, then each field is compared.
import type { NotesExtraction } from "@/lib/contracts/ai";

type T = NotesExtraction["tasks"][number];

const STOP = new Set(["the", "a", "an", "to", "and", "of", "for", "by", "on", "in", "it", "is", "will", "be", "so", "that", "with"]);
function words(s: string): Set<string> {
  return new Set(
    s.toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter((w) => w.length > 1 && !STOP.has(w)),
  );
}
function overlap(a: string, b: string): number {
  const A = words(a), B = words(b);
  if (!A.size || !B.size) return 0;
  let n = 0;
  for (const w of A) if (B.has(w)) n++;
  return n / Math.min(A.size, B.size);
}
function similarity(p: T, e: T): number {
  return 0.7 * overlap(p.source_sentence, e.source_sentence) + 0.3 * overlap(p.title, e.title);
}

export interface FieldCheck { right: number; total: number; misses: string[] }
export interface Score {
  expected: number;
  found: number;
  missed: string[];
  extra: string[];
  owner: FieldCheck;
  due_date: FieldCheck;
  priority: FieldCheck;
  workstream: FieldCheck;
  unclear_flag: FieldCheck;
}

export function scoreExtraction(predicted: T[], expected: T[]): Score {
  const pairs: { p: T; e: T; s: number }[] = [];
  for (const p of predicted) for (const e of expected) pairs.push({ p, e, s: similarity(p, e) });
  pairs.sort((a, b) => b.s - a.s);
  const usedP = new Set<T>(), usedE = new Set<T>();
  const matched: { p: T; e: T }[] = [];
  for (const { p, e, s } of pairs) {
    if (s < 0.45 || usedP.has(p) || usedE.has(e)) continue;
    usedP.add(p); usedE.add(e); matched.push({ p, e });
  }

  const check = (get: (t: T) => unknown): FieldCheck => {
    const out: FieldCheck = { right: 0, total: matched.length, misses: [] };
    for (const { p, e } of matched) {
      if (get(p) === get(e)) out.right++;
      else out.misses.push(`${e.title}: expected ${JSON.stringify(get(e))}, got ${JSON.stringify(get(p))}`);
    }
    return out;
  };

  return {
    expected: expected.length,
    found: matched.length,
    missed: expected.filter((e) => !usedE.has(e)).map((e) => e.title),
    extra: predicted.filter((p) => !usedP.has(p)).map((p) => `${p.title} ("${p.source_sentence}")`),
    owner: check((t) => t.owner_name ?? null),
    due_date: check((t) => t.due_date ?? null),
    priority: check((t) => t.priority),
    workstream: check((t) => t.workstream_name ?? null),
    unclear_flag: check((t) => t.flags.includes("unclear")),
  };
}

/** Pull "Date: …" and "Attendees: …" from the top of a test transcript. */
export function readTranscriptHeader(text: string): { meetingDate: string; attendees: string[]; notes: string } {
  const date = text.match(/^Date:\s*(\d{4}-\d{2}-\d{2})/m)?.[1] ?? "";
  const att = text.match(/^Attendees:\s*(.+)$/m)?.[1] ?? "";
  const notes = text.replace(/^Date:.*\n/m, "").replace(/^Attendees:.*\n/m, "").trim();
  return { meetingDate: date, attendees: att.split(",").map((s) => s.trim()).filter(Boolean), notes };
}
