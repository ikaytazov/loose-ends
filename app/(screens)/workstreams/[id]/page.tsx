import { Suspense } from "react";
import { WorkstreamRoute } from "@/components/workstreams/WorkstreamRoute";

// Same setup as the Review screen: a streamed shell never finished hydrating on a dynamic route.
export const instant = false;

export default function WorkstreamPage() {
  return (
    <Suspense fallback={<p className="text-muted">Loading the workstream…</p>}>
      <WorkstreamRoute />
    </Suspense>
  );
}
