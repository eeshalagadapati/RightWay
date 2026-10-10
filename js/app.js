/**
 * Main Application Script for Telugu News Portal
 * Implements dynamic REST API data fetching, client-side routing,
 * real article URLs (/article/:slug), real pagination, and interactive widgets.
 */

// Category pagination state
let categoryPaginationState = {
  currentCategory: null,
  page: 1,
  limit: 10,
  hasMore: false,
  isLoading: false
};

// Cached global data (sidebar latest news, etc.)
let cachedHomeData = null;

document.addEventListener("DOMContentLoaded", () => {
  initApp();
});

function initApp() {
  // Listen for browser forward/backward navigation
  window.addEventListener("popstate", () => {
    renderCurrentRoute();
  });

  // Listen for hash changes if hash routing is used
  window.addEventListener("hashchange", () => {
    renderCurrentRoute();
  });

  // Global delegated click handler for seamless SPA navigation
  document.addEventListener("click", (e) => {
    const link = e.target.closest("a");
    if (!link) return;

    const href = link.getAttribute("href");
    if (!href) return;

    // Handle external links or anchors
    if (
      href.startsWith("http://") ||
      href.startsWith("https://") ||
      href.startsWith("mailto:") ||
      href.startsWith("tel:") ||
      link.target === "_blank"
    ) {
      return;
    }

    // Intercept internal routing links (/category/*, /article/*, /, #)
    if (
      href === "/" ||
      href === "#" ||
      href.startsWith("/category/") ||
      href.startsWith("#category/") ||
      href.startsWith("/article/") ||
      href.startsWith("#article/")
    ) {
      e.preventDefault();
      navigateTo(href);
    }
  });

  // Initial render based on starting URL
  renderCurrentRoute();
}

/**
 * Client-Side Router: Updates history state and renders target view
 */
