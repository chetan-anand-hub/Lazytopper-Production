import { packPriceLabel, subjectLabel, type PackSku, type PackSubject } from "../../services/packs";
import type { PacksShopApi } from "./PacksShop";
import "./packTileBuy.css";

/**
 * PackTileBuy - PACKS-TILE-BUY-1 (owner 2 Nov 2026): Buy buttons ON the pack tiles of /packs and the /pricing strip, so a
 * visitor does not have to open the pop-up to find Buy. Every button runs the shop's own buy flow (PacksShopApi.buyNow ->
 * handleBuy); "See inside" and the free-sample links stay as the secondary actions. Prices only from PACK_PRICE_INR
 * (packPriceLabel). An owned pack says "You own this". Premium does not matter here: packs are not part of Premium.
 */
const SUBJECTS: readonly PackSubject[] = ["maths", "science"];

function Owned({ label, testId }: { label?: string; testId: string }) {
  return (
    <span className="lt-ptb__owned" data-testid={testId}>
      {label ? `${label} · ` : ""}You own this
    </span>
  );
}

export default function PackTileBuy({ sku, api, tone = "light" }: { sku: PackSku; api: PacksShopApi; tone?: "light" | "on-dark" }) {
  if (!api.buyEnabled) return null;
  const price = packPriceLabel(sku);
  const cls = tone === "on-dark" ? "lt-ptb lt-ptb--dark" : "lt-ptb";

  if (sku === "pack_chapter") {
    return (
      <div className={cls}>
        <button type="button" className="lt-ptb__btn" onClick={api.chooseChapter} aria-haspopup="dialog" data-testid="tile-buy-pack_chapter">
          {`Choose chapter & buy · ${price}`}
        </button>
      </div>
    );
  }
  if (sku === "pack_bundle") {
    return (
      <div className={cls}>
        {api.ownsPack(sku) ? (
          <Owned testId="tile-owned-pack_bundle" />
        ) : (
          <button type="button" className="lt-ptb__btn" onClick={() => api.buyNow(sku)} data-testid="tile-buy-pack_bundle">
            {`Buy · ${price}`}
          </button>
        )}
      </div>
    );
  }
  if (sku === "pack_cbq") return null; // the CBQ cards use PackCbqBuy (one card per subject)
  return (
    <div className={`${cls} lt-ptb--pair`}>
      {SUBJECTS.map((s) =>
        api.ownsPack(sku, s) ? (
          <Owned key={s} label={subjectLabel(s)} testId={`tile-owned-${sku}-${s}`} />
        ) : (
          <button key={s} type="button" className="lt-ptb__btn" onClick={() => api.buyNow(sku, s)} data-testid={`tile-buy-${sku}-${s}`}>
            {`${subjectLabel(s)} ${price}`}
          </button>
        ),
      )}
    </div>
  );
}

/** The CBQ card's actions (one card per subject): Buy first, then "See inside". */
export function PackCbqBuy({ subject, api, testPrefix }: { subject: PackSubject; api: PacksShopApi; testPrefix: string }) {
  const see = (
    <button type="button" className="lt-ptb__see" onClick={() => api.openCbq(subject)} aria-haspopup="dialog" data-testid={`${testPrefix}-${subject}`}>
      See inside &rarr;
    </button>
  );
  if (!api.buyEnabled) {
    return (
      <button type="button" className="lt-cbq__btn" onClick={() => api.openCbq(subject)} aria-haspopup="dialog" data-testid={`${testPrefix}-${subject}`}>
        {`${subjectLabel(subject)} CBQ Pack · ${packPriceLabel("pack_cbq")}`}
      </button>
    );
  }
  return (
    <div className="lt-ptb lt-ptb--dark lt-ptb--cbq">
      {api.ownsPack("pack_cbq", subject) ? (
        <Owned testId={`tile-owned-pack_cbq-${subject}`} />
      ) : (
        <button type="button" className="lt-cbq__btn" onClick={() => api.buyNow("pack_cbq", subject)} data-testid={`tile-buy-pack_cbq-${subject}`}>
          {`Buy ${subjectLabel(subject)} CBQ · ${packPriceLabel("pack_cbq")}`}
        </button>
      )}
      {see}
    </div>
  );
}
