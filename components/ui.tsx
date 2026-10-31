// Small shared pieces, styled from the design tokens. Status is always shown with text, never colour alone.
import type { ButtonHTMLAttributes, ReactNode } from "react";

export type Tone = "ok" | "warn" | "danger" | "lime" | "grey" | "forest";

const TONE: Record<Tone, string> = {
  ok: "bg-ok-bg text-ok",
  warn: "bg-warn-bg text-warn",
  danger: "bg-danger-bg text-danger",
  lime: "bg-lime-soft text-forest",
  grey: "bg-grey-bg text-ink-2",
  forest: "bg-forest text-canvas",
};

export function Pill({ tone = "grey", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[13px] font-semibold ${TONE[tone]}`}>
      {children}
    </span>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-[14px] border border-line bg-paper shadow-card ${className}`}>{children}</section>;
}

export function Notice({ tone = "warn", title, children }: { tone?: Tone; title?: string; children?: ReactNode }) {
  return (
    <div role={tone === "danger" ? "alert" : "status"} className={`rounded-[10px] border border-line px-4 py-3 text-[14.5px] ${TONE[tone]}`}>
      {title && <p className="font-semibold">{title}</p>}
      {children && <div className={title ? "mt-1" : ""}>{children}</div>}
    </div>
  );
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="text-[12.5px] font-semibold uppercase tracking-[0.07em] text-muted">{children}</p>;
}

export function PageHead({ eyebrow, title, subtitle }: { eyebrow?: string; title: string; subtitle?: string }) {
  return (
    <header className="mb-8">
      {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
      <h1 className="mt-1 font-serif text-[clamp(36px,4vw,56px)] leading-[1.05] tracking-[-0.02em] text-ink">{title}</h1>
      {subtitle && <p className="mt-3 max-w-2xl text-[17px] text-muted">{subtitle}</p>}
    </header>
  );
}

// Primary = forest fill, secondary = outline. Every button has a visible focus ring from globals.css.
export function Button({
  variant = "secondary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" }) {
  const styles = {
    primary: "bg-forest text-canvas hover:bg-forest-2 disabled:bg-muted",
    secondary: "border border-line bg-paper text-ink hover:bg-canvas disabled:text-muted",
    ghost: "text-forest-2 hover:underline disabled:text-muted",
  }[variant];
  return (
    <button
      type="button"
      {...props}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-[10px] px-4 text-[15px] font-semibold transition-colors disabled:cursor-not-allowed ${styles} ${className}`}
    />
  );
}

export function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[14.5px] font-semibold text-ink">{label}</span>
      {children}
      {hint && !error && <span className="mt-1 block text-[13.5px] text-muted">{hint}</span>}
      {error && <span className="mt-1 block text-[13.5px] font-semibold text-danger">{error}</span>}
    </label>
  );
}

export const inputClass =
  "mt-1.5 w-full rounded-[10px] border border-line bg-paper px-3 py-2.5 text-[15.5px] text-ink placeholder:text-muted focus:border-forest-2";
