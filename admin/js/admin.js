/**
 * Right Way News - Private CMS Administrator Portal
 * Single-Page-Application for managing articles, drafts, media, categories, and featured stories.
 */

let currentUser = null;
let currentQuill = null;
let globalCategories = [];

document.addEventListener("DOMContentLoaded", () => {
  initAdminApp();
});

async function initAdminApp() {
  window.addEventListener("popstate", () => {
    handleAdminRouting();
  });

  document.addEventListener("click", (e) => {
    const link = e.target.closest("a");
    if (!link) return;
    const href = link.getAttribute("href");
    if (!href) return;

    if (href.startsWith("/admin")) {
      e.preventDefault();
      adminNavigateTo(href);
    }
  });

  // Verify authentication with backend
  await checkAuth();
  handleAdminRouting();
}

function adminNavigateTo(url) {
  if (window.location.pathname !== url) {
    window.history.pushState(null, "", url);
  }
  handleAdminRouting();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function checkAuth() {
  try {
    const res = await fetch("/api/auth/me");
    if (res.ok) {
      const data = await res.json();
      if (data.success) {
        currentUser = data.data;
        return true;
      }
    }
  } catch (err) {
    console.error("Auth check failed:", err);
  }
  currentUser = null;
  return false;
}

/**
 * Main Router for CMS
 */
async function handleAdminRouting() {
  const path = window.location.pathname;

  if (!currentUser) {
    renderLoginView();
    return;
  }

  // If logged in and visiting /admin/login, redirect to dashboard
  if (path === "/admin/login") {
    adminNavigateTo("/admin/dashboard");
    return;
  }

  // Pre-load categories if not cached
  if (!globalCategories.length) {
    try {
      const res = await fetch("/api/admin/categories");
      const d = await res.json();
      if (d.success) globalCategories = d.data;
    } catch (e) {
      console.error(e);
    }
  }

  if (path.startsWith("/admin/articles/new")) {
    renderArticleEditorView();
  } else if (path.match(/^\/admin\/articles\/(\d+)\/edit/)) {
    const id = path.match(/^\/admin\/articles\/(\d+)\/edit/)[1];
    renderArticleEditorView(id);
  } else if (path.startsWith("/admin/articles")) {
    renderArticlesListView();
  } else if (path.startsWith("/admin/media")) {
    renderMediaView();
  } else if (path.startsWith("/admin/featured")) {
    renderFeaturedView();
  } else if (path.startsWith("/admin/categories")) {
    renderCategoriesView();
  } else {
    // /admin or /admin/dashboard
    renderDashboardView();
  }
}

/**
 * Shell layout with Sidebar and Topbar
 */
function renderShell(contentHtml, activeNav = "dashboard", title = "Dashboard") {
  const app = document.getElementById("adminApp");
  app.innerHTML = `
    <div class="app-shell">
      <!-- Sidebar -->
      <aside class="sidebar">
        <div class="sidebar-header">
          <img src="/assets/logo_right_way.png" alt="Right Way" class="sidebar-logo" />
          <span class="sidebar-title">CMS PORTAL</span>
        </div>
        <ul class="sidebar-menu">
          <li class="sidebar-item">
            <a href="/admin/dashboard" class="sidebar-link ${activeNav === 'dashboard' ? 'active' : ''}">
              📊 <span>Dashboard</span>
            </a>
          </li>
          <li class="sidebar-item">
            <a href="/admin/articles" class="sidebar-link ${activeNav === 'articles' ? 'active' : ''}">
              📰 <span>Articles</span>
            </a>
          </li>
          <li class="sidebar-item">
            <a href="/admin/articles/new" class="sidebar-link ${activeNav === 'new-article' ? 'active' : ''}">
              ✍️ <span>New Article</span>
            </a>
          </li>
          <li class="sidebar-item">
            <a href="/admin/media" class="sidebar-link ${activeNav === 'media' ? 'active' : ''}">
              🖼️ <span>Media Library</span>
            </a>
          </li>
          <li class="sidebar-item">
            <a href="/admin/featured" class="sidebar-link ${activeNav === 'featured' ? 'active' : ''}">
              ⭐ <span>Featured News</span>
            </a>
          </li>
          <li class="sidebar-item">
            <a href="/admin/categories" class="sidebar-link ${activeNav === 'categories' ? 'active' : ''}">
              🏷️ <span>Categories</span>
            </a>
          </li>
          <li class="sidebar-item" style="margin-top: 20px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 12px;">
            <a href="/" target="_blank" class="sidebar-link">
              🌐 <span>View Website</span>
            </a>
          </li>
        </ul>
        <div class="sidebar-footer">
          <div class="user-info">
            <span class="user-name">${currentUser.name}</span>
            <span class="user-role">${currentUser.email}</span>
          </div>
          <button class="btn-logout" id="btnLogout" title="Logout">
            🚪 Logout
          </button>
        </div>
      </aside>

      <!-- Main Content Area -->
      <div class="main-wrapper">
        <header class="top-navbar">
          <div class="nav-breadcrumbs">
            <span>Admin</span> » <strong>${title}</strong>
          </div>
          <div class="top-actions">
            <a href="/admin/articles/new" class="btn btn-primary btn-sm">+ New Article</a>
          </div>
        </header>

        <main class="content-container">
          ${contentHtml}
        </main>
      </div>
    </div>
  `;

  document.getElementById("btnLogout").addEventListener("click", handleLogout);
}

/**
 * Logout Handler
 */
async function handleLogout() {
  if (!confirm("Are you sure you want to log out?")) return;
  try {
    await fetch("/api/auth/logout", { method: "POST" });
  } catch (e) {
    console.error(e);
  }
  currentUser = null;
  adminNavigateTo("/admin/login");
}

/* ==========================================================================
   1. LOGIN VIEW
   ========================================================================== */
function renderLoginView() {
  const app = document.getElementById("adminApp");
  app.innerHTML = `
    <div class="auth-wrapper">
      <div class="auth-card">
        <div class="auth-header">
          <img src="/assets/logo_right_way.png" alt="Right Way News" class="auth-logo" />
          <h1 class="auth-title">CMS Admin Login</h1>
          <p class="auth-subtitle">Right Way News Portal Editorial Management</p>
        </div>

        <div id="loginAlert" class="auth-alert"></div>

        <form id="loginForm">
          <div class="form-group">
            <label class="form-label" for="loginEmail">Email</label>
            <input type="email" id="loginEmail" class="form-control" required placeholder="admin@example.com" autocomplete="username" />
          </div>

          <div class="form-group">
            <label class="form-label" for="loginPassword">Password</label>
            <input type="password" id="loginPassword" class="form-control" required placeholder="••••••••" autocomplete="current-password" />
          </div>

          <button type="submit" class="btn btn-primary" style="width: 100%; margin-top: 10px;" id="btnLoginSubmit">
            Login
          </button>
        </form>

        <div class="auth-hint">
          <strong>🔐 Security Notice:</strong><br>
          This section is for site administrators and editors only. Public visitors do not require an account or login.
        </div>
      </div>
    </div>
  `;

  const form = document.getElementById("loginForm");
  const alertBox = document.getElementById("loginAlert");
  const submitBtn = document.getElementById("btnLoginSubmit");

  form.onsubmit = async (e) => {
    e.preventDefault();
    alertBox.style.display = "none";
    submitBtn.disabled = true;
    submitBtn.textContent = "Authenticating...";

    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value;

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();

      if (data.success) {
        currentUser = data.data;
        adminNavigateTo("/admin/dashboard");
      } else {
        alertBox.textContent = data.error?.message || "Invalid email or password.";
        alertBox.className = "auth-alert auth-alert--error";
        alertBox.style.display = "block";
      }
    } catch (err) {
      alertBox.textContent = "Network error. Please try again.";
      alertBox.className = "auth-alert auth-alert--error";
      alertBox.style.display = "block";
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Login";
    }
  };
}

