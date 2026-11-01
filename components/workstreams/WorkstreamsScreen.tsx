"use client";

// Workstreams (/workstreams): every workstream as a card, the same cards as the Overview (BUILD-SPEC §3, row 8).
import { useEffect, useState } from "react";
import { errorText } from "@/components/api";
import { loadBoard, type Board } from "@/components/board/data";
import { sortStreams } from "@/components/board/logic";
import { useLiveVersion } from "@/components/board/pieces";
import { WorkstreamCard } from "@/components/board/WorkstreamCard";
import { Button, Card, Notice, PageHead } from "@/components/ui";

export function WorkstreamsScreen() {
  const [board, setBoard] = useState<Board | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const [now, setNow] = useState(0);
  const live = useLiveVersion("workstreams");

  useEffect(() => {
    let alive = true;
    loadBoard({ activityLimit: 1 })
      .then((b) => {
        if (!alive) return;
        setBoard(b);
        setError(null);
        setNow(Date.now());
      })
      .catch((e: unknown) => alive && setError(errorText(e)));
    return () => {
      alive = false;
    };
  }, [live, retry]);

  return (
    <>
      <PageHead thread="short" title="Every workstream, one owner each." subtitle="Open one to see its tasks, who is doing them, and the latest reply on each." />
      {error && (
        <div className="space-y-4">
          <Notice tone="danger" title="Couldn’t load the workstreams">
            {error}
          </Notice>
          <Button onClick={() => setRetry((r) => r + 1)}>Retry</Button>
        </div>
      )}
      {!board && !error && <div className="h-56 animate-pulse rounded-card border border-line bg-paper" />}
      {board && board.streams.length === 0 && (
        <Card className="p-6">
          <p className="font-semibold">No workstreams yet.</p>
          <p className="mt-1 text-muted">Load the seed data, or add workstreams in Supabase.</p>
        </Card>
      )}
      <div className="grid gap-4 min-[1200px]:grid-cols-2">
        {sortStreams(board?.streams ?? []).map((s) => (
          <WorkstreamCard
            key={s.id}
            stream={s}
            tasks={board?.tasks.filter((t) => t.workstream_id === s.id) ?? []}
            decisions={board?.decisions.filter((d) => d.workstream_id === s.id) ?? []}
            now={now}
          />
        ))}
      </div>
    </>
  );
}
