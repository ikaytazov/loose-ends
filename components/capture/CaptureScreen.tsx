"use client";

// Capture notes (/capture): get one or more transcripts in, oldest first, then go to Review.
import { useRouter } from "next/navigation";
import { useRef, useState, type DragEvent } from "react";
import { errorText, postJson } from "@/components/api";
import { dateFromText, firstLine, uploadProblem } from "@/components/capture/parse";
import { formatDay } from "@/components/format";
import { useTeam } from "@/components/use-team";
import { Button, Card, Chip, Eyebrow, Field, inputClass, Notice, PageHead, Pill } from "@/components/ui";
import type { PasteNotesResponse } from "@/lib/contracts/api";
import { browserSupabase } from "@/lib/supabase/browser";

type Draft = {
  key: string;
  title: string;
  meeting_date: string; // YYYY-MM-DD, or "" until the lead picks one
  attendees: string[];
  notes: string;
  fileName: string | null;
};

type Problems = Partial<Record<"title" | "meeting_date" | "notes", string>>;

let nextKey = 0;
function newDraft(overrides: Partial<Draft> = {}): Draft {
  nextKey += 1;
  // The date starts blank: picking it is part of the job, and the page is prerendered on the server, which has no "today".
  return { key: `draft-${nextKey}`, title: "", meeting_date: "", attendees: [], notes: "", fileName: null, ...overrides };
}

function problemsWith(d: Draft): Problems {
  const p: Problems = {};
  if (!d.title.trim()) p.title = "Give the meeting a title.";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d.meeting_date)) p.meeting_date = "Pick the meeting date. It is needed so 'Tuesday' becomes a real date.";
  if (!d.notes.trim()) p.notes = "Paste or upload the notes. Empty notes can't be read.";
  return p;
}

// If an earlier attempt saved this meeting but the response was lost, reuse it instead of saving a copy.
async function findSavedMeeting(d: Draft): Promise<string | null> {
  const since = new Date(Date.now() - 30 * 60_000).toISOString();
  const { data, error } = await browserSupabase()
    .from("meetings")
    .select("id, raw_notes")
    .eq("title", d.title.trim())
    .eq("meeting_date", d.meeting_date)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(5);
  if (error) throw new Error(error.message);
  return (data ?? []).find((m) => m.raw_notes === d.notes)?.id ?? null;
}

