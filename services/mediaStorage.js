const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

/**
 * Media Storage Service Provider Interface
 * Abstracted to easily swap between Local Storage and S3 / Cloud Storage
 */
class LocalMediaStorage {
  constructor(uploadDir) {
    this.uploadDir = uploadDir || path.join(__dirname, "..", "uploads");
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  /**
   * Save uploaded file to local storage
   */
  async saveFile({ originalName, buffer, mimeType }) {
    const ext = path.extname(originalName).toLowerCase();
    const hash = crypto.randomBytes(12).toString("hex");
    const safeBase = path.basename(originalName, ext).replace(/[^a-zA-Z0-9-_]/g, "_").slice(0, 40);
    const filename = `${Date.now()}_${safeBase}_${hash}${ext}`;
    const targetPath = path.join(this.uploadDir, filename);

    await fs.promises.writeFile(targetPath, buffer);
    const relativeStoragePath = `uploads/${filename}`;

    return {
      filename,
      storagePath: relativeStoragePath,
      url: `/${relativeStoragePath}`,
      fileSize: buffer.length
    };
  }

  /**
   * Delete file from local storage
   */
  async deleteFile(storagePath) {
    // If it points to assets/ (pre-seeded), do not delete core static assets
    if (storagePath.startsWith("assets/")) {
      return true;
    }
    const fullPath = path.join(__dirname, "..", storagePath);
    if (fs.existsSync(fullPath)) {
      await fs.promises.unlink(fullPath);
    }
    return true;
  }

  /**
   * Get public URL for stored path
   */
  getFileUrl(storagePath) {
    if (!storagePath) return "";
    if (storagePath.startsWith("http://") || storagePath.startsWith("https://")) {
      return storagePath;
    }
    return storagePath.startsWith("/") ? storagePath : `/${storagePath}`;
  }
}

const mediaStorage = new LocalMediaStorage();

module.exports = mediaStorage;
