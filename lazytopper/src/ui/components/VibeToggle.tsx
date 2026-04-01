// src/ui/components/VibeToggle.tsx
//
// Compact, navbar-friendly vibe toggle (Beast vs Zombie).
//
// Notes:
// - The *global* source of truth is vibeModeContext (localStorage key: `vibeMode`).
// - We also migrate legacy keys if they exist (older builds wrote `lazyTopper.vibeMode`).

import React, { useEffect } from 'react';
import { useVibeMode } from '../../context/vibeModeContext';
import { vibeCommandBadgeCopy } from '../microcopy/vibeCommandBadgeCopy';

export type VibeToggleVariant = 'navbar' | 'page';

export const VibeToggle: React.FC<{ variant?: VibeToggleVariant }> = ({ variant = 'navbar' }) => {
  const { mode, setMode } = useVibeMode();
  const copy = vibeCommandBadgeCopy.vibeToggle;

  // One-time migration for older storage key variants.
  useEffect(() => {
    try {
      const legacy = localStorage.getItem('lazyTopper.vibeMode');
      if (legacy === 'beast' || legacy === 'zombie') {
        // This will also persist via VibeProvider.
        setMode(legacy as any);
        localStorage.removeItem('lazyTopper.vibeMode');
      } else if (legacy === 'High' || legacy === 'Low') {
        setMode(legacy === 'High' ? 'beast' : 'zombie');
        localStorage.removeItem('lazyTopper.vibeMode');
      }
    } catch {
      // ignore
    }
  }, [setMode]);

  // Keep markup aligned to existing CSS rules in styles.css (.vibe-toggle button ...)
  // so we don’t have to fight the stylesheet.
  return (
    <div
      className={`vibe-toggle ${variant === 'page' ? 'vibe-toggle--page' : 'vibe-toggle--navbar'}`}
      aria-label={copy.globalTooltip}
      title={copy.globalTooltip}
    >
      <button type="button" data-active={mode === 'beast'} onClick={() => setMode('beast')} title={copy.beast.tooltip}>
        {copy.beast.label}
      </button>
      <button type="button" data-active={mode === 'zombie'} onClick={() => setMode('zombie')} title={copy.zombie.tooltip}>
        {copy.zombie.label}
      </button>
    </div>
  );
};

export default VibeToggle;
