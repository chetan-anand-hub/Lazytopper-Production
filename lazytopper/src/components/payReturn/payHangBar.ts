/**
 * payHangBar - PAY-HANG-1. The small bar shown over a Razorpay sheet that is still "waiting" after the buyer came back from their UPI app.
 * Plain DOM (the sheet is opened from non-React service code, so nothing here depends on a React tree being mounted), classes only.
 * It decides nothing about money: services/payReturn drives it and supplies the lines and the actions.
 */
import "./payHang.css";

export interface HangBarButton {
  id: string;
  label: string;
  main?: boolean;
  disabled?: boolean;
  onClick: () => void;
}

export interface HangBar {
  set: (line: string, buttons: HangBarButton[]) => void;
  remove: () => void;
}

export function mountHangBar(): HangBar | null {
  if (typeof document === "undefined" || !document.body) return null;
  const root = document.createElement("div");
  root.className = "lt-hang";
  root.setAttribute("role", "region");
  root.setAttribute("aria-label", "Payment help");
  root.setAttribute("data-testid", "pay-hang-bar");
  const line = document.createElement("p");
  line.className = "lt-hang__line";
  line.setAttribute("role", "status");
  line.setAttribute("aria-live", "polite");
  line.setAttribute("data-testid", "pay-hang-line");
  const actions = document.createElement("div");
  actions.className = "lt-hang__actions";
  root.append(line, actions);
  document.body.appendChild(root); // last child of <body>: after Razorpay's container, so it wins the z-index tie
  return {
    set(text, buttons) {
      line.textContent = text;
      actions.replaceChildren(
        ...buttons.map((b) => {
          const el = document.createElement("button");
          el.type = "button";
          el.className = b.main ? "lt-hang__btn lt-hang__btn--main" : "lt-hang__btn";
          el.textContent = b.label;
          el.disabled = !!b.disabled;
          el.setAttribute("data-testid", `pay-hang-${b.id}`);
          el.addEventListener("click", () => {
            if (!el.disabled) b.onClick();
          });
          return el;
        }),
      );
    },
    remove() {
      root.remove();
    },
  };
}
