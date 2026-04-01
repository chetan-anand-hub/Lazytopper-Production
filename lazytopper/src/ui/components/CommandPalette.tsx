// src/ui/components/CommandPalette.tsx
//
// Component: CommandPalette
//
// A searchable overlay that lists quick actions defined in
// commandPaletteConfig.ts.  This implementation retains the original
// behaviour of searching over both the label and description fields,
// displays a helper line from the microcopy resource and calls back
// to the parent when an action is selected.  It uses CSS classes
// (command‑palette, command‑palette-backdrop, etc.) for styling so that
// the look and feel can be controlled via your existing theme without
// hardcoded colours.

import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { QuickAction } from '../../services/commandPaletteConfig';
import { defaultQuickActions } from '../../services/commandPaletteConfig';
import { vibeCommandBadgeCopy } from '../microcopy/vibeCommandBadgeCopy';

export interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (action: QuickAction, query: string) => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose, onSelect }) => {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const copy = vibeCommandBadgeCopy.commandPalette;

  const filtered = useMemo(() => {
    const lower = query.toLowerCase();
    return defaultQuickActions.filter(
      (a) =>
        a.label.toLowerCase().includes(lower) ||
        (a.description || '').toLowerCase().includes(lower) ||
        a.id.toLowerCase().includes(lower),
    );
  }, [query]);

  // Focus input when palette opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
    }
  }, [isOpen]);

  const handleClose = () => {
    setQuery('');
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      handleClose();
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      const first = filtered[0];
      if (first) onSelect(first, query);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="command-palette-backdrop" onClick={handleClose}>
      <div
        className="command-palette"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
        role="dialog"
        aria-modal="true"
      >
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={copy.searchPlaceholder}
          className="command-palette-input"
        />
        {/* Helper line below input */}
        <div className="command-palette-helper" style={{ padding: '4px 16px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          {copy.helperLine || copy.helperEmojiVariant}
        </div>
        <ul role="listbox" className="command-palette-list">
          {filtered.map((action) => (
            <li key={action.id} role="option">
              <button
                type="button"
                onClick={() => onSelect(action, query)}
                className="command-palette-option"
              >
                <div className="command-option-label" style={{ fontWeight: 600 }}>{action.label}</div>
                {action.description && (
                  <div className="command-option-description" style={{ fontSize: '0.8rem', opacity: 0.8 }}>
                    {action.description}
                  </div>
                )}
              </button>
            </li>
          ))}
          {filtered.length === 0 && (
            <li className="command-palette-empty">No commands found</li>
          )}
        </ul>
      </div>
    </div>
  );
};

export default CommandPalette;
