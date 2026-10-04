const express = require("express");
const router = express.Router();
const { db } = require("../../db");
const { articles, categories, media, featured_items, region_items } = require("../../db/schema");
const { eq, and, desc, sql } = require("drizzle-orm");
const mediaStorage = require("../../services/mediaStorage");

/**
 * Format relative time in Telugu for newspaper authenticity
 */
function formatTeluguTime(date) {
  if (!date) return "తాజా వార్త";
  const now = new Date();
  const diffMs = now - new Date(date);
  if (diffMs < 0) return "తాజా వార్త";
  const diffMins = Math.floor(diffMs / (1000 * 60));
  if (diffMins < 1) return "ఇప్పుడే";
  if (diffMins < 60) return `${diffMins} నిమిషాల క్రితం`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} గంటల క్రితం`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "నిన్న";
  if (diffDays < 7) return `${diffDays} రోజుల క్రితం`;
  return new Date(date).toLocaleDateString("te-IN");
}

/**
 * GET /api/home
 * Returns complete homepage data: featured carousel, latest news, categories, regional feeds
 */
router.get("/home", async (req, res, next) => {
  try {
    // 1. Featured Carousel: automatically displays the most recently published/uploaded news articles (newest first)
    const carouselLimit = 10;
    const featuredRows = await db
      .select({
        id: articles.id,
        title: articles.title,
        slug: articles.slug,
        isBreaking: articles.is_breaking,
        isLive: articles.is_live,
        publishedAt: articles.published_at,
        createdAt: articles.created_at,
        categoryName: categories.name,
        categorySlug: categories.slug,
        mediaPath: media.storage_path,
        mediaAlt: media.alt_text,
        badgeText: featured_items.badge_text,
        displayHeadline: featured_items.display_headline
      })
      .from(articles)
      .leftJoin(categories, eq(articles.category_id, categories.id))
      .leftJoin(media, eq(articles.featured_image_id, media.id))
      .leftJoin(featured_items, eq(articles.id, featured_items.article_id))
      .where(eq(articles.status, "published"))
      .orderBy(desc(sql`COALESCE(${articles.published_at}, ${articles.created_at})`))
      .limit(carouselLimit);

    const totalSlides = featuredRows.length || 1;
    const featured = featuredRows.map((f, idx) => ({
      id: f.id,
      articleId: f.id,
      slideNumber: `${idx + 1}/${totalSlides}`,
      image: mediaStorage.getFileUrl(f.mediaPath || "assets/carousel_image_slide1.png"),
      badgeText: f.badgeText || (f.isBreaking ? "బ్రేకింగ్.." : f.isLive ? "లైవ్.." : (f.categoryName ? `${f.categoryName}..` : "ప్రత్యేక కథనం..")),
      headline: f.displayHeadline || f.title,
      category: f.categoryName || "వార్తలు",
      categorySlug: f.categorySlug,
      url: `/article/${f.slug}`,
      slug: f.slug,
      isPrimary: idx === 0
    }));

    // 2. Latest News Column (Ordered by published_at DESC)
    const latestRows = await db
      .select({
        id: articles.id,
        slug: articles.slug,
        title: articles.title,
        hasVideo: articles.has_video,
        isLive: articles.is_live,
        isBreaking: articles.is_breaking,
        publishedAt: articles.published_at,
        categoryName: categories.name,
        categorySlug: categories.slug
      })
      .from(articles)
      .leftJoin(categories, eq(articles.category_id, categories.id))
      .where(eq(articles.status, "published"))
      .orderBy(desc(articles.published_at))
      .limit(12);

    const latest = latestRows.map((a, idx) => ({
      id: a.id,
      title: a.title,
      type: a.isLive ? "live" : "news",
      hasVideo: a.hasVideo,
      isLive: a.isLive,
      isBreaking: a.isBreaking,
      livePrefix: a.isLive ? "⦿ లైవ్:" : "",
      url: `/article/${a.slug}`,
      slug: a.slug,
      category: a.categoryName,
      categorySlug: a.categorySlug,
      publishedAt: a.publishedAt,
      time: formatTeluguTime(a.publishedAt)
    }));

    // 3. Categories (excluding 'latest' which is dynamic)
    const categoryRows = await db
      .select()
      .from(categories)
      .where(eq(categories.is_active, true))
      .orderBy(categories.sort_order);

    const categoriesList = categoryRows.map(c => ({
      id: c.slug,
      slug: c.slug,
      name: c.name,
      title: c.name,
      breadcrumb: c.breadcrumb,
      description: c.description
    }));

    // 4. Regional Items (andhra, telangana, districts)
    const regionRows = await db
      .select({
        region: region_items.region,
        position: region_items.position,
        title: articles.title,
        slug: articles.slug
      })
      .from(region_items)
      .innerJoin(articles, eq(region_items.article_id, articles.id))
      .where(and(eq(region_items.is_active, true), eq(articles.status, "published")))
      .orderBy(region_items.position);

    const regionNewsData = {
      andhra: [],
      telangana: [],
      districts: []
    };

    regionRows.forEach(r => {
      if (regionNewsData[r.region]) {
        regionNewsData[r.region].push({
          title: r.title,
          url: `/article/${r.slug}`,
          slug: r.slug
        });
      }
    });

    res.json({
      success: true,
      data: {
        featured,
        latest,
        categories: categoriesList,
        regions: {
          activeRegion: "andhra",
          tabs: [
            { id: "districts", label: "జిల్లాలు", style: "link" },
            { id: "andhra", label: "ఆంధ్రప్రదేశ్", style: "button-red" },
            { id: "telangana", label: "తెలంగాణ", style: "button-blue" }
          ],
          newsData: regionNewsData
        }
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/categories
 * Returns active categories
 */
router.get("/categories", async (req, res, next) => {
  try {
    const list = await db
      .select()
      .from(categories)
      .where(eq(categories.is_active, true))
      .orderBy(categories.sort_order);

    res.json({
      success: true,
      data: list
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/articles
 * Supports: ?page=1&limit=20&category=national&sort=latest
 */
router.get("/articles", async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const offset = (page - 1) * limit;
    const categorySlug = req.query.category && req.query.category.trim();

    // Base conditions
    const conditions = [eq(articles.status, "published")];

    let targetCategory = null;
    if (categorySlug && categorySlug !== "latest") {
      targetCategory = (
        await db.select().from(categories).where(eq(categories.slug, categorySlug))
      )[0];

      if (targetCategory) {
        conditions.push(eq(articles.category_id, targetCategory.id));
      }
    }

    const whereClause = and(...conditions);

    // Count total matching articles
    const totalCountResult = await db
      .select({ count: sql`count(*)` })
      .from(articles)
      .where(whereClause);
    const total = parseInt(totalCountResult[0]?.count || 0, 10);
    const totalPages = Math.ceil(total / limit);

    // Fetch page items
    const rows = await db
      .select({
        id: articles.id,
        slug: articles.slug,
        title: articles.title,
        description: articles.description,
        publishedAt: articles.published_at,
        isBreaking: articles.is_breaking,
        isLive: articles.is_live,
        hasVideo: articles.has_video,
        categoryName: categories.name,
        categorySlug: categories.slug,
        mediaPath: media.storage_path,
        mediaAlt: media.alt_text
      })
      .from(articles)
      .leftJoin(categories, eq(articles.category_id, categories.id))
      .leftJoin(media, eq(articles.featured_image_id, media.id))
      .where(whereClause)
      .orderBy(desc(articles.published_at))
      .limit(limit)
      .offset(offset);

    const formattedArticles = rows.map(r => ({
      id: r.id,
      slug: r.slug,
      title: r.title,
      description: r.description,
      image: mediaStorage.getFileUrl(r.mediaPath || "assets/news_green_energy.png"),
      imageAlt: r.mediaAlt || r.title,
      category: r.categorySlug || "national",
      categoryTitle: r.categoryName || "వార్తలు",
      url: `/article/${r.slug}`,
      publishedAt: r.publishedAt,
      time: formatTeluguTime(r.publishedAt),
      isBreaking: r.isBreaking,
      isLive: r.isLive,
      hasVideo: r.hasVideo
    }));

    res.json({
      success: true,
      data: {
        articles: formattedArticles,
        category: targetCategory || (categorySlug === "latest" ? { slug: "latest", name: "తాజా వార్తలు", breadcrumb: "LATEST NEWS" } : null),
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasMore: page < totalPages
        }
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/articles/:slug
 * Returns complete single article for detail view
 */
router.get("/articles/:slug", async (req, res, next) => {
  try {
    const { slug } = req.params;

    const rows = await db
      .select({
        id: articles.id,
        slug: articles.slug,
        title: articles.title,
        description: articles.description,
        contentHtml: articles.content_html,
        status: articles.status,
        isBreaking: articles.is_breaking,
        isLive: articles.is_live,
        hasVideo: articles.has_video,
        publishedAt: articles.published_at,
        categoryId: categories.id,
        categorySlug: categories.slug,
        categoryName: categories.name,
        categoryBreadcrumb: categories.breadcrumb,
        mediaId: media.id,
        mediaPath: media.storage_path,
        mediaAlt: media.alt_text
      })
      .from(articles)
      .leftJoin(categories, eq(articles.category_id, categories.id))
      .leftJoin(media, eq(articles.featured_image_id, media.id))
      .where(and(eq(articles.slug, slug), eq(articles.status, "published")))
      .limit(1);

    if (!rows.length) {
      return res.status(404).json({
        success: false,
        error: {
          code: "ARTICLE_NOT_FOUND",
          message: "The requested article was not found or is no longer published."
        }
      });
    }

    const a = rows[0];

    const articleData = {
      id: a.id,
      slug: a.slug,
      title: a.title,
      description: a.description,
      contentHtml: a.contentHtml,
      category: a.categorySlug ? {
        id: a.categoryId,
        slug: a.categorySlug,
        name: a.categoryName,
        breadcrumb: a.categoryBreadcrumb
      } : { slug: "national", name: "జాతీయం", breadcrumb: "NATIONAL" },
      featuredImage: a.mediaPath ? {
        id: a.mediaId,
        url: mediaStorage.getFileUrl(a.mediaPath),
        alt: a.mediaAlt || a.title
      } : {
        url: mediaStorage.getFileUrl("assets/slide_space.jpg"),
        alt: a.title
      },
      isBreaking: a.isBreaking,
      isLive: a.isLive,
      hasVideo: a.hasVideo,
      publishedAt: a.publishedAt,
      time: formatTeluguTime(a.publishedAt),
      author: "రైట్ వే న్యూస్ డెస్క్"
    };

    res.json({
      success: true,
      data: articleData
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
