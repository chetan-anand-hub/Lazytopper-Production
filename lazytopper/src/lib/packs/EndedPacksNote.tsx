/**
 * EndedPacksNote - REDOWNLOAD-ENFORCE-1: My packs' line for each pack whose re-download date has passed (the server's
 * `endedPacks`). Plain statements only: no Download button, no Retry, no offer. Renders nothing when the list is empty.
 */
import { meCardPackTitle } from "./MyPacksMeCard";
import { endedPackMessage, type EndedPack } from "./packEnded";

export default function EndedPacksNote({ ended }: { ended: readonly EndedPack[] }) {
  if (ended.length === 0) return null;
  return (
    <div className="lt-packs-ended" data-testid="packs-ended" role="note">
      <ul className="lt-packs-ended__list">
        {ended.map((e) => (
          <li key={e.packId} className="lt-packs-ended__item">
            {endedPackMessage(meCardPackTitle(e), e)}
          </li>
        ))}
      </ul>
      <style>{CSS}</style>
    </div>
  );
}

const CSS = `
.lt-packs-ended { box-sizing: border-box; min-width: 0; margin: 12px 0 0; padding: 12px 14px; border-radius: 12px; border: 1px solid hsl(222, 20%, 85%); background: hsl(222, 30%, 97%); color: hsl(222, 47%, 20%); }
.lt-packs-ended__list { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 4px; font-size: 13.5px; line-height: 1.45; }
.lt-packs-ended__item { overflow-wrap: anywhere; }
`;
