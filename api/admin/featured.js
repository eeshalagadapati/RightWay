const express = require("express");
const router = express.Router();
const { z } = require("zod");
const { db } = require("../../db");
const { featured_items, articles, media, categories } = require("../../db/schema");
const { eq, and } = require("drizzle-orm");
const { validateBody } = require("../../middleware/validation");
const mediaStorage = require("../../services/mediaStorage");

const featuredItemSchema = z.object({
  article_id: z.number().int(),
  position: z.number().int().default(1),
  badge_text: z.string().optional().nullable(),
  display_headline: z.string().optional().nullable(),
  is_active: z.boolean().default(true)
});

const updateFeaturedSchema = z.object({
  items: z.array(featuredItemSchema)
});

/**
 * GET /api/admin/featured
 * Lists all featured items for management
 */
router.get("/", async (req, res, next) => {
  try {
    const rows = await db
      .select({
        id: featured_items.id,
        articleId: featured_items.article_id,
        position: featured_items.position,
        badgeText: featured_items.badge_text,
        displayHeadline: featured_items.display_headline,
        isActive: featured_items.is_active,
        articleTitle: articles.title,
        articleSlug: articles.slug,
        articleStatus: articles.status,
        categoryName: categories.name,
        mediaPath: media.storage_path
      })
      .from(featured_items)
      .innerJoin(articles, eq(featured_items.article_id, articles.id))
      .leftJoin(categories, eq(articles.category_id, categories.id))
      .leftJoin(media, eq(articles.featured_image_id, media.id))
      .orderBy(featured_items.position);

    const formatted = rows.map(r => ({
      id: r.id,
      articleId: r.articleId,
      position: r.position,
      badgeText: r.badgeText,
      displayHeadline: r.displayHeadline || r.articleTitle,
      isActive: r.isActive,
      article: {
        id: r.articleId,
        title: r.articleTitle,
        slug: r.articleSlug,
        status: r.articleStatus,
        categoryName: r.categoryName,
        imageUrl: mediaStorage.getFileUrl(r.mediaPath || "assets/carousel_image_slide1.png")
      }
    }));

    res.json({
      success: true,
      data: formatted
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/admin/featured
 * Replaces or reorders featured carousel items
 */
router.put("/", validateBody(updateFeaturedSchema), async (req, res, next) => {
  try {
    const { items } = req.body;

    // Delete existing and insert updated items with new positions
    await db.delete(featured_items);

    if (items.length > 0) {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        await db.insert(featured_items).values({
          article_id: item.article_id,
          position: i + 1,
          badge_text: item.badge_text || null,
          display_headline: item.display_headline || null,
          is_active: item.is_active !== undefined ? item.is_active : true
        });
      }
    }

    res.json({
      success: true,
      message: "Featured items updated successfully."
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
