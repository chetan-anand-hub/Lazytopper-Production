import { Link } from "react-router-dom";

import TestimonialVideo from "../components/marketing/TestimonialVideo";
import PublicLegalFooter from "../components/ux/PublicLegalFooter";
import { trackParentShareClick, type ParentSharePlacement } from "../analytics/analytics";
import "./forParents.css";

/**
 * ForParentsPage — `/for-parents` (PARENTS-1): the public page a PARENT lands on from an
 * ad, which explains LazyTopper in parent terms and makes the next step handing it to the
 * child.
 *
 * ★ WHY NO SIGN-UP BUTTON. Most people the ads reach are parents, and a parent who signs up
 * on their own phone is not the user: that is the dead-account pattern this page exists to
 * stop. The only action is "Send LazyTopper to my child", a WhatsApp share of the free
 * answer check. No sign-up CTA, no price, no parent account (owner rulings, 12–13 Oct).
 *
 * ★ THE SHARE LINK USES UTM TAGS, NOT `?ref=`. `referralService` reads `?ref=` as a
 * referral code and `visitSource.ref` is the referrer host; a third meaning would be a trap.
 * `utm_source=parent_share` is captured by SOURCE-1 and read as "Parent share" in the admin
 * Students list. The link is a plain `<a href>` so it exists in the prerendered HTML and
 * works with no JavaScript.
 *
 * ★ EVERY FAQ ANSWER IS TRUE AT THE TIP (spec P12): the free first check
 * (`services/freeCheckClient.ts`), the 7-day trial at sign-up (`newAccountTrial.ts`,
 * `TRIAL_DAYS`), no user-to-user messaging, no ad network. It does NOT claim "no tracking":
 * the analytics pixels are not ads, and the privacy policy is linked instead.
 *
 * ★ ONE COMPONENT AT EVERY WIDTH, RESPONSIVE BY CSS ALONE, nothing fetched: the page renders
 * the same for a signed-out reader and a crawler, which is what the prerender freezes.
 */

/** The page the shared link opens: the free answer check, tagged so the sign-up reads "Parent share". */
export const PARENT_SHARE_URL =
  "https://www.lazytopper.com/check-improve?utm_source=parent_share&utm_medium=whatsapp";

/** The message a parent sends. Plain words, no promise, no price. */
export const PARENT_SHARE_MESSAGE =
  "Try this for your Class 10 board prep: photograph a written answer and see the marks for every step, " +
  `the way a CBSE examiner marks it. ${PARENT_SHARE_URL}`;

/** `https://wa.me/?text=…` opens WhatsApp's own contact picker with the message filled in. */
export const PARENT_SHARE_HREF = `https://wa.me/?text=${encodeURIComponent(PARENT_SHARE_MESSAGE)}`;

const SHARE_LABEL = "Send LazyTopper to my child";

interface Tile {
  readonly title: string;
  /** An existing public page, or none. */
  readonly to?: string;
}

const TILES: readonly Tile[] = [
  { title: "Answer checking with step marks", to: "/check-your-answer" },
  { title: "Chapter tests and full mocks in the CBSE pattern", to: "/practice-hub" },
  { title: "Important Questions from 10 years of CBSE papers", to: "/highly-probable/10/Maths" },
  { title: "Practice on weak topics" },
];

function ShareButton({ placement }: { placement: ParentSharePlacement }) {
  const onClick = () => trackParentShareClick(placement);
  return (
    <a
      className="lt-fp__cta"
      href={PARENT_SHARE_HREF}
      target="_blank"
      rel="noopener noreferrer"
      onClick={onClick}
      data-testid={`fp-share-${placement}`}
    >
      {SHARE_LABEL}
    </a>
  );
}

export default function ForParentsPage() {
  return (
    <main className="lt-fp" data-testid="for-parents-page">
      <header className="lt-fp__hero">
        <div className="lt-fp__w">
          <p className="lt-fp__eyebrow">For parents · CBSE Class 10 · Maths and Science</p>
          <h1>See exactly where your child loses marks in CBSE Class 10.</h1>
          <p className="lt-fp__sub">
            Your child writes the answer on paper and takes a photo. LazyTopper marks it step by step, the way a CBSE
            examiner does, and shows what to fix.
          </p>
          <ShareButton placement="hero" />
        </div>
      </header>

      <div className="lt-fp__w lt-fp__body">
        <section aria-labelledby="fp-video">
          <TestimonialVideo
            headingId="fp-video"
            heading="See it on a real answer sheet"
            lede="A Class 10 student photographs his written answer and sees exactly where he lost ½ mark."
          />
        </section>

        <section aria-labelledby="fp-gets">
          <h2 id="fp-gets">What your child gets</h2>
          <ul className="lt-fp__tiles">
            {TILES.map((tile) => (
              <li key={tile.title}>
                {tile.to ? <Link to={tile.to}>{tile.title}</Link> : <span>{tile.title}</span>}
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="fp-routine">
          <h2 id="fp-routine">A routine that fits</h2>
          <p>15–20 minutes a day, on the phone or the laptop, up to the February 2027 boards.</p>
        </section>

        <section aria-labelledby="fp-faq" className="lt-fp__faq">
          <h2 id="fp-faq">Questions parents ask</h2>
          <details>
            <summary>Does it follow the CBSE syllabus?</summary>
            <p>
              Yes. LazyTopper follows the 2026-27 CBSE Class 10 syllabus. The official sample papers and marking schemes
              are on our <Link to="/cbse/class-10">CBSE Class 10 page</Link>.
            </p>
          </details>
          <details>
            <summary>Does my child need a laptop?</summary>
            <p>No. The phone camera works: write the answer on paper, take a photo, and see the marks for each step.</p>
          </details>
          <details>
            <summary>Is it safe?</summary>
            <p>
              There is no chat with other users, and no ads inside the app. How we handle your child’s data is in the{" "}
              <Link to="/legal/privacy">privacy policy</Link>.
            </p>
          </details>
          <details>
            <summary>What does it cost?</summary>
            <p>The first answer check is free, without an account. A new account gets a 7-day Premium trial.</p>
          </details>
          <details>
            <summary>Can I see my child’s progress?</summary>
            <p>Not yet. A weekly parent summary is planned.</p>
          </details>
        </section>

        <section aria-labelledby="fp-send" className="lt-fp__send">
          <h2 id="fp-send">Hand it to your child</h2>
          <p>One tap opens WhatsApp with a message and a link. Your child opens it on their own phone and tries a free check.</p>
          <ShareButton placement="footer" />
        </section>

        <p className="lt-fp__fine">LazyTopper is an independent platform and is not affiliated with CBSE.</p>
      </div>
      <PublicLegalFooter />
    </main>
  );
}
