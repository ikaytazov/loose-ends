# Database

Live project: **LooseEnds** (Supabase org SignalRidge), `https://bswkdagxdpcrdakmugiz.supabase.co`.

Every file in `migrations/` has been applied to the live database, in order. File names match the versions
Supabase recorded. To change the schema, add a NEW file (never edit an applied one) and update
`lib/contracts/domain.ts` and `docs/agreements.md` in the same pull request — agree it in the group chat first.

`seed.sql` is the demo data (team, workstreams, last week's tasks), built from `test-data/team.json`. Load it by pasting it into the
Supabase SQL editor and pressing Run. It clears every table first, and its dates are relative to the day it is loaded,
so load it on the day you test or record. Owner: whoever has "Seed data" in `docs/team-tasks.md`.
