#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, "..", "public", "visuals");
const MANIFEST_PATH = path.join(PUBLIC_DIR, "manifest.json");

const BASE_URL = process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL;
const API_KEY = process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY;
const MODEL = "claude-sonnet-4-6";
const MAX_TOKENS = 12000;
const RATE_LIMIT_MS = 1500;
const MAX_RETRIES = 3;
const FETCH_TIMEOUT_MS = 180000;

if (!BASE_URL || !API_KEY) {
  console.error("Missing AI_INTEGRATIONS_ANTHROPIC_BASE_URL or AI_INTEGRATIONS_ANTHROPIC_API_KEY");
  process.exit(1);
}

const CONCEPTS = buildConceptList();

function buildConceptList() {
  const mathsChapters = [
    {
      chapter: "real-numbers", subject: "maths", chapterName: "Real Numbers",
      concepts: [
        { name: "Euclids Division Lemma", keywords: "hcf euclid division algorithm step-by-step" },
        { name: "Fundamental Theorem of Arithmetic", keywords: "prime factorisation tree unique" },
        { name: "HCF and LCM using Prime Factorisation", keywords: "hcf lcm prime factors venn" },
        { name: "Irrational Numbers Proof", keywords: "irrational proof contradiction sqrt2" },
        { name: "Decimal Expansions", keywords: "terminating non-terminating repeating decimal" },
      ],
    },
    {
      chapter: "polynomials", subject: "maths", chapterName: "Polynomials",
      concepts: [
        { name: "Zeroes of a Polynomial", keywords: "zeroes roots graph x-axis intersection" },
        { name: "Relationship between Zeroes and Coefficients", keywords: "sum product zeroes coefficients alpha beta" },
        { name: "Graphical Meaning of Zeroes", keywords: "parabola graph quadratic linear cubic" },
        { name: "Division Algorithm for Polynomials", keywords: "division quotient remainder long-division" },
      ],
    },
    {
      chapter: "linear-equations", subject: "maths", chapterName: "Pair of Linear Equations in Two Variables",
      concepts: [
        { name: "Graphical Method", keywords: "graph intersection lines solution pair" },
        { name: "Substitution Method", keywords: "substitution solve variable replace step" },
        { name: "Elimination Method", keywords: "elimination add subtract cancel coefficients" },
        { name: "Cross Multiplication Method", keywords: "cross multiply formula determinant" },
        { name: "Consistency of Equations", keywords: "consistent inconsistent parallel coincident ratios a1/a2" },
      ],
    },
    {
      chapter: "quadratic-equations", subject: "maths", chapterName: "Quadratic Equations",
      concepts: [
        { name: "Standard Form and Roots", keywords: "ax2+bx+c roots parabola quadratic" },
        { name: "Factorisation Method", keywords: "splitting middle term factors product sum" },
        { name: "Quadratic Formula", keywords: "formula discriminant b2-4ac shridharacharya" },
        { name: "Nature of Roots using Discriminant", keywords: "discriminant real equal distinct imaginary D" },
      ],
    },
    {
      chapter: "arithmetic-progression", subject: "maths", chapterName: "Arithmetic Progressions",
      concepts: [
        { name: "AP Definition and Common Difference", keywords: "ap common difference sequence d term" },
        { name: "nth Term Formula", keywords: "nth term an formula a+(n-1)d general" },
        { name: "Sum of n Terms", keywords: "sum sn formula n/2 arithmetic" },
        { name: "AP Number Line Visualization", keywords: "number line equal spacing dots" },
      ],
    },
    {
      chapter: "triangles", subject: "maths", chapterName: "Triangles",
      concepts: [
        { name: "Similar Triangles and Criteria", keywords: "similar AA SSS SAS criteria angles sides" },
        { name: "Basic Proportionality Theorem", keywords: "BPT thales parallel ratio proportionality" },
        { name: "Pythagoras Theorem Visual Proof", keywords: "pythagoras right triangle hypotenuse squares area" },
        { name: "Areas of Similar Triangles", keywords: "area ratio square sides similar proportion" },
      ],
    },
    {
      chapter: "coordinate-geometry", subject: "maths", chapterName: "Coordinate Geometry",
      concepts: [
        { name: "Distance Formula", keywords: "distance formula two points sqrt plot" },
        { name: "Section Formula", keywords: "section ratio midpoint internal division point" },
        { name: "Area of Triangle using Coordinates", keywords: "area triangle coordinates vertices formula" },
        { name: "Coordinate Plane Plotter", keywords: "plot axes quadrant point grid" },
      ],
    },
    {
      chapter: "trigonometry", subject: "maths", chapterName: "Introduction to Trigonometry",
      concepts: [
        { name: "Trigonometric Ratios", keywords: "sin cos tan ratio right triangle SOH-CAH-TOA" },
        { name: "Trigonometric Ratios of Standard Angles", keywords: "0 30 45 60 90 table values" },
        { name: "Trigonometric Identities", keywords: "sin2+cos2=1 identity prove sec tan" },
        { name: "Height and Distance Problems", keywords: "height distance angle elevation depression tower" },
      ],
    },
    {
      chapter: "circles", subject: "maths", chapterName: "Circles",
      concepts: [
        { name: "Tangent to a Circle", keywords: "tangent point contact perpendicular radius" },
        { name: "Number of Tangents from External Point", keywords: "two tangents external equal length" },
        { name: "Tangent Properties", keywords: "tangent radius perpendicular theorem angle" },
      ],
    },
    {
      chapter: "areas-circles", subject: "maths", chapterName: "Areas Related to Circles",
      concepts: [
        { name: "Sector and Segment", keywords: "sector segment arc angle minor major" },
        { name: "Area of Sector Formula", keywords: "area sector theta 360 formula pi-r2" },
        { name: "Combined Figures Area", keywords: "combined shaded region subtract composite" },
      ],
    },
    {
      chapter: "surface-areas-volumes", subject: "maths", chapterName: "Surface Areas and Volumes",
      concepts: [
        { name: "Combination of Solids", keywords: "combination cone cylinder hemisphere dome tent" },
        { name: "Conversion of Solids", keywords: "melt recast volume conservation reshape" },
        { name: "Frustum of a Cone", keywords: "frustum slant height volume surface cut" },
      ],
    },
    {
      chapter: "statistics", subject: "maths", chapterName: "Statistics",
      concepts: [
        { name: "Mean of Grouped Data", keywords: "mean assumed direct step deviation xi fi" },
        { name: "Median of Grouped Data", keywords: "median cumulative frequency class interval l" },
        { name: "Mode of Grouped Data", keywords: "mode modal class frequency highest f0 f1 f2" },
        { name: "Ogive Curve", keywords: "ogive cumulative frequency graph less-than more-than" },
      ],
    },
    {
      chapter: "probability", subject: "maths", chapterName: "Probability",
      concepts: [
        { name: "Classical Probability", keywords: "classical equally likely outcomes events favorable" },
        { name: "Complementary Events", keywords: "complementary P(not-E) 1-P(E) certain impossible" },
        { name: "Dice and Cards Sample Space", keywords: "dice cards sample space outcomes 52 6" },
      ],
    },
  ];

  const scienceChapters = [
    {
      chapter: "chemical-reactions", subject: "science", chapterName: "Chemical Reactions and Equations",
      concepts: [
        { name: "Types of Chemical Reactions", keywords: "combination decomposition displacement double single" },
        { name: "Balancing Chemical Equations", keywords: "balance atoms reactants products coefficients" },
        { name: "Oxidation and Reduction", keywords: "oxidation reduction redox gain loss electrons oxygen" },
        { name: "Corrosion and Rancidity", keywords: "corrosion rancidity iron rust prevention antioxidant" },
      ],
    },
    {
      chapter: "acids-bases-salts", subject: "science", chapterName: "Acids, Bases and Salts",
      concepts: [
        { name: "pH Scale", keywords: "pH acidic basic neutral indicator litmus 0-14" },
        { name: "Acid Base Reactions", keywords: "neutralisation salt water reaction HCl NaOH" },
        { name: "Common Salt and its Products", keywords: "NaCl bleaching baking washing soda chlor-alkali" },
      ],
    },
    {
      chapter: "metals-nonmetals", subject: "science", chapterName: "Metals and Non-Metals",
      concepts: [
        { name: "Physical Properties of Metals", keywords: "lustre malleable ductile conductor sonorous" },
        { name: "Reactivity Series", keywords: "reactivity series displacement order K Na Ca Mg" },
        { name: "Ionic Bonding", keywords: "ionic bond transfer electron NaCl cation anion" },
        { name: "Extraction of Metals", keywords: "extraction ore roasting calcination electrolysis smelting" },
      ],
    },
    {
      chapter: "carbon-compounds", subject: "science", chapterName: "Carbon and its Compounds",
      concepts: [
        { name: "Covalent Bonding in Carbon", keywords: "covalent sharing electron tetravalent bond methane" },
        { name: "Homologous Series", keywords: "homologous CH2 series properties methane ethane propane" },
        { name: "Functional Groups", keywords: "alcohol aldehyde ketone carboxylic acid functional -OH" },
        { name: "Carbon Chain Structures", keywords: "straight branched cyclic isomers structural" },
      ],
    },
    {
      chapter: "life-processes", subject: "science", chapterName: "Life Processes",
      concepts: [
        { name: "Nutrition in Humans", keywords: "digestion stomach intestine enzyme alimentary canal" },
        { name: "Photosynthesis", keywords: "chlorophyll sunlight CO2 glucose oxygen stomata" },
        { name: "Human Heart and Blood Circulation", keywords: "heart atrium ventricle circulation double pump" },
        { name: "Respiration and Excretion", keywords: "aerobic anaerobic kidney nephron urine lungs" },
      ],
    },
    {
      chapter: "control-coordination", subject: "science", chapterName: "Control and Coordination",
      concepts: [
        { name: "Nervous System", keywords: "brain spinal cord neuron synapse cerebrum cerebellum" },
        { name: "Reflex Arc", keywords: "reflex arc stimulus response involuntary receptor effector" },
        { name: "Plant Hormones and Tropisms", keywords: "auxin phototropism geotropism gibberellin hormone" },
      ],
    },
    {
      chapter: "reproduction", subject: "science", chapterName: "How do Organisms Reproduce?",
      concepts: [
        { name: "Types of Asexual Reproduction", keywords: "binary fission budding fragmentation spore regeneration" },
        { name: "Human Reproductive System", keywords: "male female reproductive organs testes ovary" },
        { name: "Flower Structure and Pollination", keywords: "stamen pistil pollen pollination anther ovule" },
      ],
    },
    {
      chapter: "heredity-evolution", subject: "science", chapterName: "Heredity and Evolution",
      concepts: [
        { name: "Mendels Laws of Inheritance", keywords: "mendel dominant recessive F1 F2 monohybrid cross" },
        { name: "Sex Determination", keywords: "XX XY sex chromosome determination male female" },
        { name: "Evolution and Speciation", keywords: "evolution speciation natural selection variation Darwin" },
      ],
    },
    {
      chapter: "light", subject: "science", chapterName: "Light – Reflection and Refraction",
      concepts: [
        { name: "Reflection of Light", keywords: "reflection mirror concave convex image incident angle" },
        { name: "Mirror Formula and Magnification", keywords: "mirror formula 1/v+1/u=1/f magnification focal" },
        { name: "Refraction of Light", keywords: "refraction snell bending medium speed glass water" },
        { name: "Lens Formula and Ray Diagrams", keywords: "lens convex concave ray diagram focus image" },
      ],
    },
    {
      chapter: "human-eye", subject: "science", chapterName: "The Human Eye and the Colourful World",
      concepts: [
        { name: "Structure of Human Eye", keywords: "cornea lens retina pupil iris ciliary" },
        { name: "Defects of Vision and Correction", keywords: "myopia hypermetropia presbyopia corrective lens" },
        { name: "Dispersion of Light and Rainbow", keywords: "prism dispersion spectrum rainbow VIBGYOR Newton" },
      ],
    },
    {
      chapter: "electricity", subject: "science", chapterName: "Electricity",
      concepts: [
        { name: "Ohms Law", keywords: "ohm V=IR current voltage resistance graph proportional" },
        { name: "Series and Parallel Circuits", keywords: "series parallel circuit resistor combination R-total" },
        { name: "Electric Power and Energy", keywords: "power P=VI energy kWh watt unit bill" },
        { name: "Circuit Diagram Builder", keywords: "circuit ammeter voltmeter battery switch resistor" },
      ],
    },
    {
      chapter: "magnetic-effects", subject: "science", chapterName: "Magnetic Effects of Electric Current",
      concepts: [
        { name: "Magnetic Field Lines", keywords: "field lines bar magnet direction compass NS" },
        { name: "Electromagnet and Solenoid", keywords: "electromagnet solenoid coil current iron core" },
        { name: "Flemings Left Hand Rule", keywords: "fleming force motor conductor magnetic FBI" },
        { name: "Electric Motor and Generator", keywords: "motor generator AC DC electromagnetic induction" },
      ],
    },
    {
      chapter: "environment", subject: "science", chapterName: "Our Environment",
      concepts: [
        { name: "Food Chain and Food Web", keywords: "food chain web trophic energy producer consumer" },
        { name: "Ecosystem and Energy Flow", keywords: "ecosystem producer consumer decomposer 10% rule" },
        { name: "Ozone Layer and Biodegradability", keywords: "ozone CFC biodegradable non-biodegradable UV" },
      ],
    },
  ];

  const all = [];
  for (const ch of [...mathsChapters, ...scienceChapters]) {
    for (const concept of ch.concepts) {
      const slug = concept.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
      all.push({
        subject: ch.subject,
        chapter: ch.chapter,
        chapterName: ch.chapterName,
        conceptName: concept.name,
        slug,
        keywords: concept.keywords,
        filePath: path.join(PUBLIC_DIR, ch.subject, ch.chapter, `${slug}.html`),
      });
    }
  }
  return all;
}

