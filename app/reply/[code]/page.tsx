import { Suspense } from "react";
import { ReplyScreen } from "@/components/reply/ReplyScreen";

// Block navigation until the page is ready, like the other dynamic routes.
export const instant = false;

// Outside the (screens) group: this is reached from an email, so it has no sidebar.
export default function ReplyPage() {
  return (
    <main className="min-h-screen bg-canvas px-[18px] py-10">
      <div className="mx-auto max-w-2xl">
        <Suspense fallback={<p className="text-muted">Loading your tasks…</p>}>
          <ReplyScreen />
        </Suspense>
      </div>
    </main>
  );
}
