const express = require("express");
const router = express.Router();
const { z } = require("zod");
const { db } = require("../../db");
const { articles, categories, media, featured_items } = require("../../db/schema");
const { eq, and, desc, sql, ilike, or } = require("drizzle-orm");
const { validateBody } = require("../../middleware/validation");
const mediaStorage = require("../../services/mediaStorage");

const articleSchema = z.object({
  title: z.string().min(2, "Title must be at least 2 characters long"),
  slug: z.string().optional(),
  description: z.string().optional().nullable(),
  content_html: z.string().optional().nullable(),
  category_id: z.number().int().optional().nullable(),
  featured_image_id: z.number().int().optional().nullable(),
  status: z.enum(["draft", "published", "archived"]).default("draft"),
  is_breaking: z.boolean().default(false),
  is_live: z.boolean().default(false),
  has_video: z.boolean().default(false),
  published_at: z.string().optional().nullable()
});

const articlePatchSchema = z.object({
  title: z.string().min(2, "Title must be at least 2 characters long").optional(),
  slug: z.string().optional(),
  description: z.string().optional().nullable(),
  content_html: z.string().optional().nullable(),
  category_id: z.number().int().optional().nullable(),
  featured_image_id: z.number().int().optional().nullable(),
  status: z.enum(["draft", "published", "archived"]).optional(),
  is_breaking: z.boolean().optional(),
  is_live: z.boolean().optional(),
  has_video: z.boolean().optional(),
  published_at: z.string().optional().nullable()
});

