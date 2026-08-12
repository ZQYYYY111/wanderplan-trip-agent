import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const trips = sqliteTable("trips", {
  id: text("id").primaryKey(),
  shareToken: text("share_token").notNull().unique(),
  ownerTokenHash: text("owner_token_hash").notNull().default(""),
  title: text("title").notNull(),
  destination: text("destination").notNull(),
  dataJson: text("data_json").notNull(),
  version: integer("version").notNull().default(1),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const tripVersions = sqliteTable("trip_versions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  tripId: text("trip_id").notNull(),
  version: integer("version").notNull(),
  dataJson: text("data_json").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
