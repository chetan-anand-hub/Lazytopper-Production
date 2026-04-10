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

import { CHEMICAL_REACTIONS_PACK1 } from "./questionBanks/science/chemicalReactions.pack1";
import { ACIDS_BASES_SALTS_PACK1 } from "./questionBanks/science/acidsBasesSalts.pack1";
import { METALS_NON_METALS_PACK1 } from "./questionBanks/science/metalsNonMetals.pack1";
import { CARBON_COMPOUNDS_PACK1 } from "./questionBanks/science/carbonCompounds.pack1";
import { LIFE_PROCESSES_PACK1 } from "./questionBanks/science/lifeProcesses.pack1";
import { CONTROL_AND_COORDINATION_PACK1 } from "./questionBanks/science/controlAndCoordination.pack1";
import { REPRODUCTION_PACK1 } from "./questionBanks/science/reproduction.pack1";
import { HEREDITY_EVOLUTION_PACK1 } from "./questionBanks/science/heredityEvolution.pack1";
import { LIGHT_PACK1 } from "./questionBanks/science/light.pack1";
import { HUMAN_EYE_PACK1 } from "./questionBanks/science/humanEyeAndColourfulWorld.pack1";
import { ELECTRICITY_PACK1 } from "./questionBanks/science/electricity.pack1";
import { MAGNETIC_EFFECTS_PACK1 } from "./questionBanks/science/magneticEffects.pack1";
import { OUR_ENVIRONMENT_PACK1 } from "./questionBanks/science/ourEnvironment.pack1";

export const canonicalQuestionBank: CanonicalQuestion[] = [
  ...TRIANGLES_PACK1_QUESTIONS,
  ...trianglesPack2Questions,
  ...TRIG_PACK1_QUESTIONS,
  ...trigonometryPack2Questions,
  ...REAL_NUMBERS_PACK1,
  ...POLYNOMIALS_PACK1,
  ...PAIR_LINEAR_EQUATIONS_PACK1,
  ...QUADRATIC_EQUATIONS_PACK1,
  ...ARITHMETIC_PROGRESSION_PACK1,
  ...COORDINATE_GEOMETRY_PACK1,
  ...CIRCLES_PACK1,
  ...AREAS_RELATED_TO_CIRCLES_PACK1,
  ...SURFACE_AREAS_VOLUMES_PACK1,
  ...STATISTICS_PACK1,
  ...PROBABILITY_PACK1,
  ...CHEMICAL_REACTIONS_PACK1,
  ...ACIDS_BASES_SALTS_PACK1,
  ...METALS_NON_METALS_PACK1,
  ...CARBON_COMPOUNDS_PACK1,
  ...LIFE_PROCESSES_PACK1,
  ...CONTROL_AND_COORDINATION_PACK1,
  ...REPRODUCTION_PACK1,
  ...HEREDITY_EVOLUTION_PACK1,
  ...LIGHT_PACK1,
  ...HUMAN_EYE_PACK1,
  ...ELECTRICITY_PACK1,
  ...MAGNETIC_EFFECTS_PACK1,
  ...OUR_ENVIRONMENT_PACK1,
];

export const mathsQuestionBank: CanonicalQuestion[] = canonicalQuestionBank.filter(
  (q) => q.subject === "Maths"
);

export const scienceQuestionBank: CanonicalQuestion[] = canonicalQuestionBank.filter(
  (q) => q.subject === "Science"
);
