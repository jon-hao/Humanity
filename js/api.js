window.HumanityAPI = (function () {
  const TOKEN_KEY = "humanity-token";
  const EMAIL_KEY = "humanity-email";

  function cfg() {
    return window.HumanityConfig || {};
  }

  function getToken() {
    try {
      return localStorage.getItem(TOKEN_KEY) || "";
    } catch (_) {
      return "";
    }
  }

  function getEmail() {
    try {
      return localStorage.getItem(EMAIL_KEY) || "";
    } catch (_) {
      return "";
    }
  }

  function setSession(token, email) {
    try {
      localStorage.setItem(TOKEN_KEY, token || "");
      if (email) localStorage.setItem(EMAIL_KEY, email);
    } catch (_) {}
  }

  function clearSession() {
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(EMAIL_KEY);
    } catch (_) {}
  }

  async function hapi(flow, params, opts) {
    const base = String(cfg().apiBase || "").replace(/\/$/, "");
    if (!base) throw new Error("apiBase missing");
    const q = Object.assign({ flow, app: cfg().app || "humanity" }, params || {});
    const token = getToken();
    // 同时放 header + body，避免部分环境下 CORS 预检丢掉 Authorization
    if (token && q.token == null) q.token = token;

    const method = (opts && opts.method) || "POST";
    const headers = { accept: "application/json" };
    if (token) headers.authorization = "Bearer " + token;

    let url = base;
    let body;
    if (method === "GET") {
      const qs = Object.keys(q)
        .filter((k) => q[k] != null && q[k] !== "")
        .map((k) => encodeURIComponent(k) + "=" + encodeURIComponent(q[k]))
        .join("&");
      url = base + "?" + qs;
    } else {
      headers["content-type"] = "application/json";
      body = JSON.stringify(q);
    }

    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), (opts && opts.timeout) || 45000);
    try {
      const res = await fetch(url, {
        method,
        headers,
        body,
        signal: ctrl.signal,
      });
      clearTimeout(t);
      let data = null;
      try {
        data = await res.json();
      } catch (_) {
        data = null;
      }
      if (res.status === 401) {
        clearSession();
        const err = new Error((data && data.error) || "login required");
        err.code = 401;
        throw err;
      }
      if (!res.ok) {
        throw new Error((data && data.error) || "HTTP " + res.status);
      }
      return data;
    } catch (e) {
      clearTimeout(t);
      if (e && e.code === 401) throw e;
      if (e && e.name === "AbortError") throw new Error("timeout");
      throw e;
    }
  }

  async function login(email, password) {
    const d = await hapi(
      "hauth",
      { action: "login", email, password },
      { method: "POST" }
    );
    if (!d || !d.ok || !d.token) throw new Error((d && d.error) || "login failed");
    setSession(d.token, d.email || email);
    return d;
  }

  async function check() {
    const token = getToken();
    if (!token) return null;
    try {
      const d = await hapi(
        "hauth",
        { action: "check", token },
        { method: "POST", timeout: 20000 }
      );
      if (d && d.ok) return d;
      return null;
    } catch (e) {
      // 网络/CORS 失败时保留本地 token，避免误踢回登录
      if (e && e.code === 401) return null;
      return { ok: true, email: getEmail(), offline: true };
    }
  }

  async function logout() {
    try {
      await hapi("hauth", { action: "logout" }, { method: "POST" });
    } catch (_) {}
    clearSession();
  }

  async function meta() {
    return hapi("hmeta", {}, { method: "POST", timeout: 20000 });
  }

  async function search(q, source, page) {
    return hapi(
      "hsearch",
      { q, source: source || "all", page: page || 1 },
      { method: "POST", timeout: 55000 }
    );
  }

  async function resolvePlay(opts) {
    return hapi(
      "hplay",
      {
        page: opts && opts.page,
        embed: opts && opts.embed,
        source: opts && opts.source,
      },
      { method: "POST", timeout: 40000 }
    );
  }

  async function listFavorites() {
    return hapi("hfav", { action: "list" }, { method: "POST" });
  }

  async function addFavorite(item) {
    return hapi("hfav", { action: "add", item }, { method: "POST" });
  }

  async function removeFavorite(id) {
    return hapi("hfav", { action: "remove", id }, { method: "POST" });
  }

  return {
    getToken,
    getEmail,
    setSession,
    clearSession,
    login,
    check,
    logout,
    meta,
    search,
    resolvePlay,
    listFavorites,
    addFavorite,
    removeFavorite,
  };
})();
