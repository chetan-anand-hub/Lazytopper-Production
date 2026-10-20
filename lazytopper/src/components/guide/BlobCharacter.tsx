import { useEffect, useRef } from "react";
import { Rig, type CharacterKind, type Pose } from "./rig";

/**
 * GUIDE-1 — a React wrapper around one blob rig (./rig.ts). The rig owns its SVG and is
 * updated imperatively (attributes per frame), so React renders this host span ONCE; a pose
 * change is a method call, never a re-render of the drawing.
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
}

export default function BlobCharacter({ kind, pose, className, onTap, still }: BlobCharacterProps) {
  const hostRef = useRef<HTMLSpanElement | null>(null);
  const rigRef = useRef<Rig | null>(null);
  const tapRef = useRef(onTap);
  tapRef.current = onTap;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const rig = new Rig(host, kind, pose, still === undefined ? {} : { still });
    rigRef.current = rig;
    return () => {
      rig.destroy();
      rigRef.current = null;
    };
    // The rig is built once per kind; later pose changes go through set() below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, still]);

  useEffect(() => {
    const rig = rigRef.current;
    if (rig && rig.pose !== pose) rig.set(pose);
  }, [pose]);

  return (
    <span
      ref={hostRef}
      className={className ? `lt-gr-host ${className}` : "lt-gr-host"}
      data-testid={`blob-${kind}`}
      data-pose={pose}
      aria-hidden="true"
      onPointerUp={() => {
        rigRef.current?.squish();
        tapRef.current?.();
      }}
    />
  );
}