function buildPrompt(concept) {
  const subjectLabel = concept.subject === "maths" ? "Mathematics" : "Science";
  return `Create a single self-contained HTML file that is an interactive visual explainer for CBSE Class 10 ${subjectLabel}.

Topic: ${concept.chapterName}
Concept: ${concept.conceptName}
Keywords: ${concept.keywords}

REQUIREMENTS:
1. Single HTML file with inline CSS and JS (no external dependencies)
2. Beautiful, colorful design with gradients, shadows, and rounded corners
3. Must be INTERACTIVE - the student should click, drag, hover, or toggle things to explore
4. Include smooth CSS animations and transitions
5. Use clear labeled diagrams, charts, or visual representations
6. Show the key formula/concept prominently
7. Include a step-by-step walkthrough that reveals on click
8. Use a clean modern design with the color palette: #1e293b (text), #3b82f6 (primary blue), #22c55e (success green), #f59e0b (warning amber), #ef4444 (error red)
9. Mobile-friendly (works well at 350px+ width)
10. Include educational annotations and labels
11. Must be scientifically/mathematically accurate for CBSE Class 10 level
12. Total file size should be under 15KB
13. Add a title bar with the concept name
14. Use Hindi terms where commonly used in CBSE exams (e.g., "प्रमेय" for theorem)
15. Include at least one worked example with step-by-step reveal
16. For math topics: render formulas using unicode math symbols (×, ÷, √, π, ², ³, ≠, ≤, ≥, ∠, △, ∴, ∵)
17. For science topics: include labeled diagrams using SVG or canvas

The visual should help a Class 10 student UNDERSTAND the concept intuitively through interaction, not just read about it.

Return ONLY the complete HTML file content, starting with <!DOCTYPE html> and ending with </html>. No markdown, no explanation, no code fences.`;
}

