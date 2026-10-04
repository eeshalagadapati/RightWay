require("dotenv").config();
const fs = require("fs");
const path = require("path");
const argon2 = require("argon2");
const { db, client, initDb, isPgLite } = require("./index");
const { admins, categories, media, articles, featured_items, region_items } = require("./schema");
const { eq } = require("drizzle-orm");

// Read initial editorial dataset
const portalData = require("./seedData");

async function seed() {
  console.log("=== Starting Database Migration & Seed ===");
  await initDb();

  // 1. Create or verify Admin User from environment configuration
  const adminEmail = (process.env.ADMIN_DEFAULT_EMAIL || "").toLowerCase().trim();
  const adminPassword = process.env.ADMIN_DEFAULT_PASSWORD;
  const adminName = process.env.ADMIN_DEFAULT_NAME || "Administrator";

  if (!adminEmail || !adminPassword) {
    throw new Error("[Seed Error] ADMIN_DEFAULT_EMAIL and ADMIN_DEFAULT_PASSWORD must be configured in .env before running the seed script.");
  }

  let adminUser = (await db.select().from(admins).where(eq(admins.email, adminEmail)))[0];

  if (!adminUser) {
    console.log(`[Seed] Creating default admin account: ${adminEmail}`);
    const passwordHash = await argon2.hash(adminPassword, { type: argon2.argon2id });
    const inserted = await db.insert(admins).values({
      email: adminEmail,
      password_hash: passwordHash,
      name: adminName,
      role: "admin",
      is_active: true
    }).returning();
    adminUser = inserted[0];
    console.log(`[Seed] Admin created successfully (ID: ${adminUser.id})`);
  } else {
    console.log(`[Seed] Admin already exists (ID: ${adminUser.id})`);
  }

  // 2. Seed Categories (excluding 'latest' per requirement)
  const categoryDefs = [
    { slug: "andhra-pradesh", name: "ఆంధ్రప్రదేశ్", breadcrumb: "ANDHRA PRADESH", description: "ఆంధ్రప్రదేశ్ రాష్ట్ర తాజా రాజకీయాలు, అభివృద్ధి మరియు సమగ్ర వార్తలు", sort_order: 1 },
    { slug: "telangana", name: "తెలంగాణ", breadcrumb: "TELANGANA", description: "తెలంగాణ రాష్ట్ర తాజా సమాచారం, హైదరాబాదు వార్తలు మరియు విశ్లేషణలు", sort_order: 2 },
    { slug: "national", name: "జాతీయం", breadcrumb: "NATIONAL", description: "భారతదేశ జాతీయ వార్తలు, రాజకీయ పరిణామాలు మరియు విధాన నిర్ణయాలు", sort_order: 3 },
    { slug: "international", name: "అంతర్జాతీయం", breadcrumb: "INTERNATIONAL", description: "ప్రపంచ వ్యాప్తంగా జరుగుతున్న ముఖ్య పరిణామాలు మరియు అంతర్జాతీయ వార్తలు", sort_order: 4 },
    { slug: "business", name: "బిజినెస్", breadcrumb: "BUSINESS", description: "స్టాక్ మార్కెట్, బ్యాంకింగ్, పరిశ్రమలు మరియు ఆర్థిక రంగ తాజా విశేషాలు", sort_order: 5 },
    { slug: "sports", name: "క్రీడలు", breadcrumb: "SPORTS", description: "క్రికెట్, కబడ్డీ, ఒలింపిక్స్ మరియు జాతీయ, అంతర్జాతీయ క్రీడా విశేషాలు", sort_order: 6 },
    { slug: "cinema", name: "సినిమా", breadcrumb: "CINEMA", description: "టాలీవుడ్, బాలీవుడ్ చిత్ర విశేషాలు, బాక్సాఫీస్ రికార్డులు మరియు సెలబ్రిటీ అప్‌డేట్స్", sort_order: 7 }
  ];

  const categoryMap = {}; // slug -> id
  for (const cat of categoryDefs) {
    let existing = (await db.select().from(categories).where(eq(categories.slug, cat.slug)))[0];
    if (!existing) {
      const inserted = await db.insert(categories).values(cat).returning();
      existing = inserted[0];
      console.log(`[Seed] Created category: ${cat.slug}`);
    }
    categoryMap[cat.slug] = existing.id;
  }

  // 3. Seed Media Assets
  const mediaList = [
    { path: "assets/logo_right_way.png", alt: "రైట్ వే న్యూస్ లోగో" },
    { path: "assets/slide_space.jpg", alt: "స్పేస్ సైన్స్ ఛాయాచిత్రం" },
    { path: "assets/carousel_image_slide1.png", alt: "స్పోర్ట్స్ అండ్ ఈవెంట్స్ కవర్" },
    { path: "assets/news_green_energy.png", alt: "గ్రీన్ ఎనర్జీ కారిడార్" },
    { path: "assets/news_rain_monsoon.png", alt: "వర్షాలు మరియు వాతావరణం" },
    { path: "assets/news_telangana.svg", alt: "తెలంగాణ విశేషాలు" },
    { path: "assets/news_amaravati.svg", alt: "అమరావతి రాజధాని విశేషాలు" },
    { path: "assets/news_business.svg", alt: "స్టాక్ మార్కెట్ మరియు బిజినెస్" },
    { path: "assets/news_cinema.svg", alt: "సినిమా అవార్డులు మరియు బాక్సాఫీస్" },
    { path: "assets/news_international.svg", alt: "అంతర్జాతీయ సదస్సులు" },
    { path: "assets/top_logo_banner.png", alt: "టాప్ బ్రాండింగ్ బ్యానర్" },
    { path: "assets/ad_journalism.png", alt: "జర్నలిజం స్కూల్ ప్రకటన" },
    { path: "assets/ad_horoscope.png", alt: "రాశిఫలాలు ప్రకటన" },
    { path: "assets/ad_neopolis_pristine.png", alt: "రియల్ ఎస్టేట్ ప్రకటన" }
  ];

  const mediaMap = {}; // path -> id
  for (const m of mediaList) {
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
      const inserted = await db.insert(media).values({
        filename: filename,
        original_name: filename,
        mime_type: mime,
        storage_path: m.path,
        alt_text: m.alt,
        file_size: size,
        uploaded_by: adminUser.id
      }).returning();
      existing = inserted[0];
    }
    mediaMap[m.path] = existing.id;
  }
  console.log(`[Seed] Media catalog initialized with ${Object.keys(mediaMap).length} items`);

  // Helper to map time offset into published_at Date
  function parseTimeOffset(timeStr, index) {
    const now = new Date();
    if (!timeStr) {
      return new Date(now.getTime() - index * 20 * 60 * 1000);
    }
    const minMatch = timeStr.match(/(\d+)\s*నిమిషాల/);
    if (minMatch) {
      return new Date(now.getTime() - parseInt(minMatch[1], 10) * 60 * 1000);
    }
    const hrMatch = timeStr.match(/(\d+)\s*గంటల/);
    if (hrMatch) {
      return new Date(now.getTime() - parseInt(hrMatch[1], 10) * 60 * 60 * 1000);
    }
    return new Date(now.getTime() - index * 15 * 60 * 1000);
  }

  // Slug mapping dictionary for existing data items
  const slugMapping = {
    "nat-1": "india-green-energy-grid-phase-3",
    "nat-2": "innovative-rain-customs-monsoon",
    "nat-3": "isro-aditya-l1-solar-mission",
    "nat-4": "parliament-session-green-energy-bills",
    "tg-1": "hyderabad-metro-phase-2-airport-line",
    "tg-2": "telangana-it-exports-2-75-lakh-crores",
    "tg-3": "kaleshwaram-godavari-irrigation-waters",
    "tg-4": "hyderabad-pharma-city-life-sciences",
    "ap-1": "amaravati-development-works-special-committee",
    "ap-2": "visakhapatnam-port-record-cargo-exports",
    "ap-3": "polavaram-project-diaphragm-wall-review",
    "ap-4": "andhra-rythu-loan-waiver-funds-released",
    "biz-1": "stock-markets-sensex-nifty-record-highs",
    "biz-2": "india-electric-vehicles-green-mobility-revolution",
    "biz-3": "rbi-monetary-policy-repo-rates-unchanged",
    "biz-4": "indian-startups-new-unicorns-global-investments",
    "sp-1": "asian-games-india-defeats-iran-gold-medal",
    "sp-2": "cricket-world-cup-rohit-sharma-magnificent-century",
    "sp-3": "badminton-open-indian-shuttlers-enter-semis",
    "sp-4": "pro-kabaddi-league-new-season-schedule",
    "cin-1": "box-office-records-huge-budget-movie-collections",
    "cin-2": "national-film-awards-telugu-cinema-triumph",
    "cin-3": "sankranti-star-hero-movies-theatres-buzz",
    "cin-4": "tollywood-global-music-record-breaking-views",
    "intl-1": "g20-summit-world-leaders-joint-declaration",
    "intl-2": "india-us-strategic-agreements-tech-partnership",
    "intl-3": "nasa-james-webb-telescope-deep-space-life",
    "intl-4": "global-economy-india-growth-engine-imf",
    "lat-1": "india-energy-needs-us-partnership-report",
    "lat-2": "cji-special-awareness-student-future-call",
    "lat-3": "weather-alert-cyclone-heavy-rains-coastal-ap",
    "lat-4": "special-festival-trains-south-central-railway"
  };

  // 4. Seed Articles from portalData.articles
  const articleMapByOldId = {};
  const articleMapBySlug = {};

  for (let i = 0; i < portalData.articles.length; i++) {
    const raw = portalData.articles[i];
    const slug = slugMapping[raw.id] || `article-${raw.id}`;
    
    // Resolve category (map 'latest' to national or appropriate category)
    let categorySlug = raw.category;
    if (categorySlug === "latest" || !categoryMap[categorySlug]) {
      categorySlug = "national";
    }
    const catId = categoryMap[categorySlug];

    const imageId = mediaMap[raw.image] || mediaMap["assets/news_green_energy.png"];
    const pubDate = parseTimeOffset(raw.time, i);

    const contentHtml = `
      <p class="article-lead">${raw.description}</p>
      <p>ఈ సమగ్ర అంశంపై సంబంధిత ఉన్నతాధికారులు మరియు నిపుణుల బృందం కీలక చర్చలు జరిపింది. క్షేత్రస్థాయి పరిశీలన అనంతరం రాబోయే ప్రణాళికలను అమలు చేయాలని నిర్ణయించారు.</p>
      <p>ప్రజలకు మరింత పారదర్శకమైన సేవలు అందించేందుకు మరియు సమాచారాన్ని వేగవంతంగా చేరవేసేందుకు అన్ని విభాగాలు సమన్వయంతో పనిచేస్తున్నట్లు అధికారులు వెల్లడించారు. భవిష్యత్తులో ఈ నిర్ణయాలు గణనీయమైన ఫలితాలను అందించనున్నాయి.</p>
      <p>ఈ అంశంపై మరిన్ని తాజా సమాచారాలు మరియు ప్రత్యక్ష విశ్లేషణల కోసం రైట్ వే న్యూస్ పోర్టల్‌ను చూస్తూ ఉండండి.</p>
    `;

    let existing = (await db.select().from(articles).where(eq(articles.slug, slug)))[0];
    if (!existing) {
      const inserted = await db.insert(articles).values({
        slug: slug,
        title: raw.title,
        description: raw.description,
        content_html: contentHtml,
        category_id: catId,
        featured_image_id: imageId,
        status: "published",
        is_breaking: i < 2,
        is_live: false,
        has_video: i % 3 === 0,
        published_at: pubDate,
        created_by: adminUser.id,
        updated_by: adminUser.id
      }).returning();
      existing = inserted[0];
    }
    articleMapByOldId[raw.id] = existing;
    articleMapBySlug[slug] = existing;
  }
  console.log(`[Seed] Seeded ${Object.keys(articleMapByOldId).length} primary articles from portalData.articles`);

  // 5. Seed Latest News items from portalData.latestNews
  for (let i = 0; i < portalData.latestNews.length; i++) {
    const item = portalData.latestNews[i];
    const slug = `latest-news-${item.id}`;
    let existing = (await db.select().from(articles).where(eq(articles.slug, slug)))[0];
    if (!existing) {
      const pubDate = new Date(Date.now() - (i + 1) * 8 * 60 * 1000); // 8 mins, 16 mins, etc.
      const inserted = await db.insert(articles).values({
        slug: slug,
        title: item.title,
        description: item.title + " - సమగ్ర వివరాలు.",
        content_html: `<p>${item.title}</p><p>ఈ అంశంపై తాజా వివరాలు క్షేత్రస్థాయి నుంచి అందుతున్నాయి. మరిన్ని అప్‌డేట్స్ కోసం చూస్తూ ఉండండి.</p>`,
        category_id: categoryMap["national"] || Object.values(categoryMap)[0],
        featured_image_id: mediaMap["assets/carousel_image_slide1.png"],
        status: "published",
        is_breaking: item.isLive || false,
        is_live: item.isLive || false,
        has_video: item.hasVideo || false,
        published_at: pubDate,
        created_by: adminUser.id,
        updated_by: adminUser.id
      }).returning();
      existing = inserted[0];
    }
    articleMapBySlug[slug] = existing;
  }

  // 6. Seed Featured Items (portalData.featuredNews)
  // Clear any existing to guarantee fresh order matching data.js
  await db.delete(featured_items);

  const allArticles = await db.select().from(articles);
  for (let i = 0; i < portalData.featuredNews.length; i++) {
    const slide = portalData.featuredNews[i];
    // Find an article or associate with one in order
    const art = allArticles[i % allArticles.length];
    if (art) {
      await db.insert(featured_items).values({
        article_id: art.id,
        position: i + 1,
        badge_text: slide.badgeText || "ప్రత్యేక కథనం..",
        display_headline: slide.headline || art.title,
        is_active: true
      });
    }
  }
  console.log(`[Seed] Seeded ${portalData.featuredNews.length} featured items into featured_items`);

  // 7. Seed Region Items (portalData.regions.newsData)
  await db.delete(region_items);
  const regionsObj = portalData.regions.newsData;

  for (const [regionName, headlines] of Object.entries(regionsObj)) {
    for (let pos = 0; pos < headlines.length; pos++) {
      const headline = headlines[pos];
      const regionSlug = `region-${regionName}-${pos + 1}`;
      let article = (await db.select().from(articles).where(eq(articles.slug, regionSlug)))[0];
      if (!article) {
        const catSlug = regionName === "andhra" ? "andhra-pradesh" : regionName === "telangana" ? "telangana" : "national";
        const catId = categoryMap[catSlug] || Object.values(categoryMap)[0];
        const inserted = await db.insert(articles).values({
          slug: regionSlug,
          title: headline,
          description: headline + " - పూర్తి సమాచారం.",
          content_html: `<p>${headline}</p><p>ఈ అంశంపై అధికారులు మరియు స్థానిక ప్రజాప్రతినిధులు సమీక్ష నిర్వహించారు.</p>`,
          category_id: catId,
          featured_image_id: mediaMap["assets/news_amaravati.svg"] || Object.values(mediaMap)[0],
          status: "published",
          published_at: new Date(Date.now() - (pos + 1) * 35 * 60 * 1000),
          created_by: adminUser.id,
          updated_by: adminUser.id
        }).returning();
        article = inserted[0];
      }

      await db.insert(region_items).values({
        region: regionName,
        article_id: article.id,
        position: pos + 1,
        is_active: true
      });
    }
  }
  console.log(`[Seed] Seeded regional news items for andhra, telangana, and districts`);

  console.log("=== Database Migration & Seed Completed Successfully ===");
}

if (require.main === module) {
  seed()
    .then(() => {
      console.log("Seed script completed.");
      process.exit(0);
    })
    .catch((err) => {
      console.error("Seed error:", err);
      process.exit(1);
    });
}

module.exports = { seed };
