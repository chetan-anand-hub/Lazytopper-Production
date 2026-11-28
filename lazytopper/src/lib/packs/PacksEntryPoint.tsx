/** PacksEntryPoint — PACKS-ENTRY-1: the single lazy chunk behind every eager pack entry (see packEntryLazy.ts). */
import MyPacksMeCard from "./MyPacksMeCard";
import MyPacksMenuRow from "./MyPacksMenuRow";
import YourPacksHomeCard from "./YourPacksHomeCard";
import PacksFooterLink from "./PacksFooterLink";
import PacksNoteCard from "./PacksNoteCard";
import PacksCbqCard from "./PacksCbqCard";
import PacksSettingsRow from "./PacksSettingsRow";
import { usePaidPremium } from "./usePaidPremium";
import PacksWallButton from "./PacksWallButton";

export type PacksEntryProps =
  | { kind: "footer-link"; href: string }
  | { kind: "footer-menu"; onDone: () => void }
  | { kind: "account-row"; uid: string; onDone: () => void; variant?: "mobile" | "desktop" }
  | { kind: "me-card"; uid: string }
  | { kind: "home-card"; uid: string }
  | { kind: "wall"; chapter: string | null; light?: boolean }
  | {
      kind: "note-card";
      topicKey: string;
      title: string;
      /** SEO-SELL-1: "Maths" | "Science" (for the CBQ line of the top card). */
      subject?: string | null;
      /** SEO-SELL-1: which page family and where on it; the defaults are the original notes end card. */
      surface?: "notes" | "ncert" | "freemcq" | "iqotd";
      position?: "top" | "end";
    }
  /** SEO-SELL-2: the subject CBQ Pack card (+ Board Pass link on the Important Questions page) at the end of a page with no chapter pack. */
  | { kind: "cbq-card"; subject: string | null | undefined; surface: "iqotd" | "hpq"; boardPass?: boolean }
  | { kind: "settings-row"; uid: string; headingId: string; onClose: () => void };

export default function PacksEntryPoint(props: PacksEntryProps) {
  // Owner ruling: a student who has BOUGHT Premium sees no pack OFFER. "My packs" (re-download access) is not an offer.
  const paid = usePaidPremium();
  if (paid && props.kind !== "account-row" && props.kind !== "settings-row" && props.kind !== "me-card" && props.kind !== "home-card") return null;
  switch (props.kind) {
    case "footer-link":
      return <PacksFooterLink variant="link" href={props.href} />;
    case "footer-menu":
      return <PacksFooterLink variant="menu" onDone={props.onDone} />;
    case "account-row":
      return <MyPacksMenuRow uid={props.uid} onDone={props.onDone} variant={props.variant} />;
    case "me-card":
      return <MyPacksMeCard uid={props.uid} />;
    case "home-card":
      return <YourPacksHomeCard uid={props.uid} />;
    case "wall":
      return <PacksWallButton chapter={props.chapter} light={props.light} />;
    case "note-card":
      return <PacksNoteCard topicKey={props.topicKey} title={props.title} subject={props.subject} surface={props.surface} position={props.position} />;
    case "cbq-card":
      return <PacksCbqCard subject={props.subject} surface={props.surface} boardPass={props.boardPass} />;
    case "settings-row":
      return <PacksSettingsRow uid={props.uid} headingId={props.headingId} onClose={props.onClose} />;
  }
}
