import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const searchHistoryTable = pgTable("search_history", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  keyword: text("keyword").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertSearchHistorySchema = createInsertSchema(searchHistoryTable).omit({ id: true, createdAt: true });
export type InsertSearchHistory = z.infer<typeof insertSearchHistorySchema>;
export type SearchHistory = typeof searchHistoryTable.$inferSelect;
