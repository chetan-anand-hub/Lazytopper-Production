import { pgTable, text, jsonb, timestamp } from "drizzle-orm/pg-core";

export const stepSolutionsTable = pgTable("step_solutions", {
  questionHash: text("question_hash").primaryKey(),
  solutionJson: jsonb("solution_json").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type StepSolution = typeof stepSolutionsTable.$inferSelect;
export type NewStepSolution = typeof stepSolutionsTable.$inferInsert;
