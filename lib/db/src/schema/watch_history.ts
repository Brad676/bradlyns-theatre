import { pgTable, text, serial, integer, real, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const watchHistoryTable = pgTable("watch_history", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  subjectId: text("subject_id").notNull(),
  subjectType: integer("subject_type").notNull(),
  title: text("title").notNull(),
  coverUrl: text("cover_url").notNull().default(""),
  timestampSec: real("timestamp_sec").notNull().default(0),
  durationSec: real("duration_sec").notNull().default(0),
  playbackSpeed: real("playback_speed").notNull().default(1),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertWatchHistorySchema = createInsertSchema(watchHistoryTable).omit({ id: true });
export type InsertWatchHistory = z.infer<typeof insertWatchHistorySchema>;
export type WatchHistory = typeof watchHistoryTable.$inferSelect;
