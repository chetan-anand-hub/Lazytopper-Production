import React, { createContext, useContext, useState, useEffect } from 'react';

/**
 * VibeMode defines the two supported energy levels in LazyTopper.  The Beast
 * mode is for high‑energy, intensive study sessions while Zombie mode
 * represents lighter, low‑energy review.  Components can use this type to
 * provide proper type hints when reading from the context or switching
 * between modes.
 */
export type VibeMode = 'beast' | 'zombie';

/** Legacy vibe level type used by older components.  'High' corresponds
 * to Beast mode and 'Low' corresponds to Zombie mode.  Keeping this
 * alias ensures backwards compatibility with code written against the
 * early practice engine and microcopy.
 */
export type VibeLevel = 'High' | 'Low';

interface VibeContextValue {
  /**
   * The current global vibe mode.  Defaults to `'beast'` if no prior
   * selection exists.  This value is persisted via `localStorage` so it
   * survives page reloads and sessions.
   */
  mode: VibeMode;
  /**
   * Legacy-level representation of the vibe ("High" for Beast,
   * "Low" for Zombie).  Exposed for backwards compatibility.
   */
  level: VibeLevel;
  /**
   * Update the vibe mode.  Passing `'beast'` or `'zombie'` will update
   * local state and persist the value to `localStorage`.
   */
  setMode: (mode: VibeMode) => void;
  /**
   * Update the legacy level and implicitly update the mode.  Accepts
   * "High" or "Low" and converts them to the corresponding mode.
   */
  setLevel: (level: VibeLevel) => void;
}

// Create a context without a default value so that misuse is obvious.  If
// `useVibeMode` is called outside of `VibeProvider` an error will be thrown.
const VibeContext = createContext<VibeContextValue | undefined>(undefined);

/**
 * VibeProvider wraps your application and exposes the vibe state via
 * React context.  It initialises the value from localStorage and writes
 * updates back to localStorage whenever the mode changes.  If no
 * persisted value exists, the initial mode defaults to 'beast'.
 */
export const VibeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Initialise mode from localStorage.  Accept both new enum and legacy values.
  const [mode, setMode] = useState<VibeMode>(() => {
    if (typeof window === 'undefined') return 'beast';
    try {
      const saved = localStorage.getItem('vibeMode');
      if (saved === 'zombie' || saved === 'beast') return saved as VibeMode;
      if (saved === 'High') return 'beast';
      if (saved === 'Low') return 'zombie';
      return 'beast';
    } catch {
      return 'beast';
    }
  });

  // Derive legacy level from mode
  const level: VibeLevel = mode === 'beast' ? 'High' : 'Low';

  // Persist to localStorage when mode changes
  useEffect(() => {
    try {
      localStorage.setItem('vibeMode', mode);
    } catch {
      /* ignore storage errors (e.g. private mode) */
    }
  }, [mode]);

  // setLevel converts the legacy level to a modern mode
  const setLevel = (lvl: VibeLevel) => {
    setMode(lvl === 'High' ? 'beast' : 'zombie');
  };

  return (
    <VibeContext.Provider value={{ mode, level, setMode, setLevel }}>
      {children}
    </VibeContext.Provider>
  );
};

/**
 * Custom hook to access the vibe mode context.  Throws an error if used
 * outside of a `VibeProvider`.  Returns the current mode and a setter.
 */
export function useVibeMode(): VibeContextValue {
  const ctx = useContext(VibeContext);
  if (!ctx) {
    throw new Error('useVibeMode must be used within a VibeProvider');
  }
  return ctx;
}