export type CanonicalSubjectId = "maths" | "science";

export function normalizeTopicSlug(raw: string): string {
  const s = String(raw ?? "").trim().toLowerCase();
  if (!s) return "";
  return s
    .replace(/&/g, " and ")
    .replace(/[/\\]/g, " ")
    .replace(/[_\s]+/g, "-")
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export const canonicalTopicAliasMap: Record<string, string[]> = {
  "pair-of-linear-equations-in-two-variables": [
    "pair-of-linear-equations",
  ],
  "arithmetic-progressions": [
    "arithmetic-progression",
    "maths_arithmetic_progressions",
  ],
  "real-numbers": [
    "maths_real_numbers",
  ],
  polynomials: [
    "maths_polynomials",
  ],
  "coordinate-geometry": [
    "maths_coordinate_geometry",
  ],
  circles: [
    "maths_circles",
  ],
  trigonometry: [
    "maths_introduction_trigonometry",
    "maths_applications_trigonometry",
  ],
  "areas-related-to-circles": [
    "maths_areas_circles",
  ],
  "surface-areas-and-volumes": [
    "maths_surface_areas_volumes",
  ],
  "acids-bases-and-salts": [
    "acids-bases-salts",
    "science_acids_bases_salts",
  ],
  "chemical-reactions-and-equations": [
    "chemical-reactions-equations",
  ],
  "metals-and-non-metals": [
    "metals-non-metals",
    "science_metals_nonmetals",
  ],
  reproduction: [
    "how-do-organisms-reproduce",
    "science_reproduction",
  ],
  "control-and-co-ordination": [
    "science_control_coordination",
  ],
  "heredity-and-evolution": [
    "science_heredity_evolution",
  ],
  "our-environment": [
    "science_our_environment",
  ],
  "light-reflection-and-refraction-incl-human-eye-prism": [
    "light-reflection-refraction",
    "human-eye-colourful-world",
    "science_light_reflection_refraction",
    "science_human_eye_colourful_world",
  ],
};

const aliasToCanonical = (() => {
  const map = new Map<string, string>();
  for (const canonical of Object.keys(canonicalTopicAliasMap)) {
    const normalizedCanonical = normalizeTopicSlug(canonical);
    map.set(normalizedCanonical, normalizedCanonical);
    const aliases = canonicalTopicAliasMap[canonical] || [];
    for (const alias of aliases) {
      map.set(normalizeTopicSlug(alias), normalizedCanonical);
    }
  }
  return map;
})();

export function resolveCanonicalTopicKey(rawTopicKey: string): string {
  const normalized = normalizeTopicSlug(rawTopicKey);
  if (!normalized) return "";
  return aliasToCanonical.get(normalized) || normalized;
}

function uniqueStrings(values: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const value of values) {
    const key = String(value || "").trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(key);
  }
  return out;
}

export function getRuntimeTopicCandidates(rawTopicKey: string): string[] {
  const normalizedInput = normalizeTopicSlug(rawTopicKey);
  const canonical = resolveCanonicalTopicKey(rawTopicKey);
  const aliases = canonicalTopicAliasMap[canonical] || [];
  const seeds = uniqueStrings([
    canonical,
    normalizedInput,
    ...aliases,
    canonical.replace(/-/g, "_"),
    normalizedInput.replace(/-/g, "_"),
  ]);
  const expanded: string[] = [];
  for (const seed of seeds) {
    expanded.push(seed);
    expanded.push(normalizeTopicSlug(seed));
    expanded.push(normalizeTopicSlug(seed).replace(/-/g, "_"));
  }
  return uniqueStrings(expanded);
}

const supplementalSet = new Set<string>([
  "constructions",
  "maths-applications-trigonometry",
  "science-periodic-classification",
  "science-natural-resources-management",
]);

export function isSupplementalTopicKey(rawTopicKey: string): boolean {
  const canonical = resolveCanonicalTopicKey(rawTopicKey);
  const normalized = normalizeTopicSlug(rawTopicKey);
  return supplementalSet.has(canonical) || supplementalSet.has(normalized);
}

export function getSupplementalTopicKeys(): string[] {
  return Array.from(supplementalSet.values());
}
