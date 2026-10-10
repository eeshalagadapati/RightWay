const http = require("http");

function request(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => body += chunk);
      res.on("end", () => {
        let json = null;
        try { json = JSON.parse(body); } catch (e) {}
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: json,
          rawBody: body
        });
      });
    });
    req.on("error", reject);
    if (postData) {
      req.write(typeof postData === "string" ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

async function runTests() {
  console.log("=== RUNNING COMPLETE END-TO-END CMS & PUBLIC WORKFLOW SUITE ===\n");

  // Step 0: Authenticate Admin
  console.log("0. Authenticating Admin (POST /api/auth/login)...");
  const loginRes = await request({
    hostname: "localhost",
    port: 3000,
    path: "/api/auth/login",
    method: "POST",
    headers: { "Content-Type": "application/json" }
  }, { email: "admin@rightwaynews.com", password: "rightADMIN26" });

  if (loginRes.statusCode !== 200 || !loginRes.data?.success) {
    throw new Error(`Admin authentication failed: ${JSON.stringify(loginRes.data)}`);
  }
  const cookie = loginRes.headers["set-cookie"][0].split(";")[0];
  console.log(`   [PASSED] Admin authenticated successfully (Email: ${loginRes.data.data.email}, Role: ${loginRes.data.data.role}).\n`);

  // Ensure database starts in a clean zero-article state
  const existingArticles = await request({
    hostname: "localhost",
    port: 3000,
    path: "/api/admin/articles",
    method: "GET",
    headers: { "Cookie": cookie }
  });
  if (existingArticles.data?.data?.articles?.length > 0) {
    for (const art of existingArticles.data.data.articles) {
      await request({
        hostname: "localhost",
        port: 3000,
        path: `/api/admin/articles/${art.id}`,
        method: "DELETE",
        headers: { "Cookie": cookie }
      });
    }
  }

  // Test 1: Verify Initial Clean Empty State on Homepage & Categories
  console.log("1. Verifying Initial Clean Empty State (GET /api/home & /api/categories)...");
  const homeRes = await request({ hostname: "localhost", port: 3000, path: "/api/home", method: "GET" });
  if (homeRes.statusCode !== 200 || !homeRes.data?.success) throw new Error("Failed to load /api/home");
  if (homeRes.data.data.featured.length !== 0) throw new Error(`Expected 0 featured items, got ${homeRes.data.data.featured.length}`);
  if (homeRes.data.data.latest.length !== 0) throw new Error(`Expected 0 latest items, got ${homeRes.data.data.latest.length}`);
  if (homeRes.data.data.categories.length !== 7) throw new Error(`Expected 7 categories, got ${homeRes.data.data.categories.length}`);
  
  const catRes = await request({ hostname: "localhost", port: 3000, path: "/api/categories", method: "GET" });
  if (catRes.statusCode !== 200 || !catRes.data?.success || catRes.data.data.length !== 7) {
    throw new Error("Categories verification failed!");
  }
  console.log("   [PASSED] Clean initial state verified: 0 articles, 0 carousel slides, exactly 7 categories preserved.\n");

  // Test 2: Create a New Real Article via CMS
  console.log("2. Creating & Publishing Article via CMS (POST /api/admin/articles)...");
  const testArticlePayload = {
    title: "అమరావతి రాజధాని పనుల పురోగతి పై ఉన్నత స్థాయి సమీక్ష",
    slug: "amaravati-capital-works-progress-review-2026",
    description: "రాజధాని ప్రాంతంలో నిర్మాణ పనులను వేగవంతం చేయాలని అధికారుల ఆదేశం.",
    content_html: "<p>ఆంధ్రప్రదేశ్ రాజధాని అమరావతిలో పనుల పురోగతిపై ఉన్నతాధికారుల సమీక్షా సమావేశం జరిగింది.</p>",
    category_id: 1, // Andhra Pradesh
    status: "published",
    is_breaking: true
  };

  const createRes = await request({
    hostname: "localhost",
    port: 3000,
    path: "/api/admin/articles",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Cookie": cookie
    }
  }, testArticlePayload);

  if (createRes.statusCode !== 201 || !createRes.data?.success) {
    throw new Error(`Article creation failed: ${JSON.stringify(createRes.data)}`);
  }
  const created = createRes.data.data;
  console.log(`   [PASSED] Article created successfully (ID: ${created.id}, Slug: ${created.slug}).\n`);

  // Test 3: Public Website Dynamic Reflection
  console.log("3. Verifying Public Reflection (/api/home, /api/articles, /api/articles/:slug)...");
  const homeAfterCreate = await request({ hostname: "localhost", port: 3000, path: "/api/home", method: "GET" });
  if (homeAfterCreate.data.data.latest.length !== 1 || homeAfterCreate.data.data.latest[0].id !== created.id) {
    throw new Error("Created article not found in public latest news feed!");
  }

  const articlesList = await request({ hostname: "localhost", port: 3000, path: "/api/articles?category=andhra-pradesh", method: "GET" });
  if (articlesList.data.data.articles.length !== 1 || articlesList.data.data.articles[0].id !== created.id) {
    throw new Error("Article not listed under category andhra-pradesh!");
  }

  const articleDetail = await request({
    hostname: "localhost",
    port: 3000,
    path: `/api/articles/${encodeURIComponent(created.slug)}`,
    method: "GET"
  });
  if (articleDetail.statusCode !== 200 || !articleDetail.data?.success || articleDetail.data.data.title !== testArticlePayload.title) {
    throw new Error(`Article detail mismatch: ${JSON.stringify(articleDetail.data)}`);
  }
  console.log(`   [PASSED] Real article rendered accurately on homepage, category listing, and detail page.\n`);

  // Test 4: Edit Article via CMS
  console.log("4. Editing Article via CMS (PATCH /api/admin/articles/:id)...");
  const updatedHeadline = "అమరావతి రాజధాని ప్రాజెక్టులకు అదనపు నిధుల కేటాయింపు";
  const patchRes = await request({
    hostname: "localhost",
    port: 3000,
    path: `/api/admin/articles/${created.id}`,
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "Cookie": cookie
    }
  }, { title: updatedHeadline });

  if (patchRes.statusCode !== 200 || !patchRes.data?.success) {
    throw new Error(`Article edit failed: ${JSON.stringify(patchRes.data)}`);
  }
  console.log("   Patch result:", JSON.stringify(patchRes.data));

  const detailAfterEdit = await request({
    hostname: "localhost",
    port: 3000,
    path: `/api/articles/${encodeURIComponent(created.slug)}`,
    method: "GET"
  });
  console.log("   Detail after edit status:", detailAfterEdit.statusCode, "rawBody:", detailAfterEdit.rawBody);
  if (!detailAfterEdit.data || !detailAfterEdit.data.data) {
    throw new Error(`Detail fetch failed with status ${detailAfterEdit.statusCode}: ${detailAfterEdit.rawBody}`);
  }
  if (detailAfterEdit.data.data.title !== updatedHeadline) {
    throw new Error(`Edited title was not reflected publicly! Expected '${updatedHeadline}', got '${detailAfterEdit.data?.data?.title}'`);
  }
  console.log(`   [PASSED] Article edit persisted in PostgreSQL and rendered on public website.\n`);

  // Test 5: Feature Article in Carousel
  console.log("5. Adding to Carousel via CMS (PUT /api/admin/featured)...");
  const featuredHeadline = "ప్రత్యేక కథనం: అమరావతి రాజధాని నూతన మాస్టర్ ప్లాన్";
  const featRes = await request({
    hostname: "localhost",
    port: 3000,
    path: "/api/admin/featured",
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "Cookie": cookie
    }
  }, {
    items: [
      {
        article_id: created.id,
        position: 1,
        badge_text: "ప్రత్యేక కథనం..",
        display_headline: featuredHeadline
      }
    ]
  });
  if (featRes.statusCode !== 200 || !featRes.data?.success) {
    throw new Error(`Featured update failed: ${JSON.stringify(featRes.data)}`);
  }

  const homeAfterFeat = await request({ hostname: "localhost", port: 3000, path: "/api/home", method: "GET" });
  if (homeAfterFeat.data.data.featured.length !== 1 || homeAfterFeat.data.data.featured[0].headline !== featuredHeadline) {
    throw new Error("Featured carousel override not reflected on public homepage!");
  }
  console.log(`   [PASSED] Custom carousel headline and position reflected on public homepage (${featuredHeadline}).\n`);

  // Test 6: Unpublish Article (Visibility State)
  console.log("6. Unpublishing Article (POST /api/admin/articles/:id/unpublish)...");
  const unpubRes = await request({
    hostname: "localhost",
    port: 3000,
    path: `/api/admin/articles/${created.id}/unpublish`,
    method: "POST",
    headers: { "Cookie": cookie }
  });
  if (unpubRes.statusCode !== 200 || !unpubRes.data?.success) {
    throw new Error(`Unpublish failed: ${JSON.stringify(unpubRes.data)}`);
  }

  const homeAfterUnpub = await request({ hostname: "localhost", port: 3000, path: "/api/home", method: "GET" });
  if (homeAfterUnpub.data.data.featured.length !== 0 || homeAfterUnpub.data.data.latest.length !== 0) {
    throw new Error("Unpublished article is still appearing on public feeds!");
  }

  const adminListDraft = await request({
    hostname: "localhost",
    port: 3000,
    path: "/api/admin/articles?status=draft",
    method: "GET",
    headers: { "Cookie": cookie }
  });
  if (adminListDraft.data.data.articles.length !== 1 || adminListDraft.data.data.articles[0].id !== created.id) {
    throw new Error("Draft article missing from CMS admin list!");
  }
  console.log(`   [PASSED] Article unpublished: cleanly hidden from public site and preserved as draft in CMS.\n`);

  // Test 7: Delete Article via CMS
  console.log("7. Deleting Article (DELETE /api/admin/articles/:id)...");
  const delRes = await request({
    hostname: "localhost",
    port: 3000,
    path: `/api/admin/articles/${created.id}`,
    method: "DELETE",
    headers: { "Cookie": cookie }
  });
  if (delRes.statusCode !== 200 || !delRes.data?.success) {
    throw new Error(`Article deletion failed: ${JSON.stringify(delRes.data)}`);
  }

  const homeFinal = await request({ hostname: "localhost", port: 3000, path: "/api/home", method: "GET" });
  if (homeFinal.data.data.featured.length !== 0 || homeFinal.data.data.latest.length !== 0) {
    throw new Error("Deleted article still found in public home data!");
  }
  console.log("   [PASSED] Article deleted cleanly. Database returned to zero-sample-article state.\n");

  console.log("===================================================================");
  console.log("  ALL 7 END-TO-END TESTS PASSED WITH 100% RELIABILITY & INTEGRITY! ");
  console.log("===================================================================\n");
}

runTests().catch((err) => {
  console.error("\n[TEST FAILED]", err);
  process.exit(1);
});