/* ==========================================================================
   2. DASHBOARD VIEW
   ========================================================================== */
async function renderDashboardView() {
  renderShell(`
    <div style="padding: 40px; text-align: center; color: var(--admin-text-muted);">
      Loading dashboard...
    </div>
  `, "dashboard", "Dashboard");

  try {
    const [articlesRes, mediaRes, catsRes] = await Promise.all([
      fetch("/api/admin/articles?limit=10").then(r => r.json()),
      fetch("/api/admin/media").then(r => r.json()),
      fetch("/api/admin/categories").then(r => r.json())
    ]);

    const articlesList = articlesRes.data?.articles || [];
    const totalArticles = articlesRes.data?.pagination?.total || articlesList.length;
    const publishedCount = articlesList.filter(a => a.status === "published").length;
    const draftCount = articlesList.filter(a => a.status === "draft").length;
    const mediaCount = mediaRes.data?.length || 0;
    const categoriesCount = catsRes.data?.length || 0;

    const contentHtml = `
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon stat-icon--blue">📰</div>
          <div>
            <div class="stat-number">${totalArticles}</div>
            <div class="stat-label">Total Articles</div>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon stat-icon--green">✅</div>
          <div>
            <div class="stat-number">${publishedCount}</div>
            <div class="stat-label">Published</div>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon stat-icon--amber">📝</div>
          <div>
            <div class="stat-number">${draftCount}</div>
            <div class="stat-label">Drafts</div>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon stat-icon--purple">🖼️</div>
          <div>
            <div class="stat-number">${mediaCount}</div>
            <div class="stat-label">Media Files</div>
          </div>
        </div>
      </div>

      <div class="admin-card">
        <div class="admin-card-header">
          <h2 class="admin-card-title">Recent Articles</h2>
          <a href="/admin/articles" class="btn btn-secondary btn-sm">View All Articles →</a>
        </div>
        <div class="admin-table-wrap">
          <table class="admin-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Category</th>
                <th>Status</th>
                <th>Published Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${articlesList.map(a => `
                <tr>
                  <td>
                    <a href="/admin/articles/${a.id}/edit" class="table-article-title">${a.title}</a>
                  </td>
                  <td>
                    <span class="badge badge-category">${a.category ? a.category.name : '-'}</span>
                  </td>
                  <td>
                    <span class="badge ${a.status === 'published' ? 'badge-published' : 'badge-draft'}">${a.status === 'published' ? 'Published' : 'Draft'}</span>
                  </td>
                  <td style="font-size: 13px; color: var(--admin-text-muted);">
                    ${a.publishedAt ? new Date(a.publishedAt).toLocaleDateString('te-IN') : '-'}
                  </td>
                  <td>
                    <div style="display: flex; gap: 6px;">
                      <a href="/admin/articles/${a.id}/edit" class="btn btn-secondary btn-sm">Edit</a>
                      <a href="/article/${a.slug}" target="_blank" class="btn btn-secondary btn-sm">View</a>
                    </div>
                  </td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      </div>
    `;

    renderShell(contentHtml, "dashboard", "Dashboard");
  } catch (err) {
    console.error(err);
  }
}

/* ==========================================================================
   3. ARTICLES LIST VIEW
   ========================================================================== */
async function renderArticlesListView(page = 1, status = "all", category_id = "all", search = "") {
  renderShell(`
    <div style="padding: 40px; text-align: center; color: var(--admin-text-muted);">
      Loading articles...
    </div>
  `, "articles", "Articles");

  try {
    const query = new URLSearchParams({ page, limit: 15 });
    if (status !== "all") query.append("status", status);
    if (category_id !== "all") query.append("category_id", category_id);
    if (search) query.append("search", search);

    const res = await fetch(`/api/admin/articles?${query.toString()}`);
    const data = await res.json();
    const articlesList = data.data?.articles || [];
    const pagination = data.data?.pagination || { page: 1, totalPages: 1 };

    const contentHtml = `
      <div class="admin-card">
        <div class="admin-card-header" style="flex-wrap: wrap; gap: 12px;">
          <div style="display: flex; gap: 10px; align-items: center; flex: 1; min-width: 280px;">
            <input type="text" id="articleSearchInput" class="form-control" placeholder="Search articles..." value="${search}" style="max-width: 260px;" />
            <select id="articleStatusSelect" class="form-control" style="max-width: 140px;">
              <option value="all" ${status === 'all' ? 'selected' : ''}>All Statuses</option>
              <option value="published" ${status === 'published' ? 'selected' : ''}>Published</option>
              <option value="draft" ${status === 'draft' ? 'selected' : ''}>Draft</option>
            </select>
            <select id="articleCategorySelect" class="form-control" style="max-width: 160px;">
              <option value="all" ${category_id === 'all' ? 'selected' : ''}>All Categories</option>
              ${globalCategories.map(c => `
                <option value="${c.id}" ${category_id == c.id ? 'selected' : ''}>${c.name}</option>
              `).join("")}
            </select>
          </div>
          <div>
            <a href="/admin/articles/new" class="btn btn-primary">+ New Article</a>
          </div>
        </div>

        <div class="admin-table-wrap">
          <table class="admin-table">
            <thead>
              <tr>
                <th style="width: 45%;">Title</th>
                <th>Category</th>
                <th>Status</th>
                <th>Flags</th>
                <th>Published Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${articlesList.length === 0 ? `
                <tr><td colspan="6" style="text-align: center; padding: 40px; color: var(--admin-text-muted);">No articles found.</td></tr>
              ` : articlesList.map(a => `
                <tr>
                  <td>
                    <a href="/admin/articles/${a.id}/edit" class="table-article-title">${a.title}</a>
                    <span style="font-size: 11px; color: var(--admin-text-muted);">/${a.slug}</span>
                  </td>
                  <td>
                    <span class="badge badge-category">${a.category ? a.category.name : '-'}</span>
                  </td>
                  <td>
                    <button class="btn btn-sm ${a.status === 'published' ? 'btn-success' : 'btn-secondary'} btn-toggle-publish" data-id="${a.id}" data-status="${a.status}">
                      ${a.status === 'published' ? 'Published' : 'Draft'}
                    </button>
                  </td>
                  <td style="font-size: 12px;">
                    ${a.isBreaking ? '<span style="color:red; font-weight:bold;">[Breaking]</span> ' : ''}
                    ${a.isLive ? '<span style="color:green; font-weight:bold;">[Live]</span> ' : ''}
                    ${a.hasVideo ? '<span>[Video]</span>' : ''}
                  </td>
                  <td style="font-size: 12px; color: var(--admin-text-muted);">
                    ${a.publishedAt ? new Date(a.publishedAt).toLocaleDateString('te-IN') : '-'}
                  </td>
                  <td>
                    <div style="display: flex; gap: 4px;">
                      <a href="/admin/articles/${a.id}/edit" class="btn btn-secondary btn-sm" title="Edit">✏️</a>
                      <a href="/article/${a.slug}" target="_blank" class="btn btn-secondary btn-sm" title="View on site">👁️</a>
                      <button class="btn btn-danger btn-sm btn-delete-article" data-id="${a.id}" data-title="${a.title.replace(/"/g, '&quot;')}" title="Delete">🗑️</button>
                    </div>
                  </td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>

        <!-- Pagination Bar -->
        <div style="padding: 16px 20px; display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--admin-border);">
          <span style="font-size: 13px; color: var(--admin-text-muted);">
            Page ${pagination.page} of ${pagination.totalPages || 1} (${pagination.total || 0} articles)
          </span>
          <div style="display: flex; gap: 6px;">
            <button class="btn btn-secondary btn-sm" id="btnPrevPage" ${pagination.page <= 1 ? 'disabled' : ''}>← Previous</button>
            <button class="btn btn-secondary btn-sm" id="btnNextPage" ${pagination.page >= pagination.totalPages ? 'disabled' : ''}>Next →</button>
          </div>
        </div>
      </div>
    `;

    renderShell(contentHtml, "articles", "Articles");

    // Event listeners
    document.getElementById("btnPrevPage")?.addEventListener("click", () => {
      renderArticlesListView(page - 1, status, category_id, search);
    });
    document.getElementById("btnNextPage")?.addEventListener("click", () => {
      renderArticlesListView(page + 1, status, category_id, search);
    });

    const searchInput = document.getElementById("articleSearchInput");
    searchInput?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        renderArticlesListView(1, status, category_id, searchInput.value.trim());
      }
    });

    document.getElementById("articleStatusSelect")?.addEventListener("change", (e) => {
      renderArticlesListView(1, e.target.value, category_id, search);
    });

    document.getElementById("articleCategorySelect")?.addEventListener("change", (e) => {
      renderArticlesListView(1, status, e.target.value, search);
    });

    // Toggle publish
    document.querySelectorAll(".btn-toggle-publish").forEach(btn => {
      btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-id");
        const current = btn.getAttribute("data-status");
        const action = current === "published" ? "unpublish" : "publish";
        await fetch(`/api/admin/articles/${id}/${action}`, { method: "POST" });
        renderArticlesListView(page, status, category_id, search);
      });
    });

    // Delete
    document.querySelectorAll(".btn-delete-article").forEach(btn => {
      btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-id");
        const title = btn.getAttribute("data-title");
        if (confirm(`Are you sure you want to delete "${title}"?`)) {
          await fetch(`/api/admin/articles/${id}`, { method: "DELETE" });
          renderArticlesListView(page, status, category_id, search);
        }
      });
    });

  } catch (err) {
    console.error(err);
  }
}

