"use client";

// Reads the workstream id from the URL for /workstreams/[id].
import { useParams } from "next/navigation";
import { WorkstreamScreen } from "@/components/workstreams/WorkstreamScreen";

export function WorkstreamRoute() {
  const { id } = useParams<{ id: string }>();
  // key= resets filters and the open task when moving to another workstream.
  return <WorkstreamScreen key={id} id={id} />;
}
