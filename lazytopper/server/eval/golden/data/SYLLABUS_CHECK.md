# SYLLABUS CHECK - golden set vs 2026-27 syllabus guard

Guard file: `scripts/src/syllabusGuard.ts` read from worktree `C:/Projects/LT-worktrees/ga1-s2` at commit 53fe4d22c9359b09f32842a91acff8e1316b777d (sha256 `bd39e02b0029c71d964ba488cea0c175214a0e6cec6c52c0f203c3f3a05979b8`).
The guard is year "2026-27" (official CBSE Class X syllabus, Maths 041/241 and Science 086). It bans SUB-TOPICS by EXACT, full-string match of the `subtopic:` value (mode 1) - not chapters. Heredity / Mendel's contribution / Laws of Inheritance / Sex Determination are RETAINED; the Evolution sub-topics are excluded.

## Maths bannedSubtopics (verbatim, 37 strings, array opens at line 56)

- `Euclid's Division Lemma`
- `Euclid Division Lemma`
- `Euclid's Division Algorithm`
- `Decimal Representation of Rational Numbers`
- `Terminating and Non-Terminating Decimals`
- `Division Algorithm for Polynomials`
- `Polynomial Division Algorithm`
- `Division Algorithm`
- `Zeroes and Coefficients of Cubic Polynomials`
- `Zeroes of Cubic Polynomials`
- `Cubic Polynomial Zeroes-Coefficient Relationship`
- `Relationship Between Zeroes and Coefficients of Cubic Polynomials`
- `Cross-Multiplication Method`
- `Cross Multiplication Method`
- `Area of a Triangle in Coordinate Geometry`
- `Area of Triangle in Coordinate Geometry`
- `Area of Triangle (Coordinate Geometry)`
- `Trigonometric Ratios of Complementary Angles`
- `Complementary Angles Trigonometry`
- `T-Ratios of Complementary Angles`
- `Frustum of Cone`
- `Conversion of Solids`
- `Conversion of Solid from One Shape to Another`
- `Ogive`
- `Graph/Ogive`
- `Cumulative Frequency Graph`
- `Cumulative Frequency Curve`
- `Less Than Ogive`
- `More Than Ogive`
- `Less-Than Ogive`
- `More-Than Ogive`
- `Constructions`
- `Division of Line Segment`
- `Division of a Line Segment`
- `Construction of Tangents`
- `Construction of Similar Triangles`
- `Constructing Similar Triangles`

## Science bannedSubtopics (verbatim, 65 strings, array opens at line 134)

- `Periodic Classification`
- `Periodic Classification of Elements`
- `Newlands Octaves`
- `Dobereiner's Triads`
- `Dobereiner Triads`
- `Mendeleev's Periodic Table`
- `Mendeleev Periodic Table`
- `Modern Periodic Table`
- `Modern Periodic Law`
- `Periods and Groups`
- `Periodicity of Properties`
- `Evolution`
- `Natural Selection`
- `Speciation`
- `Phylogeny`
- `Fossil`
- `Fossils`
- `Human Evolution`
- `Evolutionary Relationships`
- `Tracing Evolutionary Relationships`
- `Evolution and Classification`
- `Evolution by Stages`
- `Acquired Traits`
- `Acquired and Inherited Traits`
- `Origin of Life`
- `Homologous Organs`
- `Analogous Organs`
- `Vestigial Organs`
- `Darwin`
- `Darwinism`
- `Neo-Darwinism`
- `Evidence of Evolution`
- `Sources of Energy`
- `Conventional Sources of Energy`
- `Conventional Sources`
- `Non-conventional Sources`
- `Non-Conventional Sources of Energy`
- `Solar Energy`
- `Wind Energy`
- `Hydropower`
- `Hydro Energy`
- `Nuclear Energy`
- `Nuclear Fission`
- `Nuclear Fusion`
- `Biogas`
- `Tidal Energy`
- `Geothermal Energy`
- `Fossil Fuels`
- `Thermal Power`
- `Ocean Thermal Energy`
- `Wave Energy`
- `Energy from Sea`
- `Management of Natural Resources`
- `Natural Resources Management`
- `Conservation of Natural Resources`
- `Reforestation`
- `Water Harvesting`
- `Rainwater Harvesting`
- `Ganga Action Plan`
- `Wildlife Conservation`
- `Chipko Movement`
- `Sustainable Development`
- `Reduce Reuse Recycle`
- `Forest Conservation`
- `Stakeholders`

