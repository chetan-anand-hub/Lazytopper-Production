import { packPriceLabel, subjectLabel, type PackSku, type PackSubject } from "../../services/packs";
import { OTHER_PAYMENT_BUSY_COPY, type PacksShopApi } from "./PacksShop";
import "./packTileBuy.css";

/**
 * PackTileBuy - PACKS-TILE-BUY-1 (owner 2 Nov 2026): Buy buttons ON the pack tiles of /packs and the /pricing strip, so a
 * visitor does not have to open the pop-up to find Buy. Every button runs the shop's own buy flow (PacksShopApi.buyNow ->
 * handleBuy); "See inside" and the free-sample links stay as the secondary actions. Prices only from PACK_PRICE_INR
 * (packPriceLabel). An owned pack says "You own this". Premium does not matter here: packs are not part of Premium.
 */
const SUBJECTS: readonly PackSubject[] = ["maths", "science"];

function Owned({ label, testId }: { label?: string; testId: string }) {
  // Review fix 4: an outline pill with a check mark - never the look of a Buy button.
  return (
    <span className="lt-ptb__owned" data-testid={testId}>
      <span className="lt-ptb__tick" aria-hidden="true">&#10003;</span>
      {label ? `${label} · ` : ""}You own this
    </span>
  );
}

/** A tile Buy: disabled (with a visible reason) while another pack's payment is open or being checked (review fix 2). */
function BuyButton({ blocked, onClick, testId, className = "lt-ptb__btn", children, dialog = false }: {
  blocked: boolean;
  onClick: () => void;
  testId: string;
  className?: string;
  children: string;
  dialog?: boolean;
}) {
  return (
    <button
      type="button"
      className={className}
      onClick={onClick}
      disabled={blocked}
      aria-disabled={blocked}
      {...(dialog ? { "aria-haspopup": "dialog" as const } : {})}
      data-testid={testId}
    >
      {children}
    </button>
  );
}

function BusyNote({ show }: { show: boolean }) {
  return show ? <span className="lt-ptb__busy" role="status">{OTHER_PAYMENT_BUSY_COPY}</span> : null;
}

export default function PackTileBuy({ sku, api, tone = "light" }: { sku: PackSku; api: PacksShopApi; tone?: "light" | "on-dark" }) {
  if (!api.buyEnabled) return null;
  const price = packPriceLabel(sku);
  const cls = tone === "on-dark" ? "lt-ptb lt-ptb--dark" : "lt-ptb";

  if (sku === "pack_chapter") {
    const blocked = api.blockedBy(sku);
    return (
      <div className={cls}>
        <BuyButton blocked={blocked} onClick={api.chooseChapter} dialog testId="tile-buy-pack_chapter">{`Choose chapter & buy · ${price}`}</BuyButton>
        <BusyNote show={blocked} />
      </div>
    );
  }
  if (sku === "pack_bundle") {
    const blocked = api.blockedBy(sku);
    return (
      <div className={cls}>
        {api.ownsPack(sku) ? (
          <Owned testId="tile-owned-pack_bundle" />
        ) : (
          <BuyButton blocked={blocked} onClick={() => api.buyNow(sku)} testId="tile-buy-pack_bundle">{`Buy · ${price}`}</BuyButton>
        )}
        <BusyNote show={blocked && !api.ownsPack(sku)} />
      </div>
    );
  }
  if (sku === "pack_cbq") return null; // the CBQ cards use PackCbqBuy (one card per subject)
  const anyBlocked = SUBJECTS.some((s) => !api.ownsPack(sku, s) && api.blockedBy(sku, s));
  return (
    <div className={`${cls} lt-ptb--pair`}>
      {SUBJECTS.map((s) =>
        api.ownsPack(sku, s) ? (
          <Owned key={s} label={subjectLabel(s)} testId={`tile-owned-${sku}-${s}`} />
        ) : (
          <BuyButton key={s} blocked={api.blockedBy(sku, s)} onClick={() => api.buyNow(sku, s)} testId={`tile-buy-${sku}-${s}`}>
            {`Buy ${subjectLabel(s)} ${price}`}
          </BuyButton>
        ),
      )}
      <BusyNote show={anyBlocked} />
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
        <BuyButton
          blocked={api.blockedBy("pack_cbq", subject)}
          className="lt-cbq__btn"
          onClick={() => api.buyNow("pack_cbq", subject)}
          testId={`tile-buy-pack_cbq-${subject}`}
        >
          {`Buy ${subjectLabel(subject)} CBQ · ${packPriceLabel("pack_cbq")}`}
        </BuyButton>
      )}
      <BusyNote show={!api.ownsPack("pack_cbq", subject) && api.blockedBy("pack_cbq", subject)} />
      {see}
    </div>
  );
}
