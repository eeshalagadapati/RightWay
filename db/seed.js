require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { db, initDb } = require("./index");
const { admins, categories, media } = require("./schema");
const { eq } = require("drizzle-orm");

/**
 * Clean Production Database Initializer
 * 
 * - Ensures 7 core categories exist with exact slugs and ordering.
 * - Ensures core branding & advertisement assets exist in media library.
 * - Synchronizes administrator credentials from .env.
 * - NEVER seeds dummy or sample news articles.
 */
async function seed() {
  console.log("=== Starting Database Category & Admin Initialization ===");
  await initDb();

  // 1. Create or synchronize Admin User from environment configuration
  const { syncAdminCredentials } = require("./syncAdmin");
  await syncAdminCredentials();
  const adminEmail = (process.env.ADMIN_DEFAULT_EMAIL || "").toLowerCase().trim();
  const adminUser = (await db.select().from(admins).where(eq(admins.email, adminEmail)))[0] || (await db.select().from(admins).limit(1))[0];

  // 2. Ensure the 7 Protected Categories exist (IDs 1 through 7)
  const categoryDefs = [
    { slug: "andhra-pradesh", name: "ఆంధ్రప్రదేశ్", breadcrumb: "ANDHRA PRADESH", description: "ఆంధ్రప్రదేశ్ రాష్ట్ర తాజా రాజకీయాలు, అభివృద్ధి మరియు సమగ్ర వార్తలు", sort_order: 1 },
    { slug: "telangana", name: "తెలంగాణ", breadcrumb: "TELANGANA", description: "తెలంగాణ రాష్ట్ర తాజా సమాచారం, హైదరాబాదు వార్తలు మరియు విశ్లేషణలు", sort_order: 2 },
    { slug: "national", name: "జాతీయం", breadcrumb: "NATIONAL", description: "భారతదేశ జాతీయ వార్తలు, రాజకీయ పరిణామాలు మరియు విధాన నిర్ణయాలు", sort_order: 3 },
    { slug: "international", name: "అంతర్జాతీయం", breadcrumb: "INTERNATIONAL", description: "ప్రపంచ వ్యాప్తంగా జరుగుతున్న ముఖ్య పరిణామాలు మరియు అంతర్జాతీయ వార్తలు", sort_order: 4 },
    { slug: "business", name: "బిజినెస్", breadcrumb: "BUSINESS", description: "స్టాక్ మార్కెట్, బ్యాంకింగ్, పరిశ్రమలు మరియు ఆర్థిక రంగ తాజా విశేషాలు", sort_order: 5 },
    { slug: "sports", name: "క్రీడలు", breadcrumb: "SPORTS", description: "క్రికెట్, కబడ్డీ, ఒలింపిక్స్ మరియు జాతీయ, అంతర్జాతీయ క్రీడా విశేషాలు", sort_order: 6 },
    { slug: "cinema", name: "సినిమా", breadcrumb: "CINEMA", description: "టాలీవుడ్, బాలీవుడ్ చిత్ర విశేషాలు, బాక్సాఫీస్ రికార్డులు మరియు సెలబ్రిటీ అప్‌డేట్స్", sort_order: 7 }
  ];

  for (const cat of categoryDefs) {
    let existing = (await db.select().from(categories).where(eq(categories.slug, cat.slug)))[0];
    if (!existing) {
      await db.insert(categories).values(cat);
      console.log(`[Seed] Created category: ${cat.slug}`);
    }
  }
  console.log(`[Seed] Verified 7 core categories.`);

  // 3. Ensure Core Branding & Advertisement Media Assets exist
  const coreMediaList = [
    { path: "assets/logo_right_way.png", alt: "రైట్ వే న్యూస్ లోగో" },
    { path: "assets/top_logo_banner.png", alt: "టాప్ బ్రాండింగ్ బ్యానర్" },
    { path: "assets/ad_journalism.png", alt: "జర్నలిజం స్కూల్ ప్రకటన" },
    { path: "assets/ad_horoscope.png", alt: "రాశిఫలాలు ప్రకటన" },
    { path: "assets/ad_neopolis_pristine.png", alt: "రియల్ ఎస్టేట్ ప్రకటన" }
  ];

  for (const m of coreMediaList) {
    const fullDiskPath = path.join(__dirname, "..", m.path);
    let size = 0;
    if (fs.existsSync(fullDiskPath)) {
      size = fs.statSync(fullDiskPath).size;
    }
    const ext = path.extname(m.path).toLowerCase();
    const mime = ext === ".svg" ? "image/svg+xml" : ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" : ext === ".webp" ? "image/webp" : "image/png";
    const filename = path.basename(m.path);

    let existing = (await db.select().from(media).where(eq(media.storage_path, m.path)))[0];
    if (!existing) {
      await db.insert(media).values({
        filename: filename,
        original_name: filename,
        mime_type: mime,
        storage_path: m.path,
        alt_text: m.alt,
        file_size: size,
        uploaded_by: adminUser ? adminUser.id : 1
      });
    }
  }
  console.log(`[Seed] Verified core branding and ad media.`);
  console.log("=== Initialization Completed Successfully (Clean Production State) ===");
}

if (require.main === module) {
  seed()
    .then(() => {
      console.log("Initialization script completed.");
      process.exit(0);
    })
    .catch((err) => {
      console.error("Initialization error:", err);
      process.exit(1);
    });
}

module.exports = { seed };
