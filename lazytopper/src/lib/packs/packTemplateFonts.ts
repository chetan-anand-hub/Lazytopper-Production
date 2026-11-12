/**
 * The fonts a pack template is rendered with, PINNED: path (relative to the repo root) and the sha256 the file must have.
 * A template render fails if any is not loaded; the uploader records these constants (never a hash computed from whatever is on disk),
 * and packTemplates.test.ts checks the files against them. PR-B embeds these same files to stamp the cover.
 */
export interface PinnedFont {
  family: "Inter" | "Fraunces";
  weight: number;
  file: string;
  sha256: string;
}

export const PINNED_FONTS: readonly PinnedFont[] = [
  { family: "Inter", weight: 400, file: "lazytopper/scripts/packTemplates/fonts/Inter-Regular.otf", sha256: "be6d709dcb730ddaf050cbdae6fe89bd56d5d14dc66885639bbf6f06bd03521b" },
  { family: "Inter", weight: 500, file: "lazytopper/scripts/packTemplates/fonts/Inter-Medium.otf", sha256: "1e65171fccd6f445b7742728454620ec2867356c849af78e71bf2c4f0e3d97ba" },
  { family: "Inter", weight: 600, file: "lazytopper/scripts/packTemplates/fonts/Inter-SemiBold.otf", sha256: "bd68706b7bf8b3c580ae57685a2116bb1704b3a9998309ccfec7cd486f8a593e" },
  { family: "Inter", weight: 700, file: "lazytopper/scripts/packTemplates/fonts/Inter-Bold.otf", sha256: "00fd6f4691ee8884a33b46bf45851b341927c37c30064f558e1befb242971c49" },
  { family: "Inter", weight: 800, file: "lazytopper/scripts/packTemplates/fonts/Inter-ExtraBold.otf", sha256: "2012ceaf1470372c415f95c00495a1ad1ebdcd1cd6a6225808f011d459a9b12a" },
  // the app's own web font (declared by src/styles.css, served from public/fonts): the cover title and every paper title use it
  { family: "Fraunces", weight: 700, file: "lazytopper/public/fonts/fraunces-700-latin.woff2", sha256: "3f3e815263760b8a9c9d149a0cdfd69d05744a15829a6079fdb57480b50e4c51" },
];
