import { useState } from "react";

import { trackNamedEvent } from "../../analytics/analytics";
import {
  TESTIMONIAL_IFRAME_SRC,
  TESTIMONIAL_PLAY_LABEL,
  TESTIMONIAL_THUMB_ALT,
  TESTIMONIAL_THUMB_HEIGHT,
  TESTIMONIAL_THUMB_PATH,
  TESTIMONIAL_THUMB_WIDTH,
  TESTIMONIAL_TITLE,
  TESTIMONIAL_TRANSCRIPT,
} from "./TestimonialVideoData";
import "./testimonialVideo.css";

const BASE = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");

/** `testimonial_play` is counted once per page load, however many players or clicks. */
let playCounted = false;

/** Test seam: forget that the play was counted. */
export function __resetTestimonialPlayForTests(): void {
  playCounted = false;
}

interface Props {
  heading: string;
  lede: string;
  /** Heading level the host page needs: "h2" for a page section, "h3" inside one. */
  headingAs?: "h2" | "h3";
  /** Optional id for the heading, so a host `<section aria-labelledby>` can point at it. */
  headingId?: string;
}

/**
 * TestimonialVideo (VIDEO-EMBED-1) — a click-to-play facade for the student testimonial.
 *
 * ★ BEFORE THE CLICK NOTHING COMES FROM YOUTUBE OR GOOGLE: our own thumbnail and a real
 * button, no iframe, no script, no `i.ytimg.com`. The iframe (`youtube-nocookie`) exists
 * only after the click. The transcript sits in a `<details>` in the page body, so the
 * prerender carries it and a crawler reads it.
 */
export default function TestimonialVideo({ heading, lede, headingAs = "h2", headingId }: Props) {
  const [playing, setPlaying] = useState(false);
  const Heading = headingAs;

  const play = () => {
    if (!playCounted) {
      playCounted = true;
      trackNamedEvent("testimonial_play");
    }
    setPlaying(true);
  };

  return (
    <div className="lt-tv" data-testid="testimonial-video">
      <Heading id={headingId} className="lt-tv__title">{heading}</Heading>
      <p className="lt-tv__lede">{lede}</p>
      <div className="lt-tv__frame">
        {playing ? (
          <iframe
            className="lt-tv__iframe"
            src={TESTIMONIAL_IFRAME_SRC}
            title={TESTIMONIAL_TITLE}
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <>
            <img
              className="lt-tv__thumb"
              src={`${BASE}${TESTIMONIAL_THUMB_PATH}`}
              width={TESTIMONIAL_THUMB_WIDTH}
              height={TESTIMONIAL_THUMB_HEIGHT}
              alt={TESTIMONIAL_THUMB_ALT}
              loading="lazy"
            />
            <button type="button" className="lt-tv__play" aria-label={TESTIMONIAL_PLAY_LABEL} onClick={play}>
              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path d="M8 5v14l11-7z" />
              </svg>
            </button>
          </>
        )}
      </div>
      <details className="lt-tv__transcript">
        <summary>Read the transcript</summary>
        <p>{TESTIMONIAL_TRANSCRIPT}</p>
      </details>
    </div>
  );
}
