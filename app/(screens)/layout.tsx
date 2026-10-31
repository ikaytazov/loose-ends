// Every screen under this group shares the sidebar and top bar. app/page.tsx (Overview) is outside the group until it is built.
import type { ReactNode } from "react";
import { AppShell } from "@/components/shell/AppShell";

export default function ScreensLayout({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
