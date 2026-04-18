import { pgTable, serial, text, jsonb, integer, timestamp } from "drizzle-orm/pg-core";

export const tutorCacheTable = pgTable("tutor_cache", {
  id: serial("id").primaryKey(),
  mode: text("mode").notNull(),
  subject: text("subject").notNull().default(""),
  topicKey: text("topic_key").notNull().default(""),
  questionNormalized: text("question_normalized").notNull(),
  embedding: jsonb("embedding").notNull(),
  responseJson: jsonb("response_json").notNull(),
  hitCount: integer("hit_count").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type TutorCache = typeof tutorCacheTable.$inferSelect;
export type NewTutorCache = typeof tutorCacheTable.$inferInsert;
