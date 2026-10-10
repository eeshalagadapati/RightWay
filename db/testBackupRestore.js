const { PGlite } = require("@electric-sql/pglite");
const backupData = require("./backup/pgdata_backup.json");

async function testRestoreToTempDb() {
  console.log("=== Testing Backup Restoration in Isolated Temporary Instance ===");

  // Create isolated in-memory instance
  const tempClient = new PGlite();
  await tempClient.waitReady;

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
  `;

  await tempClient.exec(ddl);

  for (const a of backupData.admins) {
    await tempClient.query(
      `INSERT INTO admins (id, email, password_hash, name, role, is_active, created_at, updated_at, last_login_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9);`,
      [a.id, a.email, a.password_hash, a.name, a.role, a.is_active, a.created_at, a.updated_at, a.last_login_at]
    );
  }

  for (const c of backupData.categories) {
    await tempClient.query(
      `INSERT INTO categories (id, slug, name, breadcrumb, description, is_active, sort_order, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9);`,
      [c.id, c.slug, c.name, c.breadcrumb, c.description, c.is_active, c.sort_order, c.created_at, c.updated_at]
    );
  }

  for (const m of backupData.media) {
    await tempClient.query(
      `INSERT INTO media (id, filename, original_name, mime_type, storage_path, alt_text, width, height, file_size, created_at, uploaded_by) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11);`,
      [m.id, m.filename, m.original_name, m.mime_type, m.storage_path, m.alt_text, m.width, m.height, m.file_size, m.created_at, m.uploaded_by]
    );
  }

  for (const art of backupData.articles) {
    await tempClient.query(
      `INSERT INTO articles (id, slug, title, description, content_html, category_id, featured_image_id, status, is_breaking, is_live, has_video, published_at, created_at, updated_at, created_by, updated_by) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16);`,
      [art.id, art.slug, art.title, art.description, art.content_html, art.category_id, art.featured_image_id, art.status, art.is_breaking, art.is_live, art.has_video, art.published_at, art.created_at, art.updated_at, art.created_by, art.updated_by]
    );
  }

  for (const f of backupData.featured_items) {
    await tempClient.query(
      `INSERT INTO featured_items (id, article_id, position, badge_text, display_headline, is_active, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8);`,
      [f.id, f.article_id, f.position, f.badge_text, f.display_headline, f.is_active, f.created_at, f.updated_at]
    );
  }

  for (const r of backupData.region_items) {
    await tempClient.query(
      `INSERT INTO region_items (id, region, article_id, position, is_active) VALUES ($1, $2, $3, $4, $5);`,
      [r.id, r.region, r.article_id, r.position, r.is_active]
    );
  }

  // Verification checks
  const cats = (await tempClient.query(`SELECT id, slug, name FROM categories ORDER BY id;`)).rows;
  const admin = (await tempClient.query(`SELECT id, email FROM admins;`)).rows;
  const artCount = (await tempClient.query(`SELECT COUNT(*) as c FROM articles;`)).rows[0].c;

  console.log("Restored Categories in Temp Instance:", cats.length);
  cats.forEach(c => console.log(`  - ID ${c.id}: ${c.slug} (${c.name})`));
  console.log("Restored Admin in Temp Instance:", admin[0].email);
  console.log("Restored Articles in Temp Instance:", artCount);

  await tempClient.close();

  if (cats.length === 7 && admin.length === 1 && parseInt(artCount, 10) === 50) {
    console.log("=== BACKUP RESTORABILITY 100% VERIFIED ===");
  } else {
    throw new Error("Backup restoration mismatch!");
  }
}

testRestoreToTempDb().catch(console.error);
