/** PacksEntryPoint — PACKS-ENTRY-1: the single lazy chunk behind every eager pack entry (see packEntryLazy.ts). */
import MyPacksMenuRow from "./MyPacksMenuRow";
import PacksFooterLink from "./PacksFooterLink";
import PacksNoteCard from "./PacksNoteCard";
import PacksSettingsRow from "./PacksSettingsRow";
import { usePaidPremium } from "./usePaidPremium";
import PacksWallButton from "./PacksWallButton";

export type PacksEntryProps =
  | { kind: "footer-link"; href: string }
  | { kind: "footer-menu"; onDone: () => void }
  | { kind: "account-row"; uid: string; onDone: () => void }
  | { kind: "wall"; chapter: string | null; light?: boolean }
  | { kind: "note-card"; topicKey: string; title: string }
  | { kind: "settings-row"; uid: string; headingId: string; onClose: () => void };

export default function PacksEntryPoint(props: PacksEntryProps) {
  // Owner ruling: a student who has BOUGHT Premium sees no pack OFFER. "My packs" (re-download access) is not an offer.
  const paid = usePaidPremium();
  if (paid && props.kind !== "account-row" && props.kind !== "settings-row") return null;
  switch (props.kind) {
    case "footer-link":
      return <PacksFooterLink variant="link" href={props.href} />;
    case "footer-menu":
      return <PacksFooterLink variant="menu" onDone={props.onDone} />;
    case "account-row":
      return <MyPacksMenuRow uid={props.uid} onDone={props.onDone} />;
    case "wall":
      return <PacksWallButton chapter={props.chapter} light={props.light} />;
    case "note-card":
      return <PacksNoteCard topicKey={props.topicKey} title={props.title} />;
    case "settings-row":
      return <PacksSettingsRow uid={props.uid} headingId={props.headingId} onClose={props.onClose} />;
  }
}
