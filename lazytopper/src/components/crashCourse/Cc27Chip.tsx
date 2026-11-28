import { CC27_CHIP_SCOPE, CC27_NAME, isCc27ClientEnabled, type Cc27Product } from "../../config/crashCourse";
import "./crashCourse.css";

/** CC27-SITE-1 - the one-line bonus chip on a product card: "+ Crash Course 2027 · Maths & Science". An extra, never a price row. */
export default function Cc27Chip({ product }: { product: Cc27Product }) {
  if (!isCc27ClientEnabled()) return null;
  return (
    <p className="lt-cc27-chip" data-testid={`cc27-chip-${product}`}>
      <span aria-hidden="true">{"\u{1F381}"}</span>
      <span>{`+ ${CC27_NAME} · ${CC27_CHIP_SCOPE[product]}`}</span>
    </p>
  );
}
