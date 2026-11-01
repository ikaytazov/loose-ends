// Helpers for the one team address (Gmail) and the code we put in reply-to addresses.
// Gmail delivers name+anything@gmail.com to name@gmail.com, so
//   signalridgeco+le-k3x9p2@gmail.com  reaches the team inbox AND tells us which email was answered.

const CODE_PREFIX = "le-";

export function newReplyCode(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function replyAddress(teamEmail: string, code: string): string {
  const [local, domain] = teamEmail.split("@");
  return `${local}+${CODE_PREFIX}${code}@${domain}`;
}

/** The "reply here" page for one morning email. */
export function replyPageUrl(appUrl: string, code: string): string {
  return `${appUrl.replace(/\/+$/, "")}/reply/${code}`;
}

/** Find our code in a To/Cc header such as `"Loose Ends" <signalridgeco+le-k3x9p2@gmail.com>`. */
export function findReplyCode(toHeader: string): string | null {
  const m = toHeader.match(/\+le-([a-z0-9]+)@/i);
  return m ? m[1].toLowerCase() : null;
}

/** Pull the bare address out of `"Priya Shah" <priya@example.com>`. */
export function bareAddress(header: string): string {
  const m = header.match(/<([^>]+)>/);
  return (m ? m[1] : header).trim().toLowerCase();
}

/**
 * The inbox an address really reaches. Gmail ignores dots and anything after "+" in the name, so
 * abir.alameddine@gmail.com, abiralameddine@gmail.com and abiralameddine+maya@gmail.com are one inbox.
 * Other providers are only lower-cased.
 */
export function inboxOf(address: string): string {
  const [local = "", domain = ""] = bareAddress(address).split("@");
  if (domain !== "gmail.com" && domain !== "googlemail.com") return `${local}@${domain}`;
  return `${local.split("+")[0].replace(/\./g, "")}@gmail.com`;
}

/** Drop the quoted earlier email and signature from a reply, keeping only what the person wrote. */
export function stripQuoted(text: string): string {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];
  for (const line of lines) {
    const t = line.trim();
    if (/^On .+wrote:$/i.test(t) || /^On .+, at .+, .+$/i.test(t) && t.endsWith("wrote:")) break;
    if (/^-{2,}\s*Original Message\s*-{2,}/i.test(t)) break;
    if (/^From: .+/i.test(t) && out.length > 0) break;
    if (t === "--" || t === "-- ") break; // signature
    if (/^Sent from my (iPhone|iPad|Android|phone)/i.test(t)) break;
    if (t.startsWith(">")) continue;
    out.push(line);
  }
  // Gmail sometimes wraps "On ... wrote:" over two lines
  const joined = out.join("\n");
  const cut = joined.search(/\nOn [^\n]+\n?[^\n]*wrote:\s*$/i);
  return (cut >= 0 ? joined.slice(0, cut) : joined).trim();
}
