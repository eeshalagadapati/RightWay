/**
 * Reusable Component Architecture for Telugu News Portal
 */

const Components = {
  /**
   * Reusable AdBanner Component
   * Supports standard ad configurations, dimensions, and fallbacks
   */
  AdBanner({ id, image, alt, url = "#", width, height, customClass = "" }) {
    const styleAttr = width && height ? `style="max-width: ${width}px; aspect-ratio: ${width}/${height};"` : "";
    return `
      <div class="ad-banner-component ${customClass}" id="${id || ''}" data-ad-slot="${id || 'generic'}">
        <a href="${url}" class="ad-banner-link" target="_blank" rel="noopener noreferrer" ${styleAttr}>
          <img src="${image}" alt="${alt || 'Advertisement'}" class="ad-banner-img" loading="lazy" />
        </a>
      </div>
    `;
  },

  /**
   * Row 1: Trending Bar Component
   */
  TrendingBar({ label = "TRENDING", tickerItems = [] }) {
    const tickerText = tickerItems.join(" • ");
    return `
      <header class="trending-bar" role="region" aria-label="Trending Topics">
        <div class="container trending-bar__inner">
          <div class="trending-bar__left">
            <span class="trending-bar__label">${label}</span>
          </div>
          <div class="trending-bar__right">
            <button class="search-toggle-btn" id="searchToggleBtn" aria-label="వార్తలను వెతకండి" title="వెతకండి">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            </button>
          </div>
        </div>
      </header>
    `;
  },

  /**
   * Row 2: Header Component (Logo, Center Ad, Utility Buttons)
   */
  Header({ logoImage, siteName, portalTitle, currentDate, adData, utilities, epaperText, epaperUrl }) {
    return `
      <div class="main-header">
        <div class="container main-header__inner">
          <!-- Logo & Telugu Date -->
          <div class="logo-section">
            <a href="/" class="logo-section__link" title="${portalTitle}">
              <img src="${logoImage}" alt="${siteName}" class="logo-section__img" />
            </a>
            <div class="logo-section__date">${currentDate}</div>
          </div>

          <!-- Center Advertisement Banner -->
          <div class="header-ad">
            ${Components.AdBanner({
              id: adData.id,
              image: adData.image,
              alt: adData.alt,
              url: adData.url,
              width: adData.width,
              height: adData.height,
              customClass: "header-ad__banner"
            })}
          </div>

          <!-- Utility Buttons: Latest, Breaking & E-Paper -->
          <div class="header-utilities">
            <div class="utility-buttons-row">
              <a href="/category/latest" class="utility-btn" id="btn-latest-utility">
                <svg class="utility-btn__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"></path>
                  <path d="M18 14h-8"></path>
                  <path d="M15 18h-5"></path>
                  <path d="M10 6h8v4h-8V6Z"></path>
                </svg>
                <span>Latest</span>
              </a>
              <a href="#breaking" class="utility-btn" id="btn-breaking-utility">
                <svg class="utility-btn__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"></path>
                  <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"></path>
                  <path d="M4 2C2.8 3.7 2 5.7 2 8"></path>
                  <path d="M22 8c0-2.3-.8-4.3-2-6"></path>
                </svg>
                <span>Breaking</span>
              </a>
            </div>
            <a href="${epaperUrl}" class="epaper-btn" target="_blank" rel="noopener noreferrer">
              ${epaperText}
            </a>
          </div>
        </div>
      </div>
    `;
  },

  /**
   * Row 3: Navigation Bar Component
   */
  NavigationBar(items, activeId = "home") {
    const navItemsHtml = items.map((item) => {
      const isHome = item.isHome;
      const hasDropdown = item.hasDropdown;
      const isActive = item.id === activeId || (isHome && (activeId === "home" || !activeId));
      const activeClass = isActive ? "active" : "";

      let content = "";
      if (isHome) {
        content = `
          <svg class="nav-home-icon" viewBox="0 0 24 24">
            <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"></path>
          </svg>
        `;
      } else {
        content = `<span>${item.label}</span>`;
        if (hasDropdown) {
          content += `<span class="nav-arrow">▼</span>`;
        }
      }

      let dropdownHtml = "";
      if (hasDropdown && item.children) {
        dropdownHtml = `
          <div class="nav-dropdown">
            ${item.children.map(child => `
              <a href="${child.url}" class="dropdown-link">${child.label}</a>
            `).join("")}
          </div>
        `;
      }

      return `
        <li class="nav-item ${activeClass} ${hasDropdown ? 'nav-item--dropdown' : ''}" data-nav-id="${item.id}">
          <a href="${item.url}" class="nav-link ${isHome ? 'nav-link--home' : ''}">
            ${content}
          </a>
          ${dropdownHtml}
        </li>
      `;
    }).join("");

    return `
      <nav class="main-nav" role="navigation" aria-label="Main Navigation">
        <div class="container">
          <div class="main-nav__bar">
            <ul class="nav-list">
              ${navItemsHtml}
            </ul>
          </div>
        </div>
      </nav>
    `;
  },

  /**
   * Left Column: Featured News Carousel Component & Lower Ad
   */
  FeaturedNews({ slides = [], lowerAd }) {
    if (!slides || slides.length === 0) {
      return `
        <section class="column-left" aria-label="Featured News">
          <div class="news-carousel news-carousel--empty" id="featuredCarousel" style="min-height: 240px; display: flex; align-items: center; justify-content: center; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px; margin-bottom: 12px;">
            <div style="text-align: center; color: var(--text-muted, #64748b); padding: 30px 20px;">
              <p style="font-family: var(--font-telugu); font-size: 15px; margin: 0;">ప్రస్తుతం ప్రత్యేక కథనాలు అందుబాటులో లేవు.</p>
            </div>
          </div>

          <!-- Lower Horizontal Ad Banner -->
          <div class="horizontal-banner-ad">
            ${Components.AdBanner({
              id: lowerAd.id,
              image: lowerAd.image,
              alt: lowerAd.alt,
              url: lowerAd.url,
              width: lowerAd.width,
              height: lowerAd.height,
              customClass: "journalism-school-ad"
            })}
          </div>
        </section>
      `;
    }

    const slidesHtml = slides.map((slide, index) => {
      return `
        <div class="carousel-slide ${index === 0 ? 'active' : ''}" data-index="${index}">
          <img src="${slide.image}" alt="${slide.headline}" class="carousel-slide__img" />
          ${slide.badgeText ? `
            <div class="slide-overlay-badge">
              <span class="badge-text-3d">${slide.badgeText}</span>
            </div>
          ` : ''}
        </div>
      `;
    }).join("");

    const dotsHtml = slides.map((_, index) => {
      return `
        <button class="pagination-dot ${index === 0 ? 'active' : ''}" data-slide-to="${index}" aria-label="Slide ${index + 1}"></button>
      `;
    }).join("");

    const initialHeadline = slides[0] ? slides[0].headline : '';

    return `
      <section class="column-left" aria-label="Featured News">
        <!-- Interactive Carousel -->
        <div class="news-carousel" id="featuredCarousel" aria-roledescription="carousel">
          <div class="carousel-viewport">
            ${slidesHtml}
            
            <!-- Slide Counter -->
            <div class="carousel-counter" id="carouselCounter" aria-live="polite">1/${slides.length}</div>
            
            <!-- Prev / Next Navigation Arrows -->
            <button class="carousel-nav-btn carousel-nav-btn--prev" id="carouselPrevBtn" aria-label="Previous Slide">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <polyline points="15 18 9 12 15 6"></polyline>
              </svg>
            </button>
            <button class="carousel-nav-btn carousel-nav-btn--next" id="carouselNextBtn" aria-label="Next Slide">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </button>
          </div>

          <!-- Centered Bold Headline -->
          <div class="carousel-headline-wrap">
            <h2 class="carousel-headline" id="carouselHeadline">${initialHeadline}</h2>
          </div>

          <!-- Pagination Dots -->
          <div class="carousel-pagination" id="carouselPagination" role="tablist">
            ${dotsHtml}
          </div>
        </div>

        <!-- Lower Horizontal Ad Banner -->
        <div class="horizontal-banner-ad">
          ${Components.AdBanner({
            id: lowerAd.id,
            image: lowerAd.image,
            alt: lowerAd.alt,
            url: lowerAd.url,
            width: lowerAd.width,
            height: lowerAd.height,
            customClass: "journalism-school-ad"
          })}
        </div>
      </section>
    `;
  },

  /**
   * Center Column: Latest News Component (తాజా వార్తలు)
   */
  LatestNews(items = []) {
    const itemsHtml = items && items.length > 0 ? items.map(item => {
      return `
        <li class="latest-news-item">
          <a href="${item.url}" class="latest-news-item__link">
            <span class="bullet-square">■</span>
            <span class="news-text-content">
              ${item.isLive ? `<span class="live-badge-text">${item.livePrefix || '⦿ లైవ్:'}</span> ` : ''}${item.title}
            </span>
            ${item.hasVideo ? `
              <span class="video-play-badge" title="వీడియో ఉంది">
                <svg viewBox="0 0 24 24">
                  <polygon points="5 3 19 12 5 21 5 3"></polygon>
                </svg>
              </span>
            ` : ''}
          </a>
        </li>
      `;
    }).join("") : `
      <li class="latest-news-empty" style="padding: 30px 15px; text-align: center; color: var(--text-muted, #64748b); font-size: 14px; list-style: none;">
        ప్రస్తుతం తాజా వార్తలు లేవు.
      </li>
    `;

    return `
      <section class="column-center" aria-label="తాజా వార్తలు">
        <div class="latest-news-header">
          <div class="header-decor-line"></div>
          <h2 class="latest-news-title">తాజా వార్తలు</h2>
          <div class="header-decor-line header-decor-line--right"></div>
        </div>
        <div class="latest-news-box">
          <ul class="latest-news-list">
            ${itemsHtml}
          </ul>
        </div>
      </section>
    `;
  },

  /**
   * Right Column: Sidebar Ads & Region Tabs
   */
  Sidebar({ topAd, regions, verticalAd }) {
    const tabsHtml = regions.tabs.map(tab => {
      let btnClass = "region-tab-btn ";
      if (tab.style === "link") {
        btnClass += "region-tab-btn--link";
      } else if (tab.style === "button-red") {
        btnClass += "region-tab-btn--red";
      } else if (tab.style === "button-blue") {
        btnClass += "region-tab-btn--blue";
      }
      const isActive = tab.id === regions.activeRegion ? "active" : "";

      return `
        <button class="${btnClass} ${isActive}" data-region-tab="${tab.id}">
          ${tab.label}
        </button>
      `;
    }).join("");

    return `
      <aside class="column-right" aria-label="Sidebar Advertisements & Regional News">
        <!-- Top Horoscope Banner Ad -->
        <div class="sidebar-ad-top">
          ${Components.AdBanner({
            id: topAd.id,
            image: topAd.image,
            alt: topAd.alt,
            url: topAd.url,
            width: topAd.width,
            height: topAd.height,
            customClass: "horoscope-ad"
          })}
        </div>

        <!-- 3 Region Tabs -->
        <div class="region-tabs-container">
          <div class="region-tabs-row" id="regionTabsRow">
            ${tabsHtml}
          </div>
          <!-- Regional Mini Feed Panel -->
          <div class="region-content-panel" id="regionContentPanel">
            <!-- Dynamically populated on tab click -->
          </div>
        </div>

        <!-- Skyscraper Vertical Ad -->
        <div class="sidebar-ad-vertical">
          ${Components.AdBanner({
            id: verticalAd.id,
            image: verticalAd.image,
            alt: verticalAd.alt,
            url: verticalAd.url,
            width: verticalAd.width,
            height: verticalAd.height,
            customClass: "neopolis-skyscraper-ad"
          })}
        </div>
      </aside>
    `;
  },

  /**
   * Search Modal Component
   */
  SearchModal() {
    return `
      <div class="search-modal" id="searchModal" role="dialog" aria-modal="true" aria-label="వార్తల శోధన">
        <div class="search-modal__box">
          <div class="search-modal__header">
            <span>వార్తలను శోధించండి</span>
            <button class="search-modal__close" id="searchModalClose" aria-label="మూసివేయి">&times;</button>
          </div>
          <div class="search-modal__body">
            <form id="searchForm" class="search-input-group" onsubmit="event.preventDefault(); alert('శోధన: ' + document.getElementById('searchInput').value);">
              <input type="text" id="searchInput" class="search-input" placeholder="కీవర్డ్ నమోదు చేయండి (ఉదా: ఆసియా క్రీడలు)..." />
              <button type="submit" class="search-submit-btn">వెతకండి</button>
            </form>
          </div>
        </div>
      </div>
    `;
  },

  /**
   * Reusable Category Webpage Component (Matching Image 1 Reference Layout)
   * Dynamically renders category title, breadcrumb, news cards list, sidebar ad and latest news
   */
  CategoryPage({ category, articles = [], sidebarAd, latestNews = [] }) {
    const articlesHtml = articles.length > 0 ? articles.map(article => `
      <article class="category-news-card" data-article-id="${article.id}">
        <a href="${article.url}" class="category-card-thumb-link">
          <img src="${article.image}" alt="${article.title}" class="category-card-thumb" loading="lazy" />
        </a>
        <div class="category-card-content">
          <h2 class="category-card-title">
            <a href="${article.url}">${article.title}</a>
          </h2>
          <p class="category-card-desc">${article.description}</p>
          <div class="category-card-meta">
            <span class="category-card-time">${article.time || 'తాజా వార్త'}</span>
          </div>
        </div>
      </article>
    `).join("") : `
      <div class="category-empty-state">
        <p>ఈ విభాగంలో ప్రస్తుతం వార్తలు అందుబాటులో లేవు.</p>
      </div>
    `;

    return `
      <main class="main-content category-main-content" role="main">
        <div class="container category-grid">
          <!-- Left Column: Category Breadcrumb, Heading, News Cards List (Image 1) -->
          <section class="category-column-main" aria-label="${category.title} వార్తలు">
            <!-- Breadcrumb matching Image 1: HOME » NATIONAL -->
            <nav class="category-breadcrumb" aria-label="Breadcrumb">
              <a href="/" class="breadcrumb-link" data-nav="home">HOME</a>
              <span class="breadcrumb-separator">»</span>
              <span class="breadcrumb-current">${category.breadcrumb || category.title.toUpperCase()}</span>
            </nav>

            <!-- Category Heading with Blue Underline Accent matching Image 1 -->
            <div class="category-heading-wrap">
              <h1 class="category-heading">${category.title}</h1>
            </div>

            <!-- List of News Cards matching Image 1 -->
            <div class="category-news-list">
              ${articlesHtml}
            </div>

            <!-- Pagination / More News -->
            <div class="category-pagination">
              <button class="category-more-btn" id="btnLoadMoreCategory">
                మరిన్ని కథనాలు చూడండి
              </button>
            </div>
          </section>

          <!-- Right Column: Sidebar (Advertisement + తాజా వార్తలు) matching Image 1 -->
          <aside class="category-column-sidebar" aria-label="Sidebar">
            <!-- Top Right: Advertisement label and banner -->
            <div class="category-sidebar-ad-section">
              <span class="sidebar-ad-label">Advertisement</span>
              ${Components.AdBanner({
                id: "category-sidebar-ad",
                image: sidebarAd ? sidebarAd.image : "assets/ad_neopolis_pristine.png",
                alt: "Advertisement",
                url: sidebarAd ? sidebarAd.url : "#ad",
                width: 250,
                height: 224,
                customClass: "category-sidebar-ad-banner"
              })}
            </div>

            <!-- Right: తాజా వార్తలు (Latest News) with "మరిన్ని చదవండి" link matching Image 1 -->
            <div class="category-sidebar-latest-box">
              <div class="category-sidebar-latest-header">
                <h3 class="category-sidebar-latest-title">తాజా వార్తలు</h3>
                <a href="/category/latest" class="category-sidebar-latest-more" data-nav="category" data-cat="latest">
                  మరిన్ని చదవండి
                </a>
              </div>
              <ul class="latest-news-list">
                ${latestNews.slice(0, 7).map(item => `
                  <li class="latest-news-item">
                    <a href="${item.url}" class="latest-news-item__link">
                      <span class="bullet-square">■</span>
                      <span class="news-text-content">
                        ${item.isLive && item.livePrefix ? `<span class="live-badge-text">${item.livePrefix}</span> ` : ''}
                        ${item.title}
                        ${item.hasVideo ? `
                          <span class="video-play-badge" title="వీడియో ఉంది">
                            <svg viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                          </span>
                        ` : ''}
                      </span>
                    </a>
                  </li>
                `).join("")}
              </ul>
            </div>
          </aside>
        </div>
      </main>
    `;
  },

  /**
   * Single Article Detail Page Component
   * Displays full article story, media, metadata, author, and sidebar
   */
  ArticlePage({ article, sidebarAd, latestNews = [] }) {
    const cat = article.category || { slug: "national", name: "జాతీయం", breadcrumb: "NATIONAL" };
    const imgUrl = article.featuredImage ? article.featuredImage.url : "assets/slide_space.jpg";
    const imgAlt = article.featuredImage ? article.featuredImage.alt : article.title;

    return `
      <main class="main-content article-main-content" role="main">
        <div class="container category-grid">
          <!-- Left Column: Article Breadcrumb, Headline, Metadata, Image, Body -->
          <article class="category-column-main article-column-main" aria-label="${article.title}">
            <!-- Breadcrumb: HOME » CATEGORY » ARTICLE -->
            <nav class="category-breadcrumb" aria-label="Breadcrumb">
              <a href="/" class="breadcrumb-link" data-nav="home">HOME</a>
              <span class="breadcrumb-separator">»</span>
              <a href="/category/${cat.slug}" class="breadcrumb-link">${cat.name || cat.breadcrumb}</a>
              <span class="breadcrumb-separator">»</span>
              <span class="breadcrumb-current">${cat.breadcrumb || 'NEWS'}</span>
            </nav>

            <!-- Article Title -->
            <div class="article-header-wrap">
              <h1 class="article-detail-title">${article.title}</h1>
              
              <!-- Metadata Row: Date, Author, Badges -->
              <div class="article-meta-bar">
                <div class="article-meta-left">
                  <span class="article-meta-author">రచన: <strong>${article.author || 'రైట్ వే న్యూస్ డెస్క్'}</strong></span>
                  <span class="meta-dot">•</span>
                  <span class="article-meta-time">${article.time || 'తాజా వార్త'}</span>
                </div>
                <div class="article-meta-right">
                  <a href="/category/${cat.slug}" class="article-cat-badge">${cat.name}</a>
                </div>
              </div>
            </div>

            <!-- Featured Image -->
            <div class="article-featured-image-box">
              <img src="${imgUrl}" alt="${imgAlt}" class="article-featured-img" />
              ${article.description ? `<p class="article-image-caption">${article.description}</p>` : ''}
            </div>

            <!-- Full Article Body -->
            <div class="article-body-content">
              ${article.contentHtml || `<p>${article.description || ''}</p>`}
            </div>

            <!-- Article Footer / Navigation back -->
            <div class="article-back-nav">
              <a href="/category/${cat.slug}" class="article-back-btn">
                ← మరిన్ని <strong>${cat.name}</strong> వార్తలు చూడండి
              </a>
            </div>
          </article>

          <!-- Right Column: Sidebar (Advertisement + తాజా వార్తలు) -->
          <aside class="category-column-sidebar" aria-label="Sidebar">
            <!-- Sidebar Ad -->
            <div class="category-sidebar-ad-section">
              <span class="sidebar-ad-label">Advertisement</span>
              ${Components.AdBanner({
                id: "article-sidebar-ad",
                image: sidebarAd ? sidebarAd.image : "assets/ad_neopolis_pristine.png",
                alt: "Advertisement",
                url: sidebarAd ? sidebarAd.url : "#ad",
                width: 250,
                height: 224,
                customClass: "category-sidebar-ad-banner"
              })}
            </div>

            <!-- తాజా వార్తలు (Latest News) -->
            <div class="category-sidebar-latest-box">
              <div class="category-sidebar-latest-header">
                <h3 class="category-sidebar-latest-title">తాజా వార్తలు</h3>
                <a href="/category/latest" class="category-sidebar-latest-more" data-nav="category" data-cat="latest">
                  మరిన్ని చదవండి
                </a>
              </div>
              <ul class="latest-news-list">
                ${latestNews.slice(0, 8).map(item => `
                  <li class="latest-news-item">
                    <a href="${item.url || `/article/${item.slug}`}" class="latest-news-item__link">
                      <span class="bullet-square">■</span>
                      <span class="news-text-content">
                        ${item.isLive && item.livePrefix ? `<span class="live-badge-text">${item.livePrefix}</span> ` : ''}
                        ${item.title}
                        ${item.hasVideo ? `
                          <span class="video-play-badge" title="వీడియో ఉంది">
                            <svg viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                          </span>
                        ` : ''}
                      </span>
                    </a>
                  </li>
                `).join("")}
              </ul>
            </div>
          </aside>
        </div>
      </main>
    `;
  },

  /**
   * Traditional Compact News Footer
   */
  Footer() {
    return `
      <footer class="site-footer">
        <div class="container">
          <div class="footer-links">
            <a href="#">మా గురించి</a>
            <a href="#">సంప్రదించండి</a>
            <a href="#">ప్రకటనలు</a>
            <a href="#">గోప్యతా విధానం</a>
            <a href="#">నిబంధనలు</a>
            <a href="#">ఫీడ్‌బ్యాక్</a>
          </div>
          <div class="footer-copyright">
            కాపీరైట్ &copy; 2026 రైట్ వే న్యూస్. సర్వ హక్కులూ ప్రత్యేకించబడినవి.
          </div>
        </div>
      </footer>
    `;
  }
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = Components;
}
