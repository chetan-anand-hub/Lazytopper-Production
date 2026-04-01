import { useNavigate } from "react-router-dom";

type QuickLink = {
  label: string;
  to: string;
};

export default function ReturnContextBar(props: {
  backTo: string;
  backLabel: string;
  quickLinks?: QuickLink[];
}) {
  const navigate = useNavigate();
  const quickLinks = Array.isArray(props.quickLinks) ? props.quickLinks : [];

  return (
    <div className="ux-return-bar" data-testid="ux-return-context">
      <button
        type="button"
        className="ux-return-bar__back"
        onClick={() => navigate(props.backTo)}
        aria-label={props.backLabel}
      >
        {"<-"} {props.backLabel}
      </button>
      {quickLinks.length > 0 ? (
        <div className="ux-return-bar__chips" aria-label="Quick navigation">
          {quickLinks.map((chip) => (
            <button
              key={`${chip.label}:${chip.to}`}
              type="button"
              className="ux-return-bar__chip"
              onClick={() => navigate(chip.to)}
            >
              {chip.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
