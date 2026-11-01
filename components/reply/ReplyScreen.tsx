"use client";

// The "reply here" page: the morning email's numbered tasks and a box for the same plain-language update.
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { errorText, postJson } from "@/components/api";
import { StatusPill, STATUS_LABEL } from "@/components/board/pieces";
import { formatDay } from "@/components/format";
import { Button, Card, Field, inputClass, Notice, PageHead } from "@/components/ui";
import type { ReplyPageData, ReplyPageResponse } from "@/lib/contracts/api";
import type { TaskStatus } from "@/lib/contracts/domain";

type Applied = ReplyPageResponse["applied"][number];

function appliedLine(a: Applied): string | null {
  if (a.field === "status") return `Marked ${STATUS_LABEL[a.new_value as TaskStatus]}.`;
  if (a.field === "blocker" && a.new_value) return `Blocker noted: ${a.new_value}.`;
  if (a.field === "date_request" && a.new_value) return `Asked to move the date to ${formatDay(a.new_value)}. The date changes once approved.`;
  return null;
}

async function loadPage(url: string): Promise<ReplyPageData> {
  const res = await fetch(url);
  const data: unknown = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(typeof data === "object" && data && "error" in data ? String(data.error) : "Could not load your tasks.");
  return data as ReplyPageData;
}

export function ReplyScreen() {
  const { code } = useParams<{ code: string }>();
  const url = `/api/reply/${encodeURIComponent(code)}`;
  const [page, setPage] = useState<ReplyPageData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [result, setResult] = useState<ReplyPageResponse | null>(null);

  useEffect(() => {
    let live = true;
    loadPage(url)
      .then((data) => live && setPage(data))
      .catch((e) => live && setLoadError(errorText(e)));
    return () => {
      live = false;
    };
  }, [url]);

  async function submit() {
    setSaving(true);
    setSaveError(null);
    setResult(null);
    try {
      const res = await postJson<ReplyPageResponse>(url, { text });
      setResult(res);
      if (res.applied.length) setText("");
      setPage(await loadPage(url));
    } catch (e) {
      setSaveError(errorText(e));
    } finally {
      setSaving(false);
    }
  }

  if (loadError) return <Notice tone="danger" title="Could not open this page">{loadError}</Notice>;
  if (!page) return <p className="text-muted">Loading your tasks…</p>;

  const lines = (result?.applied ?? []).map(appliedLine).filter((l): l is string => l !== null);

  return (
    <>
      <PageHead eyebrow="Loose Ends" title={`Hi ${page.name}`} subtitle="Tell us how your tasks are going, in your own words." />

      <Card className="p-5">
        <ol className="divide-y divide-line">
          {page.tasks.map((t) => (
            <li key={t.n} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-3 first:pt-0 last:pb-0">
              <span className="min-w-0 flex-1 text-[15.5px] text-ink">
                <span className="font-semibold">{t.n}.</span> {t.title}
                <span className="mt-0.5 block text-[13.5px] text-muted">Due: {formatDay(t.due_date)}</span>
              </span>
              <StatusPill status={t.status} />
            </li>
          ))}
        </ol>
      </Card>

      <div className="mt-6 space-y-4">
        <Field label="Your update" hint={`For example "1 is done" or "2 needs until Friday, waiting on finance".`}>
          <textarea rows={4} maxLength={5000} value={text} onChange={(e) => setText(e.target.value)} className={inputClass} />
        </Field>
        <Button variant="primary" disabled={saving || !text.trim()} onClick={submit}>
          {saving ? "Reading your update…" : "Send update"}
        </Button>

        {saveError && <Notice tone="danger" title="Not saved">{saveError}</Notice>}
        {result && lines.length > 0 && (
          <Notice tone="ok" title="Update saved">
            <ul className="space-y-1">{lines.map((l, i) => <li key={i}>{l}</li>)}</ul>
          </Notice>
        )}
        {result?.question && <Notice tone="warn" title="One question">{result.question}</Notice>}
        {result && lines.length === 0 && !result.question && (
          <Notice tone="warn" title="Nothing changed">
            We could not tell which task you meant. Try using its number, for example &quot;1 is done&quot;.
          </Notice>
        )}
      </div>
    </>
  );
}