export function CaptureScreen() {
  const router = useRouter();
  const { team, error: teamError } = useTeam();
  const [drafts, setDrafts] = useState<Draft[]>(() => [newDraft()]);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [showErrors, setShowErrors] = useState(false);
  const [uploadProblems, setUploadProblems] = useState<string[]>([]);
  const [dragging, setDragging] = useState(false);
  const [saving, setSaving] = useState<{ at: number; total: number } | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState<Record<string, string>>({});
  const fileInput = useRef<HTMLInputElement>(null);

  const active = drafts.find((d) => d.key === activeKey) ?? drafts[0];
  const problems = problemsWith(active);

  function patchActive(patch: Partial<Draft>) {
    setDrafts((list) => list.map((d) => (d.key === active.key ? { ...d, ...patch } : d)));
  }

  function toggleAttendee(name: string) {
    const has = active.attendees.includes(name);
    patchActive({ attendees: has ? active.attendees.filter((n) => n !== name) : [...active.attendees, name] });
  }

  function addMeeting() {
    const next = newDraft();
    setDrafts((list) => [...list, next]);
    setActiveKey(next.key);
    setShowErrors(false);
  }

  function removeDraft(key: string) {
    setDrafts((list) => {
      const rest = list.filter((d) => d.key !== key);
      return rest.length ? rest : [newDraft()];
    });
    setActiveKey(null);
  }

  async function readFiles(files: FileList | File[]) {
    const problemsFound: string[] = [];
    const added: Draft[] = [];
    for (const file of Array.from(files)) {
      const problem = uploadProblem(file.name, file.size);
      if (problem) {
        problemsFound.push(problem);
        continue;
      }
      const text = await file.text();
      const year = new Date().getFullYear();
      added.push(
        newDraft({
          title: firstLine(text) || file.name.replace(/\.(txt|md)$/i, ""),
          meeting_date: dateFromText(text, year) ?? "",
          notes: text,
          fileName: file.name,
        }),
      );
    }
    setUploadProblems(problemsFound);
    if (added.length === 0) return;
    // A blank meeting that is still empty is replaced by the first file, so the list has no empty entry.
    const blankOnly = drafts.length === 1 && !drafts[0].notes.trim() && !drafts[0].title.trim();
    setDrafts((list) => (blankOnly ? added : [...list, ...added]));
    setActiveKey(added[0].key);
    setShowErrors(false);
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    void readFiles(e.dataTransfer.files);
  }

  async function saveAll() {
    const incomplete = drafts.find((d) => Object.keys(problemsWith(d)).length > 0);
    if (incomplete) {
      setShowErrors(true);
      setActiveKey(incomplete.key);
      return;
    }
    setSaveError(null);
    // Oldest meeting first, so each week builds on the one before it.
    const ordered = [...drafts].sort((a, b) => a.meeting_date.localeCompare(b.meeting_date));
    const ids: string[] = [];
    const known: Record<string, string> = { ...saved };
    let at = 0;
    try {
      for (const d of ordered) {
        at += 1;
        setSaving({ at, total: ordered.length });
        if (!known[d.key]) {
          known[d.key] = (await findSavedMeeting(d)) ?? (await postJson<PasteNotesResponse>("/api/notes", {
            title: d.title.trim(),
            meeting_date: d.meeting_date,
            attendees: d.attendees,
            notes: d.notes,
          })).meeting_id;
          const key = d.key;
          const id = known[key];
          setSaved((s) => ({ ...s, [key]: id }));
        }
        ids.push(known[d.key]);
      }
      const [first, ...rest] = ids;
      router.push(`/capture/review/${first}${rest.length ? `?queue=${rest.join(",")}` : ""}`);
    } catch (e) {
      const failed = ordered[at - 1];
      setSaveError(
        `Meeting ${at} of ${ordered.length} ("${failed?.title.trim() ?? ""}") didn't save: ${errorText(e)}. Meetings already saved are kept. Press Save again to continue.`,
      );
    } finally {
      setSaving(null);
    }
  }

  const activeIndex = drafts.findIndex((d) => d.key === active.key);
  const rejected = uploadProblems.length > 0;

  return (
    <>
      <PageHead thread="short"
        eyebrow="Capture notes"
        title="Turn meetings into follow-through."
        subtitle="Paste or upload each weekly transcript, oldest first. Nothing becomes a task until you approve it on the next screen."
      />

      <div className="grid gap-8 min-[1080px]:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          {teamError && <Notice tone="danger" title="Could not load the team">{teamError}</Notice>}
          {rejected && (
            <Notice tone="warn" title="Some files were not added">
              <ul className="list-disc space-y-1 pl-5">
                {uploadProblems.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </Notice>
          )}

          <Card className="p-6">
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              className={`flex flex-wrap items-center justify-between gap-4 rounded-card border border-dashed p-5 ${
                dragging ? "border-forest-2 bg-lime-wash" : "border-line bg-canvas"
              }`}
            >
              <div>
                <p className="font-semibold">Drop transcripts here</p>
                <p className="text-[14px] text-muted">.txt or .md, up to 200 KB each. You can drop several; each becomes its own meeting.</p>
              </div>
              <Button onClick={() => fileInput.current?.click()}>Choose files</Button>
              <input
                ref={fileInput}
                type="file"
                accept=".txt,.md,text/plain,text/markdown"
                multiple
                className="sr-only"
                tabIndex={-1}
                onChange={(e) => {
                  if (e.target.files?.length) void readFiles(e.target.files);
                  e.target.value = "";
                }}
              />
            </div>
          </Card>

          <div className="flex flex-wrap gap-2" role="list" aria-label="Meetings to save">
            {drafts.map((d, i) => (
              <div key={d.key} role="listitem" className="flex items-center">
                <button
                  type="button"
                  aria-current={d.key === active.key ? "true" : undefined}
                  onClick={() => {
                    setActiveKey(d.key);
                    setShowErrors(false);
                  }}
                  className={`min-h-11 rounded-l-[10px] border px-3 text-left text-[14.5px] ${
                    d.key === active.key ? "border-forest bg-forest text-canvas" : "border-line bg-paper"
                  }`}
                >
                  <span className="font-semibold">Meeting {i + 1}</span>
                  <span className={d.key === active.key ? "text-canvas/80" : "text-muted"}>
                    {" "}· {d.meeting_date ? formatDay(d.meeting_date) : "no date"}
                  </span>
                </button>
                {drafts.length > 1 && (
                  <button
                    type="button"
                    aria-label={`Remove meeting ${i + 1}`}
                    onClick={() => removeDraft(d.key)}
                    className="min-h-11 rounded-r-[10px] border border-l-0 border-line bg-paper px-3 text-muted hover:text-danger"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
            <Button variant="ghost" onClick={addMeeting}>
              + Add another meeting
            </Button>
          </div>

          <Card className="space-y-5 p-6">
            <div className="flex items-center justify-between gap-3">
              <Eyebrow>Meeting {activeIndex + 1} of {drafts.length}</Eyebrow>
              {active.fileName && <Pill tone="lime">From {active.fileName}</Pill>}
            </div>

            <Field label="Meeting title" error={showErrors ? problems.title : undefined}>
              <input
                className={inputClass}
                value={active.title}
                onChange={(e) => patchActive({ title: e.target.value })}
                placeholder="e.g. Weekly launch meeting"
              />
            </Field>

            <Field
              label="Meeting date"
              hint="Needed so that words like 'Tuesday' become a real date."
              error={showErrors ? problems.meeting_date : undefined}
            >
              <input type="date" className={inputClass} value={active.meeting_date} onChange={(e) => patchActive({ meeting_date: e.target.value })} />
            </Field>

            <fieldset>
              <legend className="text-[14.5px] font-semibold">Who was in the meeting</legend>
              {!team && !teamError && <p className="mt-2 text-muted">Loading team…</p>}
              <div className="mt-2 flex flex-wrap gap-2">
                {team?.map((m) => {
                  const on = active.attendees.includes(m.name);
                  return (
                    <Chip key={m.id} active={on} onClick={() => toggleAttendee(m.name)}>
                      {m.name}
                    </Chip>
                  );
                })}
              </div>
            </fieldset>

            <Field label="Notes" hint="Paste the transcript, or drop a file above." error={showErrors ? problems.notes : undefined}>
              <textarea
                className={`${inputClass} min-h-[280px] font-mono text-[14px] leading-relaxed`}
                value={active.notes}
                onChange={(e) => patchActive({ notes: e.target.value, fileName: null })}
              />
            </Field>
          </Card>

          {saving && (
            <Notice tone="lime" title={`Meeting ${saving.at} of ${saving.total}: reading your notes…`}>
              This can take a minute for long transcripts. Leave this page open.
            </Notice>
          )}
          {saveError && (
            <Notice tone="danger" title="Not everything was saved">
              <p>{saveError}</p>
              <Button className="mt-3" onClick={saveAll} disabled={!!saving}>
                Retry
              </Button>
            </Notice>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-6">
            <p className="text-[14px] text-muted">
              {drafts.length} {drafts.length === 1 ? "meeting" : "meetings"} ready · oldest first
            </p>
            <Button variant="primary" onClick={saveAll} disabled={!!saving}>
              {saving ? "Reading notes…" : drafts.length > 1 ? `Read ${drafts.length} meetings` : "Read these notes"}
            </Button>
          </div>
        </div>

        <aside aria-label="Steps" className="space-y-4">
          <Card className="p-5">
            <Eyebrow>How it works</Eyebrow>
            <ol className="mt-4 space-y-4">
              {[
                ["Paste or upload", "Add each weekly transcript, oldest first."],
                ["Review what was promised", "Check every proposed task against the exact words in the notes."],
                ["Approve and notify", "Approved tasks go on the board. Each owner gets a morning email."],
              ].map(([title, body], i) => (
                <li key={title} className="flex gap-3">
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-lime-soft font-semibold text-forest">{i + 1}</span>
                  <span>
                    <span className="block font-semibold">{title}</span>
                    <span className="text-[14px] text-muted">{body}</span>
                  </span>
                </li>
              ))}
            </ol>
          </Card>
        </aside>
      </div>
    </>
  );
}