/* ==========================================================================
   4. ARTICLE EDITOR VIEW (NEW & EDIT)
   ========================================================================== */
async function renderArticleEditorView(editId = null) {
  const isEditing = !!editId;
  const pageTitle = isEditing ? "Edit Article" : "New Article";

  renderShell(`
    <div style="padding: 40px; text-align: center; color: var(--admin-text-muted);">
      Loading editor...
    </div>
  `, isEditing ? "articles" : "new-article", pageTitle);

  let existingData = {
    title: "",
    slug: "",
    description: "",
    contentHtml: "",
    categoryId: globalCategories[0]?.id || null,
    featuredImageId: null,
    featuredImageUrl: null,
    status: "published",
    isBreaking: false,
    isLive: false,
    hasVideo: false
  };

  if (isEditing) {
    try {
      const res = await fetch(`/api/admin/articles/${editId}`);
      const d = await res.json();
      if (d.success) {
        existingData = {
          ...d.data,
          contentHtml: d.data.contentHtml || ""
        };
      }
    } catch (e) {
      console.error(e);
    }
  }

  const contentHtml = `
    <form id="articleEditorForm">
      <div class="editor-layout">
        <!-- Main Form Column -->
        <div>
          <div class="admin-card">
            <div class="admin-card-body">
              <div class="form-group">
                <label class="form-label" for="artTitle">Article Headline *</label>
                <input type="text" id="artTitle" class="form-control form-telugu" required placeholder="Enter article headline..." value="${existingData.title.replace(/"/g, '&quot;')}" style="font-size: 18px; font-weight: 600;" />
              </div>

              <div class="form-group">
                <label class="form-label" for="artSlug">URL Slug</label>
                <div style="display: flex; gap: 8px;">
                  <span style="display: flex; align-items: center; color: var(--admin-text-muted); font-size: 13px;">/article/</span>
                  <input type="text" id="artSlug" class="form-control" placeholder="auto-generated-slug" value="${existingData.slug || ''}" />
                </div>
              </div>

              <div class="form-group">
                <label class="form-label" for="artDesc">Short Summary / Excerpt</label>
                <textarea id="artDesc" class="form-control form-telugu" placeholder="Brief article summary (1-2 sentences)...">${existingData.description || ''}</textarea>
              </div>

              <div class="form-group">
                <label class="form-label">Article Content *</label>
                <div id="quillEditor" style="background: #ffffff;"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Sidebar Meta Column -->
        <div>
          <!-- Publish Box -->
          <div class="admin-card">
            <div class="admin-card-header">
              <h3 class="admin-card-title">Publishing</h3>
            </div>
            <div class="admin-card-body">
              <div class="form-group">
                <label class="form-label">Status</label>
                <select id="artStatus" class="form-control">
                  <option value="published" ${existingData.status === 'published' ? 'selected' : ''}>Published</option>
                  <option value="draft" ${existingData.status === 'draft' ? 'selected' : ''}>Draft</option>
                </select>
              </div>

              <div style="display: flex; gap: 8px; margin-top: 16px;">
                <button type="submit" class="btn btn-primary" style="flex: 1;" id="btnSaveArticle">
                  ${isEditing ? 'Update Article' : 'Publish Article'}
                </button>
                <a href="/admin/articles" class="btn btn-secondary">Cancel</a>
              </div>
            </div>
          </div>

          <!-- Category Box -->
          <div class="admin-card">
            <div class="admin-card-header">
              <h3 class="admin-card-title">Category</h3>
            </div>
            <div class="admin-card-body">
              <select id="artCategory" class="form-control">
                ${globalCategories.map(c => `
                  <option value="${c.id}" ${existingData.categoryId == c.id ? 'selected' : ''}>${c.name} (${c.slug})</option>
                `).join("")}
              </select>
            </div>
          </div>

          <!-- Featured Image Box -->
          <div class="admin-card">
            <div class="admin-card-header">
              <h3 class="admin-card-title">Featured Image</h3>
            </div>
            <div class="admin-card-body">
              <input type="hidden" id="artImageId" value="${existingData.featuredImageId || ''}" />
              <div id="imagePreviewBox" style="margin-bottom: 12px; text-align: center;">
                ${existingData.featuredImageUrl ? `
                  <img src="${existingData.featuredImageUrl}" style="width: 100%; max-height: 160px; object-fit: cover; border-radius: 4px; border: 1px solid var(--admin-border);" />
                ` : `
                  <div style="padding: 24px; background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 4px; color: var(--admin-text-muted); font-size: 12px;">
                    No image selected
                  </div>
                `}
              </div>
              <button type="button" class="btn btn-secondary btn-sm" style="width: 100%;" id="btnOpenMediaPicker">
                🖼️ Select / Upload Image
              </button>
            </div>
          </div>

          <!-- Additional Flags -->
          <div class="admin-card">
            <div class="admin-card-header">
              <h3 class="admin-card-title">Attributes</h3>
            </div>
            <div class="admin-card-body">
              <label class="form-check">
                <input type="checkbox" id="artBreaking" ${existingData.isBreaking ? 'checked' : ''} />
                <span>Breaking News</span>
              </label>

              <label class="form-check">
                <input type="checkbox" id="artLive" ${existingData.isLive ? 'checked' : ''} />
                <span>Live Updates</span>
              </label>

              <label class="form-check">
                <input type="checkbox" id="artVideo" ${existingData.hasVideo ? 'checked' : ''} />
                <span>Has Video</span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </form>
  `;

  renderShell(contentHtml, isEditing ? "articles" : "new-article", pageTitle);

  // Initialize Quill Rich Text Editor
  currentQuill = new Quill("#quillEditor", {
    theme: "snow",
    placeholder: "Write the full article content here...",
    modules: {
      toolbar: [
        [{ header: [2, 3, false] }],
        ["bold", "italic", "underline"],
        [{ list: "ordered" }, { list: "bullet" }],
        ["blockquote", "link"],
        ["clean"]
      ]
    }
  });

  if (existingData.contentHtml) {
    currentQuill.root.innerHTML = existingData.contentHtml;
  }

  // Auto-slugify on title input if new
  const titleInput = document.getElementById("artTitle");
  const slugInput = document.getElementById("artSlug");
  if (!isEditing) {
    titleInput.addEventListener("blur", () => {
      if (!slugInput.value.trim() && titleInput.value.trim()) {
        slugInput.value = titleInput.value.trim()
          .toLowerCase()
          .replace(/[^a-zA-Z0-9\u0C00-\u0C7F-_]/g, "-")
          .replace(/-+/g, "-")
          .replace(/^-|-$/g, "");
      }
    });
  }

  // Media Picker Trigger
  document.getElementById("btnOpenMediaPicker").addEventListener("click", () => {
    openMediaPickerModal((selectedMedia) => {
      document.getElementById("artImageId").value = selectedMedia.id;
      const previewBox = document.getElementById("imagePreviewBox");
      previewBox.innerHTML = `
        <img src="${selectedMedia.url}" style="width: 100%; max-height: 160px; object-fit: cover; border-radius: 4px; border: 1px solid var(--admin-border);" />
      `;
    });
  });

  // Submit Handler
  document.getElementById("articleEditorForm").onsubmit = async (e) => {
    e.preventDefault();
    const saveBtn = document.getElementById("btnSaveArticle");
    saveBtn.disabled = true;
    saveBtn.textContent = "Saving...";

    const title = titleInput.value.trim();
    const slug = slugInput.value.trim();
    const description = document.getElementById("artDesc").value.trim();
    const content_html = currentQuill.root.innerHTML;
    const category_id = parseInt(document.getElementById("artCategory").value, 10);
    const featured_image_id = parseInt(document.getElementById("artImageId").value, 10) || null;
    const status = document.getElementById("artStatus").value;
    const is_breaking = document.getElementById("artBreaking").checked;
    const is_live = document.getElementById("artLive").checked;
    const has_video = document.getElementById("artVideo").checked;

    const payload = {
      title,
      description,
      content_html,
      category_id,
      featured_image_id,
      status,
      is_breaking,
      is_live,
      has_video
    };
    if (slug) payload.slug = slug;

    try {
      const url = isEditing ? `/api/admin/articles/${editId}` : "/api/admin/articles";
      const method = isEditing ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (data.success) {
        alert(isEditing ? "Article updated successfully!" : "Article published successfully!");
        adminNavigateTo("/admin/articles");
      } else {
        alert("Error: " + (data.error?.message || "Could not save article."));
      }
    } catch (err) {
      alert("Network error occurred.");
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = isEditing ? "Update Article" : "Publish Article";
    }
  };
}

