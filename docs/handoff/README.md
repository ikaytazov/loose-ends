# Loose Ends: front-end build package for Claude Code

Prepared 31 Oct 2026 for Telly (Valerie). It takes the clickable prototype into the `ikaytazov/loose-ends` repo.

## What's in here

| File | Use it for |
|---|---|
| `CLAUDE-CODE-PROMPT.md` | **Start here.** Paste it into Claude Code as the first message, with your assigned issue below it. |
| `BUILD-SPEC.md` | Screen-by-screen spec: file path, data source, route, states, acceptance criteria and build order. |
| `REPO-FACTS.md` | What the repo actually contains today: routes, views, types, settings. Includes the gaps found and the questions for Iliyan. |
| `DESIGN-SYSTEM.md` + `design/tokens.css` | Colours, type and components. Drop the `@theme` block into `app/globals.css`. |
| `TEST-PATH.md` | End-to-end path for Jerry and Abir, mapped to US-01…US-12 from the use-case brief. |
| `prototype/loose-ends-prototype.html` | The working prototype. Open it in a browser; Claude Code should read it for layout, copy and behaviour. |
| `screenshots/` | Prototype screens at desktop width (1440px) and on a 375px phone. |
| `references/` | Your 7 screen designs, the PRD, the technical spec, and the use-case/JTBD brief. |

## The one-paragraph version

Loose Ends turns meeting transcripts into tasks the lead approves. Each owner gets an 8 a.m. email from `signalridgeco@gmail.com`, Pacific time. They answer in plain words and the board updates. Requests for more time wait for the workstream owner. Screens **read** from Supabase views and **change** things only through the routes in `docs/api.md`. The prototype shows how it should look and behave. Its demo data, simulated AI and "Demo tools" menu must **not** be copied into the app.

## How to use it

1. Accept the GitHub invite, then open Claude Code on `ikaytazov/loose-ends` and create branch `fe-valerie` (or one branch per issue).
2. Upload this whole folder, or the zip, to the Claude Code session. Put it in `docs/handoff/`; don't scatter it across the repo.
3. Paste `CLAUDE-CODE-PROMPT.md`, then the full text of your assigned GitHub issue.
4. Build in the order in `BUILD-SPEC.md` §1. Capture → Review → Approve is the critical path Iliyan named.
5. Open a small PR per screen with a Vercel preview link. Iliyan merges.
