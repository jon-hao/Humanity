(function () {
  const els = {
    login: document.getElementById("loginView"),
    app: document.getElementById("appView"),
    fav: document.getElementById("favView"),
    loginForm: document.getElementById("loginForm"),
    loginBtn: document.getElementById("loginBtn"),
    loginErr: document.getElementById("loginErr"),
    email: document.getElementById("email"),
    password: document.getElementById("password"),
    q: document.getElementById("q"),
    sourceSelect: document.getElementById("sourceSelect"),
    searchForm: document.getElementById("searchForm"),
    results: document.getElementById("results"),
    status: document.getElementById("status"),
    pager: document.getElementById("pager"),
    pagePrev: document.getElementById("pagePrev"),
    pageNext: document.getElementById("pageNext"),
    pageLabel: document.getElementById("pageLabel"),
    favBtn: document.getElementById("favBtn"),
    backBtn: document.getElementById("backBtn"),
    favList: document.getElementById("favList"),
    logoutBtn: document.getElementById("logoutBtn"),
    appScroll: document.getElementById("appScroll"),
    favScroll: document.getElementById("favScroll"),
    ptrApp: document.getElementById("ptrApp"),
    ptrFav: document.getElementById("ptrFav"),
  };

  let sourceCtl = null;
  let loggingIn = false;
  let page = 1;
  let hasMore = false;
  let lastQuery = "";
  let syncingUrl = false;

  function escapeHtml(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function sourceValue() {
    return (
      (sourceCtl && sourceCtl.value) ||
      (els.sourceSelect && els.sourceSelect.dataset.value) ||
      "all"
    );
  }

  function show(view) {
    const map = { login: els.login, app: els.app, fav: els.fav };
    Object.keys(map).forEach((k) => {
      const el = map[k];
      if (!el) return;
      const on = k === view;
      el.hidden = !on;
      el.classList.toggle("is-active", on);
      el.setAttribute("aria-hidden", on ? "false" : "true");
    });
  }

  function readRoute() {
    const sp = new URLSearchParams(location.search);
    const q = (sp.get("query") || sp.get("q") || "").trim();
    const pg = Math.max(1, Number(sp.get("page")) || 1);
    const source = (sp.get("source") || "").trim().toLowerCase();
    return { q, page: pg, source };
  }

  function writeRoute(q, pg, replace) {
    const sp = new URLSearchParams();
    const query = String(q || "").trim();
    const pageNo = Math.max(1, Number(pg) || 1);
    if (query) {
      sp.set("query", query);
      sp.set("page", String(pageNo));
    }
    const src = sourceValue();
    if (src && src !== "all") sp.set("source", src);
    const qs = sp.toString();
    const next = location.pathname + (qs ? "?" + qs : "") + location.hash;
    const cur = location.pathname + location.search + location.hash;
    if (next === cur) return;
    syncingUrl = true;
    if (replace) history.replaceState(null, "", next);
    else history.pushState(null, "", next);
    syncingUrl = false;
  }

  function playerUrl(item) {
    const u = new URL("player.html", location.href);
    if (item.embed) u.searchParams.set("embed", item.embed);
    if (item.url) u.searchParams.set("page", item.url);
    if (item.stream) u.searchParams.set("stream", item.stream);
    if (item.title) u.searchParams.set("title", item.title);
    if (item.thumb) u.searchParams.set("poster", item.thumb);
    if (item.source) u.searchParams.set("source", item.source);
    return u.href;
  }

  function cardHtml(item, opts) {
    const thumb = item.thumb || "";
    const preview = item.preview || thumb;
    const saved = opts && opts.saved;
    return `<article class="card" data-id="${escapeHtml(item.id)}">
      <button type="button" class="thumb-btn" data-open data-thumb="${escapeHtml(
        thumb
      )}" data-preview="${escapeHtml(preview)}">
        <img src="${escapeHtml(thumb)}" alt="" loading="lazy" referrerpolicy="no-referrer" data-fallback />
        <span class="src-tag">${escapeHtml(item.source || "")}</span>
      </button>
      <div class="card-body">
        <h3 class="title">${escapeHtml(item.title || "")}</h3>
        <div class="card-actions">
          <button type="button" class="btn ${saved ? "danger" : ""}" data-fav>${
            saved ? "Unsave" : "Save"
          }</button>
        </div>
      </div>
    </article>`;
  }

  function wireThumbFallback(root) {
    root.querySelectorAll("img[data-fallback]").forEach((img) => {
      img.addEventListener("error", function onErr() {
        img.removeEventListener("error", onErr);
        const raw = img.getAttribute("src") || "";
        if (/THUMBNUM/i.test(raw)) {
          img.src = raw.replace(/THUMBNUM/gi, "9");
          return;
        }
        if (raw.includes("?")) {
          img.src = raw.split("?")[0];
          return;
        }
        img.removeAttribute("src");
        img.classList.add("thumb-broken");
        const btn = img.closest(".thumb-btn");
        if (btn) btn.classList.add("no-thumb");
      });
    });
  }

  function updatePager() {
    if (!els.pager) return;
    const showPager = !!lastQuery && (page > 1 || hasMore);
    els.pager.hidden = !showPager;
    if (els.pageLabel) els.pageLabel.textContent = "Page " + page;
    if (els.pagePrev) els.pagePrev.disabled = page <= 1;
    if (els.pageNext) els.pageNext.disabled = !hasMore;
  }

  function wireCards(root, items, mode) {
    const byId = Object.fromEntries(items.map((i) => [i.id, i]));
    root.querySelectorAll(".card").forEach((card) => {
      const item = byId[card.dataset.id];
      if (!item) return;
      card.querySelectorAll("[data-open]").forEach((btn) => {
        btn.addEventListener("click", (e) => {
          e.preventDefault();
          window.open(playerUrl(item), "_blank", "noopener");
        });
      });
      const favBtn = card.querySelector("[data-fav]");
      if (favBtn) {
        favBtn.addEventListener("click", async (e) => {
          e.preventDefault();
          e.stopPropagation();
          try {
            if (mode === "fav") {
              await window.HumanityAPI.removeFavorite(item.id);
              card.remove();
            } else if (favBtn.classList.contains("danger")) {
              await window.HumanityAPI.removeFavorite(item.id);
              favBtn.classList.remove("danger");
              favBtn.textContent = "Save";
            } else {
              await window.HumanityAPI.addFavorite(item);
              favBtn.classList.add("danger");
              favBtn.textContent = "Unsave";
            }
          } catch (err) {
            alert(String(err.message || err));
            if (err.code === 401) boot();
          }
        });
      }
    });
    wireThumbFallback(root);
    window.HumanityPreview.bind(root);
  }

  async function runSearch(ev, opts) {
    if (ev) ev.preventDefault();
    const q = els.q.value.trim();
    if (!q) return;
    const reset = !opts || opts.reset !== false;
    const fromUrl = opts && opts.fromUrl;
    if (reset) page = 1;
    lastQuery = q;
    if (!fromUrl) writeRoute(q, page, !!opts && opts.replaceUrl);
    els.status.textContent = "Searching…";
    els.results.innerHTML = '<div class="skel"></div>'.repeat(8);
    updatePager();
    try {
      const d = await window.HumanityAPI.search(q, sourceValue(), page);
      const items = (d && d.items) || [];
      hasMore = !!(d && d.hasMore);
      if (!items.length) {
        const errBits =
          d && d.errors
            ? Object.entries(d.errors)
                .map(([k, v]) => k + ": " + v)
                .join(" · ")
            : "";
        els.results.innerHTML =
          '<div class="empty">No results' +
          (errBits
            ? "<br/><span class='tiny'>" + escapeHtml(errBits) + "</span>"
            : "") +
          "</div>";
        els.status.textContent = page > 1 ? "Page " + page + " empty" : "";
        updatePager();
        return;
      }
      els.status.textContent =
        items.length +
        " results · page " +
        page +
        (d.errors ? " (some sources failed)" : "");
      els.results.innerHTML = items.map((i) => cardHtml(i)).join("");
      wireCards(els.results, items, "search");
      updatePager();
      if (els.appScroll) els.appScroll.scrollTop = 0;
    } catch (err) {
      els.results.innerHTML =
        '<div class="empty">' + escapeHtml(err.message || err) + "</div>";
      els.status.textContent = "";
      hasMore = false;
      updatePager();
      if (err.code === 401) boot();
    }
  }

  async function openFavorites() {
    show("fav");
    els.favList.innerHTML = '<div class="skel"></div>'.repeat(4);
    try {
      const d = await window.HumanityAPI.listFavorites();
      const items = (d && d.items) || [];
      if (!items.length) {
        els.favList.innerHTML = '<div class="empty">No favorites yet</div>';
        return;
      }
      els.favList.innerHTML = items
        .map((i) => cardHtml(i, { saved: true }))
        .join("");
      wireCards(els.favList, items, "fav");
    } catch (err) {
      els.favList.innerHTML =
        '<div class="empty">' + escapeHtml(err.message || err) + "</div>";
      if (err.code === 401) boot();
    }
  }

  function wirePullToRefresh(pane, indicator, onRefresh) {
    if (!pane || !indicator) return;
    let startY = 0;
    let pulling = false;
    let refreshing = false;

    pane.addEventListener(
      "touchstart",
      (e) => {
        if (pane.scrollTop > 0 || refreshing) return;
        startY = e.touches[0].clientY;
        pulling = true;
      },
      { passive: true }
    );

    pane.addEventListener(
      "touchmove",
      (e) => {
        if (!pulling || refreshing) return;
        const dy = e.touches[0].clientY - startY;
        if (dy > 12 && pane.scrollTop <= 0) {
          indicator.hidden = false;
          indicator.textContent =
            dy > 70 ? "Release to refresh" : "Pull to refresh";
          indicator.style.setProperty("--ptr-y", Math.min(56, dy * 0.35) + "px");
          if (dy > 70 && e.cancelable) e.preventDefault();
        }
      },
      { passive: false }
    );

    pane.addEventListener(
      "touchend",
      async (e) => {
        if (!pulling) return;
        pulling = false;
        const dy =
          (e.changedTouches[0] && e.changedTouches[0].clientY) - startY;
        indicator.style.setProperty("--ptr-y", "0px");
        if (dy > 70 && pane.scrollTop <= 0 && !refreshing) {
          refreshing = true;
          indicator.hidden = false;
          indicator.textContent = "Refreshing…";
          try {
            await onRefresh();
          } finally {
            refreshing = false;
            indicator.hidden = true;
          }
        } else {
          indicator.hidden = true;
        }
      },
      { passive: true }
    );
  }

  function setLoginLoading(on) {
    loggingIn = !!on;
    if (!els.loginBtn) return;
    els.loginBtn.disabled = !!on;
    els.loginBtn.classList.toggle("is-loading", !!on);
    els.loginBtn.setAttribute("aria-busy", on ? "true" : "false");
  }

  async function onLogin(ev) {
    ev.preventDefault();
    if (loggingIn) return;
    els.loginErr.textContent = "";
    setLoginLoading(true);
    try {
      await window.HumanityAPI.login(
        els.email.value.trim(),
        els.password.value
      );
      show("app");
      const route = readRoute();
      if (route.q) {
        els.q.value = route.q;
        page = route.page;
        await runSearch(null, { reset: false, fromUrl: true, replaceUrl: true });
      } else {
        els.q.focus();
      }
    } catch (err) {
      els.loginErr.textContent = String(err.message || err);
    } finally {
      setLoginLoading(false);
    }
  }

  async function boot() {
    const route = readRoute();
    if (route.source && sourceCtl) sourceCtl.setValue(route.source);
    if (window.HumanityAPI.getToken()) {
      show("app");
      const sess = await window.HumanityAPI.check();
      if (!sess) {
        show("login");
        return;
      }
      if (route.q) {
        els.q.value = route.q;
        page = route.page;
        await runSearch(null, { reset: false, fromUrl: true, replaceUrl: true });
      }
      return;
    }
    show("login");
  }

  sourceCtl = window.HumanitySelect.mount(
    els.sourceSelect,
    [
      { value: "all", label: "All sources" },
      { value: "pornhub", label: "Pornhub" },
      { value: "xvideos", label: "XVideos" },
      { value: "eporner", label: "Eporner" },
    ],
    "all",
    () => {
      if (!lastQuery && !els.q.value.trim()) {
        writeRoute("", 1, true);
        return;
      }
      // 切换源：重置到第 1 页并重新搜索
      page = 1;
      runSearch(null, { reset: true });
    }
  );

  els.loginForm.addEventListener("submit", onLogin);
  els.searchForm.addEventListener("submit", (e) =>
    runSearch(e, { reset: true })
  );
  els.favBtn.addEventListener("click", openFavorites);
  els.backBtn.addEventListener("click", () => show("app"));
  els.logoutBtn.addEventListener("click", async () => {
    await window.HumanityAPI.logout();
    show("login");
  });

  if (els.pagePrev) {
    els.pagePrev.addEventListener("click", () => {
      if (page <= 1) return;
      page -= 1;
      runSearch(null, { reset: false });
    });
  }
  if (els.pageNext) {
    els.pageNext.addEventListener("click", () => {
      if (!hasMore) return;
      page += 1;
      runSearch(null, { reset: false });
    });
  }

  window.addEventListener("popstate", () => {
    if (syncingUrl) return;
    if (!window.HumanityAPI.getToken()) return;
    const route = readRoute();
    if (route.source && sourceCtl) sourceCtl.setValue(route.source);
    if (!route.q) {
      lastQuery = "";
      page = 1;
      hasMore = false;
      els.q.value = "";
      els.results.innerHTML = "";
      els.status.textContent = "";
      updatePager();
      return;
    }
    els.q.value = route.q;
    page = route.page;
    runSearch(null, { reset: false, fromUrl: true });
  });

  els.q.addEventListener("focus", () => {
    els.q.setAttribute("readonly", "readonly");
    requestAnimationFrame(() => els.q.removeAttribute("readonly"));
  });

  wirePullToRefresh(els.appScroll, els.ptrApp, async () => {
    if (els.q.value.trim()) await runSearch(null, { reset: false, replaceUrl: true });
  });
  wirePullToRefresh(els.favScroll, els.ptrFav, async () => {
    await openFavorites();
  });

  updatePager();
  boot();
})();
