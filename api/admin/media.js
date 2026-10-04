const express = require("express");
const router = express.Router();
const { db } = require("../../db");
const { media, articles } = require("../../db/schema");
const { eq, desc } = require("drizzle-orm");
const { upload, validateImageIntegrity } = require("../../middleware/upload");
const mediaStorage = require("../../services/mediaStorage");

/**
 * GET /api/admin/media
 * Lists all uploaded media items
 */
router.get("/", async (req, res, next) => {
  try {
    const rows = await db
      .select()
      .from(media)
      .orderBy(desc(media.created_at));

    const formatted = rows.map(m => ({
      id: m.id,
      filename: m.filename,
      originalName: m.original_name,
      mimeType: m.mime_type,
      storagePath: m.storage_path,
      url: mediaStorage.getFileUrl(m.storage_path),
      altText: m.alt_text,
      fileSize: m.file_size,
      createdAt: m.created_at
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
 * POST /api/admin/media
 * Handles multipart image upload with validation
 */
router.post("/", upload.single("file"), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: { code: "NO_FILE_UPLOADED", message: "Please select an image file to upload." }
      });
    }

    // Validate integrity of image bytes
    const isIntegrityValid = validateImageIntegrity(req.file.buffer, req.file.mimetype);
    if (!isIntegrityValid) {
      return res.status(400).json({
        success: false,
        error: { code: "INVALID_IMAGE_DATA", message: "Corrupted or invalid image file content." }
      });
    }

    // Save using abstracted media storage (local or cloud)
    const saved = await mediaStorage.saveFile({
      originalName: req.file.originalname,
      buffer: req.file.buffer,
      mimeType: req.file.mimetype
    });

    const altText = req.body.alt_text || req.file.originalname;

    // Record in PostgreSQL media table
    const inserted = await db
      .insert(media)
      .values({
        filename: saved.filename,
        original_name: req.file.originalname,
        mime_type: req.file.mimetype,
        storage_path: saved.storagePath,
        alt_text: altText,
        file_size: saved.fileSize,
        uploaded_by: req.session.adminId
      })
      .returning();

    const record = inserted[0];

    res.status(201).json({
      success: true,
      data: {
        id: record.id,
        filename: record.filename,
        originalName: record.original_name,
        mimeType: record.mime_type,
        storagePath: record.storage_path,
        url: saved.url,
        altText: record.alt_text,
        fileSize: record.file_size,
        createdAt: record.created_at
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/admin/media/:id
 * Removes media item and file if not referenced
 */
router.delete("/:id", async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, error: { code: "INVALID_ID", message: "Invalid media ID." } });
    }

    const item = (await db.select().from(media).where(eq(media.id, id)))[0];
    if (!item) {
      return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Media not found." } });
    }

    // Check if referenced by articles
    const usages = await db.select({ id: articles.id }).from(articles).where(eq(articles.featured_image_id, id));
    if (usages.length > 0) {
      return res.status(409).json({
        success: false,
        error: {
          code: "MEDIA_IN_USE",
          message: `This image cannot be deleted because it is currently used as the featured image for ${usages.length} article(s).`
        }
      });
    }

    await mediaStorage.deleteFile(item.storage_path);
    await db.delete(media).where(eq(media.id, id));

    res.json({
      success: true,
      message: "Media deleted successfully."
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
