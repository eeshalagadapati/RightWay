# Telugu News Portal (Eenadu.net Style) - Layout Specification

Based on visual analysis and exact pixel sampling of the reference screenshot (`1024 x 468` source image):

## 1. Grid & Global Layout
- **Page Background**: `#FFFFFF`
- **Container Max-Width**: Desktop default `1024px` matching reference (scales responsively up to `1720px` max-width with proportional layout).
- **Margins**: Centered with `auto` left/right margins. Inner container padding `0 24px`.
- **Three-Column Proportions**:
  - Left / Main Column: `~51.8%` (`506px` in `976px` grid)
  - Center / Latest News Column: `~21.0%` (`205px` in `976px` grid)
  - Right / Sidebar Ad Column: `~25.6%` (`250px` in `976px` grid)
  - Column Gaps: `14px - 15px`
- **Layout Style**: Dense, information-heavy traditional Indian newspaper portal (no SaaS cards, no modern glassmorphism).

---

## 2. Color Palette & Design Tokens
```css
:root {
  --primary-blue: #02599C;
  --dark-blue: #01385F;
  --nav-gradient-start: #025595;
  --nav-gradient-end: #01385F;
  --nav-hover: #0b6eb8;
  --light-blue: #A2DDFF;
  --ice-blue: #EEF6FF;
  --accent-red: #E01E1E;
  --accent-red-hover: #C51616;
  --accent-yellow: #F8D15C;
  --text-primary: #111111;
  --text-secondary: #444444;
  --text-muted: #777777;
  --border-color: #D8D8D8;
  --border-light: #EEEEEE;
  --bg-white: #FFFFFF;
}
```

---

## 3. Typography
- **Headlines & Front-Facing UI**: `'Ramabhadra', sans-serif` (`--font-telugu-headline`)
- **Article Body & Reading Matter**: `'Mallanna', sans-serif` (`--font-telugu-body`)
- **Font Sizing (Updated with +20% scale)**:
  - Navigation Text: `16px`, white.
  - Trending Text: `13px`, bold, uppercase, yellow (`#F8D15C`).
  - Latest News Headlines: `15px`, compact (`line-height: 1.45`).
  - Carousel Headline: `18px`.
  - Category Heading: `29px`.
  - Category Article Cards: Title `20px`, Description `18px`, Meta `15.5px`.
  - Article Detail: Title `31px`, Meta `17px`, Paragraph Body `22px` (`line-height: 1.9`).

---

## 4. Header Hierarchy & Component Breakdown

### Row 1: Trending Bar
- **Dimensions**: Full width, height `24px - 28px`.
- **Background**: `#02599C`.
- **Left**: Yellow bold uppercase text `TRENDING` (`font-size: 11px`, `letter-spacing: 0.5px`).
- **Right**: Search button icon inside light-blue rounded box (`#A2DDFF`, `20px x 20px`, `border-radius: 3px`).

### Row 2: Branding & Advertisements
- **Dimensions**: Height `~78px - 82px`, padding `8px 0`.
- **Logo Section (Left, ~235px)**:
  - Eenadu.net 3D Telugu logo (`ఈనాడు .నెట్`).
  - Telugu Date underneath: `శనివారం, సెప్టెంబర్ 26, 2026` (`font-size: 11px`, bold, `#222222`).
- **Header Advertisement Banner (Center, ~580px)**:
  - Navanaami ad banner (`assets/ad_navanaami.png`), `580px x 73px`, subtle border `#e0e0e0`.
- **Utility Section (Far Right, ~145px)**:
  - Top: Two utility boxes side-by-side (`Latest` with newspaper icon, `Breaking` with bell icon), `border: 1px solid #d8d8d8`, `border-radius: 4px`.
  - Bottom: `E-PAPER` pill button, black bold uppercase font, `border: 1px solid #333`, `height: 22px`.

