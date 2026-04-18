import type { CanonicalQuestion } from "./types";

import { TRIANGLES_PACK1_QUESTIONS } from "./questionBanks/maths/triangles.pack1";
import { TRIG_PACK1_QUESTIONS } from "./questionBanks/maths/trigonometry.pack1";
import { trianglesPack2Questions } from "./questionBanks/maths/triangles.pack2";
import { trigonometryPack2Questions } from "./questionBanks/maths/trigonometry.pack2";
import { REAL_NUMBERS_PACK1 } from "./questionBanks/maths/realNumbers.pack1";
import { POLYNOMIALS_PACK1 } from "./questionBanks/maths/polynomials.pack1";
import { PAIR_LINEAR_EQUATIONS_PACK1 } from "./questionBanks/maths/pairOfLinearEquations.pack1";
import { QUADRATIC_EQUATIONS_PACK1 } from "./questionBanks/maths/quadraticEquations.pack1";
import { ARITHMETIC_PROGRESSION_PACK1 } from "./questionBanks/maths/arithmeticProgression.pack1";
import { COORDINATE_GEOMETRY_PACK1 } from "./questionBanks/maths/coordinateGeometry.pack1";
import { CIRCLES_PACK1 } from "./questionBanks/maths/circles.pack1";
import { AREAS_RELATED_TO_CIRCLES_PACK1 } from "./questionBanks/maths/areasRelatedToCircles.pack1";
import { SURFACE_AREAS_VOLUMES_PACK1 } from "./questionBanks/maths/surfaceAreasVolumes.pack1";
import { STATISTICS_PACK1 } from "./questionBanks/maths/statistics.pack1";
import { PROBABILITY_PACK1 } from "./questionBanks/maths/probability.pack1";

import { RN2_PACK2 } from "./questionBanks/maths/realNumbers.pack2";
import { PL2_PACK2 } from "./questionBanks/maths/polynomials.pack2";
import { PLE2_PACK2 } from "./questionBanks/maths/pairOfLinearEquations.pack2";
import { QE2_PACK2 } from "./questionBanks/maths/quadraticEquations.pack2";
import { AP2_PACK2 } from "./questionBanks/maths/arithmeticProgression.pack2";
import { TR3_PACK3 } from "./questionBanks/maths/triangles.pack3";
import { CG2_PACK2 } from "./questionBanks/maths/coordinateGeometry.pack2";
import { TG3_PACK3 } from "./questionBanks/maths/trigonometry.pack3";
import { CI2_PACK2 } from "./questionBanks/maths/circles.pack2";
import { ARC2_PACK2 } from "./questionBanks/maths/areasRelatedToCircles.pack2";
import { SAV2_PACK2 } from "./questionBanks/maths/surfaceAreasVolumes.pack2";
import { ST2_PACK2 } from "./questionBanks/maths/statistics.pack2";
import { PR2_PACK2 } from "./questionBanks/maths/probability.pack2";

import { CHEMICAL_REACTIONS_PACK1 } from "./questionBanks/science/chemicalReactions.pack1";
import { ACIDS_BASES_SALTS_PACK1 } from "./questionBanks/science/acidsBasesSalts.pack1";
import { METALS_NON_METALS_PACK1 } from "./questionBanks/science/metalsNonMetals.pack1";
import { CARBON_COMPOUNDS_PACK1 } from "./questionBanks/science/carbonCompounds.pack1";
import { LIFE_PROCESSES_PACK1 } from "./questionBanks/science/lifeProcesses.pack1";
import { CONTROL_AND_COORDINATION_PACK1 } from "./questionBanks/science/controlAndCoordination.pack1";
import { REPRODUCTION_PACK1 } from "./questionBanks/science/reproduction.pack1";
import { HEREDITY_PACK1 } from "./questionBanks/science/heredity.pack1";
import { LIGHT_PACK1 } from "./questionBanks/science/light.pack1";
import { HUMAN_EYE_PACK1 } from "./questionBanks/science/humanEyeAndColourfulWorld.pack1";
import { ELECTRICITY_PACK1 } from "./questionBanks/science/electricity.pack1";
import { MAGNETIC_EFFECTS_PACK1 } from "./questionBanks/science/magneticEffects.pack1";
import { OUR_ENVIRONMENT_PACK1 } from "./questionBanks/science/ourEnvironment.pack1";

