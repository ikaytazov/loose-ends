"use client";

// Reads the meeting from the URL for /capture/review/[meetingId]. ?queue= lists the other meetings from the
// same upload, oldest first, so the lead can step through them.
import { useParams, useSearchParams } from "next/navigation";
import { ReviewScreen } from "@/components/review/ReviewScreen";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function ReviewRoute() {
  const { meetingId } = useParams<{ meetingId: string }>();
  const queue = (useSearchParams().get("queue") ?? "").split(",").filter((id) => UUID.test(id));
  // key= resets the screen when the lead moves on to the next meeting in the upload.
  return <ReviewScreen key={meetingId} meetingId={meetingId} queue={queue} />;
}