/* ==========================================================================
   5. MEDIA LIBRARY VIEW & MODAL
   ========================================================================== */
async function renderMediaView() {
  renderShell(`
    <div style="padding: 40px; text-align: center; color: var(--admin-text-muted);">
      Loading media files...
    </div>
  `, "media", "Media Library");

  try {
    const res = await fetch("/api/admin/media");
    const d = await res.json();
    const mediaItems = d.data || [];

    const contentHtml = `
      <!-- Upload Zone -->
      <div class="upload-zone" id="mediaUploadZone">
        <input type="file" id="mediaFileInput" accept="image/*" style="display: none;" />
        <div style="font-size: 36px; margin-bottom: 8px;">📤</div>
        <h3 style="font-size: 16px; font-weight: 700; margin-bottom: 4px;">Drop image here or click to browse</h3>
        <p style="font-size: 12px; color: var(--admin-text-muted);">Supported formats: JPG, PNG, WebP, GIF, SVG (Max size: 10MB)</p>
      </div>

      <!-- Media Items Grid -->
      <div class="admin-card">
        <div class="admin-card-header">
          <h2 class="admin-card-title">Media Collection (${mediaItems.length} files)</h2>
        </div>
        <div class="admin-card-body">
          <div class="media-grid" id="mediaGridContainer">
            ${mediaItems.map(m => `
              <div class="media-item">
                <img src="${m.url}" alt="${m.altText || m.filename}" class="media-thumb" loading="lazy" />
                <div class="media-meta">
                  <div class="media-name" title="${m.filename}">${m.filename}</div>
                  <div style="font-size: 11px; color: var(--admin-text-muted); margin-top: 2px;">
                    ${(m.fileSize / 1024).toFixed(1)} KB
                  </div>
                  <div class="media-actions">
                    <button class="btn btn-secondary btn-sm btn-copy-url" data-url="${m.url}">Copy URL</button>
                    <button class="btn btn-danger btn-sm btn-delete-media" data-id="${m.id}" title="Delete">🗑️</button>
                  </div>
                </div>
              </div>
            `).join("")}
          </div>
        </div>
      </div>
    `;

    renderShell(contentHtml, "media", "Media Library");

    // Hook up file upload
    const uploadZone = document.getElementById("mediaUploadZone");
    const fileInput = document.getElementById("mediaFileInput");

    uploadZone.addEventListener("click", () => fileInput.click());

    uploadZone.addEventListener("dragover", (e) => {
      e.preventDefault();
      uploadZone.classList.add("dragover");
    });
    uploadZone.addEventListener("dragleave", () => uploadZone.classList.remove("dragover"));
    uploadZone.addEventListener("drop", (e) => {
      e.preventDefault();
      uploadZone.classList.remove("dragover");
      if (e.dataTransfer.files.length) {
        uploadFile(e.dataTransfer.files[0]);
      }
    });

    fileInput.addEventListener("change", () => {
      if (fileInput.files.length) {
        uploadFile(fileInput.files[0]);
      }
    });

    async function uploadFile(file) {
      uploadZone.innerHTML = `<div style="font-size: 18px; padding: 20px;">Uploading image...</div>`;
      const formData = new FormData();
      formData.append("file", file);

      try {
        const res = await fetch("/api/admin/media", {
          method: "POST",
          body: formData
        });
        const data = await res.json();
        if (data.success) {
          renderMediaView();
        } else {
          alert("Upload failed: " + (data.error?.message || "Unknown error"));
          renderMediaView();
        }
      } catch (err) {
        alert("Network error occurred.");
        renderMediaView();
      }
    }

    // Copy URL
    document.querySelectorAll(".btn-copy-url").forEach(btn => {
      btn.addEventListener("click", () => {
        navigator.clipboard.writeText(window.location.origin + btn.getAttribute("data-url"));
        const original = btn.textContent;
        btn.textContent = "Copied!";
        setTimeout(() => btn.textContent = original, 1200);
      });
    });

    // Delete
    document.querySelectorAll(".btn-delete-media").forEach(btn => {
      btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-id");
        if (confirm("Are you sure you want to delete this image?")) {
          const res = await fetch(`/api/admin/media/${id}`, { method: "DELETE" });
          const d = await res.json();
          if (d.success) {
            renderMediaView();
          } else {
            alert(d.error?.message || "Could not delete image.");
          }
        }
      });
    });

  } catch (err) {
    console.error(err);
  }
}

