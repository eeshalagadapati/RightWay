const multer = require("multer");
const path = require("path");

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml"
];

const ALLOWED_EXTENSIONS = [
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".gif",
  ".svg"
];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return cb(new Error(`Invalid file extension: ${ext}. Allowed: ${ALLOWED_EXTENSIONS.join(", ")}`));
    }
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      return cb(new Error(`Invalid MIME type: ${file.mimetype}. Allowed images: JPG, PNG, WebP, GIF, SVG.`));
    }
    cb(null, true);
  }
});

/**
 * Validate image buffer integrity (basic magic byte check)
 */
function validateImageIntegrity(buffer, mimeType) {
  if (!buffer || buffer.length < 4) return false;
  
  // PNG: 89 50 4E 47
  if (mimeType === "image/png") {
    return buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47;
  }
  // JPEG: FF D8 FF
  if (mimeType === "image/jpeg") {
    return buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF;
  }
  // GIF: 47 49 46 38
  if (mimeType === "image/gif") {
    return buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x38;
  }
  // WEBP: RIFF....WEBP
  if (mimeType === "image/webp") {
    const header = buffer.slice(0, 4).toString("ascii");
    const format = buffer.slice(8, 12).toString("ascii");
    return header === "RIFF" && format === "WEBP";
  }
  // SVG: text containing <svg
  if (mimeType === "image/svg+xml") {
    const head = buffer.slice(0, 1024).toString("utf8");
    return head.includes("<svg");
  }
  return true;
}

module.exports = {
  upload,
  validateImageIntegrity
};
