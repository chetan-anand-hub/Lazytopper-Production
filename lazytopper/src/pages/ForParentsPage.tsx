import { Link } from "react-router-dom";

import TestimonialVideo from "../components/marketing/TestimonialVideo";
import PublicLegalFooter from "../components/ux/PublicLegalFooter";
import MummyJourney from "../components/guide/mummy/MummyJourney";
import { trackParentShareClick, type ParentSharePlacement } from "../analytics/analytics";
import "./forParents.css";

/**
 * ForParentsPage — `/for-parents` (PARENTS-1): the public page a PARENT lands on from an
 * ad, which explains LazyTopper in parent terms and makes the next step handing it to the
 * child.
 *
 * ★ WHY NO SIGN-UP BUTTON. Most people the ads reach are parents, and a parent who signs up
 * on their own phone is not the user: that is the dead-account pattern this page exists to
 * stop. The primary action is "Send LazyTopper to my child", a WhatsApp share of the free
 * answer check. No sign-up CTA, no price figure, no parent account (owner rulings, 12–13 Oct).
 *
 * ★ WHAT THE 19 OCT RULING ADDED (PARENTS-CTA-1, owner ruling 2026-10-19). Three things, and
 * only these three:
 *   1. A SECONDARY "Check one answer free" link (hero and closing section) straight to the
 *      free answer check, `/check-improve?from=for_parents&utm_source=for_parents`, for the
 *      parent (or the child beside them) who wants to see it work right here. `from=` makes
 *      /check-improve show a "Back to parents page" link (`lib/parentReturn.ts`).
 *      `utm_source=for_parents` is NOT reliable attribution for these clicks: the visit
 *      source is FIRST-TOUCH per tab (`rememberVisitSourceOnce`, analytics/visitSource.ts
 *      ~L166: it runs once per page load and keeps any source the tab already stored), and a
 *      click from this page is an in-app navigation in the same tab. The tag only records for
 *      a visitor who opens the URL directly in a fresh tab (e.g. the link shared on). No new analytics event: the
 *      named-event union lives in `analytics/analytics.ts`, outside this lane.
 *   2. A "See pricing" link to `/pricing` in the "What does it cost?" answer. The page itself
 *      still states NO rupee figure.
 *   3. A fifth "What your child gets" tile, "A tutor for doubts, explained step by step", with
 *      NO link: the tutor needs an account, and this page offers no route to make one.
 * Still NO sign-up / login link or button on this page. The share button is unchanged.
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

/** PARENTS-CTA-1 — the secondary link to the free answer check (owner ruling 2026-10-19). */
export const FREE_CHECK_LABEL = "Check one answer free";
export const FREE_CHECK_TO = "/check-improve?from=for_parents&utm_source=for_parents";

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
  // PARENTS-CTA-1 (owner ruling 2026-10-19): deliberately NO link — the tutor needs an account,
  // and this page carries no sign-up route.
  { title: "A tutor for doubts, explained step by step" },
];

/** A plain link (in the prerendered HTML, works with no JavaScript), styled secondary. */
function FreeCheckLink({ placement }: { placement: ParentSharePlacement }) {
  return (
    <Link className="lt-fp__cta2" to={FREE_CHECK_TO} data-testid={`fp-free-check-${placement}`}>
      {FREE_CHECK_LABEL}
    </Link>
  );
}

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
          <div className="lt-fp__actions">
            <ShareButton placement="hero" />
            <FreeCheckLink placement="hero" />
          </div>
        </div>
      </header>

      <div className="lt-fp__w lt-fp__body">
        <MummyJourney actions={<><ShareButton placement="journey" /><FreeCheckLink placement="journey" /></>} />
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
            <p>
              The first answer check is free, without an account. A new account gets a 7-day Premium trial.{" "}
              <Link to="/pricing">See pricing</Link>
            </p>
          </details>
          <details>
            <summary>Can I see my child’s progress?</summary>
            <p>Not yet. A weekly parent summary is planned.</p>
          </details>
        </section>

        <section aria-labelledby="fp-send" className="lt-fp__send">
          <h2 id="fp-send">Hand it to your child</h2>
          <p>One tap opens WhatsApp with a message and a link. Your child opens it on their own phone and tries a free check.</p>
          <div className="lt-fp__actions">
            <ShareButton placement="footer" />
            <FreeCheckLink placement="footer" />
          </div>
        </section>

        <p className="lt-fp__fine">LazyTopper is an independent platform and is not affiliated with CBSE.</p>
      </div>
      <PublicLegalFooter />
    </main>
  );
}
