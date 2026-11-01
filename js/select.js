/** 方形自定义下拉（替代原生 select） */
window.HumanitySelect = (function () {
  function mount(root, options, value, onChange) {
    root.classList.add("sq-select");
    root.innerHTML = "";
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "sq-select-btn";
    btn.setAttribute("aria-haspopup", "listbox");
    const list = document.createElement("div");
    list.className = "sq-select-list";
    list.setAttribute("role", "listbox");
    list.hidden = true;

    function labelOf(v) {
      const opt = options.find((o) => o.value === v);
      return opt ? opt.label : v;
    }

    function setValue(v, silent) {
      root.dataset.value = v;
      btn.innerHTML =
        '<span class="sq-label">' +
        labelOf(v) +
        '</span><span class="sq-caret" aria-hidden="true"></span>';
      list.querySelectorAll(".sq-option").forEach((el) => {
        el.classList.toggle("active", el.dataset.value === v);
      });
      if (!silent && typeof onChange === "function") onChange(v);
    }

    options.forEach((opt) => {
      const item = document.createElement("button");
      item.type = "button";
      item.className = "sq-option";
      item.dataset.value = opt.value;
      item.setAttribute("role", "option");
      item.textContent = opt.label;
      item.addEventListener("click", (e) => {
        e.stopPropagation();
        list.hidden = true;
        root.classList.remove("open");
        setValue(opt.value);
      });
      list.appendChild(item);
    });

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
    setValue(value, true);

    return {
      get value() {
        return root.dataset.value;
      },
      setValue: (v) => setValue(v, true),
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
