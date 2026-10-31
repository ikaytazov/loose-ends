# Getting set up (teammates)

## Your tasks
All tasks are **GitHub issues**: https://github.com/ikaytazov/loose-ends/issues
- Yours have your name in the title, e.g. `[Valerie] Team list screen`.
- Tasks labelled **up for grabs** are unassigned. To take one: comment "I'll take this" on the issue and click
  **Assignees → assign yourself** (right-hand side). Then post in the group chat.
- When your pull request says "Closes #N", the issue closes itself when Iliyan merges it.

## Option A — in your browser (easiest, nothing to install)
1. **GitHub account**: github.com → Sign up. Send your username to Iliyan and accept the invite email
   (or open https://github.com/ikaytazov/loose-ends/invitations).
2. Go to **claude.ai/code**, sign in with your Claude account, and click **connect GitHub** when asked.
3. Pick the repository **ikaytazov/loose-ends**.
4. Open your issue on GitHub, copy the text in its **Start working** box, paste it into Claude, press Enter.
5. Claude reads `CLAUDE.md` (the plan, the rules, which folders are yours), makes a branch, writes the code
   and checks the build. When it's done: **Create PR**. Iliyan reviews and merges.
6. To keep going on the same task, keep chatting in the same session; it updates the same pull request.

**Seeing your screen:** Vercel builds every pull request and posts a **preview link** on it (look for the Vercel
comment on the pull request). That preview uses the real database. If no preview appears, tell Iliyan.

## Option B — on your own laptop (only if you want to click around locally while you build)
1. Install **Git** (Mac: run `git --version` in Terminal and accept the developer tools), **Node.js LTS** (nodejs.org),
   and **Claude Code** (code.claude.com → Quickstart).
2. In Terminal:
   ```
   git clone https://github.com/ikaytazov/loose-ends.git
   cd loose-ends
   npm install
   ```
3. Copy `.env.example` to `.env.local` and paste the two `NEXT_PUBLIC_SUPABASE_...` values from the group chat.
4. `npm run dev` → open http://localhost:3000 (and http://localhost:3000/api/health to check the database).
5. Type `claude` in the `loose-ends` folder and paste the **Start working** text from your issue.

## Stuck?
Post in the group chat: the issue number, what you asked Claude, and the error it shows.
