/** PC 悬停 / 移动端长按：静态封面 ↔ 循环预览（img 动图或 video） */
window.HumanityPreview = (function () {
  const LONG_MS = 380;

  function isVideoUrl(u) {
    return /\.(webm|mp4)(\?|#|$)/i.test(String(u || ""));
  }

  function ensureVideo(el) {
    let v = el.querySelector("video.preview-video");
    if (v) return v;
    v = document.createElement("video");
    v.className = "preview-video";
    v.muted = true;
    v.loop = true;
    v.playsInline = true;
    v.setAttribute("muted", "");
    v.setAttribute("playsinline", "");
    v.setAttribute("webkit-playsinline", "");
    v.preload = "auto";
    v.referrerPolicy = "no-referrer";
    v.setAttribute("referrerpolicy", "no-referrer");
    v.setAttribute("aria-hidden", "true");
    el.appendChild(v);
    return v;
  }

  function bind(root) {
    if (!root) return;
    root.querySelectorAll("[data-thumb][data-preview]").forEach((el) => {
      if (el.dataset.previewBound) return;
      el.dataset.previewBound = "1";
      const img = el.tagName === "IMG" ? el : el.querySelector("img");
      if (!img) return;
      const thumb = el.getAttribute("data-thumb") || img.getAttribute("src");
      const preview = el.getAttribute("data-preview") || thumb;
      let timer = null;
      let previewing = false;
      let video = null;

      function start() {
        if (previewing || !preview || preview === thumb) return;
        previewing = true;
        if (isVideoUrl(preview)) {
          video = ensureVideo(el);
          el.classList.add("is-previewing");
          if (video.src !== preview) video.src = preview;
          video.currentTime = 0;
          const p = video.play();
          if (p && typeof p.catch === "function") p.catch(() => {});
        } else {
          // 强制重新加载，避免动图只播一帧后卡在缓存末帧
          img.src = "";
          img.src = preview + (preview.includes("?") ? "&" : "?") + "_pv=" + Date.now();
        }
      }

      function stop() {
        if (timer) {
          clearTimeout(timer);
          timer = null;
        }
        if (!previewing) return;
        previewing = false;
        el.classList.remove("is-previewing");
        if (video) {
          try {
            video.pause();
            video.removeAttribute("src");
            video.load();
          } catch (_) {}
        }
        img.src = thumb;
      }

      el.addEventListener("mouseenter", start);
      el.addEventListener("mouseleave", stop);
      el.addEventListener(
        "touchstart",
        (e) => {
          if (e.touches.length > 1) return;
          timer = setTimeout(start, LONG_MS);
        },
        { passive: true }
      );
      el.addEventListener("touchend", stop, { passive: true });
      el.addEventListener("touchcancel", stop, { passive: true });
      el.addEventListener(
        "touchmove",
        () => {
          if (timer) {
            clearTimeout(timer);
            timer = null;
          }
        },
        { passive: true }
      );
    });
  }

  return { bind };
})();
