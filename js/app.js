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
    profileBtn: document.getElementById("profileBtn"),
    backBtn: document.getElementById("backBtn"),
    favList: document.getElementById("favList"),
    actorList: document.getElementById("actorList"),
    addActorBtn: document.getElementById("addActorBtn"),
    actorForm: document.getElementById("actorForm"),
    actorName: document.getElementById("actorName"),
    logoutBtn: document.getElementById("logoutBtn"),
    appScroll: document.getElementById("appScroll"),
    favScroll: document.getElementById("favScroll"),
    ptrApp: document.getElementById("ptrApp"),
    ptrFav: document.getElementById("ptrFav"),
    loginLang: document.getElementById("loginLangSelect"),
    lang: document.getElementById("langSelect"),
    themeBtn: document.getElementById("themeBtn"),
    loginThemeBtn: document.getElementById("loginThemeBtn"),
    showPwdForm: document.getElementById("showPwdForm"),
    pwdForm: document.getElementById("pwdForm"),
    pwdEmail: document.getElementById("pwdEmail"),
    pwdCurrent: document.getElementById("pwdCurrent"),
    pwdNew: document.getElementById("pwdNew"),
    pwdConfirm: document.getElementById("pwdConfirm"),
    pwdSave: document.getElementById("pwdSave"),
    pwdErr: document.getElementById("pwdErr"),
    backToLogin: document.getElementById("backToLogin"),
    playModal: document.getElementById("playModal"),
    playFrame: document.getElementById("playFrame"),
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
    document.querySelectorAll("[data-i18n-placeholder]").forEach((node) => {
      node.placeholder = window.ht(node.getAttribute("data-i18n-placeholder"));
    });
    if (els.q) els.q.placeholder = window.ht("search");
    if (els.profileBtn) {
      els.profileBtn.title = window.ht("profile");
      els.profileBtn.setAttribute("aria-label", window.ht("profile"));
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

  function wirePwdToggles(root) {
    (root || document).querySelectorAll("[data-pwd-toggle]").forEach((btn) => {
      if (btn.dataset.wired) return;
      btn.dataset.wired = "1";
      btn.addEventListener("click", () => {
        const wrap = btn.closest(".pwd-wrap");
        const input = wrap && wrap.querySelector("input");
        if (!input) return;
        const show = input.type === "password";
        input.type = show ? "text" : "password";
        const eyeShow = btn.querySelector(".pwd-eye-show");
        const eyeHide = btn.querySelector(".pwd-eye-hide");
        if (eyeShow) eyeShow.hidden = show;
        if (eyeHide) eyeHide.hidden = !show;
        btn.setAttribute(
          "aria-label",
          show ? window.ht("hidePassword") : window.ht("showPassword")
        );
      });
    });
  }

  function showLoginCard() {
    if (els.loginForm) els.loginForm.hidden = false;
    if (els.pwdForm) els.pwdForm.hidden = true;
    if (els.pwdErr) els.pwdErr.textContent = "";
  }

  function showPwdCard() {
    if (els.loginForm) els.loginForm.hidden = true;
    if (els.pwdForm) els.pwdForm.hidden = false;
    if (els.loginErr) els.loginErr.textContent = "";
    if (els.pwdEmail && els.email && !els.pwdEmail.value) {
      els.pwdEmail.value = els.email.value;
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
      preview: item.preview || null,
      duration: item.duration || null,
      quality: item.quality || null,
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

  function openPlayModal(item) {
    if (!els.playModal || !els.playFrame) {
      window.open(playerUrl(item), "_blank", "noopener");
      return;
    }
    const href = playerUrl(item);
    els.playFrame.src = href;
    els.playModal.hidden = false;
    els.playModal.classList.add("is-open");
    els.playModal.setAttribute("aria-hidden", "false");
    document.body.classList.add("play-open");
  }

  function closePlayModal() {
    if (!els.playModal) return;
    els.playModal.classList.remove("is-open");
    els.playModal.hidden = true;
    els.playModal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("play-open");
    if (els.playFrame) {
      try {
        els.playFrame.src = "about:blank";
      } catch (_) {
        els.playFrame.removeAttribute("src");
      }
    }
  }

  function cardHtml(item, opts) {
    const thumb = item.thumb || "";
    const preview = item.preview || thumb;
    const saved = opts && opts.saved;
    const channel = item.sourceLabel || item.source || "";
    const duration = item.duration ? String(item.duration) : "";
    const quality = item.quality ? String(item.quality) : "";
    return `<article class="card" data-id="${escapeHtml(item.id)}">
      <button type="button" class="thumb-btn" data-open data-thumb="${escapeHtml(
        thumb
      )}" data-preview="${escapeHtml(preview)}">
        <img src="${escapeHtml(thumb)}" alt="" loading="lazy" decoding="async" data-fallback />
        <span class="src-tag">${escapeHtml(channel)}</span>
        ${
          quality
            ? `<span class="quality-badge">${escapeHtml(quality)}</span>`
            : ""
        }
        ${
          duration
            ? `<span class="duration-badge">${escapeHtml(duration)}</span>`
            : ""
        }
      </button>
      <div class="card-body">
        <h3 class="title">${escapeHtml(item.title || "")}</h3>
        <div class="card-actions">
          <button type="button" class="btn ${saved ? "danger" : ""}" data-fav>${
            saved ? window.ht("unsave") : window.ht("save")
          }</button>
          <button type="button" class="btn ghost btn-open" data-open-tab title="${escapeHtml(
            window.ht("openWindow")
          )}" aria-label="${escapeHtml(window.ht("openWindow"))}">↗</button>
        </div>
      </div>
    </article>`;
  }

  function wireThumbFallback(root) {
    root.querySelectorAll("img[data-fallback]").forEach((img) => {
      if (img.dataset.fbWired) return;
      img.dataset.fbWired = "1";
      const btn = img.closest(".thumb-btn");
      const primary = img.getAttribute("src") || "";
      const preview = (btn && btn.getAttribute("data-preview")) || "";
      const queue = [];
      const seen = new Set();
      function pushAlt(u) {
        const s = String(u || "").trim();
        if (!s || seen.has(s) || s === primary) return;
        seen.add(s);
        queue.push(s);
      }
      if (/THUMBNUM/i.test(primary)) {
        ["16", "9", "8", "1", "15", "5"].forEach((n) =>
          pushAlt(primary.replace(/THUMBNUM/gi, n))
        );
      }
      // ei.phncdn 帧号：... )0.jpg → 试其它帧
      const frame = primary.match(/^(.*\))(\d+)(\.jpe?g)(\?[^#]*)?(#.*)?$/i);
      if (frame) {
        [1, 8, 9, 16, 5, 0].forEach((n) => {
          if (String(n) === frame[2]) return;
          pushAlt(
            frame[1] + n + frame[3] + (frame[4] || "") + (frame[5] || "")
          );
        });
      }
      // 仅当预览是静态图时才可作封面兜底（不要用 webm）
      if (/\.(jpe?g|png|webp)(\?|#|$)/i.test(preview)) pushAlt(preview);
      // 切勿去掉 ?hash=&validto= 等签名参数，否则 CDN 直接 403

      let primaryRetries = 0;
      if (!primary) {
        img.classList.add("thumb-broken");
        if (btn) btn.classList.add("no-thumb");
        return;
      }

      img.addEventListener("error", function onErr() {
        const cur = img.getAttribute("src") || "";
        if (cur === primary && primaryRetries < 1) {
          primaryRetries += 1;
          img.removeAttribute("src");
          requestAnimationFrame(() => {
            img.src = primary;
          });
          return;
        }
        if (queue.length) {
          img.src = queue.shift();
          return;
        }
        img.removeEventListener("error", onErr);
        img.removeAttribute("src");
        img.classList.add("thumb-broken");
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
          openPlayModal(item);
        });
      });
      const tabBtn = card.querySelector("[data-open-tab]");
      if (tabBtn) {
        tabBtn.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          window.open(playerUrl(item), "_blank", "noopener");
        });
      }
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

  function renderActors(actors) {
    if (!els.actorList) return;
    const list = Array.isArray(actors) ? actors : [];
    if (!list.length) {
      els.actorList.innerHTML =
        '<div class="empty actor-empty">' +
        escapeHtml(window.ht("noActors")) +
        "</div>";
      return;
    }
    els.actorList.innerHTML = list
      .map(
        (a) =>
          `<div class="actor-chip" data-name="${escapeHtml(a.name || "")}">
            <button type="button" class="actor-name" data-actor-search>${escapeHtml(
              a.name || ""
            )}</button>
            <button type="button" class="actor-remove" data-actor-remove aria-label="${escapeHtml(
              window.ht("unsave")
            )}">×</button>
          </div>`
      )
      .join("");
    els.actorList.querySelectorAll("[data-actor-search]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const name =
          (btn.closest(".actor-chip") &&
            btn.closest(".actor-chip").getAttribute("data-name")) ||
          btn.textContent;
        searchActor(name);
      });
    });
    els.actorList.querySelectorAll("[data-actor-remove]").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        e.preventDefault();
        e.stopPropagation();
        const chip = btn.closest(".actor-chip");
        const name = chip && chip.getAttribute("data-name");
        if (!name) return;
        try {
          await window.HumanityAPI.removeActor(name);
          chip.remove();
          if (!els.actorList.querySelector(".actor-chip")) {
            renderActors([]);
          }
        } catch (err) {
          alert(String(err.message || err));
          if (err.code === 401) boot();
        }
      });
    });
  }

  function searchActor(name) {
    const q = String(name || "").trim();
    if (!q) return;
    show("app");
    if (els.actorForm) els.actorForm.hidden = true;
    els.q.value = q;
    page = 1;
    runSearch(null, { reset: true });
  }

  async function openFavorites() {
    show("fav");
    if (els.actorForm) els.actorForm.hidden = true;
    if (els.actorName) els.actorName.value = "";
    if (els.actorList) {
      els.actorList.innerHTML = '<div class="skel actor-skel"></div>';
    }
    els.favList.innerHTML = '<div class="skel"></div>'.repeat(4);
    try {
      const d = await window.HumanityAPI.listFavorites();
      const items = (d && d.items) || [];
      const actors = (d && d.actors) || [];
      renderActors(actors);
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
      if (els.actorList) {
        els.actorList.innerHTML =
          '<div class="empty">' + escapeHtml(err.message || err) + "</div>";
      }
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

  wirePwdToggles(document);
  showLoginCard();

  if (els.showPwdForm) {
    els.showPwdForm.addEventListener("click", showPwdCard);
  }
  if (els.backToLogin) {
    els.backToLogin.addEventListener("click", showLoginCard);
  }
  if (els.pwdForm) {
    els.pwdForm.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      if (!els.pwdSave) return;
      els.pwdErr.textContent = "";
      const email = els.pwdEmail.value.trim();
      const cur = els.pwdCurrent.value;
      const next = els.pwdNew.value;
      const conf = els.pwdConfirm.value;
      if (next.length < 8) {
        els.pwdErr.textContent = window.ht("passwordTooShort");
        return;
      }
      if (next !== conf) {
        els.pwdErr.textContent = window.ht("passwordMismatch");
        return;
      }
      els.pwdSave.disabled = true;
      try {
        await window.HumanityAPI.changePassword(email, cur, next);
        els.pwdErr.textContent = window.ht("passwordChanged");
        els.pwdCurrent.value = "";
        els.pwdNew.value = "";
        els.pwdConfirm.value = "";
        if (els.email) els.email.value = email;
        setTimeout(showLoginCard, 800);
      } catch (err) {
        els.pwdErr.textContent = String(err.message || err);
      } finally {
        els.pwdSave.disabled = false;
      }
    });
  }

  els.loginForm.addEventListener("submit", onLogin);
  els.searchForm.addEventListener("submit", (e) =>
    runSearch(e, { reset: true })
  );
  if (els.profileBtn) {
    els.profileBtn.addEventListener("click", openFavorites);
  }
  els.backBtn.addEventListener("click", () => show("app"));
  if (els.logoutBtn) {
    els.logoutBtn.addEventListener("click", async () => {
      await window.HumanityAPI.logout();
      showLoginCard();
      show("login");
    });
  }
  if (els.themeBtn) els.themeBtn.addEventListener("click", toggleTheme);
  if (els.loginThemeBtn) els.loginThemeBtn.addEventListener("click", toggleTheme);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closePlayModal();
  });
  window.addEventListener("message", (e) => {
    const data = e && e.data;
    if (data && data.type === "humanity-play-close") closePlayModal();
  });

  if (els.addActorBtn && els.actorForm) {
    els.addActorBtn.addEventListener("click", () => {
      const open = els.actorForm.hidden;
      els.actorForm.hidden = !open;
      if (open && els.actorName) {
        els.actorName.focus();
      }
    });
  }
  if (els.actorForm) {
    els.actorForm.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      const name = els.actorName ? els.actorName.value.trim() : "";
      if (!name) return;
      try {
        await window.HumanityAPI.addActor(name);
        if (els.actorName) els.actorName.value = "";
        els.actorForm.hidden = true;
        await openFavorites();
      } catch (err) {
        alert(String(err.message || err));
        if (err.code === 401) boot();
      }
    });
  }

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
