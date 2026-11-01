(function () {
  const els = {
    login: document.getElementById("loginView"),
    app: document.getElementById("appView"),
    fav: document.getElementById("favView"),
    loginForm: document.getElementById("loginForm"),
    loginErr: document.getElementById("loginErr"),
    email: document.getElementById("email"),
    password: document.getElementById("password"),
    q: document.getElementById("q"),
    source: document.getElementById("source"),
    searchForm: document.getElementById("searchForm"),
    results: document.getElementById("results"),
    status: document.getElementById("status"),
    favBtn: document.getElementById("favBtn"),
    backBtn: document.getElementById("backBtn"),
    favList: document.getElementById("favList"),
    logoutBtn: document.getElementById("logoutBtn"),
    appScroll: document.getElementById("appScroll"),
    favScroll: document.getElementById("favScroll"),
    ptrApp: document.getElementById("ptrApp"),
    ptrFav: document.getElementById("ptrFav"),
  };

  function escapeHtml(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function show(view) {
    els.login.hidden = view !== "login";
    els.app.hidden = view !== "app";
    els.fav.hidden = view !== "fav";
  }

  function playerUrl(item) {
    const u = new URL("player.html", location.href);
    if (item.embed) u.searchParams.set("embed", item.embed);
    if (item.url) u.searchParams.set("page", item.url);
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
        <img src="${escapeHtml(thumb)}" alt="" loading="lazy" referrerpolicy="no-referrer" />
        <span class="src-tag">${escapeHtml(item.source || "")}</span>
      </button>
      <div class="card-body">
        <h3 class="title">${escapeHtml(item.title || "")}</h3>
        <div class="card-actions">
          <button type="button" class="btn ghost" data-open>Play</button>
          <button type="button" class="btn ${saved ? "danger" : ""}" data-fav>${
            saved ? "Unsave" : "Save"
          }</button>
        </div>
      </div>
    </article>`;
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
    window.HumanityPreview.bind(root);
  }

  async function runSearch(ev) {
    if (ev) ev.preventDefault();
    const q = els.q.value.trim();
    if (!q) return;
    els.status.textContent = "Searching…";
    els.results.innerHTML = '<div class="skel"></div>'.repeat(8);
    try {
      const d = await window.HumanityAPI.search(q, els.source.value, 1);
      const items = (d && d.items) || [];
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
        els.status.textContent = "";
        return;
      }
      els.status.textContent =
        items.length +
        " results" +
        (d.errors ? " (some sources failed)" : "");
      els.results.innerHTML = items.map((i) => cardHtml(i)).join("");
      wireCards(els.results, items, "search");
    } catch (err) {
      els.results.innerHTML =
        '<div class="empty">' + escapeHtml(err.message || err) + "</div>";
      els.status.textContent = "";
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
          indicator.textContent = dy > 70 ? "Release to refresh" : "Pull to refresh";
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

  async function onLogin(ev) {
    ev.preventDefault();
    els.loginErr.textContent = "";
    els.loginForm.querySelector("button[type=submit]").disabled = true;
    try {
      await window.HumanityAPI.login(els.email.value.trim(), els.password.value);
      show("app");
      els.q.focus();
    } catch (err) {
      els.loginErr.textContent = String(err.message || err);
    } finally {
      els.loginForm.querySelector("button[type=submit]").disabled = false;
    }
  }

  async function boot() {
    const sess = await window.HumanityAPI.check();
    if (sess) {
      show("app");
    } else {
      show("login");
    }
  }

  els.loginForm.addEventListener("submit", onLogin);
  els.searchForm.addEventListener("submit", runSearch);
  els.favBtn.addEventListener("click", openFavorites);
  els.backBtn.addEventListener("click", () => show("app"));
  els.logoutBtn.addEventListener("click", async () => {
    await window.HumanityAPI.logout();
    show("login");
  });

  wirePullToRefresh(els.appScroll, els.ptrApp, async () => {
    if (els.q.value.trim()) await runSearch();
  });
  wirePullToRefresh(els.favScroll, els.ptrFav, async () => {
    await openFavorites();
  });

  boot();
})();
