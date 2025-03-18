import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users schema from initial file
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Video Download Format options
export const formatOptions = [
  { value: "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best", label: "MP4 (Best quality)" },
  { value: "bestvideo[height<=1080][ext=mp4]+bestaudio[ext=m4a]/best[height<=1080][ext=mp4]/best[height<=1080]", label: "MP4 1080p" },
  { value: "bestvideo[height<=720][ext=mp4]+bestaudio[ext=m4a]/best[height<=720][ext=mp4]/best[height<=720]", label: "MP4 720p" },
  { value: "bestvideo[height<=480][ext=mp4]+bestaudio[ext=m4a]/best[height<=480][ext=mp4]/best[height<=480]", label: "MP4 480p" },
  { value: "bestvideo[height<=360][ext=mp4]+bestaudio[ext=m4a]/best[height<=360][ext=mp4]/best[height<=360]", label: "MP4 360p" },
  { value: "bestaudio[ext=m4a]/bestaudio/best", label: "M4A (audio only)" },
  { value: "bestaudio[ext=mp3]/bestaudio", label: "MP3 (audio only)" },
];

// Download History schema
export const downloadHistory = pgTable("download_history", {
  id: serial("id").primaryKey(),
  url: text("url").notNull(),
  title: text("title").notNull(),
  thumbnail: text("thumbnail"),
  format: text("format").notNull(),
  formatLabel: text("format_label").notNull(),
  duration: text("duration"),
  fileSize: text("file_size"),
  fileName: text("file_name").notNull(),
  downloadPath: text("download_path").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertDownloadHistorySchema = createInsertSchema(downloadHistory).omit({
  id: true,
  createdAt: true,
});

// Video info returned from yt-dlp
export const videoInfoSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  thumbnail: z.string().optional(),
  duration: z.number().optional(),
  channel: z.string().optional(),
  formats: z.array(z.object({
    format_id: z.string(),
    ext: z.string(),
    resolution: z.string().optional(),
    filesize: z.number().optional(),
    format_note: z.string().optional(),
  })).optional(),
});

// Download request schema
export const downloadRequestSchema = z.object({
  url: z.string().url("Please enter a valid URL"),
  format: z.string().min(1, "Please select a format"),
});

export type InsertDownloadHistory = z.infer<typeof insertDownloadHistorySchema>;
export type DownloadHistory = typeof downloadHistory.$inferSelect;
export type VideoInfo = z.infer<typeof videoInfoSchema>;
export type DownloadRequest = z.infer<typeof downloadRequestSchema>;
