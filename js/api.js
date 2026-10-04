/**
 * Right Way News - Client API Abstraction Layer
 * Interfaces with the backend REST API
 */

const api = {
  baseUrl: "/api",

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    try {
      const res = await fetch(url, {
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
          ...(options.headers || {})
        },
        ...options
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        const errorMsg = data?.error?.message || `Request failed with status ${res.status}`;
        const err = new Error(errorMsg);
        err.status = res.status;
        err.code = data?.error?.code;
        throw err;
      }
      return data.data;
    } catch (err) {
      console.error(`[API Error] ${endpoint}:`, err);
      throw err;
    }
  },

  /**
   * Fetch complete homepage payload (featured, latest, categories, regions)
   */
  async getHome() {
    return this.request("/home");
  },

  /**
   * Fetch active categories
   */
  async getCategories() {
    return this.request("/categories");
  },

  /**
   * Fetch paginated articles list
   * @param {Object} params - { page, limit, category, sort }
   */
  async getArticles(params = {}) {
    const query = new URLSearchParams();
    if (params.page) query.append("page", params.page);
    if (params.limit) query.append("limit", params.limit);
    if (params.category) query.append("category", params.category);
    if (params.sort) query.append("sort", params.sort);

    const queryString = query.toString();
    const endpoint = queryString ? `/articles?${queryString}` : "/articles";
    return this.request(endpoint);
  },

  /**
   * Fetch single article details by slug
   * @param {string} slug
   */
  async getArticle(slug) {
    return this.request(`/articles/${encodeURIComponent(slug)}`);
  }
};

if (typeof window !== "undefined") {
  window.api = api;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = api;
}
