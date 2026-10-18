import { useEffect } from "react";
import { Link } from "react-router-dom";

import PublicLegalFooter from "../components/ux/PublicLegalFooter";
import { trackWhatsAppContactTap } from "../analytics/analytics";
import { LEGAL_ENTITY_NAME } from "../config/legalEntity";
import { WHATSAPP_DISPLAY_NUMBER, whatsAppHref } from "../components/contact/whatsappContact";
import "./contactPage.css";

/**
 * ContactPage — `/contact` (WA-CONTACT-1, owner ask 17 Oct 2026): how to reach LazyTopper.
 * Public, signed-in or signed-out, one component at every width, responsive by CSS alone.
 *
 * WhatsApp is first because that is what the owner asked students to use for doubts,
 * questions and suggestions; email is the same support address the legal pages use; the
 * operating company comes from `config/legalEntity.ts` (never retyped here).
 *
 * The title and description are set on mount for the browser tab and for a crawler that
 * runs the bundle. CONTACT-INDEX-1 (owner ruling, 18 Oct 2026) made the page self-canonical,
 * advertised (sitemap, llms.txt) and prerendered; its static head in
 * `scripts/seo/writeStaticHeads.ts` repeats CONTACT_TITLE / CONTACT_DESCRIPTION word for word
 * (`config/contactIndex.guard.test.tsx` pins the two equal).
 */

export const CONTACT_EMAIL = "support@lazytopper.com";
export const CONTACT_TITLE = "Contact LazyTopper | WhatsApp and Email";
export const CONTACT_DESCRIPTION =
  "Message LazyTopper on WhatsApp at +91 97145 68948 with your CBSE Class 10 doubts, questions " +
  "or suggestions, or email support@lazytopper.com.";

const CONTACT_MESSAGE = "Hi LazyTopper, I have a doubt";

function useContactHead(): void {
  useEffect(() => {
    const prevTitle = document.title;
    let meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    const created = !meta;
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "description");
      document.head.appendChild(meta);
    }
    const prevDesc = meta.getAttribute("content");
    document.title = CONTACT_TITLE;
    meta.setAttribute("content", CONTACT_DESCRIPTION);
    return () => {
      document.title = prevTitle;
      if (created) meta?.remove();
      else if (prevDesc !== null) meta?.setAttribute("content", prevDesc);
    };
  }, []);
}

export default function ContactPage() {
  useContactHead();
  return (
    <main className="lt-contact" data-testid="contact-page">
      <div className="lt-contact__w">
        <p className="lt-contact__eyebrow">LazyTopper · CBSE Class 10</p>
        <h1>Contact us</h1>
        <p className="lt-contact__sub">Stuck on a question, or have an idea for LazyTopper? Write to us.</p>

        <section className="lt-contact__card lt-contact__card--wa" aria-labelledby="contact-wa">
          <h2 id="contact-wa">WhatsApp</h2>
          <p className="lt-contact__number">{WHATSAPP_DISPLAY_NUMBER}</p>
          <p>For doubts, questions, suggestions.</p>
          <a
            className="lt-contact__btn"
            href={whatsAppHref(CONTACT_MESSAGE)}
            target="_blank"
            rel="noopener noreferrer"
            data-testid="contact-whatsapp"
            onClick={() => trackWhatsAppContactTap("contact_page")}
          >
            Message us on WhatsApp
          </a>
        </section>

        <section className="lt-contact__card" aria-labelledby="contact-email">
          <h2 id="contact-email">Email</h2>
          <p>
            <a className="lt-contact__mail" href={`mailto:${CONTACT_EMAIL}`}>
              {CONTACT_EMAIL}
            </a>
          </p>
          <p>For account, payment and privacy questions.</p>
        </section>

        <p className="lt-contact__fine">
          {`LazyTopper is operated by ${LEGAL_ENTITY_NAME}.`} See our <Link to="/legal/privacy">privacy policy</Link>{" "}
          and <Link to="/legal/terms">terms</Link>.
        </p>
      </div>
      <PublicLegalFooter />
    </main>
  );
}
