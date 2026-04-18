'use strict';

/**
 * addDiagramLinks.cjs
 * Adds visualExplainerId to every B/C/D/E question in the 34 diagram-heavy
 * topic files, and prepends a diagram reference step to solutionSteps for
 * proof / ray-diagram / construction / biology-structure / chemistry questions.
 *
 * Handles three question formats found in these files:
 *   1. Single-line compact   { id: "...", ..., isCompetencyBased: true }
 *   2. Multi-line JSON       { "id": "...", ..., "isCompetencyBased": true }
 *   3. No isCompetencyBased  { id: "...", ..., finalAnswer: "..." }
 */

const fs   = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

// ─────────────────────────────────────────────────────────────────────────────
// FILE CONFIGURATIONS  (34 files, keyword → visual-ID mapping per file)
// ─────────────────────────────────────────────────────────────────────────────

const FILE_CONFIGS = [

  /* ── MATHS: TRIANGLES ───────────────────────────────────────────────────── */
  mkCfg('src/data/questionBanks/class10/maths/triangles.pack2.ts', trianglesVid),
  mkCfg('src/data/questionBanks/class10/maths/triangles.pack3.ts', trianglesVid),

  /* ── MATHS: CIRCLES ─────────────────────────────────────────────────────── */
  mkCfg('src/data/questionBanks/class10/maths/circles.pack1.ts', circlesVid),
  mkCfg('src/data/questionBanks/class10/maths/circles.pack2.ts', circlesVid),

  /* ── MATHS: TRIGONOMETRY ────────────────────────────────────────────────── */
  mkCfg('src/data/questionBanks/class10/maths/trigonometry.pack2.ts', trigVid),
  mkCfg('src/data/questionBanks/class10/maths/trigonometry.pack3.ts', trigVid),

  /* ── MATHS: COORDINATE GEOMETRY ─────────────────────────────────────────── */
  mkCfg('src/data/questionBanks/class10/maths/coordinateGeometry.pack1.ts', coordVid),
  mkCfg('src/data/questionBanks/class10/maths/coordinateGeometry.pack2.ts', coordVid),

  /* ── MATHS: AREAS RELATED TO CIRCLES ────────────────────────────────────── */
  mkCfg('src/data/questionBanks/class10/maths/areasRelatedToCircles.pack1.ts', areasVid),
  mkCfg('src/data/questionBanks/class10/maths/areasRelatedToCircles.pack2.ts', areasVid),

  /* ── SCIENCE: LIGHT ─────────────────────────────────────────────────────── */
  mkCfg('src/data/questionBanks/class10/science/light.pack1.ts', lightVid),
  mkCfg('src/data/questionBanks/class10/science/light.pack2.ts', lightVid),

  /* ── SCIENCE: HUMAN EYE ─────────────────────────────────────────────────── */
  mkCfg('src/data/questionBanks/class10/science/humanEyeAndColourfulWorld.pack1.ts', eyeVid),
  mkCfg('src/data/questionBanks/class10/science/humanEyeAndColourfulWorld.pack2.ts', eyeVid),

  /* ── BIOLOGY: LIFE PROCESSES ─────────────────────────────────────────────── */
  mkCfg('src/data/questionBanks/class10/science/lifeProcesses.pack1.ts', lifeVid),
  mkCfg('src/data/questionBanks/class10/science/lifeProcesses.pack2.ts', lifeVid),

  /* ── BIOLOGY: CONTROL & COORDINATION ────────────────────────────────────── */
  mkCfg('src/data/questionBanks/class10/science/controlAndCoordination.pack1.ts', controlVid),
  mkCfg('src/data/questionBanks/class10/science/controlAndCoordination.pack2.ts', controlVid),

  /* ── BIOLOGY: REPRODUCTION ───────────────────────────────────────────────── */
  mkCfg('src/data/questionBanks/class10/science/reproduction.pack1.ts', reproVid),
  mkCfg('src/data/questionBanks/class10/science/reproduction.pack2.ts', reproVid),

  /* ── BIOLOGY: HEREDITY ───────────────────────────────────────────────────── */
  mkCfg('src/data/questionBanks/class10/science/heredity.pack1.ts', heredityVid),
  mkCfg('src/data/questionBanks/class10/science/heredity.pack2.ts', heredityVid),

  /* ── SCIENCE: ELECTRICITY ────────────────────────────────────────────────── */
  mkCfg('src/data/questionBanks/class10/science/electricity.pack1.ts', electricityVid),
  mkCfg('src/data/questionBanks/class10/science/electricity.pack2.ts', electricityVid),

  /* ── SCIENCE: MAGNETIC EFFECTS ───────────────────────────────────────────── */
  mkCfg('src/data/questionBanks/class10/science/magneticEffects.pack1.ts', magneticVid),
  mkCfg('src/data/questionBanks/class10/science/magneticEffects.pack2.ts', magneticVid),

  /* ── CHEMISTRY: CHEMICAL REACTIONS ──────────────────────────────────────── */
  mkCfg('src/data/questionBanks/class10/science/chemicalReactions.pack1.ts', chemRxnVid),
  mkCfg('src/data/questionBanks/class10/science/chemicalReactions.pack2.ts', chemRxnVid),

  /* ── CHEMISTRY: ACIDS, BASES AND SALTS ──────────────────────────────────── */
  mkCfg('src/data/questionBanks/class10/science/acidsBasesSalts.pack1.ts', acidsVid),
  mkCfg('src/data/questionBanks/class10/science/acidsBasesSalts.pack2.ts', acidsVid),

  /* ── CHEMISTRY: METALS AND NON-METALS ───────────────────────────────────── */
  mkCfg('src/data/questionBanks/class10/science/metalsNonMetals.pack1.ts', metalsVid),
  mkCfg('src/data/questionBanks/class10/science/metalsNonMetals.pack2.ts', metalsVid),

  /* ── CHEMISTRY: CARBON COMPOUNDS ────────────────────────────────────────── */
  mkCfg('src/data/questionBanks/class10/science/carbonCompounds.pack1.ts', carbonVid),
  mkCfg('src/data/questionBanks/class10/science/carbonCompounds.pack2.ts', carbonVid),
];