## SURFACE_BANNED_PHRASES (verbatim, 60 strings, line 227) - board-prep surface scan, used here as an informational phrase scan

- `Euclid's Division Lemma`
- `Euclid's Division Algorithm`
- `Decimal Representation of Rational Numbers`
- `Division Algorithm for Polynomials`
- `Cross-Multiplication Method`
- `Cross Multiplication Method`
- `Area of a Triangle in Coordinate Geometry`
- `Area of Triangle in Coordinate Geometry`
- `Trigonometric Ratios of Complementary Angles`
- `Frustum of Cone`
- `Frustum of a Cone`
- `Conversion of Solids`
- `Ogive`
- `Cumulative Frequency Graph`
- `Cumulative Frequency Curve`
- `Construction of Tangents`
- `Construction of Similar Triangles`
- `Division of a Line Segment`
- `Periodic Classification`
- `Newlands Octaves`
- `Dobereiner's Triads`
- `Mendeleev's Periodic Table`
- `Modern Periodic Table`
- `Modern Periodic Law`
- `Natural Selection`
- `Speciation`
- `Human Evolution`
- `Evolutionary Relationships`
- `Tracing Evolutionary Relationships`
- `Evolution and Classification`
- `Evolution by Stages`
- `Acquired and Inherited Traits`
- `Homologous Organs`
- `Analogous Organs`
- `Vestigial Organs`
- `Evidence of Evolution`
- `Origin of Life`
- `Sources of Energy`
- `Conventional Sources of Energy`
- `Non-Conventional Sources of Energy`
- `Solar Energy`
- `Wind Energy`
- `Nuclear Energy`
- `Tidal Energy`
- `Geothermal Energy`
- `Ocean Thermal Energy`
- `Wave Energy`
- `Fossil Fuels`
- `Biogas`
- `Hydropower`
- `Management of Natural Resources`
- `Rainwater Harvesting`
- `Ganga Action Plan`
- `Chipko Movement`
- `Wildlife Conservation`
- `Forest Conservation`
- `Reforestation`
- `Electromagnetic Induction`
- `Electric Motor`
- `Electric Generator`

## Per-item check

Mode 1 (guard semantics): is the item's true sub-topic EXACTLY one of the banned strings for its subject? Mode 2: whole-phrase (word-boundary, case-insensitive) hits of ANY banned string (subject list + surface list) in the question text or any student answer text.

