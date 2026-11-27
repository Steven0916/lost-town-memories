// 衣櫃裡的「專屬服裝」商店：每套服裝有 3D 外觀與一個專屬技能。
(() => {
  const list = document.querySelector("#costume-list");
  const wardrobe = document.querySelector("#wardrobe");
  const main = document.querySelector("#model");
  if (!list || !window.Fleet) return;

  const el = (tag, props = {}, ...kids) => {
    const node = Object.assign(document.createElement(tag), props);
    node.append(...kids.filter((k) => k != null));
    return node;
  };
  const fx = (name) => window.dispatchEvent(new CustomEvent("ltm:fx", { detail: name }));

  function render(message = "") {
    const wallet = Fleet.get();
    wardrobe.dataset.costume = wallet.costumes.equipped;
    const cards = Fleet.costumes.map((c) => {
      const owned = Fleet.ownsCostume(c.id), on = wallet.costumes.equipped === c.id;
      const canvas = el("canvas", { width: 120, height: 120, ariaLabel: c.name + "造型預覽" });
      const button = el("button", { type: "button", className: on ? "quiet-light" : owned ? "quiet-light" : (wallet.coins >= c.price ? "primary" : "quiet") },
        on ? "穿著中 ✓" : owned ? "穿上" : "🪙 " + c.price + " 購買");
      button.disabled = on;
      button.addEventListener("click", () => {
        if (owned) { Fleet.equip(c.id); fx("tap"); render(); }
        else if (Fleet.buyCostume(c.id)) { fx("gem"); render("已買下「" + c.name + "」並穿上！"); }
        else render("還差 " + (c.price - wallet.coins) + " 金幣，多撿閃光金幣、通關或每天登入就能存到！");
        World.preview(main, .4);
      });
      const card = el("article", { className: "costume-card" + (on ? " on" : "") + (owned ? "" : " locked") },
        canvas,
        el("h4", {}, c.icon + " " + c.name),
        el("p", { className: "skill-line" }, el("b", {}, c.skill.type + "技能・" + c.skill.name)),
        el("p", { className: "skill-desc" }, c.skill.desc),
        button);
      requestAnimationFrame(() => World.preview(canvas, .5, c.id === "base" ? "" : c.id));
      return card;
    });
    list.replaceChildren(
      el("p", { className: "cloud-msg", role: "status" }, message || "🪙 你有 " + wallet.coins + " 金幣。穿著專屬服裝時，自選服裝會暫停。"),
      el("div", { className: "costume-grid" }, ...cards));
  }

  document.querySelector("#dress")?.addEventListener("click", () => render());
  window.addEventListener("ltm:wallet", () => { if (wardrobe.open) render(); });
})();
