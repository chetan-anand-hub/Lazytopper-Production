// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

const { trackNamedEvent } = vi.hoisted(() => ({ trackNamedEvent: vi.fn() }));
vi.mock("../../analytics/analytics", () => ({ trackNamedEvent }));

import TestimonialVideo, { __resetTestimonialPlayForTests } from "./TestimonialVideo";

beforeEach(() => {
  trackNamedEvent.mockClear();
  __resetTestimonialPlayForTests();
});
afterEach(() => cleanup());

describe("TestimonialVideo", () => {
  it("shows a facade first: first-party thumbnail, a labelled button, the transcript, no iframe", () => {
    const { container } = render(<TestimonialVideo heading="See it" lede="Lede line." />);
    const img = container.querySelector("img") as HTMLImageElement;
    expect(img.getAttribute("src")).toBe("/media/swajeet-testimonial-1280x720.jpg");
    expect(img.getAttribute("width")).toBe("1280");
    expect(img.getAttribute("height")).toBe("720");
    expect(img.getAttribute("loading")).toBe("lazy");
    expect(img.getAttribute("alt")).toBe("Swajeet, a Class 10 student, holding up his marked answer");
    const button = screen.getByRole("button", { name: "Play video: Where did my ½ mark go?" });
    expect(button.tagName).toBe("BUTTON");
    expect(container.querySelector("iframe")).toBeNull();
    expect(screen.getByText("Read the transcript").closest("details")).not.toBeNull();
    expect(container.textContent).toContain("I solved a problem without writing the formula");
    expect(trackNamedEvent).not.toHaveBeenCalled();
  });

  it("swaps in the youtube-nocookie iframe on click and counts the play once", () => {
    const { container } = render(<TestimonialVideo heading="See it" lede="Lede line." />);
    fireEvent.click(screen.getByRole("button", { name: /Play video/ }));
    const frame = container.querySelector("iframe") as HTMLIFrameElement;
    expect(frame.getAttribute("src")).toBe(
      "https://www.youtube-nocookie.com/embed/LN5CqyYDpGQ?autoplay=1&rel=0&cc_load_policy=1",
    );
    expect(frame.getAttribute("title")).toBe("Where did my ½ mark go? — student testimonial");
    expect(frame.getAttribute("allow")).toBe("autoplay; encrypted-media; picture-in-picture");
    expect(container.querySelector("img")).toBeNull();
    expect(trackNamedEvent).toHaveBeenCalledTimes(1);
    expect(trackNamedEvent).toHaveBeenCalledWith("testimonial_play");
  });

  it("counts once per page load even with two players on the page", () => {
    render(
      <>
        <TestimonialVideo heading="One" lede="a" />
        <TestimonialVideo heading="Two" lede="b" headingAs="h3" />
      </>,
    );
    for (const b of screen.getAllByRole("button", { name: /Play video/ })) fireEvent.click(b);
    expect(trackNamedEvent).toHaveBeenCalledTimes(1);
  });
});
