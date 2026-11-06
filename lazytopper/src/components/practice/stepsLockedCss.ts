/**
 * HPQ-CLS-1 - the locked-steps note's rules (and the Important Questions page's "Show all solutions" row), as a string.
 *
 * Why a string, not a stylesheet import: a route-chunk stylesheet arrives AFTER a prerendered page paints, so on the
 * prerendered Important Questions pages the note first painted unstyled and then grew (layout shift at 1280 px, found
 * on #1612). The rules are now rendered WITH the markup: the Important Questions page writes them once into its body
 * (`StepsLockedStyleInline`, in the prerendered HTML); every other host gets them through React 19's deduplicated, hoisted
 * `<style href precedence>` from `StepsLockedNote` itself (client-rendered routes, where the chunk and its styles
 * arrive together). One source: this string. The #1607 pattern (practice row).
 */
export const STEPS_LOCKED_CSS = `
.lt-steps-locked {
  flex-basis: 100%;
  display: flex;
  align-items: flex-start;
  gap: 6px;
  margin: 0;
  padding: 7px 10px;
  border-radius: 8px;
  border: 1px dashed hsl(220, 14%, 82%);
  background: hsl(220, 20%, 97%);
  color: hsl(220, 13%, 34%);
  font-size: 0.76rem;
  font-weight: 600;
  line-height: 1.45;
  opacity: 1;
}
.lt-steps-locked__icon {
  flex: none;
  line-height: 1.45;
}

/* Predicted Questions — "Show all solutions" at the end of the list. */
.lt-show-all {
  display: flex;
  justify-content: center;
  margin-top: 18px;
  padding: 0 4px;
}
.lt-show-all__btn {
  width: 100%;
  max-width: 420px;
  min-height: 44px;
  padding: 11px 16px;
  border-radius: 10px;
  border: 1px solid hsl(220, 18%, 82%);
  background: #ffffff;
  color: hsl(220, 25%, 12%);
  font-size: 0.85rem;
  font-weight: 700;
  cursor: pointer;
}
.lt-show-all__btn:focus-visible {
  outline: 2px solid hsl(152, 55%, 45%);
  outline-offset: 2px;
}
.lt-show-all__done {
  margin: 0;
  font-size: 0.8rem;
  color: hsl(220, 12%, 40%);
  text-align: center;
}
`;