async function callClaude(prompt, retries = MAX_RETRIES) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
      const res = await fetch(`${BASE_URL}/v1/messages`, {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          "x-api-key": API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: MAX_TOKENS,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      clearTimeout(timer);

      if (res.status === 429) {
        const wait = Math.min(30000, RATE_LIMIT_MS * Math.pow(2, attempt + 1));
        console.log(`  Rate limited, waiting ${wait}ms...`);
        await sleep(wait);
        continue;
      }

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`API error ${res.status}: ${text.slice(0, 200)}`);
      }

      const data = await res.json();
      const content = data.content?.[0]?.text || "";
      return content;
    } catch (err) {
      if (attempt < retries) {
        const wait = RATE_LIMIT_MS * Math.pow(2, attempt);
        console.log(`  Retry ${attempt + 1}/${retries} after error: ${err.message.slice(0, 100)}`);
        await sleep(wait);
      } else {
        throw err;
      }
    }
  }
  throw new Error("Max retries exceeded");
}

function extractHtml(raw) {
  let html = raw.trim();
  if (html.startsWith("```")) {
    html = html.replace(/^```\w*\n?/, "").replace(/\n?```$/, "");
  }
  const docStart = html.indexOf("<!DOCTYPE");
  if (docStart === -1) {
    const htmlStart = html.indexOf("<html");
    if (htmlStart > 0) html = html.slice(htmlStart);
  } else if (docStart > 0) {
    html = html.slice(docStart);
  }
  const htmlEnd = html.lastIndexOf("</html>");
  if (htmlEnd !== -1) {
    html = html.slice(0, htmlEnd + 7);
  }
  return html.trim();
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function loadManifest() {
  try {
    return JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf-8"));
  } catch {
    return { version: 1, generatedAt: null, concepts: {} };
  }
}

function saveManifest(manifest) {
  manifest.generatedAt = new Date().toISOString();
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
}

async function main() {
  const args = process.argv.slice(2);
  const filterSubject = args.find((a) => a.startsWith("--subject="))?.split("=")[1];
  const filterChapter = args.find((a) => a.startsWith("--chapter="))?.split("=")[1];
  const forceRegenerate = args.includes("--force");
  const dryRun = args.includes("--dry-run");
  const singleConcept = args.find((a) => a.startsWith("--concept="))?.split("=")[1];

  let targets = CONCEPTS;

  if (filterSubject) {
    targets = targets.filter((c) => c.subject === filterSubject);
  }
  if (filterChapter) {
    targets = targets.filter((c) => c.chapter === filterChapter);
  }
  if (singleConcept) {
    targets = targets.filter((c) =>
      c.slug.includes(singleConcept.toLowerCase().replace(/[^a-z0-9]+/g, "-"))
    );
  }

  const manifest = loadManifest();
  let generated = 0;
  let skipped = 0;
  let failed = 0;

  console.log(`\nVisual Explainer Generator`);
  console.log(`========================`);
  console.log(`Total concepts: ${targets.length}`);
  console.log(`Force regenerate: ${forceRegenerate}`);
  console.log(`Dry run: ${dryRun}\n`);

  for (let i = 0; i < targets.length; i++) {
    const concept = targets[i];
    const exists = fs.existsSync(concept.filePath);
    const manifestEntry = manifest.concepts[concept.slug];

    if (exists && !forceRegenerate && manifestEntry) {
      console.log(`[${i + 1}/${targets.length}] SKIP ${concept.subject}/${concept.chapter}/${concept.slug} (already exists)`);
      skipped++;
      continue;
    }

    console.log(`[${i + 1}/${targets.length}] GEN  ${concept.subject}/${concept.chapter}/${concept.slug}`);

    if (dryRun) {
      skipped++;
      continue;
    }

    try {
      const prompt = buildPrompt(concept);
      const raw = await callClaude(prompt);
      let html = extractHtml(raw);

      if (!html.includes("<html") && !html.includes("<!DOCTYPE")) {
        throw new Error("Response did not contain valid HTML");
      }

      if (!html.includes("</html>")) {
        const needsScript = html.includes("<script") && !html.includes("</script>\n</body>");
        let suffix = "\n";
        if (needsScript) suffix += "</script>\n";
        if (html.includes("<body") && !html.includes("</body>")) suffix += "</body>\n";
        suffix += "</html>";
        html += suffix;
        console.log("  WARN: Output truncated, auto-closed tags");
      }

      const dir = path.dirname(concept.filePath);
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(concept.filePath, html, "utf-8");

      const sizeKB = (Buffer.byteLength(html, "utf-8") / 1024).toFixed(1);
      console.log(`  OK (${sizeKB} KB)`);

      manifest.concepts[concept.slug] = {
        subject: concept.subject,
        chapter: concept.chapter,
        chapterName: concept.chapterName,
        conceptName: concept.conceptName,
        slug: concept.slug,
        filePath: `/app/visuals/${concept.subject}/${concept.chapter}/${concept.slug}.html`,
        sizeKB: parseFloat(sizeKB),
        generatedAt: new Date().toISOString(),
      };

      saveManifest(manifest);
      generated++;

      await sleep(RATE_LIMIT_MS);
    } catch (err) {
      console.error(`  FAILED: ${err.message}`);
      failed++;
    }
  }

  console.log(`\nDone! Generated: ${generated}, Skipped: ${skipped}, Failed: ${failed}`);
  console.log(`Manifest: ${MANIFEST_PATH}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