// Helper to make slug unique
async function ensureUniqueSlug(baseSlug, existingId = null) {
  let cleanSlug = (baseSlug || `article-${Date.now()}`)
    .toLowerCase()
    .trim()
    .replace(/[^a-zA-Z0-9\u0C00-\u0C7F-_]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  if (!cleanSlug) cleanSlug = `article-${Date.now()}`;

  let finalSlug = cleanSlug;
  let counter = 1;

  while (true) {
    const existing = (
      await db.select({ id: articles.id }).from(articles).where(eq(articles.slug, finalSlug))
    )[0];

    if (!existing || (existingId && existing.id === existingId)) {
      return finalSlug;
    }
    finalSlug = `${cleanSlug}-${counter}`;
    counter++;
  }
}

/**
 * GET /api/admin/articles
 * Lists all articles with optional filters: status, category, search, pagination
 */
router.get("/", async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 15));
    const offset = (page - 1) * limit;
    const { status, category_id, search } = req.query;

    const conditions = [];

    if (status && status !== "all") {
      conditions.push(eq(articles.status, status));
    }

    if (category_id && category_id !== "all") {
      const catId = parseInt(category_id, 10);
      if (!isNaN(catId)) {
        conditions.push(eq(articles.category_id, catId));
      }
    }

    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      conditions.push(or(ilike(articles.title, term), ilike(articles.slug, term)));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const totalRes = await db
      .select({ count: sql`count(*)` })
      .from(articles)
      .where(whereClause);
    const total = parseInt(totalRes[0]?.count || 0, 10);

    const rows = await db
      .select({
        id: articles.id,
        slug: articles.slug,
        title: articles.title,
        description: articles.description,
        status: articles.status,
        isBreaking: articles.is_breaking,
        isLive: articles.is_live,
        hasVideo: articles.has_video,
        publishedAt: articles.published_at,
        createdAt: articles.created_at,
        updatedAt: articles.updated_at,
        categoryId: categories.id,
        categoryName: categories.name,
        categorySlug: categories.slug,
        mediaId: media.id,
        mediaPath: media.storage_path
      })
      .from(articles)
      .leftJoin(categories, eq(articles.category_id, categories.id))
      .leftJoin(media, eq(articles.featured_image_id, media.id))
      .where(whereClause)
      .orderBy(desc(articles.updated_at))
      .limit(limit)
      .offset(offset);

    const formatted = rows.map(r => ({
      id: r.id,
      slug: r.slug,
      title: r.title,
      description: r.description,
      status: r.status,
      isBreaking: r.isBreaking,
      isLive: r.isLive,
      hasVideo: r.hasVideo,
      publishedAt: r.publishedAt,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      category: r.categoryId ? { id: r.categoryId, name: r.categoryName, slug: r.categorySlug } : null,
      featuredImage: r.mediaPath ? { id: r.mediaId, url: mediaStorage.getFileUrl(r.mediaPath) } : null
    }));

    res.json({
      success: true,
      data: {
        articles: formatted,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/admin/articles
 * Creates a new article (draft or published)
 */
router.post("/", validateBody(articleSchema), async (req, res, next) => {
  try {
    const data = req.body;
    const finalSlug = await ensureUniqueSlug(data.slug || data.title);

    let pubDate = null;
    if (data.status === "published") {
      pubDate = data.published_at ? new Date(data.published_at) : new Date();
    } else if (data.published_at) {
      pubDate = new Date(data.published_at);
    }

    const inserted = await db
      .insert(articles)
      .values({
        slug: finalSlug,
        title: data.title.trim(),
        description: data.description ? data.description.trim() : null,
        content_html: data.content_html || null,
        category_id: data.category_id || null,
        featured_image_id: data.featured_image_id || null,
        status: data.status,
        is_breaking: data.is_breaking,
        is_live: data.is_live,
        has_video: data.has_video,
        published_at: pubDate,
        created_by: req.session.adminId,
        updated_by: req.session.adminId
      })
      .returning();

    res.status(201).json({
      success: true,
      data: inserted[0]
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/admin/articles/:id
 * Retrieves single article for editing
 */
router.get("/:id", async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, error: { code: "INVALID_ID", message: "Invalid article ID." } });
    }

    const rows = await db
      .select({
        id: articles.id,
        slug: articles.slug,
        title: articles.title,
        description: articles.description,
        contentHtml: articles.content_html,
        status: articles.status,
        isBreaking: articles.is_breaking,
        isLive: articles.is_live,
        hasVideo: articles.has_video,
        publishedAt: articles.published_at,
        createdAt: articles.created_at,
        updatedAt: articles.updated_at,
        categoryId: articles.category_id,
        featuredImageId: articles.featured_image_id,
        mediaPath: media.storage_path,
        mediaAlt: media.alt_text
      })
      .from(articles)
      .leftJoin(media, eq(articles.featured_image_id, media.id))
      .where(eq(articles.id, id))
      .limit(1);

    if (!rows.length) {
      return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Article not found." } });
    }

    const a = rows[0];
    res.json({
      success: true,
      data: {
        ...a,
        featuredImageUrl: a.mediaPath ? mediaStorage.getFileUrl(a.mediaPath) : null
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/admin/articles/:id
 * Updates an existing article
 */
router.patch("/:id", validateBody(articlePatchSchema), async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, error: { code: "INVALID_ID", message: "Invalid article ID." } });
    }

    const existing = (await db.select().from(articles).where(eq(articles.id, id)))[0];
    if (!existing) {
      return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Article not found." } });
    }

    const data = req.body;
    const updatePayload = {
      updated_at: new Date(),
      updated_by: req.session.adminId
    };

    if (data.title !== undefined) updatePayload.title = data.title.trim();
    if (data.description !== undefined) updatePayload.description = data.description ? data.description.trim() : null;
    if (data.content_html !== undefined) updatePayload.content_html = data.content_html;
    if (data.category_id !== undefined) updatePayload.category_id = data.category_id;
    if (data.featured_image_id !== undefined) updatePayload.featured_image_id = data.featured_image_id;
    if (data.status !== undefined) updatePayload.status = data.status;
    if (data.is_breaking !== undefined) updatePayload.is_breaking = data.is_breaking;
    if (data.is_live !== undefined) updatePayload.is_live = data.is_live;
    if (data.has_video !== undefined) updatePayload.has_video = data.has_video;

    if (data.slug && data.slug !== existing.slug) {
      updatePayload.slug = await ensureUniqueSlug(data.slug, id);
    }

    if (data.published_at !== undefined) {
      updatePayload.published_at = data.published_at ? new Date(data.published_at) : null;
    } else if (data.status === "published" && !existing.published_at) {
      updatePayload.published_at = new Date();
    }

    const updated = await db
      .update(articles)
      .set(updatePayload)
      .where(eq(articles.id, id))
      .returning();

    res.json({
      success: true,
      data: updated[0]
    });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/admin/articles/:id
 * Deletes an article
 */
router.delete("/:id", async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, error: { code: "INVALID_ID", message: "Invalid article ID." } });
    }

    const deleted = await db.delete(articles).where(eq(articles.id, id)).returning();
    if (!deleted.length) {
      return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Article not found." } });
    }

    res.json({
      success: true,
      message: "Article deleted successfully."
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/admin/articles/:id/publish
 */
router.post("/:id/publish", async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const existing = (await db.select().from(articles).where(eq(articles.id, id)))[0];
    if (!existing) {
      return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Article not found." } });
    }

    const updated = await db
      .update(articles)
      .set({
        status: "published",
        published_at: existing.published_at || new Date(),
        updated_at: new Date(),
        updated_by: req.session.adminId
      })
      .where(eq(articles.id, id))
      .returning();

    res.json({
      success: true,
      data: updated[0]
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/admin/articles/:id/unpublish
 */
router.post("/:id/unpublish", async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const existing = (await db.select().from(articles).where(eq(articles.id, id)))[0];
    if (!existing) {
      return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Article not found." } });
    }

    const updated = await db
      .update(articles)
      .set({
        status: "draft",
        updated_at: new Date(),
        updated_by: req.session.adminId
      })
      .where(eq(articles.id, id))
      .returning();

    res.json({
      success: true,
      data: updated[0]
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
