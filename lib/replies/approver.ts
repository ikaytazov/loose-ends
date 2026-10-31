// Who approves a new due date (rule in docs/agreements.md):
// the workstream owner; if the person asking owns that workstream (or there is no owner), the team lead.
export function pickApprover(opts: {
  requesterId: string;
  workstreamOwnerId: string | null;
  leadId: string | null;
}): string | null {
  const { requesterId, workstreamOwnerId, leadId } = opts;
  if (workstreamOwnerId && workstreamOwnerId !== requesterId) return workstreamOwnerId;
  return leadId;
}
