/**
 * YourPacksHomeCard - PAID-SHOWS-1 (owner 12 Nov 2026): a signed-in pack owner finds their packs from Home. One compact card,
 * in the lazy pack-entry chunk. Reads the REAL owned list (the one per-session ownership request); owns nothing, or not known
 * yet / the request failed -> renders nothing. No fake status, no offer, no price.
 */
import { Link } from "react-router-dom";
import { firePackEntryClick, packsHref } from "./packEntry";
import { peekOwnsAnyPack, useOwnedPackCount } from "./myPacksCache";
import { hintNow, readMineHint } from "../../components/packs/mineHint";

export default function YourPacksHomeCard({ uid }: { uid: string }) {
  const count = useOwnedPackCount(uid, true);
  if (count < 1) {
    // No layout shift on a cold load: a device that already knows this account owns packs (the per-device layout hint, never
    // ownership itself) holds the card's space until the real answer lands. Answered "no packs" / failed -> nothing.
    let reserve = false;
    try {
      reserve = peekOwnsAnyPack(uid) === null && readMineHint(uid, window.innerWidth, hintNow()) !== null;
    } catch {
      reserve = false;
    }
    return reserve ? (
      <div className="lt-yourpacks lt-yourpacks--hold" aria-hidden="true" data-testid="home-your-packs-hold">
        <style>{CSS}</style>
      </div>
    ) : null;
  }
  return (
    <Link
      to={packsHref({ hash: "my-packs" })}
      className="lt-yourpacks"
      data-testid="home-your-packs"
      onClick={() => firePackEntryClick("home-card")}
    >
      <span className="lt-yourpacks__t">{`Your packs (${count})`}</span>
      <span className="lt-yourpacks__go">Open &rarr;</span>
      <style>{CSS}</style>
    </Link>
  );
}

const CSS = `
.lt-yourpacks { display: flex; align-items: center; justify-content: space-between; gap: 12px; box-sizing: border-box; min-height: 48px; margin: 0 0 12px; padding: 10px 16px; border-radius: 14px; border: 1px solid hsl(150, 30%, 78%); background: hsl(150, 40%, 97%); color: hsl(222, 47%, 20%); font-weight: 700; text-decoration: none; }
.lt-yourpacks--hold { visibility: hidden; border-color: transparent; }
.lt-yourpacks__go { font-weight: 700; color: hsl(152, 60%, 26%); }
.lt-yourpacks:focus-visible { outline: 2px solid hsl(152, 60%, 38%); outline-offset: 2px; }
`;
