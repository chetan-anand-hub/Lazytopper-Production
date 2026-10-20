import { useEffect, useRef } from "react";
import { Rig, type CharacterKind, type Pose } from "./rig";
import "./rig.css";

/**
 * GUIDE-1 — a React wrapper around one blob rig (./rig.ts). The rig owns its SVG and is
 * updated imperatively (attributes per frame), so React renders this host span ONCE; a pose
 * change is a method call, never a re-render of the drawing.
 *
 * RIG-2 — the full cast: `kind="mummy"`, every pose, `bagLabel` (the sack's live number for the
 * `bag` pose) and `pose="peek"`: Byte's peek mode, where the SVG viewBox crops to the top of
 * the body, everything below the edge is clipped inside the SVG, and he rises up from that
 * edge. The host is then only as tall as the visible part, so a caller places it on a bottom
 * edge and nothing spills (the host gets `data-peek` for its own layout CSS).
 *
 * Decorative: the SVG is aria-hidden; the words the character "says" live in the caller's
 * speech bubble, which is real text.
 */
export interface BlobCharacterProps {
  kind: CharacterKind;
  pose: Pose;
  /** Layout class (size) for the host; CSS lives in guide.css. */
  className?: string;
  /** Tapped: the rig squishes, then this runs. */
  onTap?: () => void;
  /** Force a still pose (tests); default follows prefers-reduced-motion. */
  still?: boolean;
  /** The number on the sack (the `bag` pose). Omitted → an empty slot. */
  bagLabel?: number;
}

export default function BlobCharacter({ kind, pose, className, onTap, still, bagLabel }: BlobCharacterProps) {
  const hostRef = useRef<HTMLSpanElement | null>(null);
  const rigRef = useRef<Rig | null>(null);
  const tapRef = useRef(onTap);
  tapRef.current = onTap;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const rig = new Rig(host, kind, pose, {
      ...(still === undefined ? {} : { still }),
      ...(bagLabel === undefined ? {} : { bagLabel }),
    });
    rigRef.current = rig;
    return () => {
      rig.destroy();
      rigRef.current = null;
    };
    // The rig is built once per kind; later pose / label changes go through the effects below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, still]);

  useEffect(() => {
    const rig = rigRef.current;
    if (rig && rig.pose !== pose) rig.set(pose);
  }, [pose]);

  useEffect(() => {
    rigRef.current?.setBagLabel(bagLabel);
  }, [bagLabel]);

  return (
    <span
      ref={hostRef}
      className={className ? `lt-gr-host ${className}` : "lt-gr-host"}
      data-testid={`blob-${kind}`}
      data-pose={pose}
      data-peek={pose === "peek" ? "true" : undefined}
      aria-hidden="true"
      onPointerUp={() => {
        rigRef.current?.squish();
        tapRef.current?.();
      }}
    />
  );
}
