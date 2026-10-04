const express = require("express");
const router = express.Router();
const { z } = require("zod");
const { db } = require("../../db");
const { categories, articles } = require("../../db/schema");
const { eq, sql } = require("drizzle-orm");
const { validateBody } = require("../../middleware/validation");

const categoryCreateSchema = z.object({
  slug: z.string().min(2),
  name: z.string().min(2),
  breadcrumb: z.string().min(2),
  description: z.string().optional().nullable(),
  sort_order: z.number().int().default(0),
  is_active: z.boolean().default(true)
});

const categoryPatchSchema = categoryCreateSchema.partial();

/**
 * GET /api/admin/categories
 * Returns categories with article count
 */
router.get("/", async (req, res, next) => {
  try {
    const rows = await db
      .select({
        id: categories.id,
        slug: categories.slug,
        name: categories.name,
        breadcrumb: categories.breadcrumb,
        description: categories.description,
        isActive: categories.is_active,
        sortOrder: categories.sort_order,
        createdAt: categories.created_at,
        updatedAt: categories.updated_at
      })
      .from(categories)
      .orderBy(categories.sort_order);

    res.json({
      success: true,
      data: rows
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/admin/categories
 */
router.post("/", validateBody(categoryCreateSchema), async (req, res, next) => {
  try {
    const data = req.body;
    const cleanSlug = data.slug.toLowerCase().trim().replace(/[^a-z0-9-]/g, "-");

    const existing = (await db.select().from(categories).where(eq(categories.slug, cleanSlug)))[0];
    if (existing) {
      return res.status(409).json({
        success: false,
        error: { code: "SLUG_EXISTS", message: "A category with this slug already exists." }
      });
    }

    const inserted = await db
      .insert(categories)
      .values({
        slug: cleanSlug,
        name: data.name.trim(),
        breadcrumb: data.breadcrumb.trim().toUpperCase(),
        description: data.description ? data.description.trim() : null,
        sort_order: data.sort_order || 0,
        is_active: data.is_active !== undefined ? data.is_active : true
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
 * PATCH /api/admin/categories/:id
 */
router.patch("/:id", validateBody(categoryPatchSchema), async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, error: { code: "INVALID_ID", message: "Invalid category ID." } });
    }

    const existing = (await db.select().from(categories).where(eq(categories.id, id)))[0];
    if (!existing) {
      return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Category not found." } });
    }

    const data = req.body;
    const updatePayload = {
      updated_at: new Date()
    };

    if (data.name !== undefined) updatePayload.name = data.name.trim();
    if (data.breadcrumb !== undefined) updatePayload.breadcrumb = data.breadcrumb.trim().toUpperCase();
    if (data.description !== undefined) updatePayload.description = data.description ? data.description.trim() : null;
    if (data.sort_order !== undefined) updatePayload.sort_order = data.sort_order;
    if (data.is_active !== undefined) updatePayload.is_active = data.is_active;

    const updated = await db
      .update(categories)
      .set(updatePayload)
      .where(eq(categories.id, id))
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
