/*
 * Daily Mix Playback Service
 *
 * This module defines types and a React hook for managing playback of a
 * heterogeneous playlist of study items. A Daily Mix sequence can
 * contain videos, must‑crack practice questions or revision cards. The
 * playback hook exposes controls to advance, rewind, play/pause and
 * shuffle the queue. The state is maintained locally and callers
 * should persist it externally if cross‑session continuity is needed.
 */

import { useState } from 'react';

// Extend the union to include 'card' for recap items.  This keeps
// compatibility with existing types while allowing DailyMixGenerator
// to return a card payload (e.g. recap notes).  Without this the
// generator will produce an invalid type error at compile time.
export type DailyMixItemType = 'video' | 'question' | 'revision' | 'card';

/**
 * Union describing a single Daily Mix item. Extend the properties as
 * needed to support richer content (e.g. embed URLs, question objects,
 * image attachments).
 */
export interface DailyMixItem {
  id: string;
  /**
   * The underlying media type of this item.  Consumers may treat
   * this as the generic type of content.  See also the `kind`
   * getter in the player which aliases to this value.
   */
  type: DailyMixItemType;
  /** Short label for the item (e.g. topic or concept). */
  title: string;
  /** Rich text description or question stem. */
  description?: string;
  /** Optional arbitrary payload for custom rendering. */
  payload?: any;
}

/**
 * The playback state returned by useDailyMixPlayback. Contains the
 * current index, the item being viewed and control functions.
 */
export interface DailyMixPlayback {
  /**
   * The index of the current item in the playlist.  Use this for
   * implementing progress indicators.
   */
  currentIndex: number;
  /** The currently playing item, or null if the list is empty. */
  current: DailyMixItem | null;
  /** Whether playback is active. */
  isPlaying: boolean;
  /** Whether a previous item is available. */
  canPrev: boolean;
  /** Whether a next item is available. */
  canNext: boolean;
  /** Begin playback (sets isPlaying = true). */
  play: () => void;
  /** Pause playback (sets isPlaying = false). */
  pause: () => void;
  /** Advance to the next item if one exists. */
  next: () => void;
  /** Go back to the previous item if one exists. */
  prev: () => void;
  /** Seek to an arbitrary index within the playlist.  Out-of-bounds indices are clamped. */
  seek: (index: number) => void;
}

/**
 * Hook that manages playback of a sequence of Daily Mix items. By
 * default the queue is played sequentially. Shuffle selects a random
 * index within the list. Wrapping behaviour is disabled; callers can
 * check index bounds to decide whether to loop.
 */
export function useDailyMixPlayback(items: DailyMixItem[]): DailyMixPlayback {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const canPrev = currentIndex > 0;
  const canNext = currentIndex + 1 < items.length;

  const play = () => setIsPlaying(true);
  const pause = () => setIsPlaying(false);

  const next = () => {
    setCurrentIndex((i) => (i + 1 < items.length ? i + 1 : i));
  };
  const prev = () => {
    setCurrentIndex((i) => (i - 1 >= 0 ? i - 1 : 0));
  };
  const seek = (newIndex: number) => {
    if (items.length === 0) return;
    let idx = newIndex;
    if (idx < 0) idx = 0;
    if (idx >= items.length) idx = items.length - 1;
    setCurrentIndex(idx);
  };

  const current = items.length > 0 ? items[currentIndex] : null;

  return {
    currentIndex,
    current,
    isPlaying,
    canPrev,
    canNext,
    play,
    pause,
    next,
    prev,
    seek,
  };
}