| item | subject | chapter (app key) | true sub-topic | mode 1 | mode 2 hits (question / answers) | in 2026-27 syllabus |
|---|---|---|---|---|---|---|
| GS-M01 | Maths | polynomials | Relationship between zeroes and coefficients of a quadratic polynomial | clear | - / - | YES - Quadratic zeroes-coefficient relationship is IN; only the CUBIC relationship is banned ('Zeroes and Coefficients of Cubic Polynomials'). No banned string matches. |
| GS-M02 | Maths | arithmetic-progression | Sum of first n terms of an AP | clear | - / - | YES - AP sum of n terms is IN. No banned string matches. |
| GS-M03 | Maths | surface-areas-and-volumes | Surface area of sphere / hemisphere | clear | - / - | YES - Surface areas of combinations of solids are IN ('Conversion of Solids' and 'Frustum of Cone' are banned; not involved). |
| GS-M04 | Maths | polynomials | Zeroes of a quadratic polynomial | clear | - / - | YES - Zeroes of a quadratic polynomial are IN. No banned string matches. |
| GS-M05 | Maths | coordinate-geometry | Distance formula | clear | - / - | YES - Distance formula is IN ('Area of a Triangle in Coordinate Geometry' is banned; not involved). |
| GS-M06 | Maths | trigonometry | Trigonometric ratios of specific angles | clear | - / - | YES - Ratios of 30°, 45°, 60° are IN ('Trigonometric Ratios of Complementary Angles' is banned; not involved). |
| GS-M07 | Maths | triangles | Similar triangles - ratio of corresponding sides | clear | - / - | YES - Similarity of triangles is IN. No banned string matches. |
| GS-M08 | Maths | circles | Tangent perpendicular to radius | clear | - / - | YES - Tangent properties are IN ('Construction of Tangents' is banned; not involved). |
| GS-M09 | Maths | trigonometry | Trigonometric identities | clear | - / - | YES - Proving trigonometric identities is IN. The a³ − b³ factorisation inside it is algebra, not the Polynomials chapter. |
| GS-M10 | Maths | real-numbers | Proof of irrationality | clear | - / - | YES - Irrationality proofs are IN. No banned string matches. |
| GS-M11 | Maths | real-numbers | Proof of irrationality | clear | - / - | YES - Irrationality proofs are IN. NOTE the student's argument uses decimal expansions - 'Decimal Representation of Rational Numbers' / 'Terminating and Non-Terminating Decimals' are BANNED (deleted) sub-topics; the item itself is in syllabus. |
| GS-M12 | Maths | surface-areas-and-volumes | Volume of a hollow cylinder | clear | - / - | YES - Volumes of cylinders/combinations are IN ('Conversion of Solids', 'Frustum of Cone' banned; not involved). |
| GS-M13 | Maths | probability | Classical probability - two dice | clear | - / - | YES - Classical probability is IN. |
| GS-M14 | Maths | pair-of-linear-equations | Word problems - algebraic solution | clear | - / - | YES - Substitution/elimination are IN; 'Cross-Multiplication Method' is banned and NOT used by the student. |
| GS-M15 | Maths | quadratic-equations | Word problems - speed/time | clear | - / - | YES - Quadratic word problems are IN. |
| GS-M16 | Maths | statistics | Mean of grouped data (missing frequency) and mode | clear | - / - | YES - Mean (direct/assumed/step-deviation) and mode of grouped data are IN; Ogive/cumulative frequency graph banned and not involved. |
| GS-M17 | Maths | arithmetic-progression | nth term and sum (case study) | clear | - / - | YES - AP nth term and sum are IN. |
| GS-M18 | Maths | areas-related-to-circles | Arc length and area of a sector | clear | - / - | YES - Areas of sectors are IN (segments restricted to 60°/90° - not involved). |
| GS-M19 | Maths | trigonometry | Heights and distances (case study) | clear | - / - | YES - Heights and distances (30°, 45°, 60°) are IN. |
| GS-M20 | Maths | arithmetic-progression | nth term and sum (solved via a quadratic) | clear | - / - | YES - AP nth term and sum are IN. |
| GS-M21 | Maths | trigonometry | Heights and distances | clear | - / - | YES - Heights and distances are IN. |
| GS-M22 | Maths | pair-of-linear-equations | Algebraic solution (elimination) and verification | clear | - / - | YES - Elimination method is IN; cross-multiplication (banned) not used. |
| GS-M23 | Maths | real-numbers | HCF by prime factorisation (word problem) | clear | - / - | YES - HCF via the Fundamental Theorem of Arithmetic is IN. ('Euclid's Division Lemma'/'Euclid's Division Algorithm' are banned; the student uses prime factorisation.) |
| GS-M24 | Maths | probability | Classical probability | clear | - / - | YES - Classical probability is IN. |
| GS-S01 | Science | heredity | Mendel's dihybrid cross - F1 | clear | - / - | YES - Heredity / Mendel's contribution / Laws of Inheritance are RETAINED and assessed in 2026-27; only Evolution sub-topics are banned. No banned string matches. |
| GS-S02 | Science | magnetic-effects-of-electric-current | Magnetic field lines | clear | - / - | YES - Magnetic field and field lines are IN ('Electric Motor', 'Electromagnetic Induction', 'Electric Generator' are board-excluded; not involved). |
| GS-S03 | Science | electricity | Electric power P = VI | clear | - / - | YES - Electric power is IN. |
| GS-S04 | Science | chemical-reactions-and-equations | Observations that show a chemical change (NCERT Ch1 activity: Zn + dil. H2SO4) | clear | - / Evolution | YES - Chemical reactions - characteristics/observations are IN. |
| GS-S05 | Science | light-reflection-and-refraction | Refraction through a rectangular glass slab; lateral displacement | clear | - / - | YES - Refraction through a glass slab is IN. |
| GS-S06 | Science | life-processes | Transportation in humans - blood and platelets | clear | - / - | YES - Transportation (blood, platelets) is IN. |
| GS-S07 | Science | light-reflection-and-refraction | Lens formula - concave lens | clear | - / - | YES - Lens formula is IN. |
| GS-S08 | Science | electricity | Series resistance and electric power | clear | - / - | YES - Series combination and power are IN. |
| GS-S09 | Science | electricity | Series-parallel combination, Ohm's law | clear | - / - | YES - Series/parallel resistors and Ohm's law are IN. |
| GS-S10 | Science | light-reflection-and-refraction | Image formation by a convex mirror (ray diagrams) | clear | - / - | YES - Ray diagrams for spherical mirrors are IN. |
| GS-S11 | Science | chemical-reactions-and-equations | Combination and decomposition reactions | clear | - / - | YES - Types of chemical reactions are IN. |
| GS-S12 | Science | chemical-reactions-and-equations | Writing and balancing chemical equations | clear | - / - | YES - Balancing chemical equations is IN. |
| GS-S13 | Science | acids-bases-and-salts | Chlor-alkali process, baking soda, washing soda | clear | - / - | YES - Chlor-alkali process, baking soda, washing soda are IN (Acids, Bases and Salts). |
| GS-S14 | Science | life-processes | Photosynthesis | clear | - / - | YES - Nutrition - photosynthesis is IN. |
| GS-S15 | Science | magnetic-effects-of-electric-current | Domestic electric circuits | clear | - / - | YES - Domestic electric circuits are IN under Magnetic Effects of Current (only Electric Motor / Electromagnetic Induction / Electric Generator are board-excluded). |
| GS-S16 | Science | light-reflection-and-refraction | Power of a lens; magnification | clear | - / - | YES - Power of a lens and magnification are IN (myopia correction overlaps Human Eye - IN). |
| GS-S17 | Science | our-environment | Energy flow (10% law); biological magnification | clear | - / - | YES - Our Environment is RETAINED in 2026-27 (Unit V); 'Management of Natural Resources' and 'Sources of Energy' are banned - not involved. |
| GS-S18 | Science | heredity | Mendel's monohybrid and dihybrid crosses | clear | - / - | YES - Heredity, Mendel's contribution, Laws of Inheritance are RETAINED and assessed (guard bans only Evolution sub-topics). |
| GS-S19 | Science | light-reflection-and-refraction | Snell's law; refractive index | clear | - / - | YES - Laws of refraction and refractive index are IN. |

Result: 43 items checked; mode-1 banned sub-topics: 0. Every item's `syllabus2026_27.guardChecked` is true.
Note on mode 2: a hit inside a STUDENT answer is not a syllabus violation of the item (e.g. a student may write 'evolution of gas'); hits are listed so a reviewer can see them.
