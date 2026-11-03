/**
 * MyPacksMeCard - MY-PACKS-VISIBLE-1: the small "My packs" card on Me / Progress, in the lazy pack-entry chunk so the
 * entry bundle does not grow. Re-download access, not a sale: no offers, no prices, shown to Premium owners too.
 * Names come from the SERVER's list (`/api/packs/mine` via useOwnedPacks); loading, failed or empty lookup renders nothing
 * (an honest "unknown" is "not shown", never "owned"). Max 3 names, then "+N more".
 */
import { useNavigate } from "react-router-dom";
import { useOwnedPacks } from "../../components/packs/useOwnedPacks";
import type { OwnedPack } from "../../services/packs";
import { firePackEntryClick, packsHref } from "./packEntry";
import { BUNDLE_NAME, packChapterLabel } from "./packLabels";

const MAX_NAMES = 3;

/** Same wording as PacksShop's `ownedPackTitle` (a test pins the two together); kept here so this chunk never imports the shop. */
export function meCardPackTitle(p: Pick<OwnedPack, "sku" | "target">): string {
  switch (p.sku) {
    case "pack_chapter":
      return `Chapter Pack · ${packChapterLabel(p.target)}`;
    case "pack_mock":
      return `Mock Pack · ${p.target === "science" ? "Science" : "Maths"}`;
    case "pack_subject":
      return `Subject Pack · ${p.target === "science" ? "Science" : "Maths"}`;
    case "pack_cbq":
      return `${p.target === "science" ? "Science" : "Maths"} CBQ Pack`;
    case "pack_bundle":
      return BUNDLE_NAME;
    default:
      return "PDF pack";
  }
}

export default function MyPacksMeCard({ uid }: { uid: string }) {
  const navigate = useNavigate();
  const state = useOwnedPacks(uid, true);
  if (state.phase !== "ready" || state.packs.length === 0) return null;
  const names = state.packs.slice(0, MAX_NAMES).map(meCardPackTitle);
  const more = state.packs.length - names.length;
  return (
    <section className="lt-mepacks" aria-labelledby="lt-mepacks-h" data-testid="me-my-packs">
      <div className="lt-mepacks__body">
        <h2 className="lt-mepacks__h" id="lt-mepacks-h">
          My packs
        </h2>
        <ul className="lt-mepacks__list">
          {names.map((n, i) => (
            <li key={`${i}-${n}`}>{n}</li>
          ))}
          {more > 0 && <li className="lt-mepacks__more">+{more} more</li>}
        </ul>
      </div>
      <button
        type="button"
        className="lt-mepacks__btn"
        onClick={() => {
          firePackEntryClick("me-card");
          navigate(packsHref({ hash: "my-packs" }));
        }}
      >
        Open My packs
      </button>
      <style>{CSS}</style>
    </section>
  );
}

const CSS = `
.lt-mepacks { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px 16px; box-sizing: border-box; padding: 14px 16px; border-radius: 16px; border: 1px solid hsl(150, 30%, 80%); background: hsl(150, 40%, 97%); color: hsl(222, 47%, 20%); min-width: 0; }
.lt-mepacks__body { min-width: 0; flex: 1 1 220px; }
.lt-mepacks__h { margin: 0 0 6px; font-size: 15px; font-weight: 700; }
.lt-mepacks__list { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 2px; font-size: 13.5px; line-height: 1.45; }
.lt-mepacks__list li { overflow-wrap: anywhere; }
.lt-mepacks__more { color: hsl(222, 15%, 40%); font-weight: 600; }
.lt-mepacks__btn { min-height: 44px; padding: 10px 16px; border: none; border-radius: 10px; background: hsl(222, 47%, 24%); color: #fff; font-size: 14px; font-weight: 700; font-family: inherit; cursor: pointer; }
.lt-mepacks__btn:hover { background: hsl(222, 47%, 30%); }
.lt-mepacks__btn:focus-visible { outline: 2px solid hsl(152, 60%, 38%); outline-offset: 2px; }
@media (max-width: 480px) { .lt-mepacks__btn { width: 100%; } }
`;