function navigateTo(url) {
  let target = url;
  if (target.startsWith("#category/")) {
    target = "/" + target.slice(1);
  } else if (target.startsWith("#article/")) {
    target = "/" + target.slice(1);
  }
  if (target === "#") target = "/";

  if (window.location.pathname !== target) {
    window.history.pushState(null, "", target);
  }
  renderCurrentRoute();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

/**
 * Route Dispatcher: inspects current path/hash and renders Home, Category, or Article view
 */
function renderCurrentRoute() {
  const path = window.location.pathname;
  const hash = window.location.hash;

  // 1. Article Route (/article/:slug or #article/:slug)
  const articleMatch = path.match(/^\/article\/([a-zA-Z0-9\u0C00-\u0C7F-_]+)/) ||
                       hash.match(/^#article\/([a-zA-Z0-9\u0C00-\u0C7F-_]+)/);

  if (articleMatch) {
    renderArticleView(articleMatch[1]);
    return;
  }

  // 2. Category Route (/category/:slug or #category/:slug)
  const categoryMatch = path.match(/^\/category\/([a-zA-Z0-9-]+)/) ||
                        hash.match(/^#category\/([a-zA-Z0-9-]+)/);

  if (categoryMatch) {
    renderCategoryView(categoryMatch[1]);
    return;
  }

  // 3. Homepage Default
  renderHomeView();
}

/**
 * Helper to fetch cached or fresh Home data from REST API
 */
async function fetchHomeData(forceFresh = false) {
  if (cachedHomeData && !forceFresh) {
    return cachedHomeData;
  }
  try {
    cachedHomeData = await window.api.getHome();
    return cachedHomeData;
  } catch (err) {
    console.error("Failed to load home data:", err);
    throw err;
  }
}

/**
 * Render Homepage (3-column layout driven entirely by PostgreSQL REST API)
 */
async function renderHomeView() {
  const appRoot = document.getElementById("app");
  if (!appRoot) return;

  document.title = `${portalData.siteConfig.siteName} - తాజా వార్తలు | Right Way News`;

  // Render shell immediately with loading indicator for main feed
  appRoot.innerHTML = `
    <!-- Trending Bar (Row 1) -->
    ${Components.TrendingBar({
      label: portalData.siteConfig.trendingLabel,
      tickerItems: portalData.siteConfig.trendingTopics
    })}

    <!-- Main Header (Row 2: Logo, Center Banner Ad, Utilities) -->
    ${Components.Header({
      logoImage: portalData.siteConfig.logoImage,
      siteName: portalData.siteConfig.siteName,
      portalTitle: portalData.siteConfig.portalTitle,
      currentDate: portalData.siteConfig.currentDate,
      adData: portalData.advertisements.headerBanner,
      utilities: portalData.utilities,
      epaperText: portalData.siteConfig.epaperText,
      epaperUrl: portalData.siteConfig.epaperUrl
    })}

    <!-- Main Navigation Bar (Row 3) - Home active -->
    ${Components.NavigationBar(portalData.navigation, "home")}

    <!-- Main Content Area: 3-Column News Layout -->
    <main class="main-content" role="main">
      <div class="container news-grid" id="homeNewsGrid">
        <div style="grid-column: 1 / -1; padding: 40px; text-align: center; color: var(--text-muted);">
          తాజా సమాచారం లోడ్ అవుతోంది...
        </div>
      </div>
    </main>

    <!-- Traditional Newspaper Portal Footer -->
    ${Components.Footer()}

    <!-- Interactive Search Modal -->
    ${Components.SearchModal()}
  `;

  initSearchModal();

  try {
    const homeData = await fetchHomeData();
    const gridContainer = document.getElementById("homeNewsGrid");
    if (!gridContainer) return;

    gridContainer.innerHTML = `
      <!-- Left Column: Featured News Carousel + Lower Ad -->
      ${Components.FeaturedNews({
        slides: homeData.featured,
        lowerAd: portalData.advertisements.mainLowerBanner
      })}

      <!-- Center Column: Latest News (తాజా వార్తలు) -->
      ${Components.LatestNews(homeData.latest)}

      <!-- Right Column: Sidebar Ads & Region Tabs -->
      ${Components.Sidebar({
        topAd: portalData.advertisements.sidebarTopBanner,
        regions: homeData.regions,
        verticalAd: portalData.advertisements.sidebarSkyscraper
      })}
    `;

    // Initialize interactive widgets for homepage
    initCarousel(homeData.featured);
    initRegionTabs(homeData.regions);
  } catch (err) {
    const gridContainer = document.getElementById("homeNewsGrid");
    if (gridContainer) {
      gridContainer.innerHTML = `
        <div style="grid-column: 1 / -1; padding: 40px; text-align: center; color: var(--accent-red);">
          వార్తలు లోడ్ చేయడంలో లోపం సంభవించింది. దయచేసి కాసేపటి తర్వాత మళ్లీ ప్రయత్నించండి.
        </div>
      `;
    }
  }
}

/**
 * Render Reusable Category Webpage (with real PostgreSQL API pagination)
 */
async function renderCategoryView(categoryId) {
  const appRoot = document.getElementById("app");
  if (!appRoot) return;

  const normId = categoryId === "andhra" ? "andhra-pradesh" : categoryId;
  categoryPaginationState = {
    currentCategory: normId,
    page: 1,
    limit: 10,
    hasMore: false,
    isLoading: false
  };

  // Immediate layout shell
  appRoot.innerHTML = `
    <!-- Trending Bar (Row 1) -->
    ${Components.TrendingBar({
      label: portalData.siteConfig.trendingLabel,
      tickerItems: portalData.siteConfig.trendingTopics
    })}

    <!-- Main Header (Row 2) -->
    ${Components.Header({
      logoImage: portalData.siteConfig.logoImage,
      siteName: portalData.siteConfig.siteName,
      portalTitle: portalData.siteConfig.portalTitle,
      currentDate: portalData.siteConfig.currentDate,
      adData: portalData.advertisements.headerBanner,
      utilities: portalData.utilities,
      epaperText: portalData.siteConfig.epaperText,
      epaperUrl: portalData.siteConfig.epaperUrl
    })}

    <!-- Main Navigation Bar (Row 3) - Selected Category active -->
    ${Components.NavigationBar(portalData.navigation, normId)}

    <!-- Category Container -->
    <div id="categoryContainer">
      <div style="padding: 60px; text-align: center; color: var(--text-muted);">
        విభాగం వార్తలు లోడ్ అవుతున్నాయి...
      </div>
    </div>

    <!-- Traditional Newspaper Portal Footer -->
    ${Components.Footer()}

    <!-- Interactive Search Modal -->
    ${Components.SearchModal()}
  `;

  initSearchModal();

  try {
    const [articlesRes, homeData] = await Promise.all([
      window.api.getArticles({ category: normId, page: 1, limit: categoryPaginationState.limit }),
      fetchHomeData()
    ]);

    const targetCategory = articlesRes.category || {
      id: normId,
      slug: normId,
      title: normId.toUpperCase(),
      breadcrumb: normId.toUpperCase()
    };

    document.title = `${targetCategory.name || targetCategory.title} - ${portalData.siteConfig.siteName} | Right Way News`;

    categoryPaginationState.hasMore = articlesRes.pagination.hasMore;

    const catContainer = document.getElementById("categoryContainer");
    if (!catContainer) return;

    catContainer.innerHTML = Components.CategoryPage({
      category: targetCategory,
      articles: articlesRes.articles,
      sidebarAd: portalData.advertisements.sidebarSkyscraper,
      latestNews: homeData.latest
    });

    initCategoryLoadMore();
  } catch (err) {
    const catContainer = document.getElementById("categoryContainer");
    if (catContainer) {
      catContainer.innerHTML = `
        <div style="padding: 60px; text-align: center; color: var(--accent-red);">
          విభాగం కథనాలు లోడ్ చేయడంలో సమస్య ఏర్పడింది. దయచేసి మళ్లీ ప్రయత్నించండి.
        </div>
      `;
    }
  }
}

/**
 * Real API-Driven Category Load More Handler (Infinite/Page Pagination)
 */
function initCategoryLoadMore() {
  const btn = document.getElementById("btnLoadMoreCategory");
  const listContainer = document.querySelector(".category-news-list");
  if (!btn || !listContainer) return;

  if (!categoryPaginationState.hasMore) {
    btn.style.display = "none";
    return;
  }

  btn.addEventListener("click", async () => {
    if (categoryPaginationState.isLoading || !categoryPaginationState.hasMore) return;

    categoryPaginationState.isLoading = true;
    const originalText = btn.textContent;
    btn.textContent = "మరిన్ని కథనాలు లోడ్ అవుతున్నాయి...";
    btn.disabled = true;

    try {
      const nextPage = categoryPaginationState.page + 1;
      const res = await window.api.getArticles({
        category: categoryPaginationState.currentCategory,
        page: nextPage,
        limit: categoryPaginationState.limit
      });

      categoryPaginationState.page = nextPage;
      categoryPaginationState.hasMore = res.pagination.hasMore;

      // Append new articles dynamically to the existing list
      if (res.articles && res.articles.length > 0) {
        const newCardsHtml = res.articles.map(article => `
          <article class="category-news-card" data-article-id="${article.id}">
            <a href="${article.url}" class="category-card-thumb-link">
              <img src="${article.image}" alt="${article.title}" class="category-card-thumb" loading="lazy" />
            </a>
            <div class="category-card-content">
              <h2 class="category-card-title">
                <a href="${article.url}">${article.title}</a>
              </h2>
              <p class="category-card-desc">${article.description || ''}</p>
              <div class="category-card-meta">
                <span class="category-card-time">${article.time || 'తాజా వార్త'}</span>
              </div>
            </div>
          </article>
        `).join("");

        listContainer.insertAdjacentHTML("beforeend", newCardsHtml);
      }

      if (!categoryPaginationState.hasMore) {
        btn.textContent = "అన్ని తాజా కథనాలు చూపించబడ్డాయి";
        btn.style.opacity = "0.7";
        btn.disabled = true;
      } else {
        btn.textContent = originalText;
        btn.disabled = false;
      }
    } catch (err) {
      console.error("Failed to load more articles:", err);
      btn.textContent = "తిరిగి ప్రయత్నించండి";
      btn.disabled = false;
    } finally {
      categoryPaginationState.isLoading = false;
    }
  });
}

/**
 * Render Single Article View (/article/:slug)
 */
async function renderArticleView(slug) {
  const appRoot = document.getElementById("app");
  if (!appRoot) return;

  appRoot.innerHTML = `
    <!-- Trending Bar (Row 1) -->
    ${Components.TrendingBar({
      label: portalData.siteConfig.trendingLabel,
      tickerItems: portalData.siteConfig.trendingTopics
    })}

    <!-- Main Header (Row 2) -->
    ${Components.Header({
      logoImage: portalData.siteConfig.logoImage,
      siteName: portalData.siteConfig.siteName,
      portalTitle: portalData.siteConfig.portalTitle,
      currentDate: portalData.siteConfig.currentDate,
      adData: portalData.advertisements.headerBanner,
      utilities: portalData.utilities,
      epaperText: portalData.siteConfig.epaperText,
      epaperUrl: portalData.siteConfig.epaperUrl
    })}

    <!-- Main Navigation Bar (Row 3) -->
    ${Components.NavigationBar(portalData.navigation, "home")}

    <!-- Article Content Slot -->
    <div id="articleContainer">
      <div style="padding: 60px; text-align: center; color: var(--text-muted);">
        కథనం లోడ్ అవుతోంది...
      </div>
    </div>

    <!-- Traditional Newspaper Portal Footer -->
    ${Components.Footer()}

    <!-- Interactive Search Modal -->
    ${Components.SearchModal()}
  `;

  initSearchModal();

  try {
    const [article, homeData] = await Promise.all([
      window.api.getArticle(slug),
      fetchHomeData()
    ]);

    document.title = `${article.title} - ${portalData.siteConfig.siteName} | Right Way News`;

    const container = document.getElementById("articleContainer");
    if (!container) return;

    container.innerHTML = Components.ArticlePage({
      article: article,
      sidebarAd: portalData.advertisements.sidebarSkyscraper,
      latestNews: homeData.latest
    });
  } catch (err) {
    const container = document.getElementById("articleContainer");
    if (container) {
      container.innerHTML = `
        <div style="padding: 80px 20px; text-align: center;">
          <h2 style="color: var(--accent-red); margin-bottom: 12px; font-family: var(--font-telugu);">కథనం లభించలేదు</h2>
          <p style="color: var(--text-muted); margin-bottom: 20px;">మీరు వెతుకుతున్న కథనం తొలగించబడి ఉండవచ్చు లేదా చిరునామా మారి ఉండవచ్చు.</p>
          <a href="/" class="article-back-btn">← ముఖ్యాంశాలకు వెళ్లండి</a>
        </div>
      `;
    }
  }
}

/**
 * Functional News Carousel Controller
 */
function initCarousel(slidesData = []) {
  const carousel = document.getElementById("featuredCarousel");
  if (!carousel || !slidesData || slidesData.length === 0) return;

  const slides = carousel.querySelectorAll(".carousel-slide");
  const dots = carousel.querySelectorAll(".pagination-dot");
  const counter = document.getElementById("carouselCounter");
  const headline = document.getElementById("carouselHeadline");
  const prevBtn = document.getElementById("carouselPrevBtn");
  const nextBtn = document.getElementById("carouselNextBtn");

  const totalSlides = slides.length;
  if (totalSlides === 0) return;

  let currentIndex = 0;
  let autoplayTimer = null;

  function updateSlide(index) {
    if (index < 0) index = totalSlides - 1;
    if (index >= totalSlides) index = 0;
    currentIndex = index;

    slides.forEach((slide, i) => {
      slide.classList.toggle("active", i === currentIndex);
    });

    dots.forEach((dot, i) => {
      dot.classList.toggle("active", i === currentIndex);
    });

    if (counter) {
      counter.textContent = `${currentIndex + 1}/${totalSlides}`;
    }

    if (headline && slidesData[currentIndex]) {
      headline.textContent = slidesData[currentIndex].headline;
    }
  }

  function startAutoplay() {
    stopAutoplay();
    if (totalSlides <= 1) return;
    autoplayTimer = setInterval(() => {
      updateSlide(currentIndex + 1);
    }, 4500);
  }

  function stopAutoplay() {
    if (autoplayTimer) {
      clearInterval(autoplayTimer);
      autoplayTimer = null;
    }
  }

  // Click on slide image to open article
  slides.forEach((slide, i) => {
    slide.style.cursor = "pointer";
    slide.addEventListener("click", () => {
      if (slidesData[i] && slidesData[i].url) {
        navigateTo(slidesData[i].url);
      }
    });
  });

  if (prevBtn) {
    prevBtn.addEventListener("click", () => {
      updateSlide(currentIndex - 1);
      startAutoplay();
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener("click", () => {
      updateSlide(currentIndex + 1);
      startAutoplay();
    });
  }

  dots.forEach((dot, i) => {
    dot.addEventListener("click", () => {
      updateSlide(i);
      startAutoplay();
    });
  });

  carousel.addEventListener("mouseenter", stopAutoplay);
  carousel.addEventListener("mouseleave", startAutoplay);

  updateSlide(currentIndex);
  startAutoplay();
}

/**
 * Region Tabs Switcher Controller
 */
function initRegionTabs(regionsData) {
  const tabsRow = document.getElementById("regionTabsRow");
  const contentPanel = document.getElementById("regionContentPanel");
  if (!tabsRow || !regionsData) return;

  const tabButtons = tabsRow.querySelectorAll("[data-region-tab]");

  function setRegion(regionId) {
    tabButtons.forEach(btn => {
      btn.classList.toggle("active", btn.getAttribute("data-region-tab") === regionId);
    });

    if (contentPanel && regionsData.newsData) {
      const items = regionsData.newsData[regionId] || [];
      if (items.length > 0) {
        contentPanel.innerHTML = items.map(item => {
          const title = typeof item === "string" ? item : item.title;
          const url = typeof item === "string" ? "#" : item.url;
          return `
            <div class="region-news-item">
              <a href="${url}" style="color: inherit; text-decoration: none; display: flex; align-items: baseline; gap: 6px;">
                <span style="color: var(--primary-blue); font-size: 8px;">▶</span>
                <span>${title}</span>
              </a>
            </div>
          `;
        }).join("");
      } else {
        contentPanel.innerHTML = `
          <div class="region-news-empty" style="padding: 20px 10px; text-align: center; color: var(--text-muted, #64748b); font-size: 13px;">
            ఈ ప్రాంతానికి సంబంధించిన వార్తలు ప్రస్తుతానికి లేవు.
          </div>
        `;
      }
      contentPanel.classList.add("active");
    }
  }

  tabButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const regionId = btn.getAttribute("data-region-tab");
      setRegion(regionId);
    });
  });

  setRegion(regionsData.activeRegion || "andhra");
}

/**
 * Interactive Search Modal Controller
 */
function initSearchModal() {
  const searchToggleBtn = document.getElementById("searchToggleBtn");
  const searchModal = document.getElementById("searchModal");
  const searchModalClose = document.getElementById("searchModalClose");
  const searchInput = document.getElementById("searchInput");
  const searchForm = document.getElementById("searchForm");

  if (!searchToggleBtn || !searchModal) return;

  function openSearch() {
    searchModal.classList.add("open");
    setTimeout(() => {
      if (searchInput) searchInput.focus();
    }, 100);
  }

  function closeSearch() {
    searchModal.classList.remove("open");
  }

  searchToggleBtn.addEventListener("click", openSearch);

  if (searchModalClose) {
    searchModalClose.addEventListener("click", closeSearch);
  }

  searchModal.addEventListener("click", (e) => {
    if (e.target === searchModal) {
      closeSearch();
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && searchModal.classList.contains("open")) {
      closeSearch();
    }
  });

  if (searchForm) {
    searchForm.onsubmit = async (e) => {
      e.preventDefault();
      const query = (searchInput.value || "").trim();
      if (!query) return;
      closeSearch();
      // Navigate to latest with search filter or show search results
      alert(`శోధన ఫలితాలు: "${query}" కోసం వెతుకుతోంది...`);
    };
  }
}