/**
 * Media Picker Modal helper for selecting article featured image
 */
async function openMediaPickerModal(onSelect) {
  const modal = document.createElement("div");
  modal.className = "modal-overlay";
  modal.innerHTML = `
    <div class="modal-box">
      <div class="modal-header">
        <h3 style="font-size: 16px; font-weight: 700;">Select Image from Media Library</h3>
        <button id="modalCloseBtn" style="background: none; border: none; font-size: 20px; cursor: pointer;">&times;</button>
      </div>
      <div class="modal-body">
        <div style="margin-bottom: 16px;">
          <input type="file" id="modalUploadInput" accept="image/*" style="display: none;" />
          <button type="button" class="btn btn-primary btn-sm" id="btnModalUpload">
            + Upload New Image
          </button>
        </div>
        <div class="media-grid" id="modalMediaGrid">
          <div style="padding: 20px; color: var(--admin-text-muted);">Loading images...</div>
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" id="modalCancelBtn">Cancel</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  const close = () => modal.remove();
  document.getElementById("modalCloseBtn").onclick = close;
  document.getElementById("modalCancelBtn").onclick = close;

  async function loadItems() {
    const res = await fetch("/api/admin/media");
    const d = await res.json();
    const items = d.data || [];
    const grid = document.getElementById("modalMediaGrid");
    grid.innerHTML = items.map(m => `
      <div class="media-item" data-media='${JSON.stringify(m)}' style="cursor: pointer;">
        <img src="${m.url}" alt="${m.altText || ''}" class="media-thumb" />
        <div class="media-meta">
          <div class="media-name">${m.filename}</div>
        </div>
      </div>
    `).join("");

    grid.querySelectorAll(".media-item").forEach(el => {
      el.onclick = () => {
        const item = JSON.parse(el.getAttribute("data-media"));
        onSelect(item);
        close();
      };
    });
  }

  loadItems();

  const uploadInput = document.getElementById("modalUploadInput");
  document.getElementById("btnModalUpload").onclick = () => uploadInput.click();

  uploadInput.onchange = async () => {
    if (!uploadInput.files.length) return;
    const formData = new FormData();
    formData.append("file", uploadInput.files[0]);
    const res = await fetch("/api/admin/media", { method: "POST", body: formData });
    const d = await res.json();
    if (d.success) {
      loadItems();
    } else {
      alert("Upload failed: " + d.error?.message);
    }
  };
}

/* ==========================================================================
   6. FEATURED STORIES VIEW (SLIDER ORDERING)
   ========================================================================== */
async function renderFeaturedView() {
  renderShell(`
    <div style="padding: 40px; text-align: center; color: var(--admin-text-muted);">
      Loading featured news...
    </div>
  `, "featured", "Featured News");

  try {
    const [featuredRes, articlesRes] = await Promise.all([
      fetch("/api/admin/featured").then(r => r.json()),
      fetch("/api/admin/articles?limit=50").then(r => r.json())
    ]);

    const items = featuredRes.data || [];
    const allArticles = articlesRes.data?.articles || [];

    const contentHtml = `
      <div class="admin-card">
        <div class="admin-card-header">
          <h2 class="admin-card-title">Carousel Slides Management (10 Slides)</h2>
          <button class="btn btn-primary" id="btnSaveFeatured">Save Order</button>
        </div>
        <div class="admin-card-body">
          <p style="font-size: 13px; color: var(--admin-text-muted); margin-bottom: 20px;">
            Manage and reorder the 10 featured articles displayed in the homepage carousel.
          </p>

          <div id="featuredListWrap">
            ${items.map((item, index) => `
              <div class="featured-row" data-index="${index}" style="display: flex; gap: 14px; align-items: center; padding: 12px; border: 1px solid var(--admin-border); border-radius: var(--admin-radius); margin-bottom: 10px; background: #ffffff;">
                <span style="font-weight: 800; font-size: 16px; color: var(--admin-primary); width: 28px;">#${item.position}</span>
                <img src="${item.article?.imageUrl || '/assets/carousel_image_slide1.png'}" style="width: 70px; height: 46px; object-fit: cover; border-radius: 4px;" />
                
                <div style="flex: 1;">
                  <select class="form-control select-article" style="margin-bottom: 4px;">
                    ${allArticles.map(a => `
                      <option value="${a.id}" ${a.id === item.articleId ? 'selected' : ''}>${a.title}</option>
                    `).join("")}
                  </select>
                  <div style="display: flex; gap: 8px;">
                    <input type="text" class="form-control input-badge" placeholder="Badge (e.g. Special Story..)" value="${item.badgeText || ''}" style="max-width: 220px;" />
                    <input type="text" class="form-control input-headline" placeholder="Alternative Headline (optional)" value="${item.displayHeadline || ''}" />
                  </div>
                </div>

                <div style="display: flex; flex-direction: column; gap: 4px;">
                  <button type="button" class="btn btn-secondary btn-sm btn-move-up" ${index === 0 ? 'disabled' : ''}>▲</button>
                  <button type="button" class="btn btn-secondary btn-sm btn-move-down" ${index === items.length - 1 ? 'disabled' : ''}>▼</button>
                </div>
              </div>
            `).join("")}
          </div>
        </div>
      </div>
    `;

    renderShell(contentHtml, "featured", "Featured News");

    // Move up / Move down logic
    const rowsWrap = document.getElementById("featuredListWrap");
    rowsWrap.addEventListener("click", (e) => {
      const row = e.target.closest(".featured-row");
      if (!row) return;

      if (e.target.classList.contains("btn-move-up")) {
        const prev = row.previousElementSibling;
        if (prev) rowsWrap.insertBefore(row, prev);
      } else if (e.target.classList.contains("btn-move-down")) {
        const next = row.nextElementSibling;
        if (next) rowsWrap.insertBefore(next, row);
      }
    });

    // Save Order Handler
    document.getElementById("btnSaveFeatured").onclick = async () => {
      const rows = document.querySelectorAll(".featured-row");
      const payloadItems = [];

      rows.forEach((r, idx) => {
        const article_id = parseInt(r.querySelector(".select-article").value, 10);
        const badge_text = r.querySelector(".input-badge").value.trim();
        const display_headline = r.querySelector(".input-headline").value.trim();
        payloadItems.push({
          article_id,
          position: idx + 1,
          badge_text,
          display_headline,
          is_active: true
        });
      });

      try {
        const res = await fetch("/api/admin/featured", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items: payloadItems })
        });
        const d = await res.json();
        if (d.success) {
          alert("Featured articles order saved successfully!");
          renderFeaturedView();
        } else {
          alert("Error: " + d.error?.message);
        }
      } catch (err) {
        alert("Network error occurred.");
      }
    };

  } catch (err) {
    console.error(err);
  }
}

/* ==========================================================================
   7. CATEGORIES VIEW
   ========================================================================== */
async function renderCategoriesView() {
  renderShell(`
    <div style="padding: 40px; text-align: center; color: var(--admin-text-muted);">
      Loading categories...
    </div>
  `, "categories", "Categories");

  try {
    const res = await fetch("/api/admin/categories");
    const d = await res.json();
    const categories = d.data || [];
    globalCategories = categories;

    const contentHtml = `
      <div class="admin-card">
        <div class="admin-card-header">
          <h2 class="admin-card-title">News Categories (${categories.length})</h2>
          <button class="btn btn-primary" id="btnNewCategory">+ New Category</button>
        </div>
        <div class="admin-table-wrap">
          <table class="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Slug</th>
                <th>Breadcrumb</th>
                <th>Order</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${categories.map(c => `
                <tr>
                  <td><strong>${c.name}</strong></td>
                  <td><code>${c.slug}</code></td>
                  <td>${c.breadcrumb}</td>
                  <td>${c.sortOrder}</td>
                  <td><span class="badge ${c.isActive ? 'badge-published' : 'badge-draft'}">${c.isActive ? 'Active' : 'Inactive'}</span></td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      </div>
    `;

    renderShell(contentHtml, "categories", "Categories");

    document.getElementById("btnNewCategory").onclick = async () => {
      const name = prompt("Enter category name (e.g. Health):");
      if (!name) return;
      const slug = prompt("Enter slug (e.g. health):");
      if (!slug) return;
      const breadcrumb = (prompt("Enter breadcrumb text (e.g. HEALTH):") || slug).toUpperCase();

      try {
        const res = await fetch("/api/admin/categories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, slug, breadcrumb, sort_order: categories.length + 1 })
        });
        const d = await res.json();
        if (d.success) {
          alert("Category added successfully!");
          renderCategoriesView();
        } else {
          alert("Error: " + d.error?.message);
        }
      } catch (e) {
        alert("Network error occurred.");
      }
    };
  } catch (err) {
    console.error(err);
  }
}
