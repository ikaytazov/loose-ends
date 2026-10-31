// Placeholder home page. Owner: front-end (Jerry) — replace with the Overview screen from docs/mockups/01-overview.png.
export default function Home() {
  return (
    <main className="mx-auto max-w-2xl p-10 font-sans">
      <h1 className="text-3xl font-semibold text-[#173d2f]">Loose Ends</h1>
      <p className="mt-2 text-neutral-600">The app is running. Screens are being built.</p>
      <ul className="mt-6 list-disc pl-5 text-neutral-700">
        <li>
          <a className="underline" href="/api/health">/api/health</a> — settings and database check
        </li>
        <li>Plan and rules: CLAUDE.md and the docs folder in the repository</li>
      </ul>
    </main>
  );
}
