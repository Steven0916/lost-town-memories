// 衣櫃裡的「服飾商店」：用金幣購買帽子、上衣、褲子、鞋子、臉部／頸部／背飾、手持道具和寵物。
(() => {
  const list = document.querySelector("#shop-list");
  if (!list || !window.Fleet || !window.CATALOG || !window.Wardrobe) return;
  const CATALOG = window.CATALOG;
  // 有商品可買的類別
  const cats = Object.keys(CATALOG).filter((slot) => CATALOG[slot].items.some((i) => i.price > 0));
  let current = cats[0];

  const el = (tag, props = {}, ...kids) => {
    const node = Object.assign(document.createElement(tag), props);
    node.append(...kids.filter((k) => k != null));
    return node;
  };
  const fx = (name) => window.dispatchEvent(new CustomEvent("ltm:fx", { detail: name }));

  function render(message = "") {
    const wallet = Fleet.get();
    const chips = cats.map((slot) => {
      const items = CATALOG[slot].items;
      const owned = items.filter((i) => Fleet.ownsItem(slot, i.id)).length;
      const chip = el("button", { type: "button", className: "chip" + (slot === current ? " on" : "") }, CATALOG[slot].icon + " " + CATALOG[slot].name,
        el("small", {}, " " + owned + "/" + items.length));
      chip.addEventListener("click", () => { current = slot; render(); });
      return chip;
    });

    const cards = CATALOG[current].items.map((item) => {
      const slot = current;
      const owned = Fleet.ownsItem(slot, item.id), on = Wardrobe.outfit[slot] === item.id;
      const swatch = item.color
        ? el("span", { className: "swatch", style: "background:#" + item.color })
        : el("span", { className: "swatch icon" }, item.icon);
      const buttons = [];
      if (on) buttons.push(el("button", { type: "button", className: "mini quiet-light", disabled: true }, "穿著中 ✓"));
      else if (owned) {
        const b = el("button", { type: "button", className: "mini quiet-light" }, "穿上");
        b.addEventListener("click", () => { Wardrobe.setOutfit(slot, item.id); fx("tap"); render(); });
        buttons.push(b);
      } else {
        const tryBtn = el("button", { type: "button", className: "mini ghost" }, "試穿");
        tryBtn.addEventListener("click", () => { Wardrobe.tryOn(slot, item.id); fx("tap"); render("試穿中：「" + item.name + "」（買下才會保留）"); });
        const buy = el("button", { type: "button", className: "mini " + (wallet.coins >= item.price ? "primary" : "quiet") }, "🪙 " + item.price);
        buy.addEventListener("click", () => {
          if (Fleet.buyItem(slot, item.id)) { Wardrobe.setOutfit(slot, item.id); fx("gem"); render("已買下「" + item.name + "」並穿上！"); }
          else render("還差 " + (item.price - wallet.coins) + " 金幣。通關、撿金幣、擊敗海盜都能存到！");
        });
        buttons.push(tryBtn, buy);
      }
      return el("article", { className: "shop-card" + (on ? " on" : "") + (owned ? "" : " locked") }, swatch, el("h5", {}, item.name), ...buttons);
    });

    list.replaceChildren(
      el("p", { className: "cloud-msg", role: "status" }, message || "🪙 你有 " + wallet.coins + " 金幣。想看效果可以先「試穿」，滿意再買。穿著專屬服裝時，帽子、上衣、褲子、鞋子會暫停。"),
      el("div", { className: "chips" }, ...chips),
      el("div", { className: "shop-grid" }, ...cards));
  }

  document.querySelector("#dress")?.addEventListener("click", () => render());
  window.addEventListener("ltm:wallet", () => { if (document.querySelector("#wardrobe").open) render(); });
})();
