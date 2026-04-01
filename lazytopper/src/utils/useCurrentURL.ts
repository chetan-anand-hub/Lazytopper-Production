// src/utils/useCurrentURL.ts
import { useLocation } from 'react-router-dom';

/** Returns the current pathname and search string (e.g. /trends/10/Maths?topic=geometry). */
export function useCurrentURL(): string {
  const location = useLocation();
  return location.pathname + location.search;
}
