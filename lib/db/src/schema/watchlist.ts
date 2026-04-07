import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const watchlistTable = pgTable("watchlist", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  subjectId: text("subject_id").notNull(),
  subjectType: integer("subject_type").notNull(),
  title: text("title").notNull(),
  coverUrl: text("cover_url").notNull().default(""),
  genre: text("genre").notNull().default(""),
  releaseDate: text("release_date").notNull().default(""),
  imdbRating: text("imdb_rating").notNull().default(""),
  addedAt: timestamp("added_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertWatchlistSchema = createInsertSchema(watchlistTable).omit({ id: true, addedAt: true });
export type InsertWatchlist = z.infer<typeof insertWatchlistSchema>;
export type Watchlist = typeof watchlistTable.$inferSelect;
