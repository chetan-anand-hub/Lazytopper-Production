/**
 * GST-INVOICE-1 - the signed-in student's own tax invoices (list + PDF download). Both calls carry the student's Firebase
 * ID token; the server serves an invoice only to the uid that bought it.
 */
import { authHeaders } from "../../services/checkout";

export const GST_INVOICES_ENDPOINT = "/api/gst/invoices";
export const GST_INVOICE_PDF_ENDPOINT = "/api/gst/invoice";

export interface MyInvoice {
  orderId: string;
  number: string;
  dateIst: string;
  description: string;
  totalPaise: number;
}

/** PURE. "Rs" amount label for a paise total: "₹2,262.00". */
export function invoiceAmountLabel(paise: number): string {
  const n = Math.round(paise);
  const whole = String(Math.floor(n / 100));
  const last3 = whole.slice(-3);
  const rest = whole.slice(0, -3);
  const grouped = rest ? `${rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",")},${last3}` : last3;
  return `₹${grouped}.${String(n % 100).padStart(2, "0")}`;
}

/** PURE. Keeps only well-formed rows. */
export function readInvoices(json: unknown): MyInvoice[] {
  const items = (json as { items?: unknown } | null)?.items;
  if (!Array.isArray(items)) return [];
  return items.flatMap((i) => {
    const v = i as Record<string, unknown>;
    return typeof v.orderId === "string" && typeof v.number === "string" && typeof v.dateIst === "string" && typeof v.totalPaise === "number"
      ? [{ orderId: v.orderId, number: v.number, dateIst: v.dateIst, description: typeof v.description === "string" ? v.description : "", totalPaise: v.totalPaise }]
      : [];
  });
}

/** The list, or [] for anything but a clean answer (invoicing off answers 404 -> nothing is shown). */
export async function fetchMyInvoices(): Promise<MyInvoice[]> {
  try {
    const res = await fetch(GST_INVOICES_ENDPOINT, { headers: await authHeaders() });
    if (!res.ok) return [];
    return readInvoices(await res.json());
  } catch {
    return [];
  }
}

/** Downloads one invoice PDF. Resolves false when it could not. */
export async function downloadInvoice(inv: MyInvoice): Promise<boolean> {
  try {
    const res = await fetch(`${GST_INVOICE_PDF_ENDPOINT}?orderId=${encodeURIComponent(inv.orderId)}`, { headers: await authHeaders() });
    if (!res.ok) return false;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${inv.number.replace(/[^A-Za-z0-9-]+/g, "-")}.pdf`;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    return true;
  } catch {
    return false;
  }
}
