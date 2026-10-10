require("dotenv").config();
const path = require("path");
const fs = require("fs");
const schema = require("./schema");

let db = null;
let client = null;
let isPgLite = false;

const rawUrl = process.env.DATABASE_URL ? process.env.DATABASE_URL.trim().replace(/^["']|["']$/g, "") : "";
const isPostgresUrl = Boolean(rawUrl && (rawUrl.startsWith("postgres://") || rawUrl.startsWith("postgresql://")));

if (isPostgresUrl) {
  const { Pool } = require("pg");
  const { drizzle } = require("drizzle-orm/node-postgres");

  const isLocalhost = rawUrl.includes("localhost") || rawUrl.includes("127.0.0.1");
  const pool = new Pool({
    connectionString: rawUrl,
    max: process.env.DB_POOL_MAX ? parseInt(process.env.DB_POOL_MAX, 10) : (process.env.VERCEL ? 3 : 10),
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
    ssl: isLocalhost ? false : { rejectUnauthorized: false }
  });

  pool.on("error", (err) => {
    console.error("[Database Pool Error]", err.message || err);
  });

  client = pool;
  db = drizzle(pool, { schema });
  isPgLite = false;
  console.log("[Database] Connected via Node-Postgres Pool to external PostgreSQL");
} else if (process.env.VERCEL || process.env.NODE_ENV === "production") {
  throw new Error(
    "[Database Configuration Error] Running in production/Vercel but DATABASE_URL is not configured. " +
    "Local PGlite cannot run on serverless read-only filesystems. " +
    "Please configure DATABASE_URL in your Vercel Project Settings > Environment Variables."
  );
} else {
  const { PGlite } = require("@electric-sql/pglite");
  const { drizzle } = require("drizzle-orm/pglite");

  const pgDataPath = path.join(__dirname, "pgdata");
  if (!fs.existsSync(pgDataPath)) {
    fs.mkdirSync(pgDataPath, { recursive: true });
  } else {
    // Clean up stale postmaster.pid left behind by abrupt process termination
    const pidFile = path.join(pgDataPath, "postmaster.pid");
    if (fs.existsSync(pidFile)) {
      try {
        fs.unlinkSync(pidFile);
      } catch (e) {
        // Ignore unlink error if already gone
      }
    }
  }

  const pgliteClient = new PGlite(pgDataPath);
  client = pgliteClient;
  db = drizzle(pgliteClient, { schema });
  isPgLite = true;
  console.log(`[Database] Initialized embedded PostgreSQL (PGlite) at ${pgDataPath}`);
}

let initDbPromise = null;

/**
 * Ensures all PostgreSQL tables and indexes exist.
 */
async function initDb() {
  if (initDbPromise) {
    return initDbPromise;
  }

  initDbPromise = (async () => {
    if (isPgLite && client && client.waitReady) {
      await client.waitReady;
    }

    const ddl = `
      CREATE TABLE IF NOT EXISTS admins (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        name VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'admin',
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        last_login_at TIMESTAMP WITH TIME ZONE
      );

      CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        slug VARCHAR(100) NOT NULL UNIQUE,
        name VARCHAR(255) NOT NULL,
        breadcrumb VARCHAR(255) NOT NULL,
        description TEXT,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS media (
        id SERIAL PRIMARY KEY,
        filename TEXT NOT NULL,
        original_name TEXT NOT NULL,
        mime_type VARCHAR(100) NOT NULL,
        storage_path TEXT NOT NULL,
        alt_text TEXT,
        width INTEGER,
        height INTEGER,
        file_size INTEGER,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        uploaded_by INTEGER REFERENCES admins(id)
      );

      CREATE TABLE IF NOT EXISTS articles (
        id SERIAL PRIMARY KEY,
        slug VARCHAR(255) NOT NULL UNIQUE,
        title TEXT NOT NULL,
        description TEXT,
        content_html TEXT,
        category_id INTEGER REFERENCES categories(id),
        featured_image_id INTEGER REFERENCES media(id),
        status VARCHAR(30) NOT NULL DEFAULT 'draft',
        is_breaking BOOLEAN NOT NULL DEFAULT FALSE,
        is_live BOOLEAN NOT NULL DEFAULT FALSE,
        has_video BOOLEAN NOT NULL DEFAULT FALSE,
        published_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        created_by INTEGER REFERENCES admins(id),
        updated_by INTEGER REFERENCES admins(id)
      );

      CREATE TABLE IF NOT EXISTS featured_items (
        id SERIAL PRIMARY KEY,
        article_id INTEGER NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
        position INTEGER NOT NULL DEFAULT 0,
        badge_text TEXT,
        display_headline TEXT,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS region_items (
        id SERIAL PRIMARY KEY,
        region VARCHAR(50) NOT NULL,
        article_id INTEGER NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
        position INTEGER NOT NULL DEFAULT 0,
        is_active BOOLEAN NOT NULL DEFAULT TRUE
      );

      CREATE INDEX IF NOT EXISTS idx_articles_slug ON articles(slug);
      CREATE INDEX IF NOT EXISTS idx_articles_status_published ON articles(status, published_at DESC);
      CREATE INDEX IF NOT EXISTS idx_articles_category ON articles(category_id);
      CREATE INDEX IF NOT EXISTS idx_featured_pos ON featured_items(position);
      CREATE INDEX IF NOT EXISTS idx_region_items_region ON region_items(region, position);
    `;

    if (isPgLite) {
      await client.exec(ddl);
    } else {
      await client.query(ddl);
    }

    console.log("[Database] Core tables and indexes verified successfully.");
  })().catch((err) => {
    initDbPromise = null;
    throw err;
  });

  return initDbPromise;
}

module.exports = {
  db,
  client,
  schema,
  initDb,
  isPgLite
};
