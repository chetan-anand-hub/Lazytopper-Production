/**
 * FEEDBACK-2 - which mascot drawings count as "another mascot on screen" for the feedback card.
 * The always-on desktop sidebar's Mistake Intelligence voice row (`.lt-mi-voice`) is chrome that is
 * there on every page, so it never makes the card plain or sends Ziggy away.
 */
export function isSidebarMascot(el: Element): boolean {
  return !!el.closest(".lt-mi-voice");
}
