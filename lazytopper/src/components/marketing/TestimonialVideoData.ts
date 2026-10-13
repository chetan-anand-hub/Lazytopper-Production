/**
 * VIDEO-EMBED-1 — the one place the student testimonial's facts live. The component, the
 * `VideoObject` builder (`scripts/seo/testimonialVideoJsonLd.ts`) and the guard all read
 * THIS module, so the visible transcript and the structured data cannot drift apart.
 *
 * Consent: first name only. No surname, school or city anywhere in this module.
 */

export const TESTIMONIAL_VIDEO_ID = "LN5CqyYDpGQ";

/** First-party thumbnail: nothing is loaded from YouTube or Google before the click. */
export const TESTIMONIAL_THUMB_PATH = "/media/swajeet-testimonial-1280x720.jpg";
export const TESTIMONIAL_THUMB_WIDTH = 1280;
export const TESTIMONIAL_THUMB_HEIGHT = 720;
export const TESTIMONIAL_THUMB_ALT = "Swajeet, a Class 10 student, holding up his marked answer";

/** The maxres poster YouTube keeps for the video: structured data only, never fetched by the page. */
export const TESTIMONIAL_YT_THUMB_URL = `https://i.ytimg.com/vi/${TESTIMONIAL_VIDEO_ID}/maxresdefault.jpg`;

export const TESTIMONIAL_TITLE = "Where did my ½ mark go? — student testimonial";
export const TESTIMONIAL_PLAY_LABEL = "Play video: Where did my ½ mark go?";
/**
 * The VideoObject `name` and `description` (DECISION 129): the growth doc §4's own strings, verbatim. Google matches
 * the `name` against the video's YouTube title, so it is NOT the iframe title above. The visible heading and hook
 * line on the pages are literals in the page files and do not read these.
 */
export const TESTIMONIAL_VIDEO_NAME = "CBSE Class 10 Answer Checking: Where Did My ½ Mark Go? | Step Marking Explained";
export const TESTIMONIAL_DESCRIPTION =
  "Swajeet, a CBSE Class 10 student, photographs his handwritten answers and has them step-marked against the CBSE marking scheme on LazyTopper. He sees exactly where he lost half a mark: he solved the problem without writing the formula.";

export const TESTIMONIAL_UPLOAD_DATE = "2026-10-12T20:00:00+05:30";
export const TESTIMONIAL_DURATION = "PT38S";
export const TESTIMONIAL_LANGUAGE = "en-IN";

/** The iframe that replaces the facade on the click. `-nocookie`, and only after the click. */
export const TESTIMONIAL_IFRAME_SRC = `https://www.youtube-nocookie.com/embed/${TESTIMONIAL_VIDEO_ID}?autoplay=1&rel=0&cc_load_policy=1`;
/** The canonical embed address that structured data names. */
export const TESTIMONIAL_EMBED_URL = `https://www.youtube.com/embed/${TESTIMONIAL_VIDEO_ID}`;

export const TESTIMONIAL_TRANSCRIPT =
  "I was shocked to see the results. My name is Swajeet and I'm studying in Class 10. You can submit your subjective answers by taking a photo. I saw that not only were my objectives corrected instantly, but even my subjective answers were graded. They were graded according to the marking scheme, and I could see where exactly I went wrong. I solved a problem without writing the formula, and for that I lost half a mark. It showed me some analysis, and it said that these are your weak topics. \"Let's focus on these,\" and it gave me a set of questions to practise. It's a really good all-in-one solution for us.";

/** One chapter of the video, for `hasPart`. Offsets are seconds from the start. */
export interface TestimonialClip {
  readonly name: string;
  readonly startOffset: number;
  readonly endOffset: number;
}

/** The three chapters of the video (growth doc §4, DECISION 127), for `hasPart`. */
export const TESTIMONIAL_CLIPS: readonly TestimonialClip[] = [
  { name: "Uploading a handwritten answer", startOffset: 0, endOffset: 10 },
  { name: "Step marks by the CBSE marking scheme", startOffset: 10, endOffset: 20 },
  { name: "Losing ½ mark for skipping the formula, then weak-topic practice", startOffset: 20, endOffset: 38 },
];
