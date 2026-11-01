/** PC 悬停 / 移动端长按：静态封面 ↔ 预览动图 */
window.HumanityPreview = (function () {
  const LONG_MS = 380;

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

      function start() {
        if (previewing || !preview || preview === thumb) return;
        previewing = true;
        img.src = preview;
      }
      function stop() {
        if (timer) {
          clearTimeout(timer);
          timer = null;
        }
        if (!previewing) return;
        previewing = false;
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
