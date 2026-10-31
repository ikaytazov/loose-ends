// Small shared pieces, styled from the design tokens (app/globals.css). Every screen builds on these so cards,
// headings, chips and callouts look the same everywhere. Status is always shown with text, never colour alone.
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
  return <section className={`rounded-card border border-line bg-paper shadow-card ${className}`}>{children}</section>;
}

export function Notice({ tone = "warn", title, children }: { tone?: Tone; title?: string; children?: ReactNode }) {
  return (
    <div role={tone === "danger" ? "alert" : "status"} className={`rounded-control border border-line px-4 py-3 text-[14.5px] ${TONE[tone]}`}>
      {title && <p className="font-semibold">{title}</p>}
      {children && <div className={title ? "mt-1" : ""}>{children}</div>}
    </div>
  );
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="text-[12.5px] font-semibold uppercase tracking-[0.07em] text-muted">{children}</p>;
}

// The big serif headline at the top of every screen. Anything that sits above it (a back link) goes before it, not inside.
export function PageHead({ eyebrow, title, subtitle }: { eyebrow?: string; title: string; subtitle?: ReactNode }) {
  return (
    <header className="mb-8">
      {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
      <h1 className="mt-1 font-serif text-[clamp(36px,4vw,56px)] leading-[1.05] tracking-[-0.02em] text-ink">{title}</h1>
      {subtitle && <p className="mt-3 max-w-2xl text-[17px] text-muted">{subtitle}</p>}
    </header>
  );
}

// The serif heading for a section or a card ("Active workstreams", "Needs your decision", "Tasks"). One size everywhere.
export function SectionTitle({ id, icon, children, className = "" }: { id?: string; icon?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <h2 id={id} className={`flex items-center gap-2 font-serif text-[24px] leading-tight text-ink ${className}`}>
      {icon}
      {children}
    </h2>
  );
}

// A number with a label under it. With `icon` it becomes the tinted-disc tile from the Overview mockup.
export function Stat({ value, label, icon, iconClass = "bg-lime-soft text-forest" }: { value: number | string | null; label: string; icon?: ReactNode; iconClass?: string }) {
  const text = (
    <p className="min-w-0">
      <span className="block font-serif text-[34px] leading-none text-ink">{value ?? "…"}</span>
      <span className="mt-1 block text-[14px] text-muted">{label}</span>
    </p>
  );
  if (!icon) return <div className="rounded-card border border-line bg-paper p-4 shadow-card min-[640px]:p-5">{text}</div>;
  return (
    <div className="flex items-center gap-3 rounded-card border border-line bg-paper p-4 shadow-card min-[640px]:gap-4 min-[640px]:p-5">
      <span aria-hidden className={`grid size-11 shrink-0 place-items-center rounded-full ${iconClass}`}>
        {icon}
      </span>
      {text}
    </div>
  );
}

// A toggle chip for filters and pick-lists. Selected = soft lime with a lime border (see the Overview and Team mockups).
export function Chip({
  active,
  onClick,
  count,
  dot,
  children,
}: {
  active: boolean;
  onClick: () => void;
  count?: number;
  dot?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-[14.5px] font-semibold transition-colors ${
        active ? "border-lime bg-lime-soft text-forest" : "border-line bg-paper text-ink hover:bg-canvas"
      }`}
    >
      {dot && <span aria-hidden className={`size-2 rounded-full ${dot}`} />}
      {children}
      {count !== undefined && <span className="text-muted">{count}</span>}
    </button>
  );
}

// A tinted line that says why something needs attention (blocked, quiet, waiting on a decision).
const CALLOUT: Record<"danger" | "warn" | "wash", string> = {
  danger: "bg-danger-bg text-danger",
  warn: "bg-warn-bg text-warn",
  wash: "bg-lime-wash text-forest",
};

export function Callout({ tone, icon, className = "", children }: { tone: keyof typeof CALLOUT; icon?: ReactNode; className?: string; children: ReactNode }) {
  return (
    <p className={`flex items-start gap-2 rounded-control px-4 py-3 text-[14.5px] ${CALLOUT[tone]} ${className}`}>
      {icon && (
        <span aria-hidden className="mt-0.5 shrink-0">
          {icon}
        </span>
      )}
      <span>{children}</span>
    </p>
  );
}

// A source sentence, a reply or a stated reason: ivory block with a lime rule (DESIGN-SYSTEM "Quote block").
// `label` adds a small heading ("Original reply"); `quoted={false}` skips the quotation marks for a reason that is not a quote.
export function Quote({ children, by, label, quoted = true }: { children: ReactNode; by?: ReactNode; label?: string; quoted?: boolean }) {
  return (
    <figure className="rounded-control border-l-[3px] border-lime bg-canvas px-4 py-3">
      {label && <Eyebrow>{label}</Eyebrow>}
      <blockquote className={`text-[15px] leading-relaxed text-ink ${label ? "mt-1" : ""}`}>
        {quoted ? <>&ldquo;{children}&rdquo;</> : children}
      </blockquote>
      {by && <figcaption className="mt-1.5 text-[13px] text-muted">{by}</figcaption>}
    </figure>
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
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-control px-4 text-[15px] font-semibold transition-colors disabled:cursor-not-allowed ${styles} ${className}`}
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
  "mt-1.5 w-full rounded-control border border-line bg-paper px-3 py-2.5 text-[15.5px] text-ink placeholder:text-muted focus:border-forest-2";