function mkCfg(file, getVisualId) { return { file, getVisualId }; }

// ─────────────────────────────────────────────────────────────────────────────
// VISUAL ID SELECTORS  (one per topic, shared across pack1/pack2)
// ─────────────────────────────────────────────────────────────────────────────

function trianglesVid(qt) {
  const q = qt.toLowerCase();
  if (/\bbpt\b|thales|basic proportionality|\bde\s*[∥‖]\s*bc\b|parallel.*\bde\b|\bde\b.*parallel/.test(q))
    return 'maths-triangles-basic-proportionality-theorem';
  if (/\bpythagoras\b|hypotenuse|right[- ]angle.*proof|prove.*right[- ]angle/.test(q))
    return 'maths-triangles-pythagoras-theorem-visual-proof';
  if (/areas?\s+of\s+similar|ratio\s+of\s+areas|area.*similar/.test(q))
    return 'maths-triangles-areas-of-similar-triangles';
  return 'maths-triangles-similar-triangles-and-criteria';
}

function circlesVid(qt) {
  const q = qt.toLowerCase();
  if (/equal tangents|pa\s*=\s*pb|from\s+(?:an?\s+)?external point|lengths.*tangents.*equal|tangents.*from.*external/.test(q))
    return 'maths-circles-number-of-tangents-from-external-point';
  if (/tangent.*perp|radius.*⊥|oa\s*⊥|perp.*radius|right angle.*tangent|tangent.*right angle/.test(q))
    return 'maths-circles-tangent-properties';
  return 'maths-circles-tangent-to-a-circle';
}

function trigVid(qt) {
  const q = qt.toLowerCase();
  if (/\bheight\b|\bdistance\b|\belevation\b|\bdepression\b|\btower\b|\bcliff\b|\blighthouse\b/.test(q))
    return 'maths-trigonometry-height-and-distance-problems';
  if (/\bidentit|\bsin²\s*\+\s*cos²|prove.*trig|trig.*prove|prove.*identity|\bprove\s+that\b|\bprove\b.*(?:lhs|rhs|cosec|cot\s|sec\s|tan\s|sin\s|cos\s)/.test(q))
    return 'maths-trigonometry-trigonometric-identities';
  if (/30°|45°|60°|standard angle|table of ratios/.test(q))
    return 'maths-trigonometry-trigonometric-ratios-of-standard-angles';
  return 'maths-trigonometry-trigonometric-ratios';
}

function coordVid(qt) {
  const q = qt.toLowerCase();
  if (/collinear|area\s*=\s*0/.test(q))
    return 'maths-coordinate-geometry-collinearity-condition';
  if (/section formula|midpoint|mid.point|divides.*ratio|ratio.*divides|divide.*internally|divide.*externally/.test(q))
    return 'maths-coordinate-geometry-section-formula';
  if (/area.*triangle.*coord|coord.*area.*triangle/.test(q))
    return 'maths-coordinate-geometry-area-of-triangle-using-coordinates';
  return 'maths-coordinate-geometry-distance-formula';
}

function areasVid(qt) {
  const q = qt.toLowerCase();
  if (/shaded|combined|subtract.*area|area.*subtract/.test(q))
    return 'maths-areas-circles-combined-figures-area';
  if (/\bsector\b|\barc\b|angle subtended|\bsegment\b/.test(q))
    return 'maths-areas-circles-sector-and-segment';
  return 'maths-areas-circles-area-of-sector-formula';
}

function lightVid(qt) {
  const q = qt.toLowerCase();
  if (/mirror formula|1\/v.*1\/u|derive.*mirror|magnification.*mirror/.test(q))
    return 'science-light-mirror-formula-and-magnification';
  if (/\blens\b|convex lens|concave lens|lens formula|derive.*lens/.test(q))
    return 'science-light-lens-formula-and-ray-diagrams';
  if (/refraction|snell|glass slab|refractive index|lateral displacement/.test(q))
    return 'science-light-refraction-of-light';
  return 'science-light-reflection-of-light';
}

function eyeVid(qt) {
  const q = qt.toLowerCase();
  if (/myopia|hypermetropia|defect|correction|short.sight|long.sight|presbyopia/.test(q))
    return 'science-human-eye-defects-of-vision-and-correction';
  if (/\bprism\b|dispersion|spectrum|rainbow|scattering|tyndall/.test(q))
    return 'science-human-eye-dispersion-of-light-and-rainbow';
  return 'science-human-eye-structure-of-human-eye';
}

function lifeVid(qt) {
  const q = qt.toLowerCase();
  if (/\bheart\b|atrium|ventricle|circulation|blood vessel|aorta|vena cava/.test(q))
    return 'science-life-processes-human-heart-and-blood-circulation';
  if (/digestion|alimentary|enzyme|intestine|stomach|oesophagus|bile|pancreas/.test(q))
    return 'science-life-processes-nutrition-in-humans';
  if (/photosynthesis|chlorophyll|co[₂2]|glucose.*leaf|light.*leaf|starch.*leaf/.test(q))
    return 'science-life-processes-photosynthesis';
  return 'science-life-processes-respiration-and-excretion';
}

function controlVid(qt) {
  const q = qt.toLowerCase();
  if (/reflex|arc|involuntary|stimulus.*response|knee jerk|spinal reflex/.test(q))
    return 'science-control-coordination-reflex-arc';
  if (/auxin|tropism|phototropism|geotropism|plant.*hormone/.test(q))
    return 'science-control-coordination-plant-hormones-and-tropisms';
  return 'science-control-coordination-nervous-system';
}

