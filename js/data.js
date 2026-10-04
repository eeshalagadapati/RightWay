/**
 * Telugu News Portal - Static Non-Database Site Configuration
 * Note: All editorial articles, categories, featured carousels, and regional feeds
 * are stored in PostgreSQL and delivered via the REST API (/api/home, /api/articles).
 */

const portalData = {
  // Site identity & header info
  siteConfig: {
    siteName: "రైట్ వే న్యూస్",
    siteSuffix: "",
    portalTitle: "రైట్ వే న్యూస్ - తాజా వార్తలు మరియు బ్రేకింగ్ న్యూస్",
    logoImage: "assets/logo_right_way.png",
    currentDate: "శనివారం, సెప్టెంబర్ 26, 2026",
    trendingLabel: "TRENDING",
    trendingTopics: [
      "ఆసియా క్రీడలు 2026",
      "గణేశ్ నిమజ్జనాలు",
      "భారత్ ఇంధన ఒప్పందం",
      "అమెరికా నిఘా నివేదిక",
      "జర్నలిజం స్కూల్"
    ],
    epaperText: "E-PAPER",
    epaperUrl: "#epaper"
  },

  // Main navigation menu structure
  navigation: [
    { id: "home", label: "హోమ్", icon: "home", url: "/", isHome: true },
    { id: "latest", label: "తాజా వార్తలు", url: "/category/latest" },
    { id: "andhra-pradesh", label: "ఆంధ్రప్రదేశ్", url: "/category/andhra-pradesh" },
    { id: "telangana", label: "తెలంగాణ", url: "/category/telangana" },
    { id: "national", label: "జాతీయం", url: "/category/national" },
    { id: "international", label: "అంతర్జాతీయం", url: "/category/international" },
    { id: "business", label: "బిజినెస్", url: "/category/business" },
    { id: "sports", label: "క్రీడలు", url: "/category/sports" },
    { id: "cinema", label: "సినిమా", url: "/category/cinema" }
  ],

  // Utility box buttons
  utilities: [
    {
      id: "latest-box",
      label: "Latest",
      icon: "newspaper",
      url: "/category/latest"
    },
    {
      id: "breaking-box",
      label: "Breaking",
      icon: "bell",
      url: "#breaking-news"
    }
  ],

  // Advertisements configuration
  advertisements: {
    headerBanner: {
      id: "ad-header-banner",
      image: "assets/top_logo_banner.png",
      alt: "రైట్ వే - నిజం నిర్భయంగా",
      url: "#ad",
      width: 1024,
      height: 104
    },
    mainLowerBanner: {
      id: "ad-main-lower",
      image: "assets/ad_journalism.png",
      alt: "AD",
      url: "#ad",
      width: 490,
      height: 30
    },
    sidebarTopBanner: {
      id: "ad-sidebar-top",
      image: "assets/ad_horoscope.png",
      alt: "AD",
      url: "#ad",
      width: 250,
      height: 67
    },
    sidebarSkyscraper: {
      id: "ad-sidebar-skyscraper",
      image: "assets/ad_neopolis_pristine.png",
      alt: "AD",
      url: "#ad",
      width: 250,
      height: 224
    }
  }
};

// Export for module systems or window global
if (typeof module !== "undefined" && module.exports) {
  module.exports = portalData;
}
