/**
 * VIDEO-EMBED-1 — the `VideoObject` JSON-LD for the student testimonial, built ONCE so the
 * two pages that carry the video emit the same object. Every fact comes from
 * `TestimonialVideoData`, the module the visible transcript reads, so the structured data
 * and the page cannot disagree. `writeStaticHeads` writes it into the stamped head of
 * exactly `TESTIMONIAL_VIDEO_PATHS`.
 */
import {
  TESTIMONIAL_CLIPS,
  TESTIMONIAL_DESCRIPTION,
  TESTIMONIAL_DURATION,
  TESTIMONIAL_EMBED_URL,
  TESTIMONIAL_LANGUAGE,
  TESTIMONIAL_THUMB_PATH,
  TESTIMONIAL_TRANSCRIPT,
  TESTIMONIAL_UPLOAD_DATE,
  TESTIMONIAL_VIDEO_NAME,
  TESTIMONIAL_VIDEO_ID,
  TESTIMONIAL_YT_THUMB_URL,
} from "../../src/components/marketing/TestimonialVideoData";

/** The only pages that carry the video, and therefore the only pages that get its JSON-LD. */
export const TESTIMONIAL_VIDEO_PATHS: readonly string[] = ["/check-your-answer", "/cbse/class-10"];

/**
 * @param home the canonical home URL (e.g. `https://www.lazytopper.com/`), from `canonicalFor("/", basename)`.
 */
export function testimonialVideoJsonLd(home: string): Record<string, unknown> {
  const embedUrl = TESTIMONIAL_EMBED_URL;
  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name: TESTIMONIAL_VIDEO_NAME,
    description: TESTIMONIAL_DESCRIPTION,
    thumbnailUrl: [new URL(TESTIMONIAL_THUMB_PATH, home).href, TESTIMONIAL_YT_THUMB_URL],
    uploadDate: TESTIMONIAL_UPLOAD_DATE,
    duration: TESTIMONIAL_DURATION,
    embedUrl,
    inLanguage: TESTIMONIAL_LANGUAGE,
    publisher: { "@type": "Organization", name: "LazyTopper", url: home, logo: new URL("/og-image.png", home).href },
    transcript: TESTIMONIAL_TRANSCRIPT,
  };
  if (TESTIMONIAL_CLIPS.length > 0) {
    data.hasPart = TESTIMONIAL_CLIPS.map((clip) => ({
      "@type": "Clip",
      name: clip.name,
      startOffset: clip.startOffset,
      endOffset: clip.endOffset,
      url: `https://www.youtube.com/watch?v=${TESTIMONIAL_VIDEO_ID}&t=${clip.startOffset}`,
    }));
  }
  return data;
}

/** The JSON-LD for a page, or `null` for any page that does not carry the video. */
export function testimonialVideoJsonLdFor(path: string, home: string): Record<string, unknown> | null {
  return TESTIMONIAL_VIDEO_PATHS.includes(path) ? testimonialVideoJsonLd(home) : null;
}
