const { createPromptData } = require('./promptData.cjs');
const { createCorePrompts } = require('./promptCore.cjs');
const { createGrindPrompts } = require('./promptGrind.cjs');
const { createDiagramPrompts } = require('./promptDiagram.cjs');
const { createTeachContractPrompts } = require('./promptTeachContract.cjs');
const { createValidationPrompts } = require('./promptValidation.cjs');
const { createLearnPrompts } = require('./promptLearn.cjs');

function createMentorPrompts(deps) {
  const ctx = { ...deps };

  Object.assign(ctx, createPromptData());
  Object.assign(ctx, createCorePrompts(ctx));
  Object.assign(ctx, createDiagramPrompts(ctx));
  Object.assign(ctx, createTeachContractPrompts(ctx));
  Object.assign(ctx, createLearnPrompts(ctx));
  Object.assign(ctx, createGrindPrompts(ctx));
  Object.assign(ctx, createValidationPrompts(ctx));

  return {
    buildPlanUserPrompt: ctx.buildPlanUserPrompt,
    buildSolveUserPrompt: ctx.buildSolveUserPrompt,
    buildExplainUserPrompt: ctx.buildExplainUserPrompt,
    buildGrindTrianglesUserPrompt: ctx.buildGrindTrianglesUserPrompt,
    buildGenericTopicGrindProfile: ctx.buildGenericTopicGrindProfile,
    buildGrindTopicContractFallback: ctx.buildGrindTopicContractFallback,
    buildMisconceptionExplainPrompt: ctx.buildMisconceptionExplainPrompt,
    buildCompetencyTeachPrompt: ctx.buildCompetencyTeachPrompt,
    buildMindmapTeachPrompt: ctx.buildMindmapTeachPrompt,
    inferDiagramType: ctx.inferDiagramType,
    ensureDiagramLineInText: ctx.ensureDiagramLineInText,
    ensureDiagramFields: ctx.ensureDiagramFields,
    buildAttemptLoopHeuristic: ctx.buildAttemptLoopHeuristic,
    buildProofWritingAddendum: ctx.buildProofWritingAddendum,
    validateProofSolveWithMe: ctx.validateProofSolveWithMe,
    buildDiagramFields: ctx.buildDiagramFields,
    buildTeachDiagramObject: ctx.buildTeachDiagramObject,
    ensureTeachContractShape: ctx.ensureTeachContractShape,
    validateLearnTeachContract: ctx.validateLearnTeachContract,
    buildDeterministicExamLines: ctx.buildDeterministicExamLines,
    buildDeterministicCheckQuestion: ctx.buildDeterministicCheckQuestion,
    adaptLegacyLearnTeachToContract: ctx.adaptLegacyLearnTeachToContract,
    adaptMindmapToLearnTeachContract: ctx.adaptMindmapToLearnTeachContract,
    buildLearnTeachContractPrompt: ctx.buildLearnTeachContractPrompt,
    validateStructuredForMode: ctx.validateStructuredForMode,
    buildRepairPromptForMode: ctx.buildRepairPromptForMode,
    buildProofFallbackBoardSteps: ctx.buildProofFallbackBoardSteps,
    buildProofFallbackSolveWithMe: ctx.buildProofFallbackSolveWithMe,
    getJsonSchemaTextForMode: ctx.getJsonSchemaTextForMode,
    buildTrianglesEvaluationPrompt: ctx.buildTrianglesEvaluationPrompt,
    validateTrianglesEvaluation: ctx.validateTrianglesEvaluation,
    buildTrianglesEvaluationRepairPrompt: ctx.buildTrianglesEvaluationRepairPrompt,
    buildTrianglesEvaluationFallback: ctx.buildTrianglesEvaluationFallback,
    buildCoachUserPrompt: ctx.buildCoachUserPrompt,
    buildSolveWithMeProtocolPrompt: ctx.buildSolveWithMeProtocolPrompt,
    buildBoardStepsMSPrompt: ctx.buildBoardStepsMSPrompt,
    buildLearnSeedContext: ctx.buildLearnSeedContext,
    buildLearnTeachFallback: ctx.buildLearnTeachFallback,
    buildLearnSolveWithMeFallback: ctx.buildLearnSolveWithMeFallback,
    buildConversationalTeachSystemPrompt: ctx.buildConversationalTeachSystemPrompt,
    buildStructuredFallback: ctx.buildStructuredFallback,
    buildLearnKeyDefinitionsPrompt: ctx.buildLearnKeyDefinitionsPrompt,
    buildLearnProofPrompt: ctx.buildLearnProofPrompt,
    buildLearnMindmapPrompt: ctx.buildLearnMindmapPrompt,
    buildMoreLikeThisUserPrompt: ctx.buildMoreLikeThisUserPrompt,
    inferMentorStudentProfileForPrompt: ctx.inferMentorStudentProfileForPrompt,
    buildMentorBehaviorContract: ctx.buildMentorBehaviorContract,
    buildMentorRuntimeRouteContext: ctx.buildMentorRuntimeRouteContext,
  };
}

module.exports = { createMentorPrompts };
