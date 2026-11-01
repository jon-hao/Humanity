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
    accountBtn: document.getElementById("accountBtn"),
    appScroll: document.getElementById("appScroll"),
    favScroll: document.getElementById("favScroll"),
    ptrApp: document.getElementById("ptrApp"),
    ptrFav: document.getElementById("ptrFav"),
    loginLang: document.getElementById("loginLangSelect"),
    lang: document.getElementById("langSelect"),
    themeBtn: document.getElementById("themeBtn"),
    loginThemeBtn: document.getElementById("loginThemeBtn"),
    modal: document.getElementById("modal"),
    sheet: document.getElementById("sheet"),
  };

  let sourceCtl = null;
  let loginLangCtl = null;
  let langCtl = null;
  let loggingIn = false;
  let page = 1;
  let hasMore = false;
  let lastQuery = "";
  let feedLoaded = false;
  let syncingUrl = false;
  let sourceOptions = [{ value: "all", label: "All sources" }];
  const PLAY_STORE_PREFIX = "humanity-play:";

  function escapeHtml(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function langOptions() {
    return [
      { value: "zh", label: "简体中文" },
      { value: "zh-TW", label: "繁體中文" },
      { value: "en", label: "English" },
    ];
  }

  function applyTheme() {
    const theme = window.HumanityState.theme || "dark";
    document.documentElement.setAttribute("data-theme", theme);
    const title =
      theme === "dark" ? window.ht("themeLight") : window.ht("themeDark");
    [els.themeBtn, els.loginThemeBtn].forEach((btn) => {
      if (!btn) return;
      btn.title = title;
      btn.setAttribute("aria-label", title);
    });
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", theme === "light" ? "#f2eee8" : "#0c0f14");
  }

  function toggleTheme() {
    window.HumanityState.theme =
      window.HumanityState.theme === "dark" ? "light" : "dark";
    localStorage.setItem("humanity-theme", window.HumanityState.theme);
    applyTheme();
  }

  function applyLang() {
    const lang = window.HumanityState.lang || "zh";
    document.documentElement.lang =
      lang === "zh-TW" ? "zh-TW" : lang === "en" ? "en" : "zh-CN";
    document.querySelectorAll("[data-i18n]").forEach((node) => {
      node.textContent = window.ht(node.getAttribute("data-i18n"));
    });
    if (els.q) els.q.placeholder = window.ht("search");
    if (els.favBtn) {
      els.favBtn.title = window.ht("favorites");
      els.favBtn.setAttribute("aria-label", window.ht("favorites"));
    }
    if (els.backBtn) {
      els.backBtn.title = window.ht("back");
      els.backBtn.setAttribute("aria-label", window.ht("back"));
    }
    if (loginLangCtl) loginLangCtl.refresh(langOptions(), lang);
    if (langCtl) langCtl.refresh(langOptions(), lang);
    applyTheme();
    updatePager();
  }

  function setLang(v) {
    window.HumanityState.lang = v || "zh";
    localStorage.setItem("humanity-lang", window.HumanityState.lang);
    applyLang();
  }

  function openModal(html) {
    if (!els.modal || !els.sheet) return;
    els.sheet.innerHTML = html;
    els.modal.classList.add("open");
    els.modal.setAttribute("aria-hidden", "false");
    els.sheet.querySelectorAll("[data-close]").forEach((b) => {
      b.addEventListener("click", closeModal);
    });
  }

  function closeModal() {
    if (!els.modal) return;
    els.modal.classList.remove("open");
    els.modal.setAttribute("aria-hidden", "true");
  }

  function openAccountSheet() {
    const email = (window.HumanityAPI.getEmail && window.HumanityAPI.getEmail()) || "";
    openModal(
      '<div class="sheet-head"><h2>' +
        escapeHtml(window.ht("account")) +
        '</h2><button type="button" class="icon-btn" data-close aria-label="' +
        escapeHtml(window.ht("close")) +
        '">×</button></div><div class="account-sheet">' +
        '<p class="account-email">' +
        escapeHtml(email) +
        "</p><h3 class=\"account-sub\">" +
        escapeHtml(window.ht("changePassword")) +
        "</h3>" +
        '<label class="account-field"><span>' +
        escapeHtml(window.ht("currentPassword")) +
        '</span><input id="pwdCurrent" type="password" autocomplete="current-password" /></label>' +
        '<label class="account-field"><span>' +
        escapeHtml(window.ht("newPassword")) +
        '</span><input id="pwdNew" type="password" autocomplete="new-password" /></label>' +
        '<label class="account-field"><span>' +
        escapeHtml(window.ht("confirmPassword")) +
        '</span><input id="pwdConfirm" type="password" autocomplete="new-password" /></label>' +
        '<p id="pwdErr" class="err" role="alert"></p>' +
        '<button type="button" class="btn primary" id="pwdSave">' +
        escapeHtml(window.ht("savePassword")) +
        "</button>" +
        '<button type="button" class="text-btn account-logout" id="accountLogout">' +
        escapeHtml(window.ht("logout")) +
        "</button></div>"
    );
    const err = els.sheet.querySelector("#pwdErr");
    const save = els.sheet.querySelector("#pwdSave");
    const logoutBtn = els.sheet.querySelector("#accountLogout");
    if (save) {
      save.addEventListener("click", async () => {
        err.textContent = "";
        const cur = els.sheet.querySelector("#pwdCurrent").value;
        const next = els.sheet.querySelector("#pwdNew").value;
        const conf = els.sheet.querySelector("#pwdConfirm").value;
        if (next.length < 8) {
          err.textContent = window.ht("passwordTooShort");
          return;
        }
        if (next !== conf) {
          err.textContent = window.ht("passwordMismatch");
          return;
        }
        save.disabled = true;
        try {
          await window.HumanityAPI.changePassword(cur, next);
          err.textContent = window.ht("passwordChanged");
          els.sheet.querySelector("#pwdCurrent").value = "";
          els.sheet.querySelector("#pwdNew").value = "";
          els.sheet.querySelector("#pwdConfirm").value = "";
        } catch (e) {
          err.textContent = String(e.message || e);
        } finally {
          save.disabled = false;
        }
      });
    }
    if (logoutBtn) {
      logoutBtn.addEventListener("click", async () => {
        await window.HumanityAPI.logout();
        closeModal();
        show("login");
      });
    }
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
    if (query) sp.set("query", query);
    if (pageNo > 1) sp.set("page", String(pageNo));
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

  function stashPlay(item) {
    const payload = JSON.stringify({
      id: item.id,
      page: item.url || null,
      embed: item.embed || null,
      source: item.source || null,
      title: item.title || null,
      poster: item.thumb || null,
      at: Date.now(),
    });
    // 新标签页读不到 sessionStorage，必须用 localStorage
    try {
      localStorage.setItem(PLAY_STORE_PREFIX + item.id, payload);
    } catch (_) {}
    try {
      sessionStorage.setItem(PLAY_STORE_PREFIX + item.id, payload);
    } catch (_) {}
  }

  function playerUrl(item) {
    stashPlay(item);
    const u = new URL("player.html", location.href);
    if (item.id) u.searchParams.set("id", item.id);
    if (item.title) u.searchParams.set("title", item.title);
    return u.href;
  }

  function cardHtml(item, opts) {
    const thumb = item.thumb || "";
    const preview = item.preview || thumb;
    const saved = opts && opts.saved;
    const channel = item.sourceLabel || item.source || "";
    return `<article class="card" data-id="${escapeHtml(item.id)}">
      <button type="button" class="thumb-btn" data-open data-thumb="${escapeHtml(
        thumb
      )}" data-preview="${escapeHtml(preview)}">
        <img src="${escapeHtml(thumb)}" alt="" loading="lazy" referrerpolicy="no-referrer" data-fallback />
        <span class="src-tag">${escapeHtml(channel)}</span>
      </button>
      <div class="card-body">
        <h3 class="title">${escapeHtml(item.title || "")}</h3>
        <div class="card-actions">
          <button type="button" class="btn ${saved ? "danger" : ""}" data-fav>${
            saved ? window.ht("unsave") : window.ht("save")
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
    const showPager = feedLoaded && (page > 1 || hasMore);
    els.pager.hidden = !showPager;
    if (els.pageLabel) {
      els.pageLabel.textContent = window.ht("page") + " " + page;
    }
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
              favBtn.textContent = window.ht("save");
            } else {
              await window.HumanityAPI.addFavorite(item);
              favBtn.classList.add("danger");
              favBtn.textContent = window.ht("unsave");
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
    const reset = !opts || opts.reset !== false;
    const fromUrl = opts && opts.fromUrl;
    if (reset) page = 1;
    lastQuery = q;
    feedLoaded = true;
    if (!fromUrl) writeRoute(q, page, !!opts && opts.replaceUrl);
    els.status.textContent = "…";
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
          '<div class="empty">—</div>' +
          (errBits
            ? "<div class='empty tiny'>" + escapeHtml(errBits) + "</div>"
            : "");
        els.status.textContent = "";
        updatePager();
        return;
      }
      const modeLabel = q ? "" : window.ht("recommended") + " · ";
      els.status.textContent =
        modeLabel +
        items.length +
        " " +
        window.ht("results") +
        " · " +
        window.ht("page") +
        " " +
        page +
        (d.errors ? window.ht("partial") : "");
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
        els.favList.innerHTML =
          '<div class="empty">' + escapeHtml(window.ht("noFavorites")) + "</div>";
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
            dy > 70 ? window.ht("releaseRefresh") : window.ht("pullRefresh");
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
          indicator.textContent = window.ht("refreshing");
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

  function onSourceChange() {
    page = 1;
    runSearch(null, { reset: true });
  }

  function mountSources(options, selected) {
    sourceOptions =
      Array.isArray(options) && options.length
        ? options.map((o) => ({
            value: String(o.value),
            label: String(o.label || o.value),
          }))
        : [{ value: "all", label: "All sources" }];
    const initial =
      selected && sourceOptions.some((o) => o.value === selected)
        ? selected
        : sourceOptions[0].value;
    if (!els.sourceSelect) return;
    if (sourceCtl && typeof sourceCtl.refresh === "function") {
      sourceCtl.refresh(sourceOptions, initial);
      return;
    }
    sourceCtl = window.HumanitySelect.mount(
      els.sourceSelect,
      sourceOptions,
      initial,
      onSourceChange
    );
  }

  async function loadSources(preferred) {
    const d = await window.HumanityAPI.meta();
    mountSources((d && d.sources) || sourceOptions, preferred || sourceValue());
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
      await loadSources(route.source);
      els.q.value = route.q || "";
      page = route.page || 1;
      await runSearch(null, {
        reset: false,
        fromUrl: true,
        replaceUrl: true,
      });
    } catch (err) {
      els.loginErr.textContent = String(err.message || err);
    } finally {
      setLoginLoading(false);
    }
  }

  async function boot() {
    applyTheme();
    applyLang();
    const route = readRoute();
    mountSources(sourceOptions, route.source || "all");
    if (window.HumanityAPI.getToken()) {
      show("app");
      const sess = await window.HumanityAPI.check();
      if (!sess) {
        show("login");
        return;
      }
      try {
        await loadSources(route.source);
      } catch (err) {
        if (err && err.code === 401) {
          show("login");
          return;
        }
      }
      els.q.value = route.q || "";
      page = route.page || 1;
      await runSearch(null, {
        reset: false,
        fromUrl: true,
        replaceUrl: true,
      });
      return;
    }
    show("login");
  }

  if (els.loginLang) {
    loginLangCtl = window.HumanitySelect.mount(
      els.loginLang,
      langOptions(),
      window.HumanityState.lang,
      setLang
    );
  }
  if (els.lang) {
    langCtl = window.HumanitySelect.mount(
      els.lang,
      langOptions(),
      window.HumanityState.lang,
      setLang
    );
  }

  els.loginForm.addEventListener("submit", onLogin);
  els.searchForm.addEventListener("submit", (e) =>
    runSearch(e, { reset: true })
  );
  els.favBtn.addEventListener("click", openFavorites);
  els.backBtn.addEventListener("click", () => show("app"));
  if (els.accountBtn) {
    els.accountBtn.addEventListener("click", openAccountSheet);
  }
  if (els.themeBtn) els.themeBtn.addEventListener("click", toggleTheme);
  if (els.loginThemeBtn) els.loginThemeBtn.addEventListener("click", toggleTheme);
  if (els.modal) {
    els.modal.addEventListener("click", (e) => {
      if (e.target === els.modal) closeModal();
    });
  }
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeModal();
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
    els.q.value = route.q || "";
    page = route.page || 1;
    runSearch(null, { reset: false, fromUrl: true });
  });

  els.q.addEventListener("focus", () => {
    els.q.setAttribute("readonly", "readonly");
    requestAnimationFrame(() => els.q.removeAttribute("readonly"));
  });

  wirePullToRefresh(els.appScroll, els.ptrApp, async () => {
    if (feedLoaded) await runSearch(null, { reset: false, replaceUrl: true });
  });
  wirePullToRefresh(els.favScroll, els.ptrFav, async () => {
    await openFavorites();
  });

  updatePager();
  boot();
})();
