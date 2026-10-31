# Getting set up (teammates, about 30 minutes)

## 1. Install (once)
1. **GitHub account**: github.com → Sign up. Send your username to Iliyan; accept the invite email.
2. **Git**: Mac — open Terminal and type `git --version`; if it offers to install developer tools, accept. Windows — git-scm.com.
3. **Node.js**: nodejs.org → download the **LTS** version → install.
4. **Claude Code**: follow the install steps at docs.claude.com (Claude Code → Quickstart) and sign in with your Claude account.

## 2. Get the code
In Terminal:
```
git clone https://github.com/<iliyan's-account>/loose-ends.git
cd loose-ends
npm install
```

## 3. Add the settings
Copy `.env.example` to a new file named `.env.local` in the same folder and paste in the values Iliyan sent you
(front-end only needs the two `NEXT_PUBLIC_SUPABASE_...` lines). Never commit or share this file.

## 4. Run it
```
npm run dev
```
Open http://localhost:3000. Then open http://localhost:3000/api/health — "database: ok" means you're connected.

## 5. Work with Claude
In the `loose-ends` folder, type `claude` to start Claude Code. It reads `CLAUDE.md` automatically, which tells it
the plan, the rules and which folders are yours. A good first message:

> Read CLAUDE.md, docs/agreements.md and docs/api.md. I'm <name>, working on <your tasks from docs/team-tasks.md>.
> Make a branch called <fe-yourname> and let's start with <first screen>. Match docs/mockups/.

When something works: ask Claude to "commit and push my branch and open a pull request". Iliyan merges.

## Stuck?
Post in the group chat: what you tried, the error message, and the output of `/api/health`.
