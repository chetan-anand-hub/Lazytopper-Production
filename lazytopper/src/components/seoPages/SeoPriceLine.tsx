import { PACK_PRICE_INR, packPriceLabel, type PackSku } from "../../services/packs";

/**
 * One pack price tag, "<Pack name> · ₹49 + GST", as ONE text node in its own span, read at render time from the pack helpers
 * (never typed). The markup shape is the one the prerender price guard already scans (`>Mock Pack · ₹99 + GST<`), so a saved
 * snapshot that drifts from the live price fails CI and forces a re-capture.
 */
export default function SeoPriceLine({ sku, name, testId }: { sku: PackSku; name: string; testId: string }) {
  return (
    <span className="lt-seol__price" data-testid={testId} data-price={PACK_PRICE_INR[sku]}>{`${name} · ${packPriceLabel(sku)}`}</span>
  );
}