### Row 3: Main Navigation Bar
- **Dimensions**: Full container width (`976px`), height `32px`.
- **Background**: Linear gradient `from #025595 to #01385F`.
- **Border Radius**: `4px` outer corners.
- **Items Separator**: `1px solid rgba(255, 255, 255, 0.2)`.
- **Navigation Items**:
  1. Home Icon (Yellow house)
  2. తాజా వార్తలు
  3. ఆంధ్రప్రదేశ్
  4. తెలంగాణ
  5. జాతీయం
  6. అంతర్జాతీయం
  7. బిజినెస్
  8. క్రీడలు
  9. సినిమా
  10. ఫీచర్ పేజీలు ▼
  11. వసుంధర
  12. ఇంకా.. ▼

---

## 5. Main Content Area (Three Columns)

### Left Column (~52%, 506px): Featured News & Ad
1. **NewsCarousel**:
   - Aspect ratio: `506px x 226px` landscape container.
   - Current slide image with overlaid Telugu title badge ("కబడ్డీలో పసిడి కూత..").
   - Top-right circular counter: `2/10` (white background, red text, black border).
   - Centered navigation arrows: translucent dark pill with `<` and `>`.
   - Headline below image: `ఇరాన్‌పై గెలిచి.. ఆసియా క్రీడల్లో భారత్‌కు మరో గోల్డ్` (Centered, `15px`, bold).
   - Pagination dots: 10 dots. Active dot is a red capsule (`20px x 5px`, `#E01E1E`); inactive dots are gray circles (`6px x 6px`, `#D8D8D8`).
   - Interactive: Previous/Next buttons, dot selection, auto-play with pause on hover.
2. **Lower Horizontal Ad**:
   - Positioned below carousel pagination.
   - Spanning left column width (`~506px`), height `30px`.
   - Eenadu Journalism School ad banner.

### Center Column (~21%, 205px): Latest News (తాజా వార్తలు)
1. **Header**:
   - Title: `తాజా వార్తలు` in red (`#E01E1E`, `font-size: 16px`, `font-weight: 800`).
   - Symmetrical gradient blue lines on left and right sides.
2. **News Items Container**:
   - Border: `1px solid #EEEEEE`, background `#FFFFFF`.
   - Dense list with thin horizontal dividers (`1px solid #EEEEEE`).
   - Leading black square bullet `■`.
   - Compact bold Telugu typography (`12.5px`, `font-weight: 700`).
   - Small red circular video play badge for multimedia articles.
   - Red `⦿ లైవ్ అప్‌డేట్స్:` badge for breaking live coverage.

### Right Column (~26%, 250px): Sidebar Ads & Region Tabs
1. **Top Sidebar Ad**:
   - Horoscope banner (`assets/ad_horoscope.png`), `250px x 67px`.
2. **Region Tabs**:
   - 3 buttons:
     - `జిల్లాలు` (Districts): Transparent / subtle border, blue text (`#02599C`).
     - `ఆంధ్రప్రదేశ్` (Andhra Pradesh): Active tab, solid red button (`#E01E1E`), white text, rounded corners.
     - `తెలంగాణ` (Telangana): Solid blue button (`#02599C`), white text, rounded corners.
   - Interactive: Clicking switches active tab state and displays region-specific headlines.
3. **Vertical Skyscraper Ad**:
   - MSN One Neopolis 55-storey luxury residences ad (`assets/ad_neopolis_pristine.png`), `250px x ~202px - 280px`.

---

## 6. Architecture & Data Decoupling
All dynamic and editorial content is cleanly separated into `data.js`:
- `siteConfig`: Logo, portal title, Telugu date, trending query.
- `navigationItems`: Array of navigation items with paths and dropdown children.
- `featuredNews`: Array of 10 slider objects (image, title, headline, category, badgeText).
- `latestNews`: Array of latest news objects (id, title, type, hasVideo, time).
- `regionNews`: Object mapping regions (`andhra`, `telangana`, `districts`) to lists.
- `advertisements`: Image URLs, alt text, dimensions, and target links.
