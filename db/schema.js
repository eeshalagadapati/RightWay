const { pgTable, serial, text, varchar, integer, boolean, timestamp } = require("drizzle-orm/pg-core");

/**
 * Admins Table
 * Note: ONLY for CMS owner/admin. Normal visitors are anonymous and have no accounts.
 */
const admins = pgTable("admins", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  password_hash: text("password_hash").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  role: varchar("role", { length: 50 }).notNull().default("admin"),
  is_active: boolean("is_active").notNull().default(true),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  last_login_at: timestamp("last_login_at", { withTimezone: true })
});

/**
 * Categories Table
 * Note: 'latest' is not stored here; it is queried dynamically by published_at DESC.
 */
const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  breadcrumb: varchar("breadcrumb", { length: 255 }).notNull(),
  description: text("description"),
  is_active: boolean("is_active").notNull().default(true),
  sort_order: integer("sort_order").notNull().default(0),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
});

/**
 * Media Table
 * Stores metadata for uploaded images and assets.
 */
const media = pgTable("media", {
  id: serial("id").primaryKey(),
  filename: text("filename").notNull(),
  original_name: text("original_name").notNull(),
  mime_type: varchar("mime_type", { length: 100 }).notNull(),
  storage_path: text("storage_path").notNull(),
  alt_text: text("alt_text"),
  width: integer("width"),
  height: integer("height"),
  file_size: integer("file_size"),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  uploaded_by: integer("uploaded_by").references(() => admins.id)
});

/**
 * Articles Table
 * Core news editorial items.
 */
const articles = pgTable("articles", {
  id: serial("id").primaryKey(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  title: text("title").notNull(),
  description: text("description"),
  content_html: text("content_html"),
  category_id: integer("category_id").references(() => categories.id),
  featured_image_id: integer("featured_image_id").references(() => media.id),
  status: varchar("status", { length: 30 }).notNull().default("draft"), // draft, published, archived
  is_breaking: boolean("is_breaking").notNull().default(false),
  is_live: boolean("is_live").notNull().default(false),
  has_video: boolean("has_video").notNull().default(false),
  published_at: timestamp("published_at", { withTimezone: true }),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  created_by: integer("created_by").references(() => admins.id),
  updated_by: integer("updated_by").references(() => admins.id)
});

/**
 * Featured Items Table
 * Featured carousel articles and ordering.
 */
const featured_items = pgTable("featured_items", {
  id: serial("id").primaryKey(),
  article_id: integer("article_id").notNull().references(() => articles.id, { onDelete: "cascade" }),
  position: integer("position").notNull().default(0),
  badge_text: text("badge_text"),
  display_headline: text("display_headline"),
  is_active: boolean("is_active").notNull().default(true),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
});

/**
 * Region Items Table
 * Associates regional sections (e.g. andhra, telangana, districts) with articles.
 */
const region_items = pgTable("region_items", {
  id: serial("id").primaryKey(),
  region: varchar("region", { length: 50 }).notNull(), // 'andhra', 'telangana', 'districts'
  article_id: integer("article_id").notNull().references(() => articles.id, { onDelete: "cascade" }),
  position: integer("position").notNull().default(0),
  is_active: boolean("is_active").notNull().default(true)
});

module.exports = {
  admins,
  categories,
  media,
  articles,
  featured_items,
  region_items
};
