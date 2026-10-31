import { Suspense } from "react";
import { ReviewRoute } from "@/components/review/ReviewRoute";

// Block navigation until the review is ready. A streamed shell here never finished hydrating on a dynamic route.
export const instant = false;

export default function ReviewPage() {
  return (
    <Suspense fallback={<p className="text-muted">Loading the proposals…</p>}>
      <ReviewRoute />
    </Suspense>
  );
}
