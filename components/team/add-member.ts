// Add a teammate: the request and response shapes for POST /api/team-members, and the email check the form runs first.
// These mirror Part A of docs/handoff/ADD-TEAMMATE-FROM-NOTES.md (Iliyan's part). Move them to lib/contracts/api.ts
// when that lands; screens must not define API shapes for long.
import type { TeamMember } from "@/lib/contracts/domain";
import { postJson } from "@/components/api";

export type AddMemberRequest = {
  name: string;
  email: string;
  role: "member";
  assign_task_ids: string[];
  added_by: string | null;
};

export type AddMemberResponse = {
  member: TeamMember;
  assigned: number;
  existing: boolean;
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** True for a plausible address like name@company.com. The server checks again. */
export function isEmail(value: string): boolean {
  return EMAIL.test(value.trim());
}

export function addMember(body: AddMemberRequest): Promise<AddMemberResponse> {
  return postJson<AddMemberResponse>("/api/team-members", body);
}

/** Lets a name typed by hand match a team member, ignoring case and extra spaces. */
export function sameName(a: string, b: string): boolean {
  return a.trim().replace(/\s+/g, " ").toLowerCase() === b.trim().replace(/\s+/g, " ").toLowerCase();
}
