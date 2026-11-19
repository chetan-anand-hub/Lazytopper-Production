// src/components/seo/packsProductLd.ts
//
// SEO-LLM-2 — Product + BreadcrumbList JSON-LD for the two pages that SELL packs (/packs, /cbq-packs), and BreadcrumbList for the
// important-questions pages. Stamped into the static head by scripts/seo/writeStaticHeads.ts.
//
// ★ NO REACT, NO SERVICES: node script. services/packs.ts (PACK_PRICE_INR) cannot be imported here (it pulls a CSS file), so the
//   base prices are mirrored below and packsProductLd.guard.test.ts pins each EQUAL to PACK_PRICE_INR: a price change turns CI red.
// ★ Prices are the BASE price, GST EXCLUSIVE ("₹X + GST"), so `valueAddedTaxIncluded` is false.
import { SITE_ORIGIN, canonicalFor } from "../../config/canonicalUrl";
import { BANK_CBQS_CLAIM, BANK_QUESTIONS_CLAIM, BUNDLE_NAME, CBQ_SUBJECT_CLAIM, MOCKS_PER_SUBJECT } from "../../lib/packs/packLabels";

export const PACKS_LD_PRICE_INR = {
  pack_chapter: 49,
  pack_mock: 99,
  pack_subject: 199,
  pack_bundle: 299,
  pack_cbq: 199,
} as const;

interface LdProduct {
  name: string;
  description: string;
  sku: keyof typeof PACKS_LD_PRICE_INR;
  /** Cover preview file stem under public/packs/previews/ (`<cover>-cover-827.webp`). Google requires `image` on a merchant-listing Product. */
  cover: string;
}

const PACKS_PRODUCTS: readonly LdProduct[] = [
  {
    sku: "pack_chapter",
    cover: "chapter-maths",
    name: "CBSE Class 10 Chapter Pack (PDF)",
    description: "One chapter of the CBSE Class 10 Maths or Science question bank as a printable PDF, grouped by CBSE section with a worked solution for every question.",
  },
  {
    sku: "pack_mock",
    cover: "mock-maths",
    name: "CBSE Class 10 Mock Pack (PDF)",
    description: `${MOCKS_PER_SUBJECT} full board-pattern mock papers for one subject (Maths or Science) as a printable PDF, with marking guides.`,
  },
  {
    sku: "pack_subject",
    cover: "subject-maths",
    name: "CBSE Class 10 Subject Pack (PDF)",
    description: "Every chapter of one subject (Maths or Science) as a printable PDF question bank with worked solutions, plus that subject's mock papers.",
  },
  {
    sku: "pack_bundle",
    cover: "bundle",
    name: `CBSE Class 10 ${BUNDLE_NAME} (PDF)`,
    description: `Every chapter of Class 10 Maths and Science and the mock papers for both subjects as printable PDFs with worked solutions, from a bank of ${BANK_QUESTIONS_CLAIM} questions including ${BANK_CBQS_CLAIM} competency-based questions.`,
  },
];

const CBQ_PRODUCTS: readonly (LdProduct & { subject: string })[] = (["Maths", "Science"] as const).map((subject) => ({
  sku: "pack_cbq" as const,
  subject,
  cover: `cbq-${subject.toLowerCase()}`,
  name: `CBSE Class 10 ${subject} CBQ Pack (PDF)`,
  description: `Competency-based questions for CBSE Class 10 ${subject} as a printable PDF: ${CBQ_SUBJECT_CLAIM}, chapter-wise, with step-wise worked solutions.`,
}));

function productLd(p: LdProduct, url: string, home: string): Record<string, unknown> {
  const price = PACKS_LD_PRICE_INR[p.sku];
  return {
    "@type": "Product",
    name: p.name,
    description: p.description,
    sku: `${p.sku}${"subject" in p ? `_${String((p as { subject: string }).subject).toLowerCase()}` : ""}`,
    image: `${SITE_ORIGIN}/packs/previews/${p.cover}-cover-827.webp`,
    category: "Educational PDF",
    brand: { "@type": "Brand", name: "LazyTopper" },
    offers: {
      "@type": "Offer",
      url,
      price,
      priceCurrency: "INR",
      priceSpecification: { "@type": "PriceSpecification", price, priceCurrency: "INR", valueAddedTaxIncluded: false },
      availability: "https://schema.org/InStock",
      seller: { "@type": "Organization", name: "LazyTopper", url: home },
    },
  };
}

const CRUMBS: Readonly<Record<string, string>> = {
  "/packs": "PDF Packs",
  "/cbq-packs": "CBQ Packs",
  "/highly-probable/10/Maths": "Class 10 Maths Important Questions",
  "/highly-probable/10/Science": "Class 10 Science Important Questions",
};

/** Product (+ Breadcrumb) JSON-LD for a path of this lane, else null. */
export function packsAnswerJsonLd(path: string, basename: string): Record<string, unknown> | null {
  const crumb = CRUMBS[path];
  if (!crumb) return null;
  const home = canonicalFor("/", basename);
  const url = canonicalFor(path, basename);
  const graph: Record<string, unknown>[] = [
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: home },
        { "@type": "ListItem", position: 2, name: crumb, item: url },
      ],
    },
  ];
  if (path === "/packs") for (const p of PACKS_PRODUCTS) graph.push(productLd(p, url, home));
  if (path === "/cbq-packs") for (const p of CBQ_PRODUCTS) graph.push(productLd(p, url, home));
  return { "@context": "https://schema.org", "@graph": graph };
}
