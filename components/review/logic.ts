// Pure helpers for the Review screen: spotting duplicates and highlighting the exact source sentences.
import type { Task } from "@/lib/contracts/domain";

export type Tracked = Pick<Task, "id" | "title" | "owner_id" | "source_sentence" | "status">;

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();

function words(s: string): Set<string> {
  return new Set(
    s
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length > 2),
  );
}

// Share of words the two titles have in common, 0 to 1.
export function titleSimilarity(a: string, b: string): number {
  const x = words(a);
  const y = words(b);
  if (x.size === 0 || y.size === 0) return 0;
  let common = 0;
  for (const w of x) if (y.has(w)) common += 1;
  return common / (x.size + y.size - common);
}

// A proposal duplicates an existing task when they came from the same exact words, or when the same
// owner has a near-identical title. The threshold is a judgement call; tests pin the examples.
export function findDuplicate(
  p: { title: string; owner_id: string | null; source_sentence: string | null },
  existing: Tracked[],
): Tracked | null {
  for (const t of existing) {
    if (p.source_sentence && t.source_sentence && norm(p.source_sentence) === norm(t.source_sentence)) return t;
    if (p.owner_id && t.owner_id === p.owner_id && titleSimilarity(p.title, t.title) >= 0.6) return t;
  }
  return null;
}

export type Segment = { text: string; proposalId?: string };

// Splits the notes into plain text and highlighted source sentences, matching case-insensitively.
// Sentences that are not found word for word are simply not highlighted.
export function highlight(notes: string, sentences: { id: string; text: string }[]): Segment[] {
  const lower = notes.toLowerCase();
  const found: { start: number; end: number; id: string }[] = [];
  for (const s of sentences) {
    const needle = s.text.trim().toLowerCase();
    if (!needle) continue;
    const start = lower.indexOf(needle);
    if (start < 0) continue;
    const end = start + needle.length;
    // Skip a sentence that overlaps one already placed; the first one wins.
    if (found.some((f) => start < f.end && end > f.start)) continue;
    found.push({ start, end, id: s.id });
  }
  found.sort((a, b) => a.start - b.start);

  const out: Segment[] = [];
  let cursor = 0;
  for (const f of found) {
    if (f.start > cursor) out.push({ text: notes.slice(cursor, f.start) });
    out.push({ text: notes.slice(f.start, f.end), proposalId: f.id });
    cursor = f.end;
  }
  if (cursor < notes.length) out.push({ text: notes.slice(cursor) });
  return out;
}