function reproVid(qt) {
  const q = qt.toLowerCase();
  if (/\bflower\b|stamen|pistil|pollen|pollination|sepal|petal/.test(q))
    return 'science-reproduction-flower-structure-and-pollination';
  if (/\bmale\b.*repro|testis|uterus|fallopian|sperm|ovum|female.*repro/.test(q))
    return 'science-reproduction-human-reproductive-system';
  return 'science-reproduction-types-of-asexual-reproduction';
}

function heredityVid(qt) {
  const q = qt.toLowerCase();
  if (/xx|xy|sex chromosome|sex determination|sex.linked/.test(q))
    return 'science-heredity-evolution-sex-determination';
  return 'science-heredity-evolution-mendels-laws-of-inheritance';
}

function electricityVid(qt) {
  const q = qt.toLowerCase();
  if (/resistivity|\bρ\b|specific resistance/.test(q))
    return 'science-electricity-resistivity';
  if (/series.*parallel|parallel.*series|combination.*resistor|resistor.*combination/.test(q))
    return 'science-electricity-series-and-parallel-circuits';
  if (/\bpower\b|p\s*=\s*vi|\bwatt\b|\bkwh\b|electrical energy/.test(q))
    return 'science-electricity-electric-power-and-energy';
  if (/\bcircuit\b|ammeter|voltmeter|\bbattery\b|\bswitch\b|draw.*circuit/.test(q))
    return 'science-electricity-circuit-diagram-builder';
  return 'science-electricity-ohms-law';
}

function magneticVid(qt) {
  const q = qt.toLowerCase();
  if (/\bmotor\b|generator|\bac\b|\bdc\b|electromagnetic induction|dynamo|domestic.*circuit|household.*circuit|live.*wire|neutral.*wire|earth.*wire|\bmcb\b|miniature circuit breaker/.test(q))
    return 'science-magnetic-effects-electric-motor-and-generator';
  if (/fleming|force on conductor|left.hand rule|right.hand rule/.test(q))
    return 'science-magnetic-effects-flemings-left-hand-rule';
  if (/solenoid|\bcoil\b|electromagnet|\bturns\b/.test(q))
    return 'science-magnetic-effects-electromagnet-and-solenoid';
  return 'science-magnetic-effects-magnetic-field-lines';
}

function chemRxnVid(qt) {
  const q = qt.toLowerCase();
  if (/oxidation|reduction|\bredox\b|gain.*oxygen|loss.*oxygen/.test(q))
    return 'science-chemical-reactions-oxidation-and-reduction';
  if (/corrosion|rancidity|\brust\b|tarnish/.test(q))
    return 'science-chemical-reactions-corrosion-and-rancidity';
  if (/balance|balanced.*equation|balance.*equation/.test(q))
    return 'science-chemical-reactions-balancing-chemical-equations';
  return 'science-chemical-reactions-types-of-chemical-reactions';
}

function acidsVid(qt) {
  const q = qt.toLowerCase();
  if (/nacl|bleaching powder|baking soda|washing soda|plaster of paris/.test(q))
    return 'science-acids-bases-salts-common-salt-and-its-products';
  if (/neutrali[sz]|salt formation|acid.*base.*react|base.*acid.*react/.test(q))
    return 'science-acids-bases-salts-acid-base-reactions';
  return 'science-acids-bases-salts-p-h-scale';
}

function metalsVid(qt) {
  const q = qt.toLowerCase();
  if (/electrolysis|extraction|\bore\b|roasting|calcination|smelting|thermit/.test(q))
    return 'science-metals-nonmetals-extraction-of-metals';
  if (/ionic.*bond|electron.*transfer|transfer.*electron|nacl.*form/.test(q))
    return 'science-metals-nonmetals-ionic-bonding';
  if (/reactivity series|displacement|more reactive|activity series/.test(q))
    return 'science-metals-nonmetals-reactivity-series';
  return 'science-metals-nonmetals-physical-properties-of-metals';
}

function carbonVid(qt) {
  const q = qt.toLowerCase();
  if (/\bsoap\b|detergent|cleansing|micelle|hydrophilic|hydrophobic/.test(q))
    return 'science-carbon-compounds-soaps-and-detergents';
  if (/functional group|\balcohol\b|\baldehyde\b|\bketone\b|carboxylic|\bester\b/.test(q))
    return 'science-carbon-compounds-functional-groups';
  if (/homologous|ch[₂2].*series|same general formula|differ.*ch2/.test(q))
    return 'science-carbon-compounds-homologous-series';
  if (/straight chain|branched chain|\bcyclic\b|\bisomer\b|chain structure/.test(q))
    return 'science-carbon-compounds-carbon-chain-structures';
  return 'science-carbon-compounds-covalent-bonding-in-carbon';
}

// ─────────────────────────────────────────────────────────────────────────────
// QUESTION OBJECT EXTRACTION  (brace-counting with string awareness)
// ─────────────────────────────────────────────────────────────────────────────

function extractQuestions(content) {
  const objects = [];
  const len = content.length;
  let i = 0;

  while (i < len) {
    if (content[i] !== '{') { i++; continue; }

    // Peek ahead: accept only objects whose first field is `id` (possibly quoted)
    const ahead = content.slice(i, Math.min(i + 60, len));
    if (!/^\{\s*"?id"?\s*:/.test(ahead)) { i++; continue; }

    const start = i;
    let depth = 0;
    let j = i;

    while (j < len) {
      const ch = content[j];

      // Skip string contents
      if (ch === '"') {
        j++;
        while (j < len) {
          if (content[j] === '\\') { j += 2; continue; }
          if (content[j] === '"')  { j++; break; }
          j++;
        }
        continue;
      }
      if (ch === "'") {
        j++;
        while (j < len) {
          if (content[j] === '\\') { j += 2; continue; }
          if (content[j] === "'")  { j++; break; }
          j++;
        }
        continue;
      }

      if (ch === '{') { depth++; j++; continue; }
      if (ch === '}') {
        depth--;
        if (depth === 0) {
          objects.push({ start, end: j + 1, text: content.slice(start, j + 1) });
          i = j + 1;
          break;
        }
        j++; continue;
      }
      j++;
    }
    if (j >= len) break;
  }
  return objects;
}

// ─────────────────────────────────────────────────────────────────────────────
// FIELD UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

function getSection(qText) {
  // Matches both compact `section: "B"` and JSON-style `"section": "B"`
  const m = qText.match(/section["']?\s*:\s*"([A-E])"/);
  return m ? m[1] : null;
}

function hasVisualExplainerId(qText) {
  return /visualExplainerId/.test(qText);
}

function getQuestionText(qText) {
  const m = qText.match(/"?questionText"?\s*:\s*"((?:[^"\\]|\\.)*)"/);
  return m ? m[1] : '';
}

function getFirstSolutionStep(qText) {
  const m = qText.match(/"?solutionSteps"?\s*:\s*\[\s*"((?:[^"\\]|\\.)*)"/);
  return m ? m[1].toLowerCase() : '';
}

