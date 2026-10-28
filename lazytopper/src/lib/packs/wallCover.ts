/**
 * wallCover — PACK-LINKS-1: the cover (chapters / subject) of the paper a download wall refused. The wall provides it,
 * PacksWallButton (several lazy layers below) reads it, so PacksEntryPoint's props stay as they are. null = not
 * provided: the button then reads the page address as before. Tiny on purpose: the wall is eager.
 */
import { createContext } from "react";

export interface WallCover {
  chapters?: readonly string[];
  subject?: "maths" | "science";
}
export const WallCoverContext = createContext<WallCover | null>(null);