import { CR2_PACK2 } from "./questionBanks/science/chemicalReactions.pack2";
import { ABS2_PACK2 } from "./questionBanks/science/acidsBasesSalts.pack2";
import { MNM2_PACK2 } from "./questionBanks/science/metalsNonMetals.pack2";
import { CC2_PACK2 } from "./questionBanks/science/carbonCompounds.pack2";
import { LP2_PACK2 } from "./questionBanks/science/lifeProcesses.pack2";
import { CNC2_PACK2 } from "./questionBanks/science/controlAndCoordination.pack2";
import { REP2_PACK2 } from "./questionBanks/science/reproduction.pack2";
import { HE2_PACK2 } from "./questionBanks/science/heredity.pack2";
import { LT2_PACK2 } from "./questionBanks/science/light.pack2";
import { HEC2_PACK2 } from "./questionBanks/science/humanEyeAndColourfulWorld.pack2";
import { EL2_PACK2 } from "./questionBanks/science/electricity.pack2";
import { ME2_PACK2 } from "./questionBanks/science/magneticEffects.pack2";
import { OE2_PACK2 } from "./questionBanks/science/ourEnvironment.pack2";

export const canonicalQuestionBank: CanonicalQuestion[] = [
  ...TRIANGLES_PACK1_QUESTIONS,
  ...trianglesPack2Questions,
  ...TR3_PACK3,
  ...TRIG_PACK1_QUESTIONS,
  ...trigonometryPack2Questions,
  ...TG3_PACK3,
  ...REAL_NUMBERS_PACK1,
  ...RN2_PACK2,
  ...POLYNOMIALS_PACK1,
  ...PL2_PACK2,
  ...PAIR_LINEAR_EQUATIONS_PACK1,
  ...PLE2_PACK2,
  ...QUADRATIC_EQUATIONS_PACK1,
  ...QE2_PACK2,
  ...ARITHMETIC_PROGRESSION_PACK1,
  ...AP2_PACK2,
  ...COORDINATE_GEOMETRY_PACK1,
  ...CG2_PACK2,
  ...CIRCLES_PACK1,
  ...CI2_PACK2,
  ...AREAS_RELATED_TO_CIRCLES_PACK1,
  ...ARC2_PACK2,
  ...SURFACE_AREAS_VOLUMES_PACK1,
  ...SAV2_PACK2,
  ...STATISTICS_PACK1,
  ...ST2_PACK2,
  ...PROBABILITY_PACK1,
  ...PR2_PACK2,
  ...CHEMICAL_REACTIONS_PACK1,
  ...CR2_PACK2,
  ...ACIDS_BASES_SALTS_PACK1,
  ...ABS2_PACK2,
  ...METALS_NON_METALS_PACK1,
  ...MNM2_PACK2,
  ...CARBON_COMPOUNDS_PACK1,
  ...CC2_PACK2,
  ...LIFE_PROCESSES_PACK1,
  ...LP2_PACK2,
  ...CONTROL_AND_COORDINATION_PACK1,
  ...CNC2_PACK2,
  ...REPRODUCTION_PACK1,
  ...REP2_PACK2,
  ...HEREDITY_PACK1,
  ...HE2_PACK2,
  ...LIGHT_PACK1,
  ...LT2_PACK2,
  ...HUMAN_EYE_PACK1,
  ...HEC2_PACK2,
  ...ELECTRICITY_PACK1,
  ...EL2_PACK2,
  ...MAGNETIC_EFFECTS_PACK1,
  ...ME2_PACK2,
  ...OUR_ENVIRONMENT_PACK1,
  ...OE2_PACK2,
];

export const mathsQuestionBank: CanonicalQuestion[] = canonicalQuestionBank.filter(
  (q) => q.subject === "Maths"
);

export const scienceQuestionBank: CanonicalQuestion[] = canonicalQuestionBank.filter(
  (q) => q.subject === "Science"
);
