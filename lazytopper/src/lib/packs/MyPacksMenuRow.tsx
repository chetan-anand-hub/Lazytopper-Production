/**
 * MyPacksMenuRow — PACKS-ENTRY-1 (d): the "My packs" row of the mobile account menu, in the lazy pack-entry chunk so the
 * hook, the cache and the icon stay out of the entry bundle. Mounted only while the menu is open (so the one
 * per-session ownership lookup happens then, never on page load) and renders nothing unless the student owns a pack.
 * Looks like its neighbours (Me / Progress, Settings, Log out): a 44px menu row, plus a small document icon.
 */
import { useNavigate } from "react-router-dom";
import { firePackEntryClick, packsHref } from "./packEntry";
import { useOwnsAnyPack } from "./myPacksCache";

export default function MyPacksMenuRow({ uid, onDone }: { uid: string; onDone: () => void }) {
  const navigate = useNavigate();
  const owns = useOwnsAnyPack(uid, true);
  if (!owns) return null;
  return (
    <>
      <button
        type="button"
        role="menuitem"
        className="lt-packs-row"
        onClick={() => {
          firePackEntryClick("account");
          onDone();
          navigate(packsHref({ hash: "my-packs" }));
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
          <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
          <path d="M14 3v5h5" />
          <path d="M9 13h6M9 17h6" />
        </svg>
        My packs
      </button>
      <style>{ROW_CSS}</style>
    </>
  );
}

const ROW_CSS = `
.lt-packs-row { display: flex; align-items: center; gap: 8px; box-sizing: border-box; min-height: 44px; padding: 9px 8px; border: none; border-radius: 6px; background: transparent; color: var(--mob-fg); font-weight: 600; text-align: left; cursor: pointer; -webkit-tap-highlight-color: transparent; }
`;