function hasSolutionSteps(qText) {
  return /"?solutionSteps"?\s*:\s*\[/.test(qText);
}

// ─────────────────────────────────────────────────────────────────────────────
// DIAGRAM STEP DECISION
// ─────────────────────────────────────────────────────────────────────────────

const DIAGRAM_NEEDED = [
  /\bprove\b/i,
  /\bproof\b/i,
  /\bdraw\b/i,
  /\bconstruct\b/i,
  /ray diagram/i,
  /\bdiagram\b/i,
  /\blabel\b/i,
  /\bsketch\b/i,
  /angles? of elevation/i,
  /angles? of depression/i,
  /\binclination\b/i,
  /makes? an angle|making an angle|\bangle.*makes\b/i,
  /height.*tower|tower.*height/i,
  /height.*building|building.*height/i,
  /balanced.*equation|balance.*equation/i,
  /structural formula/i,
  /electron dot/i,
  /\bcircuit\b/i,
  /punnett square/i,
  /genetic.*cross|monohybrid|dihybrid/i,
  /sex.determination/i,
  /use a cross|show.*cross|cross between|cross diagram/i,
  /xx.*xy|xy.*xx/i,
  /derive.*formula/i,
];

function needsDiagramStep(questionText) {
  return DIAGRAM_NEEDED.some(re => re.test(questionText));
}

function firstStepIsAlreadyDiagram(qText) {
  const first = getFirstSolutionStep(qText).toLowerCase();
  return first.startsWith('construction:') ||
         first.startsWith('ray diagram:') ||
         first.startsWith('diagram:') ||
         first.startsWith('refer to') ||
         first.startsWith('circuit diagram:') ||
         first.startsWith('punnett square:') ||
         first.startsWith('plot:') ||
         first.startsWith('electron dot diagram:') ||
         first.startsWith('balanced equation:') ||
         first.startsWith('balanced equations:') ||
         first.startsWith('draw ') ||
         first.startsWith('draw the') ||
         first.startsWith('write the balanced') ||
         first.startsWith('write the skeletal');
}

// ─────────────────────────────────────────────────────────────────────────────
// DIAGRAM STEP TEMPLATES
// ─────────────────────────────────────────────────────────────────────────────

function getDiagramStep(questionText, visualId) {
  const qt = questionText;
  const q  = qt.toLowerCase();

  // ── MATHS ─────────────────────────────────────────────────────────────────
  if (visualId === 'maths-triangles-basic-proportionality-theorem')
    return 'Construction: Draw △ABC with line DE ∥ BC, where D is on AB and E is on AC. Label all given measurements.';

  if (visualId === 'maths-triangles-pythagoras-theorem-visual-proof')
    return 'Construction: Draw right-angled △ABC with the right angle at B. Mark hypotenuse AC and both legs AB and BC.';

  if (visualId === 'maths-triangles-areas-of-similar-triangles')
    return 'Construction: Draw the two similar triangles with corresponding vertices labeled. Mark the ratio of corresponding sides.';

  if (visualId === 'maths-triangles-similar-triangles-and-criteria') {
    if (/\bprove\b|\bproof\b/i.test(qt))
      return 'Construction: Draw the two triangles with equal corresponding angles or proportional sides as given. Label corresponding vertices.';
    if (/\bdraw\b|\bdiagram\b|\bsketch\b/i.test(qt))
      return 'Diagram: Sketch the two similar triangles with corresponding vertices aligned and matching angle marks shown.';
    if (/\bheight\b|\bbuilding\b|\btower\b|\bangle\b|\bscale.*model\b/i.test(qt))
      return 'Construction: Draw the two similar right triangles — scale model and actual structure (or pole and shadow). Label all given measurements (base, height, angle). Show corresponding angles as equal and corresponding sides as proportional.';
    return null;
  }

  if (visualId === 'maths-circles-number-of-tangents-from-external-point')
    return 'Construction: Draw a circle with centre O and external point P. Draw tangents PA and PB, touching the circle at A and B. Join OA, OB, and OP.';

  if (visualId === 'maths-circles-tangent-properties') {
    if (/\bprove\b|\bproof\b/i.test(qt))
      return 'Construction: Draw a circle with centre O and point P on the circle. Draw the tangent l at P and radius OP. Assume l is not perpendicular to OP and derive a contradiction.';
    return 'Construction: Draw a circle with centre O. Mark the tangent at point P and the radius OP. Note OP ⊥ tangent.';
  }

  if (visualId === 'maths-circles-tangent-to-a-circle') {
    if (/\bprove\b|\bproof\b|\bdraw\b|\bdiagram\b/i.test(qt))
      return 'Construction: Draw a circle with centre O and mark the point of tangency. Draw the tangent line at that point.';
    return null;
  }

  if (visualId === 'maths-trigonometry-height-and-distance-problems') {
    if (/depression/i.test(qt))
      return 'Diagram: Draw a vertical building or cliff. Mark the observer at the top, the object at ground level, and the angle of depression θ. Draw the horizontal reference line from the observer.';
    return 'Diagram: Draw a vertical tower or building of height h. Mark the observation point P on the ground, the angle of elevation θ at P, and label all given distances.';
  }

  if (visualId === 'maths-trigonometry-trigonometric-identities') {
    if (/\bprove\b|\bproof\b/i.test(qt))
      return 'Construction: Draw a right-angled triangle with angle θ. Label the opposite side, adjacent side, and hypotenuse to relate sin, cos, and tan.';
    return null;
  }

  if (visualId === 'maths-trigonometry-trigonometric-ratios' ||
      visualId === 'maths-trigonometry-trigonometric-ratios-of-standard-angles') {
    if (/\bdraw\b|\bdiagram\b|\bconstruct\b/i.test(qt))
      return 'Construction: Draw a right-angled triangle with the given angle θ. Label the sides as opposite, adjacent, and hypotenuse relative to θ.';
    return null;
  }

  if (visualId.includes('coordinate-geometry')) {
    if (/\bdraw\b|\bplot\b|\bdiagram\b/i.test(qt))
      return 'Diagram: Plot the given points on a coordinate plane. Label coordinates, draw the relevant line segments or triangle, and mark all known values.';
    if (/\bprove\b|\bshow\b|\bverify\b/i.test(qt))
      return 'Plot: Mark all given points on a coordinate grid. Label them with their coordinates. This visual setup helps confirm geometric properties (collinearity, triangle type, quadrilateral shape) before computing.';
    return null;
  }

  if (visualId === 'maths-areas-circles-combined-figures-area')
    return 'Diagram: Draw the combined figure accurately. Label all given dimensions (radius, side, angle). Shade the region whose area is required.';

  if (visualId === 'maths-areas-circles-sector-and-segment' ||
      visualId === 'maths-areas-circles-area-of-sector-formula') {
    if (/\bdraw\b|\bdiagram\b|\bsketch\b|\bshaded\b/i.test(qt))
      return 'Diagram: Draw a circle with centre O and radius r. Mark the sector or segment with the given central angle. Label all given measurements.';
    return null;
  }

  // ── LIGHT ──────────────────────────────────────────────────────────────────
  if (visualId === 'science-light-lens-formula-and-ray-diagrams') {
    if (/concave lens|diverging/i.test(qt))
      return 'Ray Diagram: Draw a concave (diverging) lens. Mark the principal axis, optical centre O, foci F₁ and F₂, and the object. Draw the three standard rays to locate the image.';
    return 'Ray Diagram: Draw a convex (converging) lens. Mark the principal axis, optical centre O, foci F₁ and F₂, and the object. Draw the three standard rays to locate the image.';
  }

  if (visualId === 'science-light-mirror-formula-and-magnification')
    return 'Ray Diagram: Draw a concave mirror. Mark the pole P, focus F, and centre of curvature C in front of the mirror. Place the object and draw standard rays to locate the image.';

  if (visualId === 'science-light-reflection-of-light') {
    if (/\bdraw\b|\bdiagram\b|\bray\b/i.test(qt)) {
      if (/convex mirror/i.test(qt))
        return 'Ray Diagram: Draw a convex mirror. Mark the pole P, virtual focus F, and virtual centre of curvature C (both behind the mirror). Draw incident and reflected rays.';
      return 'Ray Diagram: Draw a concave mirror. Mark the pole P, focus F, and centre of curvature C in front of the mirror. Draw standard rays to construct the image for the given object position.';
    }
    return null;
  }

  if (visualId === 'science-light-refraction-of-light') {
    if (/\bdraw\b|\bdiagram\b|\bray\b/i.test(qt))
      return 'Ray Diagram: Draw a rectangular glass slab (or prism as applicable). Show the incident ray, refracted ray inside the medium, and emergent ray. Mark the angles of incidence and refraction at each surface.';
    return null;
  }

  // ── HUMAN EYE ──────────────────────────────────────────────────────────────
  if (visualId === 'science-human-eye-structure-of-human-eye') {
    if (/\bdraw\b|\blabel\b|\bdiagram\b/i.test(qt))
      return 'Refer to the labelled diagram of the human eye showing: cornea, pupil, iris, lens, vitreous humour, aqueous humour, retina, and optic nerve.';
    return null;
  }

  if (visualId === 'science-human-eye-defects-of-vision-and-correction') {
    if (/\bdraw\b|\bdiagram\b|\bray\b/i.test(qt))
      return 'Ray Diagram: Draw the defective eye (myopia: parallel rays focus in front of retina; hypermetropia: rays focus behind retina). Show the corrective lens and corrected image on the retina.';
    return null;
  }

  if (visualId === 'science-human-eye-dispersion-of-light-and-rainbow') {
    if (/two prisms?|newton.*prism|prism.*newton/i.test(qt))
      return 'Diagram: Draw Newton\'s two-prism experiment — first prism disperses white light into VIBGYOR spectrum; inverted second prism recombines the spectrum back into white light. Label both prisms and all colour bands.';
    if (/\bdraw\b|\bdiagram\b/i.test(qt))
      return 'Diagram: Draw a triangular glass prism. Show the incident white light ray entering one face, refracting at both faces, and splitting into a spectrum of colours (VIBGYOR) on emergence.';
    if (/\bprove\b|\bexperiment\b/i.test(qt))
      return 'Diagram: Draw Newton\'s two-prism experiment showing dispersion and recombination of white light through two prisms arranged in opposite orientations.';
    return null;
  }

  // ── BIOLOGY: LIFE PROCESSES ─────────────────────────────────────────────────
  if (visualId === 'science-life-processes-human-heart-and-blood-circulation') {
    if (/\bdraw\b|\blabel\b|\bdiagram\b/i.test(qt))
      return 'Refer to the labelled diagram of the human heart showing: right atrium (RA), right ventricle (RV), left atrium (LA), left ventricle (LV), tricuspid valve, bicuspid valve, aorta, pulmonary artery, pulmonary vein, and vena cava.';
    return null;
  }

  if (visualId === 'science-life-processes-nutrition-in-humans') {
    if (/\bdraw\b|\blabel\b|\bdiagram\b/i.test(qt))
      return 'Refer to the labelled diagram of the human alimentary canal: mouth → oesophagus → stomach → small intestine (duodenum, jejunum, ileum) → large intestine → rectum → anus. Also show associated glands: salivary, liver, pancreas.';
    return null;
  }

  if (visualId === 'science-life-processes-photosynthesis') {
    if (/\bdraw\b|\bdiagram\b|\blabel\b/i.test(qt))
      return 'Diagram: Draw a leaf cross-section showing chloroplasts in mesophyll cells. Label CO₂ entry via stomata, H₂O supply from roots, light energy, and glucose output.';
    return null;
  }

  if (visualId === 'science-life-processes-respiration-and-excretion') {
    if (/nephron|kidney|\bdraw\b|\blabel\b|\bdiagram\b/i.test(qt))
      return 'Refer to the labelled diagram of the nephron showing: Bowman\'s capsule, glomerulus, proximal convoluted tubule, loop of Henle, distal convoluted tubule, and collecting duct.';
    return null;
  }

  // ── BIOLOGY: CONTROL & COORDINATION ────────────────────────────────────────
  if (visualId === 'science-control-coordination-reflex-arc') {
    if (/\bdraw\b|\bdiagram\b|\blabel\b/i.test(qt))
      return 'Refer to the labelled diagram of the reflex arc: receptor → afferent (sensory) neuron → relay neuron (in spinal cord) → efferent (motor) neuron → effector (muscle/gland).';
    return null;
  }

  if (visualId === 'science-control-coordination-nervous-system') {
    if (/\bdraw\b|\blabel\b|\bdiagram\b/i.test(qt))
      return 'Refer to the labelled diagram of the human brain showing: cerebrum (thinking, voluntary movement), cerebellum (balance, coordination), medulla oblongata (involuntary actions: heartbeat, breathing), and spinal cord.';
    return null;
  }

  if (visualId === 'science-control-coordination-plant-hormones-and-tropisms') {
    if (/\bdraw\b|\bdiagram\b/i.test(qt))
      return 'Diagram: Draw a seedling bending toward a light source. Show higher auxin concentration on the shaded side causing greater cell elongation, resulting in the bend toward light (phototropism).';
    return null;
  }

  // ── BIOLOGY: REPRODUCTION ───────────────────────────────────────────────────
  if (visualId === 'science-reproduction-flower-structure-and-pollination') {
    if (/\bdraw\b|\blabel\b|\bdiagram\b/i.test(qt))
      return 'Refer to the labelled diagram of a bisexual flower showing: receptacle, sepals, petals, stamens (anther + filament), and pistil (stigma + style + ovary containing ovule).';
    return null;
  }

  if (visualId === 'science-reproduction-human-reproductive-system') {
    if (/\bdraw\b|\blabel\b|\bdiagram\b/i.test(qt)) {
      if (/\bmale\b|testis|sperm/i.test(qt))
        return 'Refer to the labelled diagram of the male human reproductive system: testes → epididymis → vas deferens → seminal vesicles → prostate gland → urethra → penis.';
      return 'Refer to the labelled diagram of the female human reproductive system: ovaries → fallopian tubes (oviducts) → uterus → cervix → vagina.';
    }
    return null;
  }

  if (visualId === 'science-reproduction-types-of-asexual-reproduction') {
    if (/\bdraw\b|\bdiagram\b/i.test(qt))
      return 'Diagram: Draw the stages of the asexual reproduction method described (binary fission, budding, or fragmentation), showing the parent organism and daughter cell(s) at each stage.';
    return null;
  }

  // ── BIOLOGY: HEREDITY ───────────────────────────────────────────────────────
  if (visualId === 'science-heredity-evolution-mendels-laws-of-inheritance')
    return 'Punnett Square: Set up a 2×2 grid. Write the two parental gametes along the top and left side. Fill all four cells to obtain offspring genotypes. State the genotypic ratio and phenotypic ratio.';

  if (visualId === 'science-heredity-evolution-sex-determination')
    return 'Punnett Square: Set up a cross between ♀ XX and ♂ XY. Show all four offspring combinations (XX, XY, XX, XY). Conclude that 50% offspring are female (XX) and 50% are male (XY).';

  // ── ELECTRICITY ──────────────────────────────────────────────────────────────
  if (visualId === 'science-electricity-circuit-diagram-builder')
    return 'Circuit Diagram: Draw the circuit using standard symbols — cell/battery (long and short parallel lines), switch (gap in wire), ammeter A (in series), voltmeter V (in parallel), and resistors connected as specified.';

  if (visualId === 'science-electricity-series-and-parallel-circuits') {
    if (/\bdraw\b|\bcircuit\b|\bdiagram\b/i.test(qt))
      return 'Circuit Diagram: Draw resistors in the specified configuration (series: end-to-end; parallel: side-by-side). Include cell, switch, ammeter (in series), and voltmeter (across each resistor).';
    return null;
  }

  if (visualId === 'science-electricity-ohms-law' ||
      visualId === 'science-electricity-electric-power-and-energy' ||
      visualId === 'science-electricity-resistivity') {
    if (/\bdraw\b|\bcircuit\b|\bdiagram\b/i.test(qt))
      return 'Circuit Diagram: Draw the circuit for the given setup using standard symbols for all components mentioned.';
    return null;
  }

  // ── MAGNETIC EFFECTS ─────────────────────────────────────────────────────────
  if (visualId === 'science-magnetic-effects-electric-motor-and-generator') {
    if (/domestic.*circuit|household.*circuit|live.*wire|neutral.*wire|earth.*wire/i.test(qt))
      return 'Circuit Diagram: Draw the domestic household wiring circuit showing: Live wire (L, red/brown), Neutral wire (N, black/blue), Earth wire (E, green/yellow), MCB/fuse box, energy meter, and household appliances connected in parallel across L and N.';
    if (/\bmcb\b|miniature circuit breaker/i.test(qt))
      return 'Circuit Diagram: Draw a household circuit with the MCB inserted in series on the live wire between the main supply and the domestic circuit, showing how an overload or short circuit causes the MCB to trip and break the circuit automatically.';
    if (/\bdraw\b|\bdiagram\b|\blabel\b/i.test(qt))
      return 'Diagram: Draw the electric motor (or generator) showing the rectangular coil ABCD between the poles of a magnet, commutator (motor) or slip rings (generator), carbon brushes, and external circuit.';
    return null;
  }

  if (visualId === 'science-magnetic-effects-electromagnet-and-solenoid') {
    if (/\bdraw\b|\bdiagram\b/i.test(qt))
      return 'Diagram: Draw a solenoid (tightly wound helical coil) connected to a battery. Show parallel magnetic field lines inside (uniform) and bar-magnet-like field lines outside. Label the N and S poles.';
    return null;
  }

  if (visualId === 'science-magnetic-effects-magnetic-field-lines') {
    if (/\bdraw\b|\bdiagram\b/i.test(qt))
      return 'Diagram: Draw a bar magnet with magnetic field lines emerging from the N pole, curving outward, and re-entering at the S pole. Field lines are closer near the poles (stronger field) and never intersect.';
    return null;
  }

  if (visualId === 'science-magnetic-effects-flemings-left-hand-rule') {
    if (/\bdraw\b|\bdiagram\b/i.test(qt))
      return 'Diagram: Draw a current-carrying conductor in a magnetic field. Show the direction of current (I), magnetic field (B), and resultant force (F) using Fleming\'s Left Hand Rule.';
    return null;
  }

  // ── CHEMISTRY: CHEMICAL REACTIONS ───────────────────────────────────────────
  if (visualId === 'science-chemical-reactions-balancing-chemical-equations')
    return 'Write the skeletal (unbalanced) chemical equation first. Then balance by adjusting stoichiometric coefficients so the number of atoms of each element is equal on both sides.';

  if (visualId === 'science-chemical-reactions-types-of-chemical-reactions')
    return 'Write the balanced chemical equation for the given reaction. Identify its type: combination (A + B → AB), decomposition (AB → A + B), displacement (A + BC → AC + B), or double displacement (AB + CD → AD + CB).';

  if (visualId === 'science-chemical-reactions-oxidation-and-reduction')
    return 'Write the balanced redox equation. Identify: (i) the substance oxidised — gains oxygen / loses hydrogen / loses electrons; (ii) the substance reduced — loses oxygen / gains hydrogen / gains electrons.';

  if (visualId === 'science-chemical-reactions-corrosion-and-rancidity') {
    if (/\bdraw\b|\bdiagram\b/i.test(qt)) return null;
    return null; // No diagram needed; purely descriptive
  }

  // ── CHEMISTRY: ACIDS, BASES, SALTS ──────────────────────────────────────────
  if (visualId === 'science-acids-bases-salts-acid-base-reactions')
    return 'Write the balanced neutralisation equation: Acid + Base → Salt + Water. Include state symbols (aq), (l), (s) if required.';

  if (visualId === 'science-acids-bases-salts-common-salt-and-its-products') {
    if (/balanced.*equation|chemical.*equation|write.*equation/i.test(qt))
      return 'Balanced equation: Write the chemical equation for the reaction, balancing atoms on both sides. Include state symbols (s), (l), (aq), (g) where applicable.';
    if (/\bdraw\b|\bdiagram\b/i.test(qt)) return null;
    return null;
  }

  if (visualId === 'science-acids-bases-salts-p-h-scale') {
    if (/\bdraw\b|\bdiagram\b/i.test(qt))
      return 'Diagram: Draw the pH scale from 0 to 14. Mark the acidic region (0–7), neutral point (7), and basic/alkaline region (7–14). Indicate the colour of universal indicator at each range.';
    return null;
  }

  // ── CHEMISTRY: METALS & NON-METALS ──────────────────────────────────────────
  if (visualId === 'science-metals-nonmetals-extraction-of-metals') {
    if (/galvaniz/i.test(qt))
      return 'Diagram: Draw a labelled cross-section of galvanized iron — outer zinc (Zn) coating over iron (Fe) base. Label: Zn as "protective/sacrificial anode" and Fe as "base metal". Show how the zinc layer prevents oxygen and moisture from reaching iron.';
    if (/\bdraw\b|\bdiagram\b|\belectrolysis\b/i.test(qt))
      return 'Diagram: Draw the electrolytic cell for the extraction/refining of the metal described. Label the cathode (−), anode (+), electrolyte, and direction of ion movement.';
    return null;
  }

  if (visualId === 'science-metals-nonmetals-ionic-bonding') {
    if (/\bdraw\b|\belectron dot\b|\blewis\b|\bdiagram\b|\bshow\b.*electron|\bshow\b.*formation/i.test(qt))
      return 'Electron Dot Diagram: Draw the electron dot (Lewis) diagram showing electron transfer from the metal atom (e.g., Na with 1 valence dot) to the non-metal atom (e.g., Cl with 7 valence dots). Show the resulting ions (Na⁺ and Cl⁻) with square brackets and charges.';
    return null;
  }

  if (visualId === 'science-metals-nonmetals-reactivity-series') {
    if (/\bdraw\b|\blist\b|\bdiagram\b/i.test(qt))
      return 'Write the reactivity series in descending order: K > Na > Ca > Mg > Al > Zn > Fe > Pb > H > Cu > Ag > Au. Use it to predict whether the given displacement reaction will occur.';
    return null;
  }

  // ── CHEMISTRY: CARBON COMPOUNDS ──────────────────────────────────────────────
  if (visualId === 'science-carbon-compounds-covalent-bonding-in-carbon') {
    if (/\bdraw\b|\bstructural\b|\belectron dot\b|\blewis\b/i.test(qt))
      return 'Draw the structural formula showing each covalent bond as a line (—) between atoms, or the electron dot structure with shared electron pairs. Show all atoms with their bonds clearly.';
    if (/balanced.*equation|combustion|burn.*equation|equation.*methane|equation.*ethanol/i.test(qt))
      return 'Balanced equations: Record all relevant combustion/reaction equations before solving. Use these as reference when answering each part.';
    return null;
  }

  if (visualId === 'science-carbon-compounds-functional-groups') {
    if (/\bdraw\b|\bstructural\b/i.test(qt))
      return 'Draw the structural formula showing the functional group clearly labelled: −OH (alcohol), −CHO (aldehyde), C=O (ketone), −COOH (carboxylic acid). Show the carbon chain attached to the group.';
    return null;
  }

  if (visualId === 'science-carbon-compounds-homologous-series' ||
      visualId === 'science-carbon-compounds-carbon-chain-structures') {
    if (/\bdraw\b|\bstructural\b|\bformula\b/i.test(qt))
      return 'Draw the structural formula of the compound. Show each carbon atom with its four bonds. For branched chains, clearly mark the branching carbon and the substituent group.';
    return null;
  }

  if (visualId === 'science-carbon-compounds-soaps-and-detergents') {
    if (/\bdraw\b|\bmicelle\b|\bdiagram\b/i.test(qt))
      return 'Draw a soap micelle: show the hydrophilic (ionic, negatively charged) heads pointing outward into water, and the long hydrophobic carbon-chain tails pointing inward, enclosing the grease/oil droplet in the centre.';
    return null;
  }

  return null; // No diagram step for this visual/question combination
}

// ─────────────────────────────────────────────────────────────────────────────
// QUESTION MODIFICATION FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

function addVisualIdToQuestion(qText, visualId) {
  // Case 1: Multi-line JSON format – "isCompetencyBased" on its own line
  if (/\n\s+"isCompetencyBased"\s*:/.test(qText)) {
    return qText.replace(
      /(\n)(\s+)"isCompetencyBased"\s*:/,
      (_, nl, indent) => `${nl}${indent}"visualExplainerId": "${visualId}",\n${indent}"isCompetencyBased":`
    );
  }

  // Case 2: Single-line compact – isCompetencyBased present
  if (/\bisCompetencyBased\b/.test(qText)) {
    return qText.replace(
      /\bisCompetencyBased\b/,
      `visualExplainerId: "${visualId}", isCompetencyBased`
    );
  }

  // Case 3: No isCompetencyBased – insert before the closing }
  return qText.replace(
    /(\s*\}\s*)$/,
    `, visualExplainerId: "${visualId}" }`
  );
}

