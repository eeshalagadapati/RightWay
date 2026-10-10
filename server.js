require("dotenv").config();
const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const session = require("express-session");

const { initDb } = require("./db");
const { requireAdmin } = require("./middleware/auth");

const authRoutes = require("./api/auth/routes");
const publicRoutes = require("./api/public/routes");
const adminArticlesRoutes = require("./api/admin/articles");
const adminMediaRoutes = require("./api/admin/media");
const adminFeaturedRoutes = require("./api/admin/featured");
const adminCategoriesRoutes = require("./api/admin/categories");

const app = express();
const PORT = process.env.PORT || 3000;

// Body Parsers & Cookie Parser
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true, limit: "15mb" }));
app.use(cookieParser());

// Secure HTTP-Only Cookie Session for Admin CMS
app.use(
  session({
    name: "news_sid",
    secret: process.env.SESSION_SECRET || "news_website_secure_session_key_2026",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    }
  })
);

// Serve static assets and uploads
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/assets", express.static(path.join(__dirname, "assets")));
app.use("/css", express.static(path.join(__dirname, "css")));
app.use("/js", express.static(path.join(__dirname, "js")));
app.use("/admin", express.static(path.join(__dirname, "admin")));

// Ensure database schema is initialized before handling requests (safe for serverless cold-starts)
app.use(async (req, res, next) => {
  try {
    await initDb();
    next();
  } catch (err) {
    next(err);
  }
});

// Mount APIs
app.use("/api/auth", authRoutes);
app.use("/api", publicRoutes); // /api/home, /api/categories, /api/articles, /api/articles/:slug
app.use("/api/admin/articles", requireAdmin, adminArticlesRoutes);
app.use("/api/admin/media", requireAdmin, adminMediaRoutes);
app.use("/api/admin/featured", requireAdmin, adminFeaturedRoutes);
app.use("/api/admin/categories", requireAdmin, adminCategoriesRoutes);

// Admin CMS Single-Page-Application Routing Fallback
app.get(/^\/admin/, (req, res) => {
  res.sendFile(path.join(__dirname, "admin", "index.html"));
});

// Public Website Single-Page-Application Routing Fallback (/category/*, /article/*, /)
app.get(/^((?!\/api).)*$/, (req, res) => {
  const ext = path.extname(req.path);
  if (ext && ext !== ".html") {
    return res.status(404).send("File not found");
  }
  res.sendFile(path.join(__dirname, "index.html"));
});

// Centralized Error Handling
app.use((err, req, res, next) => {
  console.error("[ServerError]", err);
  const status = err.status || 500;
  res.status(status).json({
    success: false,
    error: {
      code: err.code || "INTERNAL_SERVER_ERROR",
      message: err.message || "An unexpected server error occurred."
    }
  });
});

// Start Server after database schema is verified
async function start() {
  try {
    await initDb();

    // Securely synchronize admin credentials from .env if configured
    if (process.env.ADMIN_DEFAULT_EMAIL && process.env.ADMIN_DEFAULT_PASSWORD) {
      const { syncAdminCredentials } = require("./db/syncAdmin");
      await syncAdminCredentials();
    }

    app.listen(PORT, () => {
      console.log(`[RightWayNews] Server listening at http://localhost:${PORT}`);
      console.log(`[RightWayNews] Public Website: http://localhost:${PORT}/`);
      console.log(`[RightWayNews] Private Admin CMS: http://localhost:${PORT}/admin`);
    });
  } catch (err) {
    console.error("[Fatal] Failed to initialize database:", err);
    process.exit(1);
  }
}

if (process.env.VERCEL) {
  module.exports = app;
} else {
  start();
}
