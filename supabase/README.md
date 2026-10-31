# Database

Live project: **LooseEnds** (Supabase org SignalRidge), `https://bswkdagxdpcrdakmugiz.supabase.co`.

Every file in `migrations/` has been applied to the live database, in order. File names match the versions
Supabase recorded. To change the schema, add a NEW file (never edit an applied one) and update
`lib/contracts/domain.ts` and `docs/agreements.md` in the same pull request — agree it in the group chat first.

`seed.sql` (demo data) is owned by whoever picks up "Seed data" in `docs/team-tasks.md`.
