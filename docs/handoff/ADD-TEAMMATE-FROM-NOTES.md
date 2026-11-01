# Feature: add a new team member straight from meeting notes

**Goal:** when a transcript names someone who isn't on the team ("Sarah will draft the FAQ by Friday"), Loose Ends doesn't lose them. The review screen says **"Sarah isn't on your team yet"**. The lead adds Sarah with her email in two clicks, and Sarah's tasks are assigned to her. From then on Sarah gets the 8 a.m. email and can reply to update her tasks like everyone else.

**Today** (checked in the repo at commit `d8a68ae`): the AI is told to use only names from the team list, and `cleanUp()` in `lib/notes/extract.ts` turns any unknown name into `owner: null` + `no_owner`. Sarah's name is thrown away. There's also no route or screen that adds a team member.

---

## Part A: for Iliyan (shared contracts, AI step 1, database). Agree in the group chat first.
1. **Migration** `supabase/migrations/<timestamp>_suggested_owner.sql`:
   ```sql
   alter table public.tasks add column suggested_owner_name text;  -- name from the notes when that person isn't on the team yet
   ```
   Add `suggested_owner_name: string | null` to `Task` in `lib/contracts/domain.ts` (and to the `task_board` view if the review reads from it).
2. **`lib/contracts/domain.ts`:** add `"new_person"` to `TaskFlag`. If the `tasks.flags` column has a check constraint, extend it in the same migration.
3. **AI prompt** (`SYSTEM` in `lib/notes/extract.ts`), Owner section. Add:
   > If the owner is a named person who is NOT on the team list, still put their name in owner_name exactly as written (e.g. "Sarah", "Tom Reyes"). Do not use this for "someone", "we", "the team" or a role ("legal", "the designer").
4. **`cleanUp()`:** when `owner_name` is given but matches nobody, keep it as `suggested_owner_name`, set the owner to null, and add the flags `no_owner` and `new_person`. Ignore pronouns and roles (`someone|we|team|legal|finance|design…`). If the first name is ambiguous against two existing members, keep today's behaviour (no guess).
5. **`app/api/notes/route.ts`:** save `suggested_owner_name` on each proposed task row.
6. **New route `POST /api/team-members`** (document it in `docs/api.md`, types in `lib/contracts/api.ts`):
   ```ts
   AddMemberRequest = z.object({
     name: z.string().trim().min(1).max(80),
     email: z.string().trim().toLowerCase().email(),
     role: z.enum(["member"]).default("member"),          // new people join as members; lead stays manual
     assign_task_ids: z.array(z.string().uuid()).default([]), // proposed tasks to give them
     added_by: z.string().uuid().nullable().default(null),
   });
   // 200 { member, assigned: number, existing: boolean }
   ```
   - If the email already exists, **don't create a duplicate**: return that member with `existing: true` and still assign the tasks.
   - Assign only tasks that are still `status = 'proposed'`. For each, set `owner_id`, clear `suggested_owner_name`, and remove the `no_owner`/`new_person` flags.
   - Write `activity_log` rows: `field: 'team_member_added'` and `field: 'owner'` per task, source `app`.
   - **Abuse guard (the app has no login yet):** at most 10 new members per 24 hours (count by `created_at`), else 429 "Daily limit for new teammates reached". Once demo sign-in exists, lead only.
   - **Never send an email from this route.** The new member only gets the normal 8 a.m. email (or the protected "Send now"), which prevents instant spam.
7. **First email to a new member** (`lib/email/morning.ts`): if the member was created in the last 7 days and has never had a morning email, add one line at the top:
   > "You've been added to your team's Loose Ends by {lead name}. Reply to this email in your own words to update your tasks. If this isn't for you, reply 'remove me'."
   The reply reader can just treat "remove me" as unclear and queue it for the lead. No automatic deletion in this build.
8. **Demo reset** (`lib/demo/reset.ts`) already restores the seed, so it removes added members. Confirm it does.

## Part B: front end (Valerie). Paste this into Claude Code
```
Implement "add a new team member from meeting notes" in ikaytazov/loose-ends. Read docs/handoff/ADD-TEAMMATE-FROM-NOTES.md. Part A (migration, contracts, AI prompt, POST /api/team-members) is Iliyan's. If it hasn't merged, build against the documented contract and note the dependency in the PR. Don't edit app/api, lib/contracts, lib/notes or supabase yourself.

1. Review screen (app/(screens)/capture/review, components/review):
   - At the top, if any proposals have the flag new_person, show a card "New people in these notes", one row per distinct suggested_owner_name: "Sarah · 2 tasks", with the button "Add Sarah to the team".
   - On each proposal with new_person, replace the amber "No owner" warning with "Sarah isn't on your team yet" plus two actions: "Add Sarah" | "Choose someone else" (the existing owner dropdown).
   - "Add Sarah" opens an inline form (not a browser dialog): Name (prefilled, editable), Email (required, validated), and a pre-ticked checkbox "Give Sarah the 2 tasks from these notes". Under it: "Sarah will get a short email at 8 a.m. Pacific from signalridgeco@gmail.com with only her tasks, and can reply to update them."
   - On submit, call POST /api/team-members with assign_task_ids = the proposed tasks with that suggested name. On success, update those proposals' owner to Sarah, clear the flags, refresh the team list for every owner dropdown, and show the toast "Sarah added to the team. 2 tasks assigned." If existing:true, say "Sarah was already on the team (sarah@…). Tasks assigned." Show 400/409/429 errors inline, keeping what was typed.
   - The ready/needs-attention footer counts update immediately.
2. Team page (app/(screens)/team): add an "Add teammate" button that opens the same form (no tasks to assign). Newly added people show a small "New" tag for 7 days, and "No reply yet" until their first reply.
3. Activity: show "Maya added Sarah to the team · from Weekly launch meeting" using the team_member_added log row.
4. States and accessibility: labelled inputs, Enter submits, Esc cancels, focus returns to the button, a visible error message, and a working layout at 320px. Status is never shown by colour alone.
5. npm run build passes. The PR includes screenshots of the review card, the inline form, the success state and the Team page at 1440 and 375px, plus the Vercel preview link.
```

## Part C: acceptance test (for Jerry)
1. Paste notes containing "Sarah will draft the help-centre FAQ by Friday. Tom and Sarah will review onboarding emails next week." The review shows **New people: Sarah · 2 tasks, Tom · 1 task**. Tom's task is shared, so it may stay unclear; that's correct.
2. Add Sarah with a real test inbox you control. Both of Sarah's tasks now show Sarah as the owner, and the Team page lists Sarah with a "New" tag.
3. Approve, then use the protected "Send morning emails now". Sarah's inbox gets an email with **only her tasks**, plus the one-line introduction.
4. Sarah replies "1 is done". The task is marked done within about a minute, and Activity shows Sarah's words.
5. Add "Sarah" again with the same email: no duplicate; the tasks are assigned to the existing Sarah.
6. Bad email ("sarah@") gives an inline error and nothing is created.
7. Notes that say "someone from legal should check the contract" do **not** suggest a new person called "Legal".
8. Run the demo reset: Sarah and Tom are gone and the demo story is back.

## Honest limits to say out loud
- Until demo sign-in exists, anyone with the link could add an email. The 10-per-day cap and "no instant email" rule keep that small.
- Emails come from one Gmail account. That's fine for a demo; a real launch needs a sending service on your own domain.
- "Remove me" queues a request for the lead rather than deleting automatically.
