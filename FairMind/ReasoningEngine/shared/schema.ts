import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table with authentication fields
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  age: integer("age").notNull(),
  gender: text("gender").notNull(), // 'Male', 'Female', 'Prefer not to say'
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash"),
  googleId: text("google_id").unique(),
  resolutionsUsedToday: integer("resolutions_used_today").default(0).notNull(),
  lastResolutionReset: timestamp("last_resolution_reset").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Rooms for two-person arguments
export const rooms = pgTable("rooms", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: varchar("code", { length: 6 }).notNull().unique(),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  participant1Id: varchar("participant1_id").references(() => users.id),
  participant2Id: varchar("participant2_id").references(() => users.id),
  status: text("status").default("active").notNull(), // 'active', 'resolved', 'archived'
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Messages in rooms
export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  roomId: varchar("room_id").notNull().references(() => rooms.id, { onDelete: "cascade" }),
  senderId: varchar("sender_id").notNull().references(() => users.id),
  text: text("text"),
  transcript: text("transcript"), // For voice messages
  isVoice: boolean("is_voice").default(false).notNull(),
  voiceUrl: text("voice_url"), // URL/path to audio file
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

// AI-generated resolutions
export const resolutions = pgTable("resolutions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  roomId: varchar("room_id").notNull().references(() => rooms.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description").notNull(),
  aiScore: integer("ai_score").notNull(), // 0-100
  suggestedBest: boolean("suggested_best").default(false).notNull(),
  generatedAt: timestamp("generated_at").defaultNow().notNull(),
});

// Votes on resolutions
export const votes = pgTable("votes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  roomId: varchar("room_id").notNull().references(() => rooms.id, { onDelete: "cascade" }),
  resolutionId: varchar("resolution_id").notNull().references(() => resolutions.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

// Insert schemas with validation
export const insertUserSchema = createInsertSchema(users, {
  name: z.string().min(1, "Name is required").max(100),
  age: z.number().min(13, "Must be at least 13 years old").max(120),
  gender: z.enum(["Male", "Female", "Prefer not to say"]),
  email: z.string().email("Invalid email address"),
  passwordHash: z.string().optional(),
  googleId: z.string().optional(),
}).omit({
  id: true,
  createdAt: true,
  resolutionsUsedToday: true,
  lastResolutionReset: true,
});

export const insertRoomSchema = createInsertSchema(rooms).omit({
  id: true,
  createdAt: true,
  resolvedAt: true,
});

export const insertMessageSchema = createInsertSchema(messages, {
  text: z.string().max(5000).optional(),
  transcript: z.string().optional(),
}).omit({
  id: true,
  timestamp: true,
});

export const insertResolutionSchema = createInsertSchema(resolutions).omit({
  id: true,
  generatedAt: true,
});

export const insertVoteSchema = createInsertSchema(votes).omit({
  id: true,
  timestamp: true,
});

// Auth schemas
export const registerSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  age: z.number().min(13, "Must be at least 13 years old").max(120),
  gender: z.enum(["Male", "Female", "Prefer not to say"]),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

// Type exports
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertRoom = z.infer<typeof insertRoomSchema>;
export type Room = typeof rooms.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertResolution = z.infer<typeof insertResolutionSchema>;
export type Resolution = typeof resolutions.$inferSelect;
export type InsertVote = z.infer<typeof insertVoteSchema>;
export type Vote = typeof votes.$inferSelect;
export type RegisterData = z.infer<typeof registerSchema>;
export type LoginData = z.infer<typeof loginSchema>;

// WebSocket message types
export type WSMessage =
  | { type: "join_room"; roomId: string; userId: string; userName: string }
  | { type: "leave_room"; roomId: string; userId: string }
  | { type: "new_message"; message: Message & { senderName: string } }
  | { type: "user_joined"; userId: string; userName: string }
  | { type: "user_left"; userId: string }
  | { type: "resolutions_generated"; resolutions: Resolution[] }
  | { type: "vote_cast"; userId: string; resolutionId: string }
  | { type: "room_resolved"; resolution: Resolution };
