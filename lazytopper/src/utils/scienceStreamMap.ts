import type { Class10ScienceTopicKey } from "../data/class10ScienceTopicTrends";

export const SCIENCE_STREAM_BY_TOPIC: Record<
  Class10ScienceTopicKey,
  "Physics" | "Chemistry" | "Biology"
> = {
  ChemicalReactions: "Chemistry",
  AcidsBasesSalts: "Chemistry",
  MetalsNonMetals: "Chemistry",
  CarbonCompounds: "Chemistry",

  LifeProcesses: "Biology",
  ControlAndCoordination: "Biology",
  Reproduction: "Biology",
  HeredityEvolution: "Biology",

  Light: "Physics",
  HumanEyeAndColourfulWorld: "Physics",
  Electricity: "Physics",
  MagneticEffects: "Physics",
};
