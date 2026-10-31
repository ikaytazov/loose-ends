// Every screen under this group shares the sidebar and top bar. app/page.tsx (Overview) is outside the group until it is built.
import { Suspense, type ReactNode } from "react";
import { AppShell } from "@/components/shell/AppShell";

export default function ScreensLayout({ children }: { children: ReactNode }) {
  // The shell reads the current path, which Next.js needs a Suspense boundary for when it prerenders.
  return (
    <Suspense fallback={null}>
      <AppShell>{children}</AppShell>
    </Suspense>
  );
}
