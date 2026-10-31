// Request and response shapes for every route in app/api. Documented in docs/api.md.
// Screens call these routes for every change; they never write to Supabase directly.
import { z } from "zod";
import type { DateRequest, Task } from "./domain";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD");

// POST /api/notes  — paste notes, get proposed tasks back
export const PasteNotesRequest = z.object({
  title: z.string().min(1),
  meeting_date: isoDate,
  attendees: z.array(z.string()).default([]),
  notes: z.string().min(1),
});
export type PasteNotesRequest = z.infer<typeof PasteNotesRequest>;
export interface PasteNotesResponse {
  meeting_id: string;
  tasks: Task[]; // status "proposed"; owner_id/workstream_id filled when the AI matched a name
}

// POST /api/meetings/[id]/approve  — the lead approves the reviewed list
export const ApproveMeetingRequest = z.object({
  tasks: z.array(
    z.object({
      id: z.string().uuid(),
      title: z.string().min(1),
      owner_id: z.string().uuid().nullable(),
      workstream_id: z.string().uuid().nullable(),
      due_date: isoDate.nullable(),
      priority: z.enum(["high", "medium", "low"]),
      keep: z.boolean().default(true), // false = lead deleted this proposed task
    }),
  ),
});
export type ApproveMeetingRequest = z.infer<typeof ApproveMeetingRequest>;
export interface ApproveMeetingResponse {
  approved: number;
  removed: number;
}

// POST /api/tasks/[id]/assign  — give a task an owner
export const AssignOwnerRequest = z.object({
  owner_id: z.string().uuid(),
  acted_by: z.string().uuid().nullable().default(null),
});
export interface AssignOwnerResponse {
  task: Task;
}

// POST /api/date-requests/[id]/decide  — approve or decline a new due date
export const DecideDateRequest = z.object({
  decision: z.enum(["approved", "declined"]),
  decided_by: z.string().uuid().nullable().default(null),
});
export interface DecideDateResponse {
  date_request: DateRequest;
  task: Task;
}

// POST /api/emails/send-morning  — "Send morning emails now" button (and the 8 am job)
export const SendMorningRequest = z.object({
  member_id: z.string().uuid().optional(), // omit = everyone with open tasks
});
export interface SendMorningResponse {
  sent: number;
  recipients: string[];
}

// POST /api/inbound  — called by the Gmail bridge (Apps Script) for each new email. Not for screens.
export const InboundEmail = z.object({
  gmail_message_id: z.string(),
  from: z.string(),
  to: z.string(),
  subject: z.string().default(""),
  text: z.string(),
  received_at: z.string(),
});
export type InboundEmail = z.infer<typeof InboundEmail>;
export interface InboundResponse {
  ok: boolean;
  status: "applied" | "duplicate" | "unknown_sender" | "no_tasks" | "error";
  applied: { task_id: string; field: string; new_value: string | null }[];
  question: string | null;
}

/** Every route returns this shape on failure, with an HTTP 4xx/5xx status. */
export interface ApiError {
  error: string;
}
