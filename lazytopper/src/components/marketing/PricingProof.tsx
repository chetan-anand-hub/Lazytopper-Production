import TestimonialVideo from "./TestimonialVideo";

/**
 * TRUST-1: the student testimonial block for /pricing (heading + lede + the click-to-play facade).
 * Its own file, so the half-mark sign is written literally like on the other pages and the pay-surface
 * source scan in PaywallActions.test.tsx is not worked around.
 */
export default function PricingProof() {
  return (
    <TestimonialVideo
      headingId="pricing-video"
      heading="Where did his ½ mark go?"
      lede="A Class 10 student photographs his written answer and sees exactly where he lost ½ mark."
    />
  );
}
