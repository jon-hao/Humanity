/** 方形自定义下拉（单选 / 多选） */
window.HumanitySelect = (function () {
  function escapeHtml(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/"/g, "&quot;");
  }

  function mount(root, options, value, onChange, opts) {
    const multi = !!(opts && opts.multi);
    root.classList.add("sq-select");
    if (multi) root.classList.add("sq-multi");
    root.innerHTML = "";
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "sq-select-btn";
    btn.setAttribute("aria-haspopup", "listbox");
    const list = document.createElement("div");
    list.className = "sq-select-list";
    list.setAttribute("role", "listbox");
    if (multi) list.setAttribute("aria-multiselectable", "true");
    list.hidden = true;

    let selected = normalizeValue(value, options, multi);

    function channelOptions() {
      return (options || []).filter((o) => o.value !== "all");
    }

    function normalizeValue(v, optsList, isMulti) {
      const allOpts = optsList || options || [];
      if (!isMulti) {
        const s = Array.isArray(v) ? v[0] : String(v || "");
        if (allOpts.some((o) => o.value === s)) return s;
        return (allOpts[0] && allOpts[0].value) || "all";
      }
      let parts = [];
      if (Array.isArray(v)) parts = v.slice();
      else if (v == null || v === "" || v === "all") parts = ["all"];
      else parts = String(v).split(/[,+|]/).map((x) => x.trim()).filter(Boolean);
      if (!parts.length || parts.includes("all")) return ["all"];
      const allowed = new Set(channelOptions().map((o) => o.value));
      const next = parts.filter((p) => allowed.has(p));
      return next.length ? next : ["all"];
    }

    function labelOf(v) {
      if (multi) {
        const vals = Array.isArray(v) ? v : normalizeValue(v, options, true);
        if (!vals.length || vals.includes("all")) {
          const all = options.find((o) => o.value === "all");
          return all ? all.label : "All sources";
        }
        if (vals.length === 1) {
          const opt = options.find((o) => o.value === vals[0]);
          return opt ? opt.label : vals[0];
        }
        return vals.length + " sources";
      }
      const opt = options.find((o) => o.value === v);
      return opt ? opt.label : v;
    }

    function renderBtn() {
      root.dataset.value = multi
        ? selected.includes("all")
          ? "all"
          : selected.join(",")
        : selected;
      btn.innerHTML =
        '<span class="sq-label">' +
        escapeHtml(labelOf(selected)) +
        '</span><span class="sq-caret" aria-hidden="true"></span>';
      list.querySelectorAll(".sq-option").forEach((el) => {
        const val = el.dataset.value;
        const on = multi
          ? selected.includes("all")
            ? val === "all"
            : selected.includes(val)
          : selected === val;
        el.classList.toggle("active", on);
        el.setAttribute("aria-selected", on ? "true" : "false");
      });
    }

    function emit() {
      if (typeof onChange === "function") {
        onChange(multi ? selected.slice() : selected);
      }
    }

    function setValue(v, silent) {
      selected = normalizeValue(v, options, multi);
      renderBtn();
      if (!silent) emit();
    }

    function toggleMulti(val) {
      if (val === "all") {
        selected = ["all"];
      } else {
        let cur = selected.includes("all") ? [] : selected.slice();
        if (cur.includes(val)) cur = cur.filter((x) => x !== val);
        else cur.push(val);
        const channels = channelOptions().map((o) => o.value);
        if (!cur.length || cur.length >= channels.length) selected = ["all"];
        else selected = cur;
      }
      renderBtn();
      emit();
    }

    function rebuild(opts) {
      options = opts;
      selected = normalizeValue(selected, options, multi);
      list.innerHTML = "";
      options.forEach((opt) => {
        const item = document.createElement("button");
        item.type = "button";
        item.className = "sq-option";
        item.dataset.value = opt.value;
        item.setAttribute("role", "option");
        if (multi) {
          item.innerHTML =
            '<span class="sq-check" aria-hidden="true"></span><span class="sq-option-label">' +
            escapeHtml(opt.label) +
            "</span>";
        } else {
          item.textContent = opt.label;
        }
        item.addEventListener("click", (e) => {
          e.stopPropagation();
          if (multi) {
            toggleMulti(opt.value);
            return;
          }
          list.hidden = true;
          root.classList.remove("open");
          setValue(opt.value);
        });
        list.appendChild(item);
      });
      renderBtn();
    }

    rebuild(options);

    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      document.querySelectorAll(".sq-select.open").forEach((el) => {
        if (el !== root) {
          el.classList.remove("open");
          const l = el.querySelector(".sq-select-list");
          if (l) l.hidden = true;
        }
      });
      const open = list.hidden;
      list.hidden = !open;
      root.classList.toggle("open", open);
    });

    root.appendChild(btn);
    root.appendChild(list);

    return {
      get value() {
        return multi
          ? selected.includes("all")
            ? "all"
            : selected.join(",")
          : selected;
      },
      get values() {
        return multi ? selected.slice() : [selected];
      },
      setValue: (v) => setValue(v, true),
      refresh(opts, v) {
        rebuild(opts || options);
        if (v != null) setValue(v, true);
        else renderBtn();
      },
    };
  }

  document.addEventListener("click", () => {
    document.querySelectorAll(".sq-select.open").forEach((el) => {
      el.classList.remove("open");
      const l = el.querySelector(".sq-select-list");
      if (l) l.hidden = true;
    });
  });

  return { mount };
})();
