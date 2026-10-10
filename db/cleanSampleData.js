require("dotenv").config();
const { Pool } = require("pg");
const { PGlite } = require("@electric-sql/pglite");
const path = require("path");
const fs = require("fs");

/**
 * Sanitizes a PostgreSQL connection URL to hide credentials.
 */
function sanitizeUrl(rawUrl) {
  if (!rawUrl) return "[Embedded PGlite]";
  try {
    const parsed = new URL(rawUrl);
    return `${parsed.protocol}//${parsed.username ? "***:***@" : ""}${parsed.host}${parsed.pathname}`;
  } catch (e) {
    return rawUrl.replace(/:[^:@]+@/, ":***@");
  }
}

async function executeTargetedCleanup() {
  console.log("=== TARGETED SAMPLE-DATA CLEANUP SCRIPT ===");

  const args = process.argv.slice(2);
  const isExecute = args.includes("--execute");
  const allowExternal = args.includes("--allow-external");
  const urlArg = args.find(a => a.startsWith("--url="));

  let rawUrl = urlArg ? urlArg.split("=")[1].trim().replace(/^["']|["']$/g, "") : (process.env.DATABASE_URL ? process.env.DATABASE_URL.trim().replace(/^["']|["']$/g, "") : "");
  const isPostgresUrl = Boolean(rawUrl && (rawUrl.startsWith("postgres://") || rawUrl.startsWith("postgresql://")));

  if (isPostgresUrl && !allowExternal) {
    console.error("\n[SAFETY GUARDRAIL TRIGGERED]");
    console.error("An external PostgreSQL database was detected:");
    console.error(`  Target: ${sanitizeUrl(rawUrl)}`);
    console.error("\nTo prevent unintended deletion on external/production databases,");
    console.error("the script will NOT execute without explicit confirmation flags:");
    console.error("  node db/cleanSampleData.js --allow-external --execute\n");
    throw new Error("Execution blocked by external database safety guardrail.");
  }

  let client = null;
  let pool = null;
  let targetDesc = "";

  if (isPostgresUrl) {
    const isLocalhost = rawUrl.includes("localhost") || rawUrl.includes("127.0.0.1");
    pool = new Pool({
      connectionString: rawUrl,
      ssl: isLocalhost ? false : { rejectUnauthorized: false }
    });
    client = await pool.connect();
    targetDesc = `External PostgreSQL Database: ${sanitizeUrl(rawUrl)}`;
  } else {
    const pgDataPath = path.join(__dirname, "pgdata");
    const pidFile = path.join(pgDataPath, "postmaster.pid");
    if (fs.existsSync(pidFile)) {
      try { fs.unlinkSync(pidFile); } catch (e) {}
    }
    client = new PGlite(pgDataPath);
    await client.waitReady;
    targetDesc = `Local Embedded PGlite Database at: ${pgDataPath}`;
  }

  console.log(`[Target Database] ${targetDesc}`);

  try {
    // 1. Inspect current state before any operation
    const catCountRes = await client.query("SELECT COUNT(*) as count FROM categories;");
    const adminCountRes = await client.query("SELECT COUNT(*) as count FROM admins;");
    const artCountRes = await client.query("SELECT COUNT(*) as count FROM articles;");
    const featCountRes = await client.query("SELECT COUNT(*) as count FROM featured_items;");
    const regCountRes = await client.query("SELECT COUNT(*) as count FROM region_items;");
    const mediaCountRes = await client.query("SELECT COUNT(*) as count FROM media;");

    console.log("\n[Current Database Record Counts]");
    console.log(`- Categories     : ${catCountRes.rows[0].count} (Protected)`);
    console.log(`- Admins         : ${adminCountRes.rows[0].count} (Protected)`);
    console.log(`- Media Items    : ${mediaCountRes.rows[0].count}`);
    console.log(`- Articles       : ${artCountRes.rows[0].count}`);
    console.log(`- Featured Items : ${featCountRes.rows[0].count}`);
    console.log(`- Region Items   : ${regCountRes.rows[0].count}`);

    if (!isExecute) {
      console.log("\n[DRY RUN MODE] No records were modified.");
      console.log("To execute the cleanup on the target database, run with --execute.");
      return;
    }

    console.log("\n[Executing Deletions Inside Atomic Transaction]...");
    await client.query("BEGIN;");

    // 1. Delete dependent relations first (region_items & featured_items)
    const delRegionsRes = await client.query("DELETE FROM region_items;");
    const delFeaturedRes = await client.query("DELETE FROM featured_items;");
    console.log(`- Deleted ${delRegionsRes.rowCount || delRegionsRes.affectedRows || 0} region items.`);
    console.log(`- Deleted ${delFeaturedRes.rowCount || delFeaturedRes.affectedRows || 0} featured carousel items.`);

    // 2. Delete sample articles
    const delArticlesRes = await client.query("DELETE FROM articles;");
    console.log(`- Deleted ${delArticlesRes.rowCount || delArticlesRes.affectedRows || 0} articles.`);

    // 3. Delete sample news media assets (IDs 2-10), preserving core branding and ads (1, 11, 12, 13, 14)
    const delMediaRes = await client.query(`
      DELETE FROM media 
      WHERE id NOT IN (1, 11, 12, 13, 14)
        AND storage_path NOT IN (
          'assets/logo_right_way.png',
          'assets/top_logo_banner.png',
          'assets/ad_journalism.png',
          'assets/ad_horoscope.png',
          'assets/ad_neopolis_pristine.png'
        );
    `);
    console.log(`- Deleted ${delMediaRes.rowCount || delMediaRes.affectedRows || 0} sample media records.`);

    // 4. Realign auto-increment sequences safely
    await client.query(`SELECT setval(pg_get_serial_sequence('articles', 'id'), 1, false);`);
    await client.query(`SELECT setval(pg_get_serial_sequence('featured_items', 'id'), 1, false);`);
    await client.query(`SELECT setval(pg_get_serial_sequence('region_items', 'id'), 1, false);`);
    await client.query(`SELECT setval(pg_get_serial_sequence('media', 'id'), COALESCE((SELECT MAX(id) FROM media), 1));`);
    await client.query(`SELECT setval(pg_get_serial_sequence('categories', 'id'), COALESCE((SELECT MAX(id) FROM categories), 1));`);
    await client.query(`SELECT setval(pg_get_serial_sequence('admins', 'id'), COALESCE((SELECT MAX(id) FROM admins), 1));`);

    await client.query("COMMIT;");

    // 5. Post-cleanup verification
    const catCheck = await client.query("SELECT COUNT(*) as count FROM categories;");
    const adminCheck = await client.query("SELECT COUNT(*) as count FROM admins;");
    const mediaCheck = await client.query("SELECT COUNT(*) as count FROM media;");
    const artCheck = await client.query("SELECT COUNT(*) as count FROM articles;");
    const featCheck = await client.query("SELECT COUNT(*) as count FROM featured_items;");
    const regCheck = await client.query("SELECT COUNT(*) as count FROM region_items;");

    const resultSummary = {
      categoriesPreserved: parseInt(catCheck.rows[0].count, 10),
      adminsPreserved: parseInt(adminCheck.rows[0].count, 10),
      brandingMediaPreserved: parseInt(mediaCheck.rows[0].count, 10),
      articlesRemaining: parseInt(artCheck.rows[0].count, 10),
      featuredRemaining: parseInt(featCheck.rows[0].count, 10),
      regionsRemaining: parseInt(regCheck.rows[0].count, 10)
    };

    console.log("\n=== POST-CLEANUP VERIFICATION SUMMARY ===");
    console.log(JSON.stringify(resultSummary, null, 2));

    if (resultSummary.categoriesPreserved !== 7 || resultSummary.adminsPreserved < 1 || resultSummary.articlesRemaining !== 0) {
      throw new Error("Post-cleanup sanity check failed!");
    }

    console.log("\n*** TARGET DATABASE IS IN A CLEAN PRODUCTION STATE ***\n");
    return resultSummary;
  } catch (err) {
    try { await client.query("ROLLBACK;"); } catch (e) {}
    console.error("[Cleanup Error]", err.message || err);
    throw err;
  } finally {
    if (pool) {
      client.release();
      await pool.end();
    } else if (client && client.close) {
      await client.close();
    }
  }
}

if (require.main === module) {
  executeTargetedCleanup()
    .then(() => process.exit(0))
    .catch((err) => {
      process.exit(1);
    });
}

module.exports = { executeTargetedCleanup };
