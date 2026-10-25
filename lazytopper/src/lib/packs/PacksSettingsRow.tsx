/** PacksSettingsRow — PACKS-ENTRY-1 (d): the "PDF packs / My packs" card of Settings; shown only to a student who owns a pack. */
import { useNavigate } from "react-router-dom";
import { firePackEntryClick, packsHref } from "./packEntry";
import { useOwnsAnyPack } from "./myPacksCache";

export default function PacksSettingsRow({ uid, headingId, onClose }: { uid: string; headingId: string; onClose: () => void }) {
  const navigate = useNavigate();
  const owns = useOwnsAnyPack(uid, true);
  if (!owns) return null;
  return (
    <section className="lt-set__card" aria-labelledby={headingId} data-testid="settings-my-packs">
      <h3 className="lt-set__h" id={headingId}>
        PDF packs
      </h3>
      <button
        type="button"
        className="lt-set__btn"
        onClick={() => {
          firePackEntryClick("account");
          onClose();
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
    </section>
  );
}
