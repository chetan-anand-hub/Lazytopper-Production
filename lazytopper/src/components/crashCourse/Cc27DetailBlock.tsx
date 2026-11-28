import { CC27_COVER, CC27_INCLUDED, CC27_INSIDE, CC27_NAME, isCc27ClientEnabled, type Cc27Product } from "../../config/crashCourse";
import "./crashCourse.css";

/**
 * CC27-SITE-1 - "Bonus: Crash Course 2027" on a product's own page: what is inside, the cover(s), and "included free with this purchase".
 * No price in the block. Static (no auth, no fetch), so the signed-out render the prerender freezes is the render every reader gets.
 */
export default function Cc27DetailBlock({ product, headingLevel = 2 }: { product: Cc27Product | "packs"; headingLevel?: 2 | 3 }) {
  if (!isCc27ClientEnabled()) return null;
  const H = `h${headingLevel}` as "h2" | "h3";
  const both = product === "pass" || product === "ts" || product === "bundle" || product === "packs";
  const showMaths = both || product === "subject" || product === "cbq" || product === "chapter";
  const showScience = both || product === "subject" || product === "cbq";
  return (
    <aside className="lt-cc27-block" aria-labelledby={`cc27-h-${product}`} data-testid={`cc27-block-${product}`}>
      <H id={`cc27-h-${product}`} className="lt-cc27-block__title">{`Bonus: ${CC27_NAME}`}</H>
      <div className="lt-cc27-block__covers">
        {showMaths && <img className="lt-cc27-block__cover" src={CC27_COVER.maths} width={72} height={102} loading="lazy" alt="Crash Course 2027 Maths cover" />}
        {showScience && <img className="lt-cc27-block__cover" src={CC27_COVER.science} width={72} height={102} loading="lazy" alt="Crash Course 2027 Science cover" />}
      </div>
      <ul className="lt-cc27-block__list">
        {CC27_INSIDE.map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ul>
      {product === "packs" ? (
        <>
          <p className="lt-cc27-block__incl">Included free with this purchase:</p>
          <ul className="lt-cc27-block__ladder">
            <li>{CC27_INCLUDED.bundle}</li>
            <li>{CC27_INCLUDED.subject}</li>
            <li>{CC27_INCLUDED.cbq}</li>
            <li>{CC27_INCLUDED.chapter}</li>
          </ul>
        </>
      ) : (
        <p className="lt-cc27-block__incl">{CC27_INCLUDED[product]}</p>
      )}
    </aside>
  );
}
