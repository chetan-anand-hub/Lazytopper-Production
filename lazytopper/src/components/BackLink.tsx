// src/components/BackLink.tsx
import type { MouseEventHandler } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import type { NavigationState } from '../types/navigation';

interface BackLinkProps {
  defaultTo: string;           // fallback path if no back state is present
  className?: string;
  children?: React.ReactNode;  // optional custom label/content
}

export function BackLink({ defaultTo, className, children }: BackLinkProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as NavigationState | undefined;
  const back = state?.back;
  const backLabel = state?.backLabel;

  const handleClick: MouseEventHandler<HTMLAnchorElement> = (e) => {
    if (back) {
      e.preventDefault();
      navigate(back);
    }
  };

  const label = children ?? backLabel ?? 'Back';
  return (
    <Link to={defaultTo} onClick={handleClick} className={className}>
      {label}
    </Link>
  );
}

export default BackLink;
