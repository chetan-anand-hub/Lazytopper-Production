/**
 * CommunityRow - SOCIAL-2. One compact line under "Free chapter practice" on /cbse/class-10: the free daily Important Question
 * channels, as plain links to the internal short links (/whatsapp, /telegram, /discord - vercel.json redirects).
 * Static (it is in the prerendered HTML), so nothing arrives late and nothing moves. VITE_COMMUNITY_ROW_DISABLED=1 renders nothing.
 */
import "./communityRow.css";

export const COMMUNITY_ROW_LEAD = "Get a free Important Question every morning:";
export const COMMUNITY_ROW_LINKS: ReadonlyArray<{ label: string; href: string }> = [
  { label: "WhatsApp", href: "/whatsapp" },
  { label: "Telegram", href: "/telegram" },
  { label: "Discord", href: "/discord" },
];

export function isCommunityRowKilled(): boolean {
  try {
    return /^(1|true|on|yes)$/i.test(String(import.meta.env.VITE_COMMUNITY_ROW_DISABLED ?? "").trim());
  } catch {
    return false;
  }
}

export default function CommunityRow() {
  if (isCommunityRowKilled()) return null;
  return (
    <p className="lt-community" data-testid="community-row">
      <span className="lt-community__lead">{COMMUNITY_ROW_LEAD}</span>{" "}
      {COMMUNITY_ROW_LINKS.map((l, i) => (
        <span key={l.href}>
          {i > 0 && <span aria-hidden="true"> &middot; </span>}
          <a className="lt-community__link" href={l.href} target="_blank" rel="noopener">
            {l.label}
          </a>
        </span>
      ))}
    </p>
  );
}