function prependDiagramStep(qText, step) {
  const escaped = step.replace(/\\/g, '\\\\').replace(/"/g, '\\"');

  // Multi-line solutionSteps: [...\n  "step1"
  const multiMatch = qText.match(/("?solutionSteps"?\s*:\s*\[)\n(\s+)"/);
  if (multiMatch) {
    const indent = multiMatch[2];
    return qText.replace(
      /("?solutionSteps"?\s*:\s*\[)\n(\s+)"/,
      `$1\n${indent}"${escaped}",\n${indent}"`
    );
  }

  // Single-line solutionSteps: ["step1"
  if (/"?solutionSteps"?\s*:\s*\["/.test(qText)) {
    return qText.replace(
      /("?solutionSteps"?\s*:\s*\[)"/,
      `$1"${escaped}", "`
    );
  }

  return qText; // No solutionSteps array found
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN LOOP
// ─────────────────────────────────────────────────────────────────────────────

let filesModified = 0;
let totalVisualIds = 0;
let totalDiagramSteps = 0;
const missing = [];

for (const config of FILE_CONFIGS) {
  const filePath = path.join(ROOT, config.file);
  if (!fs.existsSync(filePath)) {
    missing.push(config.file);
    continue;
  }

  let content = fs.readFileSync(filePath, 'utf-8');
  const questions = extractQuestions(content);

  let fileChanged = false;
  let fVids = 0;
  let fSteps = 0;
  let offset = 0;

  for (const q of questions) {
    const section = getSection(q.text);
    if (!section || section === 'A') continue;

    const questionText = getQuestionText(q.text);
    const visualId = config.getVisualId(questionText);
    if (!visualId) continue;

    let newText = q.text;
    let changed = false;

    // 1) Add visualExplainerId
    if (!hasVisualExplainerId(q.text)) {
      newText = addVisualIdToQuestion(newText, visualId);
      fVids++;
      changed = true;
    }

    // 2) Prepend diagram step (only if question has solutionSteps and needs one)
    if (hasSolutionSteps(newText) &&
        needsDiagramStep(questionText) &&
        !firstStepIsAlreadyDiagram(newText)) {
      const step = getDiagramStep(questionText, visualId);
      if (step) {
        newText = prependDiagramStep(newText, step);
        fSteps++;
        changed = true;
      }
    }

    if (changed) {
      const s = q.start + offset;
      const e = q.end   + offset;
      content = content.slice(0, s) + newText + content.slice(e);
      offset += newText.length - q.text.length;
      fileChanged = true;
    }
  }

  if (fileChanged) {
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`✓ ${config.file.replace('src/data/questionBanks/class10/', '')}: +${fVids} visualIds, +${fSteps} diagSteps`);
    filesModified++;
    totalVisualIds += fVids;
    totalDiagramSteps += fSteps;
  } else {
    const bce = questions.filter(q => { const s = getSection(q.text); return s && s !== 'A'; }).length;
    console.log(`  ${config.file.replace('src/data/questionBanks/class10/', '')} (${bce} B-E questions): already up to date`);
  }
}

if (missing.length) {
  console.warn('\nMissing files:');
  missing.forEach(f => console.warn('  !', f));
}

console.log(`\n${'─'.repeat(60)}`);
console.log(`Files modified  : ${filesModified}`);
console.log(`visualExplainerIds added : ${totalVisualIds}`);
console.log(`Diagram steps added      : ${totalDiagramSteps}`);
console.log(`${'─'.repeat(60)}`);
