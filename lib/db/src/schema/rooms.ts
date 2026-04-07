import { pgTable, text, serial, integer, boolean, real, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const roomsTable = pgTable("rooms", {
  id: serial("id").primaryKey(),
  hostUserId: integer("host_user_id").notNull(),
  hostUsername: text("host_username").notNull(),
  name: text("name").notNull(),
  password: text("password"),
  state: text("state").notNull().default("idle"),
  currentSubjectId: text("current_subject_id"),
  currentSubjectType: integer("current_subject_type"),
  currentTitle: text("current_title"),
  currentCoverUrl: text("current_cover_url"),
  currentTimestampSec: real("current_timestamp_sec").notNull().default(0),
  idleStartAt: timestamp("idle_start_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const roomQueueTable = pgTable("room_queue", {
  id: serial("id").primaryKey(),
  roomId: integer("room_id").notNull(),
  subjectId: text("subject_id").notNull(),
  subjectType: integer("subject_type").notNull(),
  title: text("title").notNull(),
  coverUrl: text("cover_url").notNull().default(""),
  position: integer("position").notNull(),
  seriesSeason: integer("series_season"),
  seriesEpisode: integer("series_episode"),
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
  addedAt: timestamp("added_at", { withTimezone: true }).notNull().defaultNow(),
});

export const roomRequestsTable = pgTable("room_requests", {
  id: serial("id").primaryKey(),
  roomId: integer("room_id").notNull(),
  requestUserId: integer("request_user_id").notNull(),
  requestUsername: text("request_username").notNull(),
  subjectId: text("subject_id").notNull(),
  subjectType: integer("subject_type").notNull(),
  title: text("title").notNull(),
  coverUrl: text("cover_url").notNull().default(""),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const episodeCacheTable = pgTable("episode_cache", {
  id: serial("id").primaryKey(),
  subjectId: text("subject_id").notNull().unique(),
  episodeData: text("episode_data").notNull(),
  cachedAt: timestamp("cached_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertRoomSchema = createInsertSchema(roomsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertRoom = z.infer<typeof insertRoomSchema>;
export type Room = typeof roomsTable.$inferSelect;

export const insertRoomQueueSchema = createInsertSchema(roomQueueTable).omit({ id: true, addedAt: true });
export type InsertRoomQueue = z.infer<typeof insertRoomQueueSchema>;
export type RoomQueue = typeof roomQueueTable.$inferSelect;

export const insertRoomRequestSchema = createInsertSchema(roomRequestsTable).omit({ id: true, createdAt: true });
export type InsertRoomRequest = z.infer<typeof insertRoomRequestSchema>;
export type RoomRequest = typeof roomRequestsTable.$inferSelect;
