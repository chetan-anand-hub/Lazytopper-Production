import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";

export const generatedQuestionsTable = pgTable("generated_questions", {
  id: serial("id").primaryKey(),
  topicKey: text("topic_key").notNull().default(""),
  subject: text("subject").notNull().default(""),
  marks: integer("marks"),
  difficulty: text("difficulty"),
  questionText: text("question_text").notNull(),
  bloomSkill: text("bloom_skill"),
  hitCount: integer("hit_count").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  questionHash: text("question_hash").notNull().default(""),
});

export type GeneratedQuestion = typeof generatedQuestionsTable.$inferSelect;
export type NewGeneratedQuestion = typeof generatedQuestionsTable.$inferInsert;
